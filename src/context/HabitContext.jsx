import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { DEFAULT_SEED_DURATION_DAYS, getNextSeedCompletionMilestone, getSeedStageFromCompletedDays, getSeedStageFromProgress } from '../constants/habitSeeds';
import { toLocalDateKey } from '../utils/scheduleOccurrences';

const HabitContext = createContext();

const startOfDay = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
};

const isSameDay = (left, right) => toLocalDateKey(left) === toLocalDateKey(right);

const normalizeHabit = (habit) => ({
    ...habit,
    is_seed: Boolean(habit?.is_seed),
    archived: habit?.archived === true,
    seed_started_at: habit?.seed_started_at || null,
    seed_duration_days: Number(habit?.seed_duration_days) > 0
        ? Number(habit.seed_duration_days)
        : DEFAULT_SEED_DURATION_DAYS,
    seed_why: habit?.seed_why || '',
    seed_stage: habit?.seed_stage || null,
    completedDates: Array.isArray(habit?.completedDates) ? habit.completedDates : [],
    completedToday: habit?.completedToday === true,
    streak: Number(habit?.streak) || 0,
    bestStreak: Number(habit?.bestStreak) || 0,
});

const normalizeHabitLog = (log) => ({
    ...log,
    notes: log?.notes || '',
});

const isHabitScheduledOnDate = (habit, date) => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
        return habit.schedule_days?.includes(date.getDay());
    }
    return true;
};

const getHabitLogKey = (habitId, date) => (
    `${habitId}_${typeof date === 'string' ? date : toLocalDateKey(date)}`
);

const getHabitLogFromMap = (logsMap, habitId, date) => (
    logsMap[getHabitLogKey(habitId, date)] || null
);

const getYesterdayDate = (referenceDate = new Date()) => {
    const yesterday = startOfDay(referenceDate);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
};

const canEditHabitLogDate = (date, referenceDate = new Date()) => {
    const dateKey = typeof date === 'string' ? date : toLocalDateKey(date);
    const todayKey = toLocalDateKey(referenceDate);
    const yesterdayKey = toLocalDateKey(getYesterdayDate(referenceDate));

    return dateKey === todayKey || dateKey === yesterdayKey;
};

const buildCompletedDatesByHabit = (logsMap) => {
    const completedDatesByHabit = {};

    Object.values(logsMap).forEach((log) => {
        if (!log?.habit_id || !log.completed) return;
        if (!completedDatesByHabit[log.habit_id]) {
            completedDatesByHabit[log.habit_id] = [];
        }
        completedDatesByHabit[log.habit_id].push(log.date);
    });

    Object.values(completedDatesByHabit).forEach((dates) => dates.sort());

    return completedDatesByHabit;
};

const calculateHabitStreak = (habit, logsMap) => {
    if (!habit) return { current: 0, best: 0 };

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    const today = startOfDay(new Date());

    for (let index = 0; index < 365; index += 1) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - index);

        if (!isHabitScheduledOnDate(habit, checkDate)) continue;

        const log = getHabitLogFromMap(logsMap, habit.id, checkDate);
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

const decorateHabit = (habit, logsMap, completedDatesByHabit, todayKey) => {
    const completedDates = completedDatesByHabit[habit.id] || [];
    const streak = calculateHabitStreak(habit, logsMap);

    return normalizeHabit({
        ...habit,
        completedDates,
        completedToday: completedDates.includes(todayKey),
        streak: streak.current,
        bestStreak: streak.best,
    });
};

export const useHabit = () => {
    const context = useContext(HabitContext);
    if (!context) {
        throw new Error('useHabit must be used within HabitProvider');
    }
    return context;
};

