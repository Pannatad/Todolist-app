import { getScheduleItemsForDate, toLocalDateKey } from './scheduleOccurrences.js';

// A week plan holds the week's daily targets ("AI 2h a day"). Time only counts
// when the user logs it. Finished Plan blocks that match a target are offered
// as suggestions the user confirms or skips, never logged automatically.
// (Older plans may also carry theme, Build/Break habit ids, and key tasks;
// they are kept as stored but no longer shown.)

export const MAX_TARGETS = 6;
export const MAX_KEY_TASKS = 3;
export const TARGET_MINUTE_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180, 240, 300];

// Distinct, readable colors; each target and habit row gets its own.
export const ROW_COLORS = ['#007aff', '#ff9500', '#34c759', '#af52de', '#ff2d55', '#30b0c7', '#5856d6', '#ff3b30', '#00c7be', '#a2845e', '#32ade6', '#8bc34a'];

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const MAX_REVIEWED = 80;

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

// Gives every item its own color. Preferred colors are kept first wherever
// they're free (the first item wins a shared one); the rest then take the
// first unused colors from ROW_COLORS.
export const pickDistinctColors = (preferred = [], taken = []) => {
    const used = new Set(taken.filter(Boolean).map((color) => color.toLowerCase()));
    const result = preferred.map((color) => {
        const wanted = HEX_COLOR.test(color || '') ? color.toLowerCase() : null;
        if (!wanted || used.has(wanted)) return null;
        used.add(wanted);
        return wanted;
    });
    return result.map((color) => {
        if (color) return color;
        const free = ROW_COLORS.find((option) => !used.has(option)) || ROW_COLORS[used.size % ROW_COLORS.length];
        used.add(free);
        return free;
    });
};

const cleanText = (value, max = 120) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, max);

// Minutes logged by hand per day.
const cleanLogged = (logged) => {
    if (!logged || typeof logged !== 'object' || Array.isArray(logged)) return {};
    return Object.fromEntries(Object.entries(logged)
        .map(([dateKey, minutes]) => [dateKey, Math.round(Number(minutes))])
        .filter(([dateKey, minutes]) => DATE_KEY.test(dateKey) && Number.isFinite(minutes) && minutes > 0)
        .map(([dateKey, minutes]) => [dateKey, Math.min(minutes, 24 * 60)]));
};

// Keys of finished-block suggestions the user already logged or skipped.
const cleanReviewed = (reviewed) => (
    Array.isArray(reviewed)
        ? [...new Set(reviewed.filter((key) => typeof key === 'string' && key.length < 400))].slice(-MAX_REVIEWED)
        : []
);

const cleanTarget = (target) => {
    const label = cleanText(target?.label, 40);
    const minutes = Math.round(Number(target?.minutes));
    if (!label || !Number.isFinite(minutes) || minutes <= 0) return null;
    const logged = cleanLogged(target.logged);
    const reviewed = cleanReviewed(target.reviewed);
    return {
        id: String(target.id || makeId()),
        label,
        minutes: Math.min(minutes, 24 * 60),
        color: HEX_COLOR.test(target.color || '') ? target.color.toLowerCase() : null,
        ...(Object.keys(logged).length ? { logged } : {}),
        ...(reviewed.length ? { reviewed } : {}),
    };
};

const cleanKeyTask = (task) => {
    const title = cleanText(task?.title, 140);
    if (!title) return null;
    return { id: String(task.id || makeId()), title, done: task.done === true };
};

const withColors = (targets) => {
    const colors = pickDistinctColors(targets.map((target) => target.color));
    return targets.map((target, index) => ({ ...target, color: colors[index] }));
};

// Accepts rows from Supabase (snake_case) or local drafts (camelCase).
export const normalizeWeekPlan = (record = {}) => ({
    id: record.id ?? null,
    weekStart: record.weekStart || record.week_start || '',
    theme: cleanText(record.theme),
    buildHabitId: record.buildHabitId ?? record.build_habit_id ?? null,
    breakHabitId: record.breakHabitId ?? record.break_habit_id ?? null,
    targets: withColors((Array.isArray(record.targets) ? record.targets : []).map(cleanTarget).filter(Boolean).slice(0, MAX_TARGETS)),
    keyTasks: (Array.isArray(record.keyTasks ?? record.key_tasks) ? (record.keyTasks ?? record.key_tasks) : [])
        .map(cleanKeyTask).filter(Boolean).slice(0, MAX_KEY_TASKS),
    updatedAt: record.updatedAt || record.updated_at || null,
});

export const isWeekPlanEmpty = (plan) => !plan?.targets?.length;

