import { useRef, useState } from 'react';
import { BookOpen, ChevronLeft, Pencil, Trash2 } from 'lucide-react';
import { RowMenu } from '../../ui';
import { CLASS_ITEM_KINDS, checklistFor } from './classItems';
import { confirmAction } from '../../utils/confirm';
import ClassEditor from './ClassEditor';
import ClassChecklist from './ClassChecklist';
import ClassAnnouncements from './ClassAnnouncements';
import ClassItemEditor from './ClassItemEditor';
import './classes.css';

export default function Classes({ data, tasks, addTask, updateTask, deleteTask, now }) {
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [classEditor, setClassEditor] = useState(null);
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const heading = useRef(null);
  const selectedButton = useRef(null);
  const course = data.classes.find((item) => item.id === selectedId);
  const edit = (kind, item = null) => setEditor({ kind, item });
  const run = async (action) => {
    setBusy(true); setError('');
    try { await action(); } catch (failure) { setError(failure.message || 'Could not save. Please try again.'); }
    finally { setBusy(false); }
  };
  const removeItem = (kind, item) => {
    if (!confirmAction(`Delete “${item.title}”? This cannot be undone.`)) return;
    run(() => kind === 'announcement' ? data.deleteAnnouncement(item.id) : deleteTask(item.id));
  };
  const save = async (form) => {
    if (editor.kind === 'announcement') {
      await data.saveAnnouncement(course.id, form, editor.item?.id);
    } else {
      const input = {
        title: form.title.trim(), description: form.description.trim() || null, deadline: form.deadline || null,
        workspace: 'university', uniKind: 'task', subject: course.name, classId: course.id, classItemKind: editor.kind,
      };
      const result = editor.item ? await updateTask(editor.item.id, input) : await addTask(input);
      if (!result) throw new Error('Could not save this item. Please try again.');
    }
  };
  return (
    <section id="uni-board-classes" role="tabpanel" aria-label="Classes" className={`uni-classes${course ? ' has-selection' : ''}`}>
      {(error || data.error) && <div className="uni-board-load-error uni-classes-error" role="alert"><span>{error || data.error.message}</span>{data.error && <button type="button" onClick={data.retry}>Retry</button>}</div>}
      {data.isLoading ? <div className="uni-board-skeleton-list" aria-label="Loading classes"><span className="uni-board-skeleton-row" /><span className="uni-board-skeleton-row" /></div> : <>
        <aside className="uni-classes-sidebar" aria-label="Your classes">
          <div className="ui-section-title uni-classes-title"><h2>Your Classes</h2><button type="button" className="ui-text-button" disabled={Boolean(data.error)} onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : 'Add'}</button></div>
          {adding && <form className="uni-classes-add uni-board-sheet-form" onSubmit={(event) => {
            event.preventDefault(); run(async () => { const created = await data.addClass(name); setSelectedId(created.id); setName(''); setAdding(false); requestAnimationFrame(() => heading.current?.focus()); });
          }}><label><span>Class name or course code</span><input className="uni-board-input" autoFocus required value={name} onChange={(event) => setName(event.target.value)} placeholder="COMP 1023" /></label><button className="uni-board-primary-button" disabled={busy}>{busy ? 'Saving…' : 'Create class'}</button></form>}
          <div className="uni-classes-list">{data.classes.map((item) => {
            const revision = checklistFor(tasks, item.id, 'revision');
            const openClassEditor = (mode) => { setSelectedId(item.id); setClassEditor(mode); setError(''); };
            return <div className={`uni-classes-course-row${item.id === selectedId ? ' is-selected' : ''}`} key={item.id}>
              <button type="button" ref={item.id === selectedId ? selectedButton : null} className="uni-classes-course" aria-current={item.id === selectedId ? 'true' : undefined} onClick={() => { setSelectedId(item.id); setError(''); requestAnimationFrame(() => heading.current?.focus()); }}>
                <BookOpen size={18} aria-hidden="true" /><span><strong>{item.name}</strong><small>{revision.total ? `${revision.completed.length} of ${revision.total} topics revised` : 'No revision topics yet'}</small></span>
              </button>
              <RowMenu label={`Actions for ${item.name}`} items={[
                { label: 'Rename', icon: Pencil, onSelect: () => openClassEditor('edit') },
                { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => openClassEditor('delete') },
              ]} />
            </div>;
          })}</div>
          {!data.classes.length && <p className="ui-empty-card uni-classes-empty">No classes yet.</p>}
        </aside>
        <div className="uni-classes-detail">
          {course ? <>
            <button type="button" className="uni-classes-back" onClick={() => { const button = selectedButton.current; setSelectedId(null); requestAnimationFrame(() => button?.focus()); }}><ChevronLeft size={22} strokeWidth={2.4} aria-hidden="true" />Classes</button>
            <header className="uni-classes-heading"><div className="uni-classes-heading-row"><h2 ref={heading} tabIndex={-1}>{course.name}</h2><RowMenu label={`Actions for ${course.name}`} items={[
              { label: 'Rename', icon: Pencil, onSelect: () => setClassEditor('edit') },
              { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => setClassEditor('delete') },
            ]} /></div></header>
            {CLASS_ITEM_KINDS.map((kind) => <ClassChecklist key={`${course.id}-${kind.value}`} course={course} kind={kind} now={now} tasks={tasks} onEdit={edit} onDelete={removeItem} busy={busy} onToggle={(task, completed) => run(() => updateTask(task.id, {
              completed, status: completed ? 'harvested' : 'growing', completedAt: completed ? new Date().toISOString() : null, completed_at: completed ? new Date().toISOString() : null,
            }))} />)}
            <ClassAnnouncements items={data.announcements.filter((item) => item.class_id === course.id)} onEdit={edit} onDelete={removeItem} busy={busy} onPin={(item) => run(() => data.saveAnnouncement(course.id, { ...item, pinned: !item.pinned }, item.id))} />
          </> : <div className="uni-classes-placeholder"><BookOpen size={28} aria-hidden="true" /><h2>Choose a class</h2></div>}
        </div>
      </>}
      {classEditor && course && <ClassEditor key={`${course.id}-${classEditor}`} course={course} mode={classEditor} onClose={() => setClassEditor(null)} onRename={data.renameClass} onDelete={async (id) => { await data.deleteClass(id); setSelectedId(null); }} />}
      {editor && course && <ClassItemEditor key={`${course.id}-${editor.kind}-${editor.item?.id || 'new'}`} editor={editor} course={course} onClose={() => setEditor(null)} onSave={save} onDelete={() => editor.kind === 'announcement' ? data.deleteAnnouncement(editor.item.id) : deleteTask(editor.item.id)} />}
    </section>
  );
}
