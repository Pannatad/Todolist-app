import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useHabit } from '../context/HabitContext';

const COLOR_CONFIGS = {
    slate: { border: 'border-slate-200', active: 'bg-slate-500', idle: 'bg-slate-50' },
    rose: { border: 'border-rose-200', active: 'bg-rose-500', idle: 'bg-rose-50' },
    purple: { border: 'border-purple-200', active: 'bg-purple-500', idle: 'bg-purple-50' },
    pink: { border: 'border-pink-200', active: 'bg-pink-500', idle: 'bg-pink-50' },
    indigo: { border: 'border-indigo-200', active: 'bg-indigo-500', idle: 'bg-indigo-50' },
    blue: { border: 'border-blue-200', active: 'bg-blue-500', idle: 'bg-blue-50' },
    teal: { border: 'border-teal-200', active: 'bg-teal-500', idle: 'bg-teal-50' },
    cyan: { border: 'border-cyan-200', active: 'bg-cyan-500', idle: 'bg-cyan-50' },
    lime: { border: 'border-lime-200', active: 'bg-lime-500', idle: 'bg-lime-50' },
    amber: { border: 'border-amber-200', active: 'bg-amber-500', idle: 'bg-amber-50' },
    emerald: { border: 'border-emerald-200', active: 'bg-emerald-500', idle: 'bg-emerald-50' },
};

const INDEX_COLORS = ['slate', 'rose', 'purple', 'pink', 'indigo', 'blue', 'teal', 'cyan', 'lime', 'amber'];

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

    return (
        <div className="space-y-4">
            <section className="rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-slate-500">
                            <CalendarDays size={14} />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Weekly view</span>
                        </div>
                        <h2 className="mt-1 text-xl font-semibold text-slate-900">{formatDateRange()}</h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setWeekOffset((prev) => prev - 1)}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        {weekOffset !== 0 && (
                            <button
                                onClick={() => setWeekOffset(0)}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                            >
                                This week
                            </button>
                        )}
                        <button
                            onClick={() => setWeekOffset((prev) => prev + 1)}
                            disabled={weekOffset >= 0}
                            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </section>

            <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <div className="grid grid-cols-8 border-b border-slate-100 bg-slate-50">
                    <div className="p-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Habit</div>
                    {weekDates.map((date) => (
                        <div key={date.toISOString()} className={`p-3 text-center ${isToday(date) ? 'bg-emerald-50' : ''}`}>
                            <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className={`mt-1 text-sm font-semibold ${isToday(date) ? 'text-emerald-700' : 'text-slate-700'}`}>
                                {date.getDate()}
                            </div>
                        </div>
                    ))}
                </div>

                {habits.length === 0 ? (
                    <div className="p-10 text-center text-sm text-slate-400">No habits created yet.</div>
                ) : (
                    habits.map((habit, habitIndex) => {
                        const colorKey = habit.color || INDEX_COLORS[habitIndex % INDEX_COLORS.length];
                        const color = COLOR_CONFIGS[colorKey] || COLOR_CONFIGS.teal;

                        return (
                            <div key={habit.id} className="grid grid-cols-8 border-b border-slate-100 last:border-b-0">
                                <div className="flex items-center gap-3 p-3">
                                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${color.idle}`}>
                                        <span className="text-base">{habit.icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium text-slate-800">{habit.name}</div>
                                        <div className="text-xs text-slate-400">{habit.frequency === 'daily' ? 'Daily' : 'Custom schedule'}</div>
                                    </div>
                                </div>

                                {weekDates.map((date) => {
                                    const isScheduled = habit.frequency === 'daily' || habit.schedule_days?.includes(date.getDay());
                                    const log = getHabitLog(habit.id, date);
                                    const isCompleted = log?.completed;

                                    return (
                                        <div key={`${habit.id}-${date.toISOString()}`} className={`flex items-center justify-center p-2 ${isToday(date) ? 'bg-emerald-50/60' : ''}`}>
                                            {isScheduled ? (
                                                <motion.button
                                                    whileHover={{ scale: 1.04 }}
                                                    whileTap={{ scale: 0.96 }}
                                                    onClick={() => {
                                                        if (habit.type === 'check') {
                                                            handleLog(habit.id, date, isCompleted ? 0 : 1, !isCompleted);
                                                        } else {
                                                            const nextValue = isCompleted ? 0 : habit.target;
                                                            handleLog(habit.id, date, nextValue, !isCompleted);
                                                        }
                                                    }}
                                                    className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-all ${
                                                        isCompleted
                                                            ? `${color.active} border-transparent text-white shadow-sm`
                                                            : `bg-white ${color.border} text-slate-400 hover:bg-slate-50`
                                                    }`}
                                                >
                                                    {isCompleted ? <Check size={15} strokeWidth={3} /> : <span className="text-xs font-semibold">+</span>}
                                                </motion.button>
                                            ) : (
                                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs text-slate-300">
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
        </div>
    );
};

export default WeeklyGrid;
