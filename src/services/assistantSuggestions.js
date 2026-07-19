import { isTaskActive } from '../utils/taskState';

const MINUTE = 60000;
const timeLabel = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const toEntries = (scheduleToday) => scheduleToday
    .map((item) => {
        const start = item.displayTime ? new Date(item.displayTime) : new Date(item.startTime || item.start_time);
        return { item, start, end: new Date(start.getTime() + (item.duration || 60) * MINUTE) };
    })
    .filter((entry) => !Number.isNaN(entry.start.getTime()))
    .sort((left, right) => left.start - right.start);

// First free slot of at least `minutes` between now and 21:00.
const findFreeGap = (entries, now, minutes) => {
    const dayEnd = new Date(now);
    dayEnd.setHours(21, 0, 0, 0);
    let cursor = new Date(now);
    for (const entry of entries) {
        if (entry.end <= cursor) continue;
        if (entry.start - cursor >= minutes * MINUTE) return cursor;
        if (entry.end > cursor) cursor = new Date(entry.end);
    }
    return dayEnd - cursor >= minutes * MINUTE ? cursor : null;
};

// Longest run of back-to-back blocks (gaps < 15 min) that is still ahead.
const findTightRun = (entries, now) => {
    const upcoming = entries.filter((entry) => entry.end > now);
    let run = null;
    let current = null;
    for (const entry of upcoming) {
        if (current && entry.start - current.end < 15 * MINUTE) {
            current = { start: current.start, end: new Date(Math.max(current.end, entry.end)) };
        } else {
            current = { start: entry.start, end: entry.end };
        }
        if (!run || current.end - current.start > run.end - run.start) run = current;
    }
    return run && run.end - run.start >= 180 * MINUTE ? run : null;
};

/**
 * Deterministic secretary suggestions for the Today view.
 * Returns at most two of: { id, message, prompt? } — prompt is handed to the chat agent.
 */
export const buildAssistantSuggestions = ({ scheduleToday = [], tasks = [], habitItems = [], now = new Date() }) => {
    const suggestions = [];
    const entries = toEntries(scheduleToday);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const activeTasks = (tasks || []).filter(isTaskActive);
    const overdue = activeTasks.filter((task) => task.deadline && new Date(task.deadline) < todayStart);
    const dueToday = activeTasks.filter((task) => {
        if (!task.deadline) return false;
        const deadline = new Date(task.deadline);
        return deadline >= todayStart && deadline.toDateString() === now.toDateString();
    });

    if (overdue.length) {
        suggestions.push({
            id: 'overdue',
            message: overdue.length === 1
                ? `“${overdue[0].title}” slipped past its deadline.`
                : `${overdue.length} tasks slipped past their deadlines.`,
            prompt: 'Help me reschedule my overdue tasks.'
        });
    }

    const tightRun = findTightRun(entries, now);
    if (tightRun) {
        const breakAt = findFreeGap(entries, now, 15);
        suggestions.push({
            id: 'tight',
            message: `Your schedule runs solid until ${timeLabel(tightRun.end)}${breakAt ? ` — a short break at ${timeLabel(breakAt)} could help` : ''}.`,
            prompt: breakAt ? `Add a 15 minute break to my schedule today at ${timeLabel(breakAt)}.` : undefined
        });
    }

    if (dueToday.length) {
        const gap = findFreeGap(entries, now, 45);
        if (gap) {
            suggestions.push({
                id: 'due-today',
                message: dueToday.length === 1
                    ? `“${dueToday[0].title}” is due today and you're free at ${timeLabel(gap)}.`
                    : `${dueToday.length} tasks are due today and you're free at ${timeLabel(gap)}.`,
                prompt: `Block time at ${timeLabel(gap)} today for my tasks due today.`
            });
        }
    }

    const openHabits = (habitItems || []).filter((habit) => !habit.completed);
    if (openHabits.length && now.getHours() >= 17) {
        const names = openHabits.slice(0, 2).map((habit) => habit.name).join(' and ');
        suggestions.push({
            id: 'habits',
            message: `${names}${openHabits.length > 2 ? ` and ${openHabits.length - 2} more` : ''} still open today.`
        });
    }

    return suggestions.slice(0, 2);
};
