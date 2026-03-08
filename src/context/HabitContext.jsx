import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

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

    // Habits State - start empty, load based on user state
    const [habits, setHabits] = useState([]);
    const [habitLogs, setHabitLogs] = useState({});
    const [isLoaded, setIsLoaded] = useState(false);

    // Load from Supabase (logged in user)
    const loadHabitsFromSupabase = async () => {
        if (!user) return;

        try {
            // Load Habits
            const { data: habitsData, error: habitsError } = await supabase
                .from('habits')
                .select('*')
                .eq('archived', false)
                .order('created_at', { ascending: true });

            if (habitsError) throw habitsError;
            if (habitsData) setHabits(habitsData);

            // Load Habit Logs
            const { data: logsData, error: logsError } = await supabase
                .from('habit_logs')
                .select('*');

            if (logsError) throw logsError;
            if (logsData) {
                const logsMap = {};
                logsData.forEach(log => {
                    const key = `${log.habit_id}_${log.date}`;
                    logsMap[key] = log;
                });
                setHabitLogs(logsMap);
            }
        } catch (error) {
            console.error("Error loading habits:", error);
        }
    };

    // Load from localStorage (guest mode)
    const loadHabitsFromLocalStorage = () => {
        try {
            const savedHabits = localStorage.getItem('habits-guest');
            const savedLogs = localStorage.getItem('habit-logs-guest');
            if (savedHabits) setHabits(JSON.parse(savedHabits));
            if (savedLogs) setHabitLogs(JSON.parse(savedLogs));
        } catch (e) {
            console.error("Failed to load habits from localStorage:", e);
        }
    };

    // Handle user state changes - load appropriate data
    useEffect(() => {
        setIsLoaded(false);
        if (user) {
            // User is logged in - load from Supabase
            loadHabitsFromSupabase().then(() => setIsLoaded(true));
        } else {
            // Guest mode - load from localStorage (using different key)
            setHabits([]);
            setHabitLogs({});
            loadHabitsFromLocalStorage();
            setIsLoaded(true);
        }
    }, [user]);

    // Save to LocalStorage (Guest Mode only)
    useEffect(() => {
        if (!user && isLoaded) {
            localStorage.setItem('habits-guest', JSON.stringify(habits));
            localStorage.setItem('habit-logs-guest', JSON.stringify(habitLogs));
        }
    }, [habits, habitLogs, user, isLoaded]);

    // CRUD Operations for Habits
    const addHabit = async (habitData) => {
        const newHabit = {
            ...habitData,
            id: user ? undefined : `habit_${Date.now()}`,
            user_id: user?.id,
            archived: false,
            created_at: new Date().toISOString()
        };

        const tempId = `habit_${Date.now()}`;
        setHabits(prev => [...prev, { ...newHabit, id: user ? tempId : newHabit.id }]);

        if (user) {
            try {
                const { id, ...dbHabit } = newHabit;
                const { data, error } = await supabase.from('habits').insert([dbHabit]).select().single();
                if (error) throw error;
                if (data) {
                    setHabits(prev => prev.map(h => h.id === tempId ? data : h));
                }
            } catch (error) {
                console.error("Error adding habit:", error);
            }
        }
    };

    const updateHabit = async (id, updates) => {
        setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates } : h));

        if (user) {
            try {
                const { error } = await supabase.from('habits').update(updates).eq('id', id);
                if (error) throw error;
            } catch (error) {
                console.error("Error updating habit:", error);
            }
        }
    };

    const deleteHabit = async (id) => {
        setHabits(prev => prev.filter(h => h.id !== id));

        if (user) {
            try {
                const { error } = await supabase.from('habits').delete().eq('id', id);
                if (error) throw error;
            } catch (error) {
                console.error("Error deleting habit:", error);
            }
        }
    };

    const archiveHabit = async (id) => {
        await updateHabit(id, { archived: true });
    };

    // Habit Log Operations
    const logHabit = async (habitId, date, value, completed = false) => {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const key = `${habitId}_${dateStr}`;

        const logData = {
            habit_id: habitId,
            user_id: user?.id,
            date: dateStr,
            value,
            completed,
            logged_at: new Date().toISOString()
        };

        setHabitLogs(prev => ({
            ...prev,
            [key]: { ...logData, id: prev[key]?.id }
        }));

        if (user) {
            try {
                const { error } = await supabase
                    .from('habit_logs')
                    .upsert({
                        ...logData,
                        id: habitLogs[key]?.id
                    }, { onConflict: 'habit_id, date' });
                if (error) throw error;
            } catch (error) {
                console.error("Error logging habit:", error);
            }
        }
    };

    const getHabitLog = (habitId, date) => {
        const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
        const key = `${habitId}_${dateStr}`;
        return habitLogs[key] || null;
    };

    // Get habits scheduled for a specific date, sorted by reminder_time
    const getHabitsForDate = (date) => {
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.

        const filtered = habits.filter(habit => {
            if (habit.frequency === 'daily') return true;
            if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
                return habit.schedule_days?.includes(dayOfWeek);
            }
            return true;
        });

        // Sort by time_of_day order, then by reminder_time
        const timeOrder = { morning: 0, afternoon: 1, evening: 2, night: 3, anytime: 4 };
        return filtered.sort((a, b) => {
            const orderA = timeOrder[a.time_of_day] ?? 4;
            const orderB = timeOrder[b.time_of_day] ?? 4;
            if (orderA !== orderB) return orderA - orderB;
            // Within same time_of_day, sort by reminder_time
            if (a.reminder_time && b.reminder_time) return a.reminder_time.localeCompare(b.reminder_time);
            if (a.reminder_time) return -1;
            if (b.reminder_time) return 1;
            return 0;
        });
    };

    // Calculate streak for a habit
    const getHabitStreak = (habitId) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return { current: 0, best: 0 };

        let currentStreak = 0;
        let bestStreak = 0;
        let tempStreak = 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check backwards from today
        for (let i = 0; i < 365; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);
            const dateStr = checkDate.toISOString().split('T')[0];

            // Check if this day was scheduled
            const dayOfWeek = checkDate.getDay();
            const isScheduled = habit.frequency === 'daily' ||
                (habit.schedule_days?.includes(dayOfWeek));

            if (!isScheduled) continue;

            const log = getHabitLog(habitId, dateStr);

            if (log?.completed) {
                tempStreak++;
                if (i === 0 || currentStreak > 0) {
                    currentStreak = tempStreak;
                }
                bestStreak = Math.max(bestStreak, tempStreak);
            } else {
                if (i > 0) { // Don't break streak on today if not done yet
                    tempStreak = 0;
                    if (currentStreak > 0 && i !== 0) {
                        currentStreak = 0;
                    }
                }
            }
        }

        return { current: currentStreak, best: bestStreak };
    };

    // Get completion stats
    const getCompletionStats = (habitId, days = 7) => {
        const habit = habits.find(h => h.id === habitId);
        if (!habit) return { completed: 0, total: 0, rate: 0 };

        let completed = 0;
        let total = 0;

        const today = new Date();
        for (let i = 0; i < days; i++) {
            const checkDate = new Date(today);
            checkDate.setDate(checkDate.getDate() - i);

            const dayOfWeek = checkDate.getDay();
            const isScheduled = habit.frequency === 'daily' ||
                (habit.schedule_days?.includes(dayOfWeek));

            if (isScheduled) {
                total++;
                const log = getHabitLog(habitId, checkDate);
                if (log?.completed) completed++;
            }
        }

        return {
            completed,
            total,
            rate: total > 0 ? Math.round((completed / total) * 100) : 0
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
        getCompletionStats
    };

    return (
        <HabitContext.Provider value={value}>
            {children}
        </HabitContext.Provider>
    );
};
