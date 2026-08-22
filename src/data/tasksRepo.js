import { supabase } from '../services/supabase';

const STORAGE_KEY = 'growth-tasks-guest';
const TASK_UNI_KINDS = new Set(['task', 'payment', 'registration', 'meeting', 'report', 'deadline']);
const WORKSPACES = new Set(['personal', 'university']);

const readWorkspace = (record) => record?.workspace ?? 'personal';
const readUniKind = (record) => record?.uniKind !== undefined ? record.uniKind : record?.uni_kind;
const readIsMilestone = (record) => record?.isMilestone !== undefined
    ? record.isMilestone
    : record?.is_milestone;

export const normalizeTaskRecord = (task) => {
    if (!task) return task;

    const workspace = readWorkspace(task) === 'university' ? 'university' : 'personal';
    const uniKind = workspace === 'university' && TASK_UNI_KINDS.has(readUniKind(task))
        ? readUniKind(task)
        : null;
    const isMilestone = readIsMilestone(task) === true;

    return {
        ...task,
        workspace,
        uniKind,
        uni_kind: uniKind,
        isMilestone,
        is_milestone: isMilestone
    };
};

const prepareTaskRecord = (task) => {
    const workspace = readWorkspace(task);
    const uniKind = readUniKind(task) ?? null;

    if (!WORKSPACES.has(workspace)) {
        throw new Error(`Invalid task workspace: ${workspace}`);
    }
    if (workspace === 'university' && !TASK_UNI_KINDS.has(uniKind)) {
        throw new Error(`Invalid university task kind: ${uniKind || 'missing'}`);
    }

    return normalizeTaskRecord({
        ...task,
        workspace,
        uniKind: workspace === 'university' ? uniKind : null,
        isMilestone: readIsMilestone(task) === true
    });
};

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
    const dbTask = { ...prepareTaskRecord(task) };
    delete dbTask.id;
    delete dbTask.estimatedTime;
    delete dbTask.completed;
    delete dbTask.completedAt;
    delete dbTask.uniKind;
    delete dbTask.isMilestone;
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

    const normalizedTask = prepareTaskRecord(task);
    const metadataChanged = updates.workspace !== undefined
        || updates.uniKind !== undefined
        || updates.uni_kind !== undefined
        || updates.isMilestone !== undefined
        || updates.is_milestone !== undefined;
    if (metadataChanged || normalizedTask.workspace === 'university') {
        dbUpdates.workspace = normalizedTask.workspace;
        dbUpdates.uni_kind = normalizedTask.uni_kind;
        dbUpdates.is_milestone = normalizedTask.is_milestone;
    }
    return dbUpdates;
};

const createLocalRepo = () => ({
    list: async () => readLocalTasks().map(normalizeTaskRecord),
    create: async (task) => {
        const created = prepareTaskRecord(task);
        writeLocalTasks([...readLocalTasks(), created]);
        return created;
    },
    update: async (id, updates) => {
        const tasks = readLocalTasks().map((task) => task.id === id
            ? prepareTaskRecord({ ...task, ...updates })
            : normalizeTaskRecord(task));
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
        return (data || []).map(normalizeTaskRecord);
    },
    create: async (task) => {
        const dbTask = toDbTask(task);
        let { data, error } = await supabase.from('tasks').insert([dbTask]).select().single();
        if (error && dbTask.workspace !== 'university') {
            console.warn('Insert failed, retrying without newer task fields...', error);
            const legacyTask = { ...dbTask };
            delete legacyTask.estimated_time;
            delete legacyTask.subtasks;
            delete legacyTask.workspace;
            delete legacyTask.uni_kind;
            delete legacyTask.is_milestone;
            ({ data, error } = await supabase.from('tasks').insert([legacyTask]).select().single());
        }
        if (error) throw error;
        return normalizeTaskRecord(data);
    },
    update: async (id, updates, task) => {
        const dbUpdates = toDbUpdates(updates, task);
        if (Object.keys(dbUpdates).length === 0) return normalizeTaskRecord(task);
        let { error } = await supabase.from('tasks').update(dbUpdates).eq('id', id);
        if (error && task.workspace !== 'university' && (dbUpdates.subtasks !== undefined || dbUpdates.focus_sessions !== undefined)) {
            console.warn('Task update with newer fields failed, retrying without them...', error);
            const fallbackUpdates = { ...dbUpdates };
            delete fallbackUpdates.subtasks;
            delete fallbackUpdates.focus_sessions;
            delete fallbackUpdates.workspace;
            delete fallbackUpdates.uni_kind;
            delete fallbackUpdates.is_milestone;
            if (Object.keys(fallbackUpdates).length > 0) {
                ({ error } = await supabase.from('tasks').update(fallbackUpdates).eq('id', id));
            }
        }
        if (error) throw error;
        return normalizeTaskRecord(task);
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

export const taskUniKinds = TASK_UNI_KINDS;
