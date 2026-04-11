import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, ChevronLeft, ChevronRight, Check, TrendingUp } from 'lucide-react';
import { useHabit } from '../context/HabitContext';

const COLOR_CONFIGS = {
    purple: { border: 'border-purple-200', active: 'bg-purple-500', idle: 'bg-purple-50' },
    pink: { border: 'border-pink-200', active: 'bg-pink-500', idle: 'bg-pink-50' },
    teal: { border: 'border-teal-200', active: 'bg-teal-500', idle: 'bg-teal-50' },
    amber: { border: 'border-amber-200', active: 'bg-amber-500', idle: 'bg-amber-50' },
    emerald: { border: 'border-emerald-200', active: 'bg-emerald-500', idle: 'bg-emerald-50' },
};

const INDEX_COLORS = ['teal', 'purple', 'pink', 'emerald', 'amber'];

const WeeklyGrid = () => {
    const [weekOffset, setWeekOffset] = useState(0);
    const { habits, logHabit, getHabitLog } = useHabit();

    const getWeekDates = () => {
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay() + 1 + (weekOffset * 7));

        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + index);
            return date;
        });
    };

    const weekDates = getWeekDates();
    const weekStart = weekDates[0];
    const weekEnd = weekDates[6];

    const formatDateRange = () => {
        const options = { month: 'short', day: 'numeric' };
        return `${weekStart.toLocaleDateString('en-US', options)} - ${weekEnd.toLocaleDateString('en-US', options)}`;
    };

    const isToday = (date) => date.toDateString() === new Date().toDateString();

    const handleLog = (habitId, date, value, completed) => {
        logHabit(habitId, date.toISOString().split('T')[0], value, completed);
    };

    const calculateWeekStats = () => {
        let completed = 0;
        let total = 0;

        habits.forEach((habit) => {
            weekDates.forEach((date) => {
                const isScheduled = habit.frequency === 'daily' || habit.schedule_days?.includes(date.getDay());
                if (!isScheduled) return;
                total += 1;
                if (getHabitLog(habit.id, date)?.completed) completed += 1;
            });
        });

        return {
            completed,
            total,
            rate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    };

    const weekStats = calculateWeekStats();

    return (
        <div className="space-y-6">
            <section className="rounded-[34px] border border-emerald-100 bg-gradient-to-br from-emerald-200 via-teal-50 to-sky-50 p-6 shadow-[0_24px_60px_rgba(16,185,129,0.1)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-700">
                            <CalendarDays size={16} />
                            <span className="text-xs font-semibold uppercase tracking-[0.24em]">Weekly Ledger</span>
                        </div>
                        <h2 className="mt-2 font-serif text-3xl text-slate-800">{formatDateRange()}</h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setWeekOffset((prev) => prev - 1)}
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/70 text-slate-600 shadow-sm transition hover:bg-white"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        {weekOffset !== 0 && (
                            <button
                                onClick={() => setWeekOffset(0)}
                                className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-white"
                            >
                                Back to this week
                            </button>
                        )}
                        <button
                            onClick={() => setWeekOffset((prev) => prev + 1)}
                            disabled={weekOffset >= 0}
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/60 bg-white/70 text-slate-600 shadow-sm transition hover:bg-white disabled:opacity-40"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-[34px] border border-emerald-100 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.05)]">
                <div className="grid grid-cols-8 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="p-4 text-sm font-semibold text-emerald-700">Habit</div>
                    {weekDates.map((date) => (
                        <div key={date.toISOString()} className={`p-4 text-center ${isToday(date) ? 'bg-emerald-500/90' : ''}`}>
                            <div className={`text-[11px] font-semibold uppercase tracking-wide ${isToday(date) ? 'text-white/80' : 'text-slate-500'}`}>
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className={`mt-1 text-lg font-semibold ${isToday(date) ? 'text-white' : 'text-slate-700'}`}>
                                {date.getDate()}
                            </div>
                        </div>
                    ))}
                </div>

                {habits.length === 0 ? (
                    <div className="p-10 text-center text-slate-400">No habits created yet.</div>
                ) : (
                    habits.map((habit, habitIndex) => {
                        const colorKey = habit.color || INDEX_COLORS[habitIndex % INDEX_COLORS.length];
                        const color = COLOR_CONFIGS[colorKey] || COLOR_CONFIGS.teal;

                        return (
                            <div key={habit.id} className="grid grid-cols-8 border-b border-slate-100 last:border-b-0">
                                <div className="flex items-center gap-3 p-4">
                                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${color.idle}`}>
                                        <span className="text-xl">{habit.icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-slate-700">{habit.name}</div>
                                        <div className="text-xs text-slate-400">{habit.frequency === 'daily' ? 'Daily' : 'Custom schedule'}</div>
                                    </div>
                                </div>

                                {weekDates.map((date) => {
                                    const isScheduled = habit.frequency === 'daily' || habit.schedule_days?.includes(date.getDay());
                                    const log = getHabitLog(habit.id, date);
                                    const isCompleted = log?.completed;

                                    return (
                                        <div key={`${habit.id}-${date.toISOString()}`} className={`flex items-center justify-center p-3 ${isToday(date) ? 'bg-emerald-50/70' : ''}`}>
                                            {isScheduled ? (
                                                <motion.button
                                                    whileHover={{ scale: 1.06 }}
                                                    whileTap={{ scale: 0.94 }}
                                                    onClick={() => {
                                                        if (habit.type === 'check') {
                                                            handleLog(habit.id, date, isCompleted ? 0 : 1, !isCompleted);
                                                        } else {
                                                            const nextValue = isCompleted ? 0 : habit.target;
                                                            handleLog(habit.id, date, nextValue, !isCompleted);
                                                        }
                                                    }}
                                                    className={`flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${isCompleted
                                                        ? `${color.active} border-transparent text-white shadow-lg shadow-black/10`
                                                        : `bg-white ${color.border} text-slate-400 hover:bg-slate-50`
                                                        }`}
                                                >
                                                    {isCompleted ? <Check size={18} strokeWidth={3} /> : <span className="text-xs font-semibold">+</span>}
                                                </motion.button>
                                            ) : (
                                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-xs text-slate-300">
                                                    -
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })
                )}
            </section>

            <section className="rounded-[30px] border border-emerald-100 bg-gradient-to-r from-emerald-500 to-teal-500 p-5 text-white shadow-[0_20px_40px_rgba(20,184,166,0.2)]">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <TrendingUp size={20} className="text-white/80" />
                        <span className="font-semibold">This week</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="text-center">
                            <div className="text-xl font-semibold">{weekStats.completed}/{weekStats.total}</div>
                            <div className="text-xs text-white/70">Completed</div>
                        </div>
                        <div className="text-center">
                            <div className="text-xl font-semibold">{weekStats.rate}%</div>
                            <div className="text-xs text-white/70">Rate</div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default WeeklyGrid;
