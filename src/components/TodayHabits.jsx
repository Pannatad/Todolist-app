import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, TrendingUp, Flame, Sunrise, Sun, Sunset, Moon, Clock, Sparkles } from 'lucide-react';
import HabitCard from './HabitCard';
import HabitModal from './HabitModal';
import { useHabit } from '../context/HabitContext';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const TIME_SECTIONS = [
    { key: 'morning', label: 'Morning', icon: Sunrise, color: 'text-amber-500' },
    { key: 'afternoon', label: 'Afternoon', icon: Sun, color: 'text-yellow-500' },
    { key: 'evening', label: 'Evening', icon: Sunset, color: 'text-orange-500' },
    { key: 'night', label: 'Night', icon: Moon, color: 'text-indigo-500' },
    { key: 'anytime', label: 'Anytime', icon: Clock, color: 'text-gray-400' },
];

const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning! ☀️';
    if (hour < 17) return 'Good afternoon! 🌤️';
    if (hour < 21) return 'Good evening! 🌅';
    return 'Good night! 🌙';
};

const getMotivationalMessage = (completionRate, bestStreak) => {
    if (completionRate === 100) return "🎉 Perfect day! You're unstoppable!";
    if (bestStreak >= 7) return `🔥 ${bestStreak}-day streak! Keep it going!`;
    if (completionRate >= 50) return "💪 You're on track! Keep pushing!";
    if (completionRate > 0) return "🌱 Great start! Keep building momentum!";
    return "✨ Start strong today!";
};

