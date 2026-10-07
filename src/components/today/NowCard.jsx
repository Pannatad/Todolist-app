import { useEffect, useState } from 'react';

const timeLabel = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const durationLabel = (ms) => {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
};

/**
 * The hero of Today: what is happening now, or what comes next, as one large
 * tappable card. With nothing scheduled it offers a single action.
 */
const NowCard = ({ current, next, now, onOpen, onPlanDay }) => {
  const [, forceTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => forceTick((value) => value + 1), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const entry = current || next;

  if (!entry) {
    return (
      <section className="now-card now-card--empty">
        <p className="now-card__label">Nothing scheduled</p>
        <h2 className="now-card__title">Your day is open</h2>
        <button type="button" className="now-card__cta" onClick={onPlanDay}>
          Plan my day
        </button>
      </section>
    );
  }

  const isNow = Boolean(current);
  const color = entry.item.color || 'var(--color-accent)';
  const progress = isNow ? Math.min(1, Math.max(0, (now - entry.start) / (entry.end - entry.start))) : 0;
  const followUp = isNow ? next : null;

  return (
    <button
      type="button"
      className="now-card"
      style={{ '--event': color }}
      onClick={() => onOpen(entry.item)}
    >
      <span className="now-card__top">
        <span className="now-card__label">
          <span className="now-card__dot" aria-hidden="true" />
          {isNow ? 'Now' : 'Up next'}
        </span>
        <span className="now-card__time">{timeLabel(entry.start)} – {timeLabel(entry.end)}</span>
      </span>

      <span className="now-card__title">{entry.item.title}</span>

      <span className="now-card__meta">
        {isNow ? `${durationLabel(entry.end - now)} left` : `Starts in ${durationLabel(entry.start - now)}`}
        {entry.item.category ? ` · ${entry.item.category}` : ''}
      </span>

      {isNow && (
        <span className="now-card__progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </span>
      )}

      {followUp && (
        <span className="now-card__then">
          Then {followUp.item.title} at {timeLabel(followUp.start)}
        </span>
      )}
    </button>
  );
};

export default NowCard;
