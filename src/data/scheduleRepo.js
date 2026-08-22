import { supabase } from '../services/supabase';

const STORAGE_KEY = 'growth-schedule-guest';
const SCHEDULE_UNI_KINDS = new Set(['exam', 'quiz', 'event']);
const WORKSPACES = new Set(['personal', 'university']);

const readWorkspace = (record) => record?.workspace ?? 'personal';
const readUniKind = (record) => record?.uniKind !== undefined ? record.uniKind : record?.uni_kind;
const readIsMilestone = (record) => record?.isMilestone !== undefined
    ? record.isMilestone
    : record?.is_milestone;

export const normalizeScheduleRecord = (item) => {
    if (!item) return item;

    const workspace = readWorkspace(item) === 'university' ? 'university' : 'personal';
    const uniKind = workspace === 'university' && SCHEDULE_UNI_KINDS.has(readUniKind(item))
        ? readUniKind(item)
        : null;
    const isMilestone = readIsMilestone(item) === true;

    return {
        ...item,
        startTime: item.startTime ?? item.start_time,
        recurrenceType: item.recurrenceType ?? item.recurrence_type ?? 'none',
        recurrenceInterval: item.recurrenceInterval ?? item.recurrence_interval ?? 1,
        recurrenceDaysOfWeek: item.recurrenceDaysOfWeek ?? item.recurrence_days_of_week ?? [],
        recurrenceEndDate: item.recurrenceEndDate ?? item.recurrence_end_date ?? null,
        recurrenceExceptions: item.recurrenceExceptions ?? item.recurrence_exceptions ?? [],
        recurrenceOverrides: item.recurrenceOverrides ?? item.recurrence_overrides ?? {},
        itemKind: item.itemKind ?? item.item_kind ?? 'event',
        parentItemId: item.parentItemId ?? item.parent_item_id ?? null,
        sourceTemplateId: item.sourceTemplateId ?? item.source_template_id ?? null,
        sourceTemplateVersion: item.sourceTemplateVersion ?? item.source_template_version ?? null,
        templateBlockId: item.templateBlockId ?? item.template_block_id ?? null,
        templateApplicationId: item.templateApplicationId ?? item.template_application_id ?? null,
        workspace,
        uniKind,
        uni_kind: uniKind,
        isMilestone,
        is_milestone: isMilestone,
        completed: item.completed === true || Boolean(item.completed_at || item.completedAt)
    };
};

const prepareScheduleRecord = (item) => {
    const workspace = readWorkspace(item);
    const uniKind = readUniKind(item) ?? null;

    if (!WORKSPACES.has(workspace)) {
        throw new Error(`Invalid schedule workspace: ${workspace}`);
    }
    if (workspace === 'university' && !SCHEDULE_UNI_KINDS.has(uniKind)) {
        throw new Error(`Invalid university schedule kind: ${uniKind || 'missing'}`);
    }

    return normalizeScheduleRecord({
        ...item,
        workspace,
        uniKind: workspace === 'university' ? uniKind : null,
        isMilestone: readIsMilestone(item) === true
    });
};

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
    const normalizedItem = prepareScheduleRecord(item);
    const fullPayload = {
        id: normalizedItem.id,
        user_id: normalizedItem.user_id,
        title: normalizedItem.title,
        start_time: normalizedItem.start_time,
        duration: normalizedItem.duration,
        category: normalizedItem.category,
        created_at: normalizedItem.created_at,
        color: normalizedItem.color,
        notes: normalizedItem.notes,
        recurrence_type: normalizedItem.recurrence_type,
        recurrence_interval: normalizedItem.recurrence_interval,
        recurrence_days_of_week: normalizedItem.recurrence_days_of_week,
        recurrence_end_date: normalizedItem.recurrence_end_date,
        recurrence_exceptions: normalizedItem.recurrence_exceptions,
        recurrence_overrides: normalizedItem.recurrence_overrides,
        item_kind: normalizedItem.item_kind,
        parent_item_id: normalizedItem.parent_item_id,
        source_template_id: normalizedItem.source_template_id,
        source_template_version: normalizedItem.source_template_version,
        template_block_id: normalizedItem.template_block_id,
        template_application_id: normalizedItem.template_application_id,
        workspace: normalizedItem.workspace,
        uni_kind: normalizedItem.uni_kind,
        is_milestone: normalizedItem.is_milestone
    };

    const legacyPayload = {
        user_id: normalizedItem.user_id,
        title: normalizedItem.title,
        start_time: normalizedItem.start_time,
        duration: normalizedItem.duration,
        category: normalizedItem.category,
        created_at: normalizedItem.created_at
    };

    return [withDefinedValues(fullPayload), legacyPayload, {
        user_id: normalizedItem.user_id,
        title: normalizedItem.title,
        start_time: normalizedItem.start_time,
        created_at: normalizedItem.created_at
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
            template_application_id: updates.template_application_id,
            workspace: updates.workspace,
            uni_kind: updates.uni_kind,
            is_milestone: updates.is_milestone
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
    list: async () => readLocalItems().map(normalizeScheduleRecord),
    create: async (item) => {
        const localItem = prepareScheduleRecord({ ...item, id: item.id || crypto.randomUUID() });
        writeLocalItems([...readLocalItems(), localItem]);
        return localItem;
    },
    update: async (id, updates) => {
        const items = readLocalItems();
        const updated = items.map((item) => item.id === id
            ? prepareScheduleRecord({ ...item, ...updates })
            : normalizeScheduleRecord(item));
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
        const created = items.map((item) => prepareScheduleRecord({ ...item, id: item.id || crypto.randomUUID() }));
        writeLocalItems([...readLocalItems(), ...created]);
        return created;
    }
});

