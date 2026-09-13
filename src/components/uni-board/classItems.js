import { isTaskCompleted } from '../../utils/taskState.js';

export const CLASS_ITEM_KINDS = [
  { value: 'homework', label: 'Homework' },
  { value: 'revision', label: 'Revision' },
  { value: 'reminder', label: 'Reminders' },
];
export const classNameKey = (name) => String(name || '').trim().toLowerCase();
export const classIdOf = (record) => record?.classId !== undefined ? record.classId : record?.class_id ?? null;
export const classKindOf = (record) => record?.classItemKind !== undefined ? record.classItemKind : record?.class_item_kind ?? null;
export const checklistFor = (tasks, classId, kind) => {
  const items = tasks.filter((task) => task.workspace === 'university' && !task.archived
    && classIdOf(task) === classId && classKindOf(task) === kind);
  const due = (task) => task.deadline && Number.isFinite(Date.parse(task.deadline)) ? Date.parse(task.deadline) : Infinity;
  return {
    active: items.filter((task) => !isTaskCompleted(task)).sort((a, b) => due(a) - due(b) || a.title.localeCompare(b.title)),
    completed: items.filter(isTaskCompleted),
    total: items.length,
  };
};
export const sortAnnouncements = (items) => [...items].sort((a, b) => Number(b.pinned === true) - Number(a.pinned === true)
  || Date.parse(b.created_at) - Date.parse(a.created_at));
export const announcementInput = (input) => {
  const title = String(input.title || '').trim();
  if (!title) throw new Error('A title is required.');
  let url = String(input.url || '').trim();
  if (url) {
    if (!/^[a-z][a-z\d+.-]*:/i.test(url)) url = `https://${url}`;
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Use an http or https source link.');
    url = parsed.href;
  }
  return { title, body: String(input.body || '').trim(), url: url || null, pinned: input.pinned === true };
};

export async function discoverClasses(items, repo, link, isCurrent = () => true) {
  for (const item of items) {
    if (!isCurrent()) return;
    if (item.workspace !== 'university' || classIdOf(item)) continue;
    const name = String(item.category || item.subject || 'University').trim() || 'University';
    const course = await repo.ensureClass(name);
    if (!isCurrent()) return;
    await link(item, course.id);
  }
}
