import ClassItemActions from './ClassItemActions';
import { checklistFor } from './classItems';

export default function ClassChecklist({ course, kind, tasks, onEdit, onDelete, onToggle, busy, now }) {
  const { active, completed, total } = checklistFor(tasks, course.id, kind.value);
  const row = (task, checked) => (
    <div className="uni-classes-task" key={task.id}>
      <label className="uni-classes-check"><input type="checkbox" aria-label={`${checked ? 'Reopen' : 'Complete'} ${task.title}`} checked={checked} disabled={busy} onChange={() => onToggle(task, !checked)} /></label>
      <button type="button" className="uni-classes-task-copy" onClick={() => onEdit(kind.value, task)}>
        <span className={checked ? 'is-completed' : ''}>{task.title}</span>
        {task.description && <small className="uni-classes-note-preview">{task.description}</small>}
        {task.deadline && <small>{!checked && Date.parse(task.deadline) < now.getTime() ? 'Overdue · ' : ''}{new Date(task.deadline).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</small>}
      </button>
      <ClassItemActions title={task.title} disabled={busy} onEdit={() => onEdit(kind.value, task)} onDelete={() => onDelete(kind.value, task)} />
    </div>
  );
  return (
    <section className="uni-classes-section" aria-labelledby={`class-section-${kind.value}`}>
      <div className="uni-board-section-heading">
        <div><h3 id={`class-section-${kind.value}`}>{kind.label}</h3>{kind.value === 'revision' && <p className="uni-classes-meta">{completed.length} of {total} completed</p>}</div>
        <button type="button" className="uni-board-secondary-button" onClick={() => onEdit(kind.value)} aria-label={`Add ${kind.label.toLowerCase()}`}>Add</button>
      </div>
      {active.map((task) => row(task, false))}
      {!total && <p className="uni-classes-empty">{kind.value === 'revision' ? 'Add topics you want to revise.' : `Add ${kind.label.toLowerCase()} for this class.`}</p>}
      {total > 0 && active.length === 0 && <p className="uni-classes-empty">All completed.</p>}
      {completed.length > 0 && <details className="uni-classes-completed"><summary>Completed ({completed.length})</summary>{completed.map((task) => row(task, true))}</details>}
    </section>
  );
}
