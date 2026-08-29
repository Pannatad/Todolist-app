import { supabase } from '../services/supabase';

const STORAGE_KEY = 'uni-board-links-v1';

const readLocalLinks = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load Uni-board links from localStorage:', error);
    return [];
  }
};

const writeLocalLinks = (links) => localStorage.setItem(STORAGE_KEY, JSON.stringify(links));

const createLocalRepo = () => ({
  list: async () => readLocalLinks(),
  create: async (link) => {
    writeLocalLinks([...readLocalLinks(), link]);
    return link;
  },
  update: async (id, updates) => {
    const links = readLocalLinks().map((link) => (
      link.id === id ? { ...link, ...updates } : link
    ));
    writeLocalLinks(links);
    return links.find((link) => link.id === id) || null;
  },
  remove: async (id) => {
    writeLocalLinks(readLocalLinks().filter((link) => link.id !== id));
    return id;
  },
});

const toPayload = (link, userId) => ({
  user_id: userId,
  title: link.title,
  url: link.url,
  category: link.category || null,
  description: link.description || null,
});

const createSupabaseRepo = (userId) => ({
  list: async () => {
    const { data, error } = await supabase
      .from('uni_board_links')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  create: async (link) => {
    const { data, error } = await supabase
      .from('uni_board_links')
      .insert([toPayload(link, userId)])
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('uni_board_links')
      .update(toPayload(updates, userId))
      .eq('user_id', userId)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  remove: async (id) => {
    const { error } = await supabase
      .from('uni_board_links')
      .delete()
      .eq('user_id', userId)
      .eq('id', id);
    if (error) throw error;
    return id;
  },
});

export const createLinksRepo = (user) => (
  user?.id ? createSupabaseRepo(user.id) : createLocalRepo()
);
