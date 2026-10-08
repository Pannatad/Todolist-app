import { useState } from 'react';
import { getColorForSubject } from '../../constants/subjects';
import { timeRange } from './weeklyFormat';

const WeekSchedule = ({ days, onOpen }) => {
  const [expandedDays, setExpandedDays] = useState(new Set());
  const toggleDay = (key) => setExpandedDays((current) => {
    const next = new Set(current);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  });
  return (
    <section className="week-schedule" aria-labelledby="week-schedule-title">
      <div className="week-section-heading"><h2 id="week-schedule-title">Fixed schedule</h2></div>
      <div className="week-schedule-scroll" tabIndex={0} role="region" aria-label="Monday to Sunday schedule; scroll horizontally for more days">
        <div className="week-schedule-grid">
          {days.map((day) => (
            <section className={`week-day${day.isToday ? ' is-today' : ''}`} key={day.dateKey} aria-label={day.date.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}>
              <header className="week-day-heading"><span>{day.date.toLocaleDateString([], { weekday: 'short' })}</span><time dateTime={day.dateKey}>{day.date.getDate()}</time>{day.isToday && <span className="week-today-label">Today</span>}</header>
              {day.items.length === 0 ? <p className="week-day-empty">No commitments</p> : (
                <ul className="week-list week-day-list" id={`week-day-${day.dateKey}`}>
                  {(expandedDays.has(day.dateKey) ? day.items : day.items.slice(0, 3)).map((item) => (
                    <li key={item.key}>
                      <button type="button" className="week-event-open" onClick={() => onOpen(item.record)}>
                        <span className="week-dot" style={{ backgroundColor: item.record.color || getColorForSubject(item.subject).color }} aria-hidden="true" />
                        <span className="week-event-copy"><strong>{item.title}</strong><span>{timeRange(item)}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {day.items.length > 3 && <button type="button" className="week-text-button week-day-more" aria-controls={`week-day-${day.dateKey}`} aria-expanded={expandedDays.has(day.dateKey)} onClick={() => toggleDay(day.dateKey)}>{expandedDays.has(day.dateKey) ? 'Show fewer' : `+${day.items.length - 3} more`}</button>}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WeekSchedule;
