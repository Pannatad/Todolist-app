import { isTaskCompleted } from '../utils/taskState.js';
import { toLocalDateKey } from '../utils/scheduleOccurrences.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DEFAULT_DAY_END_HOUR = 22;
const DEFAULT_MIN_SLOT_MINUTES = 25;

const parseDate = (value) => {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getTaskEstimate = (task) => {
    const value = Number(task?.estimatedTime ?? task?.estimated_time);
    return Number.isFinite(value) && value > 0 ? value : null;
};

const getTaskDeadline = (task) => parseDate(task?.deadline);

const getScheduleStart = (event) => parseDate(event?.displayTime || event?.startTime || event?.start_time);

const getScheduleDuration = (event) => {
    const value = Number(event?.duration);
    return Number.isFinite(value) && value > 0 ? value : 60;
};

const minutesBetween = (start, end) => Math.max(0, Math.round((end - start) / MINUTE));

const formatTime = (date) => date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
});

const formatDateTime = (date) => date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});

const overlaps = (left, right) => left.start < right.end && right.start < left.end;

const getWorkingWindow = (profile = {}, referenceDate = new Date()) => {
    const start = new Date(referenceDate);
    const end = new Date(referenceDate);
    const workingHours = profile.workingHours;

    const [startHour, startMinute] = typeof workingHours === 'object' && workingHours?.start
        ? workingHours.start.split(':').map(Number)
        : [8, 0];
    const [endHour, endMinute] = typeof workingHours === 'object' && workingHours?.end
        ? workingHours.end.split(':').map(Number)
        : [DEFAULT_DAY_END_HOUR, 0];

    start.setHours(
        Number.isFinite(startHour) ? startHour : 8,
        Number.isFinite(startMinute) ? startMinute : 0,
        0,
        0
    );
    end.setHours(
        Number.isFinite(endHour) ? endHour : DEFAULT_DAY_END_HOUR,
        Number.isFinite(endMinute) ? endMinute : 0,
        0,
        0
    );

    if (end <= start) {
        end.setHours(DEFAULT_DAY_END_HOUR, 0, 0, 0);
    }

    return { start, end };
};

const isToday = (date, referenceDate = new Date()) => (
    toLocalDateKey(date) === toLocalDateKey(referenceDate)
);

export const prioritizeTasks = (context = {}, options = {}) => {
    const now = options.now || new Date();
    const tasks = (context.recentTasks || [])
        .filter(task => task && !isTaskCompleted(task));

    return tasks
        .map((task) => {
            const deadline = getTaskDeadline(task);
            const estimate = getTaskEstimate(task);
            const hoursUntilDue = deadline ? (deadline - now) / HOUR : null;
            const overdue = hoursUntilDue != null && hoursUntilDue < 0;
            const dueToday = deadline ? isToday(deadline, now) : false;

            let score = 0;
            if (overdue) score += 120;
            else if (hoursUntilDue != null && hoursUntilDue <= 6) score += 95;
            else if (dueToday) score += 80;
            else if (hoursUntilDue != null && hoursUntilDue <= 24) score += 65;
            else if (hoursUntilDue != null && hoursUntilDue <= 72) score += 40;

            if (estimate && estimate <= 30) score += 6;
            if (!deadline) score -= 8;
            if (!estimate) score -= 3;

            const reason = overdue
                ? 'overdue'
                : dueToday
                    ? 'due today'
                    : deadline
                        ? `due ${formatDateTime(deadline)}`
                        : 'no deadline';

            return {
                id: task.id,
                title: task.title,
                score,
                reason,
                deadline,
                estimate
            };
        })
        .sort((left, right) => right.score - left.score)
        .slice(0, options.limit || 5);
};

export const getScheduleIntervals = (schedule = [], options = {}) => {
    const referenceDate = options.date || new Date();

    return schedule
        .map((event) => {
            const start = getScheduleStart(event);
            if (!start) return null;
            const duration = getScheduleDuration(event);
            const end = new Date(start.getTime() + duration * MINUTE);

            return {
                id: event.id,
                title: event.title,
                start,
                end,
                duration,
                category: event.category || 'Other'
            };
        })
        .filter(interval => interval && (!options.todayOnly || isToday(interval.start, referenceDate)))
        .sort((left, right) => left.start - right.start);
};

