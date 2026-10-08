import { useState } from 'react';
import { CalendarDays, GraduationCap } from 'lucide-react';
import { shortDate, kindLabel } from './weeklyFormat';

const WeekMilestones = ({ items, onOpen }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <section className="week-milestones" aria-labelledby="week-milestones-title">
      <div className="week-section-heading"><h2 id="week-milestones-title">Upcoming milestones</h2></div>
      <p className="week-section-description">Next 14 days</p>
      {items.length === 0 ? <p className="week-empty">No exams or university events coming up.</p> : (
        <ul className="week-list" id="week-milestone-list">
          {(expanded ? items : items.slice(0, 4)).map((item) => {
            const Icon = ['exam', 'quiz'].includes(item.kind) ? GraduationCap : CalendarDays;
            return (
              <li key={item.key}>
                <button type="button" className="week-milestone-open" onClick={() => onOpen(item)}>
                  <Icon size={18} aria-hidden="true" className="week-milestone-icon" />
                  <span className="week-milestone-copy"><strong>{item.title}</strong><span>{[item.subject, kindLabel(item.kind)].filter(Boolean).join(' · ')}</span></span>
                  <span className="week-milestone-date"><time dateTime={item.dateKey}>{shortDate(item.occursAt)}</time><span className={item.daysAway <= 2 ? 'week-soon' : ''}>{item.daysAway === 0 ? 'Today' : item.daysAway === 1 ? 'Tomorrow' : `${item.daysAway} days away`}</span></span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {items.length > 4 && <button type="button" className="week-text-button" aria-controls="week-milestone-list" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer milestones' : `Show all ${items.length} milestones`}</button>}
    </section>
  );
};

export default WeekMilestones;
