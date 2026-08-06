/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Bell, CalendarDays, CheckCircle2, Plus, Sprout, XCircle } from 'lucide-react';
import HabitCard from './HabitCard';
import HabitModal from './HabitModal';
import HabitNotesModal from './HabitNotesModal';
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
        <div className="habit-today">
            <section className="habit-overview">
                <div className="habit-overview__top">
                    <div className="habit-overview__copy">
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
                    <div className="habit-overview__stats">
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
                <div className="habit-week-strip">
                    <div className="habit-week-strip__label">
                        <CalendarDays size={13} strokeWidth={2.7} />
                        Week
                    </div>
                    <div className="habit-week-strip__days">
                        {weekDates.map((date, index) => {
                            const isSelected = date.toDateString() === selectedDate.toDateString();
                            const isTodayDate = date.toDateString() === today.toDateString();
                            return (
                                <Motion.button
                                    key={date.toISOString()}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => setSelectedDate(new Date(date))}
                                    className={`habit-day-button ${
                                        isSelected
                                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                                            : isTodayDate
                                                ? 'bg-[var(--color-success-soft)] text-[var(--color-success)]'
                                                : 'bg-[var(--color-paper-2)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]'
                                    }`}
                                >
                                    <div className="habit-day-button__weekday">{DAY_LABELS[index]}</div>
                                    <div className="habit-day-button__date">{date.getDate()}</div>
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
                        className="habit-review"
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
                                className="habit-review__link"
                            >
                                View yesterday
                            </button>
                        </div>
                        <div className="mt-3 space-y-2">
                            {yesterdayReviewHabits.slice(0, 4).map((habit) => (
                                <div key={habit.id} className="habit-review__item">
                                    <div className="habit-review__item-copy">
                                        <span className="habit-review__icon">{habit.icon}</span>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-[var(--color-ink)]">{habit.name}</div>
                                            <div className="text-xs text-[var(--color-muted)]">Yesterday was scheduled for this habit.</div>
                                        </div>
                                    </div>
                                    <div className="habit-review__actions">
                                        <button
                                            onClick={() => handleBackfillDone(habit)}
                                            className="habit-review__action habit-review__action--done"
                                        >
                                            <CheckCircle2 size={14} />
                                            I did it
                                        </button>
                                        <button
                                            onClick={() => dismissYesterdayReview(habit.id)}
                                            className="habit-review__action"
                                        >
                                            <XCircle size={14} />
                                            I missed it
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {yesterdayReviewHabits.length > 4 && (
                                <div className="habit-review__more">
                                    +{yesterdayReviewHabits.length - 4} more in yesterday&apos;s list.
                                </div>
                            )}
                        </div>
                    </Motion.section>
                )}
            </AnimatePresence>
            {!canEditSelectedDate && (
                <div className="habit-inline-status">
                    This day is read-only. You can only edit today and yesterday.
                </div>
            )}
            <AnimatePresence>
                {allCompleted && isToday && (
                    <Motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="habit-inline-status habit-inline-status--success"
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
                        className="habit-reflection"
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
                                        className="habit-reflection__tag"
                                    >
                                        {tag}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setPendingReflection(null)}
                                    className="habit-reflection__skip"
                                >
                                    skip
                                </button>
                            </div>
                        </div>
                    </Motion.section>
                )}
            </AnimatePresence>
            <section className="habit-list">
                {todayHabits.length === 0 ? (
                    <section className="habit-empty">
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
                    <div className="habit-list__groups">
                        {TIME_SECTIONS.map((section) => {
                            const sectionHabits = groupedHabits[section.key];
                            if (!sectionHabits?.length) return null;
                            return (
                                <div key={section.key} className="habit-group">
                                    <div className="habit-group__header">
                                        <div className="app-eyebrow">
                                            {section.label}
                                        </div>
                                        <div className="habit-group__rule" />
                                    </div>
                                    <div className="habit-group__items">
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
                            className="habit-add-button"
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
