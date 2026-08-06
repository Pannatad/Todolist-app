import { Calendar, ListChecks, Sparkles, Target } from 'lucide-react';

const RITUAL_NOTE_PREFIX = 'Created from Daily Ritual';

const STEP_META = [
    { id: 'review', label: 'Review', icon: ListChecks },
    { id: 'priorities', label: 'Priorities', icon: Target },
    { id: 'plan', label: 'Plan', icon: Calendar },
    { id: 'launch', label: 'Launch', icon: Sparkles },
];

const buttonPressProps = (handler) => ({
    onMouseDown: (event) => {
        event.preventDefault();
        handler(event);
    },
    onKeyDown: (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handler(event);
        }
    },
});

const formatTime = (date) => (
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
);

const formatMinutes = (minutes) => {
    if (!minutes || minutes <= 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const roundToNextQuarter = (date) => {
    const rounded = new Date(date);
    rounded.setSeconds(0, 0);
    const minutes = rounded.getMinutes();
    const remainder = minutes % 15;
    if (remainder !== 0) rounded.setMinutes(minutes + (15 - remainder));
    return rounded;
};

const parseDayTime = (timeValue, fallbackHour, fallbackMinute = 0) => {
    if (typeof timeValue !== 'string') return [fallbackHour, fallbackMinute];
    const [hour, minute] = timeValue.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return [fallbackHour, fallbackMinute];
    return [hour, minute];
};

const getTaskEstimate = (task) => {
    const explicitEstimate = Number(task.estimatedTime ?? task.estimated_time);
    if (Number.isFinite(explicitEstimate) && explicitEstimate > 0) {
        return Math.min(120, Math.max(25, explicitEstimate));
    }

    return 35;
};

const getHabitEstimate = (habit) => {
    if (habit.type === 'duration') {
        const target = Number(habit.target);
        if (Number.isFinite(target) && target > 0) return Math.min(120, Math.max(10, target));
    }

    return 25;
};

const getRitualItemEstimate = (item) => (
    item.kind === 'habit' ? getHabitEstimate(item.habit) : getTaskEstimate(item.task)
);

const sortTasksForRitual = (left, right) => {
    const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.POSITIVE_INFINITY;
    const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.POSITIVE_INFINITY;
    if (leftDeadline !== rightDeadline) return leftDeadline - rightDeadline;

    return 0;
};

const makeTaskCandidate = (task) => ({
    key: `task:${task.id}`,
    kind: 'task',
    id: String(task.id),
    title: task.title,
    task,
});

const makeHabitCandidate = (habit) => ({
    key: `habit:${habit.id}`,
    kind: 'habit',
    id: String(habit.id),
    title: habit.name,
    habit,
});

const getFreeWindows = (scheduleItems, now, profile) => {
    const workingHours = profile?.workingHours || {};
    const [startHour, startMinute] = parseDayTime(workingHours.start, 8, 0);
    const [endHour, endMinute] = parseDayTime(workingHours.end, 22, 0);
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), startHour, startMinute, 0, 0);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMinute, 0, 0);
    const planningStart = roundToNextQuarter(now > dayStart ? now : dayStart);
    const planningEnd = dayEnd > planningStart ? dayEnd : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 0, 0, 0);

    const sortedEvents = scheduleItems
        .map((item) => {
            const start = item.displayTime || new Date(item.startTime || item.start_time);
            const duration = Number(item.duration) || 60;
            return {
                start,
                end: new Date(start.getTime() + duration * 60000),
            };
        })
        .filter((event) => event.end > planningStart)
        .sort((left, right) => left.start - right.start);

    const windows = [];
    let cursor = new Date(planningStart);

    sortedEvents.forEach((event) => {
        if (event.start > cursor) {
            const minutes = Math.round((event.start - cursor) / 60000);
            if (minutes >= 25) {
                windows.push({ start: new Date(cursor), end: new Date(event.start), minutes });
            }
        }
        if (event.end > cursor) cursor = new Date(event.end);
    });

    if (planningEnd > cursor) {
        const minutes = Math.round((planningEnd - cursor) / 60000);
        if (minutes >= 25) windows.push({ start: new Date(cursor), end: planningEnd, minutes });
    }

    return windows;
};

const buildPlanBlocks = (selectedItems, windows) => {
    const blocks = [];
    const mutableWindows = windows.map((window) => ({ ...window, cursor: new Date(window.start) }));

    selectedItems.forEach((item) => {
        const targetDuration = getRitualItemEstimate(item);
        const window = mutableWindows.find((candidate) => candidate.minutes >= 25);
        if (!window) return;

        const remaining = Math.round((window.end - window.cursor) / 60000);
        const minimumDuration = item.kind === 'habit' ? 10 : 25;
        const duration = Math.min(targetDuration, remaining >= targetDuration ? targetDuration : Math.max(minimumDuration, remaining));
        if (duration < minimumDuration || window.cursor >= window.end) return;

        const start = new Date(window.cursor);
        const end = new Date(start.getTime() + duration * 60000);
        blocks.push({
            id: `${item.key}_${start.toISOString()}`,
            ...item,
            start,
            end,
            duration,
        });

        window.cursor = new Date(end.getTime() + 10 * 60000);
        window.minutes = Math.round((window.end - window.cursor) / 60000);
    });

    return blocks;
};

const getRitualKeyFromScheduleItem = (item) => {
    const notes = item?.notes || '';
    const keyMatch = notes.match(/Daily Ritual key:([^\s]+)/);
    if (keyMatch?.[1]) return keyMatch[1];

    const legacyTaskMatch = notes.match(/Daily Ritual task:([^\s]+)/);
    return legacyTaskMatch?.[1] ? `task:${legacyTaskMatch[1]}` : null;
};

export {
    buildPlanBlocks,
    buttonPressProps,
    formatMinutes,
    formatTime,
    getFreeWindows,
    getRitualItemEstimate,
    getRitualKeyFromScheduleItem,
    makeHabitCandidate,
    makeTaskCandidate,
    RITUAL_NOTE_PREFIX,
    sortTasksForRitual,
    STEP_META,
};
