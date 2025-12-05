import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

const TaskContext = createContext();

export const useTask = () => {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTask must be used within TaskProvider');
    }
    return context;
};

export const TaskProvider = ({ children }) => {
    const { user } = useAuth();

    // Task State
    const [tasks, setTasks] = useState(() => {
        try {
            const saved = localStorage.getItem('growth-tasks');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse tasks:", e);
            return [];
        }
    });

    // Schedule State
    const [scheduleItems, setScheduleItems] = useState(() => {
        try {
            const saved = localStorage.getItem('growth-schedule');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse schedule:", e);
            return [];
        }
    });

    // Load from Supabase
    const loadTasksFromSupabase = async () => {
        if (!user) {
            console.log('🔍 No user, skipping load');
            return;
        }

        console.log('🔍 Loading data for user:', user.id, user.email);

        try {
            // Load Tasks
            const { data: tasksData, error: tasksError } = await supabase
                .from('tasks')
                .select('*')
                .order('created_at', { ascending: true });

            console.log('📋 Tasks loaded:', tasksData?.length || 0, 'Error:', tasksError);

            if (tasksData) {
                const formattedTasks = tasksData.map(t => ({
                    ...t,
                    estimatedTime: t.estimated_time || t.estimatedTime
                }));
                setTasks(formattedTasks);
            }

            // Load Schedule Items
            const { data: scheduleData, error: scheduleError } = await supabase
                .from('schedule_items')
                .select('*')
                .order('start_time', { ascending: true });

            console.log('📅 Schedule loaded:', scheduleData?.length || 0, 'Error:', scheduleError);

            if (scheduleData) {
                const formattedSchedule = scheduleData.map(item => ({
                    ...item,
                    startTime: item.start_time
                }));
                setScheduleItems(formattedSchedule);
            }
        } catch (error) {
            console.error("❌ Error loading tasks:", error);
        }
    };

    // Auto-load on user change
    useEffect(() => {
        if (user) {
            loadTasksFromSupabase();
        }
    }, [user]);

    // Save to LocalStorage (Guest Mode)
    useEffect(() => {
        if (!user) {
            localStorage.setItem('growth-tasks', JSON.stringify(tasks));
            localStorage.setItem('growth-schedule', JSON.stringify(scheduleItems));
        }
    }, [tasks, scheduleItems, user]);

    // Task Handlers
    const addTask = async ({ title, difficulty, deadline, subject, estimatedTime }) => {
        // Convert local deadline string to UTC ISO string for storage
        const isoDeadline = deadline ? new Date(deadline).toISOString() : null;
        console.log("🕒 Timezone Debug:", {
            inputDeadline: deadline,
            isoDeadline,
            userTimezoneOffset: new Date().getTimezoneOffset()
        });

        const newTask = {
            id: user ? undefined : Date.now(),
            title,
            description: null,
            difficulty,
            subject: subject || 'other',
            deadline: isoDeadline,
            estimated_time: estimatedTime,
            estimatedTime: estimatedTime,
            status: 'growing',
            created_at: new Date().toISOString(),
            user_id: user?.id
        };

        const tempId = Date.now();
        setTasks(prev => [...prev, { ...newTask, id: user ? tempId : newTask.id }]);

        if (user) {
            const { id, estimatedTime, description, ...dbTask } = newTask;

            // Only include description if it's not null/undefined
            if (description) {
                dbTask.description = description;
            }

            // Try inserting with all fields
            let { data, error } = await supabase.from('tasks').insert([dbTask]).select().single();

            // Fallback: If insert fails (likely due to missing estimated_time column), try without it
            if (error) {
                console.warn("Insert failed, retrying without estimated_time...", error);
                const { estimated_time, ...legacyTask } = dbTask;
                const retry = await supabase.from('tasks').insert([legacyTask]).select().single();
                data = retry.data;
                error = retry.error;
            }

            if (data) {
                setTasks(prev => prev.map(t => t.id === tempId ? { ...t, ...data, estimatedTime: data.estimated_time } : t));
            } else if (error) {
                console.error("Error adding task:", error);
                // Revert optimistic update if both attempts fail
                setTasks(prev => prev.filter(t => t.id !== tempId));
                alert(`Failed to save task to cloud. Error: ${error.message || JSON.stringify(error)}`);
            }
        }

        return newTask;
    };


    const completeTask = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return null;

        let newStatus;
        let reward = 0;

        if (task.status === 'seed') {
            newStatus = 'growing';
        } else if (task.status === 'growing') {
            newStatus = 'harvested';

            switch (task.difficulty) {
                case 'hard': reward = 30; break;
                case 'medium': reward = 20; break;
                case 'easy': default: reward = 10; break;
            }

            if (task.deadline) {
                const now = new Date();
                const deadlineDate = new Date(task.deadline);
                if (now <= deadlineDate) {
                    reward += 10;
                } else {
                    reward = Math.max(0, reward - 5);
                }
            }
        }

        const updates = { status: newStatus, completed_at: new Date().toISOString() };

        setTasks(tasks.map(t =>
            t.id === id ? { ...t, ...updates, completedAt: updates.completed_at } : t
        ));

        if (user) {
            await supabase.from('tasks').update(updates).eq('id', id);
        }

        return { reward, task };
    };

    const restoreTask = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task || task.status !== 'harvested') return;

        const updates = { status: 'growing', completed_at: null };

        setTasks(tasks.map(t =>
            t.id === id ? { ...t, ...updates, completedAt: null } : t
        ));

        if (user) {
            await supabase.from('tasks').update(updates).eq('id', id);
        }
    };

    const deleteTask = async (id) => {
        setTasks(tasks.filter(t => t.id !== id));
        if (user) {
            await supabase.from('tasks').delete().eq('id', id);
        }
    };

    const updateTask = async (id, updates) => {
        // Handle deadline conversion if present in updates
        const processedUpdates = { ...updates };
        if (processedUpdates.deadline) {
            processedUpdates.deadline = new Date(processedUpdates.deadline).toISOString();
        }

        setTasks(tasks.map(t => t.id === id ? { ...t, ...processedUpdates } : t));

        if (user) {
            const dbUpdates = { ...processedUpdates };
            if (dbUpdates.estimatedTime) {
                dbUpdates.estimated_time = dbUpdates.estimatedTime;
                delete dbUpdates.estimatedTime;
            }
            await supabase.from('tasks').update(dbUpdates).eq('id', id);
        }
    };

    // Schedule Handlers
    const addScheduleItem = async (itemData) => {
        const newItem = {
            ...itemData,
            id: user ? undefined : Date.now(),
            user_id: user?.id,
            created_at: new Date().toISOString(),
            start_time: itemData.startTime,
            startTime: itemData.startTime,
            // Map recurrence fields
            recurrence_type: itemData.recurrenceType || 'none',
            recurrence_interval: itemData.recurrenceInterval || 1,
            recurrence_days_of_week: itemData.recurrenceDaysOfWeek || [],
            recurrence_end_date: itemData.recurrenceEndDate || null,
            color: itemData.color || '#6366f1',
            notes: itemData.notes || null
        };

        const tempId = Date.now();
        setScheduleItems(prev => [...prev, { ...newItem, id: user ? tempId : newItem.id }]);

        if (user) {
            // Only include DB-compatible fields (exclude camelCase versions)
            const { id, startTime, recurrenceType, recurrenceInterval, recurrenceDaysOfWeek, recurrenceEndDate, ...dbItem } = newItem;
            const { data, error } = await supabase.from('schedule_items').insert([dbItem]).select().single();
            if (data) {
                setScheduleItems(prev => prev.map(i => i.id === tempId ? {
                    ...i,
                    ...data,
                    startTime: data.start_time,
                    recurrenceType: data.recurrence_type,
                    recurrenceInterval: data.recurrence_interval,
                    recurrenceDaysOfWeek: data.recurrence_days_of_week,
                    recurrenceEndDate: data.recurrence_end_date
                } : i));
            } else if (error) {
                console.error("Error adding schedule item:", error);
            }
        }
    };

    const updateScheduleItem = async (id, updates) => {
        // Map camelCase to snake_case for local state
        const processedUpdates = { ...updates };
        if (updates.startTime) processedUpdates.start_time = updates.startTime;
        if (updates.recurrenceType !== undefined) processedUpdates.recurrence_type = updates.recurrenceType;
        if (updates.recurrenceInterval !== undefined) processedUpdates.recurrence_interval = updates.recurrenceInterval;
        if (updates.recurrenceDaysOfWeek !== undefined) processedUpdates.recurrence_days_of_week = updates.recurrenceDaysOfWeek;
        if (updates.recurrenceEndDate !== undefined) processedUpdates.recurrence_end_date = updates.recurrenceEndDate;

        setScheduleItems(prev => prev.map(i => i.id === id ? { ...i, ...processedUpdates } : i));

        if (user) {
            // For DB, use only snake_case fields
            const dbUpdates = {};
            if (updates.title) dbUpdates.title = updates.title;
            if (updates.startTime) dbUpdates.start_time = updates.startTime;
            if (updates.duration) dbUpdates.duration = updates.duration;
            if (updates.category) dbUpdates.category = updates.category;
            if (updates.color) dbUpdates.color = updates.color;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
            if (updates.recurrenceType !== undefined) dbUpdates.recurrence_type = updates.recurrenceType;
            if (updates.recurrenceInterval !== undefined) dbUpdates.recurrence_interval = updates.recurrenceInterval;
            if (updates.recurrenceDaysOfWeek !== undefined) dbUpdates.recurrence_days_of_week = updates.recurrenceDaysOfWeek;
            if (updates.recurrenceEndDate !== undefined) dbUpdates.recurrence_end_date = updates.recurrenceEndDate;

            await supabase.from('schedule_items').update(dbUpdates).eq('id', id);
        }
    };

    const deleteScheduleItem = async (id) => {
        setScheduleItems(prev => prev.filter(i => i.id !== id));
        if (user) {
            await supabase.from('schedule_items').delete().eq('id', id);
        }
    };

    const value = {
        tasks,
        scheduleItems,
        addTask,
        updateTask,
        deleteTask,
        completeTask,
        restoreTask,
        addScheduleItem,
        updateScheduleItem,
        deleteScheduleItem
    };

    return (
        <TaskContext.Provider value={value}>
            {children}
        </TaskContext.Provider>
    );
};
