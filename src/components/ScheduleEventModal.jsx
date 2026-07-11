import React, { useState, useEffect } from 'react';
import { Clock, Calendar, Repeat, Palette, Check, Tag } from 'lucide-react';
import { toLocalDateKey } from '../utils/scheduleOccurrences';
import { toast } from '../ui/Toast';
import { Sheet } from '../ui';
import { confirmAction } from '../utils/confirm';

const PRESET_COLORS = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Fuchsia', value: '#d946ef' },
    { name: 'Pink', value: '#ec4899' },
];

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

const formatOccurrenceLabel = (dateString) => {
    if (!dateString) return '';
    const date = new Date(`${dateString}T12:00:00`);
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
};

const ScheduleEventModal = ({ isOpen, onClose, onSave, onDelete, event, selectedDate }) => {
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        startTime: '09:00',
        duration: 60,
        color: '#6366f1',
        category: 'Other',
        recurrenceType: 'none',
        recurrenceInterval: 1,
        recurrenceDaysOfWeek: [],
        recurrenceEndDate: '',
        notes: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const occurrenceDate = event?._occurrenceDate;
    const isRecurringSeries = !!event && (event.recurrence_type || event.recurrenceType || 'none') !== 'none';
    const canDeleteSingleOccurrence = isRecurringSeries && !!occurrenceDate;

    // Initialize form with event data or defaults
    useEffect(() => {
        if (event) {
            const eventDate = new Date(event.start_time || event.startTime);
            setFormData({
                title: event.title || '',
                date: toLocalDateKey(eventDate),
                startTime: eventDate.toTimeString().slice(0, 5),
                duration: event.duration || 60,
                color: event.color || '#6366f1',
                category: event.category || 'Other',
                recurrenceType: event.recurrence_type || 'none',
                recurrenceInterval: event.recurrence_interval || 1,
                recurrenceDaysOfWeek: event.recurrence_days_of_week || [],
                recurrenceEndDate: event.recurrence_end_date || '',
                notes: event.notes || ''
            });
        } else if (selectedDate) {
            setFormData(prev => ({
                ...prev,
                date: toLocalDateKey(selectedDate)
            }));
        }
    }, [event, selectedDate, isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.title.trim() || isSubmitting) return;

        const startDateTime = new Date(`${formData.date}T${formData.startTime}`);

        setIsSubmitting(true);

        try {
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
                notes: formData.notes
            });
            onClose();
        } catch (error) {
            console.error('Failed to save schedule event:', error);
            toast(error?.message || 'Could not save this schedule event.', { tone: 'error' });
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

    return (
        <Sheet open={isOpen} onClose={onClose} title={event ? 'Edit event' : 'New event'}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Title */}
                        <div>
                            <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">
                                Event Title
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="Add title"
                                className="w-full px-4 py-3 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-xl text-sage-800 dark:text-bone-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]0 font-medium text-lg"
                                autoFocus
                            />
                        </div>

                        {/* Date and Time Row */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">
                                    <Calendar size={14} className="inline mr-1" /> Date
                                </label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                    className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]0"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">
                                    <Clock size={14} className="inline mr-1" /> Start Time
                                </label>
                                <input
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                    className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]0"
                                />
                            </div>
                        </div>

                        {/* Duration */}
                        <div>
                            <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">
                                Duration
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {[15, 30, 45, 60, 90, 120].map((mins) => (
                                    <button
                                        key={mins}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, duration: mins })}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${formData.duration === mins
                                                ? 'bg-[var(--color-accent)]0 text-white'
                                                : 'bg-sage-100 dark:bg-void-800 text-sage-600 dark:text-bone-300 hover:bg-sage-200 dark:hover:bg-void-700'
                                            }`}
                                    >
                                        {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                                    </button>
                                ))}
                                <input
                                    type="number"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                                    className="w-20 px-2 py-1.5 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-100 text-sm text-center"
                                    min="5"
                                    max="480"
                                />
                                <span className="text-sm text-sage-500 self-center">min</span>
                            </div>
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">
                                <Tag size={14} className="inline mr-1" /> Category
                            </label>
                            <div className="flex gap-2 flex-wrap">
                                {CATEGORY_OPTIONS.map((cat) => (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, category: cat })}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${formData.category === cat
                                            ? 'bg-[var(--color-accent)]0 text-white'
                                            : 'bg-sage-100 dark:bg-void-800 text-sage-600 dark:text-bone-300 hover:bg-sage-200 dark:hover:bg-void-700'
                                            }`}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Color Picker */}
                        <div>
                            <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">
                                <Palette size={14} className="inline mr-1" /> Color
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color: color.value })}
                                        className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-sage-400' : ''
                                            }`}
                                        style={{ backgroundColor: color.value }}
                                        title={color.name}
                                    >
                                        {formData.color === color.value && (
                                            <Check size={16} className="text-white m-auto" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Recurrence */}
                        <div>
                            <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">
                                <Repeat size={14} className="inline mr-1" /> Recurrence
                            </label>
                            <select
                                value={formData.recurrenceType}
                                onChange={(e) => {
                                    const value = e.target.value;
                                    setFormData({ ...formData, recurrenceType: value });
                                }}
                                className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]0"
                            >
                                {RECURRENCE_OPTIONS.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>

                            {/* Custom Recurrence Options */}
                            {(formData.recurrenceType === 'custom' || formData.recurrenceType === 'weekly') && (
                                <div className="mt-3 p-3 bg-sage-50 dark:bg-void-800 rounded-lg space-y-3">
                                    {formData.recurrenceType === 'custom' && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-sage-600 dark:text-bone-300">Repeat every</span>
                                            <input
                                                type="number"
                                                value={formData.recurrenceInterval}
                                                onChange={(e) => setFormData({ ...formData, recurrenceInterval: parseInt(e.target.value) || 1 })}
                                                className="w-16 px-2 py-1 bg-white dark:bg-void-900 border border-sage-200 dark:border-white/10 rounded text-center"
                                                min="1"
                                                max="99"
                                            />
                                            <span className="text-sm text-sage-600 dark:text-bone-300">week(s)</span>
                                        </div>
                                    )}

                                    <div>
                                        <span className="text-sm text-sage-600 dark:text-bone-300 block mb-2">Repeat on:</span>
                                        <div className="flex gap-1">
                                            {DAYS_OF_WEEK.map((day, index) => (
                                                <button
                                                    key={day}
                                                    type="button"
                                                    onClick={() => toggleDayOfWeek(index)}
                                                    className={`w-9 h-9 rounded-full text-xs font-bold transition-colors ${formData.recurrenceDaysOfWeek.includes(index)
                                                            ? 'bg-[var(--color-accent)]0 text-white'
                                                            : 'bg-white dark:bg-void-900 text-sage-600 dark:text-bone-300 border border-sage-200 dark:border-white/10'
                                                        }`}
                                                >
                                                    {day.charAt(0)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* End Date for Recurrence */}
                            {formData.recurrenceType !== 'none' && (
                                <div className="mt-3">
                                    <label className="block text-sm text-sage-600 dark:text-bone-300 mb-1">
                                        End date (optional)
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.recurrenceEndDate}
                                        onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                                        className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]0"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">
                                Notes
                            </label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Add notes..."
                                rows={2}
                                className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-100 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]0 resize-none"
                            />
                        </div>
                    </form>

                    {/* Footer */}
                    <div className="flex gap-3 p-4 border-t border-sage-100 dark:border-white/10 bg-sage-50 dark:bg-void-800/50">
                        {event && onDelete && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (canDeleteSingleOccurrence) {
                                        const deleteSingle = confirmAction(
                                            `Delete only ${formatOccurrenceLabel(occurrenceDate)}?\n\nClick OK to remove just this occurrence.\nClick Cancel to choose whether to delete the entire recurring event.`
                                        );

                                        if (deleteSingle) {
                                            handleDelete({ occurrenceDate });
                                            return;
                                        }
                                    }

                                    if (confirmAction(isRecurringSeries ? 'Delete the entire recurring event?' : 'Delete this event?')) {
                                        handleDelete();
                                    }
                                }}
                                disabled={isSubmitting}
                                className="px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-bold transition-colors"
                            >
                                {canDeleteSingleOccurrence ? 'Delete...' : 'Delete'}
                            </button>
                        )}
                        <div className="flex-1" />
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-sage-200 dark:bg-void-700 text-sage-700 dark:text-bone-300 rounded-lg font-bold hover:bg-sage-300 dark:hover:bg-void-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            disabled={!formData.title.trim() || isSubmitting}
                            className={`px-6 py-2 rounded-lg font-bold transition-colors ${formData.title.trim()
                                    ? 'bg-[var(--color-accent)]0 text-white hover:bg-[var(--color-accent)]'
                                    : 'bg-sage-300 text-sage-500 cursor-not-allowed'
                                }`}
                        >
                            {isSubmitting ? 'Saving...' : event ? 'Save Changes' : 'Create Event'}
                        </button>
                    </div>
        </Sheet>
    );
};

export default ScheduleEventModal;
