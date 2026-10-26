const STATUS_TEXT = {
    met: 'done',
    missed: 'missed',
    today: 'today',
    planned: 'planned',
    open: 'not planned yet',
};

const weekday = (date) => date.toLocaleDateString([], { weekday: 'long' });

/**
 * Seven dots, Monday to Sunday. Filled = done, ring = today,
 * dashed ring = enough time planned, faint = missed or still open.
 */
const WeekDots = ({ days = [], label, color, metText = 'done' }) => (
    <ol className="week-dots" aria-label={label} style={color ? { '--dot': color } : undefined}>
        {days.map((day) => {
            const text = day.status === 'met' ? metText : STATUS_TEXT[day.status];
            return (
                <li key={day.dateKey} className={`week-dots__dot is-${day.status}`} title={`${weekday(day.date)}: ${text}`}>
                    <span className="sr-only">{weekday(day.date)}: {text}</span>
                </li>
            );
        })}
    </ol>
);

export default WeekDots;
