import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, Plus, Sprout } from 'lucide-react';
import HabitCard from './HabitCard';
import HabitModal from './HabitModal';
import HabitNotesModal from './HabitNotesModal';
import SeedGarden from './SeedGarden';
import { useHabit } from '../context/HabitContext';

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

const TodayHabits = () => {
    const [showModal, setShowModal] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [historyHabit, setHistoryHabit] = useState(null);

    const {
        habits,
        habitLogs,
        addHabit,
        updateHabit,
        deleteHabit,
        logHabit,
        getHabitLog,
        getHabitsForDate,
        getHabitStreak,
        getHabitNoteHistory,
        getSeedInsight,
    } = useHabit();

    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();
    const todayHabits = getHabitsForDate(selectedDate);

    const weekDates = useMemo(() => {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay());
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date;
        });
    }, [today.toDateString()]);

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
    ), [habits, habitLogs, getSeedInsight]);

    const seedInsightByHabitId = useMemo(() => {
        const map = {};
        seedEntries.forEach(({ habit, insight }) => {
            map[habit.id] = insight;
        });
        return map;
    }, [seedEntries]);

    const groupedHabits = useMemo(() => {
        const groups = {};
        todayHabits.forEach((habit) => {
            const key = habit.time_of_day || 'anytime';
            if (!groups[key]) groups[key] = [];
            groups[key].push(habit);
        });
        return groups;
    }, [todayHabits]);

    const handleLog = (habitId, value, completed) => {
        logHabit(habitId, selectedDateStr, value, completed);
    };

    const handleSaveNote = (habitId, notes) => {
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

    return (
        <div className="space-y-4">
            <section className="rounded-[24px] border border-slate-200/80 bg-white/88 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-xl">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                            {isToday ? 'Today' : 'Selected day'}
                        </div>
                        <h2 className="mt-1 text-xl font-semibold text-slate-900">
                            {isToday
                                ? 'Daily habits'
                                : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                            {isToday ? getMotivationalMessage(completionRate, bestCurrentStreak) : 'Review or log habits for this date.'}
                        </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        <span className="font-semibold text-slate-900">{completedToday}/{totalToday}</span> done
                        {bestCurrentStreak > 0 && (
                            <span className="ml-3">
                                streak <span className="font-semibold text-slate-900">{bestCurrentStreak}</span>
                            </span>
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                        <CalendarDays size={13} />
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
                                    className={`rounded-2xl border px-2 py-2.5 text-center transition-colors ${
                                        isSelected
                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                            : isTodayDate
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    <div className="text-[10px] font-semibold uppercase tracking-wide">{DAY_LABELS[index]}</div>
                                    <div className="mt-1 text-base font-semibold">{date.getDate()}</div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>
            </section>

            <AnimatePresence>
                {allCompleted && isToday && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"
                    >
                        <div className="flex items-center gap-2">
                            <Sprout size={15} />
                            Everything scheduled for today is complete.
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {seedEntries.length > 0 && <SeedGarden seeds={seedEntries} />}

            <section className="rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-5">
                {todayHabits.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center">
                        <div className="text-4xl">🌱</div>
                        <h3 className="mt-3 text-lg font-semibold text-slate-800">No habits yet</h3>
                        <p className="mt-1 text-sm text-slate-500">Create your first habit to start tracking.</p>
                        <button
                            onClick={() => {
                                setEditingHabit(null);
                                setShowModal(true);
                            }}
                            className="mt-5 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
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
                                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                            {section.label}
                                        </div>
                                        <div className="h-px flex-1 bg-slate-200" />
                                    </div>
                                    <div className="space-y-3">
                                        {sectionHabits.map((habit, index) => (
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
                                                seedInsight={seedInsightByHabitId[habit.id] || null}
                                                index={index}
                                            />
                                        ))}
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
                className="fixed bottom-24 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-medium text-white shadow-[0_14px_28px_rgba(15,23,42,0.2)] transition-transform"
            >
                <Plus size={16} />
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
