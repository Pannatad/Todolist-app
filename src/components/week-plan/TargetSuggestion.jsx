import { formatMinutes } from '../../utils/weekPlan';
import { toLocalDateKey } from '../../utils/scheduleOccurrences';

const timeLabel = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const dayLabel = (dateKey, now) => {
    if (dateKey === toLocalDateKey(now)) return 'Today';
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateKey === toLocalDateKey(yesterday)) return 'Yesterday';
    const [year, month, day] = dateKey.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString([], { weekday: 'long' });
};

/** A finished Plan block that matches a target: the user confirms or skips it. */
const TargetSuggestion = ({ suggestion, now, busy, onLog, onSkip }) => {
    const name = suggestion.extraCount > 0 ? `${suggestion.title} + ${suggestion.extraCount} more` : suggestion.title;
    return (
        <div className="week-suggest">
            <div className="week-suggest__copy">
                <p className="week-suggest__title">Did you do {name}?</p>
                <p className="week-suggest__meta">
                    {dayLabel(suggestion.dateKey, now)} · {timeLabel(suggestion.start)}–{timeLabel(suggestion.end)} · {formatMinutes(suggestion.minutes)}
                </p>
            </div>
            <div className="week-suggest__actions">
                <button type="button" className="week-suggest__skip" onClick={onSkip} disabled={busy}>Not done</button>
                <button type="button" className="week-suggest__log" onClick={onLog} disabled={busy}>Log {formatMinutes(suggestion.minutes)}</button>
            </div>
        </div>
    );
};

export default TargetSuggestion;
