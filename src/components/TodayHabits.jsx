import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, CalendarDays, CheckCircle2, Plus, Sprout, XCircle } from 'lucide-react';
import HabitCard from './HabitCard';
import HabitModal from './HabitModal';
import HabitNotesModal from './HabitNotesModal';
import SeedGarden from './SeedGarden';
import SeedProgressList from './SeedProgressList';
import { useHabit } from '../context/HabitContext';
import { toLocalDateKey } from '../utils/scheduleOccurrences';

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

const inkBorder = 'border-2 border-slate-800 dark:border-bone-200/70';
const popShadow = 'shadow-[4px_4px_0_#1E293B] dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]';
const softPopShadow = 'shadow-[6px_6px_0_#E2E8F0] dark:shadow-[6px_6px_0_rgba(255,255,255,0.10)]';
const popMotion = 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]';

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
        if (confirm('Are you sure you want to delete this habit?')) {
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
            <section className={`relative overflow-hidden rounded-[28px] bg-white p-4 ${inkBorder} ${softPopShadow} dark:bg-void-900/90 sm:p-5`}>
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-emerald-200/80" />
                <div className="pointer-events-none absolute bottom-4 right-16 hidden h-8 w-8 rotate-45 bg-amber-300/80 sm:block" />
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="relative z-10 max-w-xl">
                        <div className="text-[11px] font-black uppercase tracking-[0.22em] text-violet-700 dark:text-violet-300">
                            {isToday ? 'Today' : 'Selected day'}
                        </div>
                        <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-bone-100">
                            {isToday
                                ? 'Daily habits'
                                : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </h2>
                        <p className="mt-1 text-sm font-medium leading-6 text-slate-600 dark:text-bone-200/70">
                            {isToday
                                ? getMotivationalMessage(completionRate, bestCurrentStreak)
                                : isYesterday
                                    ? 'Yesterday is still open if you forgot to log something.'
                                    : 'Review only. Older days are locked to keep the history honest.'}
                        </p>
                    </div>

                    <div className={`relative z-10 rotate-1 rounded-[22px] bg-emerald-100 px-4 py-3 text-sm font-black text-emerald-950 ${inkBorder}`}>
                        <span className="text-slate-950">{completedToday}/{totalToday}</span> done
                        {bestCurrentStreak > 0 && (
                            <span className="ml-3">
                                streak <span className="text-slate-950">{bestCurrentStreak}</span>
                            </span>
                        )}
                    </div>
                </div>

                <div className="relative z-10 mt-4">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-bone-200/60">
                        <CalendarDays size={13} strokeWidth={2.7} />
                        Week
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                        {weekDates.map((date, index) => {
                            const isSelected = date.toDateString() === selectedDate.toDateString();
                            const isTodayDate = date.toDateString() === today.toDateString();

                            return (
                                <motion.button
                                    key={date.toISOString()}
                                    whileTap={{ scale: 0.96 }}
                                    onClick={() => setSelectedDate(new Date(date))}
                                    className={`min-h-16 rounded-[18px] border-2 border-slate-800 px-2 py-2.5 text-center text-sm font-black ${popMotion} dark:border-bone-200/70 ${
                                        isSelected
                                            ? 'bg-violet-500 text-white shadow-[3px_3px_0_#1E293B]'
                                            : isTodayDate
                                                ? 'bg-emerald-100 text-emerald-950'
                                                : 'bg-slate-50 text-slate-600 hover:-translate-y-0.5 hover:bg-amber-100'
                                    }`}
                                >
                                    <div className="text-[10px] font-semibold uppercase tracking-wide">{DAY_LABELS[index]}</div>
                                    <div className="mt-1 text-base font-black">{date.getDate()}</div>
                                </motion.button>
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
                    <motion.section
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`rounded-[24px] bg-amber-100 p-4 text-amber-950 ${inkBorder} ${softPopShadow}`}
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <div className="flex items-center gap-2 text-sm font-black">
                                    <Bell size={16} strokeWidth={2.7} />
                                    Did you miss these yesterday, or just forget to log?
                                </div>
                                <p className="mt-1 text-sm text-amber-800">
                                    You can still backfill yesterday. After today, these entries become read-only.
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedDate(new Date(yesterday))}
                                className="self-start rounded-full border-2 border-slate-800 bg-white px-3 py-1.5 text-xs font-black text-slate-900 transition-colors hover:bg-amber-200"
                            >
                                View yesterday
                            </button>
                        </div>

                        <div className="mt-3 space-y-2">
                            {yesterdayReviewHabits.slice(0, 4).map((habit) => (
                                <div key={habit.id} className="flex flex-col gap-2 rounded-[20px] border-2 border-slate-800 bg-white px-3 py-3 sm:flex-row sm:items-center">
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-slate-800 bg-amber-200 text-lg">{habit.icon}</span>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-slate-900">{habit.name}</div>
                                            <div className="text-xs text-amber-700">Yesterday was scheduled for this habit.</div>
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 gap-2">
                                        <button
                                            onClick={() => handleBackfillDone(habit)}
                                            className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-800 bg-emerald-300 px-3 py-1.5 text-xs font-black text-slate-950 transition-colors hover:bg-emerald-400"
                                        >
                                            <CheckCircle2 size={14} />
                                            I did it
                                        </button>
                                        <button
                                            onClick={() => dismissYesterdayReview(habit.id)}
                                            className="inline-flex items-center gap-1.5 rounded-full border-2 border-slate-800 bg-white px-3 py-1.5 text-xs font-black text-slate-700 transition-colors hover:bg-rose-100"
                                        >
                                            <XCircle size={14} />
                                            I missed it
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {yesterdayReviewHabits.length > 4 && (
                                <div className="text-xs font-medium text-amber-700">
                                    +{yesterdayReviewHabits.length - 4} more in yesterday&apos;s list.
                                </div>
                            )}
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {!canEditSelectedDate && (
                <div className={`rounded-[18px] bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-500 ${inkBorder}`}>
                    This day is read-only. You can only edit today and yesterday.
                </div>
            )}

            <AnimatePresence>
                {allCompleted && isToday && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`rounded-[18px] bg-emerald-100 px-4 py-2.5 text-sm font-black text-emerald-950 ${inkBorder}`}
                    >
                        <div className="flex items-center gap-2">
                            <Sprout size={15} strokeWidth={2.7} />
                            Everything scheduled for today is complete.
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {pendingReflection && (
                    <motion.section
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className={`rounded-[22px] bg-white px-4 py-3 ${inkBorder} ${softPopShadow} dark:bg-void-900/90`}
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <div className="text-sm font-black text-slate-950 dark:text-bone-100">How did {pendingReflection.habitName} feel?</div>
                                <div className="mt-0.5 text-xs text-slate-500">One tap saves a small reflection to today&apos;s habit note.</div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {(pendingReflection.completed ? REFLECTION_TAGS.completed : REFLECTION_TAGS.missed).map((tag) => (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => handleReflection(tag)}
                                        className="rounded-full border-2 border-slate-800 bg-amber-100 px-3 py-1.5 text-xs font-black text-slate-800 transition-colors hover:bg-amber-200"
                                    >
                                        {tag}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setPendingReflection(null)}
                                    className="rounded-full border-2 border-slate-800 bg-white px-3 py-1.5 text-xs font-black text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
                                >
                                    skip
                                </button>
                            </div>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            {seedEntries.length > 0 && <SeedGarden seeds={seedEntries} />}

            <section className={`rounded-[28px] bg-white p-4 ${inkBorder} ${softPopShadow} dark:bg-void-900/90 sm:p-5`}>
                {todayHabits.length === 0 ? (
                    <div className="rounded-[24px] border-2 border-dashed border-slate-800 bg-slate-50 px-5 py-12 text-center dark:border-bone-200/70 dark:bg-void-800">
                        <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-2 border-slate-800 bg-emerald-300 text-3xl">🌱</div>
                        <h3 className="mt-3 text-lg font-black text-slate-900 dark:text-bone-100">No habits yet</h3>
                        <p className="mt-1 text-sm text-slate-500">Create your first habit to start tracking.</p>
                        <button
                            onClick={() => {
                                setEditingHabit(null);
                                setShowModal(true);
                            }}
                            className="mt-5 rounded-full border-2 border-slate-800 bg-violet-500 px-4 py-2.5 text-sm font-black text-white shadow-[4px_4px_0_#1E293B] transition hover:-translate-y-0.5"
                        >
                            Add habit
                        </button>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {TIME_SECTIONS.map((section) => {
                            const sectionHabits = groupedHabits[section.key];
                            if (!sectionHabits?.length) return null;

                            return (
                                <div key={section.key}>
                                    <div className="mb-3 flex items-center gap-3">
                                        <div className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-bone-200/60">
                                            {section.label}
                                        </div>
                                        <div className="h-0.5 flex-1 bg-[repeating-linear-gradient(90deg,#1E293B_0_8px,transparent_8px_14px)] opacity-30" />
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
                    </div>
                )}
            </section>

            <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                    setEditingHabit(null);
                    setShowModal(true);
                }}
                className="fixed bottom-24 right-6 z-40 flex h-12 items-center gap-2 rounded-full border-2 border-slate-800 bg-violet-500 px-4 text-sm font-black text-white shadow-[4px_4px_0_#1E293B] transition-transform"
            >
                <Plus size={16} strokeWidth={2.7} />
                Add Habit
            </motion.button>

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
