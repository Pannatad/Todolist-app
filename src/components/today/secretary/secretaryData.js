import { getScheduleItemsForDate, toLocalDateKey } from '../../../utils/scheduleOccurrences.js';
import { isTaskArchived, isTaskCompleted } from '../../../utils/taskState.js';
import { normalizeSchedulePriority, schedulePriorityLabel } from '../../../utils/schedulePriority.js';
import { isClassScheduleItem } from '../../uni-board/classSchedule.js';
import { parseWeeklyDate } from '../../../utils/weeklySummary.js';
import { buildTargetProgress, formatMinutes, getWeekKey } from '../../../utils/weekPlan.js';

// The secretary works from facts computed here, never from the model's memory:
// counts, hours and dates come from the app, the model only reads and groups.

const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const addDays = (date, amount) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const kindOf = (item) => item.uniKind ?? item.uni_kind ?? null;
const isMilestone = (item) => (item.isMilestone ?? item.is_milestone) === true;
const isShell = (item) => (item.itemKind ?? item.item_kind ?? 'event') === 'flexible_shell';

export const timeLabel = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
export const dayLabel = (date) => date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
export const weekdayLabel = (date) => date.toLocaleDateString([], { weekday: 'long' });

const describeBlock = (record) => {
  const start = new Date(record.displayTime || record.startTime || record.start_time);
  const duration = Number(record.duration);
  const minutes = Number.isFinite(duration) && duration > 0 ? duration : 60;
  return {
    id: String(record.id),
    title: record.title || 'Untitled block',
    start,
    end: new Date(start.getTime() + minutes * MINUTE_MS),
    minutes,
    category: record.category || record.subject || '',
    workspace: record.workspace || 'personal',
    isClass: isClassScheduleItem(record),
    uniKind: kindOf(record),
    priority: normalizeSchedulePriority(record.priority),
    notes: record.notes || '',
    record,
  };
};

const dayBlocks = (scheduleItems, date) => (
  getScheduleItemsForDate((scheduleItems || []).filter((item) => !item.archived && !isShell(item)), date)
    .map(describeBlock)
    .filter((block) => !Number.isNaN(block.start.getTime()))
    .sort((left, right) => left.start - right.start)
);

const describeTask = (task, now) => {
  const due = parseWeeklyDate(task.deadline, true);
  return {
    id: String(task.id),
    title: task.title || 'Untitled task',
    subject: task.subject || task.category || '',
    due,
    dueKey: due ? toLocalDateKey(due) : null,
    workspace: task.workspace || 'personal',
    uniKind: kindOf(task),
    isMilestone: isMilestone(task),
    overdue: Boolean(due && due < now),
    record: task,
  };
};

const openTasks = (tasks) => (tasks || []).filter((task) => !isTaskArchived(task) && !isTaskCompleted(task));

// Scheduled minutes, and how much of the waking day (16h) they fill. Overlaps
// count once, so two parallel blocks do not look like a double day.
const scheduledLoad = (blocks) => {
  let total = 0;
  let cursorEnd = 0;
  blocks.forEach((block) => {
    const start = Math.max(block.start.getTime(), cursorEnd);
    if (block.end.getTime() > start) total += block.end.getTime() - start;
    cursorEnd = Math.max(cursorEnd, block.end.getTime());
  });
  const minutes = Math.round(total / MINUTE_MS);
  return { minutes, ratio: Math.min(1, minutes / (16 * 60)) };
};

// Intensity from scheduled hours, Must blocks and due tasks. The model can
// explain this level but does not pick it, so two runs agree.
export const rateIntensity = ({ minutes, mustCount, dueCount, overdueCount }) => {
  const score = minutes / 60 + mustCount * 1.5 + dueCount + overdueCount * 1.5;
  if (score >= 10) return 'packed';
  if (score >= 6) return 'busy';
  if (score >= 2.5) return 'moderate';
  return 'light';
};

export const INTENSITY_LABELS = { light: 'Light day', moderate: 'Moderate day', busy: 'Busy day', packed: 'Packed day' };

const habitSnapshot = ({ habits = [], getHabitsForDate, getHabitLog, date }) => {
  const key = toLocalDateKey(date);
  const list = getHabitsForDate ? getHabitsForDate(date) : habits;
  return list.map((habit) => ({
    id: String(habit.id),
    name: habit.name,
    type: habit.type,
    timeOfDay: habit.time_of_day || habit.timeOfDay || 'anytime',
    done: getHabitLog?.(habit.id, key)?.completed === true,
  }));
};

