import { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { toast } from '../../ui';
import { useWeekPlans } from '../../context/WeekPlanContext';
import { toLocalDateKey } from '../../utils/scheduleOccurrences';
import { formatMinutes, getWeekKey, setLoggedMinutes } from '../../utils/weekPlan';
import TargetStepper from './TargetStepper';
import WeekPlanSheet from './WeekPlanSheet';
import useWeekPlanModel from './useWeekPlanModel';
import './week-plan.css';

/** Today's daily targets on Today: a ring per target and a +/− stepper to log time. */
const WeekStrip = ({ now, onOpenWeek }) => {
    const weekKey = getWeekKey(now);
    const todayKey = toLocalDateKey(now);
    const { savePlan } = useWeekPlans();
    const { isLoaded, plan, draft, targets } = useWeekPlanModel(weekKey, now);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [formKey, setFormKey] = useState(0);

    if (!isLoaded) return null;

    const pending = targets.reduce((sum, target) => sum + target.suggestions.length, 0);
    const metCount = targets.filter((target) => target.today?.met).length;

    const logToday = async (target, minutes) => {
        if (!plan) return;
        try {
            await savePlan(setLoggedMinutes(plan, target.id, todayKey, minutes));
        } catch (error) {
            toast(error.message || 'Could not save that.', { tone: 'error' });
        }
    };

    return (
        <section aria-labelledby="today-targets-heading">
            <div className="ui-section-title">
                <h2 id="today-targets-heading">Targets</h2>
                {targets.length > 0 && <span>{metCount} of {targets.length}</span>}
            </div>

            <div className="ui-group">
                {targets.length === 0 ? (
                    <button type="button" className="wt-empty" onClick={() => { setFormKey((key) => key + 1); setSheetOpen(true); }}>
                        <Plus size={18} strokeWidth={2.4} aria-hidden="true" />
                        Add a daily target
                    </button>
                ) : (
                    <>
                        {targets.map((target) => {
                            const done = target.today?.done || 0;
                            return (
                                <div
                                    key={target.id}
                                    className="wt-today-row"
                                    style={{ '--row': target.color, '--p': Math.round((target.today?.ratio || 0) * 100) }}
                                >
                                    <span className="wt-ring" aria-hidden="true" />
                                    <span className="wt-today-row__copy">
                                        <span className="wt-today-row__title">{target.label}</span>
                                        <span className="wt-today-row__value">
                                            <strong>{formatMinutes(done)}</strong> / {formatMinutes(target.minutes)}
                                        </span>
                                    </span>
                                    <TargetStepper target={target} value={done} onChange={(minutes) => logToday(target, minutes)} />
                                </div>
                            );
                        })}
                        {pending > 0 && (
                            <button type="button" className="wt-today-row wt-today-row--link" onClick={onOpenWeek}>
                                <span className="wt-today-row__title">
                                    {pending} finished Plan {pending === 1 ? 'block' : 'blocks'} to confirm
                                </span>
                                <ChevronRight size={17} aria-hidden="true" />
                            </button>
                        )}
                    </>
                )}
            </div>

            <WeekPlanSheet
                open={sheetOpen}
                onClose={() => setSheetOpen(false)}
                weekKey={weekKey}
                initial={draft}
                isNew
                formKey={formKey}
            />
        </section>
    );
};

export default WeekStrip;
