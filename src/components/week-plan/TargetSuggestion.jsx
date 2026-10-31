import { CalendarCheck } from 'lucide-react';
import { formatMinutes } from '../../utils/weekPlan';
import { toLocalDateKey } from '../../utils/scheduleOccurrences';

const timeFormat = new Intl.DateTimeFormat([], { hour: 'numeric', minute: '2-digit' });
// "7:00 – 8:30 PM": shares AM/PM when both ends have it.
const timeRange = (start, end) => (
    typeof timeFormat.formatRange === 'function' ? timeFormat.formatRange(start, end) : `${timeFormat.format(start)}–${timeFormat.format(end)}`
);

const dayLabel = (dateKey, now) => {
    if (dateKey === toLocalDateKey(now)) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateKey === toLocalDateKey(yesterday)) return 'Yesterday';
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString([], { weekday: 'short' });
};

/** A finished Plan block that matches a target, waiting for Log or Skip. */
const TargetSuggestion = ({ suggestion, now, busy, onLog, onSkip }) => {
    const name = suggestion.extraCount > 0 ? `${suggestion.title} +${suggestion.extraCount}` : suggestion.title;
    const when = `${dayLabel(suggestion.dateKey, now)} ${timeRange(suggestion.start, suggestion.end)}`;
    return (
        <div className="wt-ask">
            <CalendarCheck size={15} strokeWidth={2.2} className="wt-ask__icon" aria-hidden="true" />
            <p className="wt-ask__text">
                <span className="wt-ask__name">{name}</span>
                <span className="wt-ask__when">{when}</span>
            </p>
            <button type="button" className="wt-ask__skip" onClick={onSkip} disabled={busy} aria-label={`Skip ${name}, not done`}>Skip</button>
            <button type="button" className="wt-ask__log" onClick={onLog} disabled={busy} aria-label={`Log ${formatMinutes(suggestion.minutes)} from ${name}`}>
                Log {formatMinutes(suggestion.minutes)}
            </button>
        </div>
    );
};

export default TargetSuggestion;
