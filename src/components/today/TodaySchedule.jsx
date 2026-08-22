import { useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const HOUR_HEIGHT = 52;
const MIN_TIMELINE_HOURS = 8;
const MIN_BLOCK_HEIGHT = 46;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

const timeLabel = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

const durationLabel = (minutes) => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

const startOfHour = (date) => {
  const result = new Date(date);
  result.setMinutes(0, 0, 0);
  return result;
};

const endOfHour = (date) => {
  const result = startOfHour(date);
  if (result.getTime() < date.getTime()) result.setTime(result.getTime() + HOUR_MS);
  return result;
};

const buildTimeScale = (entries, now, showEarlier) => {
  if (entries.length === 0) return null;

  const firstEntry = entries[0];
  const lastEntry = entries.reduce((latest, entry) => (
    entry.end > latest ? entry.end : latest
  ), firstEntry.end);
  const firstReference = showEarlier
    ? firstEntry.start
    : new Date(Math.min(firstEntry.start.getTime(), now.getTime()));
  const rangeStart = startOfHour(firstReference);
  const requestedEnd = endOfHour(new Date(
    Math.max(lastEntry.getTime(), now.getTime()) + 30 * MINUTE_MS,
  ));
  const minimumEnd = new Date(rangeStart.getTime() + MIN_TIMELINE_HOURS * HOUR_MS);
  const rangeEnd = requestedEnd > minimumEnd ? requestedEnd : minimumEnd;
  const hours = Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / HOUR_MS);

  return {
    rangeStart,
    rangeEnd,
    hours,
    height: hours * HOUR_HEIGHT,
    ticks: Array.from({ length: hours + 1 }, (_, index) => new Date(rangeStart.getTime() + index * HOUR_MS)),
  };
};

const assignLanes = (entries) => {
  const laneEnds = [];
  const placed = entries.map((entry) => {
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= entry.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(entry.end);
    } else {
      laneEnds[lane] = entry.end;
    }
    return { entry, lane };
  });

  return { placed, laneCount: Math.max(1, laneEnds.length) };
};

const Block = ({ entry, isNow, isPast, lane, laneCount, scale, onOpen }) => {
  const color = entry.item.color || 'var(--color-accent)';
  const minutes = entry.item.duration || 60;
  const height = Math.max(MIN_BLOCK_HEIGHT, (minutes / 60) * HOUR_HEIGHT);
  const top = ((entry.start.getTime() - scale.rangeStart.getTime()) / HOUR_MS) * HOUR_HEIGHT;
  const compact = height < 70;

  return (
    <button
      type="button"
      onClick={() => onOpen(entry.item)}
      aria-label={`${entry.item.title}, ${timeLabel(entry.start)} to ${timeLabel(entry.end)}, ${durationLabel(minutes)}`}
      className="group absolute z-10 overflow-hidden rounded-xl border px-2.5 py-2 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
      style={{
        top: `${top}px`,
        left: `calc(${(lane / laneCount) * 100}% + ${lane ? 4 : 0}px)`,
        width: `calc(${100 / laneCount}% - 8px)`,
        height: `${height}px`,
        backgroundColor: `color-mix(in srgb, ${color} ${isPast ? 14 : 24}%, var(--color-card))`,
        borderColor: isNow
          ? `color-mix(in srgb, ${color} 60%, var(--color-rule))`
          : `color-mix(in srgb, ${color} ${isPast ? 18 : 28}%, var(--color-rule))`,
      }}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color, opacity: isPast ? 0.55 : 1 }} aria-hidden="true" />
        <span className={`block min-w-0 truncate text-xs font-semibold ${isPast ? 'text-[var(--color-muted)]' : 'text-[var(--color-ink)]'} ${isNow ? 'font-bold' : ''}`}>
          {entry.item.title}
        </span>
      </span>
      <span className="mt-1 block truncate text-[0.68rem] font-medium tabular-nums text-[var(--color-muted)]">
        {compact ? durationLabel(minutes) : `${timeLabel(entry.start)}–${timeLabel(entry.end)}`}
        {!compact && entry.item.category ? ` · ${entry.item.category}` : ''}
      </span>
    </button>
  );
};

/**
 * A proportional day track: one hour has a fixed height and each event is
 * sized from its duration. Past blocks stay available through the Earlier
 * disclosure so the main view can stay focused on the rest of the day.
 */
