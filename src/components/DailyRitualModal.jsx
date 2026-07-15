import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Calendar, Check, CheckCircle2, Clock, Sparkles, Sunrise, X } from 'lucide-react';
import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences';
import { isTaskActive } from '../utils/taskState';
import RitualChoice from './RitualChoice';
import RitualNavigation from './RitualNavigation';
import {
    buildPlanBlocks,
    buttonPressProps,
    formatMinutes,
    formatTime,
    getFreeWindows,
    getRitualKeyFromScheduleItem,
    makeHabitCandidate,
    makeTaskCandidate,
    RITUAL_NOTE_PREFIX,
    sortTasksForRitual,
    STEP_META,
} from './dailyRitualUtils';

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

    const displayName = profile?.nickname || profile?.name || user?.email?.split('@')[0] || '';
    const activeStep = STEP_META[stepIndex];

    return (
        <AnimatePresence>
            {isOpen && (
                <Motion.div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-[var(--color-overlay)] px-3 py-4 backdrop-blur-sm"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <Motion.div
                        className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-[var(--color-card)] shadow-2xl"
                        initial={{ opacity: 0, y: 24, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 16, scale: 0.98 }}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-rule)] px-5 py-4 sm:px-7">
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-warning-soft)] text-[var(--color-warning)]">
                                    <Sunrise size={22} />
                                </div>
                                <div>
                                    <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-warning)]">Daily Ritual</div>
                                    <h2 className="text-2xl font-bold text-[var(--color-ink)]">{displayName ? `Start with intention, ${displayName}` : 'Start with intention'}</h2>
                                </div>
                            </div>
                            <button
                                type="button"
                                {...buttonPressProps(onClose)}
                                className="rounded-2xl p-2 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]"
                                aria-label="Close Daily Ritual"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[220px_1fr]">
                            <aside className="border-b border-[var(--color-rule)] bg-[var(--color-paper-2)]/70 p-4 lg:border-b-0 lg:border-r">
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
                                                    ? 'bg-[var(--color-card-raised)] text-[var(--color-accent)] shadow-sm'
                                                    : 'text-[var(--color-muted)] hover:bg-[var(--color-card-raised)]/70 hover:text-[var(--color-ink)]'
                                                    }`}
                                            >
                                                <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${isDone ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]' : isActive ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]' : 'bg-[var(--color-card-raised)] text-[var(--color-muted)]'}`}>
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
                                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-accent)]">{activeStep.label}</div>
                                        <h3 className="mt-1 text-2xl font-bold text-[var(--color-ink)]">
                                            {stepIndex === 0 && 'See the day clearly'}
                                            {stepIndex === 1 && 'Choose the work that matters'}
                                            {stepIndex === 2 && 'Turn priorities into time'}
                                            {stepIndex === 3 && 'You are ready to begin'}
                                        </h3>
                                    </div>
                                    <div className="text-sm font-medium text-[var(--color-muted)]">
                                        {now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                                    </div>
                                </div>

                                <div className="mb-5 rounded-3xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-5 py-4">
                                    <div className="text-sm font-bold text-[var(--color-accent)]">
                                        Step {stepIndex + 1} of {STEP_META.length}: {activeStep.label}
                                    </div>
                                    <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                                        {stepIndex === 0 && 'I am collecting today’s tasks, habits, and schedule so you can see what needs attention.'}
                                        {stepIndex === 1 && `Choose what should become today's plan. ${selectedItems.length} item${selectedItems.length === 1 ? '' : 's'} selected.`}
                                        {stepIndex === 2 && `I found ${freeWindows.length} free window${freeWindows.length === 1 ? '' : 's'} and prepared ${planBlocks.length} new ritual block${planBlocks.length === 1 ? '' : 's'}.`}
                                        {stepIndex === 3 && 'Your launch path is ready. You can view the schedule or ask the agent to guide execution.'}
                                    </p>
                                </div>

                                {stepIndex === 0 && (
                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                                        <div className="rounded-3xl border border-[var(--color-error)]/30 bg-[var(--color-error-soft)] p-5">
                                            <div className="text-sm font-bold text-[var(--color-error)]">Overdue</div>
                                            <div className="mt-2 text-3xl font-bold text-[var(--color-ink)]">{overdueTasks.length}</div>
                                            <div className="mt-4 space-y-2">
                                                {overdueTasks.slice(0, 3).map((task) => (
                                                    <button key={task.id} type="button" {...buttonPressProps(() => onOpenTask?.(task))} className="block w-full truncate rounded-xl bg-[var(--color-card-raised)] px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper-2)]">
                                                        {task.title}
                                                    </button>
                                                ))}
                                                {overdueTasks.length === 0 && <p className="text-sm text-[var(--color-error)]/70">Nothing overdue.</p>}
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-5">
                                            <div className="text-sm font-bold text-[var(--color-warning)]">Due Today</div>
                                            <div className="mt-2 text-3xl font-bold text-[var(--color-ink)]">{dueTodayTasks.length}</div>
                                            <div className="mt-4 space-y-2">
                                                {dueTodayTasks.slice(0, 3).map((task) => (
                                                    <button key={task.id} type="button" {...buttonPressProps(() => onOpenTask?.(task))} className="block w-full truncate rounded-xl bg-[var(--color-card-raised)] px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper-2)]">
                                                        {task.title}
                                                    </button>
                                                ))}
                                                {dueTodayTasks.length === 0 && <p className="text-sm text-[var(--color-warning)]/70">No deadlines landing today.</p>}
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-5">
                                            <div className="text-sm font-bold text-[var(--color-success)]">Habits Left</div>
                                            <div className="mt-2 text-3xl font-bold text-[var(--color-ink)]">{pendingHabits.length}</div>
                                            <div className="mt-4 space-y-2">
                                                {pendingHabits.slice(0, 3).map((habit) => (
                                                    <button
                                                        key={habit.id}
                                                        type="button"
                                                        {...buttonPressProps(() => logHabit?.(habit.id, todayKey, habit.type === 'count' || habit.type === 'duration' ? (habit.target || 1) : 1, true))}
                                                        className="flex w-full items-center justify-between gap-2 rounded-xl bg-[var(--color-card-raised)] px-3 py-2 text-left text-sm font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-paper-2)]"
                                                    >
                                                        <span className="truncate">{habit.name}</span>
                                                        <Check size={14} className="text-[var(--color-success)]" />
                                                    </button>
                                                ))}
                                                {pendingHabits.length === 0 && <p className="text-sm text-[var(--color-success)]/70">All scheduled habits are done.</p>}
                                            </div>
                                        </div>

                                        <div className="rounded-3xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5 lg:col-span-3">
                                            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-[var(--color-ink)]">
                                                <Clock size={16} className="text-[var(--color-accent)]" />
                                                Today's shape
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                {todaySchedule.slice(0, 4).map((item) => (
                                                    <div key={`${item.id}_${item._occurrenceDate || todayKey}`} className="rounded-2xl bg-[var(--color-card-raised)] px-4 py-3">
                                                        <div className="text-sm font-semibold text-[var(--color-ink)]">{item.title}</div>
                                                        <div className="mt-1 text-xs text-[var(--color-muted)]">
                                                            {formatTime(item.displayTime || new Date(item.startTime || item.start_time))} for {formatMinutes(item.duration || 60)}
                                                        </div>
                                                    </div>
                                                ))}
                                                {todaySchedule.length === 0 && <div className="rounded-2xl bg-[var(--color-card-raised)] px-4 py-3 text-sm text-[var(--color-muted)]">Your schedule is open today.</div>}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stepIndex === 1 && (
                                    <div className="space-y-4">
                                        <div className="rounded-3xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-5 py-4 text-sm text-[var(--color-ink-2)]">
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
                                                <div className="rounded-3xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-6 text-sm text-[var(--color-muted)]">
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
                                                    <div key={window.start.toISOString()} className="rounded-2xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] px-4 py-3">
                                                        <div className="text-sm font-bold text-[var(--color-ink)]">{formatTime(window.start)} - {formatTime(window.end)}</div>
                                                        <div className="mt-1 text-xs font-semibold text-[var(--color-accent)]">{formatMinutes(window.minutes)} free</div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        <div className="rounded-3xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] p-5">
                                            <div className="mb-4 flex items-center justify-between gap-3">
                                                <div>
                                                    <h4 className="font-bold text-[var(--color-ink)]">Suggested focus blocks</h4>
                                                    <p className="mt-1 text-sm text-[var(--color-muted)]">These will be added to your schedule when you apply the plan.</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    {...buttonPressProps(handleApplyPlan)}
                                                    disabled={isApplying || (planBlocks.length === 0 && alreadyScheduledItems.length === 0) || applied}
                                                    className="rounded-2xl bg-[var(--color-accent)] px-4 py-2 text-sm font-bold text-[var(--color-accent-ink)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {isApplying ? 'Applying...' : applied ? 'Applied' : planBlocks.length === 0 && alreadyScheduledItems.length > 0 ? 'Continue' : 'Apply plan'}
                                                </button>
                                            </div>

                                            <div className="space-y-3">
                                                {alreadyScheduledItems.length > 0 && (
                                                    <div className="rounded-2xl border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] px-4 py-3 text-sm text-[var(--color-ink-2)]">
                                                        {alreadyScheduledItems.length} selected priorit{alreadyScheduledItems.length === 1 ? 'y is' : 'ies are'} already scheduled from today&apos;s ritual, so duplicate blocks will not be created.
                                                    </div>
                                                )}

                                                {planBlocks.map((block) => (
                                                    <div key={block.id} className="flex flex-col gap-2 rounded-2xl bg-[var(--color-card-raised)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="min-w-0">
                                                            <div className="truncate text-sm font-semibold text-[var(--color-ink)]">{block.title}</div>
                                                            <div className="mt-1 text-xs text-[var(--color-muted)]">{formatTime(block.start)} - {formatTime(block.end)} · {formatMinutes(block.duration)}</div>
                                                        </div>
                                                        {block.kind === 'task' && (
                                                            <button type="button" {...buttonPressProps(() => onOpenTask?.(block.task))} className="self-start rounded-xl bg-[var(--color-paper-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)] sm:self-auto">
                                                                Open task
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}
                                                {planBlocks.length === 0 && (
                                                    <div className="rounded-2xl bg-[var(--color-card-raised)] px-4 py-4 text-sm text-[var(--color-muted)]">
                                                        {alreadyScheduledItems.length > 0
                                                            ? 'Everything selected is already covered. You can continue to launch.'
                                                            : 'No focus blocks fit into the remaining free windows. Try selecting fewer priorities or use the agent to rework your schedule.'}
                                                    </div>
                                                )}
                                                {applyError && (
                                                    <div className="rounded-2xl border border-[var(--color-error)]/30 bg-[var(--color-error-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-error)]">
                                                        {applyError}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {stepIndex === 3 && (
                                    <div className="rounded-3xl border border-[var(--color-success)]/30 bg-[var(--color-success-soft)] p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-success)] text-white">
                                                <CheckCircle2 size={24} />
                                            </div>
                                            <div>
                                                <h4 className="text-xl font-bold text-[var(--color-ink)]">Your day has a launch path.</h4>
                                                <p className="mt-2 text-sm text-[var(--color-ink-2)]">
                                                    {applied
                                                        ? `${planBlocks.length} new ritual block${planBlocks.length === 1 ? '' : 's'} ${planBlocks.length === 1 ? 'was' : 'were'} added. ${alreadyScheduledItems.length > 0 ? `${alreadyScheduledItems.length} selected priorit${alreadyScheduledItems.length === 1 ? 'y was' : 'ies were'} already scheduled.` : ''}`
                                                        : 'Review your plan, then start with the first small move.'}
                                                </p>
                                                <div className="mt-5 flex flex-wrap gap-3">
                                                    <button type="button" {...buttonPressProps(() => { onNavigate?.('schedule'); handleFinish(); })} className="rounded-2xl bg-[var(--color-success)] px-4 py-2 text-sm font-bold text-white hover:opacity-90">
                                                        View schedule
                                                    </button>
                                                    <button type="button" {...buttonPressProps(() => { onAskAgent?.("Help me execute today's plan step by step"); handleFinish(); })} className="rounded-2xl bg-[var(--color-card-raised)] px-4 py-2 text-sm font-bold text-[var(--color-success)] hover:bg-[var(--color-paper-2)]">
                                                        Ask agent to guide me
                                                    </button>
                                                    <button type="button" {...buttonPressProps(handleFinish)} className="rounded-2xl border border-[var(--color-success)]/40 px-4 py-2 text-sm font-bold text-[var(--color-success)] hover:bg-[var(--color-card-raised)]">
                                                        Finish ritual
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </main>
                        </div>

                        <RitualNavigation
                            goBack={goBack}
                            goNext={goNext}
                            handleFinish={handleFinish}
                            stepCount={STEP_META.length}
                            stepIndex={stepIndex}
                        />
                    </Motion.div>
                </Motion.div>
            )}
        </AnimatePresence>
    );
};


export default DailyRitualModal;
