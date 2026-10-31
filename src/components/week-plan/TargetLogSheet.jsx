import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Sheet, toast } from '../../ui';
import { useWeekPlans } from '../../context/WeekPlanContext';
import { formatMinutes, setLoggedMinutes } from '../../utils/weekPlan';

const STEP = 15;
const MAX_MINUTES = 600;
const QUICK_ADD = [15, 30, 60];

const dayName = (day, index, todayIndex) => {
    if (index === todayIndex) return 'Today';
    if (index === todayIndex - 1) return 'Yesterday';
    return day.date.toLocaleDateString([], { weekday: 'long' });
};

const TargetLogForm = ({ plan, target, onDone }) => {
    const { savePlan } = useWeekPlans();
    // Only days up to today can be logged.
    const todayIndex = Math.max(0, target.days.findIndex((day) => day.isToday));
    const loggableDays = target.days.slice(0, todayIndex + 1);
    const [dayIndex, setDayIndex] = useState(todayIndex);
    const day = loggableDays[dayIndex] || loggableDays[loggableDays.length - 1];
    const [minutes, setMinutes] = useState(day?.done || 0);
    const [saving, setSaving] = useState(false);

    const clamp = (value) => Math.max(0, Math.min(MAX_MINUTES, value));
    const changeDay = (index) => {
        setDayIndex(index);
        setMinutes(loggableDays[index]?.done || 0);
    };

    const submit = async (event) => {
        event.preventDefault();
        if (!day || saving) return;
        setSaving(true);
        try {
            await savePlan(setLoggedMinutes(plan, target.id, day.dateKey, minutes));
            toast(minutes > 0 ? `${formatMinutes(minutes)} logged for ${target.label}` : 'Logged time cleared');
            onDone();
        } catch (error) {
            toast(error.message || 'Could not save this time.', { tone: 'error' });
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="form-stack target-log">
            <div className="form-group">
                {loggableDays.length > 1 && (
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Day</span>
                        <select value={dayIndex} onChange={(event) => changeDay(Number(event.target.value))}>
                            {loggableDays.map((item, index) => (
                                <option key={item.dateKey} value={index}>{dayName(item, index, todayIndex)}</option>
                            ))}
                        </select>
                    </label>
                )}
                <div className="form-field">
                    <span className="form-field__label">Time</span>
                    <div className="target-log__stepper">
                        <button
                            type="button"
                            className="target-log__step"
                            onClick={() => setMinutes((value) => clamp(value - STEP))}
                            disabled={minutes <= 0}
                            aria-label={`${STEP} minutes less`}
                        >
                            <Minus size={16} strokeWidth={2.6} aria-hidden="true" />
                        </button>
                        <output className="target-log__value" aria-live="polite">{formatMinutes(minutes)}</output>
                        <button
                            type="button"
                            className="target-log__step"
                            onClick={() => setMinutes((value) => clamp(value + STEP))}
                            disabled={minutes >= MAX_MINUTES}
                            aria-label={`${STEP} minutes more`}
                        >
                            <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                        </button>
                    </div>
                </div>
                <div className="form-chips target-log__chips" role="group" aria-label="Quick add">
                    {QUICK_ADD.map((amount) => (
                        <button key={amount} type="button" className="form-chip" onClick={() => setMinutes((value) => clamp(value + amount))}>
                            +{formatMinutes(amount)}
                        </button>
                    ))}
                </div>
            </div>
            <p className="form-note">
                {formatMinutes(minutes)} of {formatMinutes(target.minutes)} {day?.isToday ? 'today' : 'that day'}
            </p>

            <button type="submit" className="ui-button ui-button--accent form-submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
            </button>
        </form>
    );
};

/** Set the time spent on a daily target for one day this week. */
const TargetLogSheet = ({ open, onClose, plan, target, formKey }) => (
    <Sheet
        open={open}
        onClose={onClose}
        title={target ? `Log ${target.label}` : 'Log time'}
        description="Set how much time you spent"
        className="form-sheet target-log-sheet"
    >
        {plan && target && <TargetLogForm key={formKey} plan={plan} target={target} onDone={onClose} />}
    </Sheet>
);

export default TargetLogSheet;
