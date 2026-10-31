import { Minus, Plus } from 'lucide-react';
import { formatMinutes, targetStep } from '../../utils/weekPlan';

const MAX_MINUTES = 24 * 60;

/**
 * iOS-style − | + stepper that changes today's logged time for a target
 * right in the row: each tap saves at once, no sheet to open.
 */
const TargetStepper = ({ target, value = 0, onChange }) => {
    const step = targetStep(target.minutes);
    return (
        <div className="wt-stepper" role="group" aria-label={`Time logged for ${target.label} today: ${formatMinutes(value)}`}>
            <button
                type="button"
                onClick={() => onChange(Math.max(0, value - step))}
                disabled={value <= 0}
                aria-label={`Remove ${formatMinutes(step)} from ${target.label}`}
            >
                <Minus size={16} strokeWidth={2.6} aria-hidden="true" />
            </button>
            <span className="wt-stepper__divider" aria-hidden="true" />
            <button
                type="button"
                onClick={() => onChange(Math.min(MAX_MINUTES, value + step))}
                disabled={value >= MAX_MINUTES}
                aria-label={`Add ${formatMinutes(step)} to ${target.label}`}
            >
                <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
            </button>
        </div>
    );
};

export default TargetStepper;
