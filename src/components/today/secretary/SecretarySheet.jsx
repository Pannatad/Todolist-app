import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CalendarRange, ChevronLeft, ChevronRight, MessageCircle, RefreshCw, Sun } from 'lucide-react';
import { Sheet } from '../../../ui';
import { useTask } from '../../../context/TaskContext';
import { useHabit } from '../../../context/HabitContext';
import { useWeekPlans } from '../../../context/WeekPlanContext';
import { useChatContext } from '../../../context/ChatContext';
import { useClasses } from '../../uni-board/useClasses';
import { formatMinutes, getWeekKey } from '../../../utils/weekPlan';
import { kindLabel } from '../../weekly/weeklyFormat';
import { summarizeDay, summarizeWeek } from '../../../services/secretaryBriefing';
import { INTENSITY_LABELS, buildDayBriefing, buildWeekBriefing, dayLabel, timeLabel } from './secretaryData';
import './secretary.css';

const CHOICES = [
  { id: 'day', icon: Sun, title: 'Summarize this day', subtitle: 'Schedule by type, main things, due soon, targets and habits' },
  { id: 'week', icon: CalendarRange, title: 'Week ahead', subtitle: 'Next 7 days, exams and events, every task due this week' },
];

const Section = ({ title, meta, children }) => (
  <section className="sec-section">
    <div className="ui-section-title"><h3>{title}</h3>{meta && <span>{meta}</span>}</div>
    {children}
  </section>
);

const Row = ({ dot, title, subtitle, trailing, onClick, muted }) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag type={onClick ? 'button' : undefined} className={`sec-row${muted ? ' is-muted' : ''}`} onClick={onClick}>
      {dot && <span className="sec-row__dot" style={{ '--dot': dot }} aria-hidden="true" />}
      <span className="sec-row__copy">
        <span className="sec-row__title">{title}</span>
        {subtitle && <span className="sec-row__subtitle">{subtitle}</span>}
      </span>
      {trailing && <span className="sec-row__trailing">{trailing}</span>}
      {onClick && <ChevronRight size={16} className="sec-row__chevron" aria-hidden="true" />}
    </Tag>
  );
};

const Notes = ({ items }) => (
  <ul className="sec-notes">
    {items.map((item, index) => <li key={`${index}-${item.slice(0, 16)}`}>{item}</li>)}
  </ul>
);

const Pending = ({ label }) => (
  <div className="sec-pending" role="status" aria-live="polite">
    <span className="sec-pending__bar" aria-hidden="true"><span /></span>
    <span>{label}</span>
  </div>
);

const Failure = ({ message, onRetry }) => (
  <div className="sec-failure" role="alert">
    <AlertCircle size={18} aria-hidden="true" />
    <p>{message}</p>
    <button type="button" className="today-text-button" onClick={onRetry}>Retry</button>
  </div>
);

const taskWhen = (task, withDay) => (withDay ? `${dayLabel(task.due)} · ` : '') + (task.record.deadline?.length === 10 ? 'All day' : timeLabel(task.due));

