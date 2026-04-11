import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Clock, Hash, Sparkles, Sun, Sunrise, Sunset, Moon, Sprout } from 'lucide-react';
import { DEFAULT_SEED_DURATION_DAYS } from '../constants/habitSeeds';

const EMOJI_OPTIONS = ['💧', '🧘', '🏃', '📚', '📝', '💪', '🎯', '⏰', '🌟', '❤️', '🧠', '🎨', '🎵', '💤', '🥗', '🚶', '✨'];

const COLOR_OPTIONS = [
    { name: 'purple', gradient: 'from-purple-500 to-indigo-600' },
    { name: 'pink', gradient: 'from-pink-500 to-rose-600' },
    { name: 'teal', gradient: 'from-teal-500 to-cyan-600' },
    { name: 'amber', gradient: 'from-amber-500 to-orange-600' },
    { name: 'emerald', gradient: 'from-emerald-500 to-green-600' },
];

const TIME_OF_DAY_OPTIONS = [
    { value: 'morning', label: 'Morning', icon: Sunrise, color: 'text-amber-400', defaultTime: '07:00' },
    { value: 'afternoon', label: 'Afternoon', icon: Sun, color: 'text-yellow-400', defaultTime: '12:00' },
    { value: 'evening', label: 'Evening', icon: Sunset, color: 'text-orange-400', defaultTime: '18:00' },
    { value: 'night', label: 'Night', icon: Moon, color: 'text-indigo-400', defaultTime: '21:00' },
    { value: 'anytime', label: 'Anytime', icon: Clock, color: 'text-gray-400', defaultTime: '' },
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

const SEED_DURATION_OPTIONS = [21, 42, 90];

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

    const selectedColorGradient = COLOR_OPTIONS.find((item) => item.name === color)?.gradient || COLOR_OPTIONS[2].gradient;

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
                    className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 w-full max-w-md max-h-[90vh] rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={`bg-gradient-to-r ${selectedColorGradient} p-6 relative overflow-hidden flex-shrink-0`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <Sparkles className="text-white/80" size={24} />
                                <h2 className="text-xl font-bold text-white">
                                    {habit ? 'Edit Habit' : 'Create New Habit'}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Habit Name</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="w-12 h-12 flex items-center justify-center text-2xl bg-white/10 rounded-xl hover:bg-white/20 transition-colors border border-white/10"
                                >
                                    {icon}
                                </button>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Drink 8 glasses of water"
                                    className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                                    autoFocus
                                />
                            </div>

                            <AnimatePresence>
                                {showEmojiPicker && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex flex-wrap gap-2 p-3 bg-white/5 rounded-xl border border-white/10"
                                    >
                                        {EMOJI_OPTIONS.map((emoji) => (
                                            <button
                                                key={emoji}
                                                type="button"
                                                onClick={() => {
                                                    setIcon(emoji);
                                                    setShowEmojiPicker(false);
                                                }}
                                                className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg hover:bg-white/20 transition-colors ${icon === emoji ? 'bg-white/30 ring-2 ring-teal-400' : 'bg-white/10'}`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Time of Day</label>
                            <div className="grid grid-cols-5 gap-2">
                                {TIME_OF_DAY_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleTimeOfDayChange(option.value)}
                                        className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl font-medium transition-all ${timeOfDay === option.value
                                            ? `bg-gradient-to-r ${selectedColorGradient} text-white shadow-lg`
                                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                                            }`}
                                    >
                                        <option.icon size={18} className={timeOfDay === option.value ? 'text-white' : option.color} />
                                        <span className="text-xs">{option.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="flex items-center gap-3 mt-3">
                                <Clock size={16} className="text-white/50" />
                                <span className="text-sm text-white/60">Scheduled time</span>
                                <input
                                    type="time"
                                    value={reminderTime}
                                    onChange={(e) => setReminderTime(e.target.value)}
                                    className="ml-auto bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/50 [color-scheme:dark]"
                                />
                                {reminderTime && (
                                    <button
                                        type="button"
                                        onClick={() => setReminderTime('')}
                                        className="text-white/40 hover:text-white/70 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Type</label>
                            <div className="flex gap-2">
                                {[
                                    { value: 'check', label: 'Simple', icon: Check },
                                    { value: 'count', label: 'Count', icon: Hash },
                                    { value: 'duration', label: 'Duration', icon: Clock },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setType(option.value)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${type === option.value
                                            ? `bg-gradient-to-r ${selectedColorGradient} text-white shadow-lg`
                                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                                            }`}
                                    >
                                        <option.icon size={16} />
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {type !== 'check' && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-2"
                            >
                                <label className="text-sm font-medium text-white/70">
                                    Goal: {target} {type === 'duration' ? 'minutes' : 'times'}
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max={type === 'duration' ? 120 : 20}
                                    value={target}
                                    onChange={(e) => setTarget(parseInt(e.target.value, 10))}
                                    className="w-full accent-teal-500"
                                />
                                <div className="flex justify-between text-xs text-white/40">
                                    <span>1</span>
                                    <span>{type === 'duration' ? '120 min' : '20 times'}</span>
                                </div>
                            </motion.div>
                        )}

                        <div className="space-y-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                            <button
                                type="button"
                                onClick={() => setIsSeed((prev) => !prev)}
                                className={`w-full rounded-2xl border p-4 text-left transition-all ${isSeed
                                    ? 'border-emerald-300/40 bg-emerald-400/15 shadow-lg shadow-emerald-950/20'
                                    : 'border-white/10 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl ${isSeed ? 'bg-emerald-400/20 text-emerald-100' : 'bg-white/10 text-white/60'}`}>
                                        <Sprout size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-white">Start as a seed</div>
                                                <p className="mt-1 text-xs text-white/60">
                                                    Keep it small, keep it patient, and let this habit take root over time.
                                                </p>
                                            </div>
                                            <div className={`h-6 w-11 rounded-full p-1 transition-all ${isSeed ? 'bg-emerald-400' : 'bg-white/15'}`}>
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
                                            <label className="text-sm font-medium text-white/70">Patience window</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {SEED_DURATION_OPTIONS.map((days) => (
                                                    <button
                                                        key={days}
                                                        type="button"
                                                        onClick={() => setSeedDurationDays(days)}
                                                        className={`rounded-xl px-3 py-3 text-sm font-medium transition-all ${seedDurationDays === days
                                                            ? 'bg-emerald-400 text-slate-900 shadow-lg'
                                                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                                                            }`}
                                                    >
                                                        {days} days
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-white/70">Why plant this?</label>
                                            <textarea
                                                value={seedWhy}
                                                onChange={(e) => setSeedWhy(e.target.value)}
                                                placeholder="e.g., I want reading to feel natural every day, even if it starts with one page."
                                                rows={3}
                                                className="w-full rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                                            />
                                        </div>

                                        <div className="rounded-xl border border-emerald-200/10 bg-black/10 px-4 py-3 text-xs text-emerald-50/80">
                                            Seed habits are measured by consistency, not intensity. Start tiny now, grow later.
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Frequency</label>
                            <div className="flex gap-2">
                                {[
                                    { value: 'daily', label: 'Daily' },
                                    { value: 'weekly', label: 'Specific Days' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setFrequency(option.value)}
                                        className={`flex-1 py-3 rounded-xl font-medium transition-all ${frequency === option.value
                                            ? `bg-gradient-to-r ${selectedColorGradient} text-white shadow-lg`
                                            : 'bg-white/10 text-white/60 hover:bg-white/20'
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
                                className="space-y-2"
                            >
                                <label className="text-sm font-medium text-white/70">Select Days</label>
                                <div className="flex gap-2 justify-between">
                                    {DAYS.map((day) => (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => toggleDay(day.value)}
                                            title={day.full}
                                            className={`w-10 h-10 rounded-full font-bold transition-all ${scheduleDays.includes(day.value)
                                                ? `bg-gradient-to-r ${selectedColorGradient} text-white shadow-lg`
                                                : 'bg-white/10 text-white/40 hover:bg-white/20'
                                                }`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Color Theme</label>
                            <div className="flex gap-3">
                                {COLOR_OPTIONS.map((colorOption) => (
                                    <button
                                        key={colorOption.name}
                                        type="button"
                                        onClick={() => setColor(colorOption.name)}
                                        className={`w-10 h-10 rounded-full bg-gradient-to-r ${colorOption.gradient} transition-all ${color === colorOption.name
                                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900 scale-110'
                                            : 'opacity-60 hover:opacity-100'
                                            }`}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl font-bold text-white/60 bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r ${selectedColorGradient} hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2`}
                            >
                                <Plus size={18} />
                                {habit ? 'Update Habit' : 'Create Habit'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default HabitModal;
