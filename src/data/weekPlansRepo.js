import { supabase } from '../services/supabase';

const STORAGE_KEY = 'week-plans-guest';

const readLocal = () => {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeLocal = (plans) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(plans)); }
    catch (error) { console.error('Failed to save week plans locally:', error); }
};

const toRow = (plan) => ({
    week_start: plan.weekStart,
    theme: plan.theme || '',
    build_habit_id: plan.buildHabitId || null,
    break_habit_id: plan.breakHabitId || null,
    targets: plan.targets || [],
    key_tasks: plan.keyTasks || [],
});

const createLocalRepo = () => ({
    list: async () => readLocal(),
    // One plan per week: saving a week replaces whatever was stored for it.
    save: async (plan) => {
        const row = { ...toRow(plan), id: plan.id || plan.weekStart, updated_at: new Date().toISOString() };
        writeLocal([...readLocal().filter((item) => item.week_start !== plan.weekStart), row]);
        return row;
    },
    remove: async (weekStart) => {
        writeLocal(readLocal().filter((item) => item.week_start !== weekStart));
        return weekStart;
    },
});

const createSupabaseRepo = (userId, client) => ({
    list: async () => {
        const { data, error } = await client.from('week_plans')
            .select('*').eq('user_id', userId).order('week_start', { ascending: true });
        if (error) throw error;
        return data || [];
    },
    save: async (plan) => {
        const { data, error } = await client.from('week_plans')
            .upsert({ ...toRow(plan), user_id: userId }, { onConflict: 'user_id,week_start' })
            .select().single();
        if (error) throw error;
        return data;
    },
    remove: async (weekStart) => {
        const { error } = await client.from('week_plans')
            .delete().eq('user_id', userId).eq('week_start', weekStart);
        if (error) throw error;
        return weekStart;
    },
});

export const createWeekPlansRepo = (user, client = supabase) => (
    user?.id && client ? createSupabaseRepo(user.id, client) : createLocalRepo()
);