const DayReport = ({ briefing, report, status, error, onRetry, onOpenTask, onOpenSchedule }) => {
  const remainingMinutes = briefing.remaining.reduce((sum, block) => sum + Math.max(0, Math.round((block.end - Math.max(block.start, briefing.now)) / 60000)), 0);
  const dueCount = briefing.dueToday.length + briefing.overdue.length;
  return (
    <>
      <header className="sec-head">
        <span className={`sec-level is-${briefing.intensity}`}><span aria-hidden="true" />{INTENSITY_LABELS[briefing.intensity]}</span>
        <h3 className="sec-head__title">{report?.headline || briefing.dateLabel}</h3>
        <p className="sec-head__meta">
          {briefing.blocks.length} {briefing.blocks.length === 1 ? 'block' : 'blocks'} · {formatMinutes(briefing.load.minutes)} scheduled
          {remainingMinutes > 0 && briefing.remaining.length < briefing.blocks.length ? ` · ${formatMinutes(remainingMinutes)} left` : ''}
          {dueCount ? ` · ${dueCount} due` : ''}
        </p>
        {report?.intensityNote && <p className="sec-head__note">{report.intensityNote}</p>}
      </header>

      {status === 'loading' && <Pending label="Reading your day…" />}
      {status === 'error' && <Failure message={error} onRetry={onRetry} />}

      {report?.mainThings?.length > 0 && (
        <Section title="Main things">
          <div className="ui-group">
            {report.mainThings.map((item, index) => (
              <Row key={item.title} title={item.title} subtitle={item.why} trailing={<span className="sec-index">{index + 1}</span>} />
            ))}
          </div>
        </Section>
      )}

      {report?.groups?.length > 0 && (
        <Section title="Schedule by type" meta={`${briefing.blocks.length} blocks`}>
          <div className="ui-group">
            {report.groups.map((group) => {
              const blocks = group.blocks.map((title) => briefing.blocks.find((block) => block.title === title)).filter(Boolean);
              const minutes = blocks.reduce((sum, block) => sum + block.minutes, 0);
              return (
                <Row
                  key={group.label}
                  dot={blocks[0]?.record.color || 'var(--color-accent)'}
                  title={group.label}
                  subtitle={blocks.map((block) => `${timeLabel(block.start)} ${block.title}`).join(' · ')}
                  trailing={formatMinutes(minutes)}
                />
              );
            })}
          </div>
        </Section>
      )}

      {!report && status !== 'loading' && briefing.blocks.length > 0 && (
        <Section title="Schedule" meta={`${briefing.blocks.length} blocks`}>
          <div className="ui-group">
            {briefing.blocks.map((block) => (
              <Row key={block.id + block.start.toISOString()} dot={block.record.color || 'var(--color-accent)'} title={block.title} subtitle={block.category} trailing={`${timeLabel(block.start)} · ${formatMinutes(block.minutes)}`} onClick={() => onOpenSchedule(block.record)} />
            ))}
          </div>
        </Section>
      )}

      {(briefing.dueToday.length > 0 || briefing.dueTomorrow.length > 0 || briefing.overdue.length > 0) && (
        <Section title="Due" meta={`${briefing.dueToday.length} today · ${briefing.dueTomorrow.length} tomorrow`}>
          <div className="ui-group">
            {briefing.overdue.map((task) => <Row key={task.id} dot="var(--color-error)" title={task.title} subtitle={`Overdue${task.subject ? ` · ${task.subject}` : ''}`} trailing={dayLabel(task.due)} onClick={() => onOpenTask(task.record)} />)}
            {briefing.dueToday.map((task) => <Row key={task.id} dot="var(--color-warning)" title={task.title} subtitle={`Today${task.subject ? ` · ${task.subject}` : ''}`} trailing={taskWhen(task)} onClick={() => onOpenTask(task.record)} />)}
            {briefing.dueTomorrow.map((task) => <Row key={task.id} dot="var(--color-rule-2)" title={task.title} subtitle={`Tomorrow${task.subject ? ` · ${task.subject}` : ''}`} trailing={taskWhen(task)} onClick={() => onOpenTask(task.record)} />)}
          </div>
        </Section>
      )}

      {(briefing.targets.length > 0 || briefing.habits.length > 0) && (
        <Section title="Targets and habits" meta={`${briefing.targets.filter((target) => target.todayMet).length + briefing.habits.filter((habit) => habit.done).length} of ${briefing.targets.length + briefing.habits.length} done`}>
          <div className="ui-group">
            {briefing.targets.map((target) => (
              <Row key={target.id} dot={target.color} title={target.label} subtitle={`Daily target · ${target.daysMet} of ${Math.max(1, target.daysPast + 1)} days met`} trailing={<span className={target.todayMet ? 'is-met' : ''}>{formatMinutes(target.todayDone)} / {formatMinutes(target.minutes)}</span>} muted={target.todayMet} />
            ))}
            {briefing.habits.map((habit) => (
              <Row key={habit.id} dot={habit.done ? 'var(--color-success)' : 'var(--color-rule-2)'} title={habit.name} subtitle={habit.timeOfDay === 'anytime' ? 'Habit' : `Habit · ${habit.timeOfDay}`} trailing={habit.done ? <span className="is-met">Done</span> : 'Open'} muted={habit.done} />
            ))}
          </div>
        </Section>
      )}

      {report?.watchOuts?.length > 0 && (
        <Section title="Watch out"><div className="ui-group"><Notes items={report.watchOuts} /></div></Section>
      )}
      {report?.advice && <p className="sec-advice">{report.advice}</p>}
    </>
  );
};

