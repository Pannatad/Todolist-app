import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Check, Clock, Hash, Moon, Plus, Sprout, Sun, Sunrise, Sunset, X } from 'lucide-react';
import { DEFAULT_SEED_DURATION_DAYS } from '../constants/habitSeeds';
import { Sheet } from '../ui';
import {
    COLOR_OPTIONS,
    DAYS,
    EMOJI_OPTIONS,
    inputClass,
    labelClass,
    SEED_DURATION_OPTIONS,
    surfaceClass,
    TIME_OF_DAY_OPTIONS,
} from './habitModalUtils';

const HabitModalForm = ({
    color,
    frequency,
    habit,
    handleSubmit,
    handleTimeOfDayChange,
    icon,
    isOpen,
    isSeed,
    name,
    onClose,
    reminderTime,
    scheduleDays,
    seedDurationDays,
    seedWhy,
    setColor,
    setFrequency,
    setIcon,
    setIsSeed,
    setName,
    setReminderTime,
    setSeedDurationDays,
    setSeedWhy,
    setShowEmojiPicker,
    setTarget,
    setType,
    showEmojiPicker,
    target,
    timeOfDay,
    toggleDay,
    type,
}) => (
        <Sheet open={isOpen} onClose={onClose} title={habit ? 'Edit habit' : 'New habit'}>
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
                                    <Motion.div
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
                                    </Motion.div>
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
                            <Motion.div
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
                            </Motion.div>
                        )}

                        <div className={`space-y-3 ${surfaceClass} p-4`}>
                            <button
                                type="button"
                                onClick={() => setIsSeed((prev) => !prev)}
                                className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                                    isSeed
                                        ? 'border-[var(--color-success)] bg-[var(--color-success)]'
                                        : 'border-slate-200 bg-white hover:bg-slate-50'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                                        isSeed ? 'bg-[var(--color-success)] text-[var(--color-success)]' : 'bg-slate-100 text-slate-500'
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
                                            <div className={`h-6 w-11 rounded-full p-1 transition-all ${isSeed ? 'bg-[var(--color-success)]0' : 'bg-slate-200'}`}>
                                                <div className={`h-4 w-4 rounded-full bg-white transition-transform ${isSeed ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </button>

                            <AnimatePresence>
                                {isSeed && (
                                    <Motion.div
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
                                    </Motion.div>
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
                            <Motion.div
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
                            </Motion.div>
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
        </Sheet>
);

export default HabitModalForm;
