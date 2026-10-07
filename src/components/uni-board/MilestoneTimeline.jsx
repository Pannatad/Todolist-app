import { ChevronRight, Flag } from 'lucide-react';
import { formatShortDate, formatTimeRemaining, itemLabel } from './formatters';

const MilestoneTimeline = ({ items, onSelect, now }) => (
  <section className="uni-board-milestones" aria-labelledby="uni-board-milestones-title">
    <div className="ui-section-title">
      <h2 id="uni-board-milestones-title">Milestones</h2>
    </div>
    {items.length > 0 ? (
      <ol className="ui-group uni-board-milestone-list">
        {items.slice(0, 6).map((item) => (
          <li key={item.key}>
            <button type="button" className="uni-board-milestone" onClick={() => onSelect(item)}>
              <span className="uni-board-milestone__marker" aria-hidden="true"><Flag size={15} /></span>
              <span className="uni-board-item-copy">
                <strong>{item.title}</strong>
                <span>{formatShortDate(item.occursAt)} · {itemLabel(item)} · {formatTimeRemaining(item.occursAt, now)}</span>
              </span>
              <ChevronRight size={17} className="uni-board-milestone__chevron" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    ) : <p className="ui-empty-card">Exams and key deadlines show up here.</p>}
  </section>
);

export default MilestoneTimeline;