export const HabitProvider = ({ children }) => {
    const { user } = useAuth();

    const [storedHabits, setStoredHabits] = useState([]);
    const [habitLogs, setHabitLogs] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);

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
        if (!user) return;

        const { data, error } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        setStoredHabits((data || []).map(normalizeHabit));
    }, [user]);

    const refreshHabitLogs = useCallback(async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('habit_logs')
            .select('*')
            .eq('user_id', user.id);

        if (error) throw error;

        const logsMap = {};
        (data || []).forEach((log) => {
            logsMap[getHabitLogKey(log.habit_id, log.date)] = normalizeHabitLog(log);
        });
        setHabitLogs(logsMap);
    }, [user]);

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

    const loadHabitsFromLocalStorage = useCallback(() => {
        try {
            const savedHabits = localStorage.getItem('habits-guest');
            const savedLogs = localStorage.getItem('habit-logs-guest');
            if (savedHabits) setStoredHabits(JSON.parse(savedHabits).map(normalizeHabit));
            if (savedLogs) {
                const parsedLogs = JSON.parse(savedLogs);
                const normalizedLogs = {};
                Object.entries(parsedLogs).forEach(([key, log]) => {
                    normalizedLogs[key] = normalizeHabitLog(log);
                });
                setHabitLogs(normalizedLogs);
            }
        } catch (error) {
            console.error('Failed to load habits from localStorage:', error);
        }
    }, []);

    useEffect(() => {
        setIsLoaded(false);
        if (user) {
            loadHabitsFromSupabase().then(() => setIsLoaded(true));
            return;
        }

        setStoredHabits([]);
        setHabitLogs({});
        loadHabitsFromLocalStorage();
        setIsLoaded(true);
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

    useEffect(() => {
        if (!user && isLoaded) {
            localStorage.setItem('habits-guest', JSON.stringify(storedHabits));
            localStorage.setItem('habit-logs-guest', JSON.stringify(habitLogs));
        }
    }, [storedHabits, habitLogs, user, isLoaded]);

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

        if (!user) return normalizeHabit(newHabit);

        try {
            const dbHabit = { ...newHabit };
            delete dbHabit.id;

            const { data, error } = await supabase
                .from('habits')
                .insert([dbHabit])
                .select()
                .single();

            if (error) throw error;
            if (data) {
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

        if (!user) return nextHabit;

        try {
            const { error } = await supabase.from('habits').update(updates).eq('id', id);
            if (error) throw error;
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

        if (!user) return;

        try {
            await supabase.from('habit_logs').delete().eq('habit_id', id);
            const { error } = await supabase.from('habits').delete().eq('id', id);
            if (error) throw error;
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

        if (!user) return optimisticLog;

        try {
            const payload = {
                ...logData,
                id: existingLog?.id,
            };

            const { data, error } = await supabase
                .from('habit_logs')
                .upsert(payload, { onConflict: 'habit_id, date' })
                .select()
                .maybeSingle();

            if (error) throw error;

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

    const getSeedInsight = useCallback((habitId) => {
        const habit = storedHabits.find((item) => item.id === habitId && !item.archived);
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
        let scheduledSlotsSeen = 0;
        let elapsedScheduledDays = 0;
        let seedEnded = false;
        let seedEndedAt = null;

        const maxTimelineDays = Math.max(durationDays * 14, durationDays + 14);

        for (let index = 0; index < maxTimelineDays && scheduledSlotsSeen < durationDays; index += 1) {
            const date = new Date(startedAt);
            date.setDate(startedAt.getDate() + index);

            const scheduled = isHabitScheduledOnDate(habit, date);
            if (scheduled) {
                scheduledSlotsSeen += 1;
                if (date <= today) {
                    elapsedScheduledDays += 1;
                }
            }
            const log = getHabitLogFromMap(habitLogs, habitId, date);
            const completed = Boolean(log?.completed);
            const explicitlyMarkedIncomplete = Boolean(log && log.completed === false && Number(log.value || 0) <= 0);
            const isFuture = date > today;
            const isToday = isSameDay(date, today);
            const isPast = date < today;
            const progressIndex = Math.max(scheduledSlotsSeen, 1);
            const growthScale = 0.45 + ((Math.min(progressIndex, durationDays) / durationDays) * 0.8);

            let status = 'future';
            let completionNumber = null;
            let completionStage = null;

            if (!scheduled) {
                status = seedEnded ? 'ended' : isFuture ? 'future-free' : 'free';
            } else if (seedEnded) {
                status = 'ended';
            } else if (completed) {
                status = 'completed';
                runningMissStreak = 0;

                if (isPast || isToday) {
                    countedScheduledDays += 1;
                    completedDays += 1;
                    completionNumber = completedDays;
                    completionStage = getSeedStageFromCompletedDays(completedDays, durationDays);
                    pastScheduledResults.push({ completed: true, date: toLocalDateKey(date) });
                }
            } else if (isFuture) {
                status = 'future';
            } else if (isToday && !explicitlyMarkedIncomplete) {
                status = 'today';
            } else {
                countedScheduledDays += 1;
                runningMissStreak += 1;
                maxMissStreak = Math.max(maxMissStreak, runningMissStreak);

                if (runningMissStreak >= 4) {
                    status = 'ended';
                    seedEnded = true;
                    seedEndedAt = toLocalDateKey(date);
                } else if (runningMissStreak >= 3) status = 'final-warning';
                else if (runningMissStreak >= 2) status = 'warning';
                else status = 'missed';

                pastScheduledResults.push({ completed: false, date: toLocalDateKey(date) });
            }

            timeline.push({
                index,
                dayNumber: timeline.length + 1,
                date: toLocalDateKey(date),
                scheduled,
                completed,
                isToday,
                isFuture,
                status,
                growthScale,
                stage: getSeedStageFromProgress((index + 1) / durationDays),
                completionNumber,
                completionStage,
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
        if (seedEnded || maxMissStreak >= 4) health = 'ended';
        else if (currentMissStreak >= 3) health = 'final_warning';
        else if (currentMissStreak >= 2) health = 'warning';
        else if (currentMissStreak > 0) health = 'dry';
        else if (recentDecay && currentRecoveryStreak > 0 && currentRecoveryStreak < 3) health = 'recovering';

        const elapsedDays = Math.max(1, Math.min(durationDays, elapsedScheduledDays || 1));

        const timeProgress = elapsedDays / durationDays;
        const completionProgress = Math.min(1, completedDays / durationDays);
        const consistencyRate = countedScheduledDays > 0 ? completedDays / countedScheduledDays : 0;
        const growthProgress = completionProgress;
        const suggestedStage = getSeedStageFromCompletedDays(completedDays, durationDays);
        const nextGrowthMilestone = getNextSeedCompletionMilestone(completedDays, durationDays);
        const completionsToNextStage = suggestedStage === 'blooming'
            ? 0
            : Math.max(0, nextGrowthMilestone - completedDays);

        let healthMessage = 'Only scheduled days count for this seed. Free days stay neutral.';
        if (health === 'ended') {
            healthMessage = 'This seed ended after 4 missed days in a row. Replant a new seed to restart this habit.';
        } else if (health === 'final_warning') {
            healthMessage = 'Final warning: 3 missed days in a row. One more missed scheduled day will end this seed.';
        } else if (health === 'warning') {
            healthMessage = 'Warning: 2 missed days in a row. Complete the next scheduled day to keep this seed alive.';
        } else if (health === 'dry') {
            healthMessage = '1 missed day. The soil is dry, but this seed can recover with the next completion.';
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
            completionProgress,
            consistencyRate,
            growthProgress,
            stage: suggestedStage,
            storedStage: habit.seed_stage,
            suggestedStage,
            nextGrowthMilestone,
            completionsToNextStage,
            readyToGraduate: elapsedDays >= durationDays && consistencyRate >= 0.8,
            timeline,
            health,
            currentMissStreak,
            currentRecoveryStreak,
            maxMissStreak,
            recentDecay,
            healthMessage,
            ended: health === 'ended',
            endedAt: seedEndedAt,
        };
    }, [habitLogs, storedHabits]);

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
