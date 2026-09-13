import { supabase } from '../services/supabase';
import { announcementInput, classNameKey, classIdOf } from '../components/uni-board/classItems.js';

const CLASS_KEY = 'uni-board-classes-guest-v1';
const ANNOUNCEMENT_KEY = 'uni-board-announcements-guest-v1';
const TASK_KEY = 'growth-tasks-guest';
const SCHEDULE_KEY = 'growth-schedule-guest';
const read = (key) => {
  const value = JSON.parse(localStorage.getItem(key) || '[]');
  if (!Array.isArray(value)) throw new Error('Saved class data could not be read.');
  return value;
};
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const checked = async (query) => {
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

// Keep a guest class mutation consistent across its shared collections.
const writeTogether = (changes) => {
  const before = changes.map(([key]) => [key, localStorage.getItem(key)]);
  try {
    for (const [key, value] of changes) write(key, value);
  } catch (error) {
    for (const [key, value] of before) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch { /* Preserve the original storage error. */ }
    }
    throw error;
  }
};
const renamedSession = (item, previousName, name) => ({
  ...item, category: name, subject: name,
  title: item.title?.startsWith(`${previousName} `) ? name + item.title.slice(previousName.length) : item.title,
});

export const createClassesRepo = (user, client = supabase) => {
  const userId = user?.id;
  return {
    listClasses: async () => userId
      ? checked(client.from('uni_board_classes').select('*').eq('user_id', userId).order('name'))
      : read(CLASS_KEY),
    ensureClass: async (input) => {
      const name = String(input || '').trim();
      if (!name) throw new Error('Enter a class name.');
      const name_key = classNameKey(name);
      if (!userId) {
        const items = read(CLASS_KEY);
        const existing = items.find((item) => item.name_key === name_key);
        if (existing) return existing;
        const created = { id: crypto.randomUUID(), name, name_key, created_at: new Date().toISOString() };
        write(CLASS_KEY, [...items, created]);
        return created;
      }
      // The unique key also protects against concurrent tabs and repeated discovery.
      await checked(client.from('uni_board_classes').upsert({ user_id: userId, name, name_key },
        { onConflict: 'user_id,name_key', ignoreDuplicates: true }));
      return checked(client.from('uni_board_classes').select('*').eq('user_id', userId).eq('name_key', name_key).single());
    },
    renameClass: async (id, input) => {
      const name = String(input || '').trim();
      if (!name) throw new Error('Enter a class name.');
      if (userId) {
        const data = await checked(client.rpc('rename_uni_board_class', { target_class_id: id, new_name: name }));
        return Array.isArray(data) ? data[0] : data;
      }
      const classes = read(CLASS_KEY);
      const course = classes.find((item) => item.id === id);
      if (!course) throw new Error('Class not found.');
      if (classes.some((item) => item.id !== id && item.name_key === classNameKey(name))) throw new Error('A class with this name already exists.');
      const updated = { ...course, name, name_key: classNameKey(name) };
      writeTogether([
        [TASK_KEY, read(TASK_KEY).map((item) => classIdOf(item) === id ? { ...item, subject: name } : item)],
        [SCHEDULE_KEY, read(SCHEDULE_KEY).map((item) => classIdOf(item) === id ? renamedSession(item, course.name, name) : item)],
        [CLASS_KEY, classes.map((item) => item.id === id ? updated : item)],
      ]);
      return updated;
    },
    deleteClass: async (id) => {
      if (userId) return checked(client.rpc('delete_uni_board_class', { target_class_id: id }));
      const classes = read(CLASS_KEY);
      if (!classes.some((item) => item.id === id)) throw new Error('Class not found.');
      writeTogether([
        [TASK_KEY, read(TASK_KEY).filter((item) => classIdOf(item) !== id)],
        [SCHEDULE_KEY, read(SCHEDULE_KEY).filter((item) => classIdOf(item) !== id)],
        [ANNOUNCEMENT_KEY, read(ANNOUNCEMENT_KEY).filter((item) => item.class_id !== id)],
        [CLASS_KEY, classes.filter((item) => item.id !== id)],
      ]);
    },
    listAnnouncements: async () => userId
      ? checked(client.from('uni_board_announcements').select('*').eq('user_id', userId))
      : read(ANNOUNCEMENT_KEY),
    saveAnnouncement: async (classId, input, id = null) => {
      const payload = { ...announcementInput(input), class_id: classId };
      if (!userId) {
        if (!read(CLASS_KEY).some((course) => course.id === classId)) throw new Error('Class not found.');
        const items = read(ANNOUNCEMENT_KEY);
        const existing = id ? items.find((item) => item.id === id && item.class_id === classId) : null;
        if (id && !existing) throw new Error('Announcement not found.');
        const saved = { ...existing, ...payload, id: id || crypto.randomUUID(), created_at: existing?.created_at || new Date().toISOString() };
        write(ANNOUNCEMENT_KEY, id ? items.map((item) => item.id === id ? saved : item) : [...items, saved]);
        return saved;
      }
      return checked(id
        ? client.from('uni_board_announcements').update(payload).eq('user_id', userId).eq('id', id).eq('class_id', classId).select().single()
        : client.from('uni_board_announcements').insert({ ...payload, user_id: userId }).select().single());
    },
    deleteAnnouncement: async (id) => {
      if (userId) {
        await checked(client.from('uni_board_announcements').delete().eq('user_id', userId).eq('id', id).select('id').single());
      } else write(ANNOUNCEMENT_KEY, read(ANNOUNCEMENT_KEY).filter((item) => item.id !== id));
    },
  };
};
