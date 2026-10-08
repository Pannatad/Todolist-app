import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Sheet } from '../../ui';
import { confirmAction } from '../../utils/confirm';
import { isTaskCompleted, normalizeTaskSubtasks } from '../../utils/taskState';
import { isDateOnlyDeadline, parseWeeklyDate } from '../../utils/weeklySummary';
import { toLocalDateKey } from '../../utils/scheduleOccurrences';
import { dayLabel, timeLabel } from './weeklyFormat';

const localInput = (value) => {
  const date = parseWeeklyDate(value);
  if (!date) return '';
  return `${toLocalDateKey(date)}${isDateOnlyDeadline(value) ? '' : `T${timeLabel(date)}`}`;
};

const WeekTaskSheet = ({ task, onClose, onSave, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(() => ({
    title: task.title || '',
    description: task.description || '',
    when: localInput(task.deadline),
    includeTime: Boolean(task.deadline && !isDateOnlyDeadline(task.deadline)),
    estimate: task.estimatedTime ?? task.estimated_time ?? '',
  }));
  const due = parseWeeklyDate(task.deadline);
  const subtasks = normalizeTaskSubtasks(task.subtasks);
  const close = () => { if (!busy) onClose(); };
  const field = (name, value) => { setDraft((current) => ({ ...current, [name]: value })); setError(''); };
  const save = async (event) => {
    event.preventDefault();
    if (busy) return;
    const deadline = draft.when ? parseWeeklyDate(draft.when) : null;
    const estimate = draft.estimate === '' ? null : Number(draft.estimate);
    if (!draft.title.trim() || (draft.when && !deadline) || (estimate !== null && (!Number.isFinite(estimate) || estimate < 0))) {
      setError('Check the title, due date, and estimated minutes.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const result = await onSave(task.id, {
        title: draft.title.trim(),
        description: draft.description.trim() || null,
        deadline: deadline ? (draft.includeTime ? deadline.toISOString() : toLocalDateKey(deadline)) : null,
        estimatedTime: estimate,
      });
      if (!result) throw new Error('This task could not be saved.');
      onClose();
    } catch (failure) {
      setError(failure.message || 'Could not save this task. Please try again.');
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (busy || !confirmAction(`Delete “${task.title}”? This cannot be undone.`)) return;
    setBusy(true);
    setError('');
    try { await onDelete(task.id); onClose(); }
    catch (failure) { setError(failure.message || 'Could not delete this task. Please try again.'); }
    finally { setBusy(false); }
  };

  return (
    <Sheet open onClose={close} title={editing ? 'Edit task' : task.title || 'Task details'} className="week-task-sheet">
      {error && <p className="week-inline-error" role="alert">{error}</p>}
      {editing ? (
        <form onSubmit={save} className="week-task-form">
          <fieldset disabled={busy}>
            <label>Title<input type="text" value={draft.title} onChange={(event) => field('title', event.target.value)} required autoFocus /></label>
            <label>Due date{draft.includeTime ? <input type="datetime-local" value={draft.when} onChange={(event) => field('when', event.target.value)} /> : <input type="date" value={draft.when} onChange={(event) => field('when', event.target.value)} />}</label>
            <label className="week-completed-toggle"><input type="checkbox" checked={draft.includeTime} onChange={(event) => setDraft((current) => ({ ...current, includeTime: event.target.checked, when: current.when ? (event.target.checked ? `${current.when.slice(0, 10)}T09:00` : current.when.slice(0, 10)) : '' }))} /><span>Include a due time</span></label>
            <label>Estimated minutes<input type="number" min="0" step="1" value={draft.estimate} onChange={(event) => field('estimate', event.target.value)} placeholder="Optional" /></label>
            <label>Notes<textarea rows={4} value={draft.description} onChange={(event) => field('description', event.target.value)} /></label>
          </fieldset>
          <div className="week-sheet-actions"><button type="button" className="week-secondary-button" disabled={busy} onClick={() => setEditing(false)}>Back</button><button type="submit" className="week-primary-button" disabled={busy || !draft.title.trim()}>{busy ? 'Saving…' : 'Save changes'}</button></div>
        </form>
      ) : (
        <>
          <dl className="week-task-facts">
            <div><dt>Status</dt><dd>{isTaskCompleted(task) ? 'Completed' : 'To do'}</dd></div>
            <div><dt>Due</dt><dd>{due ? `${dayLabel(due)}${isDateOnlyDeadline(task.deadline) ? '' : ` · ${timeLabel(due)}`}` : 'No due date'}</dd></div>
            {task.subject && <div><dt>Category</dt><dd>{task.subject}</dd></div>}
            {Number(task.estimatedTime ?? task.estimated_time) > 0 && <div><dt>Estimate</dt><dd>{task.estimatedTime ?? task.estimated_time} min</dd></div>}
            {subtasks.length > 0 && <div><dt>Subtasks</dt><dd>{subtasks.filter((item) => item.completed).length} of {subtasks.length} completed</dd></div>}
          </dl>
          {task.description && <p className="week-task-notes">{task.description}</p>}
          <div className="week-sheet-actions"><button type="button" className="week-delete-button" onClick={remove} disabled={busy}><Trash2 size={16} aria-hidden="true" />{busy ? 'Deleting…' : 'Delete task'}</button><button type="button" className="week-secondary-button" onClick={() => setEditing(true)} disabled={busy}><Pencil size={16} aria-hidden="true" />Edit task</button></div>
        </>
      )}
    </Sheet>
  );
};

export default WeekTaskSheet;
