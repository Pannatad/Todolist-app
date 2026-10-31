import { useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  CreditCard,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react';
import { AGENDA_KIND_OPTIONS, AGENDA_RANGE_OPTIONS } from './constants';
import {
  filterAgendaGroups,
  formatDayTitle,
  formatRelativeDay,
  formatShortDate,
  formatTime,
  getItemKind,
  getItemNotes,
  getDayUrgency,
  isEndOfDay,
} from './formatters';
import { KindTag, SectionHeading } from './SectionHeading';

const AgendaItemIcon = ({ item }) => {
  switch (getItemKind(item)) {
    case 'task': return <ClipboardList size={15} />;
    case 'payment': return <CreditCard size={15} />;
    case 'registration': return <ClipboardCheck size={15} />;
    case 'meeting': return <Users size={15} />;
    case 'report': return <FileText size={15} />;
    case 'deadline': return <Clock3 size={15} />;
    case 'exam': return <GraduationCap size={15} />;
    case 'quiz': return <CircleHelp size={15} />;
    case 'event': return <CalendarDays size={15} />;
    default: return <CalendarDays size={15} />;
  }
};

const notesIdFor = (itemKey) => `uni-board-agenda-notes-${String(itemKey).replace(/[^a-z0-9_-]/gi, '-')}`;

const getNotesText = (item) => {
  const notes = getItemNotes(item);
  return typeof notes === 'string' ? notes.trim() : notes ? String(notes) : '';
};

export const AgendaItemRow = ({ item, onSelect, isNotesOpen, onToggleNotes }) => {
  const kind = getItemKind(item);
  const showTime = item.occursAt && !isEndOfDay(item.occursAt);
  const notesId = notesIdFor(item.key);
  const notes = getNotesText(item);

  return (
    <div className={`uni-board-agenda-row${item.completed ? ' is-complete' : ''}${isNotesOpen ? ' is-notes-open' : ''}${notes ? ' has-notes' : ''}`}>
      <button type="button" className="uni-board-agenda-row__main" onClick={() => onSelect(item)}>
        <span className={`uni-board-agenda-row__marker uni-kind--${kind}`} aria-hidden="true">
          <AgendaItemIcon item={item} />
        </span>
        <span className="uni-board-item-copy">
          <strong>{item.title}</strong>
          <span className="uni-board-item-meta">
            <KindTag kind={kind} />
            <span className="uni-board-item-meta__text">{item.subject || 'University'}</span>
          </span>
        </span>
        <span className={`uni-board-agenda-row__time${showTime ? '' : ' is-due'}`}>
          {!item.occursAt ? 'Any time' : showTime ? formatTime(item.occursAt) : 'Due'}
        </span>
      </button>
      {notes && (
        <button
          type="button"
          className={`uni-board-agenda-row__toggle${isNotesOpen ? ' is-open' : ''}`}
          aria-label={`${isNotesOpen ? 'Hide' : 'Show'} notes for ${item.title}`}
          aria-expanded={isNotesOpen}
          aria-controls={notesId}
          onClick={() => onToggleNotes(item.key)}
        >
          <ChevronDown size={18} aria-hidden="true" />
        </button>
      )}
      {isNotesOpen && (
        <div id={notesId} className="uni-board-agenda-row__details">
          <span className="uni-board-agenda-row__details-label">Notes</span>
          <p>{notes || 'No notes added.'}</p>
        </div>
      )}
    </div>
  );
};

const Agenda = ({
  groups,
  onSelect,
  isLoading,
  now,
  range = '14',
  onRangeChange = () => {},
  kind = 'all',
  onKindChange = () => {},
}) => {
  const [expandedNotes, setExpandedNotes] = useState(() => new Set());
  const visibleGroups = filterAgendaGroups(groups, kind);
  const kindLabel = AGENDA_KIND_OPTIONS.find((option) => option.id === kind)?.label;

  const toggleNotes = (itemKey) => {
    setExpandedNotes((current) => {
      const next = new Set(current);
      if (next.has(itemKey)) next.delete(itemKey);
      else next.add(itemKey);
      return next;
    });
  };

  return (
    <section className="uni-board-agenda" aria-labelledby="uni-board-agenda-title">
      <SectionHeading id="uni-board-agenda-title" icon={CalendarDays} title="Agenda" tone="accent">
        <div className="uni-board-agenda__filters">
          <label className="pill-select">
            <span className="sr-only">Show type</span>
            <select value={kind} onChange={(event) => onKindChange(event.target.value)}>
              {AGENDA_KIND_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
            <ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
          </label>
          <label className="pill-select">
            <span className="sr-only">Show upcoming</span>
            <select value={range} onChange={(event) => onRangeChange(event.target.value)}>
              {AGENDA_RANGE_OPTIONS.map((option) => <option key={option.id} value={option.id}>{option.id === 'all' ? 'All upcoming' : `Next ${option.label}`}</option>)}
            </select>
            <ChevronDown size={14} strokeWidth={2.4} aria-hidden="true" />
          </label>
        </div>
      </SectionHeading>
      {isLoading ? <div className="uni-board-skeleton-list" aria-label="Loading agenda">{[1, 2, 3].map((row) => <span key={row} className="uni-board-skeleton-row" />)}</div> : visibleGroups.length > 0 ? (
        <div className="uni-board-agenda-list">
          {visibleGroups.map((group) => (
            <div key={group.dateKey} className="uni-board-agenda-day">
              <div className="uni-board-agenda-day__heading">
                <h3>
                  <span className="uni-board-agenda-day__title">{formatDayTitle(group.date)}</span>
                  <span className="uni-board-agenda-day__date">{formatShortDate(group.date)}</span>
                </h3>
                <span className={`uni-urgency-pill is-${getDayUrgency(group.date, now)}`}>
                  {formatRelativeDay(group.date, now)}
                </span>
              </div>
              <div className="ui-group uni-board-agenda-day__items">
                {group.items.map((item) => (
                  <AgendaItemRow
                    key={item.key}
                    item={item}
                    onSelect={onSelect}
                    isNotesOpen={expandedNotes.has(item.key)}
                    onToggleNotes={toggleNotes}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="ui-empty-card">
          {kind === 'all' ? 'Nothing due in this range.' : `No ${kindLabel.toLowerCase()} in this range.`}
        </p>
      )}
    </section>
  );
};

export default Agenda;
