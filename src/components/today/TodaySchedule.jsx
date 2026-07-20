import { useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const timeLabel = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const durationLabel = (minutes) => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const Row = ({ entry, isNow, isPast, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(entry.item)}
    className={`grid w-full grid-cols-[3.4rem_auto_minmax(0,1fr)] items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors ${
      isNow ? 'bg-[var(--color-accent-soft)]' : 'hover:bg-[var(--color-paper-2)]'
    } ${isPast ? 'opacity-45' : ''}`}
  >
    <span className="text-xs font-semibold tabular-nums text-[var(--color-muted)]">{timeLabel(entry.start)}</span>
    <span
      className="h-7 w-1 rounded-full"
      style={{ backgroundColor: entry.item.color || 'var(--color-accent)' }}
      aria-hidden="true"
    />
    <span className="min-w-0">
      <span className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold text-[var(--color-ink)]">{entry.item.title}</span>
        {isNow && (
          <span className="shrink-0 rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[0.65rem] font-bold text-[var(--color-accent-ink)]">
            Now
          </span>
        )}
      </span>
      <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">
        {[entry.item.category, durationLabel(entry.item.duration || 60)].filter(Boolean).join(' · ')}
      </span>
    </span>
  </button>
);

/**
 * Today's blocks as a quiet time-rail list. Past blocks fold away behind an
 * "Earlier" toggle so the list always starts at what matters now.
 */
const TodaySchedule = ({ entries, now, onOpen }) => {
  const [showEarlier, setShowEarlier] = useState(false);

  const past = entries.filter((entry) => entry.end <= now);
  const rest = entries.filter((entry) => entry.end > now);
  const remainingMinutes = rest.reduce(
    (sum, entry) => sum + Math.max(0, Math.round((entry.end - Math.max(entry.start, now)) / 60000)),
    0
  );

  return (
    <section className="ui-card p-4">
      <div className="mb-1 flex items-baseline justify-between px-2">
        <h2 className="text-base font-bold tracking-tight text-[var(--color-ink)]">Today</h2>
        <span className="text-xs font-medium text-[var(--color-muted)]">
          {entries.length === 0
            ? 'Nothing scheduled'
            : rest.length === 0
              ? 'All done'
              : `${rest.length} left · ${durationLabel(remainingMinutes)}`}
        </span>
      </div>

      {past.length > 0 && (
        <button
          type="button"
          onClick={() => setShowEarlier((value) => !value)}
          className="flex w-full items-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:bg-[var(--color-paper-2)]"
        >
          <ChevronDown
            size={14}
            className={`transition-transform ${showEarlier ? '' : '-rotate-90'}`}
            aria-hidden="true"
          />
          Earlier · {past.length} {past.length === 1 ? 'block' : 'blocks'}
        </button>
      )}

      <AnimatePresence initial={false}>
        {showEarlier && (
          <Motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            {past.map((entry, index) => (
              <Row key={entry.item.id || `past-${index}`} entry={entry} isPast onOpen={onOpen} />
            ))}
          </Motion.div>
        )}
      </AnimatePresence>

      {rest.map((entry, index) => (
        <Row
          key={entry.item.id || `rest-${index}`}
          entry={entry}
          isNow={now >= entry.start && now < entry.end}
          onOpen={onOpen}
        />
      ))}

      {entries.length === 0 && (
        <p className="px-2 pb-1 text-sm text-[var(--color-muted)]">A clear day. Ask your agent to plan it.</p>
      )}
    </section>
  );
};

export default TodaySchedule;
