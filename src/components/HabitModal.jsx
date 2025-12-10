import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Check, Clock, Hash, Calendar, Sparkles, Sun, Sunrise, Sunset, Moon } from 'lucide-react';

const EMOJI_OPTIONS = ['💧', '🧘', '🏃', '📚', '📝', '💪', '🎯', '⏰', '🌟', '❤️', '🧠', '🎨', '🎵', '💤', '🥗', '🚶', '✨'];

const COLOR_OPTIONS = [
    { name: 'purple', gradient: 'from-purple-500 to-indigo-600' },
    { name: 'pink', gradient: 'from-pink-500 to-rose-600' },
    { name: 'teal', gradient: 'from-teal-500 to-cyan-600' },
    { name: 'amber', gradient: 'from-amber-500 to-orange-600' },
    { name: 'emerald', gradient: 'from-emerald-500 to-green-600' },
];

const TIME_OF_DAY_OPTIONS = [
    { value: 'morning', label: 'Morning', icon: Sunrise, color: 'text-amber-400' },
    { value: 'afternoon', label: 'Afternoon', icon: Sun, color: 'text-yellow-400' },
    { value: 'evening', label: 'Evening', icon: Sunset, color: 'text-orange-400' },
    { value: 'night', label: 'Night', icon: Moon, color: 'text-indigo-400' },
    { value: 'anytime', label: 'Anytime', icon: Clock, color: 'text-gray-400' },
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

const HabitModal = ({ isOpen, onClose, onSave, habit = null }) => {
    const [name, setName] = useState(habit?.name || '');
    const [icon, setIcon] = useState(habit?.icon || '✨');
    const [type, setType] = useState(habit?.type || 'check');
    const [target, setTarget] = useState(habit?.target || 1);
    const [frequency, setFrequency] = useState(habit?.frequency || 'daily');
    const [scheduleDays, setScheduleDays] = useState(habit?.schedule_days || [0, 1, 2, 3, 4, 5, 6]);
    const [timeOfDay, setTimeOfDay] = useState(habit?.time_of_day || 'anytime');
    const [color, setColor] = useState(habit?.color || 'purple');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Reset form when habit prop changes (for editing different habits)
    React.useEffect(() => {
        if (isOpen) {
            setName(habit?.name || '');
            setIcon(habit?.icon || '✨');
            setType(habit?.type || 'check');
            setTarget(habit?.target || 1);
            setFrequency(habit?.frequency || 'daily');
            setScheduleDays(habit?.schedule_days || [0, 1, 2, 3, 4, 5, 6]);
            setTimeOfDay(habit?.time_of_day || 'anytime');
            setColor(habit?.color || 'purple');
            setShowEmojiPicker(false);
        }
    }, [habit, isOpen]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        onSave({
            id: habit?.id,
            name: name.trim(),
            icon,
            type,
            target: type === 'check' ? 1 : parseInt(target) || 1,
            frequency,
            schedule_days: frequency === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : scheduleDays,
            time_of_day: timeOfDay,
            color
        });

        // Reset form
        setName('');
        setIcon('✨');
        setType('check');
        setTarget(1);
        setFrequency('daily');
        setScheduleDays([0, 1, 2, 3, 4, 5, 6]);
        setTimeOfDay('anytime');
        setColor('purple');
        onClose();
    };

    const toggleDay = (day) => {
        if (scheduleDays.includes(day)) {
            setScheduleDays(scheduleDays.filter(d => d !== day));
        } else {
            setScheduleDays([...scheduleDays, day].sort());
        }
    };

    if (!isOpen) return null;

    const selectedColorGradient = COLOR_OPTIONS.find(c => c.name === color)?.gradient || COLOR_OPTIONS[0].gradient;

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
                    {/* Header */}
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

                    {/* Form - Scrollable */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                        {/* Name & Icon */}
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
                                    className="flex-1 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                    autoFocus
                                />
                            </div>
                            {/* Emoji Picker */}
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
                                                className={`w-10 h-10 flex items-center justify-center text-xl rounded-lg hover:bg-white/20 transition-colors ${icon === emoji ? 'bg-white/30 ring-2 ring-purple-400' : 'bg-white/10'}`}
                                            >
                                                {emoji}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Time of Day */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Time of Day</label>
                            <div className="grid grid-cols-5 gap-2">
                                {TIME_OF_DAY_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setTimeOfDay(option.value)}
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
                        </div>

                        {/* Type */}
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

                        {/* Target (for count/duration) */}
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
                                    onChange={(e) => setTarget(parseInt(e.target.value))}
                                    className="w-full accent-purple-500"
                                />
                                <div className="flex justify-between text-xs text-white/40">
                                    <span>1</span>
                                    <span>{type === 'duration' ? '120 min' : '20 times'}</span>
                                </div>
                            </motion.div>
                        )}

                        {/* Frequency */}
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

                        {/* Schedule Days */}
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

                        {/* Color Theme */}
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

                        {/* Actions */}
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