const WeekReport = ({ briefing, report, status, error, onRetry, onOpenTask, onOpenSchedule }) => {
  const dueByDay = new Map();
  briefing.dueThisWeek.forEach((task) => {
    if (!dueByDay.has(task.dueKey)) dueByDay.set(task.dueKey, []);
    dueByDay.get(task.dueKey).push(task);
  });
  return (
    <>
      <header className="sec-head">
        <span className="sec-head__eyebrow">{briefing.rangeLabel}</span>
        <h3 className="sec-head__title">{report?.headline || 'Your week ahead'}</h3>
        <p className="sec-head__meta">
          {formatMinutes(briefing.totalMinutes)} scheduled · {briefing.dueThisWeek.length} {briefing.dueThisWeek.length === 1 ? 'task' : 'tasks'} due
          {briefing.university.length ? ` · ${briefing.university.length} university ${briefing.university.length === 1 ? 'event' : 'events'}` : ''}
        </p>
        {report?.overview && <p className="sec-head__note">{report.overview}</p>}
      </header>

      {status === 'loading' && <Pending label="Reading your week…" />}
      {status === 'error' && <Failure message={error} onRetry={onRetry} />}

      <Section title="Day by day">
        <div className="ui-group">
          {briefing.days.map((day) => (
            <div key={day.dateKey} className={`sec-day${day.isToday ? ' is-today' : ''}`}>
              <span className={`sec-day__level is-${day.intensity}`} aria-label={INTENSITY_LABELS[day.intensity]} />
              <span className="sec-day__name">{day.isToday ? 'Today' : day.date.toLocaleDateString([], { weekday: 'short' })}<small>{day.date.toLocaleDateString([], { day: 'numeric', month: 'short' })}</small></span>
              <span className="sec-day__copy">
                <span className="sec-day__facts">
                  {day.blocks.length === 0 ? 'Nothing scheduled' : `${formatMinutes(day.load.minutes)} · ${day.blocks.length} ${day.blocks.length === 1 ? 'block' : 'blocks'}`}
                  {day.classCount ? ` · ${day.classCount} ${day.classCount === 1 ? 'class' : 'classes'}` : ''}
                  {day.dueTasks.length ? ` · ${day.dueTasks.length} due` : ''}
                </span>
                {report?.dayNotes?.[day.dateKey] && <span className="sec-day__note">{report.dayNotes[day.dateKey]}</span>}
              </span>
            </div>
          ))}
        </div>
      </Section>

      {(briefing.university.length > 0 || briefing.announcements.length > 0) && (
        <Section title="University" meta={briefing.university.length ? `${briefing.university.length} coming up` : undefined}>
          <div className="ui-group">
            {briefing.university.map((item) => {
              const note = report?.highlights?.find((highlight) => highlight.title === item.title)?.note;
              return (
                <Row
                  key={item.id}
                  dot={['exam', 'quiz'].includes(item.kind) ? 'var(--color-error)' : 'var(--color-accent)'}
                  title={item.title}
                  subtitle={[kindLabel(item.kind), item.subject, note].filter(Boolean).join(' · ')}
                  trailing={<span className={item.daysAway <= 2 ? 'is-soon' : ''}>{item.daysAway === 0 ? 'Today' : item.daysAway === 1 ? 'Tomorrow' : dayLabel(item.when)}</span>}
                  onClick={() => (item.id.startsWith('task:') ? onOpenTask(briefing.dueThisWeek.find((task) => `task:${task.id}` === item.id)?.record) : onOpenSchedule(briefing.days.find((day) => day.dateKey === item.dateKey)?.blocks.find((block) => item.id === `schedule:${block.id}:${item.dateKey}`)?.record))}
                />
              );
            })}
            {briefing.announcements.map((item) => (
              <Row key={item.id} dot="var(--color-warning)" title={item.title} subtitle={[item.className || 'Announcement', item.body].filter(Boolean).join(' · ')} trailing="Pinned" />
            ))}
          </div>
        </Section>
      )}

      {report?.highlights?.some((highlight) => !briefing.university.some((item) => item.title === highlight.title)) && (
        <Section title="Worth preparing for">
          <div className="ui-group">
            {report.highlights.filter((highlight) => !briefing.university.some((item) => item.title === highlight.title)).map((highlight) => (
              <Row key={highlight.title} title={highlight.title} subtitle={highlight.note} />
            ))}
          </div>
        </Section>
      )}

      {(briefing.dueThisWeek.length > 0 || briefing.overdue.length > 0) && (
        <Section title="Tasks due this week" meta={`${briefing.dueThisWeek.length}`}>
          {briefing.overdue.length > 0 && (
            <div className="ui-group sec-group">
              {briefing.overdue.map((task) => <Row key={task.id} dot="var(--color-error)" title={task.title} subtitle={`Overdue${task.subject ? ` · ${task.subject}` : ''}`} trailing={dayLabel(task.due)} onClick={() => onOpenTask(task.record)} />)}
            </div>
          )}
          {[...dueByDay.entries()].map(([dateKey, tasks]) => (
            <div key={dateKey} className="sec-group">
              <p className="sec-group__label">{tasks[0].dueKey === briefing.days[0].dateKey ? 'Today' : dayLabel(tasks[0].due)}</p>
              <div className="ui-group">
                {tasks.map((task) => <Row key={task.id} dot={task.workspace === 'university' ? 'var(--color-accent)' : 'var(--color-rule-2)'} title={task.title} subtitle={[task.subject, task.uniKind && task.uniKind !== 'task' ? kindLabel(task.uniKind) : ''].filter(Boolean).join(' · ') || 'Task'} trailing={task.record.deadline?.length === 10 ? 'All day' : timeLabel(task.due)} onClick={() => onOpenTask(task.record)} />)}
              </div>
            </div>
          ))}
        </Section>
      )}

      {briefing.targets.length > 0 && (
        <Section title="Daily targets" meta="This week so far">
          <div className="ui-group">
            {briefing.targets.map((target) => (
              <Row key={target.id} dot={target.color} title={target.label} subtitle={`${formatMinutes(target.minutes)} a day`} trailing={`${target.daysMet} of ${Math.max(1, target.daysPast + 1)} days`} />
            ))}
          </div>
        </Section>
      )}

      {report?.watchOuts?.length > 0 && (
        <Section title="Watch out"><div className="ui-group"><Notes items={report.watchOuts} /></div></Section>
      )}
      {report?.advice && <p className="sec-advice">{report.advice}</p>}
    </>
  );
};

