import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from '../../ui';
import { useWeekPlans } from '../../context/WeekPlanContext';
import { acceptSuggestion, dismissSuggestion, formatMinutes } from '../../utils/weekPlan';
import TargetLogSheet from './TargetLogSheet';
import TargetSuggestion from './TargetSuggestion';
import WeekPlanSheet from './WeekPlanSheet';
import WeekRow from './WeekRow';
import useWeekPlanModel from './useWeekPlanModel';
import './week-plan.css';

const MAX_SUGGESTIONS = 2;

/** Daily targets for the week, logged by hand, on the This week view. */
const WeekTargets = ({ weekKey, now }) => {
    const { savePlan } = useWeekPlans();
    const { isLoaded, plan, draft, targets } = useWeekPlanModel(weekKey, now);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [logTargetId, setLogTargetId] = useState(null);
    const [formKey, setFormKey] = useState(0);
    const [busyKey, setBusyKey] = useState(null);
    const logTarget = targets.find((target) => target.id === logTargetId) || null;

    const openSheet = () => {
        setFormKey((key) => key + 1);
        setSheetOpen(true);
    };
    const openLog = (targetId) => {
        setFormKey((key) => key + 1);
        setLogTargetId(targetId);
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
            ) : targets.length === 0 ? (
                <div className="week-empty-card">
                    <div>
                        <p className="week-empty-card__title">Set daily targets</p>
                        <p className="week-empty-card__text">Time goals like AI 2h or Study 1h a day. Log time as you go.</p>
                    </div>
                    <button type="button" className="ui-button ui-button--accent" onClick={openSheet}>Add Targets</button>
                </div>
            ) : (
                <div className="week-tracks">
                    {targets.map((target) => {
                        const done = target.today?.done || 0;
                        const extra = target.suggestions.length - MAX_SUGGESTIONS;
                        return (
                            <WeekRow
                                key={target.id}
                                color={target.color}
                                title={target.label}
                                subtitle={`${formatMinutes(target.minutes)} a day · ${target.daysMet} of 7 days`}
                                todayValue={formatMinutes(done)}
                                todayLabel={`of ${formatMinutes(target.minutes)} today`}
                                ratio={target.today?.ratio || 0}
                                days={target.days}
                                action={{ icon: Plus, label: `Log time for ${target.label}`, onClick: () => openLog(target.id) }}
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
                                {extra > 0 && <p className="week-suggest__more">{extra} more finished {extra === 1 ? 'block' : 'blocks'} to check</p>}
                            </WeekRow>
                        );
                    })}
                </div>
            )}

            <TargetLogSheet
                open={Boolean(logTarget)}
                onClose={() => setLogTargetId(null)}
                plan={plan}
                target={logTarget}
                formKey={formKey}
            />
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
