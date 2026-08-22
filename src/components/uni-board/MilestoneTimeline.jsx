import { CalendarDays, Flag } from 'lucide-react';
import { formatShortDate, formatTimeRemaining, itemLabel } from './formatters';

const MilestoneTimeline = ({ items, onSelect, now }) => (
  <section className="uni-board-section uni-board-milestones" aria-labelledby="uni-board-milestones-title">
    <div className="uni-board-section-heading">
      <div>
        <p className="uni-board-kicker">Semester view</p>
        <h2 id="uni-board-milestones-title">Milestones</h2>
      </div>
      <CalendarDays size={19} aria-hidden="true" className="uni-board-section-icon" />
    </div>
    {items.length > 0 ? (
      <ol className="uni-board-milestone-list">
        {items.slice(0, 6).map((item) => (
          <li key={item.key}>
            <button type="button" className="uni-board-milestone" onClick={() => onSelect(item)}>
              <span className="uni-board-milestone__marker" aria-hidden="true"><Flag size={15} /></span>
              <span className="uni-board-item-copy">
                <strong>{item.title}</strong>
                <span>{formatShortDate(item.occursAt)} · {itemLabel(item)} · {item.subject || 'University'} · {formatTimeRemaining(item.occursAt, now)}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    ) : <p className="uni-board-quiet-empty">Mark key deadlines or exams as milestones.</p>}
  </section>
);

export default MilestoneTimeline;