export const findScheduleConflicts = (context = {}, options = {}) => {
    const intervals = getScheduleIntervals(context.recentSchedule || [], {
        todayOnly: options.todayOnly ?? true,
        date: options.date || new Date()
    });
    const conflicts = [];

    for (let index = 0; index < intervals.length - 1; index += 1) {
        const current = intervals[index];
        const next = intervals[index + 1];
        if (!overlaps(current, next)) continue;

        conflicts.push({
            first: current,
            second: next,
            overlapMinutes: minutesBetween(next.start, current.end)
        });
    }

    return conflicts.slice(0, options.limit || 3);
};

export const findFreeTimeSlots = (context = {}, options = {}) => {
    const now = options.now || new Date();
    const minSlotMinutes = options.minSlotMinutes || DEFAULT_MIN_SLOT_MINUTES;
    const { start: workStart, end: workEnd } = getWorkingWindow(context.userProfile, now);
    const windowStart = new Date(Math.max(now.getTime(), workStart.getTime()));
    const windowEnd = options.end || workEnd;
    const intervals = getScheduleIntervals(context.recentSchedule || [], {
        todayOnly: true,
        date: now
    }).filter(interval => interval.end > windowStart && interval.start < windowEnd);

    const slots = [];
    let cursor = windowStart;

    for (const interval of intervals) {
        if (interval.start > cursor) {
            const duration = minutesBetween(cursor, interval.start);
            if (duration >= minSlotMinutes) {
                slots.push({
                    start: new Date(cursor),
                    end: new Date(interval.start),
                    duration
                });
            }
        }

        if (interval.end > cursor) {
            cursor = new Date(interval.end);
        }
    }

    if (cursor < windowEnd) {
        const duration = minutesBetween(cursor, windowEnd);
        if (duration >= minSlotMinutes) {
            slots.push({
                start: new Date(cursor),
                end: new Date(windowEnd),
                duration
            });
        }
    }

    return slots.slice(0, options.limit || 5);
};

export const buildDayPlan = (context = {}, options = {}) => {
    const priorities = prioritizeTasks(context, { limit: options.limit || 4 });
    const slots = findFreeTimeSlots(context, {
        minSlotMinutes: 25,
        limit: 6,
        now: options.now || new Date()
    });
    const plan = [];
    const remainingSlots = slots.map(slot => ({ ...slot }));

    for (const task of priorities) {
        const targetMinutes = Math.min(task.estimate || 45, 90);
        const slot = remainingSlots.find(candidate => candidate.duration >= Math.min(targetMinutes, 25));
        if (!slot) continue;

        const duration = Math.min(targetMinutes, slot.duration);
        const start = new Date(slot.start);
        const end = new Date(start.getTime() + duration * MINUTE);

        plan.push({
            title: task.title,
            taskId: task.id,
            start,
            end,
            duration,
            reason: task.reason
        });

        slot.start = end;
        slot.duration = minutesBetween(slot.start, slot.end);
    }

    return plan;
};

export const suggestHabitRecovery = (context = {}, options = {}) => {
    const habits = context.habits || [];
    return habits
        .filter(habit => !habit.completedToday)
        .map((habit) => {
            const streak = Number(habit.streak) || 0;
            const reason = streak > 0
                ? `protect ${streak}-day streak`
                : 'restart with a small action';

            return {
                id: habit.id,
                name: habit.name,
                streak,
                reason,
                suggestedAction: `Do the smallest version of "${habit.name}" today`
            };
        })
        .sort((left, right) => right.streak - left.streak)
        .slice(0, options.limit || 3);
};

