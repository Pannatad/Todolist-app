import { useEffect, useRef, useState } from 'react';
import { Sheet } from '../../ui';
import { confirmAction } from '../../utils/confirm';
import { toDatetimeLocalValue } from './formatters';

export default function ClassItemEditor({ editor, course, onClose, onSave, onDelete }) {
  const titleInput = useRef(null);
  useEffect(() => { titleInput.current?.focus(); }, []);
  const announcement = editor.kind === 'announcement';
  const item = editor.item;
  const [form, setForm] = useState({
    title: item?.title || '',
    description: item?.description || '',
    deadline: toDatetimeLocalValue(item?.deadline),
    body: item?.body || '', url: item?.url || '', pinned: item?.pinned === true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const field = (name, value) => { setForm((current) => ({ ...current, [name]: value })); setError(''); };
  const run = async (action) => {
    setBusy(true); setError('');
    try { await action(); onClose(); }
    catch (failure) { setError(failure.message || 'Could not save. Please try again.'); }
    finally { setBusy(false); }
  };
  return (
    <Sheet open onClose={() => { if (!busy) onClose(); }} title={`${item ? 'Edit' : 'Add'} ${announcement ? 'announcement' : editor.kind}`} description={course.name}>
      <form className="uni-board-sheet-form" onSubmit={(event) => {
        event.preventDefault();
        if (!form.title.trim()) { setError('A title is required.'); return; }
        run(() => onSave(form));
      }}>
        {error && <p className="uni-board-inline-error" role="alert">{error}</p>}
        <label><span>Title</span><input className="uni-board-input" ref={titleInput} autoFocus required value={form.title} onChange={(event) => field('title', event.target.value)} /></label>
        {!announcement && <label><span>Due date and time (optional)</span><input className="uni-board-input" type="datetime-local" value={form.deadline} onInput={(event) => field('deadline', event.target.value)} /></label>}
        <label><span>{announcement ? 'Announcement' : 'Notes (optional)'}</span><textarea className="uni-board-input uni-board-textarea" rows="4" value={announcement ? form.body : form.description} onChange={(event) => field(announcement ? 'body' : 'description', event.target.value)} /></label>
        {announcement && <>
          <label><span>Source link (optional)</span><input className="uni-board-input" type="text" inputMode="url" autoCapitalize="none" value={form.url} onChange={(event) => field('url', event.target.value)} placeholder="https://…" /></label>
          <label className="uni-board-toggle-row"><input type="checkbox" checked={form.pinned} onChange={(event) => field('pinned', event.target.checked)} /><span>Pin announcement</span></label>
        </>}
        <div className="uni-board-sheet-actions">
          <button className="uni-board-primary-button" disabled={busy}>{busy ? 'Saving…' : item ? 'Save changes' : 'Add item'}</button>
          {item && <button type="button" className="uni-board-danger-button" disabled={busy} onClick={() => {
            if (confirmAction(`Delete “${item.title}”? This cannot be undone.`)) run(onDelete);
          }}>Delete</button>}
        </div>
      </form>
    </Sheet>
  );
}
