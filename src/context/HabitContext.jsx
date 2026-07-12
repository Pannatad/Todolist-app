/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { createHabitsRepo } from '../data/habitsRepo';
import { toLocalDateKey } from '../utils/scheduleOccurrences';
import {
    buildCompletedDatesByHabit,
    calculateHabitStreak,
    canEditHabitLogDate,
    decorateHabit,
    getHabitLogFromMap,
    getHabitLogKey,
    isHabitScheduledOnDate,
    normalizeHabit,
    normalizeHabitLog,
} from './habitContextUtils';
import { useHabitSeedInsight } from './habits/useHabitSeedInsight';

const HabitContext = createContext();

export const useHabit = () => {
    const context = useContext(HabitContext);
    if (!context) {
        throw new Error('useHabit must be used within HabitProvider');
    }
    return context;
};

export const HabitProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id;
    const habitsRepo = useMemo(() => createHabitsRepo(userId ? { id: userId } : null), [userId]);

    const [storedHabits, setStoredHabits] = useState([]);
    const [habitLogs, setHabitLogs] = useState({});

    const activeHabits = useMemo(
        () => storedHabits.filter((habit) => !habit.archived),
        [storedHabits]
    );

    const completedDatesByHabit = useMemo(
        () => buildCompletedDatesByHabit(habitLogs),
        [habitLogs]
    );

    const habits = useMemo(() => {
        const todayKey = toLocalDateKey(new Date());
        return activeHabits.map((habit) => decorateHabit(habit, habitLogs, completedDatesByHabit, todayKey));
    }, [activeHabits, completedDatesByHabit, habitLogs]);

    const refreshHabits = useCallback(async () => {
        const data = await habitsRepo.list();
        setStoredHabits(data.map(normalizeHabit));
    }, [habitsRepo]);

    const refreshHabitLogs = useCallback(async () => {
        const data = await habitsRepo.listLogs();
        const logsMap = {};
        if (Array.isArray(data)) data.forEach((log) => {
            logsMap[getHabitLogKey(log.habit_id, log.date)] = normalizeHabitLog(log);
        });
        else Object.entries(data).forEach(([key, log]) => { logsMap[key] = normalizeHabitLog(log); });
        setHabitLogs(logsMap);
    }, [habitsRepo]);

    const loadHabitsFromSupabase = useCallback(async () => {
        if (!user) return;

        try {
            await Promise.all([
                refreshHabits(),
                refreshHabitLogs()
            ]);
        } catch (error) {
            console.error('Error loading habits:', error);
        }
    }, [refreshHabitLogs, refreshHabits, user]);

    const loadHabitsFromLocalStorage = useCallback(async () => {
        try {
            setStoredHabits((await habitsRepo.list()).map(normalizeHabit));
            const normalizedLogs = {};
            Object.entries(await habitsRepo.listLogs()).forEach(([key, log]) => { normalizedLogs[key] = normalizeHabitLog(log); });
            setHabitLogs(normalizedLogs);
        } catch (error) {
            console.error('Failed to load habits from localStorage:', error);
        }
    }, [habitsRepo]);

    useEffect(() => {
        if (user) {
            loadHabitsFromSupabase();
            return;
        }

        setStoredHabits([]);
        setHabitLogs({});
        loadHabitsFromLocalStorage();
    }, [loadHabitsFromLocalStorage, loadHabitsFromSupabase, user]);

    useEffect(() => {
        if (!user || !supabase) return undefined;

        const channel = supabase
            .channel(`habits-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'habits',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    refreshHabits().catch((error) => {
                        console.error('Error refreshing habits in realtime:', error);
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refreshHabits, user]);

    useEffect(() => {
        if (!user || !supabase) return undefined;

        const channel = supabase
            .channel(`habit-logs-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'habit_logs',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    refreshHabitLogs().catch((error) => {
                        console.error('Error refreshing habit logs in realtime:', error);
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refreshHabitLogs, user]);

    const addHabit = async (habitData) => {
        const now = new Date().toISOString();
        const newHabit = normalizeHabit({
            ...habitData,
            id: user ? undefined : `habit_${Date.now()}`,
            user_id: user?.id,
            archived: false,
            created_at: now,
            seed_started_at: habitData.is_seed ? habitData.seed_started_at || now : null,
            seed_stage: habitData.is_seed ? habitData.seed_stage || 'seed' : null,
        });

        const tempId = `habit_${Date.now()}`;
        setStoredHabits((prev) => [...prev, { ...newHabit, id: user ? tempId : newHabit.id }]);

        try {
            const data = await habitsRepo.create(newHabit);
            if (user) {
                setStoredHabits((prev) => prev.map((habit) => (
                    habit.id === tempId ? normalizeHabit(data) : habit
                )));
                return normalizeHabit(data);
            }
        } catch (error) {
            console.error('Error adding habit:', error);
            setStoredHabits((prev) => prev.filter((habit) => habit.id !== tempId));
        }

        return normalizeHabit(newHabit);
    };

    const updateHabit = async (id, updates) => {
        const previousHabit = storedHabits.find((habit) => habit.id === id);
        if (!previousHabit) return null;

        const nextHabit = normalizeHabit({ ...previousHabit, ...updates });
        setStoredHabits((prev) => prev.map((habit) => (habit.id === id ? nextHabit : habit)));

        try {
            await habitsRepo.update(id, nextHabit);
            return nextHabit;
        } catch (error) {
            console.error('Error updating habit:', error);
            setStoredHabits((prev) => prev.map((habit) => (habit.id === id ? previousHabit : habit)));
            return previousHabit;
        }
    };

    const deleteHabit = async (id) => {
        const previousHabit = storedHabits.find((habit) => habit.id === id);
        if (!previousHabit) return;

        const previousLogs = Object.fromEntries(
            Object.entries(habitLogs).filter(([, log]) => log.habit_id === id)
        );

        setStoredHabits((prev) => prev.filter((habit) => habit.id !== id));
        setHabitLogs((prev) => Object.fromEntries(
            Object.entries(prev).filter(([, log]) => log.habit_id !== id)
        ));

        try {
            await habitsRepo.removeLogsForHabit(id);
            await habitsRepo.remove(id);
        } catch (error) {
            console.error('Error deleting habit:', error);
            setStoredHabits((prev) => [...prev, previousHabit].sort((left, right) => (
                new Date(left.created_at || 0) - new Date(right.created_at || 0)
            )));
            setHabitLogs((prev) => ({ ...prev, ...previousLogs }));
        }
    };

    const archiveHabit = async (id) => {
        await updateHabit(id, { archived: true });
    };

    const logHabit = async (habitId, date, value, completed = false, options = {}) => {
        const dateStr = typeof date === 'string' ? date : toLocalDateKey(date);
        const key = getHabitLogKey(habitId, dateStr);
        const existingLog = habitLogs[key] || null;

        if (!canEditHabitLogDate(dateStr)) {
            console.warn('Habit log date is locked. Only today and yesterday can be edited.', { habitId, date: dateStr });
            return existingLog;
        }

        const logData = {
            habit_id: habitId,
            user_id: user?.id,
            date: dateStr,
            value,
            completed,
            logged_at: new Date().toISOString(),
        };

        if (options.notes !== undefined) {
            logData.notes = options.notes;
        } else if (existingLog?.notes) {
            logData.notes = existingLog.notes;
        }

        const optimisticLog = normalizeHabitLog({ ...logData, id: existingLog?.id });

        setHabitLogs((prev) => ({
            ...prev,
            [key]: optimisticLog,
        }));

        try {
            const data = await habitsRepo.upsertLog(key, { ...logData, id: existingLog?.id });

            if (data) {
                const normalizedRow = normalizeHabitLog(data);
                setHabitLogs((prev) => ({
                    ...prev,
                    [key]: normalizedRow,
                }));
                return normalizedRow;
            }

            return optimisticLog;
        } catch (error) {
            console.error('Error logging habit:', error);
            setHabitLogs((prev) => {
                const nextLogs = { ...prev };
                if (existingLog) nextLogs[key] = existingLog;
                else delete nextLogs[key];
                return nextLogs;
            });
            return existingLog;
        }
    };

    const getHabitLog = useCallback((habitId, date) => {
        return getHabitLogFromMap(habitLogs, habitId, date);
    }, [habitLogs]);

    const canLogHabitDate = useCallback((date) => canEditHabitLogDate(date), []);

    const getHabitsForDate = useCallback((date) => {
        const targetDate = date instanceof Date ? date : new Date(date);
        const filtered = habits.filter((habit) => isHabitScheduledOnDate(habit, targetDate));
        const timeOrder = { morning: 0, afternoon: 1, evening: 2, night: 3, anytime: 4 };

        return filtered.sort((a, b) => {
            const orderA = timeOrder[a.time_of_day] ?? 4;
            const orderB = timeOrder[b.time_of_day] ?? 4;
            if (orderA !== orderB) return orderA - orderB;
            if (a.reminder_time && b.reminder_time) return a.reminder_time.localeCompare(b.reminder_time);
            if (a.reminder_time) return -1;
            if (b.reminder_time) return 1;
            return 0;
        });
    }, [habits]);

    const getHabitStreak = useCallback((habitId) => {
        const habit = storedHabits.find((item) => item.id === habitId);
        return calculateHabitStreak(habit, habitLogs);
    }, [habitLogs, storedHabits]);

    const getCompletionStats = useCallback((habitId, days = 7) => {
        const habit = storedHabits.find((item) => item.id === habitId);
        if (!habit || habit.archived) return { completed: 0, total: 0, rate: 0 };

        let completed = 0;
        let total = 0;
        const today = new Date();

        for (let index = 0; index < days; index += 1) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - index);

            if (!isHabitScheduledOnDate(habit, checkDate)) continue;

            total += 1;
            const log = getHabitLogFromMap(habitLogs, habitId, checkDate);
            if (log?.completed) completed += 1;
        }

        return {
            completed,
            total,
            rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    }, [habitLogs, storedHabits]);

    const getHabitNoteHistory = useCallback((habitId) => {
        return Object.values(habitLogs)
            .filter((log) => log.habit_id === habitId && log.notes?.trim())
            .sort((left, right) => new Date(`${right.date}T12:00:00`) - new Date(`${left.date}T12:00:00`));
    }, [habitLogs]);

    const getSeedInsight = useHabitSeedInsight({ habitLogs, storedHabits });

    const value = {
        habits,
        habitLogs,
        addHabit,
        updateHabit,
        deleteHabit,
        archiveHabit,
        logHabit,
        getHabitLog,
        canLogHabitDate,
        getHabitsForDate,
        getHabitStreak,
        getCompletionStats,
        getHabitNoteHistory,
        getSeedInsight,
    };

    return (
        <HabitContext.Provider value={value}>
            {children}
        </HabitContext.Provider>
    );
};
