const weekdayLetter = (date) => date.toLocaleDateString([], { weekday: 'narrow' });

/** Weekday letters once, above the rows of a week list. */
export const WeekDaysHead = ({ days }) => (
    <div className="wt-head" aria-hidden="true">
        <span className="wt-head__days">
            {days.map((day) => (
                <span key={day.dateKey} className={day.isToday ? 'is-today' : undefined}>{weekdayLetter(day.date)}</span>
            ))}
        </span>
    </div>
);

const RowContent = ({ title, meta, trailing, days, summary }) => (
    <>
        <span className="wt-row__name">
            <span className="wt-row__dot" aria-hidden="true" />
            <span className="wt-row__title">{title}</span>
        </span>
        <span className="wt-row__meta">
            {meta}
            {trailing}
        </span>
        <span className="wt-row__days" aria-hidden="true">
            {days.map((day) => (
                <span
                    key={day.dateKey}
                    className={`wt-day is-${day.status}${day.isToday ? ' is-today' : ''}`}
                    style={{ '--p': Math.round((day.ratio || 0) * 100) }}
                />
            ))}
        </span>
        {summary && <span className="sr-only">{summary}</span>}
    </>
);

/**
 * One daily target or habit in a week list: colored dot and name, today's
 * value on the right, and a dot per day (filled when done, partly drawn for
 * partial days). Pass onPress to make the whole row a button, or `action`
 * for a separate control (a row button can't hold another button).
 */
const WeekRow = ({ color, title, meta, trailing, action, days = [], summary, onPress, pressLabel, children }) => (
    <div className="wt-item" style={{ '--row': color }}>
        {onPress ? (
            <button type="button" className="wt-row" onClick={onPress} aria-label={pressLabel}>
                <RowContent title={title} meta={meta} trailing={trailing} days={days} summary={summary} />
            </button>
        ) : (
            <div className="wt-row">
                <RowContent title={title} meta={meta} trailing={action} days={days} summary={summary} />
            </div>
        )}
        {children}
    </div>
);

export default WeekRow;