const createSupabaseRepo = (userId) => ({
    list: async () => {
        const { data, error } = await supabase.from('schedule_items')
            .select('*').eq('user_id', userId).order('start_time', { ascending: true });
        if (error) throw error;
        return (data || []).map(normalizeScheduleRecord);
    },
    create: async (item) => {
        const normalizedItem = prepareScheduleRecord(item);
        let lastError = null;
        const payloads = normalizedItem.workspace === 'university'
            ? [buildInsertPayloads(normalizedItem)[0]]
            : buildInsertPayloads(normalizedItem);
        for (const payload of payloads) {
            const { data, error } = await supabase.from('schedule_items').insert([payload]).select().single();
            if (data) return normalizeScheduleRecord(data);
            lastError = error;
            console.warn('Schedule insert attempt failed, trying fallback payload...', error);
        }
        throw new Error(lastError?.message || 'Failed to save schedule item to cloud.');
    },
    createMany: async (items) => {
        const normalizedItems = items.map(prepareScheduleRecord);
        const payloads = normalizedItems.map((item) => buildInsertPayloads(item)[0]);
        const { data, error } = await supabase.from('schedule_items').insert(payloads).select();
        if (error) throw new Error(error.message || 'Failed to save schedule items to cloud.');
        return (data || []).map(normalizeScheduleRecord);
    },
    update: async (id, updates, item) => {
        const normalizedItem = prepareScheduleRecord({ ...item, ...updates });
        const normalizedUpdates = {
            ...updates,
            workspace: normalizedItem.workspace,
            uni_kind: normalizedItem.uni_kind,
            is_milestone: normalizedItem.is_milestone
        };
        let lastError = null;
        const payloads = normalizedItem.workspace === 'university'
            ? [buildUpdatePayloads(normalizedUpdates)[0]]
            : buildUpdatePayloads(normalizedUpdates);
        for (const payload of payloads) {
            const { data, error } = await supabase.from('schedule_items').update(payload)
                .eq('id', id).select().maybeSingle();
            if (data) return normalizeScheduleRecord(data);
            lastError = error;
            console.warn('Schedule update attempt failed, trying fallback payload...', error);
        }
        throw new Error(lastError?.message || 'Schedule item could not be updated in Supabase.');
    },
    remove: async (id) => {
        const { data, error } = await supabase.from('schedule_items').delete()
            .eq('id', id).select('id').maybeSingle();
        if (error || !data) throw new Error(error?.message || 'Schedule item could not be deleted from Supabase.');
        return normalizeScheduleRecord(data);
    }
});

// A provider creates this once per user id, so one backend serves its entire session.
export const createScheduleRepo = (user) => (
    user?.id ? createSupabaseRepo(user.id) : createLocalRepo()
);
