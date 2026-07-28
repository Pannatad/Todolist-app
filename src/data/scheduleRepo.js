import { supabase } from '../services/supabase';

const STORAGE_KEY = 'growth-schedule-guest';

const withDefinedValues = (payload) => Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
);

const readLocalItems = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
        console.error('Failed to load schedule from localStorage:', error);
        return [];
    }
};

const writeLocalItems = (items) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
};

const buildInsertPayloads = (item) => {
    const fullPayload = {
        id: item.id,
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
        recurrence_exceptions: item.recurrence_exceptions,
        recurrence_overrides: item.recurrence_overrides,
        item_kind: item.item_kind,
        parent_item_id: item.parent_item_id,
        source_template_id: item.source_template_id,
        source_template_version: item.source_template_version,
        template_block_id: item.template_block_id,
        template_application_id: item.template_application_id
    };

    const legacyPayload = {
        user_id: item.user_id,
        title: item.title,
        start_time: item.start_time,
        duration: item.duration,
        category: item.category,
        created_at: item.created_at
    };

    return [withDefinedValues(fullPayload), legacyPayload, {
        user_id: item.user_id,
        title: item.title,
        start_time: item.start_time,
        created_at: item.created_at
    }];
};

const buildUpdatePayloads = (updates) => {
    const payloads = [
        withDefinedValues({
            title: updates.title,
            start_time: updates.start_time,
            duration: updates.duration,
            category: updates.category,
            color: updates.color,
            notes: updates.notes,
            recurrence_type: updates.recurrence_type,
            recurrence_interval: updates.recurrence_interval,
            recurrence_days_of_week: updates.recurrence_days_of_week,
            recurrence_end_date: updates.recurrence_end_date,
            recurrence_exceptions: updates.recurrence_exceptions,
            recurrence_overrides: updates.recurrence_overrides,
            item_kind: updates.item_kind,
            parent_item_id: updates.parent_item_id,
            source_template_id: updates.source_template_id,
            source_template_version: updates.source_template_version,
            template_block_id: updates.template_block_id,
            template_application_id: updates.template_application_id
        }),
        withDefinedValues({
            title: updates.title,
            start_time: updates.start_time,
            duration: updates.duration,
            category: updates.category
        }),
        withDefinedValues({ title: updates.title, start_time: updates.start_time })
    ].filter((payload) => Object.keys(payload).length > 0);

    return payloads.filter((payload, index) => (
        payloads.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(payload)) === index
    ));
};

const createLocalRepo = () => ({
    list: async () => readLocalItems(),
    create: async (item) => {
        const localItem = { ...item, id: item.id || crypto.randomUUID() };
        writeLocalItems([...readLocalItems(), localItem]);
        return localItem;
    },
    update: async (id, updates) => {
        const items = readLocalItems();
        const updated = items.map((item) => item.id === id ? { ...item, ...updates } : item);
        writeLocalItems(updated);
        return updated.find((item) => item.id === id) || null;
    },
    remove: async (id) => {
        const items = readLocalItems();
        const removed = items.find((item) => item.id === id) || null;
        writeLocalItems(items.filter((item) => item.id !== id));
        return removed;
    },
    createMany: async (items) => {
        const created = items.map((item) => ({ ...item, id: item.id || crypto.randomUUID() }));
        writeLocalItems([...readLocalItems(), ...created]);
        return created;
    }
});

const createSupabaseRepo = (userId) => ({
    list: async () => {
        const { data, error } = await supabase.from('schedule_items')
            .select('*').eq('user_id', userId).order('start_time', { ascending: true });
        if (error) throw error;
        return data || [];
    },
    create: async (item) => {
        let lastError = null;
        for (const payload of buildInsertPayloads(item)) {
            const { data, error } = await supabase.from('schedule_items').insert([payload]).select().single();
            if (data) return data;
            lastError = error;
            console.warn('Schedule insert attempt failed, trying fallback payload...', error);
        }
        throw new Error(lastError?.message || 'Failed to save schedule item to cloud.');
    },
    createMany: async (items) => {
        const payloads = items.map((item) => buildInsertPayloads(item)[0]);
        const { data, error } = await supabase.from('schedule_items').insert(payloads).select();
        if (error) throw new Error(error.message || 'Failed to save schedule items to cloud.');
        return data || [];
    },
    update: async (id, updates) => {
        let lastError = null;
        for (const payload of buildUpdatePayloads(updates)) {
            const { data, error } = await supabase.from('schedule_items').update(payload)
                .eq('id', id).select().maybeSingle();
            if (data) return data;
            lastError = error;
            console.warn('Schedule update attempt failed, trying fallback payload...', error);
        }
        throw new Error(lastError?.message || 'Schedule item could not be updated in Supabase.');
    },
    remove: async (id) => {
        const { data, error } = await supabase.from('schedule_items').delete()
            .eq('id', id).select('id').maybeSingle();
        if (error || !data) throw new Error(error?.message || 'Schedule item could not be deleted from Supabase.');
        return data;
    }
});

// A provider creates this once per user id, so one backend serves its entire session.
export const createScheduleRepo = (user) => (
    user?.id ? createSupabaseRepo(user.id) : createLocalRepo()
);
