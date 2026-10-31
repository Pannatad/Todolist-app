import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from '../../ui';
import { useWeekPlans } from '../../context/WeekPlanContext';
import { acceptSuggestion, dismissSuggestion, formatMinutes, getWeekDays, setLoggedMinutes } from '../../utils/weekPlan';
import { toLocalDateKey } from '../../utils/scheduleOccurrences';
import TargetStepper from './TargetStepper';
import TargetSuggestion from './TargetSuggestion';
import WeekPlanSheet from './WeekPlanSheet';
import WeekRow, { WeekDaysHead } from './WeekRow';
import useWeekPlanModel from './useWeekPlanModel';
import './week-plan.css';

const MAX_SUGGESTIONS = 2;

/** Daily targets for the week, logged by hand, on the This week view. */
const WeekTargets = ({ weekKey, now }) => {
    const { savePlan } = useWeekPlans();
    const { isLoaded, plan, draft, targets } = useWeekPlanModel(weekKey, now);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);
    const [busyKey, setBusyKey] = useState(null);
    const todayKey = toLocalDateKey(now);
    const headDays = getWeekDays(weekKey).map((date) => ({ date, dateKey: toLocalDateKey(date), isToday: toLocalDateKey(date) === todayKey }));

    const openSheet = () => {
        setFormKey((key) => key + 1);
        setSheetOpen(true);
    };

    const logToday = async (target, minutes) => {
        if (!plan) return;
        try {
            await savePlan(setLoggedMinutes(plan, target.id, todayKey, minutes));
        } catch (error) {
            toast(error.message || 'Could not save that.', { tone: 'error' });
        }
    };

    const answer = async (target, suggestion, didIt) => {
        if (!plan || busyKey) return;
        setBusyKey(suggestion.key);
        try {
            await savePlan(didIt
                ? acceptSuggestion(plan, target.id, suggestion)
                : dismissSuggestion(plan, target.id, suggestion.key));
            if (didIt) toast(`${formatMinutes(suggestion.minutes)} logged for ${target.label}`);
        } catch (error) {
            toast(error.message || 'Could not save that.', { tone: 'error' });
        } finally {
            setBusyKey(null);
        }
    };

    return (
        <section className="week-block" aria-labelledby="week-targets-heading">
            <div className="week-section-heading">
                <h2 id="week-targets-heading">Daily targets</h2>
                {targets.length > 0 && <button type="button" className="week-text-button" onClick={openSheet}>Edit</button>}
            </div>

            {!isLoaded ? (
                <div className="week-skeleton" aria-hidden="true"><span /><span /></div>
            ) : (
                <div className="wt-list">
                    {targets.length === 0 ? (
                        <button type="button" className="wt-empty" onClick={openSheet}>
                            <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
                            Add a daily target
                        </button>
                    ) : (
                        <>
                            <WeekDaysHead days={headDays} />
                            {targets.map((target) => {
                                const done = target.today?.done || 0;
                                const extra = target.suggestions.length - MAX_SUGGESTIONS;
                                return (
                                    <WeekRow
                                        key={target.id}
                                        color={target.color}
                                        title={target.label}
                                        days={target.days}
                                        meta={<span><strong>{formatMinutes(done)}</strong> / {formatMinutes(target.minutes)}</span>}
                                        summary={`${target.daysMet} of 7 days met this week`}
                                        action={<TargetStepper target={target} value={done} onChange={(minutes) => logToday(target, minutes)} />}
                                    >
                                        {target.suggestions.slice(0, MAX_SUGGESTIONS).map((suggestion) => (
                                            <TargetSuggestion
                                                key={suggestion.key}
                                                suggestion={suggestion}
                                                now={now}
                                                busy={busyKey === suggestion.key}
                                                onLog={() => answer(target, suggestion, true)}
                                                onSkip={() => answer(target, suggestion, false)}
                                            />
                                        ))}
                                        {extra > 0 && <p className="wt-ask__more">{extra} more to check</p>}
                                    </WeekRow>
                                );
                            })}
                        </>
                    )}
                </div>
            )}

            <WeekPlanSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                weekKey={weekKey}
                initial={draft}
                isNew={!plan?.targets.length}
                formKey={formKey}
            />
        </section>
    );
};

export default WeekTargets;
