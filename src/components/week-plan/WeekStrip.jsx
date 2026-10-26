import { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useHabit } from '../../context/HabitContext';
import { toLocalDateKey } from '../../utils/scheduleOccurrences';
import { dateFromKey, formatMinutes, getWeekKey, getWeekNumber } from '../../utils/weekPlan';
import WeekPlanSheet from './WeekPlanSheet';
import useWeekPlanModel from './useWeekPlanModel';
import './week-plan.css';

const percent = (minutes, goal) => `${Math.min(100, Math.round((minutes / Math.max(1, goal)) * 100))}%`;

const HabitChip = ({ kind, habit, done }) => (
    <span className={`week-strip__chip${done ? ' is-done' : ''}`}>
        {done && <Check size={12} strokeWidth={3} aria-hidden="true" />}
        <span>{kind} · {habit.name}</span>
        {done && <span className="sr-only">, {kind === 'Break' ? 'clean today' : 'done today'}</span>}
    </span>
);

/** The week at a glance on Today: direction, today's targets, and the habit pair. */
const WeekStrip = ({ now, onOpenWeek }) => {
    const weekKey = getWeekKey(now);
    const todayKey = toLocalDateKey(now);
    const { getHabitLog } = useHabit();
    const { isLoaded, plan, draft, targets, buildHabit, breakHabit } = useWeekPlanModel(weekKey, now);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);

    if (!isLoaded) return null;

    if (!plan) {
        return (
            <>
                <button
                    type="button"
                    className="week-strip week-strip--empty"
                    onClick={() => { setFormKey((key) => key + 1); setSheetOpen(true); }}
                >
                    <span className="week-strip__theme">Plan this week</span>
                    <ChevronRight size={18} aria-hidden="true" />
                </button>
                <WeekPlanSheet
                    open={sheetOpen}
                    onClose={() => setSheetOpen(false)}
                    weekKey={weekKey}
                    initial={draft}
                    isNew
                    formKey={formKey}
                />
            </>
        );
    }

    const doneToday = (habit) => getHabitLog(habit.id, todayKey)?.completed === true;

    return (
        <button type="button" className="week-strip" onClick={onOpenWeek} aria-label={`This week: ${plan.theme || 'week plan'}. Open the week.`}>
            <span className="week-strip__top">
                <span className="week-strip__theme">{plan.theme || 'This week'}</span>
                <span className="week-strip__week">Week {getWeekNumber(dateFromKey(weekKey))}</span>
            </span>

            {targets.length > 0 && (
                <span className="week-strip__targets">
                    {targets.map((target) => {
                        const done = target.today?.done || 0;
                        const planned = target.today?.planned || 0;
                        const met = done >= target.minutes;
                        return (
                            <span key={target.id}>
                                <span className="week-strip__target-head">
                                    <span>{target.label}</span>
                                    <span>{formatMinutes(done)} of {formatMinutes(target.minutes)}</span>
                                </span>
                                <span className={`week-strip__bar${met ? ' is-met' : ''}`} aria-hidden="true">
                                    <span className="week-strip__bar-planned" style={{ width: percent(done + planned, target.minutes) }} />
                                    <span className="week-strip__bar-done" style={{ width: percent(done, target.minutes) }} />
                                </span>
                            </span>
                        );
                    })}
                </span>
            )}

            {(buildHabit || breakHabit) && (
                <span className="week-strip__habits">
                    {buildHabit && <HabitChip kind="Build" habit={buildHabit} done={doneToday(buildHabit)} />}
                    {breakHabit && <HabitChip kind="Break" habit={breakHabit} done={doneToday(breakHabit)} />}
                </span>
            )}
        </button>
    );
};

export default WeekStrip;