export const suggestProjectNextActions = (context = {}, options = {}) => {
    const projects = context.projects || [];

    return projects
        .filter(project => project && project.status !== 'done' && project.status !== 'archived')
        .map((project) => {
            const tasks = Array.isArray(project.tasks) ? project.tasks : [];
            const nextTask = tasks.find(task => task.columnId === 'c-2') ||
                tasks.find(task => task.columnId === 'c-3') ||
                tasks.find(task => task.columnId === 'c-1');
            const action = nextTask
                ? `Continue "${nextTask.title}"`
                : project.taskCount > 0
                    ? 'Review blocked or in-progress tasks'
                    : 'Define the next concrete task';

            return {
                id: project.id,
                title: project.title,
                progress: Number(project.progress) || 0,
                action,
                reason: `${Number(project.progress) || 0}% complete`
            };
        })
        .sort((left, right) => left.progress - right.progress)
        .slice(0, options.limit || 4);
};

export const analyzeWorkload = (context = {}, options = {}) => {
    const now = options.now || new Date();
    const tasksDueToday = context.tasksDueToday || [];
    const freeSlots = findFreeTimeSlots(context, { now, limit: 10 });
    const availableMinutes = freeSlots.reduce((total, slot) => total + slot.duration, 0);
    const estimatedMinutes = tasksDueToday.reduce((total, task) => (
        total + (getTaskEstimate(task) || 45)
    ), 0);

    return {
        tasksDueToday: tasksDueToday.length,
        availableMinutes,
        estimatedMinutes,
        overloaded: estimatedMinutes > availableMinutes,
        gapMinutes: availableMinutes - estimatedMinutes
    };
};

const lineList = (items, formatter, fallback = 'None') => (
    items.length > 0 ? items.map(formatter).join('\n') : fallback
);

export const buildAgentToolInsights = (context = {}) => {
    const priorities = prioritizeTasks(context);
    const conflicts = findScheduleConflicts(context);
    const freeSlots = findFreeTimeSlots(context);
    const dayPlan = buildDayPlan(context);
    const habitRecovery = suggestHabitRecovery(context);
    const projectNextActions = suggestProjectNextActions(context);
    const workload = analyzeWorkload(context);

    return {
        priorities,
        conflicts,
        freeSlots,
        dayPlan,
        habitRecovery,
        projectNextActions,
        workload
    };
};

export const formatAgentToolInsights = (context = {}) => {
    const insights = buildAgentToolInsights(context);

    return `COMPUTED AGENT INSIGHTS:
Priority candidates:
${lineList(insights.priorities, (task, index) => `${index + 1}. "${task.title}" - ${task.reason}, ${task.estimate ? `${task.estimate} min` : 'no estimate'}`)}

Workload today:
- ${insights.workload.tasksDueToday} task(s) due today
- ${insights.workload.estimatedMinutes} estimated task minutes
- ${insights.workload.availableMinutes} free minutes in working window
- ${insights.workload.overloaded ? 'Likely overloaded' : 'Looks feasible'}${Number.isFinite(insights.workload.gapMinutes) ? ` (${insights.workload.gapMinutes} min buffer)` : ''}

Free time slots today:
${lineList(insights.freeSlots, slot => `- ${formatTime(slot.start)}-${formatTime(slot.end)} (${slot.duration} min)`)}

Schedule conflicts:
${lineList(insights.conflicts, conflict => `- "${conflict.first.title}" overlaps "${conflict.second.title}" by ${conflict.overlapMinutes} min`)}

Suggested day plan:
${lineList(insights.dayPlan, item => `- ${formatTime(item.start)}-${formatTime(item.end)}: "${item.title}" (${item.reason})`)}

Habit recovery:
${lineList(insights.habitRecovery, habit => `- "${habit.name}": ${habit.reason}`)}

Project next actions:
${lineList(insights.projectNextActions, project => `- "${project.title}": ${project.action} (${project.reason})`)}`;
};

export default {
    prioritizeTasks,
    findScheduleConflicts,
    findFreeTimeSlots,
    buildDayPlan,
    suggestHabitRecovery,
    suggestProjectNextActions,
    analyzeWorkload,
    buildAgentToolInsights,
    formatAgentToolInsights
};
