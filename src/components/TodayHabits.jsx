import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, TrendingUp, Flame } from 'lucide-react';
import HabitCard from './HabitCard';
import HabitModal from './HabitModal';
import { useHabit } from '../context/HabitContext';

const TodayHabits = () => {
    const [showModal, setShowModal] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);

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

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayHabits = getHabitsForDate(today);

    // Calculate overall stats
    const completedToday = todayHabits.filter(h => {
        const log = getHabitLog(h.id, todayStr);
        return log?.completed;
    }).length;

    const totalToday = todayHabits.length;
    const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

    // Get best current streak across all habits
    const bestCurrentStreak = habits.reduce((max, h) => {
        const streak = getHabitStreak(h.id);
        return Math.max(max, streak.current);
    }, 0);

    const handleLog = (habitId, value, completed) => {
        logHabit(habitId, todayStr, value, completed);
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
        <div className="space-y-6">
            {/* Header Stats - Vibrant Gradient Cards */}
            <div className="grid grid-cols-3 gap-4">
                {/* Today Stats - Purple Gradient */}
                <div className="bg-gradient-to-r from-purple-500 via-purple-400 to-blue-400 rounded-2xl p-4 shadow-lg shadow-purple-500/20">
                    <div className="flex items-center gap-2 text-white/80 mb-1">
                        <Calendar size={14} />
                        <span className="text-xs font-bold uppercase tracking-wide">Today</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {completedToday}/{totalToday}
                    </div>
                </div>

                {/* Rate - Teal Gradient */}
                <div className="bg-gradient-to-r from-teal-400 via-emerald-400 to-green-400 rounded-2xl p-4 shadow-lg shadow-teal-500/20">
                    <div className="flex items-center gap-2 text-white/80 mb-1">
                        <TrendingUp size={14} />
                        <span className="text-xs font-bold uppercase tracking-wide">Rate</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {completionRate}%
                    </div>
                </div>

                {/* Streak - Orange Gradient */}
                <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 rounded-2xl p-4 shadow-lg shadow-orange-500/20">
                    <div className="flex items-center gap-2 text-white/80 mb-1">
                        <Flame size={14} />
                        <span className="text-xs font-bold uppercase tracking-wide">Streak</span>
                    </div>
                    <div className="text-3xl font-bold text-white">
                        {bestCurrentStreak}d
                    </div>
                </div>
            </div>

            {/* Today's Date */}
            <div className="text-center">
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                    {today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </h2>
            </div>

            {/* Habits List */}
            <div className="space-y-3">
                <AnimatePresence>
                    {todayHabits.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-center py-12"
                        >
                            <div className="text-6xl mb-4">🌱</div>
                            <h3 className="text-xl font-bold text-sage-600 dark:text-white/60 mb-2">No habits yet</h3>
                            <p className="text-sage-500 dark:text-white/40 mb-6">Start building good habits today!</p>
                            <button
                                onClick={() => {
                                    setEditingHabit(null);
                                    setShowModal(true);
                                }}
                                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold rounded-xl hover:shadow-lg transition-all"
                            >
                                Create Your First Habit
                            </button>
                        </motion.div>
                    ) : (
                        todayHabits.map((habit, index) => (
                            <HabitCard
                                key={habit.id}
                                habit={habit}
                                log={getHabitLog(habit.id, todayStr)}
                                onLog={handleLog}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                                index={index}
                            />
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Add Habit FAB */}
            {todayHabits.length > 0 && (
                <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        setEditingHabit(null);
                        setShowModal(true);
                    }}
                    className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30 flex items-center justify-center z-40"
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
