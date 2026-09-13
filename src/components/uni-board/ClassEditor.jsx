import { useEffect, useRef, useState } from 'react';
import { Sheet } from '../../ui';

export default function ClassEditor({ course, mode, onClose, onRename, onDelete }) {
  const [name, setName] = useState(course.name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const input = useRef(null);
  useEffect(() => { input.current?.focus(); }, []);
  const deleting = mode === 'delete';
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      if (deleting) await onDelete(course.id);
      else await onRename(course.id, name);
      onClose();
    } catch (failure) { setError(failure.message || 'Could not update this class. Please try again.'); }
    finally { setBusy(false); }
  };
  return <Sheet open onClose={() => { if (!busy) onClose(); }} title={deleting ? 'Delete class' : 'Edit class'} description={course.name}>
    <form className="uni-board-sheet-form" onSubmit={submit}>
      {error && <p className="uni-board-inline-error" role="alert">{error}</p>}
      {deleting ? <p>This will permanently delete this class, all its homework, revision items, reminders, announcements, and timetable sessions. Shared items will also disappear from Overview and Tasks. This cannot be undone.</p> :
        <label><span>Class name or course code</span><input ref={input} className="uni-board-input" required value={name} onChange={(event) => setName(event.target.value)} /></label>}
      <div className="uni-board-sheet-actions">
        <button type="button" className="uni-board-secondary-button" disabled={busy} onClick={onClose}>Cancel</button>
        <button className={deleting ? 'uni-board-danger-button' : 'uni-board-primary-button'} disabled={busy}>{busy ? 'Saving…' : deleting ? 'Delete class and contents' : 'Save changes'}</button>
      </div>
    </form>
  </Sheet>;
}