/** Pulls every source the secretary reads and runs one briefing at a time. */
const SecretaryBody = ({ now, mode, onPick, onBack, onOpenTask, onOpenSchedule, chatSuggestion, onAskChat }) => {
  const { tasks, scheduleItems, isLoading, refreshData } = useTask();
  const { habits, getHabitsForDate, getHabitLog } = useHabit();
  const { getPlan } = useWeekPlans();
  const { selectedAIProvider } = useChatContext();
  const { classes, announcements } = useClasses(isLoading, refreshData);
  const weekPlan = getPlan(getWeekKey(now));
  const [runs, setRuns] = useState({});
  const requestId = useRef(0);

  const sources = { now, scheduleItems, tasks, habits, getHabitsForDate, getHabitLog, weekPlan, announcements, classes };
  const briefing = mode === 'day' ? buildDayBriefing(sources) : mode === 'week' ? buildWeekBriefing(sources) : null;

  const run = (kind, facts) => {
    const id = ++requestId.current;
    setRuns((current) => ({ ...current, [kind]: { status: 'loading', report: current[kind]?.report || null, error: null } }));
    (kind === 'day' ? summarizeDay : summarizeWeek)(facts, { provider: selectedAIProvider })
      .then((report) => { if (id === requestId.current) setRuns((current) => ({ ...current, [kind]: { status: 'ready', report, error: null } })); })
      .catch((failure) => { if (id === requestId.current) setRuns((current) => ({ ...current, [kind]: { status: 'error', report: current[kind]?.report || null, error: failure?.message || 'The secretary could not reach the AI.' } })); });
  };

  // Each choice runs once per open; Refresh runs it again with current data.
  const started = useRef(new Set());
  useEffect(() => {
    if (!mode || started.current.has(mode) || isLoading) return;
    started.current.add(mode);
    const facts = mode === 'day' ? buildDayBriefing(sources) : buildWeekBriefing(sources);
    run(mode, facts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, isLoading]);

  if (!mode) {
    return (
      <div className="sec-choices">
        <div className="ui-group">
          {CHOICES.map((choice) => (
            <button key={choice.id} type="button" className="sec-choice" onClick={() => onPick(choice.id)}>
              <span className="sec-choice__icon" aria-hidden="true"><choice.icon size={18} strokeWidth={2.1} /></span>
              <span className="sec-choice__copy"><span className="sec-choice__title">{choice.title}</span><span className="sec-choice__subtitle">{choice.subtitle}</span></span>
              <ChevronRight size={17} className="sec-row__chevron" aria-hidden="true" />
            </button>
          ))}
        </div>
        {chatSuggestion && (
          <div className="ui-group sec-group">
            <button type="button" className="sec-choice" onClick={onAskChat}>
              <span className="sec-choice__icon is-plain" aria-hidden="true"><MessageCircle size={18} strokeWidth={2.1} /></span>
              <span className="sec-choice__copy"><span className="sec-choice__title">{chatSuggestion.message}</span><span className="sec-choice__subtitle">Ask in chat</span></span>
              <ChevronRight size={17} className="sec-row__chevron" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    );
  }

  const current = runs[mode] || { status: isLoading ? 'loading' : 'idle', report: null, error: null };
  const Report = mode === 'day' ? DayReport : WeekReport;
  return (
    <div className="sec-report" key={mode}>
      <div className="sec-toolbar">
        <button type="button" className="today-text-button sec-back" onClick={onBack}><ChevronLeft size={18} aria-hidden="true" />Secretary</button>
        <button type="button" className="today-text-button sec-refresh" onClick={() => run(mode, briefing)} disabled={current.status === 'loading'} aria-label="Refresh summary">
          <RefreshCw size={15} aria-hidden="true" className={current.status === 'loading' ? 'is-spinning' : ''} />Refresh
        </button>
      </div>
      <Report briefing={briefing} report={current.report} status={current.status} error={current.error} onRetry={() => run(mode, briefing)} onOpenTask={onOpenTask} onOpenSchedule={onOpenSchedule} />
    </div>
  );
};

/**
 * The secretary: a sheet with two briefings, each drawn as grouped lists from
 * facts the app computed, with the model adding the headline, grouping and
 * what to watch. Facts still show when the AI is offline.
 */
const SecretarySheet = ({ open, onClose, now, onOpenTask, onOpenSchedule, chatSuggestion, onAskChat }) => {
  const [mode, setMode] = useState(null);
  // Reset with the close so the next open starts at the choices; the sheet
  // keeps showing the last report while it animates out.
  const close = () => { onClose(); setMode(null); };
  const title = mode === 'day' ? 'Today' : mode === 'week' ? 'Week ahead' : 'Secretary';
  const description = mode ? undefined : 'Pick a briefing. Your secretary reads the schedule, tasks, targets and habits.';

  return (
    <Sheet open={open} onClose={close} title={title} description={description} className="secretary-sheet">
      {open && (
        <SecretaryBody
          now={now}
          mode={mode}
          onPick={setMode}
          onBack={() => setMode(null)}
          onOpenTask={(task) => { if (task) { close(); onOpenTask(task); } }}
          onOpenSchedule={(item) => { if (item) { close(); onOpenSchedule(item); } }}
          chatSuggestion={chatSuggestion}
          onAskChat={() => { close(); onAskChat(); }}
        />
      )}
    </Sheet>
  );
};

export default SecretarySheet;
