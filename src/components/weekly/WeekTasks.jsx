import { useState } from 'react';
import { AlertCircle, Check, Circle } from 'lucide-react';
import { getColorForSubject } from '../../constants/subjects';
import { dayLabel, timeLabel } from './weeklyFormat';

const WeekTasks = ({ groups, total, onOpen, onComplete, pendingIds }) => {
  const [showCompleted, setShowCompleted] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const eligible = groups.flatMap((group) => group.items).filter((item) => showCompleted || !item.completed);
  const visibleKeys = new Set((expanded ? eligible : eligible.slice(0, 6)).map((item) => item.key));

  return (
    <section className="week-tasks" aria-labelledby="week-tasks-title">
      <div className="week-section-heading">
        <h2 id="week-tasks-title">Tasks due this week</h2>
        <label className="week-completed-toggle">
          <input type="checkbox" checked={showCompleted} onChange={(event) => setShowCompleted(event.target.checked)} />
          <span>Show completed</span>
        </label>
      </div>
      {eligible.length === 0 ? (
        <p className="week-empty">{total > 0 ? 'All tasks due this week are complete.' : 'No tasks due this week.'}</p>
      ) : (
        <div id="week-task-list">
          {groups.map((group) => {
            const items = group.items.filter((item) => visibleKeys.has(item.key));
            if (!items.length) return null;
            return (
              <div className="week-task-group" key={group.dateKey}>
                <h3><time dateTime={group.dateKey}>{dayLabel(group.date)}</time></h3>
                <ul className="week-list">
                  {items.map((item) => (
                    <li className={`week-task-row${item.completed ? ' is-completed' : ''}`} key={item.key}>
                      <button type="button" className="week-check" onClick={() => onComplete(item.record)} disabled={item.completed || pendingIds.has(item.record.id)} aria-label={item.completed ? `${item.title} is completed` : `Complete ${item.title}`}>
                        {item.completed ? <Check size={18} aria-hidden="true" /> : <Circle size={19} aria-hidden="true" />}
                      </button>
                      <button type="button" className="week-task-open" onClick={() => onOpen(item.record)}>
                        <span className="week-task-title">{item.title}{item.isOverdue && <AlertCircle size={14} className="week-overdue-icon" aria-label="Overdue" />}</span>
                        {item.subject && <span className="week-task-subject"><span className="week-dot" style={{ backgroundColor: getColorForSubject(item.subject).color }} aria-hidden="true" />{item.subject}</span>}
                      </button>
                      <div className="week-task-due">
                        {item.dateOnly ? <span>No set time</span> : <time dateTime={item.occursAt.toISOString()}>{timeLabel(item.occursAt)}</time>}
                        {item.isOverdue && <span className="week-overdue-label">Overdue</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
      {eligible.length > 6 && <button type="button" className="week-text-button" aria-controls="week-task-list" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer tasks' : `Show all ${eligible.length} tasks`}</button>}
    </section>
  );
};

export default WeekTasks;
