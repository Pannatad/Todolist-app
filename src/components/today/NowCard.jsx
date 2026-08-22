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
      <section
        className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] px-5 py-5 sm:px-6"
      >
        <p className="text-[13px] font-semibold text-[var(--color-muted)]">Your schedule is clear</p>
        <h2 className="mt-1 text-xl font-bold leading-tight tracking-tight text-[var(--color-ink)] sm:text-[22px]">Nothing scheduled next</h2>
        <button
          type="button"
          onClick={onPlanDay}
          className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-ink)] transition-[transform,opacity] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 active:scale-[0.98]"
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
  const soft = `color-mix(in srgb, ${color} 16%, transparent)`;

  return (
    <button
      type="button"
      className="group w-full select-none rounded-2xl border bg-[var(--color-card)] px-5 py-5 text-left transition-colors hover:bg-[var(--color-card-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 sm:px-6"
      style={{
        borderColor: `color-mix(in oklch, ${color} 24%, var(--color-rule))`,
      }}
      onClick={() => onOpen(entry.item)}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-[var(--color-muted)]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
          <span className="shrink-0" style={{ color: strong }}>{isNow ? 'Now' : 'Up next'}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate tabular-nums">{timeLabel(entry.start)}–{timeLabel(entry.end)}</span>
        </p>
        <span className="shrink-0 text-xs font-medium text-[var(--color-muted)]">{entry.item.category || 'Other'}</span>
      </div>

      <div className="mt-3 flex items-end justify-between gap-4">
        <h2 className="min-w-0 line-clamp-2 text-[28px] font-bold leading-[1.12] tracking-tight text-[var(--color-ink)]">
          {entry.item.title}
        </h2>
        <ChevronRight size={20} className="mb-1 shrink-0 text-[var(--color-muted)] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>

      {isNow ? (
        <div className="mt-4">
          <div className="h-1 overflow-hidden rounded-full" style={{ background: soft }}>
            <Motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={false}
              animate={{ width: `${Math.round(progress * 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          <p className="mt-2 text-[13px] font-semibold" style={{ color: strong }}>{remainingLabel(entry.end - now)} left</p>
        </div>
      ) : (
        <p className="mt-2 text-[13px] font-semibold" style={{ color: strong }}>Starts in {remainingLabel(entry.start - now)}</p>
      )}

      {followUp && (
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Then <span className="font-semibold text-[var(--color-ink)]">{followUp.item.title}</span> · {timeLabel(followUp.start)}
        </p>
      )}
    </button>
  );
};

export default NowCard;
