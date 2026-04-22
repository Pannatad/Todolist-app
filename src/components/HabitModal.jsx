import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Clock, Hash, Moon, Plus, Sprout, Sun, Sunrise, Sunset, X } from 'lucide-react';
import { DEFAULT_SEED_DURATION_DAYS } from '../constants/habitSeeds';

const EMOJI_OPTIONS = ['💧', '🧘', '🏃', '📚', '📝', '💪', '🎯', '⏰', '🌟', '❤️', '🧠', '🎨', '🎵', '💤', '🥗', '🚶', '✨'];

const COLOR_OPTIONS = [
    { name: 'slate', swatch: 'bg-slate-500' },
    { name: 'rose', swatch: 'bg-rose-500' },
    { name: 'purple', swatch: 'bg-purple-500' },
    { name: 'pink', swatch: 'bg-pink-500' },
    { name: 'indigo', swatch: 'bg-indigo-500' },
    { name: 'blue', swatch: 'bg-blue-500' },
    { name: 'teal', swatch: 'bg-teal-500' },
    { name: 'cyan', swatch: 'bg-cyan-500' },
    { name: 'lime', swatch: 'bg-lime-500' },
    { name: 'amber', swatch: 'bg-amber-500' },
    { name: 'emerald', swatch: 'bg-emerald-500' },
];

const TIME_OF_DAY_OPTIONS = [
    { value: 'morning', label: 'Morning', icon: Sunrise, color: 'text-amber-500', defaultTime: '07:00' },
    { value: 'afternoon', label: 'Afternoon', icon: Sun, color: 'text-yellow-500', defaultTime: '12:00' },
    { value: 'evening', label: 'Evening', icon: Sunset, color: 'text-orange-500', defaultTime: '18:00' },
    { value: 'night', label: 'Night', icon: Moon, color: 'text-indigo-500', defaultTime: '21:00' },
    { value: 'anytime', label: 'Anytime', icon: Clock, color: 'text-slate-400', defaultTime: '' },
];

const DAYS = [
    { value: 0, label: 'S', full: 'Sunday' },
    { value: 1, label: 'M', full: 'Monday' },
    { value: 2, label: 'T', full: 'Tuesday' },
    { value: 3, label: 'W', full: 'Wednesday' },
    { value: 4, label: 'T', full: 'Thursday' },
    { value: 5, label: 'F', full: 'Friday' },
    { value: 6, label: 'S', full: 'Saturday' },
];

const SEED_DURATION_OPTIONS = [14, 30, 60];

const getInitialFormState = (habit) => ({
    name: habit?.name || '',
    icon: habit?.icon || '✨',
    type: habit?.type || 'check',
    target: habit?.target || 1,
    frequency: habit?.frequency || 'daily',
    scheduleDays: habit?.schedule_days || [0, 1, 2, 3, 4, 5, 6],
    timeOfDay: habit?.time_of_day || 'anytime',
    reminderTime: habit?.reminder_time || '',
    color: habit?.color || 'teal',
    isSeed: Boolean(habit?.is_seed),
    seedDurationDays: Number(habit?.seed_duration_days) > 0
        ? Number(habit.seed_duration_days)
        : DEFAULT_SEED_DURATION_DAYS,
    seedWhy: habit?.seed_why || '',
});

const labelClass = 'text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400';
const surfaceClass = 'rounded-2xl border border-slate-200 bg-slate-50';
const inputClass = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300';

