import { SegmentedControl } from '../ui';
import { normalizeSchedulePriority, SCHEDULE_PRIORITIES } from '../utils/schedulePriority';

const PRIORITY_ITEMS = SCHEDULE_PRIORITIES.map(({ id, label }) => ({ id, label }));

// Settings-style row for picking a schedule block's priority, used inside a `.form-group`.
const SchedulePriorityField = ({ value, onChange }) => (
    <div className="form-field form-field--priority">
        <span className="form-field__label">Priority</span>
        <SegmentedControl
            items={PRIORITY_ITEMS}
            value={normalizeSchedulePriority(value)}
            onChange={onChange}
            ariaLabel="Priority"
            className="form-priority"
        />
    </div>
);

export default SchedulePriorityField;
