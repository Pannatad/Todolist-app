import { Check, FileText } from 'lucide-react';
import { SegmentedControl } from '../../ui';
import { formatDateTime, formatTimeRemaining, itemLabel } from './formatters';

const ActionPanel = ({ tasks, assessments, selectedView, onViewChange, onSelect, onComplete, isLoading, now }) => {
  const items = selectedView === 'tasks' ? tasks : assessments;
  return (
    <section className={`uni-board-action-panel is-${selectedView}`} aria-labelledby="uni-board-actions-title">
      <div className="ui-section-title">
        <h2 id="uni-board-actions-title">To Do</h2>
        <span aria-label={`${items.length} ${selectedView === 'tasks' ? 'tasks' : 'assessments'}`}>{items.length}</span>
      </div>
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
                  <span>{itemLabel(item)} · {formatDateTime(item.occursAt)} · {formatTimeRemaining(item.occursAt, now)}</span>
                </span>
              </button>
            </div>
          ))}
        </div>
      ) : <p id="uni-board-action-list" className="ui-empty-card">{selectedView === 'tasks' ? 'No open tasks.' : 'No exams or quizzes coming up.'}</p>}
    </section>
  );
};

export default ActionPanel;
