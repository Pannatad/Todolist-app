import { Check } from 'lucide-react';

const STATUS_TEXT = {
    met: 'done',
    missed: 'missed',
    today: 'today',
    open: 'ahead',
    off: 'rest day',
};

const weekdayLetter = (date) => date.toLocaleDateString([], { weekday: 'narrow' });
const weekdayName = (date) => date.toLocaleDateString([], { weekday: 'long' });

/**
 * One daily target or habit: its color, today's progress in large type, a
 * progress bar, and a ring for each day of the week (filled when done).
 * Targets and habits share this layout so the week reads as one list.
 */
const WeekRow = ({
    color,
    title,
    subtitle,
    todayValue,
    todayLabel,
    ratio = 0,
    days = [],
    metText = 'done',
    action,
    children,
}) => {
    const ActionIcon = action?.icon;
    return (
    <article className="week-track" style={{ '--row': color }}>
        <div className="week-track__head">
            <span className="week-track__swatch" aria-hidden="true" />
            <div className="week-track__titles">
                <h3 className="week-track__title">{title}</h3>
                {subtitle && <p className="week-track__subtitle">{subtitle}</p>}
            </div>
            <div className="week-track__today">
                <span className="week-track__today-value">{todayValue}</span>
                {todayLabel && <span className="week-track__today-label">{todayLabel}</span>}
            </div>
            {action && (
                <button
                    type="button"
                    className={`week-track__action${action.pressed ? ' is-pressed' : ''}`}
                    onClick={action.onClick}
                    aria-label={action.label}
                    aria-pressed={action.pressed === undefined ? undefined : action.pressed}
                    disabled={action.disabled}
                >
                    <ActionIcon size={20} strokeWidth={2.8} aria-hidden="true" />
                </button>
            )}
        </div>

        <div className={`week-track__bar${ratio >= 1 ? ' is-full' : ''}`} aria-hidden="true">
            <span style={{ width: `${Math.round(Math.min(1, ratio) * 100)}%` }} />
        </div>

        <ol className="week-track__days" aria-label={`${title} this week`}>
            {days.map((day) => {
                const text = day.status === 'met' ? metText : STATUS_TEXT[day.status];
                return (
                    <li key={day.dateKey} className={`week-track-day is-${day.status}${day.isToday ? ' is-today' : ''}`} title={`${weekdayName(day.date)}: ${text}`}>
                        <span className="week-track-day__letter" aria-hidden="true">{weekdayLetter(day.date)}</span>
                        <span className="week-track-day__ring" style={{ '--p': Math.round((day.ratio || 0) * 100) }} aria-hidden="true">
                            {day.status === 'met' && <Check size={13} strokeWidth={3.4} />}
                        </span>
                        <span className="sr-only">{weekdayName(day.date)}: {text}</span>
                    </li>
                );
            })}
        </ol>

        {children}
    </article>
    );
};

export default WeekRow;
