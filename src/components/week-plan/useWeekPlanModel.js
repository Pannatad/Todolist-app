import { useMemo } from 'react';
import { useTask } from '../../context/TaskContext';
import { useWeekPlans } from '../../context/WeekPlanContext';
import { buildTargetProgress, draftFromPreviousWeek } from '../../utils/weekPlan';

/** The week's daily targets with progress, for the This week view and the Today strip. */
export const useWeekPlanModel = (weekKey, now) => {
    const { getPlan, getPreviousPlan, isLoaded } = useWeekPlans();
    const { scheduleItems } = useTask();

    const plan = getPlan(weekKey);
    const previous = getPreviousPlan(weekKey);

    const targets = useMemo(
        () => buildTargetProgress({ plan, scheduleItems, now }),
        [plan, scheduleItems, now]
    );

    // What the targets sheet starts from: this week if saved, else last week's targets.
    const draft = useMemo(
        () => (plan?.targets.length ? plan : draftFromPreviousWeek(previous, weekKey)),
        [plan, previous, weekKey]
    );

    return { isLoaded, plan, previous, draft, targets };
};

export default useWeekPlanModel;
