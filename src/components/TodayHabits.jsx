/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Bell, CalendarDays, CheckCircle2, Plus, Sprout, XCircle } from 'lucide-react';
import HabitCard from './HabitCard';
import HabitModal from './HabitModal';
import HabitNotesModal from './HabitNotesModal';
import SeedGarden from './SeedGarden';
import SeedProgressList from './SeedProgressList';
import { useHabit } from '../context/HabitContext';
import { toLocalDateKey } from '../utils/scheduleOccurrences';
import { confirmAction } from '../utils/confirm';
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const TIME_SECTIONS = [
    { key: 'morning', label: 'Morning' },
    { key: 'afternoon', label: 'Afternoon' },
    { key: 'evening', label: 'Evening' },
    { key: 'night', label: 'Night' },
    { key: 'anytime', label: 'Anytime' },
];
const getMotivationalMessage = (completionRate, bestStreak) => {
    if (completionRate === 100) return 'Everything scheduled today is done.';
    if (bestStreak >= 7) return `You already have a ${bestStreak}-day streak going.`;
    if (completionRate >= 50) return 'Solid progress for today.';
    if (completionRate > 0) return 'A small win is already on the board.';
    return 'Start with one easy habit.';
};
const REFLECTION_TAGS = {
    completed: ['easy', 'proud', 'focused', 'tired'],
    missed: ['forgot', 'busy', 'low energy', 'too hard'],
};
const TodayHabits = () => {
    const [showModal, setShowModal] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [historyHabit, setHistoryHabit] = useState(null);
    const [pendingReflection, setPendingReflection] = useState(null);
    const {
        habits,
        addHabit,
        updateHabit,
        deleteHabit,
        logHabit,
        getHabitLog,
        canLogHabitDate,
        getHabitsForDate,
        getHabitStreak,
        getHabitNoteHistory,
        getSeedInsight,
    } = useHabit();
    const selectedDateStr = toLocalDateKey(selectedDate);
    const today = new Date();
    const todayStr = toLocalDateKey(today);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = toLocalDateKey(yesterday);
    const isToday = selectedDateStr === todayStr;
    const isYesterday = selectedDateStr === yesterdayStr;
    const canEditSelectedDate = canLogHabitDate(selectedDateStr);
    const lockedReason = 'Only today and yesterday can be edited.';
    const todayHabits = getHabitsForDate(selectedDate);
    const [dismissedBackfillIds, setDismissedBackfillIds] = useState([]);
    const reviewStorageKey = `habit-yesterday-review-dismissed-${todayStr}`;
    useEffect(() => {
        try {
            setDismissedBackfillIds(JSON.parse(localStorage.getItem(reviewStorageKey) || '[]'));
        } catch {
            setDismissedBackfillIds([]);
        }
    }, [reviewStorageKey]);
    const weekDates = useMemo(() => {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }, []);
    const completedToday = todayHabits.filter((habit) => getHabitLog(habit.id, selectedDateStr)?.completed).length;
    const totalToday = todayHabits.length;
    const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
    const allCompleted = totalToday > 0 && completedToday === totalToday;
    const bestCurrentStreak = habits.reduce((max, habit) => Math.max(max, getHabitStreak(habit.id).current), 0);
    const seedEntries = useMemo(() => (
        habits
            .filter((habit) => habit.is_seed)
            .map((habit) => ({ habit, insight: getSeedInsight(habit.id) }))
            .filter((entry) => entry.insight)
    ), [habits, getSeedInsight]);
    const seedInsightByHabitId = useMemo(() => {
        const map = {};
        seedEntries.forEach(({ habit, insight }) => {
            map[habit.id] = insight;
        });
        return map;
    }, [seedEntries]);
    const yesterdayReviewHabits = useMemo(() => (
        getHabitsForDate(yesterday)
            .filter((habit) => !habit.created_at || toLocalDateKey(new Date(habit.created_at)) <= yesterdayStr)
            .filter((habit) => !getHabitLog(habit.id, yesterdayStr)?.completed)
            .filter((habit) => !dismissedBackfillIds.includes(habit.id))
    ), [dismissedBackfillIds, getHabitLog, getHabitsForDate, yesterday, yesterdayStr]);
    const groupedHabits = useMemo(() => {
        const groups = {};
        todayHabits.forEach((habit) => {
            const key = habit.time_of_day || 'anytime';
            if (!groups[key]) groups[key] = [];
            groups[key].push(habit);
        });
        return groups;
    }, [todayHabits]);
    const dismissYesterdayReview = (habitId) => {
        setDismissedBackfillIds((prev) => {
            const next = Array.from(new Set([...prev, habitId]));
            localStorage.setItem(reviewStorageKey, JSON.stringify(next));
            return next;
        });
    };
    const getCompletionValue = (habit) => (
        habit.type === 'count' || habit.type === 'duration'
            ? (habit.target || 1)
            : 1
    );
    const handleBackfillDone = async (habit) => {
        await logHabit(habit.id, yesterdayStr, getCompletionValue(habit), true);
        dismissYesterdayReview(habit.id);
    };
    const handleLog = async (habitId, value, completed) => {
        if (!canEditSelectedDate) return;
        const savedLog = await logHabit(habitId, selectedDateStr, value, completed);
        const habit = habits.find((item) => item.id === habitId);
        if (habit && (completed || Number(value || 0) <= 0)) {
            setPendingReflection({
                habitId,
                habitName: habit.name,
                date: selectedDateStr,
                completed,
                value,
                notes: savedLog?.notes || '',
            });
        }
    };
    const handleSaveNote = (habitId, notes) => {
        if (!canEditSelectedDate) return;
        const existingLog = getHabitLog(habitId, selectedDateStr);
        logHabit(
            habitId,
            selectedDateStr,
            existingLog?.value || 0,
            existingLog?.completed || false,
            { notes }
        );
    };
    const handleSave = (habitData) => {
        if (habitData.id) updateHabit(habitData.id, habitData);
        else addHabit(habitData);
        setShowModal(false);
        setEditingHabit(null);
    };
    const handleDelete = (habitId) => {
        if (confirmAction('Are you sure you want to delete this habit?')) {
            deleteHabit(habitId);
        }
    };
    const handleReflection = async (tag) => {
        if (!pendingReflection) return;
        const existingLog = getHabitLog(pendingReflection.habitId, pendingReflection.date);
        const currentNotes = existingLog?.notes || pendingReflection.notes || '';
        const reflectionLine = `Reflection: ${tag}`;
        const nextNotes = currentNotes ? `${currentNotes}\n${reflectionLine}` : reflectionLine;
        await logHabit(
            pendingReflection.habitId,
            pendingReflection.date,
            existingLog?.value ?? pendingReflection.value,
            existingLog?.completed ?? pendingReflection.completed,
            { notes: nextNotes }
        );
        setPendingReflection(null);
    };
    return (
        <div className="space-y-4">
            <section className={`relative overflow-hidden rounded-[28px] bg-[var(--color-card)] p-4 sm:p-5`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="relative z-10 max-w-xl">
                        <div className="app-eyebrow">
                            {isToday ? 'Today' : 'Selected day'}
                        </div>
                        <h2 className="app-section-title mt-1">
                            {isToday
                                ? 'Daily habits'
                                : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </h2>
                        <p className="mt-1 text-sm font-medium leading-6 text-[var(--color-muted)]">
                            {isToday
                                ? getMotivationalMessage(completionRate, bestCurrentStreak)
                                : isYesterday
                                    ? 'Yesterday is still open if you forgot to log something.'
                                    : 'Review only. Older days are locked to keep the history honest.'}
                        </p>
                    </div>
                    <div className="ui-card relative z-10 min-w-44 px-4 py-3 text-sm font-semibold">
                        <span className="text-[var(--color-ink)]">{completedToday}/{totalToday}</span> done
                        {bestCurrentStreak > 0 && (
                            <span className="ml-3">
                                streak <span className="text-[var(--color-ink)]">{bestCurrentStreak}</span>
                            </span>
                        )}
                        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--color-rule)]">
                            <div className="h-full bg-[var(--color-accent)]" style={{ width: `${completionRate}%` }} />
                        </div>
                    </div>
                </div>
                <div className="relative z-10 mt-4">
                    <div className="app-eyebrow mb-2 flex items-center gap-2">
                        <CalendarDays size={13} strokeWidth={2.7} />
                        Week
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {weekDates.map((date, index) => {
                            const isSelected = date.toDateString() === selectedDate.toDateString();
                            const isTodayDate = date.toDateString() === today.toDateString();
                            return (
                                <Motion.button
                                    key={date.toISOString()}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => setSelectedDate(new Date(date))}
                                    className={`min-h-16 rounded-xl border border-[var(--color-rule)] px-2 py-2.5 text-center text-sm font-semibold ${
                                        isSelected
                                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                                            : isTodayDate
                                                ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                                                : 'bg-[var(--color-paper-2)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]'
                                    }`}
                                >
                                    <div className="text-xs font-medium">{DAY_LABELS[index]}</div>
                                    <div className="mt-1 text-base font-semibold">{date.getDate()}</div>
                                </Motion.button>
                            );
                        })}
                    </div>
                </div>
            </section>
            {seedEntries.length > 0 && (
                <SeedProgressList
                    seeds={seedEntries}
                    selectedDateStr={selectedDateStr}
                    canCheckSelectedDate={canEditSelectedDate}
                    onQuickCheck={(habit) => handleLog(habit.id, getCompletionValue(habit), true)}
                    onQuickMiss={(habit) => handleLog(habit.id, 0, false)}
                />
            )}
            <AnimatePresence>
                {yesterdayReviewHabits.length > 0 && (
                    <Motion.section
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`rounded-[24px] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] p-4 text-[var(--color-ink)] `}
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-sm font-semibold">
                                    <Bell size={16} strokeWidth={2.7} />
                                    Did you miss these yesterday, or just forget to log?
                                </div>
                                <p className="mt-1 text-sm text-[var(--color-ink-2)]">
                                    You can still backfill yesterday. After today, these entries become read-only.
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDate(new Date(yesterday))}
                                className="self-start rounded-lg border border-[var(--color-rule)] bg-[var(--color-card-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] transition-colors hover:bg-[var(--color-paper-2)]"
                            >
                                View yesterday
                            </button>
                        </div>
                        <div className="mt-3 space-y-2">
                            {yesterdayReviewHabits.slice(0, 4).map((habit) => (
                                <div key={habit.id} className="flex flex-col gap-2 rounded-[20px] border border-[var(--color-rule)] bg-[var(--color-card-raised)] px-3 py-3 sm:flex-row sm:items-center">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--color-rule)] bg-[var(--color-warning-soft)] text-lg">{habit.icon}</span>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-[var(--color-ink)]">{habit.name}</div>
                                            <div className="text-xs text-[var(--color-muted)]">Yesterday was scheduled for this habit.</div>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            onClick={() => handleBackfillDone(habit)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-success)]/40 bg-[var(--color-success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--color-success)] transition-colors hover:opacity-80"
                                        >
                                            <CheckCircle2 size={14} />
                                            I did it
                                        </button>
                                        <button
                                            onClick={() => dismissYesterdayReview(habit.id)}
                                            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-rule)] bg-[var(--color-card-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-error-soft)]"
                                        >
                                            <XCircle size={14} />
                                            I missed it
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {yesterdayReviewHabits.length > 4 && (
                                <div className="text-xs font-medium text-[var(--color-muted)]">
                                    +{yesterdayReviewHabits.length - 4} more in yesterday&apos;s list.
                                </div>
                            )}
                        </div>
                    </Motion.section>
                )}
            </AnimatePresence>
            {!canEditSelectedDate && (
                <div className={`rounded-[18px] bg-[var(--color-paper-2)] px-4 py-2.5 text-sm font-semibold text-[var(--color-muted)] `}>
                    This day is read-only. You can only edit today and yesterday.
                </div>
            )}
            <AnimatePresence>
                {allCompleted && isToday && (
                    <Motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`rounded-xl bg-[var(--color-success-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--color-success)] `}
                    >
                        <div className="flex items-center gap-2">
                            <Sprout size={15} strokeWidth={2.7} />
                            Everything scheduled for today is complete.
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>
            <AnimatePresence>
                {pendingReflection && (
                    <Motion.section
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`rounded-[22px] bg-[var(--color-card)] px-4 py-3`}
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-sm font-semibold text-[var(--color-ink)]">How did {pendingReflection.habitName} feel?</div>
                                <div className="mt-0.5 text-xs text-[var(--color-muted)]">One tap saves a small reflection to today&apos;s habit note.</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(pendingReflection.completed ? REFLECTION_TAGS.completed : REFLECTION_TAGS.missed).map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => handleReflection(tag)}
                                        className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-paper-3)]"
                                    >
                                        {tag}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setPendingReflection(null)}
                                    className="rounded-lg border border-[var(--color-rule)] bg-[var(--color-card-raised)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:bg-[var(--color-paper-2)] hover:text-[var(--color-ink)]"
                                >
                                    skip
                                </button>
                            </div>
                        </div>
                    </Motion.section>
                )}
            </AnimatePresence>
            {seedEntries.length > 0 && <SeedGarden seeds={seedEntries} />}
            <section className={`rounded-[28px] bg-[var(--color-card)] p-4 sm:p-5`}>
                {todayHabits.length === 0 ? (
                    <section className="ui-card px-5 py-12 text-center">
                        <h3 className="app-section-title">No habits yet.</h3>
                        <button
                            onClick={() => {
                                setEditingHabit(null);
                                setShowModal(true);
                            }}
                            className="mt-5 rounded-xl bg-[var(--color-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] transition hover:bg-[var(--color-accent-hover)]"
                        >
                            Add Habit
                        </button>
                    </section>
                ) : (
                    <div className="space-y-5">
                        {TIME_SECTIONS.map((section) => {
                            const sectionHabits = groupedHabits[section.key];
                            if (!sectionHabits?.length) return null;
                            return (
                                <div key={section.key}>
                                    <div className="mb-3 flex items-center gap-3">
                                        <div className="app-eyebrow">
                                            {section.label}
                                        </div>
                                        <div className="h-px flex-1 bg-[var(--color-rule)]" />
                                    </div>
                                    <div className="space-y-3">
                                        {sectionHabits.map((habit, index) => {
                                            const seedInsight = seedInsightByHabitId[habit.id] || null;
                                            const seedEnded = Boolean(seedInsight?.ended);
                                            return (
                                                <HabitCard
                                                    key={habit.id}
                                                    habit={habit}
                                                    log={getHabitLog(habit.id, selectedDateStr)}
                                                    onLog={handleLog}
                                                    onSaveNote={handleSaveNote}
                                                    noteCount={getHabitNoteHistory(habit.id).length}
                                                    onViewNotes={() => setHistoryHabit(habit)}
                                                    onEdit={(selectedHabit) => {
                                                        setEditingHabit(selectedHabit);
                                                        setShowModal(true);
                                                    }}
                                                    onDelete={handleDelete}
                                                    streak={getHabitStreak(habit.id)}
                                                    seedInsight={seedInsight}
                                                    index={index}
                                                    disabled={!canEditSelectedDate || seedEnded}
                                                    disabledReason={seedEnded ? 'This seed ended after 4 missed days. Replant a new seed to restart.' : lockedReason}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        <button
                            onClick={() => {
                                setEditingHabit(null);
                                setShowModal(true);
                            }}
                            className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-rule)] px-4 py-2.5 text-sm font-semibold text-[var(--color-accent)] transition-colors hover:bg-[var(--color-paper-2)]"
                        >
                            <Plus size={16} strokeWidth={2.7} />
                            Add Habit
                        </button>
                    </div>
                )}
            </section>
            <HabitModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingHabit(null);
                }}
                onSave={handleSave}
                habit={editingHabit}
            />
            <HabitNotesModal
                isOpen={Boolean(historyHabit)}
                onClose={() => setHistoryHabit(null)}
                habit={historyHabit}
                entries={historyHabit ? getHabitNoteHistory(historyHabit.id) : []}
            />
        </div>
    );
};
export default TodayHabits;
