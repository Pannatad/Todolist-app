import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { normalizeTaskRecord } from '../utils/taskState';

const TaskContext = createContext();

const formatScheduleItems = (items = []) => (
    items.map(item => ({
        ...item,
        startTime: item.start_time,
        recurrenceExceptions: item.recurrence_exceptions || []
    }))
);

const buildScheduleInsertPayloads = (item) => {
    const fullPayload = {
        user_id: item.user_id,
        title: item.title,
        start_time: item.start_time,
        duration: item.duration,
        category: item.category,
        created_at: item.created_at,
        color: item.color,
        notes: item.notes,
        recurrence_type: item.recurrence_type,
        recurrence_interval: item.recurrence_interval,
        recurrence_days_of_week: item.recurrence_days_of_week,
        recurrence_end_date: item.recurrence_end_date,
        recurrence_exceptions: item.recurrence_exceptions
    };

    const legacyPayload = {
        user_id: item.user_id,
        title: item.title,
        start_time: item.start_time,
        duration: item.duration,
        category: item.category,
        created_at: item.created_at
    };

    const minimalPayload = {
        user_id: item.user_id,
        title: item.title,
        start_time: item.start_time,
        created_at: item.created_at
    };

    return [fullPayload, legacyPayload, minimalPayload];
};

export const useTask = () => {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTask must be used within TaskProvider');
    }
    return context;
};

