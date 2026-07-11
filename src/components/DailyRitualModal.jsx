import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { ArrowRight, Calendar, Check, CheckCircle2, Clock, ListChecks, Sparkles, Sunrise, Target, X } from 'lucide-react';
import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences';
import { isTaskActive } from '../utils/taskState';

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

    switch (String(task.difficulty || '').toLowerCase()) {
        case 'hard':
            return 90;
        case 'medium':
            return 60;
        default:
            return 35;
    }
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

    const difficultyRank = { hard: 0, medium: 1, easy: 2 };
    return (difficultyRank[left.difficulty] ?? 3) - (difficultyRank[right.difficulty] ?? 3);
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

const RitualChoice = ({ item, selected, onToggle }) => {
    const deadline = item.kind === 'task' && item.task.deadline ? new Date(item.task.deadline) : null;
    const label = item.kind === 'habit' ? 'habit' : (item.task.difficulty || 'task');

    return (
        <button
            type="button"
            {...buttonPressProps(() => onToggle(item.key))}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${selected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] shadow-sm'
                : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                }`}
        >
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-[var(--color-accent)]0 bg-[var(--color-accent)] text-white' : 'border-gray-300 bg-white text-transparent'}`}>
                    <Check size={12} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        <span>{label}</span>
                        <span>{formatMinutes(getRitualItemEstimate(item))}</span>
                        {deadline && <span>due {deadline.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                    </div>
                </div>
            </div>
        </button>
    );
};

