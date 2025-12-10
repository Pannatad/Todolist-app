import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, TrendingUp } from 'lucide-react';
import HabitCard from './HabitCard';
import { useHabit } from '../context/HabitContext';

// Color configurations for variety
const COLOR_CONFIGS = {
    purple: { border: 'border-purple-300', bg: 'bg-purple-100', check: 'from-purple-500 to-indigo-600' },
    pink: { border: 'border-pink-300', bg: 'bg-pink-100', check: 'from-pink-500 to-rose-600' },
    teal: { border: 'border-teal-300', bg: 'bg-teal-100', check: 'from-teal-500 to-cyan-600' },
    amber: { border: 'border-amber-300', bg: 'bg-amber-100', check: 'from-amber-500 to-orange-600' },
    emerald: { border: 'border-emerald-300', bg: 'bg-emerald-100', check: 'from-emerald-500 to-green-600' },
};

const INDEX_COLORS = ['purple', 'teal', 'pink', 'emerald', 'amber'];

const WeeklyGrid = () => {
    const [weekOffset, setWeekOffset] = useState(0);

    const {
        habits,
        logHabit,
        getHabitLog,
        getCompletionStats
    } = useHabit();

    // Calculate week dates
    const getWeekDates = () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7)); // Monday

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            dates.push(date);
        }
        return dates;
    };

    const weekDates = getWeekDates();
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];

    const formatDateRange = () => {
        const options = { month: 'short', day: 'numeric' };
        return `${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}`;
    };

    const isToday = (date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const handleLog = (habitId, date, value, completed) => {
        const dateStr = date.toISOString().split('T')[0];
        logHabit(habitId, dateStr, value, completed);
    };

    // Calculate week stats
    const calculateWeekStats = () => {
        let completed = 0;
        let total = 0;

        habits.forEach(habit => {
            weekDates.forEach(date => {
                const dayOfWeek = date.getDay();
                const isScheduled = habit.frequency === 'daily' ||
                    (habit.schedule_days?.includes(dayOfWeek));

                if (isScheduled) {
                    total++;
                    const log = getHabitLog(habit.id, date);
                    if (log?.completed) completed++;
                }
            });
        });

        return { completed, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    };

    const weekStats = calculateWeekStats();

    return (
        <div className="space-y-6">
            {/* Week Navigation - Gradient Header */}
            <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 rounded-2xl p-4 shadow-lg shadow-purple-500/20">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setWeekOffset(prev => prev - 1)}
                        className="p-2 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>

                    <div className="text-center">
                        <h2 className="text-lg font-bold text-white">{formatDateRange()}</h2>
                        {weekOffset !== 0 && (
                            <button
                                onClick={() => setWeekOffset(0)}
                                className="text-xs text-white/70 hover:text-white hover:underline"
                            >
                                Back to This Week
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => setWeekOffset(prev => prev + 1)}
                        className="p-2 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                        disabled={weekOffset >= 0}
                    >
                        <ChevronRight size={24} className={weekOffset >= 0 ? 'opacity-30' : ''} />
                    </button>
                </div>
            </div>

            {/* Grid */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-2xl border border-purple-100 dark:border-purple-500/20 overflow-hidden shadow-lg">
                {/* Day Headers */}
                <div className="grid grid-cols-8 border-b border-purple-100 dark:border-purple-500/20">
                    <div className="p-3 text-sm font-bold text-purple-600 dark:text-purple-300">Habit</div>
                    {weekDates.map((date, idx) => {
                        const dayLabel = date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
                        const dayNum = date.getDate();
                        return (
                            <div
                                key={idx}
                                className={`p-3 text-center ${isToday(date) ? 'bg-gradient-to-b from-purple-500 to-indigo-600' : ''}`}
                            >
                                <div className={`text-xs uppercase font-medium ${isToday(date) ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>{dayLabel}</div>
                                <div className={`text-sm font-bold ${isToday(date) ? 'text-white' : 'text-gray-700 dark:text-gray-200'}`}>
                                    {dayNum}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Habit Rows */}
                {habits.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No habits created yet. Add your first habit!
                    </div>
                ) : (
                    habits.map((habit, habitIndex) => {
                        const colorKey = habit.color || INDEX_COLORS[habitIndex % INDEX_COLORS.length];
                        const colorConfig = COLOR_CONFIGS[colorKey] || COLOR_CONFIGS.purple;

                        return (
                            <div key={habit.id} className="grid grid-cols-8 border-b border-purple-50 dark:border-purple-500/10 hover:bg-purple-50/50 dark:hover:bg-purple-500/5">
                                {/* Habit Name */}
                                <div className="p-3 flex items-center gap-2 truncate">
                                    <span className="text-lg">{habit.icon}</span>
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{habit.name}</span>
                                </div>

                                {/* Day Cells */}
                                {weekDates.map((date, idx) => {
                                    const dayOfWeek = date.getDay();
                                    const isScheduled = habit.frequency === 'daily' ||
                                        (habit.schedule_days?.includes(dayOfWeek));
                                    const log = getHabitLog(habit.id, date);
                                    const isCompleted = log?.completed;

                                    return (
                                        <div
                                            key={idx}
                                            className={`p-2 flex items-center justify-center ${isToday(date) ? 'bg-purple-500/10' : ''}`}
                                        >
                                            {isScheduled ? (
                                                <motion.button
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => {
                                                        if (habit.type === 'check') {
                                                            handleLog(habit.id, date, isCompleted ? 0 : 1, !isCompleted);
                                                        } else {
                                                            const newValue = isCompleted ? 0 : habit.target;
                                                            handleLog(habit.id, date, newValue, !isCompleted);
                                                        }
                                                    }}
                                                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border-2 ${isCompleted
                                                            ? `bg-gradient-to-br ${colorConfig.check} border-transparent shadow-md`
                                                            : `bg-white ${colorConfig.border} hover:${colorConfig.bg}`
                                                        }`}
                                                >
                                                    {isCompleted && <Check size={16} className="text-white" strokeWidth={3} />}
                                                </motion.button>
                                            ) : (
                                                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700/30 flex items-center justify-center">
                                                    <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Week Stats - Gradient Bar */}
            <div className="bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-600 rounded-2xl p-4 shadow-lg shadow-purple-500/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <TrendingUp className="text-white/80" size={20} />
                    <span className="text-white font-bold">This Week</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <div className="text-xl font-bold text-white">{weekStats.completed}/{weekStats.total}</div>
                        <div className="text-xs text-white/70">Completed</div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-bold text-white">{weekStats.rate}%</div>
                        <div className="text-xs text-white/70">Rate</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeeklyGrid;