export const TaskProvider = ({ children }) => {
    const { user } = useAuth();

    // Task State - start empty, load based on user state
    const [tasks, setTasks] = useState([]);
    const [scheduleItems, setScheduleItems] = useState([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const refreshTasks = useCallback(async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        console.log('📋 Tasks loaded:', data?.length || 0, 'Error:', error);

        if (error) throw error;

        setTasks((data || []).map(normalizeTaskRecord));
    }, [user]);

    const refreshScheduleItems = useCallback(async () => {
        if (!user) return;

        const { data, error } = await supabase
            .from('schedule_items')
            .select('*')
            .eq('user_id', user.id)
            .order('start_time', { ascending: true });

        console.log('📅 Schedule loaded:', data?.length || 0, 'Error:', error);

        if (error) throw error;

        setScheduleItems(formatScheduleItems(data || []));
    }, [user]);

    // Load from Supabase
    const loadTasksFromSupabase = useCallback(async () => {
        if (!user) {
            console.log('🔍 No user, skipping load');
            return;
        }

        console.log('🔍 Loading data for user:', user.id, user.email);

        try {
            await Promise.all([
                refreshTasks(),
                refreshScheduleItems()
            ]);
        } catch (error) {
            console.error("❌ Error loading tasks:", error);
        }
    }, [refreshScheduleItems, refreshTasks, user]);

    // Load from localStorage (guest mode)
    const loadFromLocalStorage = () => {
        try {
            const savedTasks = localStorage.getItem('growth-tasks-guest');
            const savedSchedule = localStorage.getItem('growth-schedule-guest');
            if (savedTasks) setTasks(JSON.parse(savedTasks).map(normalizeTaskRecord));
            if (savedSchedule) setScheduleItems(JSON.parse(savedSchedule));
        } catch (e) {
            console.error("Failed to load from localStorage:", e);
        }
    };

    // Handle user state changes - load appropriate data
    useEffect(() => {
        setIsLoaded(false);
        if (user) {
            // User is logged in - load from Supabase
            loadTasksFromSupabase().then(() => setIsLoaded(true));
        } else {
            // Guest mode - reset and load from guest-specific localStorage
            setTasks([]);
            setScheduleItems([]);
            loadFromLocalStorage();
            setIsLoaded(true);
        }
    }, [loadTasksFromSupabase, user]);

    useEffect(() => {
        if (!user || !supabase) return undefined;

        const channel = supabase
            .channel(`tasks-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tasks',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    refreshTasks().catch((error) => {
                        console.error('❌ Realtime task refresh failed:', error);
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refreshTasks, user]);

    useEffect(() => {
        if (!user || !supabase) return undefined;

        const channel = supabase
            .channel(`schedule-items-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'schedule_items',
                    filter: `user_id=eq.${user.id}`
                },
                () => {
                    refreshScheduleItems().catch((error) => {
                        console.error('❌ Realtime schedule refresh failed:', error);
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [refreshScheduleItems, user]);

    // Save to LocalStorage (Guest Mode only)
    useEffect(() => {
        if (!user && isLoaded) {
            localStorage.setItem('growth-tasks-guest', JSON.stringify(tasks));
            localStorage.setItem('growth-schedule-guest', JSON.stringify(scheduleItems));
        }
    }, [tasks, scheduleItems, user, isLoaded]);

    // Task Handlers
    const addTask = async ({ title, difficulty, deadline, subject, estimatedTime, description }) => {
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
            description: description || null,
            difficulty,
            subject: subject || 'other',
            deadline: isoDeadline,
            estimated_time: estimatedTime,
            estimatedTime: estimatedTime,
            status: 'growing',
            completed: false,
            completed_at: null,
            completedAt: null,
            created_at: new Date().toISOString(),
            user_id: user?.id
        };

        const tempId = Date.now();
        setTasks(prev => [...prev, normalizeTaskRecord({ ...newTask, id: user ? tempId : newTask.id })]);

        if (user) {
            const dbTask = { ...newTask };
            delete dbTask.id;
            delete dbTask.estimatedTime;
            delete dbTask.completed;
            delete dbTask.completedAt;

            // Try inserting with all fields
            let { data, error } = await supabase.from('tasks').insert([dbTask]).select().single();

            // Fallback: If insert fails (likely due to missing estimated_time column), try without it
            if (error) {
                console.warn("Insert failed, retrying without estimated_time...", error);
                const legacyTask = { ...dbTask };
                delete legacyTask.estimated_time;
                const retry = await supabase.from('tasks').insert([legacyTask]).select().single();
                data = retry.data;
                error = retry.error;
            }

            if (data) {
                setTasks(prev => prev.map(t => t.id === tempId ? normalizeTaskRecord({ ...t, ...data }) : t));
            } else if (error) {
                console.error("Error adding task:", error);
                // Revert optimistic update if both attempts fail
                setTasks(prev => prev.filter(t => t.id !== tempId));
                alert(`Failed to save task to cloud. Error: ${error.message || JSON.stringify(error)}`);
            }
        }

        return normalizeTaskRecord(newTask);
    };


    const completeTask = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task) return null;

        let newStatus = task.status;
        let reward = 0;
        let completedAt = null;

        if (task.status === 'seed') {
            newStatus = 'growing';
        } else if (task.status === 'growing') {
            newStatus = 'harvested';
            completedAt = new Date().toISOString();

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

        const updates = { status: newStatus, completed_at: completedAt };

        setTasks(tasks.map(t =>
            t.id === id ? normalizeTaskRecord({ ...t, ...updates, completedAt }) : t
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
            t.id === id ? normalizeTaskRecord({ ...t, ...updates, completedAt: null, completed: false }) : t
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
        const existingTask = tasks.find(t => t.id === id);
        if (!existingTask) return;

        // Handle deadline conversion if present in updates
        const processedUpdates = { ...updates };
        if (processedUpdates.deadline) {
            processedUpdates.deadline = new Date(processedUpdates.deadline).toISOString();
        }
        if (processedUpdates.completedAt && !processedUpdates.completed_at) {
            processedUpdates.completed_at = processedUpdates.completedAt;
        }
        if (processedUpdates.completed !== undefined && processedUpdates.status === undefined) {
            processedUpdates.status = processedUpdates.completed ? 'harvested' : 'growing';
        }
        if (processedUpdates.completed_at !== undefined && processedUpdates.status === undefined) {
            processedUpdates.status = processedUpdates.completed_at ? 'harvested' : 'growing';
        }

        const mergedTask = normalizeTaskRecord({ ...existingTask, ...processedUpdates });

        setTasks(tasks.map(t => t.id === id ? mergedTask : t));

        if (user) {
            const dbUpdates = {};
            if (processedUpdates.title !== undefined) dbUpdates.title = mergedTask.title;
            if (processedUpdates.description !== undefined) dbUpdates.description = mergedTask.description;
            if (processedUpdates.difficulty !== undefined) dbUpdates.difficulty = mergedTask.difficulty;
            if (processedUpdates.subject !== undefined) dbUpdates.subject = mergedTask.subject;
            if (processedUpdates.deadline !== undefined) dbUpdates.deadline = mergedTask.deadline;
            if (processedUpdates.archived !== undefined) dbUpdates.archived = mergedTask.archived;
            if (processedUpdates.estimatedTime !== undefined || processedUpdates.estimated_time !== undefined) {
                dbUpdates.estimated_time = mergedTask.estimated_time;
            }
            if (
                processedUpdates.status !== undefined ||
                processedUpdates.completed !== undefined ||
                processedUpdates.completedAt !== undefined ||
                processedUpdates.completed_at !== undefined
            ) {
                dbUpdates.status = mergedTask.status;
                dbUpdates.completed_at = mergedTask.completed_at;
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
            recurrence_exceptions: itemData.recurrenceExceptions || [],
            recurrenceExceptions: itemData.recurrenceExceptions || [],
            color: itemData.color || '#6366f1',
            notes: itemData.notes || null
        };

        const tempId = Date.now();
        setScheduleItems(prev => [...prev, { ...newItem, id: user ? tempId : newItem.id }]);

        if (user) {
            let insertedRow = null;
            let lastError = null;

            for (const payload of buildScheduleInsertPayloads(newItem)) {
                const { data, error } = await supabase
                    .from('schedule_items')
                    .insert([payload])
                    .select()
                    .single();

                if (data) {
                    insertedRow = data;
                    break;
                }

                lastError = error;
                console.warn('Schedule insert attempt failed, trying fallback payload...', error);
            }

            if (insertedRow) {
                setScheduleItems(prev => prev.map(i => i.id === tempId ? {
                    ...i,
                    ...insertedRow,
                    startTime: insertedRow.start_time,
                    recurrenceType: insertedRow.recurrence_type,
                    recurrenceInterval: insertedRow.recurrence_interval,
                    recurrenceDaysOfWeek: insertedRow.recurrence_days_of_week,
                    recurrenceEndDate: insertedRow.recurrence_end_date,
                    recurrenceExceptions: insertedRow.recurrence_exceptions || []
                } : i));

                return insertedRow;
            }

            setScheduleItems(prev => prev.filter(i => i.id !== tempId));
            console.error('Error adding schedule item:', lastError);
            throw new Error(lastError?.message || 'Failed to save schedule item to cloud.');
        }

        return newItem;
    };

    const updateScheduleItem = async (id, updates) => {
        const existingItem = scheduleItems.find(item => item.id === id);
        if (!existingItem) {
            throw new Error('Schedule item not found.');
        }

        // Map camelCase to snake_case for local state
        const processedUpdates = { ...updates };
        if (updates.startTime) processedUpdates.start_time = updates.startTime;
        if (updates.recurrenceType !== undefined) processedUpdates.recurrence_type = updates.recurrenceType;
        if (updates.recurrenceInterval !== undefined) processedUpdates.recurrence_interval = updates.recurrenceInterval;
        if (updates.recurrenceDaysOfWeek !== undefined) processedUpdates.recurrence_days_of_week = updates.recurrenceDaysOfWeek;
        if (updates.recurrenceEndDate !== undefined) processedUpdates.recurrence_end_date = updates.recurrenceEndDate;
        if (updates.recurrenceExceptions !== undefined) processedUpdates.recurrence_exceptions = updates.recurrenceExceptions;

        setScheduleItems(prev => prev.map(i => i.id === id ? { ...i, ...processedUpdates } : i));

        if (user) {
            // For DB, use only snake_case fields
            const dbUpdates = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.startTime !== undefined) dbUpdates.start_time = updates.startTime;
            if (updates.duration !== undefined) dbUpdates.duration = updates.duration;
            if (updates.category !== undefined) dbUpdates.category = updates.category;
            if (updates.color !== undefined) dbUpdates.color = updates.color;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
            if (updates.recurrenceType !== undefined) dbUpdates.recurrence_type = updates.recurrenceType;
            if (updates.recurrenceInterval !== undefined) dbUpdates.recurrence_interval = updates.recurrenceInterval;
            if (updates.recurrenceDaysOfWeek !== undefined) dbUpdates.recurrence_days_of_week = updates.recurrenceDaysOfWeek;
            if (updates.recurrenceEndDate !== undefined) dbUpdates.recurrence_end_date = updates.recurrenceEndDate;
            if (updates.recurrenceExceptions !== undefined) dbUpdates.recurrence_exceptions = updates.recurrenceExceptions;

            const { data, error } = await supabase
                .from('schedule_items')
                .update(dbUpdates)
                .eq('id', id)
                .select()
                .maybeSingle();

            if (error || !data) {
                setScheduleItems(prev => prev.map(i => i.id === id ? existingItem : i));
                throw new Error(error?.message || 'Schedule item could not be updated in Supabase.');
            }

            setScheduleItems(prev => prev.map(i => i.id === id ? {
                ...i,
                ...data,
                startTime: data.start_time,
                recurrenceExceptions: data.recurrence_exceptions || []
            } : i));
        }

        return { ...existingItem, ...processedUpdates };
    };

    const deleteScheduleItem = async (id, options = {}) => {
        const { occurrenceDate } = options;
        const existingItem = scheduleItems.find(item => item.id === id);

        if (!existingItem) return;

        if (occurrenceDate && (existingItem.recurrence_type || existingItem.recurrenceType) !== 'none') {
            const currentExceptions = existingItem.recurrence_exceptions || existingItem.recurrenceExceptions || [];
            const nextExceptions = Array.from(new Set([...currentExceptions, occurrenceDate])).sort();
            await updateScheduleItem(id, { recurrenceExceptions: nextExceptions });
            return;
        }

        setScheduleItems(prev => prev.filter(i => i.id !== id));
        if (user) {
            const { data, error } = await supabase
                .from('schedule_items')
                .delete()
                .eq('id', id)
                .select('id')
                .maybeSingle();

            if (error || !data) {
                setScheduleItems(prev => [...prev, existingItem].sort((a, b) =>
                    new Date(a.startTime || a.start_time || 0) - new Date(b.startTime || b.start_time || 0)
                ));
                throw new Error(error?.message || 'Schedule item could not be deleted from Supabase.');
            }
        }

        return existingItem;
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