const DailyRitualModal = ({
    isOpen,
    onClose,
    profile,
    user,
    tasks = [],
    scheduleItems = [],
    habits = [],
    getHabitLog,
    logHabit,
    addScheduleItem,
    onOpenTask,
    onNavigate,
    onAskAgent,
    onComplete,
}) => {
    const [stepIndex, setStepIndex] = useState(0);
    const [selectedItemKeys, setSelectedItemKeys] = useState([]);
    const [isApplying, setIsApplying] = useState(false);
    const [applied, setApplied] = useState(false);
    const [applyError, setApplyError] = useState('');
    const [ritualNow, setRitualNow] = useState(() => new Date());

    const now = ritualNow;
    const todayKey = useMemo(() => toLocalDateKey(now), [now]);
    const todayStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now]);
    const tomorrowStart = useMemo(() => {
        const next = new Date(todayStart);
        next.setDate(next.getDate() + 1);
        return next;
    }, [todayStart]);

    const activeTasks = useMemo(() => (
        tasks.filter(isTaskActive).sort(sortTasksForRitual)
    ), [tasks]);

    const overdueTasks = useMemo(() => (
        activeTasks.filter((task) => task.deadline && new Date(task.deadline) < todayStart)
    ), [activeTasks, todayStart]);

    const dueTodayTasks = useMemo(() => (
        activeTasks.filter((task) => {
            if (!task.deadline) return false;
            const deadline = new Date(task.deadline);
            return deadline >= todayStart && deadline < tomorrowStart;
        })
    ), [activeTasks, todayStart, tomorrowStart]);

    const taskPriorityCandidates = useMemo(() => {
        const seen = new Set();
        return [...overdueTasks, ...dueTodayTasks, ...activeTasks]
            .filter((task) => {
                if (seen.has(task.id)) return false;
                seen.add(task.id);
                return true;
            })
            .slice(0, 6)
            .map(makeTaskCandidate);
    }, [activeTasks, dueTodayTasks, overdueTasks]);

    const todaySchedule = useMemo(() => (
        getScheduleItemsForDate(scheduleItems, now).sort((left, right) => left.displayTime - right.displayTime)
    ), [now, scheduleItems]);

    const scheduledRitualKeys = useMemo(() => (
        new Set(
            todaySchedule
                .map(getRitualKeyFromScheduleItem)
                .filter(Boolean)
        )
    ), [todaySchedule]);

    const pendingHabits = useMemo(() => (
        habits.filter((habit) => !getHabitLog?.(habit.id, todayKey)?.completed)
    ), [getHabitLog, habits, todayKey]);

    const habitPriorityCandidates = useMemo(() => (
        pendingHabits.slice(0, 5).map(makeHabitCandidate)
    ), [pendingHabits]);

    const priorityCandidates = useMemo(() => (
        [...taskPriorityCandidates, ...habitPriorityCandidates].slice(0, 10)
    ), [habitPriorityCandidates, taskPriorityCandidates]);

    const priorityCandidateKeys = useMemo(() => (
        priorityCandidates.map((item) => item.key).join('|')
    ), [priorityCandidates]);

    const freeWindows = useMemo(() => getFreeWindows(todaySchedule, now, profile), [now, profile, todaySchedule]);

    const selectedItems = useMemo(() => (
        priorityCandidates.filter((item) => selectedItemKeys.includes(item.key))
    ), [priorityCandidates, selectedItemKeys]);

    const alreadyScheduledItems = useMemo(() => (
        selectedItems.filter((item) => scheduledRitualKeys.has(item.key))
    ), [scheduledRitualKeys, selectedItems]);

    const unscheduledSelectedItems = useMemo(() => (
        selectedItems.filter((item) => !scheduledRitualKeys.has(item.key))
    ), [scheduledRitualKeys, selectedItems]);

    const planBlocks = useMemo(() => buildPlanBlocks(unscheduledSelectedItems, freeWindows), [freeWindows, unscheduledSelectedItems]);

    useEffect(() => {
        if (!isOpen) return;
        setRitualNow(new Date());
        setStepIndex(0);
        setApplied(false);
        setApplyError('');
        setSelectedItemKeys(priorityCandidateKeys ? priorityCandidateKeys.split('|').slice(0, 5) : []);
    }, [isOpen, priorityCandidateKeys]);

    const toggleItem = (itemKey) => {
        setSelectedItemKeys((previous) => (
            previous.includes(itemKey)
                ? previous.filter((key) => key !== itemKey)
                : [...previous, itemKey].slice(0, 6)
        ));
    };

    const goToStep = (index) => {
        setStepIndex(Math.min(STEP_META.length - 1, Math.max(0, index)));
    };

    const goNext = () => {
        goToStep(stepIndex + 1);
    };

    const goBack = () => {
        goToStep(stepIndex - 1);
    };

    const handleApplyPlan = async () => {
        if (isApplying) return;
        if (planBlocks.length === 0) {
            if (alreadyScheduledItems.length > 0) {
                setApplied(true);
                setStepIndex(3);
            }
            return;
        }

        setIsApplying(true);
        setApplyError('');
        try {
            for (const block of planBlocks) {
                await addScheduleItem({
                    title: `${block.kind === 'habit' ? 'Habit' : 'Focus'}: ${block.title}`,
                    startTime: block.start.toISOString(),
                    duration: block.duration,
                    category: block.kind === 'habit' ? 'Habit' : 'Focus',
                    color: block.kind === 'habit' ? '#14b8a6' : '#6366f1',
                    notes: `${RITUAL_NOTE_PREFIX} key:${block.key} title:${block.title}`,
                });
            }
            markRitualComplete();
            setApplied(true);
            setStepIndex(3);
        } catch (error) {
            console.error('Unable to apply Daily Ritual plan:', error);
            setApplyError(error?.message || 'Unable to apply the plan. Try again in a moment.');
        } finally {
            setIsApplying(false);
        }
    };

    const markRitualComplete = () => {
        const completedAt = new Date().toISOString();
        localStorage.setItem(`daily-ritual-completed-${todayKey}`, completedAt);
        onComplete?.(completedAt);
    };

    const handleFinish = () => {
        markRitualComplete();
        onClose();
    };

    const displayName = profile?.nickname || profile?.name || user?.email?.split('@')[0] || 'there';
    const activeStep = STEP_META[stepIndex];

    return (
        <AnimatePresence>
            {isOpen && (
                <Motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 px-3 py-4 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <Motion.div
                        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl"
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 sm:px-7">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-warning)] text-[var(--color-warning)]">
                                    <Sunrise size={22} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-warning)]">Daily Ritual</div>
                                    <h2 className="text-2xl font-bold text-gray-900">Start with intention, {displayName}</h2>
                                </div>
                            </div>
                            <button
                                type="button"
                                {...buttonPressProps(onClose)}
                                className="rounded-2xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                                aria-label="Close Daily Ritual"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_1fr]">
                            <aside className="border-b border-gray-100 bg-gray-50/70 p-4 lg:border-b-0 lg:border-r">
                                <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                                    {STEP_META.map((step, index) => {
                                        const StepIcon = step.icon;
                                        const isActive = index === stepIndex;
                                        const isDone = index < stepIndex || (index === 3 && applied);

                                        return (
                                            <button
                                                key={step.id}
                                                type="button"
                                                {...buttonPressProps(() => goToStep(index))}
                                                className={`flex items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-semibold transition-all ${isActive
                                                    ? 'bg-white text-[var(--color-accent)] shadow-sm'
                                                    : 'text-gray-500 hover:bg-white/70 hover:text-gray-900'
                                                    }`}
                                            >
                                                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${isDone ? 'bg-[var(--color-success)] text-[var(--color-success)]' : isActive ? 'bg-[var(--color-accent)] text-[var(--color-accent)]' : 'bg-white text-gray-400'}`}>
                                                    {isDone ? <CheckCircle2 size={16} /> : <StepIcon size={16} />}
                                                </span>
                                                {step.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </aside>

                            <main className="min-h-0 overflow-y-auto p-5 sm:p-7">
                                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                                    <div>
                                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]0">{activeStep.label}</div>
                                        <h3 className="mt-1 text-2xl font-bold text-gray-900">
                                            {stepIndex === 0 && 'See the day clearly'}
                                            {stepIndex === 1 && 'Choose the work that matters'}
                                            {stepIndex === 2 && 'Turn priorities into time'}
                                            {stepIndex === 3 && 'You are ready to begin'}
                                        </h3>
                                    </div>
                                    <div className="text-sm font-medium text-gray-500">
                                        {now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </div>
                                </div>

                                <div className="mb-5 rounded-3xl border border-[var(--color-accent)] bg-[var(--color-accent)]/70 px-5 py-4">
                                    <div className="text-sm font-bold text-[var(--color-accent)]">
                                        Step {stepIndex + 1} of {STEP_META.length}: {activeStep.label}
                                    </div>
                                    <p className="mt-1 text-sm text-[var(--color-accent)]">
                                        {stepIndex === 0 && 'I am collecting today’s tasks, habits, and schedule so you can see what needs attention.'}
                                        {stepIndex === 1 && `Choose what should become today's plan. ${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'} selected.`}
                                        {stepIndex === 2 && `I found ${freeWindows.length} free window${freeWindows.length === 1 ? '' : 's'} and prepared ${planBlocks.length} new ritual block${planBlocks.length === 1 ? '' : 's'}.`}
                                        {stepIndex === 3 && 'Your launch path is ready. You can view the schedule or ask the agent to guide execution.'}
                                    </p>
                                </div>

                                {stepIndex === 0 && (
                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                        <div className="rounded-3xl border border-[var(--color-error)] bg-[var(--color-error)]/70 p-5">
                                            <div className="text-sm font-bold text-[var(--color-error)]">Overdue</div>
                                            <div className="mt-2 text-3xl font-bold text-gray-900">{overdueTasks.length}</div>
                                            <div className="mt-4 space-y-2">
                                                {overdueTasks.slice(0, 3).map((task) => (
                                                    <button key={task.id} type="button" {...buttonPressProps(() => onOpenTask?.(task))} className="block w-full truncate rounded-xl bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-[var(--color-error)]">
                                                        {task.title}
                                                    </button>
                                                ))}
                                                {overdueTasks.length === 0 && <p className="text-sm text-[var(--color-error)]/70">Nothing overdue.</p>}
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-[var(--color-warning)] bg-[var(--color-warning)]/70 p-5">
                                            <div className="text-sm font-bold text-[var(--color-warning)]">Due Today</div>
                                            <div className="mt-2 text-3xl font-bold text-gray-900">{dueTodayTasks.length}</div>
                                            <div className="mt-4 space-y-2">
                                                {dueTodayTasks.slice(0, 3).map((task) => (
                                                    <button key={task.id} type="button" {...buttonPressProps(() => onOpenTask?.(task))} className="block w-full truncate rounded-xl bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-[var(--color-warning)]">
                                                        {task.title}
                                                    </button>
                                                ))}
                                                {dueTodayTasks.length === 0 && <p className="text-sm text-[var(--color-warning)]/70">No deadlines landing today.</p>}
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-[var(--color-success)] bg-[var(--color-success)]/70 p-5">
                                            <div className="text-sm font-bold text-[var(--color-success)]">Habits Left</div>
                                            <div className="mt-2 text-3xl font-bold text-gray-900">{pendingHabits.length}</div>
                                            <div className="mt-4 space-y-2">
                                                {pendingHabits.slice(0, 3).map((habit) => (
                                                    <button
                                                        key={habit.id}
                                                        type="button"
                                                        {...buttonPressProps(() => logHabit?.(habit.id, todayKey, habit.type === 'count' || habit.type === 'duration' ? (habit.target || 1) : 1, true))}
                                                        className="flex w-full items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-left text-sm font-medium text-gray-800 hover:bg-[var(--color-success)]"
                                                    >
                                                        <span className="truncate">{habit.name}</span>
                                                        <Check size={14} className="text-[var(--color-success)]" />
                                                    </button>
                                                ))}
                                                {pendingHabits.length === 0 && <p className="text-sm text-[var(--color-success)]/70">All scheduled habits are done.</p>}
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5 lg:col-span-3">
                                            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
                                                <Clock size={16} className="text-[var(--color-accent)]0" />
                                                Today's shape
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                {todaySchedule.slice(0, 4).map((item) => (
                                                    <div key={`${item.id}_${item._occurrenceDate || todayKey}`} className="rounded-2xl bg-white px-4 py-3">
                                                        <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                                                        <div className="mt-1 text-xs text-gray-500">
                                                            {formatTime(item.displayTime || new Date(item.startTime || item.start_time))} for {formatMinutes(item.duration || 60)}
                                                        </div>
                                                    </div>
                                                ))}
                                                {todaySchedule.length === 0 && <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500">Your schedule is open today.</div>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stepIndex === 1 && (
                                    <div className="space-y-4">
                                        <div className="rounded-3xl border border-[var(--color-accent)] bg-[var(--color-accent)] px-5 py-4 text-sm text-[var(--color-accent)]">
                                            Pick tasks or habits. The ritual will schedule the selected work into real free windows.
                                        </div>
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                            {priorityCandidates.map((item) => (
                                                <RitualChoice
                                                    key={item.key}
                                                    item={item}
                                                    selected={selectedItemKeys.includes(item.key)}
                                                    onToggle={toggleItem}
                                                />
                                            ))}
                                            {priorityCandidates.length === 0 && (
                                                <div className="rounded-3xl border border-gray-100 bg-gray-50 p-6 text-sm text-gray-500">
                                                    No active tasks or habits. Add one first, or use the open time for planning.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {stepIndex === 2 && (
                                    <div className="space-y-4">
                                        {freeWindows.length > 0 && (
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                                {freeWindows.slice(0, 3).map((window) => (
                                                    <div key={window.start.toISOString()} className="rounded-2xl border border-[var(--color-accent)] bg-[var(--color-accent)] px-4 py-3">
                                                        <div className="text-sm font-bold text-gray-900">{formatTime(window.start)} - {formatTime(window.end)}</div>
                                                        <div className="mt-1 text-xs font-semibold text-[var(--color-accent)]">{formatMinutes(window.minutes)} free</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="rounded-3xl border border-gray-100 bg-gray-50 p-5">
                                            <div className="mb-4 flex items-center justify-between gap-3">
                                                <div>
                                                    <h4 className="font-bold text-gray-900">Suggested focus blocks</h4>
                                                    <p className="mt-1 text-sm text-gray-500">These will be added to your schedule when you apply the plan.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    {...buttonPressProps(handleApplyPlan)}
                                                    disabled={isApplying || (planBlocks.length === 0 && alreadyScheduledItems.length === 0) || applied}
                                                    className="rounded-2xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {isApplying ? 'Applying...' : applied ? 'Applied' : planBlocks.length === 0 && alreadyScheduledItems.length > 0 ? 'Continue' : 'Apply plan'}
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {alreadyScheduledItems.length > 0 && (
                                                    <div className="rounded-2xl border border-[var(--color-success)] bg-[var(--color-success)] px-4 py-3 text-sm text-[var(--color-success)]">
                                                        {alreadyScheduledItems.length} selected priorit{alreadyScheduledItems.length === 1 ? 'y is' : 'ies are'} already scheduled from today&apos;s ritual, so duplicate blocks will not be created.
                                                    </div>
                                                )}

                                                {planBlocks.map((block) => (
                                                    <div key={block.id} className="flex flex-col gap-2 rounded-2xl bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm font-semibold text-gray-900">{block.title}</div>
                                                            <div className="mt-1 text-xs text-gray-500">{formatTime(block.start)} - {formatTime(block.end)} · {formatMinutes(block.duration)}</div>
                                                        </div>
                                                        {block.kind === 'task' && (
                                                            <button type="button" {...buttonPressProps(() => onOpenTask?.(block.task))} className="self-start rounded-xl bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 sm:self-auto">
                                                                Open task
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {planBlocks.length === 0 && (
                                                    <div className="rounded-2xl bg-white px-4 py-4 text-sm text-gray-500">
                                                        {alreadyScheduledItems.length > 0
                                                            ? 'Everything selected is already covered. You can continue to launch.'
                                                            : 'No focus blocks fit into the remaining free windows. Try selecting fewer priorities or use the agent to rework your schedule.'}
                                                    </div>
                                                )}
                                                {applyError && (
                                                    <div className="rounded-2xl border border-[var(--color-error)] bg-[var(--color-error)] px-4 py-3 text-sm font-semibold text-[var(--color-error)]">
                                                        {applyError}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stepIndex === 3 && (
                                    <div className="rounded-3xl border border-[var(--color-success)] bg-[var(--color-success)] p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-[var(--color-success)]">
                                                <CheckCircle2 size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-gray-900">Your day has a launch path.</h4>
                                                <p className="mt-2 text-sm text-[var(--color-success)]">
                                                    {applied
                                                        ? `${planBlocks.length} new ritual block${planBlocks.length === 1 ? '' : 's'} ${planBlocks.length === 1 ? 'was' : 'were'} added. ${alreadyScheduledItems.length > 0 ? `${alreadyScheduledItems.length} selected priorit${alreadyScheduledItems.length === 1 ? 'y was' : 'ies were'} already scheduled.` : ''}`
                                                        : 'Review your plan, then start with the first small move.'}
                                                </p>
                                                <div className="mt-5 flex flex-wrap gap-3">
                                                    <button type="button" {...buttonPressProps(() => { onNavigate?.('schedule'); handleFinish(); })} className="rounded-2xl bg-[var(--color-success)] px-4 py-2 text-sm font-bold text-white hover:bg-[var(--color-success)]">
                                                        View schedule
                                                    </button>
                                                    <button type="button" {...buttonPressProps(() => { onAskAgent?.("Help me execute today's plan step by step"); handleFinish(); })} className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-[var(--color-success)] hover:bg-[var(--color-success)]">
                                                        Ask agent to guide me
                                                    </button>
                                                    <button type="button" {...buttonPressProps(handleFinish)} className="rounded-2xl bg-[var(--color-success)] px-4 py-2 text-sm font-bold text-[var(--color-success)] hover:bg-[var(--color-success)]">
                                                        Finish ritual
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </main>
                        </div>

                        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-4 sm:px-7">
                            <button
                                type="button"
                                {...buttonPressProps(goBack)}
                                disabled={stepIndex === 0}
                                className="rounded-2xl px-4 py-2 text-sm font-bold text-gray-500 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Back
                            </button>
                            {stepIndex < STEP_META.length - 1 ? (
                                <button
                                    type="button"
                                    {...buttonPressProps(goNext)}
                                    className="inline-flex items-center gap-2 rounded-2xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                                >
                                    Continue <ArrowRight size={16} />
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    {...buttonPressProps(handleFinish)}
                                    className="rounded-2xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                                >
                                    Done
                                </button>
                            )}
                        </div>
                    </Motion.div>
                </Motion.div>
            )}
        </AnimatePresence>
    );
};

export default DailyRitualModal;
