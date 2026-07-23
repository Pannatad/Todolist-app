import { useEffect, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

const timeLabel = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const remainingLabel = (ms) => {
  const minutes = Math.max(1, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

/**
 * The centerpiece of the Today page: what is happening right now (with live
 * progress), or what comes next, or a calm free-day state.
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
      <section className="ui-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)]">Free</p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--color-ink)]">Nothing scheduled</h2>
        <button
          type="button"
          onClick={onPlanDay}
          className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-ink)] transition-transform active:scale-95"
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
  // The hero takes on the event's color: tinted surface, strong accent text.
  const tinted = `color-mix(in srgb, ${color} 12%, var(--color-card-raised))`;
  const strong = `color-mix(in oklch, ${color} 72%, var(--color-ink))`;
  const soft = `color-mix(in srgb, ${color} 22%, transparent)`;

  return (
    <Motion.section
      layout
      className="ui-card cursor-pointer select-none p-5 transition-shadow hover:shadow-md"
      style={{ background: tinted }}
      onClick={() => onOpen(entry.item)}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onOpen(entry.item); } }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: strong }}>
          {isNow ? 'Now' : 'Up next'} · {timeLabel(entry.start)}–{timeLabel(entry.end)}
        </p>
        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: soft, color: strong }}>
          {entry.item.category || 'Other'}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-2xl font-bold leading-tight tracking-tight text-[var(--color-ink)] line-clamp-2">{entry.item.title}</h2>
        <ChevronRight size={18} className="shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
      </div>

      {isNow ? (
        <div className="mt-3.5">
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: soft }}>
            <Motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={false}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-1.5 text-xs font-semibold" style={{ color: strong }}>{remainingLabel(entry.end - now)} left</p>
        </div>
      ) : (
        <p className="mt-1.5 text-xs font-semibold" style={{ color: strong }}>in {remainingLabel(entry.start - now)}</p>
      )}

      {followUp && (
        <p className="mt-3.5 border-t pt-3 text-sm text-[var(--color-muted)]" style={{ borderColor: soft }}>
          Then <span className="font-semibold text-[var(--color-ink)]">{followUp.item.title}</span> · {timeLabel(followUp.start)}
        </p>
      )}
    </Motion.section>
  );
};

export default NowCard;
