/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { calculateCompletionReward, normalizeTaskRecord, sanitizeTaskUpdates } from '../utils/taskState';
import { toast } from '../ui/Toast';
import { log } from '../utils/log.js';
import { createScheduleRepo } from '../data/scheduleRepo';
import { createTasksRepo } from '../data/tasksRepo';

const TaskContext = createContext();

const formatScheduleItems = (items = []) => (
    items.map(item => ({
        ...item,
        startTime: item.start_time,
        recurrenceExceptions: item.recurrence_exceptions || [],
        recurrenceOverrides: item.recurrence_overrides || {},
        itemKind: item.item_kind || 'event',
        parentItemId: item.parent_item_id || null,
        sourceTemplateId: item.source_template_id || null,
        sourceTemplateVersion: item.source_template_version || null,
        templateBlockId: item.template_block_id || null,
        templateApplicationId: item.template_application_id || null
    }))
);

export const useTask = () => {
    const context = useContext(TaskContext);
    if (!context) {
        throw new Error('useTask must be used within TaskProvider');
    }
    return context;
};

export const TaskProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id;
    const scheduleRepo = useMemo(() => createScheduleRepo(userId ? { id: userId } : null), [userId]);
    const tasksRepo = useMemo(() => createTasksRepo(userId ? { id: userId } : null), [userId]);

    // Task State - start empty, load based on user state
    const [tasks, setTasks] = useState([]);
    const [scheduleItems, setScheduleItems] = useState([]);

    const refreshTasks = useCallback(async () => {
        const data = await tasksRepo.list();
        log('📋 Tasks loaded:', data?.length || 0);
        setTasks(data.map(normalizeTaskRecord));
    }, [tasksRepo]);

    const refreshScheduleItems = useCallback(async () => {
        const data = await scheduleRepo.list();
        log('📅 Schedule loaded:', data?.length || 0);
        setScheduleItems(formatScheduleItems(data));
    }, [scheduleRepo]);

    // Load from Supabase
    const loadTasksFromSupabase = useCallback(async () => {
        if (!user) {
            log('🔍 No user, skipping load');
            return;
        }

        log('🔍 Loading data for user:', user.id, user.email);

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
    const loadFromLocalStorage = useCallback(async () => {
        try {
            setTasks((await tasksRepo.list()).map(normalizeTaskRecord));
            setScheduleItems(formatScheduleItems(await scheduleRepo.list()));
        } catch (e) {
            console.error("Failed to load from localStorage:", e);
        }
    }, [scheduleRepo, tasksRepo]);

    // Handle user state changes - load appropriate data
    useEffect(() => {
        if (user) {
            // User is logged in - load from Supabase
            loadTasksFromSupabase();
        } else {
            // Guest mode - reset and load from guest-specific localStorage
            setTasks([]);
            setScheduleItems([]);
            loadFromLocalStorage();
        }
    }, [loadFromLocalStorage, loadTasksFromSupabase, user]);

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

    // Task Handlers
    const addTask = async ({ title, deadline, subject, estimatedTime, description, subtasks = [] }) => {
        // Convert local deadline string to UTC ISO string for storage
        const isoDeadline = deadline ? new Date(deadline).toISOString() : null;
        log("🕒 Timezone Debug:", {
            inputDeadline: deadline,
            isoDeadline,
            userTimezoneOffset: new Date().getTimezoneOffset()
        });

        const newTask = {
            id: user ? undefined : Date.now(),
            title,
            description: description || null,
            subject: subject || null,
            deadline: isoDeadline,
            estimated_time: estimatedTime,
            estimatedTime: estimatedTime,
            subtasks,
            status: 'growing',
            completed: false,
            completed_at: null,
            completedAt: null,
            created_at: new Date().toISOString(),
            user_id: user?.id
        };

        const tempId = Date.now();
        setTasks(prev => [...prev, normalizeTaskRecord({ ...newTask, id: user ? tempId : newTask.id })]);

        try {
            const data = await tasksRepo.create(newTask);
            if (user) {
                setTasks(prev => prev.map(t => t.id === tempId ? normalizeTaskRecord({ ...t, ...data }) : t));
            }
        } catch (error) {
            console.error("Error adding task:", error);
            setTasks(prev => prev.filter(t => t.id !== tempId));
            if (user) toast(`Failed to save task to cloud: ${error.message || JSON.stringify(error)}`, { tone: 'error' });
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

            reward = calculateCompletionReward(task, new Date(completedAt));
        }

        const updates = { status: newStatus, completed_at: completedAt };

        setTasks(tasks.map(t =>
            t.id === id ? normalizeTaskRecord({ ...t, ...updates, completedAt }) : t
        ));

        await tasksRepo.update(id, updates, normalizeTaskRecord({ ...task, ...updates, completedAt }));

        return { reward, task };
    };

    const restoreTask = async (id) => {
        const task = tasks.find(t => t.id === id);
        if (!task || task.status !== 'harvested') return;

        const updates = { status: 'growing', completed_at: null };

        setTasks(tasks.map(t =>
            t.id === id ? normalizeTaskRecord({ ...t, ...updates, completedAt: null, completed: false }) : t
        ));

        await tasksRepo.update(id, updates, normalizeTaskRecord({ ...task, ...updates, completedAt: null, completed: false }));
    };

    const deleteTask = async (id) => {
        setTasks(tasks.filter(t => t.id !== id));
        await tasksRepo.remove(id);
    };

    const updateTask = async (id, updates) => {
        // Handle deadline conversion if present in updates
        const processedUpdates = sanitizeTaskUpdates(updates);
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

        const existingTaskForSave = tasks.find(t => t.id === id);
        if (!existingTaskForSave) return;
        const mergedTaskForSave = normalizeTaskRecord({ ...existingTaskForSave, ...processedUpdates });

        setTasks(prevTasks => {
            const existingTask = prevTasks.find(t => t.id === id);
            if (!existingTask) return prevTasks;

            const mergedTask = normalizeTaskRecord({ ...existingTask, ...processedUpdates });
            const nextTasks = prevTasks.map(t => t.id === id ? mergedTask : t);

            return nextTasks;
        });
        await tasksRepo.update(id, processedUpdates, mergedTaskForSave);
    };

    // Schedule Handlers
    const addScheduleItem = async (itemData) => {
        const newItem = {
            ...itemData,
            id: itemData.id || (user ? undefined : crypto.randomUUID()),
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
            recurrence_overrides: itemData.recurrenceOverrides || {},
            recurrenceOverrides: itemData.recurrenceOverrides || {},
            item_kind: itemData.itemKind || 'event',
            itemKind: itemData.itemKind || 'event',
            parent_item_id: itemData.parentItemId || null,
            parentItemId: itemData.parentItemId || null,
            source_template_id: itemData.sourceTemplateId || null,
            sourceTemplateId: itemData.sourceTemplateId || null,
            source_template_version: itemData.sourceTemplateVersion || null,
            sourceTemplateVersion: itemData.sourceTemplateVersion || null,
            template_block_id: itemData.templateBlockId || null,
            templateBlockId: itemData.templateBlockId || null,
            template_application_id: itemData.templateApplicationId || null,
            templateApplicationId: itemData.templateApplicationId || null,
            color: itemData.color || '#6366f1',
            notes: itemData.notes || null
        };

        const tempId = Date.now();
        const optimisticId = user ? tempId : newItem.id;
        setScheduleItems(prev => [...prev, { ...newItem, id: optimisticId }]);

        try {
            const insertedRow = await scheduleRepo.create(newItem);
            if (user) {
                setScheduleItems(prev => prev.map(i => i.id === tempId ? {
                    ...i,
                    ...insertedRow,
                    startTime: insertedRow.start_time,
                    recurrenceType: insertedRow.recurrence_type,
                    recurrenceInterval: insertedRow.recurrence_interval,
                    recurrenceDaysOfWeek: insertedRow.recurrence_days_of_week,
                    recurrenceEndDate: insertedRow.recurrence_end_date,
                    recurrenceExceptions: insertedRow.recurrence_exceptions || [],
                    recurrenceOverrides: insertedRow.recurrence_overrides || {},
                    itemKind: insertedRow.item_kind || 'event',
                    parentItemId: insertedRow.parent_item_id || null,
                    sourceTemplateId: insertedRow.source_template_id || null,
                    sourceTemplateVersion: insertedRow.source_template_version || null,
                    templateBlockId: insertedRow.template_block_id || null,
                    templateApplicationId: insertedRow.template_application_id || null
                } : i));
            }
            return user ? insertedRow : newItem;
        } catch (error) {
            setScheduleItems(prev => prev.filter(i => i.id !== optimisticId));
            console.error('Error adding schedule item:', error);
            throw error;
        }
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
        if (updates.recurrenceOverrides !== undefined) processedUpdates.recurrence_overrides = updates.recurrenceOverrides;
        if (updates.itemKind !== undefined) processedUpdates.item_kind = updates.itemKind;
        if (updates.parentItemId !== undefined) processedUpdates.parent_item_id = updates.parentItemId;
        if (updates.sourceTemplateId !== undefined) processedUpdates.source_template_id = updates.sourceTemplateId;
        if (updates.sourceTemplateVersion !== undefined) processedUpdates.source_template_version = updates.sourceTemplateVersion;
        if (updates.templateBlockId !== undefined) processedUpdates.template_block_id = updates.templateBlockId;
        if (updates.templateApplicationId !== undefined) processedUpdates.template_application_id = updates.templateApplicationId;

        setScheduleItems(prev => prev.map(i => i.id === id ? { ...i, ...processedUpdates } : i));

        try {
            const updatedRow = await scheduleRepo.update(id, processedUpdates);
            if (user) {
                setScheduleItems(prev => prev.map(i => i.id === id ? {
                    ...i,
                    ...updatedRow,
                    startTime: updatedRow.start_time,
                    recurrenceType: updatedRow.recurrence_type,
                    recurrenceInterval: updatedRow.recurrence_interval,
                    recurrenceDaysOfWeek: updatedRow.recurrence_days_of_week || [],
                    recurrenceEndDate: updatedRow.recurrence_end_date,
                    recurrenceExceptions: updatedRow.recurrence_exceptions || [],
                    recurrenceOverrides: updatedRow.recurrence_overrides || {},
                    itemKind: updatedRow.item_kind || 'event',
                    parentItemId: updatedRow.parent_item_id || null,
                    sourceTemplateId: updatedRow.source_template_id || null,
                    sourceTemplateVersion: updatedRow.source_template_version || null,
                    templateBlockId: updatedRow.template_block_id || null,
                    templateApplicationId: updatedRow.template_application_id || null
                } : i));
            }
        } catch (error) {
            setScheduleItems(prev => prev.map(i => i.id === id ? existingItem : i));
            throw error;
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
        try {
            await scheduleRepo.remove(id);
        } catch (error) {
            setScheduleItems(prev => [...prev, existingItem].sort((a, b) =>
                new Date(a.startTime || a.start_time || 0) - new Date(b.startTime || b.start_time || 0)
            ));
            throw error;
        }

        return existingItem;
    };

    const restoreScheduleItem = async (item) => addScheduleItem({
        ...item,
        id: item.id,
        startTime: item.startTime || item.start_time,
        recurrenceType: item.recurrenceType || item.recurrence_type,
        recurrenceInterval: item.recurrenceInterval || item.recurrence_interval,
        recurrenceDaysOfWeek: item.recurrenceDaysOfWeek || item.recurrence_days_of_week,
        recurrenceEndDate: item.recurrenceEndDate || item.recurrence_end_date,
        recurrenceExceptions: item.recurrenceExceptions || item.recurrence_exceptions,
        recurrenceOverrides: item.recurrenceOverrides || item.recurrence_overrides,
        itemKind: item.itemKind || item.item_kind,
        parentItemId: item.parentItemId || item.parent_item_id,
        sourceTemplateId: item.sourceTemplateId || item.source_template_id,
        sourceTemplateVersion: item.sourceTemplateVersion || item.source_template_version,
        templateBlockId: item.templateBlockId || item.template_block_id,
        templateApplicationId: item.templateApplicationId || item.template_application_id
    });

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
        deleteScheduleItem,
        restoreScheduleItem
    };

    return (
        <TaskContext.Provider value={value}>
            {children}
        </TaskContext.Provider>
    );
};
