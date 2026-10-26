import { useMemo } from 'react';
import { useHabit } from '../../context/HabitContext';
import { useTask } from '../../context/TaskContext';
import { useWeekPlans } from '../../context/WeekPlanContext';
import { buildHabitWeek, buildTargetProgress, draftFromPreviousWeek } from '../../utils/weekPlan';

/** Everything the week card and the Today strip show for one week. */
export const useWeekPlanModel = (weekKey, now) => {
    const { getPlan, getPreviousPlan, isLoaded } = useWeekPlans();
    const { habits, getHabitLog } = useHabit();
    const { scheduleItems } = useTask();

    const plan = getPlan(weekKey);
    const previous = getPreviousPlan(weekKey);

    const targets = useMemo(
        () => buildTargetProgress({ plan, scheduleItems, now }),
        [plan, scheduleItems, now]
    );

    const buildHabit = plan?.buildHabitId ? habits.find((habit) => habit.id === plan.buildHabitId) || null : null;
    const breakHabit = plan?.breakHabitId ? habits.find((habit) => habit.id === plan.breakHabitId) || null : null;

    const buildWeek = useMemo(
        () => buildHabitWeek({ habit: buildHabit, weekStart: weekKey, getLog: getHabitLog, now }),
        [buildHabit, weekKey, getHabitLog, now]
    );
    const breakWeek = useMemo(
        () => buildHabitWeek({ habit: breakHabit, weekStart: weekKey, getLog: getHabitLog, now }),
        [breakHabit, weekKey, getHabitLog, now]
    );

    // What the planning sheet starts from: this week if saved, else a copy of last week.
    const draft = useMemo(
        () => plan || draftFromPreviousWeek(previous, weekKey),
        [plan, previous, weekKey]
    );

    return { isLoaded, plan, previous, draft, targets, buildHabit, breakHabit, buildWeek, breakWeek };
};

export default useWeekPlanModel;
