import { getScheduleItemsForDate, toLocalDateKey } from './scheduleOccurrences.js';
import { isTaskArchived, isTaskCompleted } from './taskState.js';
import { isClassScheduleItem } from '../components/uni-board/classSchedule.js';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const addDays = (value, amount) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};
const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const calendarDayNumber = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
const kindOf = (item) => item.uniKind ?? item.uni_kind ?? 'event';
const isMilestone = (item) => (item.isMilestone ?? item.is_milestone) === true;
const isTimedCommitment = (item) => (item.itemKind ?? item.item_kind ?? 'event') !== 'flexible_shell';

export const isDateOnlyDeadline = (value) => typeof value === 'string' && DATE_ONLY.test(value);

// Date-only deadlines belong to the user's local calendar, never UTC midnight.
export const parseWeeklyDate = (value, endOfDay = false) => {
  if (!value) return null;
  if (isDateOnlyDeadline(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    if (endOfDay) date.setHours(23, 59, 59, 999);
    return date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const compareEntries = (left, right) => left.occursAt - right.occursAt
  || left.title.localeCompare(right.title)
  || left.key.localeCompare(right.key);

const taskEntry = (task, now) => {
  const occursAt = parseWeeklyDate(task.deadline, true);
  if (!occursAt || isTaskArchived(task)) return null;
  const completed = isTaskCompleted(task);
  return {
    key: `task:${task.id}`,
    source: 'task',
    record: task,
    title: task.title || 'Untitled task',
    subject: task.subject || '',
    kind: kindOf(task) === 'event' ? 'deadline' : kindOf(task),
    occursAt,
    dateKey: toLocalDateKey(occursAt),
    dateOnly: isDateOnlyDeadline(task.deadline),
    completed,
    isOverdue: !completed && occursAt < now,
  };
};

const scheduleEntry = (record) => {
  const occursAt = parseWeeklyDate(record.displayTime);
  const duration = Number(record.duration);
  return {
    key: `schedule:${record.id}:${record._occurrenceDate}`,
    source: 'schedule',
    record,
    title: record.title || 'Untitled event',
    subject: record.subject || record.category || '',
    kind: kindOf(record),
    occursAt,
    endsAt: new Date(occursAt.getTime() + (Number.isFinite(duration) && duration > 0 ? duration : 60) * 60000),
    dateKey: record._occurrenceDate,
    completed: isTaskCompleted(record),
  };
};

export const buildWeeklySummary = ({ tasks = [], scheduleItems = [], now = new Date() } = {}) => {
  const current = parseWeeklyDate(now);
  if (!current) throw new Error('A valid current date is required.');
  const today = startOfDay(current);
  const weekStart = addDays(today, -((today.getDay() + 6) % 7));
  const weekEnd = addDays(weekStart, 7);
  const milestoneEnd = addDays(today, 14);
  const todayKey = toLocalDateKey(today);
  const allTasks = tasks.map((task) => taskEntry(task, current)).filter(Boolean).sort(compareEntries);
  const weekTasks = allTasks.filter((item) => item.occursAt >= weekStart && item.occursAt < weekEnd);
  const taskGroups = new Map();
  weekTasks.forEach((entry) => {
    const group = taskGroups.get(entry.dateKey) || { dateKey: entry.dateKey, date: startOfDay(entry.occursAt), items: [] };
    group.items.push(entry);
    taskGroups.set(entry.dateKey, group);
  });

  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(weekStart, offset);
    const dateKey = toLocalDateKey(date);
    return { date, dateKey, isToday: dateKey === todayKey, items: [] };
  });
  const daysByKey = new Map(days.map((day) => [day.dateKey, day]));
  const milestones = allTasks.filter((item) => item.record.workspace === 'university'
    && isMilestone(item.record) && !item.completed && item.occursAt >= current && item.occursAt < milestoneEnd);
  const records = scheduleItems.filter((record) => !record.archived && isTimedCommitment(record)
    && parseWeeklyDate(record.startTime ?? record.start_time));
  const seen = new Set();
  for (let date = weekStart; date < milestoneEnd; date = addDays(date, 1)) {
    getScheduleItemsForDate(records, date).forEach((record) => {
      if (!parseWeeklyDate(record.displayTime)) return;
      const entry = scheduleEntry(record);
      if (seen.has(entry.key)) return;
      seen.add(entry.key);
      daysByKey.get(entry.dateKey)?.items.push(entry);
      const routineClass = isClassScheduleItem(record) && !isMilestone(record);
      if (record.workspace === 'university' && !routineClass && !entry.completed
        && (['exam', 'quiz', 'event'].includes(entry.kind) || isMilestone(record))
        && entry.occursAt >= current && entry.occursAt < milestoneEnd) milestones.push(entry);
    });
  }
  days.forEach((day) => day.items.sort(compareEntries));

  return {
    weekStart,
    weekEnd,
    milestoneEnd,
    taskGroups: [...taskGroups.values()],
    taskCount: weekTasks.length,
    unfinishedTaskCount: weekTasks.filter((item) => !item.completed).length,
    days,
    commitmentCount: days.reduce((total, day) => total + day.items.length, 0),
    milestones: milestones.sort(compareEntries).map((item) => ({
      ...item,
      daysAway: calendarDayNumber(item.occursAt) - calendarDayNumber(today),
    })),
  };
};