const HabitModal = ({ isOpen, onClose, onSave, habit = null }) => {
    const initialState = getInitialFormState(habit);

    const [name, setName] = useState(initialState.name);
    const [icon, setIcon] = useState(initialState.icon);
    const [type, setType] = useState(initialState.type);
    const [target, setTarget] = useState(initialState.target);
    const [frequency, setFrequency] = useState(initialState.frequency);
    const [scheduleDays, setScheduleDays] = useState(initialState.scheduleDays);
    const [timeOfDay, setTimeOfDay] = useState(initialState.timeOfDay);
    const [reminderTime, setReminderTime] = useState(initialState.reminderTime);
    const [color, setColor] = useState(initialState.color);
    const [isSeed, setIsSeed] = useState(initialState.isSeed);
    const [seedDurationDays, setSeedDurationDays] = useState(initialState.seedDurationDays);
    const [seedWhy, setSeedWhy] = useState(initialState.seedWhy);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    React.useEffect(() => {
        if (!isOpen) return;

        const nextState = getInitialFormState(habit);
        setName(nextState.name);
        setIcon(nextState.icon);
        setType(nextState.type);
        setTarget(nextState.target);
        setFrequency(nextState.frequency);
        setScheduleDays(nextState.scheduleDays);
        setTimeOfDay(nextState.timeOfDay);
        setReminderTime(nextState.reminderTime);
        setColor(nextState.color);
        setIsSeed(nextState.isSeed);
        setSeedDurationDays(nextState.seedDurationDays);
        setSeedWhy(nextState.seedWhy);
        setShowEmojiPicker(false);
    }, [habit, isOpen]);

    const handleTimeOfDayChange = (value) => {
        setTimeOfDay(value);
        if (value === 'anytime') {
            setReminderTime('');
            return;
        }
        const option = TIME_OF_DAY_OPTIONS.find((item) => item.value === value);
        if (option?.defaultTime && !reminderTime) {
            setReminderTime(option.defaultTime);
        }
    };

    const resetForm = () => {
        const nextState = getInitialFormState(null);
        setName(nextState.name);
        setIcon(nextState.icon);
        setType(nextState.type);
        setTarget(nextState.target);
        setFrequency(nextState.frequency);
        setScheduleDays(nextState.scheduleDays);
        setTimeOfDay(nextState.timeOfDay);
        setReminderTime(nextState.reminderTime);
        setColor(nextState.color);
        setIsSeed(nextState.isSeed);
        setSeedDurationDays(nextState.seedDurationDays);
        setSeedWhy(nextState.seedWhy);
        setShowEmojiPicker(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        if (frequency !== 'daily' && scheduleDays.length === 0) {
            alert('Select at least one day for a specific-days habit.');
            return;
        }

        onSave({
            id: habit?.id,
            name: name.trim(),
            icon,
            type,
            target: type === 'check' ? 1 : parseInt(target, 10) || 1,
            frequency,
            schedule_days: frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : scheduleDays,
            time_of_day: timeOfDay,
            reminder_time: reminderTime || null,
            color,
            is_seed: isSeed,
            seed_duration_days: isSeed ? seedDurationDays : null,
            seed_why: isSeed ? seedWhy.trim() : null,
            seed_started_at: isSeed
                ? (habit?.is_seed ? habit.seed_started_at : new Date().toISOString())
                : null,
            seed_stage: isSeed
                ? (habit?.is_seed ? habit.seed_stage || 'seed' : 'seed')
                : null,
        });

        resetForm();
        onClose();
    };

    const toggleDay = (day) => {
        if (scheduleDays.includes(day)) {
            setScheduleDays(scheduleDays.filter((d) => d !== day));
            return;
        }

        setScheduleDays([...scheduleDays, day].sort());
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.96, opacity: 0, y: 12 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.96, opacity: 0, y: 12 }}
                    className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                                {habit ? 'Edit habit' : 'New habit'}
                            </div>
                            <h2 className="mt-1 text-xl font-semibold text-slate-900">
                                {habit ? 'Update habit' : 'Create habit'}
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">Keep it simple and easy to maintain.</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
                        <div className="space-y-2">
                            <label className={labelClass}>Habit Name</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-2xl transition-colors hover:bg-slate-100"
                                >
                                    {icon}
                                </button>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Drink water"
                                    className={inputClass}
                                    autoFocus
                                />
                            </div>

                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className={`${surfaceClass} flex flex-wrap gap-2 p-3`}
                                    >
                                        {EMOJI_OPTIONS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => {
                                                    setIcon(emoji);
                                                    setShowEmojiPicker(false);
                                                }}
                                                className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-colors ${
                                                    icon === emoji
                                                        ? 'bg-white ring-2 ring-slate-300'
                                                        : 'bg-transparent hover:bg-white'
                                                }`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-2">
                            <label className={labelClass}>Time of Day</label>
                            <div className="grid grid-cols-5 gap-2">
                                {TIME_OF_DAY_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleTimeOfDayChange(option.value)}
                                        className={`rounded-2xl border px-2 py-2.5 text-center text-xs font-medium transition-colors ${
                                            timeOfDay === option.value
                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <option.icon
                                            size={16}
                                            className={`mx-auto mb-1 ${timeOfDay === option.value ? 'text-white' : option.color}`}
                                        />
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            <div className={`${surfaceClass} flex items-center gap-3 px-4 py-3`}>
                                <Clock size={15} className="text-slate-400" />
                                <span className="text-sm text-slate-500">Scheduled time</span>
                                <input
                                    type="time"
                                    value={reminderTime}
                                    onChange={(e) => setReminderTime(e.target.value)}
                                    className="ml-auto rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                />
                                {reminderTime && (
                                    <button
                                        type="button"
                                        onClick={() => setReminderTime('')}
                                        className="text-slate-400 transition-colors hover:text-slate-700"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={labelClass}>Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { value: 'check', label: 'Simple', icon: Check },
                                    { value: 'count', label: 'Count', icon: Hash },
                                    { value: 'duration', label: 'Duration', icon: Clock },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setType(option.value)}
                                        className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                                            type === option.value
                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        <option.icon size={15} />
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {type !== 'check' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={`space-y-2 ${surfaceClass} p-4`}
                            >
                                <label className="text-sm font-medium text-slate-700">
                                    Goal: {target} {type === 'duration' ? 'minutes' : 'times'}
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max={type === 'duration' ? 120 : 20}
                                    value={target}
                                    onChange={(e) => setTarget(parseInt(e.target.value, 10))}
                                    className="w-full accent-slate-900"
                                />
                                <div className="flex justify-between text-xs text-slate-400">
                                    <span>1</span>
                                    <span>{type === 'duration' ? '120 min' : '20 times'}</span>
                                </div>
                            </motion.div>
                        )}

                        <div className={`space-y-3 ${surfaceClass} p-4`}>
                            <button
                                type="button"
                                onClick={() => setIsSeed((prev) => !prev)}
                                className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                                    isSeed
                                        ? 'border-emerald-200 bg-emerald-50'
                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                                        isSeed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        <Sprout size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900">Start as a seed</div>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Let this habit grow slowly with a patience window you choose.
                                                </p>
                                            </div>
                                            <div className={`h-6 w-11 rounded-full p-1 transition-all ${isSeed ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                                                <div className={`h-4 w-4 rounded-full bg-white transition-transform ${isSeed ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <AnimatePresence>
                                {isSeed && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="space-y-4 overflow-hidden"
                                    >
                                        <div className="space-y-2">
                                            <label className={labelClass}>Patience Window</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {SEED_DURATION_OPTIONS.map((days) => (
                                                    <button
                                                        key={days}
                                                        type="button"
                                                        onClick={() => setSeedDurationDays(days)}
                                                        className={`rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                                                            seedDurationDays === days
                                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                                        }`}
                                                    >
                                                        {days} days
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3">
                                                <span className="text-sm text-slate-500">Custom</span>
                                                <input
                                                    type="number"
                                                    min="7"
                                                    max="365"
                                                    value={seedDurationDays}
                                                    onChange={(e) => setSeedDurationDays(Math.max(7, Math.min(365, parseInt(e.target.value, 10) || DEFAULT_SEED_DURATION_DAYS)))}
                                                    className="ml-auto w-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                                                />
                                                <span className="text-sm text-slate-400">days</span>
                                            </div>
                                            <div className="text-xs text-slate-400">
                                                Choose the growth window that feels right for this habit.
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className={labelClass}>Why plant this?</label>
                                            <textarea
                                                value={seedWhy}
                                                onChange={(e) => setSeedWhy(e.target.value)}
                                                placeholder="A short reason that keeps this habit grounded."
                                                rows={3}
                                                className={inputClass}
                                            />
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-2">
                            <label className={labelClass}>Frequency</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'daily', label: 'Daily' },
                                    { value: 'weekly', label: 'Specific Days' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setFrequency(option.value)}
                                        className={`rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                                            frequency === option.value
                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                        }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {frequency !== 'daily' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={`space-y-2 ${surfaceClass} p-4`}
                            >
                                <label className={labelClass}>Select Days</label>
                                <div className="flex justify-between gap-2">
                                    {DAYS.map((day) => (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleDay(day.value)}
                                            title={day.full}
                                            className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                                                scheduleDays.includes(day.value)
                                                    ? 'border-slate-900 bg-slate-900 text-white'
                                                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                            }`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="text-xs text-slate-400">
                                    Only scheduled days count. Free days stay neutral.
                                </div>
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <label className={labelClass}>Color Theme</label>
                            <div className="flex gap-3">
                                {COLOR_OPTIONS.map((colorOption) => (
                                    <button
                                        key={colorOption.name}
                                        type="button"
                                        onClick={() => setColor(colorOption.name)}
                                        className={`h-10 w-10 rounded-full ${colorOption.swatch} transition-transform ${
                                            color === colorOption.name ? 'scale-110 ring-2 ring-slate-900 ring-offset-2' : 'opacity-70 hover:opacity-100'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </form>

                    <div className="flex gap-3 border-t border-slate-200 px-5 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                        >
                            <Plus size={16} />
                            {habit ? 'Update Habit' : 'Create Habit'}
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default HabitModal;
