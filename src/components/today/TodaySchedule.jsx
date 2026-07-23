import { useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Check, ChevronDown, Circle } from 'lucide-react';

const timeLabel = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const durationLabel = (minutes) => {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
};

/* One row on the thread. The dot column lines up with the continuous line
 * drawn by the parent; no card, no background — just type on the page. */
const BlockRow = ({ entry, isNow, isPast, onOpen }) => {
  const color = entry.item.color || 'var(--color-accent)';
  return (
    <button
      type="button"
      onClick={() => onOpen(entry.item)}
      className={`group flex w-full items-start gap-0 py-2.5 text-left focus:outline-none ${isPast ? 'opacity-40' : ''}`}
    >
      <span
        className="w-16 shrink-0 pt-0.5 text-right text-xs font-semibold tabular-nums"
        style={{ color: isPast ? 'var(--color-muted)' : `color-mix(in oklch, ${color} 65%, var(--color-ink))` }}
      >
        {timeLabel(entry.start)}
      </span>
      <span className="relative z-10 flex w-10 shrink-0 justify-center pt-1">
        <span
          className={isNow ? 'h-3.5 w-3.5 rounded-full' : 'h-2.5 w-2.5 rounded-full'}
          style={{
            backgroundColor: color,
            boxShadow: isNow
              ? `0 0 0 5px color-mix(in srgb, ${color} 22%, transparent), 0 2px 10px color-mix(in srgb, ${color} 45%, transparent)`
              : `0 0 0 4px color-mix(in srgb, ${color} 14%, transparent)`
          }}
          aria-hidden="true"
        />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className={`truncate text-[0.95rem] text-[var(--color-ink)] ${isNow ? 'font-bold' : 'font-semibold'} group-hover:underline decoration-[var(--color-rule-2)] underline-offset-2`}>
            {entry.item.title}
          </span>
          {isNow && (
            <span className="shrink-0 text-xs font-bold" style={{ color: `color-mix(in oklch, ${color} 72%, var(--color-ink))` }}>
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
};

/* A task deadline living on the same thread: the marker is the complete button. */
const TaskRow = ({ task, deadline, isOverdue, onComplete, onOpenTask }) => (
  <div className="flex w-full items-start gap-0 py-2.5">
    <span className="w-16 shrink-0 pt-0.5 text-right text-xs font-semibold tabular-nums text-[var(--color-muted)]">
      {timeLabel(deadline)}
    </span>
    <span className="relative z-10 flex w-10 shrink-0 justify-center pt-0.5">
      <button
        type="button"
        onClick={() => onComplete(task.id)}
        aria-label={`Complete "${task.title}"`}
        className="group -m-1 p-1 text-[var(--color-muted)] transition-transform active:scale-90"
      >
        <Circle size={17} className="group-hover:hidden" />
        <Check size={17} className="hidden text-[var(--color-accent)] group-hover:block" />
      </button>
    </span>
    <button type="button" onClick={() => onOpenTask(task)} className="min-w-0 flex-1 text-left">
      <span className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[0.95rem] font-semibold text-[var(--color-ink)]">{task.title}</span>
        <span className={`shrink-0 text-xs font-bold ${isOverdue ? 'text-[var(--color-error)]' : 'text-[var(--color-muted)]'}`}>
          {isOverdue ? 'Overdue' : 'Due'}
        </span>
      </span>
      {task.subject && <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">{task.subject}</span>}
    </button>
  </div>
);

/**
 * The whole day as one continuous thread: schedule blocks and task deadlines
 * merged onto a single timeline. No cards — the line is the structure.
 */
const TodaySchedule = ({ entries, dueTasks = [], now, onOpen, onCompleteTask, onOpenTask }) => {
  const [showEarlier, setShowEarlier] = useState(false);

  const items = [
    ...entries.map((entry) => ({ kind: 'block', at: entry.start, end: entry.end, entry })),
    ...dueTasks.map((task) => {
      const deadline = new Date(task.deadline);
      return { kind: 'task', at: deadline, end: deadline, task };
    }),
  ].sort((left, right) => left.at - right.at);

  const past = items.filter((item) => item.kind === 'block' && item.end <= now);
  const ahead = items.filter((item) => !(item.kind === 'block' && item.end <= now));
  const blocksLeft = ahead.filter((item) => item.kind === 'block').length;
  const remainingMinutes = ahead.reduce((sum, item) => (
    item.kind === 'block' ? sum + Math.max(0, Math.round((item.end - Math.max(item.at, now)) / 60000)) : sum
  ), 0);

  const renderItem = (item, index) => item.kind === 'block' ? (
    <BlockRow
      key={item.entry.item.id || `block-${index}`}
      entry={item.entry}
      isNow={now >= item.at && now < item.end}
      isPast={item.end <= now}
      onOpen={onOpen}
    />
  ) : (
    <TaskRow
      key={`task-${item.task.id}`}
      task={item.task}
      deadline={item.at}
      isOverdue={item.at < now}
      onComplete={onCompleteTask}
      onOpenTask={onOpenTask}
    />
  );

  return (
    <section>
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted)]">Timeline</h2>
        <span className="text-xs font-medium text-[var(--color-muted)]">
          {items.length === 0
            ? ''
            : blocksLeft === 0
              ? 'All done'
              : `${blocksLeft} left · ${durationLabel(remainingMinutes)}`}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="py-2 text-sm text-[var(--color-muted)]">A clear day. Ask your agent to plan it.</p>
      ) : (
        <div className="relative">
          {/* the thread itself */}
          <span className="absolute bottom-3 left-[5.25rem] top-3 w-px bg-[var(--color-rule)]" aria-hidden="true" />

          {past.length > 0 && (
            <button
              type="button"
              onClick={() => setShowEarlier((value) => !value)}
              className="flex w-full items-center gap-1.5 py-2 pl-16 text-xs font-semibold text-[var(--color-muted)] focus:outline-none focus-visible:underline"
            >
              <ChevronDown size={14} className={`transition-transform ${showEarlier ? '' : '-rotate-90'}`} aria-hidden="true" />
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
                {past.map(renderItem)}
              </Motion.div>
            )}
          </AnimatePresence>

          {ahead.map(renderItem)}
        </div>
      )}
    </section>
  );
};

export default TodaySchedule;
