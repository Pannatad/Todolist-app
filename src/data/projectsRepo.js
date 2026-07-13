import { supabase } from '../services/supabase';

const KEY = 'demon-projects';
const read = (fallback) => { try { const value = localStorage.getItem(KEY); return value ? JSON.parse(value) : fallback(); } catch { return fallback(); } };
const write = (projects) => localStorage.setItem(KEY, JSON.stringify(projects));
const localRepo = (fallback) => ({
    list: async () => read(fallback),
    create: async (project) => { write([...read(fallback), project]); return project; },
    update: async (id, updates) => { const projects = read(fallback).map((project) => project.id === id ? { ...project, ...updates } : project); write(projects); return projects.find((project) => project.id === id) || null; },
    remove: async (id) => { write(read(fallback).filter((project) => project.id !== id)); return id; },
    listHighlights: async () => [], addHighlight: async () => null, removeHighlight: async () => null
});
const cloudRepo = (userId) => ({
    list: async () => { const { data, error } = await supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }); if (error) throw error; return data || []; },
    create: async (project) => { const { data, error } = await supabase.from('projects').insert([project]).select().single(); if (error) throw error; return data; },
    update: async (id, updates) => { const { error } = await supabase.from('projects').update(updates).eq('id', id); if (error) throw error; return updates; },
    remove: async (id) => { const { error } = await supabase.from('projects').delete().eq('id', id); if (error) throw error; return id; },
    listHighlights: async (projectId) => { const { data, error } = await supabase.from('project_highlights').select('task_id, subtask_id').eq('project_id', projectId).eq('user_id', userId); if (error) throw error; return data || []; },
    addHighlight: async (projectId, taskId, subtaskId) => { const { error } = await supabase.from('project_highlights').insert({ user_id: userId, project_id: projectId, task_id: taskId, subtask_id: subtaskId }); if (error && error.code !== '23505') throw error; },
    removeHighlight: async (projectId, taskId, subtaskId) => { let query = supabase.from('project_highlights').delete().eq('user_id', userId).eq('project_id', projectId).eq('task_id', taskId); query = subtaskId ? query.eq('subtask_id', subtaskId) : query.is('subtask_id', null); const { error } = await query; if (error) throw error; }
});
export const createProjectsRepo = (user, fallback) => user?.id ? cloudRepo(user.id) : localRepo(fallback);
