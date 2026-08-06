import { supabase } from '../services/supabase';

const STORAGE_KEY = 'growth-tasks-guest';

const readLocalTasks = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
        console.error('Failed to load tasks from localStorage:', error);
        return [];
    }
};

const writeLocalTasks = (tasks) => localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));

const toDbTask = (task) => {
    const dbTask = { ...task };
    delete dbTask.id;
    delete dbTask.estimatedTime;
    delete dbTask.completed;
    delete dbTask.completedAt;
    // Compatibility only: older schemas may require this column. App records strip it.
    dbTask.difficulty = 'easy';
    return dbTask;
};

const toDbUpdates = (updates, task) => {
    const dbUpdates = {};
    if (updates.title !== undefined) dbUpdates.title = task.title;
    if (updates.description !== undefined) dbUpdates.description = task.description;
    if (updates.subject !== undefined) dbUpdates.subject = task.subject;
    if (updates.deadline !== undefined) dbUpdates.deadline = task.deadline;
    if (updates.archived !== undefined) dbUpdates.archived = task.archived;
    if (updates.estimatedTime !== undefined || updates.estimated_time !== undefined) dbUpdates.estimated_time = task.estimated_time;
    if (updates.subtasks !== undefined) dbUpdates.subtasks = task.subtasks;
    if (updates.focus_sessions !== undefined) dbUpdates.focus_sessions = updates.focus_sessions;
    if (updates.status !== undefined || updates.completed !== undefined || updates.completedAt !== undefined || updates.completed_at !== undefined) {
        dbUpdates.status = task.status;
        dbUpdates.completed_at = task.completed_at;
    }
    return dbUpdates;
};

const createLocalRepo = () => ({
    list: async () => readLocalTasks(),
    create: async (task) => {
        writeLocalTasks([...readLocalTasks(), task]);
        return task;
    },
    update: async (id, updates) => {
        const tasks = readLocalTasks().map((task) => task.id === id ? { ...task, ...updates } : task);
        writeLocalTasks(tasks);
        return tasks.find((task) => task.id === id) || null;
    },
    remove: async (id) => {
        const tasks = readLocalTasks();
        const removed = tasks.find((task) => task.id === id) || null;
        writeLocalTasks(tasks.filter((task) => task.id !== id));
        return removed;
    }
});

const createSupabaseRepo = (userId) => ({
    list: async () => {
        const { data, error } = await supabase.from('tasks')
            .select('*').eq('user_id', userId).order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    },
    create: async (task) => {
        const dbTask = toDbTask(task);
        let { data, error } = await supabase.from('tasks').insert([dbTask]).select().single();
        if (error) {
            console.warn('Insert failed, retrying without newer task fields...', error);
            const legacyTask = { ...dbTask };
            delete legacyTask.estimated_time;
            delete legacyTask.subtasks;
            ({ data, error } = await supabase.from('tasks').insert([legacyTask]).select().single());
        }
        if (error) throw error;
        return data;
    },
    update: async (id, updates, task) => {
        const dbUpdates = toDbUpdates(updates, task);
        if (Object.keys(dbUpdates).length === 0) return task;
        let { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
        if (error && (dbUpdates.subtasks !== undefined || dbUpdates.focus_sessions !== undefined)) {
            console.warn('Task update with newer fields failed, retrying without them...', error);
            const fallbackUpdates = { ...dbUpdates };
            delete fallbackUpdates.subtasks;
            delete fallbackUpdates.focus_sessions;
            if (Object.keys(fallbackUpdates).length > 0) {
                ({ error } = await supabase.from('tasks').update(fallbackUpdates).eq('id', id));
            }
        }
        if (error) throw error;
        return task;
    },
    remove: async (id) => {
        const { error } = await supabase.from('tasks').delete().eq('id', id);
        if (error) throw error;
        return id;
    }
});

export const createTasksRepo = (user) => (
    user?.id ? createSupabaseRepo(user.id) : createLocalRepo()
);
