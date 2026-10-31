import { useState } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { dateFromKey, formatMinutes, getWeekKey, getWeekNumber } from '../../utils/weekPlan';
import TargetLogSheet from './TargetLogSheet';
import WeekPlanSheet from './WeekPlanSheet';
import useWeekPlanModel from './useWeekPlanModel';
import './week-plan.css';

const percent = (minutes, goal) => `${Math.min(100, Math.round((minutes / Math.max(1, goal)) * 100))}%`;

/** Today's daily targets at a glance on Today, each with a "+" to log time. */
const WeekStrip = ({ now, onOpenWeek }) => {
    const weekKey = getWeekKey(now);
    const { isLoaded, plan, draft, targets } = useWeekPlanModel(weekKey, now);
    const [sheetOpen, setSheetOpen] = useState(false);
    const [logTargetId, setLogTargetId] = useState(null);
    const [formKey, setFormKey] = useState(0);

    if (!isLoaded) return null;

    if (!targets.length) {
        return (
            <>
                <button
                    type="button"
                    className="week-strip week-strip--empty"
                    onClick={() => { setFormKey((key) => key + 1); setSheetOpen(true); }}
                >
                    <span className="week-strip__theme">Set daily targets</span>
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

    const logTarget = targets.find((target) => target.id === logTargetId) || null;
    const pending = targets.reduce((sum, target) => sum + target.suggestions.length, 0);
    const openLog = (targetId) => {
        setFormKey((key) => key + 1);
        setLogTargetId(targetId);
    };

    return (
        <div className="week-strip">
            <button type="button" className="week-strip__top" onClick={onOpenWeek} aria-label="Open this week">
                <span className="week-strip__theme">Daily targets</span>
                <span className="week-strip__week">
                    Week {getWeekNumber(dateFromKey(weekKey))}
                    <ChevronRight size={16} aria-hidden="true" />
                </span>
            </button>

            <div className="week-strip__targets">
                {targets.map((target) => {
                    const done = target.today?.done || 0;
                    const met = done >= target.minutes;
                    return (
                        <div key={target.id} className="week-strip__target" style={{ '--row': target.color }}>
                            <div className="week-strip__target-main">
                                <span className="week-strip__target-head">
                                    <span className="week-strip__label">{target.label}</span>
                                    <span>{formatMinutes(done)} of {formatMinutes(target.minutes)}</span>
                                </span>
                                <span className={`week-strip__bar${met ? ' is-met' : ''}`} aria-hidden="true">
                                    <span className="week-strip__bar-done" style={{ width: percent(done, target.minutes) }} />
                                </span>
                            </div>
                            <button
                                type="button"
                                className="week-log-button"
                                onClick={() => openLog(target.id)}
                                aria-label={`Log time for ${target.label}`}
                            >
                                <span><Plus size={15} strokeWidth={2.8} aria-hidden="true" /></span>
                            </button>
                        </div>
                    );
                })}
            </div>

            {pending > 0 && (
                <button type="button" className="week-strip__pending" onClick={onOpenWeek}>
                    <span>{pending} finished Plan {pending === 1 ? 'block' : 'blocks'} to confirm</span>
                    <ChevronRight size={16} aria-hidden="true" />
                </button>
            )}

            <TargetLogSheet
                open={Boolean(logTarget)}
                onClose={() => setLogTargetId(null)}
                plan={plan}
                target={logTarget}
                formKey={formKey}
            />
        </div>
    );
};

export default WeekStrip;