// A new week starts with last week's targets (same names, minutes, colors)
// and nothing logged yet.
export const draftFromPreviousWeek = (previous, weekStart) => {
    const base = previous ? normalizeWeekPlan(previous) : null;
    return normalizeWeekPlan({
        weekStart,
        targets: (base?.targets || []).map((target) => ({
            id: makeId(),
            label: target.label,
            minutes: target.minutes,
            color: target.color,
        })),
    });
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A Plan block matches a target when its category equals the target's name,
// or its title contains the name as a word ("AI" matches "AI course", not
// "said"). Scripts without spaces, such as Thai, match anywhere in the title.
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

const blockSpan = (item) => {
    const start = new Date(item.displayTime || item.startTime || item.start_time).getTime();
    const duration = Number(item.duration);
    const minutes = Number.isFinite(duration) && duration > 0 ? duration : 60;
    return { start, end: start + minutes * 60000 };
};

// Matching Plan blocks on one day that have already ended. Overlapping blocks
// (a flexible shell and the blocks inside it) become one suggestion, so time
// is never offered twice.
export const findFinishedBlocks = (dayItems, label, dateKey, now = new Date()) => {
    const nowMs = now.getTime();
    const spans = dayItems
        .filter((item) => item && item.archived !== true && blockMatchesTarget(item, label))
        .map((item) => ({ item, ...blockSpan(item) }))
        .filter(({ start, end }) => Number.isFinite(start) && end > start)
        .sort((left, right) => left.start - right.start);

    const groups = [];
    spans.forEach((span) => {
        const last = groups[groups.length - 1];
        if (last && span.start < last.end) {
            last.end = Math.max(last.end, span.end);
            last.items.push(span.item);
        } else {
            groups.push({ start: span.start, end: span.end, items: [span.item] });
        }
    });

    return groups
        .filter((group) => group.end <= nowMs)
        .map((group) => ({
            key: `${dateKey}|${group.items.map((item) => String(item.id ?? item.title)).sort().join('+')}`,
            dateKey,
            title: group.items[0].title || 'Plan block',
            extraCount: group.items.length - 1,
            start: new Date(group.start),
            end: new Date(group.end),
            minutes: Math.round((group.end - group.start) / 60000),
        }));
};

// Per-target progress for each day of the week, from logged minutes only,
// plus finished Plan blocks waiting for the user to confirm or skip.
// Day status: met, missed (past), today, or open (ahead).
export const buildTargetProgress = ({ plan, scheduleItems = [], now = new Date() }) => {
    if (!plan?.weekStart || !plan.targets?.length) return [];
    const todayKey = toLocalDateKey(now);
    const days = getWeekDays(plan.weekStart).map((date) => {
        const dateKey = toLocalDateKey(date);
        return {
            date,
            dateKey,
            items: dateKey <= todayKey ? getScheduleItemsForDate(scheduleItems, date) : [],
        };
    });

    return plan.targets.map((target) => {
        const reviewed = new Set(target.reviewed || []);
        const dayStats = days.map(({ date, dateKey }) => {
            const done = target.logged?.[dateKey] || 0;
            const isToday = dateKey === todayKey;
            const isPast = dateKey < todayKey;
            const met = done >= target.minutes;
            let status = 'open';
            if (met) status = 'met';
            else if (isPast) status = 'missed';
            else if (isToday) status = 'today';
            return { date, dateKey, done, ratio: Math.min(1, done / target.minutes), met, isToday, isPast, status };
        });
        const suggestions = days
            .flatMap(({ dateKey, items }) => findFinishedBlocks(items, target.label, dateKey, now))
            .filter((suggestion) => !reviewed.has(suggestion.key))
            .sort((left, right) => right.end - left.end);
        return {
            ...target,
            days: dayStats,
            today: dayStats.find((day) => day.isToday) || null,
            daysMet: dayStats.filter((day) => day.met).length,
            suggestions,
        };
    });
};

const updateTarget = (plan, targetId, change) => ({
    ...plan,
    targets: plan.targets.map((target) => (target.id === targetId ? change(target) : target)),
});

const withLogged = (target, logged) => {
    const copy = { ...target };
    if (Object.keys(logged).length) copy.logged = logged;
    else delete copy.logged;
    return copy;
};

// Sets (not adds) the minutes logged for one target on one day.
export const setLoggedMinutes = (plan, targetId, dateKey, minutes) => {
    const value = Math.max(0, Math.min(24 * 60, Math.round(Number(minutes) || 0)));
    return updateTarget(plan, targetId, (target) => {
        const logged = { ...(target.logged || {}) };
        if (value > 0) logged[dateKey] = value;
        else delete logged[dateKey];
        return withLogged(target, logged);
    });
};

const markReviewed = (target, key) => ({
    ...target,
    reviewed: cleanReviewed([...(target.reviewed || []), key]),
});

// The user confirmed a finished block: add its minutes to that day.
export const acceptSuggestion = (plan, targetId, suggestion) => updateTarget(plan, targetId, (target) => {
    const logged = { ...(target.logged || {}) };
    logged[suggestion.dateKey] = Math.min(24 * 60, (logged[suggestion.dateKey] || 0) + suggestion.minutes);
    return markReviewed(withLogged(target, logged), suggestion.key);
});

// The user said they didn't do it: stop asking.
export const dismissSuggestion = (plan, targetId, key) => updateTarget(plan, targetId, (target) => markReviewed(target, key));

// Seven day states for a habit across the week, from its logs.
// Day status: met, missed (past), today, open (ahead), or off (not scheduled).
export const buildHabitWeek = ({ habit, weekStart, getLog, isScheduled = () => true, now = new Date() }) => {
    if (!habit || !weekStart) return [];
    const todayKey = toLocalDateKey(now);
    const target = Number(habit.target) || 1;
    return getWeekDays(weekStart).map((date) => {
        const dateKey = toLocalDateKey(date);
        const log = getLog?.(habit.id, dateKey);
        const done = log?.completed === true;
        const partial = !done && (habit.type === 'count' || habit.type === 'duration') ? Math.min(1, (Number(log?.value) || 0) / target) : 0;
        const scheduled = isScheduled(habit, date);
        let status = 'open';
        if (done) status = 'met';
        else if (!scheduled) status = 'off';
        else if (dateKey < todayKey) status = 'missed';
        else if (dateKey === todayKey) status = 'today';
        return { date, dateKey, done, ratio: done ? 1 : partial, scheduled, status, isToday: dateKey === todayKey };
    });
};
