import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '../../ui';
import { toast } from '../../ui/Toast';
import { confirmAction } from '../../utils/confirm';
import { SCHEDULE_KINDS, TASK_KINDS, getKindLabel, getRecordValue } from './constants';
import { getItemKind, getItemNotes, getItemSubject, toDatetimeLocalValue, toIso } from './formatters';

const DetailsSheet = ({ item, onClose, updateTask, deleteTask, updateScheduleItem, deleteScheduleItem }) => {
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const schedule = item?.source === 'schedule';

  useEffect(() => {
    if (!item) {
      setForm(null);
      return;
    }
    const record = item.record || {};
    const kind = getItemKind(item);
    const rawWhen = item.occursAt || getRecordValue(record, 'deadline', 'startTime', 'start_time');
    setForm({
      title: item.title || '',
      kind,
      when: toDatetimeLocalValue(rawWhen),
      subject: getItemSubject(item),
      duration: Number(getRecordValue(record, 'duration') || 60),
      isMilestone: Boolean(item.isMilestone || getRecordValue(record, 'isMilestone', 'is_milestone')),
      notes: getItemNotes(item) || '',
    });
    setError('');
  }, [item]);

  const kindOptions = useMemo(() => (schedule ? SCHEDULE_KINDS : TASK_KINDS), [schedule]);
  const open = Boolean(item && form);

  const setField = (key, value) => {
    setError('');
    setForm((current) => ({ ...current, [key]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form?.title.trim()) {
      setError('A title is required.');
      return;
    }
    if (schedule && !form.when) {
      setError('Scheduled items need a date and time.');
      return;
    }
    setIsSaving(true);
    try {
      const subject = form.subject.trim() || 'University';
      if (schedule) {
        const result = await updateScheduleItem(item.id, {
          title: form.title.trim(),
          startTime: toIso(form.when),
          duration: Math.max(5, Number(form.duration) || 60),
          category: subject,
          subject,
          notes: form.notes.trim() || null,
          description: form.notes.trim() || null,
          workspace: 'university',
          uniKind: form.kind,
          isMilestone: Boolean(form.isMilestone || form.kind === 'exam'),
        });
        if (!result) throw new Error('The schedule item could not be updated.');
      } else {
        const result = await updateTask(item.id, {
          title: form.title.trim(),
          deadline: form.when || null,
          subject,
          description: form.notes.trim() || null,
          workspace: 'university',
          uniKind: form.kind,
          isMilestone: Boolean(form.isMilestone),
        });
        if (result === false) throw new Error('The task could not be updated.');
      }
      onClose();
    } catch (saveError) {
      const message = saveError?.message || 'Could not save this item.';
      setError(message);
      toast(message, { tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!confirmAction(`Delete “${item.title}”? This cannot be undone.`)) return;
    setIsSaving(true);
    try {
      if (schedule) await deleteScheduleItem(item.id);
      else await deleteTask(item.id);
      onClose();
    } catch (deleteError) {
      const message = deleteError?.message || 'Could not delete this item.';
      setError(message);
      toast(message, { tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="Edit university item" description="Changes stay in the original task or schedule family.">
      {form && (
        <form className="uni-board-sheet-form" onSubmit={save}>
          {error && <p className="uni-board-inline-error" role="alert">{error}</p>}
          <label>
            <span>Title</span>
            <input className="uni-board-input" autoFocus value={form.title} onChange={(event) => setField('title', event.target.value)} required />
          </label>
          <div className="uni-board-form-grid">
            <label>
              <span>Type</span>
              <select className="uni-board-input" value={form.kind} onChange={(event) => setField('kind', event.target.value)}>
                {kindOptions.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
              </select>
            </label>
            <label>
              <span>{schedule ? 'Date and time' : 'Due date and time'}</span>
              <input className="uni-board-input" type="datetime-local" value={form.when} onChange={(event) => setField('when', event.target.value)} required={schedule} />
            </label>
          </div>
          <label>
            <span>Course or category</span>
            <input className="uni-board-input" value={form.subject} onChange={(event) => setField('subject', event.target.value)} placeholder="University" />
          </label>
          {schedule && (
            <label>
              <span>Duration in minutes</span>
              <input className="uni-board-input" type="number" min="5" max="720" step="5" value={form.duration} onChange={(event) => setField('duration', event.target.value)} />
            </label>
          )}
          <label className="uni-board-toggle-row">
            <input type="checkbox" checked={form.isMilestone || form.kind === 'exam'} disabled={form.kind === 'exam'} onChange={(event) => setField('isMilestone', event.target.checked)} />
            <span><strong>Semester milestone</strong><small>{form.kind === 'exam' ? `${getKindLabel(form.kind)} items are milestones by default.` : 'Keep this visible in the semester timeline.'}</small></span>
          </label>
          <label>
            <span>Notes or details</span>
            <textarea className="uni-board-input uni-board-textarea" rows="5" value={form.notes} onChange={(event) => setField('notes', event.target.value)} />
          </label>
          <div className="uni-board-sheet-actions">
            <button type="submit" className="uni-board-primary-button" disabled={isSaving}>{isSaving ? 'Saving…' : 'Save changes'}</button>
            <button type="button" className="uni-board-danger-button" onClick={remove} disabled={isSaving}><Trash2 size={16} aria-hidden="true" /> Delete</button>
          </div>
        </form>
      )}
    </Sheet>
  );
};

export default DetailsSheet;
