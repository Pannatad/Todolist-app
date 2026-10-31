import { useMemo } from 'react';
import { Check } from 'lucide-react';
import { useHabit } from '../../context/HabitContext';
import { isHabitScheduledOnDate } from '../../context/habitContextUtils';
import { toLocalDateKey } from '../../utils/scheduleOccurrences';
import { buildHabitWeek, pickDistinctColors } from '../../utils/weekPlan';
import { HABIT_COLORS } from '../habitModalUtils';
import { getCurrentTimeValue } from '../habitValueUtils';
import WeekRow from './WeekRow';
import './week-plan.css';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const repeatLabel = (habit) => {
    if (habit.frequency === 'daily' || !habit.schedule_days?.length || habit.schedule_days.length === 7) return 'Every day';
    return [...habit.schedule_days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7)).map((day) => DAY_NAMES[day]).join(', ');
};

const completionValue = (habit) => {
    if (habit.type === 'time') return getCurrentTimeValue();
    if (habit.type === 'score') return 3;
    if (habit.type === 'count' || habit.type === 'duration') return Number(habit.target) || 1;
    return 1;
};

const todayText = (habit, today, log) => {
    if (!today) return { value: '', label: '' };
    if (today.done) return { value: habit.type === 'avoid' ? 'Clean' : 'Done', label: 'today' };
    if (!today.scheduled) return { value: 'Rest', label: 'day' };
    const value = Number(log?.value) || 0;
    if (habit.type === 'count' && value > 0) return { value: `${value} of ${habit.target}`, label: 'today' };
    if (habit.type === 'duration' && value > 0) return { value: `${value} of ${habit.target}m`, label: 'today' };
    return { value: 'Not yet', label: 'today' };
};

/** Every active habit across the week, in the same layout as daily targets. */
const WeekHabits = ({ weekKey, now, takenColors = [], onManage }) => {
    const { habits, getHabitLog, logHabit } = useHabit();
    const todayKey = toLocalDateKey(now);

    const colors = useMemo(
        () => pickDistinctColors(habits.map((habit) => HABIT_COLORS[habit.color]), takenColors),
        [habits, takenColors]
    );

    const rows = useMemo(() => habits.map((habit, index) => {
        const days = buildHabitWeek({ habit, weekStart: weekKey, getLog: getHabitLog, isScheduled: isHabitScheduledOnDate, now });
        const scheduledDays = days.filter((day) => day.scheduled).length;
        const met = days.filter((day) => day.status === 'met').length;
        return { habit, color: colors[index], days, today: days.find((day) => day.isToday) || null, scheduledDays, met };
    }), [colors, getHabitLog, habits, now, weekKey]);

    const toggle = (habit, done) => logHabit(habit.id, todayKey, done ? 0 : completionValue(habit), !done);

    return (
        <section className="week-block" aria-labelledby="week-habits-heading">
            <div className="week-section-heading">
                <h2 id="week-habits-heading">Daily habits</h2>
                {onManage && <button type="button" className="week-text-button" onClick={onManage}>Manage</button>}
            </div>

            {rows.length === 0 ? (
                <div className="week-empty-card">
                    <div>
                        <p className="week-empty-card__title">No habits yet</p>
                        <p className="week-empty-card__text">Add habits in Habits and they show up here for the week.</p>
                    </div>
                    {onManage && <button type="button" className="ui-button ui-button--accent" onClick={onManage}>Add Habits</button>}
                </div>
            ) : (
                <div className="week-tracks">
                    {rows.map(({ habit, color, days, today, scheduledDays, met }) => {
                        const log = getHabitLog(habit.id, todayKey);
                        const text = todayText(habit, today, log);
                        const done = today?.done === true;
                        const daysLabel = habit.type === 'avoid' ? `${met} clean of ${scheduledDays}` : `${met} of ${scheduledDays} days`;
                        return (
                            <WeekRow
                                key={habit.id}
                                color={color}
                                title={habit.name}
                                subtitle={`${repeatLabel(habit)} · ${daysLabel}`}
                                todayValue={text.value}
                                todayLabel={text.label}
                                ratio={today?.ratio || 0}
                                days={days}
                                metText={habit.type === 'avoid' ? 'clean' : 'done'}
                                action={{
                                    icon: Check,
                                    pressed: done,
                                    label: done
                                        ? `Undo ${habit.name} for today`
                                        : habit.type === 'avoid' ? `Mark ${habit.name} as a clean day` : `Mark ${habit.name} done today`,
                                    onClick: () => toggle(habit, done),
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default WeekHabits;
