import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Flame, Leaf, Plus, Sprout, TrendingUp } from 'lucide-react';
import HabitCard from './HabitCard';
import HabitModal from './HabitModal';
import SeedGarden from './SeedGarden';
import { useHabit } from '../context/HabitContext';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const TIME_SECTIONS = [
    { key: 'morning', label: 'Morning Bed', tone: 'text-amber-700' },
    { key: 'afternoon', label: 'Afternoon Bed', tone: 'text-yellow-700' },
    { key: 'evening', label: 'Evening Bed', tone: 'text-orange-700' },
    { key: 'night', label: 'Night Bed', tone: 'text-indigo-700' },
    { key: 'anytime', label: 'Anytime Bed', tone: 'text-emerald-700' },
];

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning care';
    if (hour < 17) return 'Afternoon tending';
    if (hour < 21) return 'Evening tending';
    return 'Night tending';
};

const getMotivationalMessage = (completionRate, bestStreak) => {
    if (completionRate === 100) return 'Every habit is watered today.';
    if (bestStreak >= 7) return `A ${bestStreak}-day streak is feeding this garden.`;
    if (completionRate >= 50) return 'The garden is moving. Keep tending it.';
    if (completionRate > 0) return 'A few small actions already changed the soil.';
    return 'Start with the smallest seed you can keep alive.';
};

const TodayHabits = () => {
    const [showModal, setShowModal] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

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
        getCompletionStats,
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

    const overallCompletion = useMemo(() => {
        if (habits.length === 0) return 0;

        let totalCompleted = 0;
        let totalScheduled = 0;
        habits.forEach((habit) => {
            const stats = getCompletionStats(habit.id, 7);
            totalCompleted += stats.completed;
            totalScheduled += stats.total;
        });

        return totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
    }, [habits, getCompletionStats]);

    const seedEntries = useMemo(() => {
        return habits
            .filter((habit) => habit.is_seed)
            .map((habit) => ({ habit, insight: getSeedInsight(habit.id) }))
            .filter((entry) => entry.insight);
    }, [habits, habitLogs, getSeedInsight]);

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
        <div className="space-y-6">
            <section className="relative overflow-hidden rounded-[36px] border border-emerald-100 bg-gradient-to-br from-emerald-200 via-teal-50 to-amber-100 p-6 shadow-[0_28px_60px_rgba(16,185,129,0.12)]">
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-300/30 to-transparent" />
                <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/40 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                        <div className="max-w-2xl">
                            <div className="flex items-center gap-2 text-emerald-700">
                                <Leaf size={18} />
                                <span className="text-xs font-semibold uppercase tracking-[0.24em]">Habit Garden</span>
                            </div>
                            <h2 className="mt-2 font-serif text-4xl text-slate-800">{getGreeting()}</h2>
                            <p className="mt-2 text-sm text-slate-600">
                                {isToday
                                    ? getMotivationalMessage(completionRate, bestCurrentStreak)
                                    : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
                            <div className="rounded-2xl bg-white/75 p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Today</div>
                                <div className="mt-1 text-2xl font-semibold text-slate-800">{completedToday}/{totalToday}</div>
                            </div>
                            <div className="rounded-2xl bg-white/75 p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Best Streak</div>
                                <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-800">
                                    <Flame size={18} className="text-orange-500" />
                                    {bestCurrentStreak}
                                </div>
                            </div>
                            <div className="rounded-2xl bg-white/75 p-4 shadow-sm">
                                <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">7-Day Care</div>
                                <div className="mt-1 flex items-center gap-2 text-2xl font-semibold text-slate-800">
                                    <TrendingUp size={18} className="text-teal-600" />
                                    {overallCompletion}%
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                            <CalendarDays size={14} />
                            This Week
                        </div>
                        <div className="grid grid-cols-7 gap-2 rounded-[28px] border border-white/60 bg-white/45 p-3 backdrop-blur-sm">
                            {weekDates.map((date, index) => {
                                const isSelected = date.toDateString() === selectedDate.toDateString();
                                const isTodayDate = date.toDateString() === today.toDateString();
                                return (
                                    <motion.button
                                        key={date.toISOString()}
                                        whileTap={{ scale: 0.95 }}
                                        onClick={() => setSelectedDate(new Date(date))}
                                        className={`rounded-2xl px-2 py-3 text-center transition-all ${isSelected
                                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                            : isTodayDate
                                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                                : 'bg-white/70 text-slate-500 hover:bg-white'
                                            }`}
                                    >
                                        <div className="text-[11px] font-semibold uppercase tracking-wide">{DAY_LABELS[index]}</div>
                                        <div className="mt-1 text-lg font-semibold">{date.getDate()}</div>
                                    </motion.button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </section>

            <AnimatePresence>
                {allCompleted && isToday && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.96 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        className="rounded-[32px] border border-emerald-100 bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 p-5 text-white shadow-[0_20px_40px_rgba(20,184,166,0.22)]"
                    >
                        <div className="flex items-center gap-3">
                            <Sprout size={22} />
                            <div>
                                <div className="text-lg font-semibold">Every habit has been watered today.</div>
                                <div className="text-sm text-white/85">The garden is fully cared for.</div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {seedEntries.length > 0 && <SeedGarden seeds={seedEntries} />}

            <section className="rounded-[34px] border border-emerald-100 bg-white/80 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-6">
                {todayHabits.length === 0 ? (
                    <div className="rounded-[28px] border border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-amber-50 p-12 text-center">
                        <div className="text-5xl">🌱</div>
                        <h3 className="mt-4 text-2xl font-semibold text-slate-700">No habits planted yet</h3>
                        <p className="mt-2 text-slate-500">Create your first habit and start building the garden.</p>
                        <button
                            onClick={() => {
                                setEditingHabit(null);
                                setShowModal(true);
                            }}
                            className="mt-6 rounded-2xl bg-emerald-500 px-6 py-3 font-semibold text-white shadow-lg shadow-emerald-500/25 transition-colors hover:bg-emerald-600"
                        >
                            Plant First Habit
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {TIME_SECTIONS.map((section) => {
                            const sectionHabits = groupedHabits[section.key];
                            if (!sectionHabits?.length) return null;

                            const hasMultipleGroups = Object.keys(groupedHabits).length > 1;
                            return (
                                <div key={section.key}>
                                    {hasMultipleGroups && (
                                        <div className="mb-3 flex items-center gap-3">
                                            <div className={`text-xs font-semibold uppercase tracking-[0.24em] ${section.tone}`}>
                                                {section.label}
                                            </div>
                                            <div className="h-px flex-1 bg-gradient-to-r from-emerald-200 to-transparent" />
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        {sectionHabits.map((habit, index) => (
                                            <HabitCard
                                                key={habit.id}
                                                habit={habit}
                                                log={getHabitLog(habit.id, selectedDateStr)}
                                                onLog={handleLog}
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

            {todayHabits.length > 0 && (
                <motion.button
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        setEditingHabit(null);
                        setShowModal(true);
                    }}
                    className="fixed bottom-24 right-6 z-40 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_20px_35px_rgba(16,185,129,0.32)] transition-transform"
                >
                    <Plus size={26} />
                </motion.button>
            )}

            <HabitModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingHabit(null);
                }}
                onSave={handleSave}
                habit={editingHabit}
            />
        </div>
    );
};

export default TodayHabits;
