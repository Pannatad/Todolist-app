import { supabase } from '../services/supabase';

const STORAGE_KEY = 'growth-schedule-templates-guest';

const readLocalTemplates = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (error) {
        console.error('Failed to load schedule templates from localStorage:', error);
        return [];
    }
};

const writeLocalTemplates = (templates) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

const createLocalRepo = () => ({
    list: async () => readLocalTemplates(),
    create: async (template) => {
        writeLocalTemplates([...readLocalTemplates(), template]);
        return template;
    },
    update: async (id, updates) => {
        const templates = readLocalTemplates().map((template) => (
            template.id === id ? { ...template, ...updates } : template
        ));
        writeLocalTemplates(templates);
        return templates.find((template) => template.id === id) || null;
    },
    remove: async (id) => {
        const templates = readLocalTemplates();
        const removed = templates.find((template) => template.id === id) || null;
        writeLocalTemplates(templates.filter((template) => template.id !== id));
        return removed;
    }
});

const createSupabaseRepo = (userId) => ({
    list: async () => {
        const { data, error } = await supabase.from('schedule_templates')
            .select('*').eq('user_id', userId).order('created_at', { ascending: true });
        if (error) throw error;
        return data || [];
    },
    create: async (template) => {
        const { data, error } = await supabase.from('schedule_templates')
            .insert([{ user_id: userId, name: template.name, blocks: template.blocks }])
            .select().single();
        if (error) throw new Error(error.message || 'Failed to save template to cloud.');
        return data;
    },
    update: async (id, updates) => {
        const { data, error } = await supabase.from('schedule_templates')
            .update({ name: updates.name, blocks: updates.blocks })
            .eq('id', id).select().maybeSingle();
        if (error || !data) throw new Error(error?.message || 'Template could not be updated.');
        return data;
    },
    remove: async (id) => {
        const { data, error } = await supabase.from('schedule_templates')
            .delete().eq('id', id).select('id').maybeSingle();
        if (error || !data) throw new Error(error?.message || 'Template could not be deleted.');
        return data;
    }
});

export const createTemplatesRepo = (user) => (
    user?.id ? createSupabaseRepo(user.id) : createLocalRepo()
);
