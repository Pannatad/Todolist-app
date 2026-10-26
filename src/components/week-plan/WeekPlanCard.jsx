import { useState } from 'react';
import { Check, Pencil, Trash2 } from 'lucide-react';
import { RowMenu, toast } from '../../ui';
import { useWeekPlans } from '../../context/WeekPlanContext';
import { confirmAction } from '../../utils/confirm';
import { dateFromKey, formatMinutes, getWeekNumber } from '../../utils/weekPlan';
import { HABIT_COLORS } from '../habitModalUtils';
import WeekDots from './WeekDots';
import WeekPlanSheet from './WeekPlanSheet';
import useWeekPlanModel from './useWeekPlanModel';
import './week-plan.css';

const HabitColumn = ({ kind, habit, days, onEdit }) => {
    const isBreak = kind === 'Break';
    const met = days.filter((day) => day.status === 'met').length;
    if (!habit) {
        return (
            <button type="button" className="week-plan__habit week-plan__habit--unset" onClick={onEdit}>
                <span className="week-plan__habit-kind">{kind}</span>
                <span className="week-plan__habit-name">{isBreak ? 'Pick one to break' : 'Pick one to build'}</span>
            </button>
        );
    }
    return (
        <div className="week-plan__habit">
            <span className="week-plan__habit-kind">{kind}</span>
            <span className="week-plan__habit-name">{habit.name}</span>
            <WeekDots
                days={days}
                label={`${habit.name} this week`}
                color={HABIT_COLORS[habit.color] || undefined}
                metText={isBreak ? 'clean' : 'done'}
            />
            <span className="week-plan__habit-count">
                {isBreak ? `${met} clean ${met === 1 ? 'day' : 'days'}` : `${met} of 7 days`}
            </span>
        </div>
    );
};

const TargetRow = ({ target }) => {
    const today = target.today;
    return (
        <li className="week-target">
            <div className="week-target__head">
                <span className="week-target__label">{target.label}</span>
                <span className="week-target__meta">{formatMinutes(target.minutes)} a day · {target.daysMet} of 7</span>
            </div>
            <WeekDots days={target.days} label={`${target.label} this week`} />
            {today && (
                <p className="week-target__today">
                    {today.met
                        ? `Today ${formatMinutes(today.done)} · target met`
                        : `Today ${formatMinutes(today.done)} of ${formatMinutes(target.minutes)}${today.planned > 0 ? ` · ${formatMinutes(today.planned)} planned` : ''}`}
                </p>
            )}
        </li>
    );
};

/** The week's direction, habits, targets, and key tasks, at the top of This week. */
const WeekPlanCard = ({ weekKey, now }) => {
    const { savePlan, clearPlan } = useWeekPlans();
    const { isLoaded, plan, previous, draft, targets, buildHabit, breakHabit, buildWeek, breakWeek } = useWeekPlanModel(weekKey, now);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);

    const openSheet = () => {
        setFormKey((key) => key + 1);
        setSheetOpen(true);
    };

    const toggleTask = async (taskId) => {
        if (!plan) return;
        try {
            await savePlan({
                ...plan,
                keyTasks: plan.keyTasks.map((task) => task.id === taskId ? { ...task, done: !task.done } : task),
            });
        } catch (error) {
            toast(error.message || 'Could not update this task.', { tone: 'error' });
        }
    };

    const clearWeek = async () => {
        if (!confirmAction('Clear this week\'s plan? Your habits stay in Habits.')) return;
        try {
            await clearPlan(weekKey);
        } catch (error) {
            toast(error.message || 'Could not clear this week.', { tone: 'error' });
        }
    };

    const doneTasks = plan?.keyTasks.filter((task) => task.done).length || 0;

    return (
        <section className="week-plan" aria-labelledby="week-plan-heading">
            <div className="week-section-heading">
                <h2 id="week-plan-heading">Week plan</h2>
                {plan && (
                    <RowMenu
                        label="Week plan actions"
                        items={[
                            { label: 'Edit Week', icon: Pencil, onSelect: openSheet },
                            { label: 'Clear Week', icon: Trash2, destructive: true, onSelect: clearWeek },
                        ]}
                    />
                )}
            </div>

            {!isLoaded ? (
                <div className="week-skeleton" aria-hidden="true"><span /><span /></div>
            ) : !plan ? (
                <div className="ui-card week-plan__empty">
                    <div>
                        <p className="week-plan__empty-title">Give this week a direction</p>
                        <p className="week-plan__empty-text">
                            {previous ? 'Starts from last week\'s habits and targets.' : 'One habit to build, one to break, and daily time targets.'}
                        </p>
                    </div>
                    <button type="button" className="ui-button ui-button--accent" onClick={openSheet}>Plan Week</button>
                </div>
            ) : (
                <div className="week-plan__grid">
                    <div className="ui-card week-plan__panel week-plan__focus">
                        <p className="week-plan__eyebrow">Week {getWeekNumber(dateFromKey(weekKey))}</p>
                        <button type="button" className={`week-plan__theme${plan.theme ? '' : ' is-empty'}`} onClick={openSheet}>
                            {plan.theme || 'Set a direction'}
                        </button>
                        <div className="week-plan__habits">
                            <HabitColumn kind="Build" habit={buildHabit} days={buildWeek} onEdit={openSheet} />
                            <HabitColumn kind="Break" habit={breakHabit} days={breakWeek} onEdit={openSheet} />
                        </div>
                    </div>

                    <div className="ui-card week-plan__panel">
                        <div className="week-plan__panel-title">
                            <h3>Daily targets</h3>
                        </div>
                        {targets.length ? (
                            <ul className="week-targets">
                                {targets.map((target) => <TargetRow key={target.id} target={target} />)}
                            </ul>
                        ) : (
                            <button type="button" className="week-plan__add" onClick={openSheet}>Add a daily target</button>
                        )}
                    </div>

                    <div className="ui-card week-plan__panel">
                        <div className="week-plan__panel-title">
                            <h3>Key tasks</h3>
                            {plan.keyTasks.length > 0 && <span>{doneTasks} of {plan.keyTasks.length}</span>}
                        </div>
                        {plan.keyTasks.length ? (
                            <ul className="week-plan__tasks">
                                {plan.keyTasks.map((task) => (
                                    <li key={task.id} className={`week-plan__task${task.done ? ' is-done' : ''}`}>
                                        <button
                                            type="button"
                                            className="task-check"
                                            aria-pressed={task.done}
                                            aria-label={task.done ? `Mark ${task.title} not done` : `Complete ${task.title}`}
                                            onClick={() => toggleTask(task.id)}
                                        >
                                            <span>{task.done && <Check size={13} strokeWidth={3.2} aria-hidden="true" />}</span>
                                        </button>
                                        <span className="week-plan__task-title">{task.title}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <button type="button" className="week-plan__add" onClick={openSheet}>Add key tasks</button>
                        )}
                    </div>
                </div>
            )}

            <WeekPlanSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                weekKey={weekKey}
                initial={draft}
                isNew={!plan}
                formKey={formKey}
            />
        </section>
    );
};

export default WeekPlanCard;
