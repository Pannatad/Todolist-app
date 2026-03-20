import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Clock, Calendar, Trash2, CalendarRange, Repeat } from 'lucide-react';

const DAYS = [
    { value: 1, label: 'Monday', short: 'Mon', letter: 'M' },
    { value: 2, label: 'Tuesday', short: 'Tue', letter: 'T' },
    { value: 3, label: 'Wednesday', short: 'Wed', letter: 'W' },
    { value: 4, label: 'Thursday', short: 'Thu', letter: 'T' },
    { value: 5, label: 'Friday', short: 'Fri', letter: 'F' },
    { value: 6, label: 'Saturday', short: 'Sat', letter: 'S' },
    { value: 0, label: 'Sunday', short: 'Sun', letter: 'S' },
];

const QUICK_PRESETS = [
    { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
    { label: 'Weekends', days: [0, 6] },
    { label: 'MWF', days: [1, 3, 5] },
    { label: 'TuTh', days: [2, 4] },
    { label: 'Daily', days: [0, 1, 2, 3, 4, 5, 6] },
];

const DURATION_PRESETS = [
    { label: '30m', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '1.5h', minutes: 90 },
    { label: '2h', minutes: 120 },
    { label: '3h', minutes: 180 },
];

const addMinutesToTime = (timeStr, minutes) => {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMins = h * 60 + m + minutes;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
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

const TimetableEditor = ({ isOpen, onClose, timetable = [], onSave, pathGradient }) => {
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

    const applyPreset = (presetDays) => {
        setSelectedDays(presetDays);
    };

    const applyDuration = (minutes) => {
        setNewEnd(addMinutesToTime(newStart, minutes));
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

    const removeSlot = (index) => {
        setSlots(prev => prev.filter((_, i) => i !== index));
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

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${pathGradient || 'from-purple-500 to-indigo-600'} p-6 relative overflow-hidden flex-shrink-0`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <Calendar className="text-white/80" size={24} />
                                <h2 className="text-xl font-bold text-white">Study Timetable</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <p className="text-white/50 text-xs mt-2 relative z-10">Set your study schedule. Select days, pick a time, and add.</p>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-5 overflow-y-auto flex-1">

                        {/* ── Add Time Block ─────────────────────── */}
                        <div className="space-y-4 p-4 bg-white/5 rounded-2xl border border-white/10">

                            {/* Quick Presets */}
                            <div>
                                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Quick Select</label>
                                <div className="flex gap-1.5 flex-wrap">
                                    {QUICK_PRESETS.map(preset => {
                                        const isActive = preset.days.length === selectedDays.length &&
                                            preset.days.every(d => selectedDays.includes(d));
                                        return (
                                            <button
                                                key={preset.label}
                                                onClick={() => applyPreset(preset.days)}
                                                className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
                                                    isActive
                                                        ? 'bg-purple-500/30 text-purple-300 border border-purple-400/40 font-bold'
                                                        : 'bg-white/5 text-white/50 hover:bg-white/10 border border-transparent'
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Day Toggles - Circular */}
                            <div>
                                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Days</label>
                                <div className="flex gap-2 justify-center">
                                    {DAYS.map((day, idx) => {
                                        const isSelected = selectedDays.includes(day.value);
                                        return (
                                            <button
                                                key={day.value}
                                                onClick={() => toggleDay(day.value)}
                                                className={`w-10 h-10 rounded-full text-xs font-bold transition-all flex items-center justify-center ${
                                                    isSelected
                                                        ? 'bg-white/20 text-white ring-2 ring-white/30 shadow-lg shadow-white/5'
                                                        : 'bg-white/5 text-white/30 hover:bg-white/10 hover:text-white/50'
                                                }`}
                                                title={day.label}
                                            >
                                                {day.short}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedDays.length > 0 && (
                                    <p className="text-xs text-white/30 text-center mt-2">
                                        {selectedDays.length} day{selectedDays.length !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>

                            {/* Time Pickers + Duration */}
                            <div>
                                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 block">Time Block</label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs text-white/40">Start</label>
                                        <input
                                            type="time"
                                            value={newStart}
                                            onChange={(e) => setNewStart(e.target.value)}
                                            className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 [color-scheme:dark]"
                                        />
                                    </div>
                                    <span className="text-white/30 mt-5">→</span>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs text-white/40">End</label>
                                        <input
                                            type="time"
                                            value={newEnd}
                                            onChange={(e) => setNewEnd(e.target.value)}
                                            className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 [color-scheme:dark]"
                                        />
                                    </div>
                                    {duration > 0 && (
                                        <div className="mt-5 px-2.5 py-1 bg-emerald-500/15 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs font-bold whitespace-nowrap">
                                            {formatDuration(duration)}
                                        </div>
                                    )}
                                </div>

                                {/* Duration Quick Presets */}
                                <div className="flex gap-1.5 mt-2">
                                    {DURATION_PRESETS.map(preset => (
                                        <button
                                            key={preset.minutes}
                                            onClick={() => applyDuration(preset.minutes)}
                                            className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
                                                duration === preset.minutes
                                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold'
                                                    : 'bg-white/5 text-white/40 hover:bg-white/10 border border-transparent'
                                            }`}
                                        >
                                            {preset.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Date Range (Optional) */}
                            <div>
                                <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    <CalendarRange size={10} />
                                    Date Range <span className="text-white/20">(optional)</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs text-white/40">From</label>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 [color-scheme:dark]"
                                        />
                                    </div>
                                    <span className="text-white/30 mt-5">→</span>
                                    <div className="flex-1 space-y-1">
                                        <label className="text-xs text-white/40">Until</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full bg-white/10 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/50 [color-scheme:dark]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={addSlots}
                                disabled={selectedDays.length === 0}
                                className={`w-full py-2.5 text-sm rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${
                                    selectedDays.length > 0
                                        ? 'text-white bg-white/15 hover:bg-white/25 active:scale-[0.98]'
                                        : 'text-white/20 bg-white/5 cursor-not-allowed'
                                }`}
                            >
                                <Plus size={14} />
                                Add {selectedDays.length} Slot{selectedDays.length !== 1 ? 's' : ''}
                            </button>
                        </div>

                        {/* ── Current Schedule ────────────────────── */}
                        {slots.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-white/70">
                                        Current Schedule ({slots.length} slot{slots.length !== 1 ? 's' : ''})
                                    </label>
                                    <button
                                        onClick={clearAll}
                                        className="text-xs text-red-400/60 hover:text-red-400 transition-colors"
                                    >
                                        Clear all
                                    </button>
                                </div>

                                {Object.entries(groupedSlots).map(([key, group]) => (
                                    <motion.div
                                        key={key}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 group"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 text-sm text-white/60">
                                                <Clock size={12} />
                                                <span className="font-medium text-white/80">{group.start}</span>
                                                <span className="text-white/30">→</span>
                                                <span className="font-medium text-white/80">{group.end}</span>
                                                <span className="text-xs text-emerald-400/60 ml-1">
                                                    {formatDuration(getMinutesBetween(group.start, group.end))}
                                                </span>
                                            </div>
                                            <div className="flex gap-1 flex-wrap">
                                                {DAYS.filter(d => group.days.includes(d.value)).map(d => (
                                                    <span key={d.value} className="text-xs px-1.5 py-0.5 bg-white/10 rounded text-white/60 font-medium">
                                                        {d.short}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                // Remove all slots in this group
                                                const indicesToRemove = new Set(group.indices);
                                                setSlots(prev => prev.filter((_, i) => !indicesToRemove.has(i)));
                                            }}
                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 ml-2"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </motion.div>
                                ))}

                                {/* Visual Weekly Preview */}
                                <div className="mt-3 p-3 bg-white/[0.03] rounded-xl">
                                    <div className="grid grid-cols-7 gap-1.5">
                                        {DAYS.map(day => {
                                            const daySlots = slots.filter(s => s.day === day.value);
                                            return (
                                                <div key={day.value} className="text-center">
                                                    <span className={`text-[10px] font-bold block mb-1 ${
                                                        daySlots.length > 0 ? 'text-white/70' : 'text-white/20'
                                                    }`}>
                                                        {day.short}
                                                    </span>
                                                    {daySlots.length > 0 ? (
                                                        daySlots.map((s, i) => (
                                                            <div key={i} className="text-[9px] text-purple-300/70 bg-purple-500/10 rounded px-1 py-0.5 mb-0.5 truncate">
                                                                {s.start}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="w-full h-5 bg-white/[0.02] rounded" />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl font-bold text-white/60 bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className={`flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r ${pathGradient || 'from-purple-500 to-indigo-600'} hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2`}
                            >
                                <Calendar size={16} /> Save Schedule
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TimetableEditor;