const targetSnapshot = ({ weekPlan, scheduleItems, now }) => (
  buildTargetProgress({ plan: weekPlan, scheduleItems, now }).map((target) => ({
    id: target.id,
    label: target.label,
    minutes: target.minutes,
    color: target.color,
    todayDone: target.today?.done || 0,
    todayMet: target.today?.met === true,
    daysMet: target.daysMet,
    daysPast: target.days.filter((day) => day.isPast).length,
  }))
);

/** Facts for "Summarize this day". */
export const buildDayBriefing = ({ now = new Date(), scheduleItems = [], tasks = [], habits = [], getHabitsForDate, getHabitLog, weekPlan = null } = {}) => {
  const today = startOfDay(now);
  const tomorrow = addDays(today, 1);
  const todayKey = toLocalDateKey(today);
  const tomorrowKey = toLocalDateKey(tomorrow);
  const blocks = dayBlocks(scheduleItems, today);
  const remaining = blocks.filter((block) => block.end > now);
  const load = scheduledLoad(blocks);
  const open = openTasks(tasks).map((task) => describeTask(task, now)).filter((task) => task.due);
  const dueToday = open.filter((task) => task.dueKey === todayKey);
  const dueTomorrow = open.filter((task) => task.dueKey === tomorrowKey);
  const overdue = open.filter((task) => task.overdue && task.dueKey !== todayKey).sort((left, right) => right.due - left.due);
  const mustCount = blocks.filter((block) => block.priority === 3).length;
  const habitList = habitSnapshot({ habits, getHabitsForDate, getHabitLog, date: today });
  const targets = targetSnapshot({ weekPlan, scheduleItems, now });

  return {
    kind: 'day',
    now,
    dateLabel: now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }),
    blocks,
    remaining,
    load,
    mustCount,
    intensity: rateIntensity({ minutes: load.minutes, mustCount, dueCount: dueToday.length + overdue.length, overdueCount: overdue.length }),
    dueToday: dueToday.sort((left, right) => left.due - right.due),
    dueTomorrow: dueTomorrow.sort((left, right) => left.due - right.due),
    overdue,
    habits: habitList,
    targets,
  };
};

/** Facts for "Week ahead": the next seven days from today. */
export const buildWeekBriefing = ({ now = new Date(), scheduleItems = [], tasks = [], habits = [], getHabitsForDate, getHabitLog, weekPlan = null, announcements = [], classes = [] } = {}) => {
  const today = startOfDay(now);
  const end = addDays(today, 7);
  const todayKey = toLocalDateKey(today);
  const days = Array.from({ length: 7 }, (_, offset) => {
    const date = addDays(today, offset);
    const blocks = dayBlocks(scheduleItems, date);
    const load = scheduledLoad(blocks);
    return {
      date,
      dateKey: toLocalDateKey(date),
      isToday: offset === 0,
      blocks,
      load,
      classCount: blocks.filter((block) => block.isClass).length,
      mustCount: blocks.filter((block) => block.priority === 3).length,
      dueTasks: [],
      intensity: 'light',
    };
  });
  const byKey = new Map(days.map((day) => [day.dateKey, day]));

  const open = openTasks(tasks).map((task) => describeTask(task, now)).filter((task) => task.due);
  const dueThisWeek = open.filter((task) => task.due >= today && task.due < end).sort((left, right) => left.due - right.due);
  const overdue = open.filter((task) => task.overdue && task.dueKey !== todayKey).sort((left, right) => right.due - left.due);
  dueThisWeek.forEach((task) => byKey.get(task.dueKey)?.dueTasks.push(task));
  days.forEach((day) => {
    day.intensity = rateIntensity({ minutes: day.load.minutes, mustCount: day.mustCount, dueCount: day.dueTasks.length, overdueCount: 0 });
  });

  // University: exams, quizzes and one-off events, plus milestone tasks.
  const universityEvents = days.flatMap((day) => day.blocks
    .filter((block) => block.workspace === 'university' && !block.isClass
      && (['exam', 'quiz', 'event'].includes(block.uniKind) || isMilestone(block.record)))
    .map((block) => ({
      id: `schedule:${block.id}:${day.dateKey}`,
      title: block.title,
      kind: block.uniKind || 'event',
      subject: block.category,
      when: block.start,
      dateKey: day.dateKey,
      daysAway: Math.round((startOfDay(block.start) - today) / DAY_MS),
    })));
  const universityTasks = dueThisWeek
    .filter((task) => task.workspace === 'university' && (task.isMilestone || ['report', 'deadline', 'payment', 'registration', 'meeting'].includes(task.uniKind)))
    .map((task) => ({
      id: `task:${task.id}`,
      title: task.title,
      kind: task.uniKind || 'deadline',
      subject: task.subject,
      when: task.due,
      dateKey: task.dueKey,
      daysAway: Math.round((startOfDay(task.due) - today) / DAY_MS),
    }));
  const university = [...universityEvents, ...universityTasks].sort((left, right) => left.when - right.when);
  const classNames = new Map((classes || []).map((course) => [String(course.id), course.name]));
  const pinnedAnnouncements = (announcements || [])
    .filter((item) => item.pinned === true)
    .map((item) => ({ id: String(item.id), title: item.title, body: item.body || '', className: classNames.get(String(item.class_id ?? item.classId)) || '' }));

  const totalMinutes = days.reduce((sum, day) => sum + day.load.minutes, 0);
  const todayHabits = habitSnapshot({ habits, getHabitsForDate, getHabitLog, date: today });

  return {
    kind: 'week',
    now,
    rangeLabel: `${dayLabel(today)} – ${dayLabel(addDays(today, 6))}`,
    days,
    totalMinutes,
    dueThisWeek,
    overdue,
    university,
    announcements: pinnedAnnouncements,
    targets: targetSnapshot({ weekPlan, scheduleItems, now }),
    habits: todayHabits,
    weekKey: getWeekKey(now),
  };
};

