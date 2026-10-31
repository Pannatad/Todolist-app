import { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { formatMinutes, getWeekKey } from '../../utils/weekPlan';
import TargetLogSheet from './TargetLogSheet';
import WeekPlanSheet from './WeekPlanSheet';
import useWeekPlanModel from './useWeekPlanModel';
import './week-plan.css';

/** Today's daily targets on Today: a ring per target, tap a row to log time. */
const WeekStrip = ({ now, onOpenWeek }) => {
    const weekKey = getWeekKey(now);
    const { isLoaded, plan, draft, targets } = useWeekPlanModel(weekKey, now);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [logTargetId, setLogTargetId] = useState(null);
    const [formKey, setFormKey] = useState(0);

    if (!isLoaded) return null;

    const logTarget = targets.find((target) => target.id === logTargetId) || null;
    const pending = targets.reduce((sum, target) => sum + target.suggestions.length, 0);
    const metCount = targets.filter((target) => target.today?.met).length;
    const openLog = (targetId) => {
        setFormKey((key) => key + 1);
        setLogTargetId(targetId);
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
                                <button
                                    key={target.id}
                                    type="button"
                                    className="wt-today-row"
                                    style={{ '--row': target.color, '--p': Math.round((target.today?.ratio || 0) * 100) }}
                                    onClick={() => openLog(target.id)}
                                    aria-label={`${target.label}: ${formatMinutes(done)} of ${formatMinutes(target.minutes)} today. Log time.`}
                                >
                                    <span className="wt-ring" aria-hidden="true" />
                                    <span className="wt-today-row__title">{target.label}</span>
                                    <span className="wt-today-row__value">
                                        <strong>{formatMinutes(done)}</strong> / {formatMinutes(target.minutes)}
                                    </span>
                                </button>
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
                isNew
                formKey={formKey}
            />
        </section>
    );
};

export default WeekStrip;
