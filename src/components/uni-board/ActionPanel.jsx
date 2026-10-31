import { Check, CircleCheckBig, FileText } from 'lucide-react';
import { SegmentedControl } from '../../ui';
import { formatDueLine, getItemKind, getUrgency } from './formatters';
import { KindTag, SectionHeading } from './SectionHeading';

const ActionPanel = ({ tasks, assessments, selectedView, onViewChange, onSelect, onComplete, isLoading, now }) => {
  const items = selectedView === 'tasks' ? tasks : assessments;
  return (
    <section className={`uni-board-action-panel is-${selectedView}`} aria-labelledby="uni-board-actions-title">
      <SectionHeading id="uni-board-actions-title" icon={CircleCheckBig} title="To Do" tone="success" count={items.length} />
      <SegmentedControl
        items={[
          { id: 'tasks', label: 'Tasks', controls: 'uni-board-action-list' },
          { id: 'assessments', label: 'Exams & Quizzes', controls: 'uni-board-action-list' },
        ]}
        value={selectedView}
        onChange={onViewChange}
        ariaLabel="University action view"
        className="uni-board-action-tabs"
      />
      {isLoading ? <div className="uni-board-skeleton-list" aria-label="Loading actions">{[1, 2, 3].map((row) => <span key={row} className="uni-board-skeleton-row" />)}</div> : items.length > 0 ? (
        <div id="uni-board-action-list" className="ui-group uni-board-action-list">
          {items.map((item) => (
            <div key={item.key} className={`uni-board-action-row${item.completed ? ' is-complete' : ''}`}>
              {selectedView === 'tasks' ? (
                <button type="button" className="task-check" onClick={() => onComplete(item)} aria-pressed={Boolean(item.completed)} aria-label={item.completed ? `Reopen ${item.title}` : `Complete ${item.title}`}>
                  <span>{item.completed && <Check size={13} strokeWidth={3.2} aria-hidden="true" />}</span>
                </button>
              ) : <span className="uni-board-assessment-icon" aria-hidden="true"><FileText size={17} /></span>}
              <button type="button" className="uni-board-action-row__open" onClick={() => onSelect(item)}>
                <span className="uni-board-item-copy">
                  <strong>{item.title}</strong>
                  <span className="uni-board-item-meta">
                    <KindTag kind={getItemKind(item)} />
                    {item.subject && <span className="uni-board-item-meta__text">{item.subject}</span>}
                  </span>
                </span>
                <span className={`uni-urgency-pill is-${getUrgency(item.occursAt, now)}`}>{formatDueLine(item.occursAt, now)}</span>
              </button>
            </div>
          ))}
        </div>
      ) : <p id="uni-board-action-list" className="ui-empty-card">{selectedView === 'tasks' ? 'No open tasks.' : 'No exams or quizzes coming up.'}</p>}
    </section>
  );
};

export default ActionPanel;
