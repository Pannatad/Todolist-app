import React from 'react';
import { Check } from 'lucide-react';
import { Sheet } from '../ui';

const HabitNotesModal = ({ isOpen, onClose, habit, entries = [] }) => (
    <Sheet open={isOpen && Boolean(habit)} onClose={onClose} title={habit?.name || 'Notes'} className="form-sheet">
        {entries.length === 0 ? (
            <p className="ui-empty-card habit-notes-empty">No notes yet.</p>
        ) : (
            <div className="form-group">
                {entries.map((entry) => (
                    <div key={`${entry.habit_id}-${entry.date}`} className="form-field habit-note-entry">
                        <div className="habit-note-entry__meta">
                            <span>{new Date(`${entry.date}T12:00:00`).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                            {entry.completed && <span className="habit-note-entry__done"><Check size={12} strokeWidth={3} /> Done</span>}
                            {entry.value > 0 && <span>Value {entry.value}</span>}
                        </div>
                        <p className="habit-note-entry__text">{entry.notes}</p>
                    </div>
                ))}
            </div>
        )}
    </Sheet>
);

export default HabitNotesModal;
