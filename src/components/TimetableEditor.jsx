import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Sheet } from '../ui';

const DAYS = [
    { value: 1, label: 'Monday', short: 'Mon', letter: 'M' },
    { value: 2, label: 'Tuesday', short: 'Tue', letter: 'T' },
    { value: 3, label: 'Wednesday', short: 'Wed', letter: 'W' },
    { value: 4, label: 'Thursday', short: 'Thu', letter: 'T' },
    { value: 5, label: 'Friday', short: 'Fri', letter: 'F' },
    { value: 6, label: 'Saturday', short: 'Sat', letter: 'S' },
    { value: 0, label: 'Sunday', short: 'Sun', letter: 'S' },
];

const describeDays = (days) => {
    const set = new Set(days);
    const has = (list) => list.length === set.size && list.every((day) => set.has(day));
    if (has([0, 1, 2, 3, 4, 5, 6])) return 'Every Day';
    if (has([1, 2, 3, 4, 5])) return 'Weekdays';
    if (has([0, 6])) return 'Weekends';
    return DAYS.filter((day) => set.has(day.value)).map((day) => day.short).join(', ');
};

const getMinutesBetween = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return (eh * 60 + em) - (sh * 60 + sm);
};

const formatDuration = (minutes) => {
    if (minutes <= 0) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

const TimetableEditor = ({ isOpen, onClose, timetable = [], onSave }) => {
    const [slots, setSlots] = useState(timetable.length > 0 ? timetable : []);

    // New slot form
    const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri default
    const [newStart, setNewStart] = useState('09:00');
    const [newEnd, setNewEnd] = useState('11:00');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    React.useEffect(() => {
        if (isOpen) {
            setSlots(timetable.length > 0 ? [...timetable] : []);
        }
    }, [timetable, isOpen]);

    const toggleDay = (dayValue) => {
        setSelectedDays(prev =>
            prev.includes(dayValue)
                ? prev.filter(d => d !== dayValue)
                : [...prev, dayValue]
        );
    };

    const addSlots = () => {
        if (selectedDays.length === 0) return;

        const newSlots = selectedDays.map(day => ({
            day,
            start: newStart,
            end: newEnd,
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
        }));

        setSlots(prev => [...prev, ...newSlots]);
    };

    const clearAll = () => {
        setSlots([]);
    };

    const handleSave = () => {
        onSave(slots);
        onClose();
    };

    // Group slots by time block for cleaner display
    const groupedSlots = slots.reduce((groups, slot, idx) => {
        const key = `${slot.start}-${slot.end}`;
        if (!groups[key]) {
            groups[key] = { start: slot.start, end: slot.end, days: [], indices: [], startDate: slot.startDate, endDate: slot.endDate };
        }
        groups[key].days.push(slot.day);
        groups[key].indices.push(idx);
        return groups;
    }, {});

    const duration = getMinutesBetween(newStart, newEnd);

    return (
        <Sheet open={isOpen} onClose={onClose} title="Timetable" className="form-sheet">
            <div className="form-stack">
                {slots.length > 0 && (
                    <div className="form-group">
                        {Object.entries(groupedSlots).map(([key, group]) => (
                            <div key={key} className="form-field timetable-slot">
                                <span className="timetable-slot__copy">
                                    <span>{describeDays(group.days)}</span>
                                    {(group.startDate || group.endDate) && (
                                        <small>{[group.startDate, group.endDate].filter(Boolean).join(' – ')}</small>
                                    )}
                                </span>
                                <span className="form-option__detail">{group.start}–{group.end}</span>
                                <button
                                    type="button"
                                    className="form-remove"
                                    aria-label={`Remove ${group.start} to ${group.end}`}
                                    onClick={() => {
                                        const indicesToRemove = new Set(group.indices);
                                        setSlots((prev) => prev.filter((_, i) => !indicesToRemove.has(i)));
                                    }}
                                >
                                    <X size={13} strokeWidth={2.6} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                <p className="form-section-label">Add Time</p>
                <div className="form-group">
                    <div className="form-field form-days" role="group" aria-label="Days">
                        {DAYS.map((day) => {
                            const isSelected = selectedDays.includes(day.value);
                            return (
                                <button
                                    key={day.value}
                                    type="button"
                                    aria-pressed={isSelected}
                                    aria-label={day.label}
                                    onClick={() => toggleDay(day.value)}
                                    className={`form-day${isSelected ? ' is-selected' : ''}`}
                                >
                                    {day.letter}
                                </button>
                            );
                        })}
                    </div>
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Starts</span>
                        <input type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
                    </label>
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Ends</span>
                        <input type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
                    </label>
                    <label className="form-field form-field--value">
                        <span className="form-field__label">From</span>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </label>
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Until</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </label>
                    <button
                        type="button"
                        onClick={addSlots}
                        disabled={selectedDays.length === 0 || duration <= 0}
                        className="form-field form-option form-option--tinted"
                    >
                        Add{duration > 0 ? ` ${formatDuration(duration)}` : ''}
                    </button>
                </div>

                <button type="button" onClick={handleSave} className="ui-button ui-button--accent form-submit">
                    Save
                </button>

                {slots.length > 0 && (
                    <div className="form-group">
                        <button type="button" onClick={clearAll} className="form-field form-option form-option--destructive">
                            Clear Timetable
                        </button>
                    </div>
                )}
            </div>
        </Sheet>
    );
};

export default TimetableEditor;
