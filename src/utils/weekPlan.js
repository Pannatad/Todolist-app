import { getScheduleItemsForDate, toLocalDateKey } from './scheduleOccurrences.js';

// A week plan gives one week a direction: a theme, one habit to build, one to
// break, daily time targets counted from Plan blocks, and a few key tasks.

export const MAX_KEY_TASKS = 3;
export const MAX_TARGETS = 4;
export const TARGET_MINUTE_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300];

const DAY_MS = 24 * 60 * 60 * 1000;

const makeId = () => (
    globalThis.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
);

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const getWeekStart = (value = new Date()) => {
    const date = startOfDay(new Date(value));
    date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return date;
};

export const getWeekKey = (value = new Date()) => toLocalDateKey(getWeekStart(value));

export const dateFromKey = (key) => {
    const [year, month, day] = String(key).split('-').map(Number);
    return new Date(year, month - 1, day);
};

export const shiftWeekKey = (key, weeks) => {
    const date = dateFromKey(key);
    date.setDate(date.getDate() + weeks * 7);
    return toLocalDateKey(date);
};

export const getWeekDays = (weekKey) => {
    const start = dateFromKey(weekKey);
    return Array.from({ length: 7 }, (_, offset) => {
        const date = new Date(start);
        date.setDate(start.getDate() + offset);
        return date;
    });
};

// ISO 8601 week number: weeks start on Monday and week 1 holds the first Thursday.
export const getWeekNumber = (value) => {
    const date = startOfDay(new Date(value));
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
    const firstThursday = new Date(date.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() + 3 - ((firstThursday.getDay() + 6) % 7));
    return 1 + Math.round((date - firstThursday) / (7 * DAY_MS));
};

