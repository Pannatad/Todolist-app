import React, { useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useHabit } from '../context/HabitContext';
import { toLocalDateKey } from '../utils/scheduleOccurrences';
import { formatShortTimeValue, getCurrentTimeValue } from './habitValueUtils';
import { SCORE_MAX } from './habitModalUtils';

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
        <div className="habit-weekly">
            <section className="habit-weekly__toolbar">
                <div className="habit-weekly__toolbar-copy">
                    <div className="habit-weekly__label">
                        <span className="habit-weekly__icon">
                                <CalendarDays size={16} strokeWidth={2.7} />
                        </span>
                        <span className="app-eyebrow">Weekly view</span>
                    </div>
                        <h2 className="app-section-title mt-2">{formatDateRange()}</h2>
                </div>

                <div className="habit-weekly__controls">
                    <button
                        onClick={() => setWeekOffset((prev) => prev - 1)}
                        className="habit-weekly__nav"
                        aria-label="Previous week"
                    >
                        <ChevronLeft size={16} strokeWidth={2.7} />
                    </button>
                    {weekOffset !== 0 && (
                        <button
                            onClick={() => setWeekOffset(0)}
                            className="habit-weekly__today"
                        >
                            This week
                        </button>
                    )}
                    <button
                        onClick={() => setWeekOffset((prev) => prev + 1)}
                        disabled={weekOffset >= 0}
                        className="habit-weekly__nav"
                        aria-label="Next week"
                    >
                        <ChevronRight size={16} strokeWidth={2.7} />
                    </button>
                </div>
            </section>

            <section className="habit-weekly__table-wrap">
                <div className={`habit-weekly__table${habits.length === 0 ? ' is-empty' : ''}`}>
                    <div className="habit-weekly__head-row">
                        <div className="habit-weekly__habit-head">Habit</div>
                    {weekDates.map((date) => (
                        <div key={date.toISOString()} className={`habit-weekly__day-head${isToday(date) ? ' is-today' : ''}`}>
                            <div className="habit-weekly__day-name">
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className="habit-weekly__day-number">
                                {date.getDate()}
                            </div>
                        </div>
                    ))}
                    </div>

                {habits.length === 0 ? (
                    <div className="habit-weekly__empty">No habits created yet.</div>
                ) : (
                    habits.map((habit) => {
                        return (
                            <div key={habit.id} className="habit-weekly__row">
                                <div className="habit-weekly__habit-cell">
                                    <div className="habit-weekly__habit-icon">
                                        <span>{habit.icon}</span>
                                    </div>
                                    <div className="habit-weekly__habit-copy">
                                        <div className="habit-weekly__habit-name">{habit.name}</div>
                                        <div className="habit-weekly__habit-frequency">{habit.frequency === 'daily' ? 'Daily' : 'Custom schedule'}</div>
                                    </div>
                                </div>

                                {weekDates.map((date) => {
                                    const isScheduled = habit.frequency === 'daily' || habit.schedule_days?.includes(date.getDay());
                                    const log = getHabitLog(habit.id, date);
                                    const isCompleted = log?.completed;
                                    const scoreValue = Number(log?.value) || 0;
                                    const isScoreHabit = habit.type === 'score';
                                    const isTimeHabit = habit.type === 'time';
                                    const isEditable = canLogHabitDate(date);

                                    return (
                                        <div key={`${habit.id}-${date.toISOString()}`} className={`habit-weekly__cell${isToday(date) ? ' is-today' : ''}`}>
                                            {isScheduled ? (
                                                <Motion.button
                                                    whileHover={isEditable ? { scale: 1.04 } : undefined}
                                                    whileTap={isEditable ? { scale: 0.96 } : undefined}
                                                    onClick={() => {
                                                        if (!isEditable) return;

                                                        if (isTimeHabit) {
                                                            handleLog(habit.id, date, isCompleted ? 0 : getCurrentTimeValue(), !isCompleted);
                                                        } else if (isScoreHabit) {
                                                            const nextScore = scoreValue >= SCORE_MAX ? 0 : scoreValue + 1;
                                                            handleLog(habit.id, date, nextScore, nextScore > 0);
                                                        } else if (habit.type === 'check') {
                                                            handleLog(habit.id, date, isCompleted ? 0 : 1, !isCompleted);
                                                        } else {
                                                            const nextValue = isCompleted ? 0 : habit.target;
                                                            handleLog(habit.id, date, nextValue, !isCompleted);
                                                        }
                                                    }}
                                                    disabled={!isEditable}
                                                    title={isTimeHabit
                                                        ? (!isEditable
                                                            ? 'Only today and yesterday can be edited.'
                                                            : isCompleted ? `Logged at ${formatShortTimeValue(log?.value)}. Click to clear.` : 'Log the current time.')
                                                        : isScoreHabit
                                                            ? (scoreValue ? `Score ${scoreValue} of ${SCORE_MAX}. Click to change.` : `Set a score from 1 to ${SCORE_MAX}.`)
                                                        : isEditable ? undefined : 'Only today and yesterday can be edited.'}
                                                    aria-label={isTimeHabit
                                                        ? `${habit.name}, ${isCompleted ? `logged at ${formatShortTimeValue(log?.value)}` : 'not logged'}`
                                                        : isScoreHabit
                                                        ? `${habit.name}, ${scoreValue ? `score ${scoreValue} of ${SCORE_MAX}` : 'not scored'}`
                                                        : undefined}
                                                    className={`habit-weekly__cell-button${isCompleted ? ' is-completed' : ''}${isScoreHabit ? ' is-score' : ''}${isTimeHabit ? ' is-time' : ''}${!isEditable ? ' is-locked' : ''}`}
                                                >
                                                    {isTimeHabit
                                                        ? (isCompleted ? formatShortTimeValue(log?.value) : '–')
                                                        : isScoreHabit
                                                        ? (scoreValue || '–')
                                                        : isCompleted
                                                        ? <Check size={15} strokeWidth={3} />
                                                        : isEditable
                                                            ? <span className="text-xs font-black">+</span>
                                                            : <Lock size={13} />}
                                                </Motion.button>
                                            ) : (
                                                <div className="habit-weekly__cell-button is-unscheduled">
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
                </div>
            </section>
        </div>
    );
};

export default WeeklyGrid;
