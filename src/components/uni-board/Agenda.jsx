import { useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  CreditCard,
  FileText,
  GraduationCap,
  Users,
} from 'lucide-react';
import SegmentedControl from '../../ui/SegmentedControl';
import { AGENDA_RANGE_OPTIONS } from './constants';
import {
  formatAgendaDate,
  formatDaysRemaining,
  formatShortDate,
  formatTime,
  formatTimeRemaining,
  getItemKind,
  getItemNotes,
  itemLabel,
} from './formatters';

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

export const AgendaItemRow = ({ item, now, onSelect, isNotesOpen, onToggleNotes }) => {
  const kind = getItemKind(item);
  const notesId = notesIdFor(item.key);
  const notes = getNotesText(item);

  return (
    <div className={`uni-board-agenda-row${item.completed ? ' is-complete' : ''}${isNotesOpen ? ' is-notes-open' : ''}`}>
      <button type="button" className="uni-board-agenda-row__main" onClick={() => onSelect(item)}>
        <span className="uni-board-agenda-row__time">{item.occursAt ? formatTime(item.occursAt) : 'Any time'}</span>
        <span className={`uni-board-agenda-row__marker uni-board-agenda-row__marker--${kind}`} aria-hidden="true">
          <AgendaItemIcon item={item} />
        </span>
        <span className="uni-board-item-copy">
          <strong>{item.title}</strong>
          <span>{formatShortDate(item.occursAt)} · {itemLabel(item)} · {item.subject || 'University'} · {formatTimeRemaining(item.occursAt, now)}</span>
        </span>
      </button>
      <button
        type="button"
        className={`uni-board-agenda-row__toggle${isNotesOpen ? ' is-open' : ''}`}
        aria-label={`${isNotesOpen ? 'Hide' : 'Show'} notes for ${item.title}`}
        aria-expanded={isNotesOpen}
        aria-controls={notesId}
        onClick={() => onToggleNotes(item.key)}
      >
        {isNotesOpen ? <ChevronDown size={18} aria-hidden="true" /> : <ChevronRight size={18} aria-hidden="true" />}
      </button>
      {isNotesOpen && (
        <div id={notesId} className="uni-board-agenda-row__details">
          <span className="uni-board-agenda-row__details-label">Notes</span>
          <p>{notes || 'No notes added.'}</p>
        </div>
      )}
    </div>
  );
};

const Agenda = ({ groups, onSelect, isLoading, now, range = '14', onRangeChange = () => {} }) => {
  const agendaItemCount = groups.reduce((count, group) => count + group.items.length, 0);
  const [expandedNotes, setExpandedNotes] = useState(() => new Set());

  const toggleNotes = (itemKey) => {
    setExpandedNotes((current) => {
      const next = new Set(current);
      if (next.has(itemKey)) next.delete(itemKey);
      else next.add(itemKey);
      return next;
    });
  };

  return (
    <section className="uni-board-section uni-board-agenda" aria-labelledby="uni-board-agenda-title">
      <div className="uni-board-section-heading uni-board-agenda__heading">
        <div>
          <p className="uni-board-kicker">Plan ahead</p>
          <h2 id="uni-board-agenda-title">Agenda</h2>
        </div>
        <div className="uni-board-agenda__heading-actions">
          <span className="uni-board-count" aria-label={`${agendaItemCount} agenda items`}>{agendaItemCount}</span>
          <CalendarDays size={19} aria-hidden="true" className="uni-board-section-icon" />
        </div>
      </div>
      <div className="uni-board-agenda__controls">
        <span className="uni-board-agenda__range-label">Show upcoming</span>
        <SegmentedControl
          items={AGENDA_RANGE_OPTIONS}
          value={range}
          onChange={onRangeChange}
          ariaLabel="Agenda range"
          className="uni-board-agenda__ranges"
        />
      </div>
      {isLoading ? <div className="uni-board-skeleton-list" aria-label="Loading agenda">{[1, 2, 3].map((row) => <span key={row} className="uni-board-skeleton-row" />)}</div> : groups.length > 0 ? (
        <div className="uni-board-agenda-list">
          {groups.map((group) => (
            <div key={group.dateKey} className="uni-board-agenda-day">
              <div className="uni-board-agenda-day__heading">
                <h3>{formatAgendaDate(group.date)}</h3>
                <span className="uni-board-agenda-day__remaining">{formatDaysRemaining(group.date, now)}</span>
              </div>
              <div className="uni-board-agenda-day__items">
                {group.items.map((item) => (
                  <AgendaItemRow
                    key={item.key}
                    item={item}
                    now={now}
                    onSelect={onSelect}
                    isNotesOpen={expandedNotes.has(item.key)}
                    onToggleNotes={toggleNotes}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : <p className="uni-board-quiet-empty">No dated items in this range.</p>}
    </section>
  );
};

export default Agenda;
