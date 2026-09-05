import { useMemo, useState } from 'react';
import { BookOpen, ChevronRight, Clock3, Pencil, Plus, Trash2 } from 'lucide-react';
import { Sheet } from '../../ui';
import { toast } from '../../ui/Toast';
import { confirmAction } from '../../utils/confirm';
import {
  buildClassSchedulePayload,
  CLASS_SESSION_TYPES,
  CLASS_WEEKDAYS,
  classDraftFromItem,
  emptyClassDraft,
  groupClassScheduleItems,
} from './classSchedule';

const timeLabel = (item) => new Date(item.startTime || item.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const dayLabel = (item) => {
  const days = item.recurrenceDaysOfWeek || item.recurrence_days_of_week || [];
  if (!days.length) return 'One time';
  return CLASS_WEEKDAYS.filter((day) => days.includes(day.value)).map((day) => day.name.slice(0, 3)).join(', ');
};

const sessionTypeLabel = (item) => {
  const title = (item.title || '').toLowerCase();
  return CLASS_SESSION_TYPES.find((type) => title.includes(type.value))?.label || 'Class';
};

const ClassScheduleSheet = ({ open, onClose, items, onAdd, onUpdate, onDelete }) => {
  const classes = useMemo(() => groupClassScheduleItems(items), [items]);
  const [selectedClass, setSelectedClass] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [draft, setDraft] = useState(() => emptyClassDraft());
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const activeClassName = creatingClass ? newClassName.trim() : selectedClass;
  const activeClass = classes.find((entry) => entry.name === selectedClass);

  const resetSession = (className = activeClassName) => {
    setEditingItem(null);
    setDraft({ ...emptyClassDraft(), className });
    setError('');
  };

  const chooseClass = (name) => {
    setSelectedClass(name);
    setCreatingClass(false);
    setNewClassName('');
    resetSession(name);
  };

  const startNewClass = () => {
    setCreatingClass(true);
    setSelectedClass('');
    setNewClassName('');
    resetSession('');
  };

  const startEditing = (item) => {
    setEditingItem(item);
    setDraft(classDraftFromItem(item));
    setError('');
  };

  const setField = (field, value) => {
    setError('');
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const toggleDay = (day) => setDraft((current) => ({
    ...current,
    repeatDays: current.repeatDays.includes(day)
      ? current.repeatDays.filter((value) => value !== day)
      : [...current.repeatDays, day],
  }));

  const save = async (event) => {
    event.preventDefault();
    const className = activeClassName || draft.className.trim();
    if (!className) return setError('Choose a class or enter a new class name.');
    if (!draft.startDate || !draft.startTime) return setError('Choose a start date and time.');
    if (draft.endDate && draft.endDate < draft.startDate) return setError('The end date must be after the start date.');

    setIsSaving(true);
    try {
      const payload = buildClassSchedulePayload({ ...draft, className, title: '' });
      if (editingItem) await onUpdate(editingItem.id, payload);
      else await onAdd(payload);
      setSelectedClass(className);
      setCreatingClass(false);
      setNewClassName('');
      resetSession(className);
    } catch (saveError) {
      const message = saveError?.message || 'Could not save this class schedule.';
      setError(message);
      toast(message, { tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!editingItem || !confirmAction(`Delete this ${sessionTypeLabel(editingItem).toLowerCase()} schedule?`)) return;
    setIsSaving(true);
    try {
      await onDelete(editingItem.id);
      resetSession(activeClassName);
    } catch (deleteError) {
      const message = deleteError?.message || 'Could not delete this class schedule.';
      setError(message);
      toast(message, { tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const close = () => {
    setSelectedClass('');
    setCreatingClass(false);
    setNewClassName('');
    resetSession('');
    onClose();
  };

  return (
    <Sheet open={open} onClose={close} title="Manage class schedule" description="Choose a class, then add its lectures, tutorials, labs, and other weekly sessions." className="uni-board-class-sheet">
      <div className="uni-board-class-manager">
        <section className="uni-board-class-list" aria-label="Classes">
          <div className="uni-board-class-list__header">
            <div><h3>Classes</h3><p>Choose one to manage its schedule.</p></div>
            <button type="button" className="uni-board-secondary-button" onClick={startNewClass}><Plus size={16} aria-hidden="true" /> New</button>
          </div>
          <div className="uni-board-class-list__items">
            {classes.map((entry) => (
              <button key={entry.name} type="button" className={`uni-board-class-list__item${selectedClass === entry.name ? ' is-selected' : ''}`} onClick={() => chooseClass(entry.name)}>
                <span className="uni-board-class-list__book"><BookOpen size={16} aria-hidden="true" /></span>
                <span className="uni-board-item-copy"><strong>{entry.name}</strong><span>{entry.sessions.length} session{entry.sessions.length === 1 ? '' : 's'}</span></span>
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            ))}
            {!classes.length && <div className="uni-board-class-list__empty"><BookOpen size={20} aria-hidden="true" /><span>Create your first class to begin.</span></div>}
          </div>
        </section>

        <section className="uni-board-class-detail">
          {!activeClassName && !creatingClass ? (
            <div className="uni-board-class-detail__empty"><BookOpen size={24} aria-hidden="true" /><h3>Choose a class</h3><p>Select a class on the left, or create a new one.</p></div>
          ) : (
            <>
              <div className="uni-board-class-detail__heading">
                {creatingClass ? (
                  <label><span>Class name or course code</span><input className="uni-board-input" value={newClassName} onChange={(event) => { setNewClassName(event.target.value); setDraft((current) => ({ ...current, className: event.target.value })); }} placeholder="COMP 1023" autoFocus /></label>
                ) : (
                  <div><h3>{selectedClass}</h3><p>{activeClass?.sessions.length || 0} weekly schedule{activeClass?.sessions.length === 1 ? '' : 's'}</p></div>
                )}
                {!creatingClass && <button type="button" className="uni-board-secondary-button" onClick={() => resetSession(selectedClass)}><Plus size={16} aria-hidden="true" /> Add schedule</button>}
              </div>

              {!creatingClass && activeClass?.sessions.length > 0 && (
                <div className="uni-board-class-sessions" aria-label={`${selectedClass} schedules`}>
                  {activeClass.sessions.map((item) => (
                    <button key={item.id} type="button" className={editingItem?.id === item.id ? 'is-selected' : ''} onClick={() => startEditing(item)}>
                      <span className="uni-board-class-session__type">{sessionTypeLabel(item)}</span>
                      <span><strong>{dayLabel(item)}</strong><small>{timeLabel(item)} · {item.duration || 60} min{item.notes ? ` · ${item.notes}` : ''}</small></span>
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              )}

              <form className="uni-board-sheet-form uni-board-class-form" onSubmit={save}>
                <div className="uni-board-class-form__heading">
                  <div><h3>{editingItem ? `Edit ${sessionTypeLabel(editingItem).toLowerCase()}` : 'Add schedule'}</h3><p>Add each lecture, tutorial, or lab separately.</p></div>
                  {editingItem && <button type="button" className="uni-board-danger-button" onClick={remove} disabled={isSaving} aria-label="Delete schedule"><Trash2 size={16} aria-hidden="true" /></button>}
                </div>
                {error && <p className="uni-board-inline-error" role="alert">{error}</p>}
                <label><span>Category</span><select className="uni-board-input" value={draft.sessionType} onChange={(event) => setField('sessionType', event.target.value)}>{CLASS_SESSION_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
                <label><span>Room or notes</span><input className="uni-board-input" value={draft.room} onChange={(event) => setField('room', event.target.value)} placeholder="Room 2404" /></label>
                <div className="uni-board-form-grid">
                  <label><span>First date</span><input className="uni-board-input" type="date" value={draft.startDate} onChange={(event) => setField('startDate', event.target.value)} required /></label>
                  <label><span>Start time</span><input className="uni-board-input" type="time" value={draft.startTime} onChange={(event) => setField('startTime', event.target.value)} required /></label>
                </div>
                <label><span>Duration in minutes</span><input className="uni-board-input" type="number" min="5" max="720" step="5" value={draft.duration} onChange={(event) => setField('duration', event.target.value)} /></label>
                <fieldset className="uni-board-class-days"><legend>Repeat every week on</legend><div>{CLASS_WEEKDAYS.map((day) => <button key={day.value} type="button" className={draft.repeatDays.includes(day.value) ? 'is-selected' : ''} aria-pressed={draft.repeatDays.includes(day.value)} title={day.name} onClick={() => toggleDay(day.value)}>{day.label}</button>)}</div></fieldset>
                <label><span>Repeat until <small>(optional)</small></span><input className="uni-board-input" type="date" min={draft.startDate} value={draft.endDate} onChange={(event) => setField('endDate', event.target.value)} disabled={!draft.repeatDays.length} /></label>
                <button type="submit" className="uni-board-primary-button uni-board-class-form__submit" disabled={isSaving}><Clock3 size={16} aria-hidden="true" /> {isSaving ? 'Saving…' : editingItem ? 'Save schedule' : 'Add schedule'}</button>
              </form>
            </>
          )}
        </section>
      </div>
    </Sheet>
  );
};

export default ClassScheduleSheet;
