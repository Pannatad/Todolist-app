import { ChevronRight } from 'lucide-react';
import { formatDateTime, formatTimeRemaining } from './formatters';

const NextUp = ({ items, onSelect, isLoading, now }) => (
  <section className="uni-board-section uni-board-next-up" aria-labelledby="uni-board-next-up-title">
    <div className="uni-board-section-heading">
      <div>
        <p className="uni-board-kicker">At a glance</p>
        <h2 id="uni-board-next-up-title">Next up</h2>
      </div>
      <span className="uni-board-count">{items.length}</span>
    </div>
    {isLoading ? <div className="uni-board-skeleton-list" aria-label="Loading next items"><span className="uni-board-skeleton-row" /></div> : items.length > 0 ? (
      <div className="uni-board-next-up__strip">
        {items.map((item) => (
          <button key={item.key} type="button" className="uni-board-next-up__item" onClick={() => onSelect(item)}>
            <strong className="uni-board-next-up__title">{item.title}</strong>
            <span className="uni-board-next-up__meta">
              <time className="uni-board-next-up__time" dateTime={item.occursAt?.toISOString()}>{formatDateTime(item.occursAt)}</time>
              <span className="uni-board-countdown">{formatTimeRemaining(item.occursAt, now)}</span>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        ))}
      </div>
    ) : <p className="uni-board-quiet-empty">Nothing coming up yet.</p>}
  </section>
);

export default NextUp;
