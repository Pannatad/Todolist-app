import { Check, ClipboardList, FileText, GraduationCap, RotateCcw } from 'lucide-react';
import { SegmentedControl } from '../../ui';
import { formatDateTime, formatTimeRemaining, itemLabel } from './formatters';

const ActionPanel = ({ tasks, assessments, selectedView, onViewChange, onSelect, onComplete, isLoading, now }) => {
  const items = selectedView === 'tasks' ? tasks : assessments;
  return (
    <section className={`uni-board-section uni-board-action-panel is-${selectedView}`} aria-labelledby="uni-board-actions-title">
      <div className="uni-board-section-heading">
        <div>
          <p className="uni-board-kicker">Action panel</p>
          <h2 id="uni-board-actions-title">Keep moving</h2>
        </div>
        <span className="uni-board-count">{items.length}</span>
      </div>
      <SegmentedControl
        items={[
          { id: 'tasks', label: 'Tasks', icon: ClipboardList, controls: 'uni-board-action-list' },
          { id: 'assessments', label: 'Exams & quizzes', icon: GraduationCap, controls: 'uni-board-action-list' },
        ]}
        value={selectedView}
        onChange={onViewChange}
        ariaLabel="University action view"
        className="uni-board-action-tabs"
      />
      {isLoading ? <div className="uni-board-skeleton-list" aria-label="Loading actions">{[1, 2, 3].map((row) => <span key={row} className="uni-board-skeleton-row" />)}</div> : (
        <div id="uni-board-action-list" className="uni-board-action-list">
          {items.length > 0 ? items.map((item) => (
            <div key={item.key} className={`uni-board-action-row${item.completed ? ' is-complete' : ''}`}>
              {selectedView === 'tasks' ? (
                <button type="button" className="uni-board-check-button" onClick={() => onComplete(item)} aria-label={item.completed ? `Reopen ${item.title}` : `Complete ${item.title}`}>
                  {item.completed ? <RotateCcw size={17} aria-hidden="true" /> : <Check size={17} aria-hidden="true" />}
                </button>
              ) : <span className="uni-board-assessment-icon" aria-hidden="true"><FileText size={17} /></span>}
              <button type="button" className="uni-board-action-row__open" onClick={() => onSelect(item)}>
                <span className="uni-board-item-copy">
                  <strong>{item.title}</strong>
                  <span>{itemLabel(item)} · {formatDateTime(item.occursAt)} · {formatTimeRemaining(item.occursAt, now)}</span>
                </span>
              </button>
            </div>
          )) : <p className="uni-board-quiet-empty">{selectedView === 'tasks' ? 'No outstanding university tasks.' : 'No exams or quizzes to review.'}</p>}
        </div>
      )}
    </section>
  );
};

export default ActionPanel;
