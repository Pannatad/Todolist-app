/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { calculateCompletionReward, normalizeTaskRecord, sanitizeTaskUpdates } from '../utils/taskState';
import { toast } from '../ui/Toast';
import { log } from '../utils/log.js';
import { createScheduleRepo, normalizeScheduleRecord } from '../data/scheduleRepo';
import { createTasksRepo, normalizeTaskRecord as normalizeTaskPersistenceRecord } from '../data/tasksRepo';

const TaskContext = createContext();

const formatScheduleItems = (items = []) => (
    items.map(normalizeScheduleRecord)
);

const formatTask = (task) => normalizeTaskRecord(normalizeTaskPersistenceRecord(task));

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
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);

    const refreshTasks = useCallback(async () => {
        const data = await tasksRepo.list();
        log('📋 Tasks loaded:', data?.length || 0);
        setTasks(data.map(formatTask));
        return data;
    }, [tasksRepo]);

    const refreshScheduleItems = useCallback(async () => {
        const data = await scheduleRepo.list();
        log('📅 Schedule loaded:', data?.length || 0);
        setScheduleItems(formatScheduleItems(data));
        return data;
    }, [scheduleRepo]);

    const refreshData = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);

        const results = await Promise.allSettled([refreshTasks(), refreshScheduleItems()]);
        const failures = results
            .map((result, index) => result.status === 'rejected' ? {
                source: index === 0 ? 'tasks' : 'schedule',
                error: result.reason
            } : null)
            .filter(Boolean);

        if (failures.length) {
            const sourceLabel = failures.map(({ source }) => source).join(' and ');
            const error = new Error(`Unable to load ${sourceLabel}. Retry when the connection is available.`);
            error.sources = failures.reduce((sources, failure) => ({
                ...sources,
                [failure.source]: failure.error
            }), {});
            setLoadError(error);
            console.error('❌ Error loading task data:', error);
        }

        setIsLoading(false);
        return { failures };
    }, [refreshScheduleItems, refreshTasks]);

    // Handle user state changes - load appropriate data
    useEffect(() => {
        if (user) {
            log('🔍 Loading data for user:', user.id, user.email);
            refreshData();
        } else {
            // Guest mode - reset and load from guest-specific localStorage
            setTasks([]);
            setScheduleItems([]);
            refreshData();
        }
    }, [refreshData, user]);

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
    const addTask = async ({
        title,
        deadline,
        subject,
        estimatedTime,
        description,
        subtasks = [],
        workspace = 'personal',
        uniKind = null,
        uni_kind: persistedUniKind,
        isMilestone,
        is_milestone: persistedIsMilestone
    }) => {
        // Convert local deadline string to UTC ISO string for storage
        const parsedDeadline = deadline ? new Date(deadline) : null;
        const isoDeadline = deadline
            ? (parsedDeadline && !Number.isNaN(parsedDeadline.getTime()) ? parsedDeadline.toISOString() : deadline)
            : null;
        const resolvedUniKind = uniKind ?? persistedUniKind ?? null;
        const resolvedIsMilestone = isMilestone ?? persistedIsMilestone ?? false;
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
            user_id: user?.id,
            workspace,
            uniKind: resolvedUniKind,
            uni_kind: resolvedUniKind,
            isMilestone: resolvedIsMilestone,
            is_milestone: resolvedIsMilestone
        };

        const tempId = Date.now();
        const optimisticId = user ? tempId : newTask.id;
        setTasks(prev => [...prev, formatTask({ ...newTask, id: optimisticId })]);

        try {
            const created = formatTask(await tasksRepo.create(newTask));
            setTasks(prev => prev.map(task => task.id === optimisticId ? created : task));
            return created;
        } catch (error) {
            console.error("Error adding task:", error);
            setTasks(prev => prev.filter(t => t.id !== optimisticId));
            if (user) toast(`Failed to save task to cloud: ${error.message || JSON.stringify(error)}`, { tone: 'error' });
            return null;
        }
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
        const existingTaskForSave = tasks.find(t => t.id === id);
        if (!existingTaskForSave) return;

        // Handle deadline conversion if present in updates
        const processedUpdates = sanitizeTaskUpdates(updates);
        if (processedUpdates.deadline !== undefined && processedUpdates.deadline !== null) {
            const parsedDeadline = new Date(processedUpdates.deadline);
            processedUpdates.deadline = Number.isNaN(parsedDeadline.getTime())
                ? processedUpdates.deadline
                : parsedDeadline.toISOString();
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

        if (updates.uniKind !== undefined || updates.uni_kind !== undefined) {
            const nextUniKind = updates.uniKind ?? updates.uni_kind;
            processedUpdates.uniKind = nextUniKind;
            processedUpdates.uni_kind = nextUniKind;
        }
        if (updates.isMilestone !== undefined || updates.is_milestone !== undefined) {
            const nextIsMilestone = updates.isMilestone ?? updates.is_milestone;
            processedUpdates.isMilestone = nextIsMilestone;
            processedUpdates.is_milestone = nextIsMilestone;
        }

        const mergedTaskForSave = formatTask({ ...existingTaskForSave, ...processedUpdates });

        setTasks(prevTasks => {
            const existingTask = prevTasks.find(t => t.id === id);
            if (!existingTask) return prevTasks;

            const mergedTask = formatTask({ ...existingTask, ...processedUpdates });
            const nextTasks = prevTasks.map(t => t.id === id ? mergedTask : t);

            return nextTasks;
        });
        try {
            const updated = await tasksRepo.update(id, processedUpdates, mergedTaskForSave);
            return formatTask(updated || mergedTaskForSave);
        } catch (error) {
            setTasks(prevTasks => prevTasks.map(task => task.id === id ? existingTaskForSave : task));
            if (user) toast(`Failed to update task in the cloud: ${error.message || JSON.stringify(error)}`, { tone: 'error' });
            throw error;
        }
    };

    // Schedule Handlers
    const addScheduleItem = async (itemData) => {
        const startTime = itemData.startTime ?? itemData.start_time;
        const resolvedUniKind = itemData.uniKind ?? itemData.uni_kind ?? null;
        const resolvedIsMilestone = itemData.isMilestone ?? itemData.is_milestone ?? false;
        const newItem = {
            ...itemData,
            id: itemData.id || (user ? undefined : crypto.randomUUID()),
            user_id: user?.id,
            created_at: new Date().toISOString(),
            start_time: startTime,
            startTime,
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
            notes: itemData.notes || null,
            workspace: itemData.workspace ?? 'personal',
            uniKind: resolvedUniKind,
            uni_kind: resolvedUniKind,
            isMilestone: resolvedIsMilestone,
            is_milestone: resolvedIsMilestone
        };

        const tempId = Date.now();
        const optimisticId = user ? tempId : newItem.id;
        setScheduleItems(prev => [...prev, normalizeScheduleRecord({ ...newItem, id: optimisticId })]);

        try {
            const insertedRow = await scheduleRepo.create(newItem);
            const created = normalizeScheduleRecord(insertedRow);
            setScheduleItems(prev => prev.map(item => item.id === optimisticId ? created : item));
            return created;
        } catch (error) {
            setScheduleItems(prev => prev.filter(i => i.id !== optimisticId));
            console.error('Error adding schedule item:', error);
            if (user) toast(`Failed to save schedule item to cloud: ${error.message || JSON.stringify(error)}`, { tone: 'error' });
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
        if (updates.startTime !== undefined) processedUpdates.start_time = updates.startTime;
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
        if (updates.workspace !== undefined) processedUpdates.workspace = updates.workspace;
        if (updates.uniKind !== undefined || updates.uni_kind !== undefined) {
            const nextUniKind = updates.uniKind ?? updates.uni_kind;
            processedUpdates.uniKind = nextUniKind;
            processedUpdates.uni_kind = nextUniKind;
        }
        if (updates.isMilestone !== undefined || updates.is_milestone !== undefined) {
            const nextIsMilestone = updates.isMilestone ?? updates.is_milestone;
            processedUpdates.isMilestone = nextIsMilestone;
            processedUpdates.is_milestone = nextIsMilestone;
        }

        const optimisticItem = normalizeScheduleRecord({ ...existingItem, ...processedUpdates });

        setScheduleItems(prev => prev.map(i => i.id === id ? optimisticItem : i));

        try {
            const updatedRow = await scheduleRepo.update(id, processedUpdates, optimisticItem);
            const updated = normalizeScheduleRecord(updatedRow || optimisticItem);
            setScheduleItems(prev => prev.map(i => i.id === id ? updated : i));
            return updated;
        } catch (error) {
            setScheduleItems(prev => prev.map(i => i.id === id ? existingItem : i));
            if (user) toast(`Failed to update schedule item in the cloud: ${error.message || JSON.stringify(error)}`, { tone: 'error' });
            throw error;
        }
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
        templateApplicationId: item.templateApplicationId || item.template_application_id,
        workspace: item.workspace || 'personal',
        uniKind: item.uniKind ?? item.uni_kind ?? null,
        isMilestone: item.isMilestone ?? item.is_milestone ?? false
    });

    const value = {
        tasks,
        scheduleItems,
        isLoading,
        loadError,
        refreshData,
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
