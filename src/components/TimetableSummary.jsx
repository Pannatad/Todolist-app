import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import { MenuButton } from '../ui';
import { SWATCH_HEX } from './LearningPathModal';

const DAYS = [
    { value: 1, letter: 'M' },
    { value: 2, letter: 'T' },
    { value: 3, letter: 'W' },
    { value: 4, letter: 'T' },
    { value: 5, letter: 'F' },
    { value: 6, letter: 'S' },
    { value: 0, letter: 'S' },
];

const toMinutes = (time) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

const formatDuration = (minutes) => {
    if (minutes <= 0) return '';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
};

// Monday of the week containing the given date.
const getMonday = (value) => {
    const date = new Date(value);
    const day = date.getDay();
    date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
    date.setHours(0, 0, 0, 0);
    return date;
};

const pathTint = (color) => SWATCH_HEX[color] || SWATCH_HEX.purple;

const TimetableSummary = () => {
    const { getAllTimetableEntries, getTimetableForDay } = useLearning();
    const [hiddenPaths, setHiddenPaths] = useState(() => new Set());
    const [weekOffset, setWeekOffset] = useState(0);
    const [selectedIndex, setSelectedIndex] = useState(null);

    const allEntries = useMemo(() => getAllTimetableEntries(), [getAllTimetableEntries]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekDates = useMemo(() => {
        const monday = getMonday(new Date());
        monday.setDate(monday.getDate() + weekOffset * 7);
        return DAYS.map((_, index) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            return date;
        });
    }, [weekOffset]);

    const pathsWithSlots = useMemo(() => {
        const byId = new Map();
        allEntries.forEach((entry) => {
            if (!byId.has(entry.pathId)) byId.set(entry.pathId, { id: entry.pathId, name: entry.pathName });
        });
        return [...byId.values()];
    }, [allEntries]);

    const daySlots = useMemo(() => DAYS.map((day, index) => (
        getTimetableForDay(day.value, weekDates[index])
            .filter((entry) => !hiddenPaths.has(entry.pathId))
            .sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
    )), [getTimetableForDay, weekDates, hiddenPaths]);

    if (allEntries.length === 0) {
        return null;
    }

    const todayIndex = weekDates.findIndex((date) => date.getTime() === today.getTime());
    const firstBusyIndex = daySlots.findIndex((slots) => slots.length > 0);
    const activeIndex = selectedIndex ?? (todayIndex >= 0 ? todayIndex : Math.max(firstBusyIndex, 0));
    const activeSlots = daySlots[activeIndex] || [];
    const weekMinutes = daySlots.flat().reduce((sum, slot) => sum + toMinutes(slot.end) - toMinutes(slot.start), 0);
    const weekLabel = weekOffset === 0
        ? 'This Week'
        : `${weekDates[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${weekDates[6].toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
    const activeDateLabel = weekDates[activeIndex].toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });

    const changeWeek = (offset) => {
        setWeekOffset((value) => value + offset);
        setSelectedIndex(null);
    };

    const togglePath = (pathId) => {
        setHiddenPaths((current) => {
            const next = new Set(current);
            if (next.has(pathId)) next.delete(pathId);
            else next.add(pathId);
            return next;
        });
    };

    return (
        <section className="study-week" aria-label="Study schedule">
            <div className="ui-section-title study-week__title">
                <h2>Study Schedule</h2>
                {weekMinutes > 0 && <span>{formatDuration(weekMinutes)}</span>}
                {pathsWithSlots.length > 1 && (
                    <MenuButton
                        icon={ListFilter}
                        label="Show paths"
                        sections={[{
                            title: 'Show',
                            items: pathsWithSlots.map((path) => ({
                                id: path.id,
                                label: path.name,
                                checked: !hiddenPaths.has(path.id),
                                onSelect: () => togglePath(path.id),
                            })),
                        }]}
                    />
                )}
            </div>

            <div className="ui-card study-week__card">
                <div className="study-week__nav">
                    <button type="button" onClick={() => changeWeek(-1)} aria-label="Previous week"><ChevronLeft size={20} /></button>
                    <button type="button" className="study-week__week" onClick={() => changeWeek(-weekOffset)} disabled={weekOffset === 0}>
                        {weekLabel}
                    </button>
                    <button type="button" onClick={() => changeWeek(1)} aria-label="Next week"><ChevronRight size={20} /></button>
                </div>

                <div className="study-week__days">
                    {DAYS.map((day, index) => {
                        const slots = daySlots[index];
                        const isToday = index === todayIndex;
                        const isSelected = index === activeIndex;
                        return (
                            <button
                                key={day.value}
                                type="button"
                                className={`study-week__day${isToday ? ' is-today' : ''}${isSelected ? ' is-selected' : ''}`}
                                aria-pressed={isSelected}
                                aria-label={`${weekDates[index].toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}, ${slots.length} study ${slots.length === 1 ? 'slot' : 'slots'}`}
                                onClick={() => setSelectedIndex(index)}
                            >
                                <span className="study-week__letter">{day.letter}</span>
                                <span className="study-week__date">{weekDates[index].getDate()}</span>
                                <span className="study-week__dots" aria-hidden="true">
                                    {slots.slice(0, 3).map((slot, slotIndex) => (
                                        <i key={`${slot.pathId}-${slotIndex}`} style={{ background: pathTint(slot.pathColor) }} />
                                    ))}
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="study-week__list">
                    <p className="study-week__day-label">{activeDateLabel}</p>
                    {activeSlots.length === 0 ? (
                        <p className="study-week__empty">No study time.</p>
                    ) : (
                        activeSlots.map((slot, index) => (
                            <div key={`${slot.pathId}-${slot.start}-${index}`} className="study-week__slot">
                                <i style={{ background: pathTint(slot.pathColor) }} aria-hidden="true" />
                                <span className="study-week__slot-name">{slot.pathName}</span>
                                <span className="study-week__slot-time">
                                    {slot.start}–{slot.end}
                                    <small>{formatDuration(toMinutes(slot.end) - toMinutes(slot.start))}</small>
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
};

export default TimetableSummary;
