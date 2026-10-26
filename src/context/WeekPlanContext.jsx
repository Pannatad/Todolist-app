/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { createWeekPlansRepo } from '../data/weekPlansRepo';
import { dateFromKey, getWeekKey, isWeekPlanEmpty, normalizeWeekPlan } from '../utils/weekPlan';

const WeekPlanContext = createContext();

export const useWeekPlans = () => {
    const context = useContext(WeekPlanContext);
    if (!context) throw new Error('useWeekPlans must be used within WeekPlanProvider');
    return context;
};

// Daily target names for the week holding `dateKey` (YYYY-MM-DD, default today),
// so category pickers can offer them. Safe outside the provider: returns [].
export const useWeekTargetLabels = (dateKey) => {
    const context = useContext(WeekPlanContext);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateKey || '') ? dateFromKey(dateKey) : new Date();
    const plan = context?.getPlan(getWeekKey(date)) || null;
    return useMemo(() => (plan?.targets || []).map((target) => target.label), [plan]);
};

const isMissingTable = (error) => (
    error?.code === '42P01' || error?.code === 'PGRST205' || /week_plans/i.test(error?.message || '')
);

export const WeekPlanProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id;
    const repo = useMemo(() => createWeekPlansRepo(userId ? { id: userId } : null), [userId]);
    const [plans, setPlans] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        let cancelled = false;
        repo.list()
            .then((rows) => {
                if (cancelled) return;
                setPlans(rows.map(normalizeWeekPlan));
                setIsLoaded(true);
            })
            .catch((error) => {
                console.error('Failed to load week plans:', error);
                if (!cancelled) setIsLoaded(true);
            });
        return () => { cancelled = true; };
    }, [repo]);

    const plansByWeek = useMemo(() => new Map(plans.map((plan) => [plan.weekStart, plan])), [plans]);

    const getPlan = useCallback((weekStart) => plansByWeek.get(weekStart) || null, [plansByWeek]);

    // The most recent saved week before this one, used to start a new week.
    const getPreviousPlan = useCallback((weekStart) => (
        plans
            .filter((plan) => plan.weekStart < weekStart && !isWeekPlanEmpty(plan))
            .sort((left, right) => right.weekStart.localeCompare(left.weekStart))[0] || null
    ), [plans]);

    const savePlan = useCallback(async (draft) => {
        const plan = normalizeWeekPlan(draft);
        if (!plan.weekStart) throw new Error('A week plan needs a week.');
        const previous = plansByWeek.get(plan.weekStart) || null;
        const optimistic = { ...plan, id: previous?.id ?? plan.id };
        setPlans((current) => [...current.filter((item) => item.weekStart !== plan.weekStart), optimistic]);
        try {
            const saved = normalizeWeekPlan(await repo.save(optimistic));
            setPlans((current) => current.map((item) => item.weekStart === plan.weekStart ? saved : item));
            return saved;
        } catch (error) {
            setPlans((current) => [
                ...current.filter((item) => item.weekStart !== plan.weekStart),
                ...(previous ? [previous] : []),
            ]);
            console.error('Failed to save week plan:', error);
            throw new Error(isMissingTable(error)
                ? 'Week plans need the latest Supabase migration (2026-10-26_week_plans.sql).'
                : 'Could not save this week. Try again.');
        }
    }, [plansByWeek, repo]);

    const clearPlan = useCallback(async (weekStart) => {
        const previous = plansByWeek.get(weekStart) || null;
        setPlans((current) => current.filter((item) => item.weekStart !== weekStart));
        try {
            await repo.remove(weekStart);
        } catch (error) {
            if (previous) setPlans((current) => [...current, previous]);
            console.error('Failed to clear week plan:', error);
            throw new Error('Could not clear this week. Try again.');
        }
    }, [plansByWeek, repo]);

    const value = useMemo(() => ({
        plans,
        isLoaded,
        getPlan,
        getPreviousPlan,
        savePlan,
        clearPlan,
    }), [plans, isLoaded, getPlan, getPreviousPlan, savePlan, clearPlan]);

    return <WeekPlanContext.Provider value={value}>{children}</WeekPlanContext.Provider>;
};

export default WeekPlanContext;