const TodaySchedule = ({ entries, now, onOpen }) => {
  const [showEarlier, setShowEarlier] = useState(false);
  const past = entries.filter((entry) => entry.end <= now);
  const ahead = entries.filter((entry) => entry.end > now);
  const visibleEntries = showEarlier ? entries : ahead;
  const scale = buildTimeScale(visibleEntries, now, showEarlier);
  const { placed, laneCount } = assignLanes(visibleEntries);
  const blocksLeft = ahead.length;
  const remainingMinutes = ahead.reduce((sum, entry) => (
    sum + Math.max(0, Math.round((entry.end - Math.max(entry.start, now)) / MINUTE_MS))
  ), 0);
  const nowPosition = scale
    ? ((now.getTime() - scale.rangeStart.getTime()) / HOUR_MS) * HOUR_HEIGHT
    : null;
  const nowIsVisible = nowPosition !== null && nowPosition >= 0 && nowPosition <= scale.height;

  return (
    <section aria-labelledby="today-timeline-heading">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 id="today-timeline-heading" className="text-base font-semibold tracking-tight text-[var(--color-ink)]">Timeline</h2>
          <p className="mt-0.5 text-xs text-[var(--color-muted)]">Blocks are scaled to their duration</p>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-[var(--color-muted)]">
          {entries.length === 0
            ? ''
            : blocksLeft === 0
              ? 'All done'
              : `${blocksLeft} left · ${durationLabel(remainingMinutes)}`}
        </span>
      </div>

      {entries.length === 0 ? (
        <p className="py-2 text-sm text-[var(--color-muted)]">A clear day. Ask your agent to plan it.</p>
      ) : (
        <div>
          {past.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEarlier((value) => !value)}
              className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted)] transition-colors hover:bg-[var(--color-card-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              aria-expanded={showEarlier}
            >
              <ChevronDown size={14} className={`transition-transform ${showEarlier ? '' : '-rotate-90'}`} aria-hidden="true" />
              <span>{showEarlier ? 'Hide earlier' : 'Earlier'}</span>
              <span className="tabular-nums">{past.length} {past.length === 1 ? 'block' : 'blocks'}</span>
            </button>
          )}

          {scale ? (
            <div
              className="relative"
              style={{ height: `${scale.height}px` }}
              aria-label={`Schedule from ${timeLabel(scale.rangeStart)} to ${timeLabel(scale.rangeEnd)}`}
            >
              {scale.ticks.map((tick, index) => (
                <div
                  key={tick.toISOString()}
                  className="pointer-events-none absolute inset-x-0 flex items-center"
                  style={{ top: `${index * HOUR_HEIGHT}px` }}
                >
                  <time className="w-14 shrink-0 -translate-y-1/2 text-right text-[0.68rem] font-semibold tabular-nums text-[var(--color-muted)]">
                    {timeLabel(tick)}
                  </time>
                  <span className="ml-3 flex-1 border-t border-[var(--color-rule)]" aria-hidden="true" />
                </div>
              ))}

              <div className="absolute bottom-0 left-[4.25rem] right-0 top-0">
                <span className="absolute inset-y-0 left-0 w-px bg-[var(--color-rule)]" aria-hidden="true" />

                {placed.map(({ entry, lane }) => (
                  <Block
                    key={entry.item.id || `${entry.start.toISOString()}-${entry.item.title}`}
                    entry={entry}
                    isNow={now >= entry.start && now < entry.end}
                    isPast={entry.end <= now}
                    lane={lane}
                    laneCount={laneCount}
                    scale={scale}
                    onOpen={onOpen}
                  />
                ))}

                {nowIsVisible && (
                  <div
                    className="pointer-events-none absolute left-[-0.25rem] right-0 z-20 flex -translate-y-1/2 items-center"
                    style={{ top: `${nowPosition}px` }}
                  >
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--color-accent)] ring-4 ring-[var(--color-accent-soft)]" aria-hidden="true" />
                    <span className="h-px flex-1 bg-[var(--color-accent)]" aria-hidden="true" />
                    <time className="ml-2 shrink-0 rounded-full bg-[var(--color-accent)] px-2 py-1 text-[0.68rem] font-bold tabular-nums text-[var(--color-accent-ink)]">
                      Now · {timeLabel(now)}
                    </time>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="py-2 text-sm text-[var(--color-muted)]">All scheduled blocks are complete.</p>
          )}
        </div>
      )}
    </section>
  );
};

export default TodaySchedule;
