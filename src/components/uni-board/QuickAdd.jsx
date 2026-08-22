import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, ChevronDown, Plus } from 'lucide-react';
import { Sheet } from '../../ui';
import { toast } from '../../ui/Toast';
import { ALL_KINDS, getKindLabel, isScheduleKind } from './constants';

const emptyDraft = () => ({
  title: '',
  kind: 'task',
  when: '',
  course: '',
  duration: 60,
  isMilestone: false,
  notes: '',
});

const QuickAdd = ({ addTask, addScheduleItem }) => {
  const [draft, setDraft] = useState(emptyDraft);
  const [isOpen, setIsOpen] = useState(false);
  const [showWhen, setShowWhen] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const scheduleKind = isScheduleKind(draft.kind);

  useEffect(() => {
    if (scheduleKind && !draft.isMilestone && draft.kind === 'exam') {
      setDraft((current) => ({ ...current, isMilestone: true }));
    }
  }, [draft.kind, draft.isMilestone, scheduleKind]);

  const canSubmit = useMemo(() => (
    draft.title.trim().length > 0
      && (!scheduleKind || Boolean(draft.when))
      && (!scheduleKind || Number(draft.duration) >= 5)
      && !isSaving
  ), [draft.duration, draft.title, draft.when, isSaving, scheduleKind]);

  const setField = (key, value) => {
    setError('');
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setDraft(emptyDraft());
    setShowWhen(false);
    setShowDetails(false);
    setError('');
    setIsOpen(false);
  };

  const closeComposer = () => {
    setIsOpen(false);
    setShowDetails(false);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!canSubmit) {
      setError(scheduleKind && !draft.when ? 'Choose a date and time for scheduled items.' : 'Add a title to continue.');
      return;
    }

    const subject = draft.course.trim() || 'University';
    setIsSaving(true);
    setError('');

    try {
      const result = scheduleKind
        ? await addScheduleItem({
          title: draft.title.trim(),
          startTime: new Date(draft.when).toISOString(),
          duration: Number(draft.duration) || 60,
          category: subject,
          subject,
          notes: draft.notes.trim() || null,
          description: draft.notes.trim() || null,
          workspace: 'university',
          uniKind: draft.kind,
          isMilestone: Boolean(draft.isMilestone || draft.kind === 'exam'),
        })
        : await addTask({
          title: draft.title.trim(),
          deadline: draft.when || null,
          subject,
          description: draft.notes.trim() || null,
          workspace: 'university',
          uniKind: draft.kind,
          isMilestone: Boolean(draft.isMilestone),
        });

      if (!result) throw new Error('The item could not be saved.');
      reset();
    } catch (saveError) {
      const message = saveError?.message || 'Could not save this university item.';
      setError(message);
      toast(message, { tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button type="button" className="uni-board-add-trigger" onClick={() => setIsOpen(true)}>
        <Plus size={17} aria-hidden="true" />
        <span>Add item</span>
      </button>

      <Sheet open={isOpen} onClose={closeComposer} title="Add university item" description="Capture a deadline, exam, event, or university task." className="uni-board-quick-add-sheet">
        <form className="uni-board-composer__form" onSubmit={submit}>
        {error && <p className="uni-board-inline-error uni-board-composer__error" role="alert">{error}</p>}
        <label className="uni-board-visually-hidden" htmlFor="uni-board-title">Title</label>
        <input
          id="uni-board-title"
          className="uni-board-input uni-board-input--title"
          value={draft.title}
          onChange={(event) => setField('title', event.target.value)}
          placeholder="Deadline, exam, or event"
          autoComplete="off"
          required
        />
        <label className="uni-board-visually-hidden" htmlFor="uni-board-kind">Type</label>
        <select id="uni-board-kind" className="uni-board-input uni-board-select" value={draft.kind} onChange={(event) => setField('kind', event.target.value)}>
          {ALL_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
        </select>
        <button type="button" className={`uni-board-when-chip${showWhen ? ' is-open' : ''}`} onClick={() => setShowWhen((open) => !open)} aria-expanded={showWhen}>
          <CalendarClock size={16} aria-hidden="true" />
          <span>{draft.when ? 'When set' : 'When'}</span>
          <ChevronDown size={15} aria-hidden="true" />
        </button>
        <button type="submit" className="uni-board-primary-button" disabled={!canSubmit}>
          <Plus size={17} aria-hidden="true" />
          <span>{isSaving ? 'Adding…' : 'Add'}</span>
        </button>
        <button type="button" className="uni-board-secondary-button" onClick={() => setShowDetails((visible) => !visible)}>
          {showDetails ? 'Hide details' : 'More details'}
        </button>
        {showWhen && (
          <div className="uni-board-composer__when">
            <label htmlFor="uni-board-when">{scheduleKind ? `${getKindLabel(draft.kind)} date and time` : 'Optional due date and time'}</label>
            <input id="uni-board-when" className="uni-board-input" type="datetime-local" value={draft.when} onChange={(event) => setField('when', event.target.value)} required={scheduleKind} />
            {scheduleKind && <span>Scheduled items need a date and time.</span>}
          </div>
        )}
        {showDetails && (
          <div className="uni-board-sheet-form uni-board-composer__details">
          <label>
            <span>Course or category</span>
            <input className="uni-board-input" value={draft.course} onChange={(event) => setField('course', event.target.value)} placeholder="University" />
          </label>
          {scheduleKind && (
            <label>
              <span>Duration in minutes</span>
              <input className="uni-board-input" type="number" min="5" max="720" step="5" value={draft.duration} onChange={(event) => setField('duration', event.target.value)} />
            </label>
          )}
          <label className="uni-board-toggle-row">
            <input type="checkbox" checked={draft.isMilestone || draft.kind === 'exam'} disabled={draft.kind === 'exam'} onChange={(event) => setField('isMilestone', event.target.checked)} />
            <span><strong>Semester milestone</strong><small>{draft.kind === 'exam' ? 'Exams are milestones by default.' : 'Show this in the semester timeline.'}</small></span>
          </label>
          <label>
            <span>Notes or details</span>
            <textarea className="uni-board-input uni-board-textarea" value={draft.notes} onChange={(event) => setField('notes', event.target.value)} placeholder="Room, submission link, or what to bring" rows="4" />
          </label>
          </div>
        )}
        </form>
      </Sheet>
    </>
  );
};

export default QuickAdd;
