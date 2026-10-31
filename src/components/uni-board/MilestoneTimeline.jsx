import { ChevronRight } from 'lucide-react';
import { formatRelativeDay, getDayUrgency, getItemKind } from './formatters';
import { KindMeta, SectionHeading } from './SectionHeading';

const monthLabel = (date) => new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date);

const MilestoneTimeline = ({ items, onSelect, now }) => (
  <section className="uni-board-milestones" aria-labelledby="uni-board-milestones-title">
    <SectionHeading id="uni-board-milestones-title" title="Milestones" />
    {items.length > 0 ? (
      <ol className="ui-group uni-board-milestone-list">
        {items.slice(0, 6).map((item) => (
          <li key={item.key}>
            <button type="button" className="uni-board-milestone" onClick={() => onSelect(item)}>
              <span className="uni-board-milestone__date" aria-hidden="true">
                <small>{monthLabel(item.occursAt)}</small>
                <strong>{item.occursAt.getDate()}</strong>
              </span>
              <span className="uni-board-item-copy">
                <strong>{item.title}</strong>
                <KindMeta
                  kind={getItemKind(item)}
                  detail={formatRelativeDay(item.occursAt, now)}
                  detailClassName={`uni-due-text is-${getDayUrgency(item.occursAt, now)}`}
                />
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
