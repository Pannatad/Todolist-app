import { supabase } from '../services/supabase';

const GOALS_KEY = 'vision-goals';
const HIGHLIGHTS_KEY = 'daily-highlights';

const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; }
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

const localRepo = () => ({
    list: async () => read(GOALS_KEY, []),
    create: async (goal) => { write(GOALS_KEY, [...read(GOALS_KEY, []), goal]); return goal; },
    update: async (id, updates) => {
        const goals = read(GOALS_KEY, []).map((goal) => goal.id === id ? { ...goal, ...updates } : goal);
        write(GOALS_KEY, goals); return goals.find((goal) => goal.id === id) || null;
    },
    remove: async (id) => { write(GOALS_KEY, read(GOALS_KEY, []).filter((goal) => goal.id !== id)); return id; },
    listHighlights: async () => read(HIGHLIGHTS_KEY, {}),
    upsertHighlight: async (key, highlight) => { write(HIGHLIGHTS_KEY, { ...read(HIGHLIGHTS_KEY, {}), [key]: highlight }); return highlight; },
    removeHighlight: async (key) => { const highlights = { ...read(HIGHLIGHTS_KEY, {}) }; delete highlights[key]; write(HIGHLIGHTS_KEY, highlights); return key; }
});

const cloudRepo = (userId) => ({
    list: async () => {
        const { data, error } = await supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: true });
        if (error) throw error; return data || [];
    },
    create: async (goal) => {
        const payload = { ...goal };
        delete payload.id;
        delete payload.colorTheme;
        const { data, error } = await supabase.from('goals').insert([payload]).select().single();
        if (error) throw error; return data;
    },
    update: async (id, updates) => {
        const payload = { ...updates };
        if (payload.colorTheme !== undefined) { payload.color_theme = payload.colorTheme; delete payload.colorTheme; }
        const { error } = await supabase.from('goals').update(payload).eq('id', id);
        if (error) throw error; return updates;
    },
    remove: async (id) => {
        const { error } = await supabase.from('goals').delete().eq('id', id);
        if (error) throw error; return id;
    },
    listHighlights: async () => {
        const { data, error } = await supabase.from('daily_highlights').select('*').eq('user_id', userId);
        if (error) throw error; return data || [];
    },
    upsertHighlight: async (key, highlight) => {
        const { error } = await supabase.from('daily_highlights').upsert({ user_id: userId, key, ...highlight, updated_at: new Date().toISOString() }, { onConflict: 'user_id, key' });
        if (error) throw error; return highlight;
    },
    removeHighlight: async (key) => {
        const { error } = await supabase.from('daily_highlights').delete().eq('user_id', userId).eq('key', key);
        if (error) throw error; return key;
    }
});

export const createGoalsRepo = (user) => user?.id ? cloudRepo(user.id) : localRepo();