export const formatMinutes = (minutes) => {
    const total = Math.max(0, Math.round(Number(minutes) || 0));
    if (total < 60) return `${total}m`;
    const hours = Math.floor(total / 60);
    const rest = total % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const cleanText = (value, max = 120) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

const cleanTarget = (target) => {
    const label = cleanText(target?.label, 40);
    const minutes = Math.round(Number(target?.minutes));
    if (!label || !Number.isFinite(minutes) || minutes <= 0) return null;
    return { id: String(target.id || makeId()), label, minutes: Math.min(minutes, 24 * 60) };
};

const cleanKeyTask = (task) => {
    const title = cleanText(task?.title, 140);
    if (!title) return null;
    return { id: String(task.id || makeId()), title, done: task.done === true };
};

// Accepts rows from Supabase (snake_case) or local drafts (camelCase).
export const normalizeWeekPlan = (record = {}) => ({
    id: record.id ?? null,
    weekStart: record.weekStart || record.week_start || '',
    theme: cleanText(record.theme),
    buildHabitId: record.buildHabitId ?? record.build_habit_id ?? null,
    breakHabitId: record.breakHabitId ?? record.break_habit_id ?? null,
    targets: (Array.isArray(record.targets) ? record.targets : []).map(cleanTarget).filter(Boolean).slice(0, MAX_TARGETS),
    keyTasks: (Array.isArray(record.keyTasks ?? record.key_tasks) ? (record.keyTasks ?? record.key_tasks) : [])
        .map(cleanKeyTask).filter(Boolean).slice(0, MAX_KEY_TASKS),
    updatedAt: record.updatedAt || record.updated_at || null,
});

export const isWeekPlanEmpty = (plan) => !plan || (
    !plan.theme && !plan.buildHabitId && !plan.breakHabitId && !plan.targets?.length && !plan.keyTasks?.length
);

// A new week starts as a copy of the last one: same habits and targets,
// unfinished key tasks carried over, and a blank direction to set fresh.
export const draftFromPreviousWeek = (previous, weekStart) => {
    const base = previous ? normalizeWeekPlan(previous) : null;
    return normalizeWeekPlan({
        weekStart,
        theme: '',
        buildHabitId: base?.buildHabitId ?? null,
        breakHabitId: base?.breakHabitId ?? null,
        targets: (base?.targets || []).map((target) => ({ ...target, id: makeId() })),
        keyTasks: (base?.keyTasks || []).filter((task) => !task.done).map((task) => ({ ...task, id: makeId() })),
    });
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A Plan block counts toward a target when its category equals the target's
// name, or its title contains the name as a word ("AI" matches "AI course",
// not "said"). Scripts without spaces, such as Thai, match anywhere in the title.
export const blockMatchesTarget = (item, label) => {
    const needle = cleanText(label, 40).toLowerCase();
    if (!needle) return false;
    const category = String(item?.category || '').trim().toLowerCase();
    if (category && category === needle) return true;
    const title = String(item?.title || '').toLowerCase();
    if (!title) return false;
    if (!/^[\x20-\x7e]+$/.test(needle)) return title.includes(needle);
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(needle)}($|[^a-z0-9])`).test(title);
};

const isCountableBlock = (item) => item && item.archived !== true && !item.isLearning;

const mergeIntervals = (intervals) => {
    const sorted = intervals.filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
    const merged = [];
    sorted.forEach(([start, end]) => {
        const last = merged[merged.length - 1];
        if (last && start <= last[1]) last[1] = Math.max(last[1], end);
        else merged.push([start, end]);
    });
    return merged;
};

// Minutes of matching Plan blocks on one day: time already passed counts as
// done, time still ahead counts as planned. Overlapping blocks (a flexible
// shell and the blocks inside it) are merged so time is never counted twice.
export const measureTargetDay = (dayItems, label, now = new Date()) => {
    const intervals = dayItems
        .filter((item) => isCountableBlock(item) && blockMatchesTarget(item, label))
        .map((item) => {
            const start = new Date(item.displayTime || item.startTime || item.start_time).getTime();
            const duration = Number(item.duration);
            const minutes = Number.isFinite(duration) && duration > 0 ? duration : 60;
            return [start, start + minutes * 60000];
        })
        .filter(([start]) => Number.isFinite(start));
    const nowMs = now.getTime();
    let done = 0;
    let planned = 0;
    mergeIntervals(intervals).forEach(([start, end]) => {
        const passed = Math.min(end, Math.max(start, nowMs)) - start;
        done += passed;
        planned += end - start - passed;
    });
    return { done: Math.round(done / 60000), planned: Math.round(planned / 60000) };
};

// Per-target progress for every day of the week.
// Day status: met, missed (past), today, planned (enough time booked ahead), or open.
export const buildTargetProgress = ({ plan, scheduleItems = [], now = new Date() }) => {
    if (!plan?.weekStart || !plan.targets?.length) return [];
    const todayKey = toLocalDateKey(now);
    const days = getWeekDays(plan.weekStart).map((date) => ({
        date,
        dateKey: toLocalDateKey(date),
        items: getScheduleItemsForDate(scheduleItems, date),
    }));

    return plan.targets.map((target) => {
        const dayStats = days.map(({ date, dateKey, items }) => {
            const { done, planned } = measureTargetDay(items, target.label, now);
            const isToday = dateKey === todayKey;
            const isPast = dateKey < todayKey;
            const met = done >= target.minutes;
            let status = 'open';
            if (met) status = 'met';
            else if (isPast) status = 'missed';
            else if (isToday) status = 'today';
            else if (planned >= target.minutes) status = 'planned';
            return { date, dateKey, done, planned, met, isToday, isPast, status };
        });
        const today = dayStats.find((day) => day.isToday) || null;
        return {
            ...target,
            days: dayStats,
            today,
            daysMet: dayStats.filter((day) => day.met).length,
        };
    });
};

// Seven day states for a habit across the week, from its logs.
export const buildHabitWeek = ({ habit, weekStart, getLog, now = new Date() }) => {
    if (!habit || !weekStart) return [];
    const todayKey = toLocalDateKey(now);
    return getWeekDays(weekStart).map((date) => {
        const dateKey = toLocalDateKey(date);
        const done = getLog?.(habit.id, dateKey)?.completed === true;
        let status = 'open';
        if (done) status = 'met';
        else if (dateKey < todayKey) status = 'missed';
        else if (dateKey === todayKey) status = 'today';
        return { date, dateKey, done, status, isToday: dateKey === todayKey };
    });
};
