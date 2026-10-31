import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Sheet, toast } from '../../ui';
import { useWeekPlans } from '../../context/WeekPlanContext';
import {
    MAX_TARGETS,
    TARGET_MINUTE_OPTIONS,
    formatMinutes,
    getWeekDays,
    pickDistinctColors,
} from '../../utils/weekPlan';

const newId = () => globalThis.crypto?.randomUUID?.() || `id_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const rangeLabel = (weekKey) => {
    const days = getWeekDays(weekKey);
    const format = (date) => date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${format(days[0])} – ${format(days[6])}`;
};

const blankTarget = (taken) => ({ id: newId(), label: '', minutes: 60, color: pickDistinctColors([null], taken)[0] });

const WeekPlanForm = ({ weekKey, initial, onDone }) => {
    const { savePlan } = useWeekPlans();
    const [targets, setTargets] = useState(initial.targets.length ? initial.targets : [blankTarget([])]);
    const [saving, setSaving] = useState(false);

    const updateTarget = (id, changes) => setTargets((current) => current.map((target) => target.id === id ? { ...target, ...changes } : target));
    const removeTarget = (id) => setTargets((current) => current.filter((target) => target.id !== id));
    const addTarget = () => setTargets((current) => [...current, blankTarget(current.map((target) => target.color))]);

    const submit = async (event) => {
        event.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            // Keeps everything else stored on the week (logged time, older fields) as it was.
            await savePlan({ ...initial, weekStart: weekKey, targets });
            toast('Targets saved');
            onDone();
        } catch (error) {
            toast(error.message || 'Could not save targets.', { tone: 'error' });
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="form-stack week-plan-form">
            <div className="form-group">
                {targets.map((target, index) => {
                    const minuteOptions = TARGET_MINUTE_OPTIONS.includes(target.minutes)
                        ? TARGET_MINUTE_OPTIONS
                        : [...TARGET_MINUTE_OPTIONS, target.minutes].sort((a, b) => a - b);
                    return (
                        <div key={target.id} className="form-field week-plan-form__target">
                            <button
                                type="button"
                                className="form-remove"
                                onClick={() => removeTarget(target.id)}
                                aria-label={`Remove ${target.label || `target ${index + 1}`}`}
                            >
                                <Minus size={14} strokeWidth={3} aria-hidden="true" />
                            </button>
                            <span className="week-plan-form__swatch" style={{ '--row': target.color }} aria-hidden="true" />
                            <input
                                type="text"
                                value={target.label}
                                onChange={(event) => updateTarget(target.id, { label: event.target.value })}
                                placeholder={index === 0 ? 'AI' : 'Study'}
                                aria-label={`Target ${index + 1} name`}
                                maxLength={40}
                                autoFocus={!initial.targets.length && index === 0}
                            />
                            <select
                                value={target.minutes}
                                onChange={(event) => updateTarget(target.id, { minutes: Number(event.target.value) })}
                                aria-label={`Minutes a day for ${target.label || `target ${index + 1}`}`}
                            >
                                {minuteOptions.map((minutes) => <option key={minutes} value={minutes}>{formatMinutes(minutes)} a day</option>)}
                            </select>
                        </div>
                    );
                })}
                {targets.length < MAX_TARGETS && (
                    <button type="button" className="form-field form-option week-plan-form__add" onClick={addTarget}>
                        <Plus size={17} strokeWidth={2.4} aria-hidden="true" />
                        <span>Add target</span>
                    </button>
                )}
            </div>
            <p className="form-note">
                You log time yourself. When a finished Plan block matches a target by name or category, you're asked whether to log it.
            </p>

            <button type="submit" className="ui-button ui-button--accent form-submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
            </button>
        </form>
    );
};

/** Sheet for setting the week's daily targets. */
const WeekPlanSheet = ({ open, onClose, weekKey, initial, isNew, formKey }) => (
    <Sheet
        open={open}
        onClose={onClose}
        title={isNew ? 'Set daily targets' : 'Daily targets'}
        description={weekKey ? rangeLabel(weekKey) : undefined}
        className="form-sheet week-plan-sheet"
    >
        {weekKey && <WeekPlanForm key={formKey} weekKey={weekKey} initial={initial} onDone={onClose} />}
    </Sheet>
);

export default WeekPlanSheet;