// Plain-text facts for the model. Short lines, one item each, no ids.
const taskLine = (task) => `- ${task.title}${task.subject ? ` (${task.subject})` : ''} · due ${dayLabel(task.due)} ${timeLabel(task.due)}${task.overdue ? ' · OVERDUE' : ''}`;
const blockLine = (block) => `- ${timeLabel(block.start)}–${timeLabel(block.end)} ${block.title}${block.category ? ` [${block.category}]` : ''}${block.isClass ? ' (class)' : ''}${block.priority !== 2 ? ` · ${schedulePriorityLabel(block.priority)}` : ''}${block.notes ? ` · ${block.notes.slice(0, 80)}` : ''}`;
const listOrNone = (lines) => (lines.length ? lines.join('\n') : '- none');

export const describeDayBriefing = (briefing) => [
  `Date: ${briefing.dateLabel}. Current time: ${timeLabel(briefing.now)}.`,
  `Scheduled: ${briefing.blocks.length} blocks, ${formatMinutes(briefing.load.minutes)} total, ${briefing.mustCount} marked Must. Computed intensity: ${briefing.intensity}.`,
  '', 'Schedule today:', listOrNone(briefing.blocks.map(blockLine)),
  '', 'Tasks due today:', listOrNone(briefing.dueToday.map(taskLine)),
  '', 'Tasks due tomorrow:', listOrNone(briefing.dueTomorrow.map(taskLine)),
  '', 'Overdue tasks:', listOrNone(briefing.overdue.slice(0, 8).map(taskLine)),
  '', 'Daily targets this week (time logged today / goal):', listOrNone(briefing.targets.map((target) => `- ${target.label}: ${formatMinutes(target.todayDone)} / ${formatMinutes(target.minutes)}${target.todayMet ? ' · met' : ''}`)),
  '', 'Habits today:', listOrNone(briefing.habits.map((habit) => `- ${habit.name} (${habit.timeOfDay})${habit.done ? ' · done' : ''}`)),
].join('\n');

export const describeWeekBriefing = (briefing) => [
  `Range: ${briefing.rangeLabel}. Today is ${weekdayLabel(briefing.now)}. Scheduled this week: ${formatMinutes(briefing.totalMinutes)} total.`,
  '', 'Days:',
  ...briefing.days.map((day) => [
    `${dayLabel(day.date)}${day.isToday ? ' (today)' : ''}: ${day.blocks.length} blocks, ${formatMinutes(day.load.minutes)}, ${day.classCount} classes, ${day.mustCount} Must, ${day.dueTasks.length} due. Computed intensity: ${day.intensity}.`,
    ...day.blocks.map(blockLine).map((line) => `  ${line}`),
  ].join('\n')),
  '', 'University exams, quizzes, events and milestones in range:',
  listOrNone(briefing.university.map((item) => `- ${dayLabel(item.when)} ${timeLabel(item.when)} ${item.title} · ${item.kind}${item.subject ? ` · ${item.subject}` : ''}`)),
  '', 'Pinned class announcements:',
  listOrNone(briefing.announcements.map((item) => `- ${item.className ? `${item.className}: ` : ''}${item.title}${item.body ? ` — ${item.body.slice(0, 120)}` : ''}`)),
  '', 'All tasks due this week:', listOrNone(briefing.dueThisWeek.map(taskLine)),
  '', 'Overdue tasks:', listOrNone(briefing.overdue.slice(0, 8).map(taskLine)),
  '', 'Daily targets (days met so far / days passed):', listOrNone(briefing.targets.map((target) => `- ${target.label}: ${formatMinutes(target.minutes)} a day · ${target.daysMet} of ${target.daysPast} days met`)),
].join('\n');
