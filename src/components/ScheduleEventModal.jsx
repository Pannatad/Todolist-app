import React, { useState, useEffect } from 'react';
import { toLocalDateKey, upsertOverride, weekdayOverrideKey } from '../utils/scheduleOccurrences';
import { toast } from '../ui/Toast';
import { SegmentedControl, Sheet } from '../ui';
import { confirmAction } from '../utils/confirm';
import { DEFAULT_SCHEDULE_PRIORITY, normalizeSchedulePriority } from '../utils/schedulePriority';
import SchedulePriorityField from './SchedulePriorityField';
import ScheduleEnergyField from './ScheduleEnergyField';
import { DEFAULT_ENERGY_COLOR } from '../utils/scheduleEnergy';
import { useWeekTargetLabels } from '../context/WeekPlanContext';

const RECURRENCE_OPTIONS = [
    { value: 'none', label: 'Does not repeat' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom...' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CATEGORY_OPTIONS = ['Work', 'Study', 'Personal', 'Health', 'Errands', 'Social', 'Other'];
const EMPTY_DEFAULTS = {};
const MAX_DURATION_HOURS = 23;

const formatOccurrenceLabel = (dateString) => {
    if (!dateString) return '';
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

const ScheduleEventModal = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    event,
    selectedDate,
    defaults = EMPTY_DEFAULTS,
    itemKind = 'event',
    parentItemId = null
}) => {
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        startTime: '09:00',
        duration: 60,
        color: DEFAULT_ENERGY_COLOR,
        category: 'Other',
        recurrenceType: 'none',
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: [],
        recurrenceEndDate: '',
        notes: '',
        priority: DEFAULT_SCHEDULE_PRIORITY
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    // 'series' edits the recurring event itself; 'day' customizes just this occurrence;
    // 'weekday' customizes every occurrence on this weekday (e.g. Monday: Push day).
    const [editScope, setEditScope] = useState('series');
    const occurrenceDate = event?._occurrenceDate;
    const isRecurringSeries = !!event && (event.recurrence_type || event.recurrenceType || 'none') !== 'none';
    const canDeleteSingleOccurrence = isRecurringSeries && !!occurrenceDate;
    const canCustomizeDay = isRecurringSeries && !!occurrenceDate;
    const isDayScope = canCustomizeDay && editScope !== 'series';
    // This week's daily targets appear as categories, so a block can count toward one.
    const targetLabels = useWeekTargetLabels(isDayScope ? occurrenceDate : formData.date);
    const builtInCategories = new Set(CATEGORY_OPTIONS.map((category) => category.toLowerCase()));
    const targetCategories = [...new Set(targetLabels)].filter((label) => !builtInCategories.has(label.toLowerCase()));
    const otherCategories = [...new Set([...CATEGORY_OPTIONS, formData.category].filter(Boolean))]
        .filter((category) => !targetCategories.some((label) => label.toLowerCase() === category.toLowerCase()));
    const occurrenceWeekday = occurrenceDate ? new Date(`${occurrenceDate}T12:00:00`).getDay() : null;
    const weekdayLabel = occurrenceWeekday != null ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][occurrenceWeekday] : '';

    const seriesBase = event?._seriesBase || event || {};
    const seriesStart = event ? new Date(event.start_time || event.startTime) : null;
    const seriesStartTime = seriesStart ? seriesStart.toTimeString().slice(0, 5) : '09:00';

    // Initialize form with event data or defaults.
    // Day/weekday scope starts from the occurrence's merged values (base + override);
    // series scope starts from the series base so a day's override never leaks into the series.
    useEffect(() => {
        if (event) {
            const eventDate = new Date(event.start_time || event.startTime);
            const useDayValues = canCustomizeDay && editScope !== 'series';
            const source = useDayValues ? event : { ...event, ...(event._seriesBase || {}) };
            setFormData({
                title: source.title || '',
                date: toLocalDateKey(eventDate),
                startTime: useDayValues && event.displayTime
                    ? new Date(event.displayTime).toTimeString().slice(0, 5)
                    : eventDate.toTimeString().slice(0, 5),
                duration: source.duration || 60,
                color: source.color || '#6366f1',
                category: source.category || 'Other',
                recurrenceType: event.recurrence_type || 'none',
                recurrenceInterval: event.recurrence_interval || 1,
                recurrenceDaysOfWeek: event.recurrence_days_of_week || [],
                recurrenceEndDate: event.recurrence_end_date || '',
                notes: source.notes || '',
                priority: normalizeSchedulePriority(source.priority)
            });
        } else if (selectedDate) {
            setFormData(prev => ({
                ...prev,
                date: toLocalDateKey(selectedDate),
                startTime: defaults.startTime || prev.startTime,
                duration: defaults.duration || prev.duration,
                title: defaults.title || '',
                color: defaults.color || prev.color,
                category: defaults.category || prev.category,
                notes: defaults.notes || '',
                priority: normalizeSchedulePriority(defaults.priority)
            }));
        }
    }, [event, selectedDate, isOpen, editScope, canCustomizeDay, defaults]);

    // Default to "just this day" when opening an occurrence of a recurring event,
    // so a quick rename never silently rewrites the whole series.
    useEffect(() => {
        if (isOpen) setEditScope(canCustomizeDay ? 'day' : 'series');
    }, [isOpen, canCustomizeDay]);

    const buildDayOverride = () => {
        const override = {};
        if (formData.title.trim() && formData.title.trim() !== (seriesBase.title || '')) override.title = formData.title.trim();
        if (formData.category !== (seriesBase.category || 'Other')) override.category = formData.category;
        if (formData.color !== (seriesBase.color || '#6366f1')) override.color = formData.color;
        if ((formData.notes || '') !== (seriesBase.notes || '')) override.notes = formData.notes;
        if (Number(formData.duration) !== Number(seriesBase.duration || 60)) override.duration = Number(formData.duration);
        if (formData.startTime !== seriesStartTime) override.startTime = formData.startTime;
        if (formData.priority !== normalizeSchedulePriority(seriesBase.priority)) override.priority = formData.priority;
        return override;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || isSubmitting) return;

        setIsSubmitting(true);

        try {
            if (isDayScope && event?.id) {
                const key = editScope === 'weekday' ? weekdayOverrideKey(occurrenceWeekday) : occurrenceDate;
                await onSave?.({
                    id: event.id,
                    recurrenceOverrides: upsertOverride(event, key, buildDayOverride())
                });
            } else {
                const startDateTime = new Date(`${formData.date}T${formData.startTime}`);
                // Send priority only when it changes, so other edits never touch it.
                const priorityChanged = !event || formData.priority !== normalizeSchedulePriority(seriesBase.priority);
                await onSave?.({
                    id: event?.id,
                    title: formData.title,
                    startTime: startDateTime.toISOString(),
                    duration: formData.duration,
                    color: formData.color,
                    category: formData.category,
                    recurrenceType: formData.recurrenceType,
                    recurrenceInterval: formData.recurrenceInterval,
                    recurrenceDaysOfWeek: formData.recurrenceDaysOfWeek,
                    recurrenceEndDate: formData.recurrenceEndDate || null,
                    notes: formData.notes,
                    ...(priorityChanged ? { priority: formData.priority } : {}),
                    itemKind: event?.itemKind || event?.item_kind || itemKind,
                    parentItemId: event?.parentItemId || event?.parent_item_id || parentItemId
                });
            }
            onClose();
        } catch (error) {
            console.error('Failed to save schedule event:', error);
            toast(error?.message || 'Could not save this schedule event.', { tone: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetDay = async () => {
        if (!event?.id || isSubmitting) return;
        setIsSubmitting(true);
        try {
            const key = editScope === 'weekday' ? weekdayOverrideKey(occurrenceWeekday) : occurrenceDate;
            await onSave?.({ id: event.id, recurrenceOverrides: upsertOverride(event, key, {}) });
            onClose();
        } catch (error) {
            toast(error?.message || 'Could not reset this day.', { tone: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (deleteOptions) => {
        if (!onDelete || isSubmitting) return;

        setIsSubmitting(true);

        try {
            await onDelete(event.id, deleteOptions);
            onClose();
        } catch (error) {
            console.error('Failed to delete schedule event:', error);
            toast(error?.message || 'Could not delete this schedule event.', { tone: 'error' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const toggleDayOfWeek = (dayIndex) => {
        setFormData(prev => {
            const days = [...prev.recurrenceDaysOfWeek];
            if (days.includes(dayIndex)) {
                return { ...prev, recurrenceDaysOfWeek: days.filter(d => d !== dayIndex) };
            } else {
                return { ...prev, recurrenceDaysOfWeek: [...days, dayIndex].sort() };
            }
        });
    };

    if (!isOpen) return null;

    // Duration is picked as hours + minutes (5-minute steps); odd saved values stay selectable.
    const totalMinutes = Math.max(0, Number(formData.duration) || 60);
    const durationHours = Math.floor(totalMinutes / 60);
    const durationMinutes = totalMinutes % 60;
    const hourOptions = [...new Set([...Array.from({ length: MAX_DURATION_HOURS + 1 }, (_, h) => h), durationHours])].sort((a, b) => a - b);
    const minuteOptions = [...new Set([...Array.from({ length: 12 }, (_, i) => i * 5), durationMinutes])].sort((a, b) => a - b);
    // A block needs some length: 0 hr 0 min snaps to 5 min.
    const setDuration = (hours, minutes) => setFormData((prev) => ({ ...prev, duration: hours * 60 + minutes || 5 }));
    const submitLabel = isSubmitting ? 'Saving…' : !event ? 'Add' : isDayScope ? (editScope === 'weekday' ? `Save ${weekdayLabel}s` : 'Save This Day') : 'Save';

    return (
        <Sheet
            open={isOpen}
            onClose={onClose}
            title={event ? 'Edit Event' : itemKind === 'flexible_shell' ? 'New Flexible Shell' : parentItemId ? 'New Nested Event' : 'New Event'}
            className="form-sheet"
        >
            <form onSubmit={handleSubmit} className="form-stack">
                {canCustomizeDay && (
                    <SegmentedControl
                        items={[
                            { id: 'day', label: 'This Day' },
                            { id: 'weekday', label: `${weekdayLabel}s` },
                            { id: 'series', label: 'Series' },
                        ]}
                        value={editScope}
                        onChange={setEditScope}
                        ariaLabel="Apply changes to"
                        className="form-segments"
                    />
                )}

                <div className="form-group">
                    <label className="form-field">
                        <span className="sr-only">Title</span>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="Title"
                            autoFocus
                        />
                    </label>
                </div>

                <div className="form-group">
                    <SchedulePriorityField
                        value={formData.priority}
                        onChange={(priority) => setFormData({ ...formData, priority })}
                    />
                    <ScheduleEnergyField
                        value={formData.color}
                        onChange={(color) => setFormData({ ...formData, color })}
                    />
                </div>

                <div className="form-group">
                    {!isDayScope && (
                        <label className="form-field form-field--value">
                            <span className="form-field__label">Date</span>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            />
                        </label>
                    )}
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Starts</span>
                        <input
                            type="time"
                            value={formData.startTime}
                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                        />
                    </label>
                    <div className="form-field form-field--value">
                        <span className="form-field__label">Duration</span>
                        <div className="form-duration">
                            <select
                                value={durationHours}
                                onChange={(e) => setDuration(parseInt(e.target.value, 10), durationMinutes)}
                                aria-label="Duration hours"
                            >
                                {hourOptions.map((h) => <option key={h} value={h}>{h} hr</option>)}
                            </select>
                            <select
                                value={durationMinutes}
                                onChange={(e) => setDuration(durationHours, parseInt(e.target.value, 10))}
                                aria-label="Duration minutes"
                            >
                                {minuteOptions.map((m) => <option key={m} value={m}>{m} min</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Category</span>
                        <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                            {targetCategories.length > 0 ? (
                                <>
                                    <optgroup label="Daily targets">
                                        {targetCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                                    </optgroup>
                                    <optgroup label="Categories">
                                        {otherCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                                    </optgroup>
                                </>
                            ) : otherCategories.map((cat) => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </label>
                </div>

                {!isDayScope && (
                    <div className="form-group">
                        <label className="form-field form-field--value">
                            <span className="form-field__label">Repeat</span>
                            <select
                                value={formData.recurrenceType}
                                onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value })}
                            >
                                {RECURRENCE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.value === 'none' ? 'Never' : opt.label.replace('...', '')}</option>
                                ))}
                            </select>
                        </label>
                        {formData.recurrenceType === 'custom' && (
                            <label className="form-field form-field--value">
                                <span className="form-field__label">Every</span>
                                <input
                                    type="number"
                                    value={formData.recurrenceInterval}
                                    onChange={(e) => setFormData({ ...formData, recurrenceInterval: parseInt(e.target.value, 10) || 1 })}
                                    min="1"
                                    max="99"
                                    aria-label="Repeat every N weeks"
                                />
                                <span className="form-field__suffix">weeks</span>
                            </label>
                        )}
                        {(formData.recurrenceType === 'custom' || formData.recurrenceType === 'weekly') && (
                            <div className="form-field form-days" role="group" aria-label="Repeat on">
                                {DAYS_OF_WEEK.map((day, index) => (
                                    <button
                                        key={day}
                                        type="button"
                                        aria-pressed={formData.recurrenceDaysOfWeek.includes(index)}
                                        aria-label={day}
                                        onClick={() => toggleDayOfWeek(index)}
                                        className={`form-day${formData.recurrenceDaysOfWeek.includes(index) ? ' is-selected' : ''}`}
                                    >
                                        {day.charAt(0)}
                                    </button>
                                ))}
                            </div>
                        )}
                        {formData.recurrenceType !== 'none' && (
                            <label className="form-field form-field--value">
                                <span className="form-field__label">End Repeat</span>
                                <input
                                    type="date"
                                    value={formData.recurrenceEndDate}
                                    onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                                />
                            </label>
                        )}
                    </div>
                )}

                <div className="form-group">
                    <label className="form-field form-field--stacked">
                        <span className="sr-only">Notes</span>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Notes"
                            rows={2}
                        />
                    </label>
                </div>

                <button type="submit" disabled={!formData.title.trim() || isSubmitting} className="ui-button ui-button--accent form-submit">
                    {submitLabel}
                </button>

                {(event && onDelete) || (isDayScope && event?._hasOverride) ? (
                    <div className="form-group">
                        {isDayScope && event?._hasOverride && (
                            <button type="button" onClick={handleResetDay} disabled={isSubmitting} className="form-field form-option form-option--tinted">
                                Reset This Day
                            </button>
                        )}
                        {event && onDelete && canDeleteSingleOccurrence && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirmAction(`Delete only ${formatOccurrenceLabel(occurrenceDate)}?`)) {
                                        handleDelete({ occurrenceDate });
                                    }
                                }}
                                disabled={isSubmitting}
                                className="form-field form-option form-option--destructive"
                            >
                                Delete This Event Only
                            </button>
                        )}
                        {event && onDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (confirmAction(isRecurringSeries ? 'Delete the entire recurring event?' : 'Delete this event?')) {
                                        handleDelete();
                                    }
                                }}
                                disabled={isSubmitting}
                                className="form-field form-option form-option--destructive"
                            >
                                {isRecurringSeries ? 'Delete All Events' : 'Delete Event'}
                            </button>
                        )}
                    </div>
                ) : null}
            </form>
        </Sheet>
    );
};

export default ScheduleEventModal;
