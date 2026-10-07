import { useState } from 'react';

const HOUR_HEIGHT = 56;
const MIN_TIMELINE_HOURS = 6;
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

const timeLabel = (date) => date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const hourLabel = (date) => date.toLocaleTimeString([], { hour: 'numeric' });

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

const Block = ({ entry, isPast, lane, laneCount, scale, onOpen }) => {
  const color = entry.item.color || 'var(--color-accent)';
  const minutes = Math.max(1, Math.round((entry.end - entry.start) / MINUTE_MS));
  const height = Math.max(22, (minutes / 60) * HOUR_HEIGHT - 2);
  const top = ((entry.start.getTime() - scale.rangeStart.getTime()) / HOUR_MS) * HOUR_HEIGHT + 1;
  const compact = height < 44;

  return (
    <button
      type="button"
      onClick={() => onOpen(entry.item)}
      aria-label={`${entry.item.title}, ${timeLabel(entry.start)} to ${timeLabel(entry.end)}`}
      className={`timeline-block${compact ? ' is-compact' : ''}${isPast ? ' is-past' : ''}`}
      style={{
        '--event': color,
        top: `${top}px`,
        left: `calc(${(lane / laneCount) * 100}% + ${lane ? 2 : 0}px)`,
        width: `calc(${100 / laneCount}% - ${laneCount > 1 ? 4 : 0}px)`,
        height: `${height}px`,
      }}
    >
      <span className="timeline-block__title">{entry.item.title}</span>
      {!compact && <span className="timeline-block__time">{timeLabel(entry.start)} · {durationLabel(minutes)}</span>}
    </button>
  );
};

/**
 * A proportional day track in the style of Calendar's day view: hours have a
 * fixed height, events are sized by duration, and a red line marks the time.
 */
const TodaySchedule = ({ entries, now, onOpen }) => {
  const [showEarlier, setShowEarlier] = useState(false);
  const past = entries.filter((entry) => entry.end <= now);
  const ahead = entries.filter((entry) => entry.end > now);
  const visibleEntries = showEarlier ? entries : ahead;
  const scale = buildTimeScale(visibleEntries, now, showEarlier);
  const { placed, laneCount } = assignLanes(visibleEntries);
  const nowPosition = scale
    ? ((now.getTime() - scale.rangeStart.getTime()) / HOUR_MS) * HOUR_HEIGHT
    : null;
  const nowIsVisible = nowPosition !== null && nowPosition >= 0 && nowPosition <= scale.height;

  return (
    <section aria-labelledby="today-timeline-heading">
      <div className="ui-section-title">
        <h2 id="today-timeline-heading">Schedule</h2>
        {past.length > 0 && (
          <button
            type="button"
            className="today-text-button"
            onClick={() => setShowEarlier((value) => !value)}
            aria-expanded={showEarlier}
          >
            {showEarlier ? 'Hide Earlier' : 'Show Earlier'}
          </button>
        )}
      </div>

      <div className="ui-card today-timeline">
        {entries.length === 0 ? (
          <p className="today-empty">No events today.</p>
        ) : !scale ? (
          <p className="today-empty">That’s everything for today.</p>
        ) : (
          <div
            className="timeline"
            style={{ height: `${scale.height}px` }}
            aria-label={`Schedule from ${timeLabel(scale.rangeStart)} to ${timeLabel(scale.rangeEnd)}`}
          >
            {scale.ticks.map((tick, index) => {
              const hidden = nowIsVisible && Math.abs(index * HOUR_HEIGHT - nowPosition) < 12;
              return (
                <div key={tick.toISOString()} className="timeline__tick" style={{ top: `${index * HOUR_HEIGHT}px` }}>
                  <time className={hidden ? 'is-hidden' : undefined}>{hourLabel(tick)}</time>
                  <span aria-hidden="true" />
                </div>
              );
            })}

            <div className="timeline__track">
              {placed.map(({ entry, lane }) => (
                <Block
                  key={entry.item.id || `${entry.start.toISOString()}-${entry.item.title}`}
                  entry={entry}
                  isPast={entry.end <= now}
                  lane={lane}
                  laneCount={laneCount}
                  scale={scale}
                  onOpen={onOpen}
                />
              ))}
            </div>

            {nowIsVisible && (
              <div className="timeline__now" style={{ top: `${nowPosition}px` }} aria-hidden="true">
                <time>{timeLabel(now).replace(/\s?[AP]M$/i, '')}</time>
                <span className="timeline__now-dot" />
                <span className="timeline__now-line" />
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};

export default TodaySchedule;
