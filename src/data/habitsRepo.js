import { supabase } from '../services/supabase';

const HABITS_KEY = 'habits-guest';
const LOGS_KEY = 'habit-logs-guest';
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const payload = (habit) => ({ user_id: habit.user_id, name: habit.name, icon: habit.icon, type: habit.type, target: habit.target, frequency: habit.frequency, schedule_days: habit.schedule_days, time_of_day: habit.time_of_day, color: habit.color, reminder_time: habit.reminder_time, archived: habit.archived, created_at: habit.created_at, is_seed: habit.is_seed, seed_started_at: habit.seed_started_at, seed_duration_days: habit.seed_duration_days, seed_why: habit.seed_why, seed_stage: habit.seed_stage });

const localRepo = () => ({
    list: async () => read(HABITS_KEY, []),
    create: async (habit) => { write(HABITS_KEY, [...read(HABITS_KEY, []), habit]); return habit; },
    update: async (id, habit) => { write(HABITS_KEY, read(HABITS_KEY, []).map((item) => item.id === id ? habit : item)); return habit; },
    remove: async (id) => { write(HABITS_KEY, read(HABITS_KEY, []).filter((habit) => habit.id !== id)); return id; },
    listLogs: async () => read(LOGS_KEY, {}),
    upsertLog: async (key, log) => { write(LOGS_KEY, { ...read(LOGS_KEY, {}), [key]: log }); return log; },
    removeLogsForHabit: async (habitId) => { const logs = Object.fromEntries(Object.entries(read(LOGS_KEY, {})).filter(([, log]) => log.habit_id !== habitId)); write(LOGS_KEY, logs); return logs; }
});

const cloudRepo = (userId) => ({
    list: async () => { const { data, error } = await supabase.from('habits').select('*').eq('user_id', userId).order('created_at', { ascending: true }); if (error) throw error; return data || []; },
    create: async (habit) => { const { data, error } = await supabase.from('habits').insert([payload(habit)]).select().single(); if (error) throw error; return data; },
    update: async (id, habit) => { const { error } = await supabase.from('habits').update(payload(habit)).eq('id', id); if (error) throw error; return habit; },
    remove: async (id) => { const { error } = await supabase.from('habits').delete().eq('id', id); if (error) throw error; return id; },
    listLogs: async () => { const { data, error } = await supabase.from('habit_logs').select('*').eq('user_id', userId); if (error) throw error; return data || []; },
    upsertLog: async (_key, log) => { const { data, error } = await supabase.from('habit_logs').upsert(log, { onConflict: 'habit_id, date' }).select().maybeSingle(); if (error) throw error; return data || log; },
    removeLogsForHabit: async (habitId) => { const { error } = await supabase.from('habit_logs').delete().eq('habit_id', habitId); if (error) throw error; return habitId; }
});

export const createHabitsRepo = (user) => user?.id ? cloudRepo(user.id) : localRepo();
