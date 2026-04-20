import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { DEFAULT_SEED_DURATION_DAYS, getSeedStageFromProgress } from '../constants/habitSeeds';

const HabitContext = createContext();

const toDateKey = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized.toISOString().split('T')[0];
};

const startOfDay = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
};

const isSameDay = (left, right) => toDateKey(left) === toDateKey(right);

const isHabitScheduledOnDate = (habit, date) => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
        return habit.schedule_days?.includes(date.getDay());
    }
    return true;
};

const normalizeHabitLog = (log) => ({
    ...log,
    notes: log?.notes || '',
});

export const useHabit = () => {
    const context = useContext(HabitContext);
    if (!context) {
        throw new Error('useHabit must be used within HabitProvider');
    }
    return context;
};

export const HabitProvider = ({ children }) => {
    const { user } = useAuth();

    const [habits, setHabits] = useState([]);
    const [habitLogs, setHabitLogs] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);

    const normalizeHabit = (habit) => ({
        ...habit,
        is_seed: Boolean(habit?.is_seed),
        seed_started_at: habit?.seed_started_at || null,
        seed_duration_days: Number(habit?.seed_duration_days) > 0
            ? Number(habit.seed_duration_days)
            : DEFAULT_SEED_DURATION_DAYS,
        seed_why: habit?.seed_why || '',
        seed_stage: habit?.seed_stage || null,
    });

    const loadHabitsFromSupabase = async () => {
        if (!user) return;

        try {
            const { data: habitsData, error: habitsError } = await supabase
                .from('habits')
                .select('*')
                .eq('archived', false)
                .order('created_at', { ascending: true });

            if (habitsError) throw habitsError;
            if (habitsData) setHabits(habitsData.map(normalizeHabit));

            const { data: logsData, error: logsError } = await supabase
                .from('habit_logs')
                .select('*');

            if (logsError) throw logsError;
            if (logsData) {
                const logsMap = {};
                logsData.forEach((log) => {
                    const key = `${log.habit_id}_${log.date}`;
                    logsMap[key] = normalizeHabitLog(log);
                });
                setHabitLogs(logsMap);
            }
        } catch (error) {
            console.error('Error loading habits:', error);
        }
    };

    const loadHabitsFromLocalStorage = () => {
        try {
            const savedHabits = localStorage.getItem('habits-guest');
            const savedLogs = localStorage.getItem('habit-logs-guest');
            if (savedHabits) setHabits(JSON.parse(savedHabits).map(normalizeHabit));
            if (savedLogs) setHabitLogs(JSON.parse(savedLogs));
        } catch (error) {
            console.error('Failed to load habits from localStorage:', error);
        }
    };

    useEffect(() => {
        setIsLoaded(false);
        if (user) {
            loadHabitsFromSupabase().then(() => setIsLoaded(true));
            return;
        }

        setHabits([]);
        setHabitLogs({});
        loadHabitsFromLocalStorage();
        setIsLoaded(true);
    }, [user]);

    useEffect(() => {
        if (!user && isLoaded) {
            localStorage.setItem('habits-guest', JSON.stringify(habits));
            localStorage.setItem('habit-logs-guest', JSON.stringify(habitLogs));
        }
    }, [habits, habitLogs, user, isLoaded]);

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
        setHabits((prev) => [...prev, { ...newHabit, id: user ? tempId : newHabit.id }]);

        if (!user) return;

        try {
            const { id, ...dbHabit } = newHabit;
            const { data, error } = await supabase.from('habits').insert([dbHabit]).select().single();
            if (error) throw error;
            if (data) {
                setHabits((prev) => prev.map((habit) => (habit.id === tempId ? normalizeHabit(data) : habit)));
            }
        } catch (error) {
            console.error('Error adding habit:', error);
        }
    };

    const updateHabit = async (id, updates) => {
        setHabits((prev) => prev.map((habit) => (habit.id === id ? normalizeHabit({ ...habit, ...updates }) : habit)));

        if (!user) return;

        try {
            const { error } = await supabase.from('habits').update(updates).eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Error updating habit:', error);
        }
    };

    const deleteHabit = async (id) => {
        setHabits((prev) => prev.filter((habit) => habit.id !== id));

        if (!user) return;

        try {
            const { error } = await supabase.from('habits').delete().eq('id', id);
            if (error) throw error;
        } catch (error) {
            console.error('Error deleting habit:', error);
        }
    };

    const archiveHabit = async (id) => {
        await updateHabit(id, { archived: true });
    };

    const logHabit = async (habitId, date, value, completed = false, options = {}) => {
        const dateStr = typeof date === 'string' ? date : toDateKey(date);
        const key = `${habitId}_${dateStr}`;
        const existingLog = habitLogs[key];

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

        setHabitLogs((prev) => ({
            ...prev,
            [key]: normalizeHabitLog({ ...logData, id: prev[key]?.id }),
        }));

        if (!user) return;

        try {
            const payload = {
                ...logData,
                id: existingLog?.id,
            };

            const { error } = await supabase
                .from('habit_logs')
                .upsert(payload, { onConflict: 'habit_id, date' });
            if (error) throw error;
        } catch (error) {
            console.error('Error logging habit:', error);
        }
    };

    const getHabitLog = (habitId, date) => {
        const dateStr = typeof date === 'string' ? date : toDateKey(date);
        const key = `${habitId}_${dateStr}`;
        return habitLogs[key] || null;
    };

    const getHabitsForDate = (date) => {
        const filtered = habits.filter((habit) => isHabitScheduledOnDate(habit, date));
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
    };

    const getHabitStreak = (habitId) => {
        const habit = habits.find((item) => item.id === habitId);
        if (!habit) return { current: 0, best: 0 };

        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        const today = startOfDay(new Date());

        for (let index = 0; index < 365; index += 1) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - index);

            if (!isHabitScheduledOnDate(habit, checkDate)) continue;

            const log = getHabitLog(habitId, checkDate);
            if (log?.completed) {
                tempStreak += 1;
                if (index === 0 || currentStreak > 0) {
                    currentStreak = tempStreak;
                }
                bestStreak = Math.max(bestStreak, tempStreak);
                continue;
            }

            if (index > 0) {
                tempStreak = 0;
                if (currentStreak > 0) currentStreak = 0;
            }
        }

        return { current: currentStreak, best: bestStreak };
    };

    const getCompletionStats = (habitId, days = 7) => {
        const habit = habits.find((item) => item.id === habitId);
        if (!habit) return { completed: 0, total: 0, rate: 0 };

        let completed = 0;
        let total = 0;
        const today = new Date();

        for (let index = 0; index < days; index += 1) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - index);

            if (!isHabitScheduledOnDate(habit, checkDate)) continue;

            total += 1;
            const log = getHabitLog(habitId, checkDate);
            if (log?.completed) completed += 1;
        }

        return {
            completed,
            total,
            rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    };

    const getHabitNoteHistory = (habitId) => {
        return Object.values(habitLogs)
            .filter((log) => log.habit_id === habitId && log.notes?.trim())
            .sort((left, right) => new Date(right.date) - new Date(left.date));
    };

    const getSeedInsight = (habitId) => {
        const habit = habits.find((item) => item.id === habitId);
        if (!habit?.is_seed) return null;

        const startedAt = startOfDay(habit.seed_started_at || habit.created_at || new Date());
        const today = startOfDay(new Date());
        const durationDays = Number(habit.seed_duration_days) > 0
            ? Number(habit.seed_duration_days)
            : DEFAULT_SEED_DURATION_DAYS;

        const timeline = [];
        const pastScheduledResults = [];

        let countedScheduledDays = 0;
        let completedDays = 0;
        let runningMissStreak = 0;
        let maxMissStreak = 0;

        for (let index = 0; index < durationDays; index += 1) {
            const date = new Date(startedAt);
            date.setDate(startedAt.getDate() + index);

            const scheduled = isHabitScheduledOnDate(habit, date);
            const log = getHabitLog(habitId, date);
            const completed = Boolean(log?.completed);
            const isFuture = date > today;
            const isToday = isSameDay(date, today);
            const isPast = date < today;
            const growthScale = 0.45 + (((index + 1) / durationDays) * 0.8);

            let status = 'future';

            if (!scheduled) {
                status = isFuture ? 'future-free' : 'free';
            } else if (completed) {
                status = 'completed';
                runningMissStreak = 0;

                if (isPast || isToday) {
                    countedScheduledDays += 1;
                    completedDays += 1;
                    pastScheduledResults.push({ completed: true, date: toDateKey(date) });
                }
            } else if (isFuture) {
                status = 'future';
            } else if (isToday) {
                status = 'today';
            } else {
                countedScheduledDays += 1;
                runningMissStreak += 1;
                maxMissStreak = Math.max(maxMissStreak, runningMissStreak);

                if (runningMissStreak >= 6) status = 'dead';
                else if (runningMissStreak >= 3) status = 'rotting';
                else status = 'missed';

                pastScheduledResults.push({ completed: false, date: toDateKey(date) });
            }

            timeline.push({
                index,
                dayNumber: index + 1,
                date: toDateKey(date),
                scheduled,
                completed,
                isToday,
                isFuture,
                status,
                growthScale,
                stage: getSeedStageFromProgress((index + 1) / durationDays),
            });
        }

        let currentMissStreak = 0;
        if (pastScheduledResults.length > 0) {
            for (let index = pastScheduledResults.length - 1; index >= 0; index -= 1) {
                if (!pastScheduledResults[index].completed) currentMissStreak += 1;
                else break;
            }
        }

        let currentRecoveryStreak = 0;
        if (currentMissStreak === 0 && pastScheduledResults.length > 0) {
            for (let index = pastScheduledResults.length - 1; index >= 0; index -= 1) {
                if (pastScheduledResults[index].completed) currentRecoveryStreak += 1;
                else break;
            }
        }

        let recentDecay = false;
        let localMissWindow = 0;
        const recentResults = pastScheduledResults.slice(-14);
        recentResults.forEach((result) => {
            if (result.completed) {
                localMissWindow = 0;
                return;
            }
            localMissWindow += 1;
            if (localMissWindow >= 3) recentDecay = true;
        });

        let health = 'healthy';
        if (currentMissStreak >= 6) health = 'dead';
        else if (currentMissStreak >= 3) health = 'rotting';
        else if (currentMissStreak > 0) health = 'dry';
        else if (recentDecay && currentRecoveryStreak > 0 && currentRecoveryStreak < 3) health = 'recovering';

        const elapsedDays = Math.max(
            1,
            Math.min(durationDays, Math.floor((today - startedAt) / (1000 * 60 * 60 * 24)) + 1)
        );

        const timeProgress = elapsedDays / durationDays;
        const consistencyRate = countedScheduledDays > 0 ? completedDays / countedScheduledDays : 0;
        const growthProgress = Math.min(1, Math.min(timeProgress, consistencyRate || 0));
        const suggestedStage = getSeedStageFromProgress(growthProgress);

        let healthMessage = 'Only scheduled days count for this seed. Free days stay neutral.';
        if (health === 'dry') {
            const missesUntilRot = Math.max(1, 3 - currentMissStreak);
            healthMessage = `${currentMissStreak} missed day${currentMissStreak === 1 ? '' : 's'}. Miss ${missesUntilRot} more to start rotting.`;
        } else if (health === 'rotting') {
            healthMessage = 'This seed is rotting. A few continuous completed days can still recover it.';
        } else if (health === 'dead') {
            healthMessage = 'This seed looks dead right now, but a new completion streak can still wake it up.';
        } else if (health === 'recovering') {
            healthMessage = 'Recovery has started. Keep the streak going for a few more days.';
        }

        return {
            startedAt: startedAt.toISOString(),
            durationDays,
            elapsedDays,
            daysRemaining: Math.max(0, durationDays - elapsedDays),
            scheduledDays: countedScheduledDays,
            completedDays,
            timeProgress,
            consistencyRate,
            growthProgress,
            stage: suggestedStage,
            storedStage: habit.seed_stage,
            suggestedStage,
            readyToGraduate: elapsedDays >= durationDays && consistencyRate >= 0.8,
            timeline,
            health,
            currentMissStreak,
            currentRecoveryStreak,
            maxMissStreak,
            recentDecay,
            healthMessage,
        };
    };

    const value = {
        habits,
        habitLogs,
        addHabit,
        updateHabit,
        deleteHabit,
        archiveHabit,
        logHabit,
        getHabitLog,
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
