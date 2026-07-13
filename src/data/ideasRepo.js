import { supabase } from '../services/supabase';

const STORAGE_KEY = 'demon-idea-board-v1';

const readGuest = (fallback) => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : fallback();
    } catch (error) {
        console.error('Failed to read idea board from local storage:', error);
        return fallback();
    }
};

const writeGuest = (board) => localStorage.setItem(STORAGE_KEY, JSON.stringify(board));

const toPayload = (board, userId) => ({
    ...(board.id ? { id: board.id } : {}),
    user_id: userId,
    nodes: board.nodes,
    updated_at: board.updated_at
});

const createLocalRepo = () => ({
    list: async (fallback) => readGuest(fallback),
    create: async (board) => { writeGuest(board); return board; },
    update: async (_id, board) => { writeGuest(board); return board; },
    remove: async () => { localStorage.removeItem(STORAGE_KEY); },
    readGuest: async (fallback) => readGuest(fallback),
    writeGuest: async (board) => { writeGuest(board); return board; }
});

const createSupabaseRepo = (userId) => ({
    list: async () => {
        const { data, error } = await supabase.from('idea_boards').select('*').eq('user_id', userId).maybeSingle();
        if (error && error.code !== 'PGRST116') throw error;
        return data || null;
    },
    create: async (board) => {
        const { data, error } = await supabase.from('idea_boards').upsert(toPayload(board, userId), { onConflict: 'user_id' }).select().single();
        if (error) throw error;
        return data;
    },
    update: async (_id, board) => {
        const { data, error } = await supabase.from('idea_boards').upsert(toPayload(board, userId), { onConflict: 'user_id' }).select().single();
        if (error) throw error;
        return data;
    },
    remove: async (id) => {
        let query = supabase.from('idea_boards').delete().eq('user_id', userId);
        if (id) query = query.eq('id', id);
        const { error } = await query;
        if (error) throw error;
    },
    readGuest: async (fallback) => readGuest(fallback),
    writeGuest: async (board) => { writeGuest(board); return board; }
});

export const createIdeasRepo = (user) => (
    user?.id ? createSupabaseRepo(user.id) : createLocalRepo()
);
