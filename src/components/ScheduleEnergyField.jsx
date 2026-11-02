import { SegmentedControl } from '../ui';
import { SCHEDULE_ENERGY, scheduleEnergyOf } from '../utils/scheduleEnergy';

// Segments keyed by color, since a block stores its energy level as its color.
const ENERGY_ITEMS = SCHEDULE_ENERGY.map(({ label, color }) => ({
    id: color,
    label: (
        <span className="energy-option">
            <i style={{ '--energy': color }} aria-hidden="true" />
            {label}
        </span>
    )
}));

// Segmented picker with nothing selected for blocks still on an old, unrated color.
export const ScheduleEnergyControl = ({ value, onChange, className = 'form-priority' }) => (
    <SegmentedControl
        items={ENERGY_ITEMS}
        value={scheduleEnergyOf(value)?.color ?? null}
        onChange={onChange}
        ariaLabel="Energy"
        className={`${className} form-energy`}
        allowEmpty
    />
);

// Settings-style row for picking how a block affects your energy, used inside a `.form-group`.
const ScheduleEnergyField = ({ value, onChange }) => (
    <div className="form-field form-field--priority">
        <span className="form-field__label">Energy</span>
        <ScheduleEnergyControl value={value} onChange={onChange} />
    </div>
);

export default ScheduleEnergyField;
