import { useEffect, useState } from 'react';
import { motion as Motion } from 'framer-motion';

const timeLabel = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const remainingLabel = (ms) => {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

/**
 * The centerpiece of the Today page — no card, no box. The current (or next)
 * block is written straight onto the page in large type, colored by the event.
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
      <section className="py-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Free</p>
        <h2 className="mt-1 text-3xl font-bold leading-tight tracking-tight text-[var(--color-ink)]">Nothing scheduled</h2>
        <button
          type="button"
          onClick={onPlanDay}
          className="mt-4 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] transition-transform active:scale-95"
        >
          Plan my day
        </button>
      </section>
    );
  }

  const isNow = Boolean(current);
  const color = entry.item.color || 'var(--color-accent)';
  const progress = isNow ? Math.min(1, Math.max(0, (now - entry.start) / (entry.end - entry.start))) : 0;
  const followUp = isNow ? next : null;
  const strong = `color-mix(in oklch, ${color} 72%, var(--color-ink))`;
  const soft = `color-mix(in srgb, ${color} 18%, transparent)`;

  return (
    <section
      className="cursor-pointer select-none py-2"
      onClick={() => onOpen(entry.item)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(entry.item); } }}
    >
      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: strong }}>
        {isNow ? 'Now' : 'Up next'} · {timeLabel(entry.start)}–{timeLabel(entry.end)}
        <span className="ml-2 font-semibold normal-case tracking-normal text-[var(--color-muted)]">{entry.item.category || 'Other'}</span>
      </p>

      <h2 className="mt-1.5 text-3xl font-bold leading-tight tracking-tight text-[var(--color-ink)] line-clamp-2 sm:text-4xl">
        {entry.item.title}
      </h2>

      {isNow ? (
        <div className="mt-4 max-w-md">
          <div className="h-1 overflow-hidden rounded-full" style={{ background: soft }}>
            <Motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={false}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-1.5 text-sm font-semibold" style={{ color: strong }}>{remainingLabel(entry.end - now)} left</p>
        </div>
      ) : (
        <p className="mt-2 text-sm font-semibold" style={{ color: strong }}>in {remainingLabel(entry.start - now)}</p>
      )}

      {followUp && (
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Then <span className="font-semibold text-[var(--color-ink)]">{followUp.item.title}</span> · {timeLabel(followUp.start)}
        </p>
      )}
    </section>
  );
};

export default NowCard;
