import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useHabit } from '../context/HabitContext';
import { toLocalDateKey } from '../utils/scheduleOccurrences';

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
const inkBorder = 'border-2 border-slate-800 dark:border-bone-200/70';
const softPopShadow = 'shadow-[6px_6px_0_#E2E8F0] dark:shadow-[6px_6px_0_rgba(255,255,255,0.10)]';
const popMotion = 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]';

const WeeklyGrid = () => {
    const [weekOffset, setWeekOffset] = useState(0);
    const { habits, logHabit, getHabitLog, canLogHabitDate } = useHabit();

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
        if (!canLogHabitDate(date)) return;

        logHabit(habitId, toLocalDateKey(date), value, completed);
    };

    return (
        <div className="space-y-4">
            <section className={`relative overflow-hidden rounded-[28px] bg-white p-4 ${inkBorder} ${softPopShadow} dark:bg-void-900/90 sm:p-5`}>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-slate-500">
                            <span className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-sky-50 text-sky-700">
                                <CalendarDays size={16} strokeWidth={2.7} />
                            </span>
                            <span className="app-eyebrow">Weekly view</span>
                        </div>
                        <h2 className="app-section-title mt-2">{formatDateRange()}</h2>
                    </div>

                    <div className="relative z-10 flex items-center gap-2">
                        <button
                            onClick={() => setWeekOffset((prev) => prev - 1)}
                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-800 bg-white text-slate-700 shadow-[3px_3px_0_#1E293B] ${popMotion} hover:-translate-y-0.5 hover:bg-amber-100`}
                        >
                            <ChevronLeft size={16} strokeWidth={2.7} />
                        </button>
                        {weekOffset !== 0 && (
                            <button
                                onClick={() => setWeekOffset(0)}
                                className={`rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 ${popMotion} hover:bg-slate-50`}
                            >
                                This week
                            </button>
                        )}
                        <button
                            onClick={() => setWeekOffset((prev) => prev + 1)}
                            disabled={weekOffset >= 0}
                            className={`flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-800 bg-white text-slate-700 shadow-[3px_3px_0_#1E293B] ${popMotion} hover:-translate-y-0.5 hover:bg-amber-100 disabled:opacity-40`}
                        >
                            <ChevronRight size={16} strokeWidth={2.7} />
                        </button>
                    </div>
                </div>
            </section>

            <section className={`overflow-hidden rounded-[28px] bg-white ${inkBorder} ${softPopShadow} dark:bg-void-900/90`}>
                <div className="grid grid-cols-8 border-b-2 border-slate-800 bg-slate-100 dark:border-bone-200/70 dark:bg-void-800">
                    <div className="app-eyebrow p-3">Habit</div>
                    {weekDates.map((date) => (
                        <div key={date.toISOString()} className={`border-l-2 border-slate-800 p-3 text-center dark:border-bone-200/70 ${isToday(date) ? 'bg-emerald-100' : ''}`}>
                            <div className="text-xs font-medium text-slate-500">
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className={`mt-1 text-sm font-semibold ${isToday(date) ? 'text-emerald-800' : 'text-slate-800 dark:text-bone-100'}`}>
                                {date.getDate()}
                            </div>
                        </div>
                    ))}
                </div>

                {habits.length === 0 ? (
                    <div className="p-10 text-center text-sm font-semibold text-slate-400">No habits created yet.</div>
                ) : (
                    habits.map((habit, habitIndex) => {
                        const colorKey = habit.color || INDEX_COLORS[habitIndex % INDEX_COLORS.length];
                        const color = COLOR_CONFIGS[colorKey] || COLOR_CONFIGS.teal;

                        return (
                            <div key={habit.id} className="grid grid-cols-8 border-b-2 border-slate-100 last:border-b-0 dark:border-white/10">
                                <div className="flex items-center gap-3 p-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border-2 border-slate-800 ${color.idle}`}>
                                        <span className="text-base">{habit.icon}</span>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-slate-800 dark:text-bone-100">{habit.name}</div>
                                        <div className="text-xs font-semibold text-slate-400">{habit.frequency === 'daily' ? 'Daily' : 'Custom schedule'}</div>
                                    </div>
                                </div>

                                {weekDates.map((date) => {
                                    const isScheduled = habit.frequency === 'daily' || habit.schedule_days?.includes(date.getDay());
                                    const log = getHabitLog(habit.id, date);
                                    const isCompleted = log?.completed;
                                    const isEditable = canLogHabitDate(date);

                                    return (
                                        <div key={`${habit.id}-${date.toISOString()}`} className={`flex items-center justify-center border-l border-slate-100 p-2 dark:border-white/10 ${isToday(date) ? 'bg-emerald-50/80' : ''}`}>
                                            {isScheduled ? (
                                                <Motion.button
                                                    whileHover={isEditable ? { scale: 1.04 } : undefined}
                                                    whileTap={isEditable ? { scale: 0.96 } : undefined}
                                                    onClick={() => {
                                                        if (!isEditable) return;

                                                        if (habit.type === 'check') {
                                                            handleLog(habit.id, date, isCompleted ? 0 : 1, !isCompleted);
                                                        } else {
                                                            const nextValue = isCompleted ? 0 : habit.target;
                                                            handleLog(habit.id, date, nextValue, !isCompleted);
                                                        }
                                                    }}
                                                    disabled={!isEditable}
                                                    title={isEditable ? undefined : 'Only today and yesterday can be edited.'}
                                                    className={`flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-800 transition-all disabled:cursor-not-allowed ${
                                                        isCompleted
                                                            ? `${color.active} text-white shadow-[3px_3px_0_#1E293B]`
                                                            : isEditable
                                                                ? 'bg-white text-slate-500 hover:bg-amber-100'
                                                                : 'bg-slate-50 text-slate-300'
                                                    }`}
                                                >
                                                    {isCompleted
                                                        ? <Check size={15} strokeWidth={3} />
                                                        : isEditable
                                                            ? <span className="text-xs font-black">+</span>
                                                            : <Lock size={13} />}
                                                </Motion.button>
                                            ) : (
                                                <div className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-slate-200 bg-slate-100 text-xs font-black text-slate-300">
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
