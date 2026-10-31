import { useMemo } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useHabit } from '../../context/HabitContext';
import { isHabitScheduledOnDate } from '../../context/habitContextUtils';
import { toLocalDateKey } from '../../utils/scheduleOccurrences';
import { buildHabitWeek, getWeekDays, pickDistinctColors } from '../../utils/weekPlan';
import { HABIT_COLORS } from '../habitModalUtils';
import { getCurrentTimeValue } from '../habitValueUtils';
import WeekRow, { WeekDaysHead } from './WeekRow';
import './week-plan.css';

const completionValue = (habit) => {
    if (habit.type === 'time') return getCurrentTimeValue();
    if (habit.type === 'score') return 3;
    if (habit.type === 'count' || habit.type === 'duration') return Number(habit.target) || 1;
    return 1;
};

/** Every active habit across the week, in the same list layout as daily targets. */
const WeekHabits = ({ weekKey, now, takenColors = [], onManage }) => {
    const { habits, getHabitLog, logHabit } = useHabit();
    const todayKey = toLocalDateKey(now);
    const headDays = getWeekDays(weekKey).map((date) => ({ date, dateKey: toLocalDateKey(date), isToday: toLocalDateKey(date) === todayKey }));

    const colors = useMemo(
        () => pickDistinctColors(habits.map((habit) => HABIT_COLORS[habit.color]), takenColors),
        [habits, takenColors]
    );

    const rows = useMemo(() => habits.map((habit, index) => {
        const days = buildHabitWeek({ habit, weekStart: weekKey, getLog: getHabitLog, isScheduled: isHabitScheduledOnDate, now });
        return {
            habit,
            color: colors[index],
            days,
            today: days.find((day) => day.isToday) || null,
            scheduledDays: days.filter((day) => day.scheduled).length,
            met: days.filter((day) => day.status === 'met').length,
        };
    }), [colors, getHabitLog, habits, now, weekKey]);

    const toggle = (habit, done) => logHabit(habit.id, todayKey, done ? 0 : completionValue(habit), !done);

    return (
        <section className="week-block" aria-labelledby="week-habits-heading">
            <div className="week-section-heading">
                <h2 id="week-habits-heading">Daily habits</h2>
                {onManage && rows.length > 0 && <button type="button" className="week-text-button" onClick={onManage}>Manage</button>}
            </div>

            <div className="wt-list">
                {rows.length === 0 ? (
                    <button type="button" className="wt-empty" onClick={onManage} disabled={!onManage}>
                        Add habits in Habits
                        <ChevronRight size={17} aria-hidden="true" />
                    </button>
                ) : (
                    <>
                        <WeekDaysHead days={headDays} />
                        {rows.map(({ habit, color, days, today, scheduledDays, met }) => {
                            const done = today?.done === true;
                            const clean = habit.type === 'avoid';
                            return (
                                <WeekRow
                                    key={habit.id}
                                    color={color}
                                    title={habit.name}
                                    days={days}
                                    meta={<span>{met}/{scheduledDays}</span>}
                                    summary={`${met} of ${scheduledDays} days ${clean ? 'clean' : 'done'} this week`}
                                    action={(
                                        <button
                                            type="button"
                                            className="wt-check"
                                            aria-pressed={done}
                                            aria-label={done ? `Undo ${habit.name} for today` : `${clean ? 'Mark a clean day for' : 'Complete'} ${habit.name} today`}
                                            onClick={() => toggle(habit, done)}
                                        >
                                            <span>{done && <Check size={14} strokeWidth={3.2} aria-hidden="true" />}</span>
                                        </button>
                                    )}
                                />
                            );
                        })}
                    </>
                )}
            </div>
        </section>
    );
};

export default WeekHabits;
