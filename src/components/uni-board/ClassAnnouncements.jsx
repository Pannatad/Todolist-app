import ClassItemActions from './ClassItemActions';
import { Pin } from 'lucide-react';
import { sortAnnouncements } from './classItems';

export default function ClassAnnouncements({ items, onEdit, onDelete, onPin, busy }) {
  return (
    <section className="uni-classes-section" aria-labelledby="class-announcements-title">
      <div className="uni-board-section-heading"><h3 id="class-announcements-title">Announcements</h3><button type="button" className="uni-board-secondary-button" onClick={() => onEdit('announcement')} aria-label="Add announcement">Add</button></div>
      {!items.length && <p className="uni-classes-empty">Keep class updates and important notices here.</p>}
      {sortAnnouncements(items).map((item) => <article className="uni-classes-announcement" key={item.id}>
        <div className="uni-board-section-heading">
          <button type="button" className="uni-classes-announcement-title" onClick={() => onEdit('announcement', item)}>{item.title}</button>
          <div className="uni-classes-announcement-actions"><ClassItemActions title={item.title} disabled={busy} onEdit={() => onEdit('announcement', item)} onDelete={() => onDelete('announcement', item)} />
          <button type="button" className="ui-icon-button" aria-label={`${item.pinned ? 'Unpin' : 'Pin'} ${item.title}`} title={item.pinned ? 'Unpin announcement' : 'Pin announcement'} aria-pressed={item.pinned} disabled={busy} onClick={() => onPin(item)}><Pin size={17} aria-hidden="true" /></button></div>
        </div>
        {item.body && <p>{item.body}</p>}
        {item.url && /^https?:\/\//i.test(item.url) && <a href={item.url} target="_blank" rel="noreferrer">Open source</a>}
      </article>)}
    </section>
  );
}