const TodayHabits = () => {
    const [showModal, setShowModal] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const {
        habits,
        addHabit,
        updateHabit,
        deleteHabit,
        logHabit,
        getHabitLog,
        getHabitsForDate,
        getHabitStreak,
        getCompletionStats
    } = useHabit();

    const selectedDateStr = selectedDate.toISOString().split('T')[0];
    const todayHabits = getHabitsForDate(selectedDate);
    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();

    // Calculate this week's dates for the day selector
    const weekDates = useMemo(() => {
        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay()); // Sunday
        return Array.from({ length: 7 }, (_, i) => {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            return d;
        });
    }, [today.toDateString()]);

    // Stats
    const completedToday = todayHabits.filter(h => {
        const log = getHabitLog(h.id, selectedDateStr);
        return log?.completed;
    }).length;

    const totalToday = todayHabits.length;
    const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;
    const allCompleted = totalToday > 0 && completedToday === totalToday;

    const bestCurrentStreak = habits.reduce((max, h) => {
        const streak = getHabitStreak(h.id);
        return Math.max(max, streak.current);
    }, 0);

    // Overall completion across all habits (last 7 days)
    const overallCompletion = useMemo(() => {
        if (habits.length === 0) return 0;
        let totalCompleted = 0;
        let totalScheduled = 0;
        habits.forEach(h => {
            const stats = getCompletionStats(h.id, 7);
            totalCompleted += stats.completed;
            totalScheduled += stats.total;
        });
        return totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;
    }, [habits, getCompletionStats]);

    // Group habits by time of day
    const groupedHabits = useMemo(() => {
        const groups = {};
        todayHabits.forEach(h => {
            const key = h.time_of_day || 'anytime';
            if (!groups[key]) groups[key] = [];
            groups[key].push(h);
        });
        return groups;
    }, [todayHabits]);

    const handleLog = (habitId, value, completed) => {
        logHabit(habitId, selectedDateStr, value, completed);
    };

    const handleSave = (habitData) => {
        if (habitData.id) {
            updateHabit(habitData.id, habitData);
        } else {
            addHabit(habitData);
        }
        setShowModal(false);
        setEditingHabit(null);
    };

    const handleEdit = (habit) => {
        setEditingHabit(habit);
        setShowModal(true);
    };

    const handleDelete = (habitId) => {
        if (confirm('Are you sure you want to delete this habit?')) {
            deleteHabit(habitId);
        }
    };

    return (
        <div className="space-y-5">
            {/* Date & Greeting Header */}
            <div>
                <p className="text-sm text-gray-500 font-medium">
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </p>
                <h2 className="text-2xl font-bold text-gray-800 mt-0.5">
                    {isToday ? getGreeting() : selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h2>
            </div>

            {/* Weekly Day Selector */}
            <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">This Week</p>
                <div className="flex gap-2">
                    {weekDates.map((date, idx) => {
                        const isSelected = date.toDateString() === selectedDate.toDateString();
                        const isTodayDate = date.toDateString() === today.toDateString();
                        const dayNum = date.getDate();

                        return (
                            <motion.button
                                key={idx}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setSelectedDate(new Date(date))}
                                className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${isSelected
                                    ? 'bg-teal-500 text-white shadow-md shadow-teal-500/30'
                                    : isTodayDate
                                        ? 'bg-teal-50 text-teal-600 border border-teal-200'
                                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                                    }`}
                            >
                                <span className={`text-xs font-bold ${isSelected ? 'text-white/80' : ''}`}>
                                    {DAY_LABELS[idx]}
                                </span>
                                <span className={`text-sm font-bold mt-0.5 ${isSelected ? 'text-white' : ''}`}>
                                    {dayNum}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
            </div>

            {/* Motivational Message */}
            {isToday && totalToday > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <p className="text-sm text-gray-500 italic">
                        {getMotivationalMessage(completionRate, bestCurrentStreak)}
                    </p>
                </motion.div>
            )}

            {/* All Done Celebration */}
            <AnimatePresence>
                {allCompleted && isToday && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="bg-gradient-to-r from-teal-400 via-emerald-400 to-green-400 rounded-2xl p-5 text-center text-white shadow-lg shadow-teal-500/20"
                    >
                        <div className="text-3xl mb-2">🎉</div>
                        <h3 className="text-lg font-bold">All Done for Today!</h3>
                        <p className="text-white/80 text-sm mt-1">You've completed all {totalToday} habits. Amazing work!</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Habits List — Grouped by Time */}
            <div className="space-y-4">
                {todayHabits.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12"
                    >
                        <div className="text-6xl mb-4">🌱</div>
                        <h3 className="text-xl font-bold text-gray-600 mb-2">No habits yet</h3>
                        <p className="text-gray-400 mb-6">Start building good habits today!</p>
                        <button
                            onClick={() => {
                                setEditingHabit(null);
                                setShowModal(true);
                            }}
                            className="px-6 py-3 bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-600 hover:shadow-lg transition-all"
                        >
                            Create Your First Habit
                        </button>
                    </motion.div>
                ) : (
                    <>
                        {/* Render grouped sections */}
                        {TIME_SECTIONS.map(section => {
                            const sectionHabits = groupedHabits[section.key];
                            if (!sectionHabits || sectionHabits.length === 0) return null;

                            // Only show section header if there are multiple time groups
                            const hasMultipleGroups = Object.keys(groupedHabits).length > 1;

                            return (
                                <div key={section.key}>
                                    {hasMultipleGroups && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <section.icon size={14} className={section.color} />
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                {section.label}
                                            </span>
                                            <div className="flex-1 h-px bg-gray-100" />
                                        </div>
                                    )}
                                    <div className="space-y-3">
                                        {sectionHabits.map((habit, idx) => (
                                            <HabitCard
                                                key={habit.id}
                                                habit={habit}
                                                log={getHabitLog(habit.id, selectedDateStr)}
                                                onLog={handleLog}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                streak={getHabitStreak(habit.id)}
                                                index={idx}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </>
                )}
            </div>

            {/* MY STATS Section */}
            {totalToday > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4"
                >
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">MY STATS</h4>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-500">Current Streak:</div>
                            <div className="text-2xl font-bold text-gray-800 flex items-center gap-1.5">
                                {bestCurrentStreak} Days
                                {bestCurrentStreak > 0 && <Flame size={18} className="text-orange-400" />}
                            </div>
                        </div>
                        <div className="h-10 w-px bg-gray-100" />
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Overall Completion:</div>
                            <div className="text-2xl font-bold text-gray-800 flex items-center justify-end gap-2">
                                {overallCompletion}%
                                <TrendingUp size={18} className="text-teal-500" />
                            </div>
                        </div>
                    </div>
                    {/* Mini progress */}
                    <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${completionRate}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500 rounded-full"
                        />
                    </div>
                    <div className="mt-1 text-xs text-gray-400 text-right">
                        {completedToday}/{totalToday} today
                    </div>
                </motion.div>
            )}

            {/* Add Habit FAB */}
            {todayHabits.length > 0 && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        setEditingHabit(null);
                        setShowModal(true);
                    }}
                    className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-teal-500 text-white shadow-lg shadow-teal-500/30 flex items-center justify-center z-40 hover:bg-teal-600 transition-colors"
                >
                    <Plus size={24} />
                </motion.button>
            )}

            {/* Habit Modal */}
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
