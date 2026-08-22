import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Check, Clock, Hash, Moon, Plus, Sprout, Star, Sun, Sunrise, Sunset, X } from 'lucide-react';
import { DEFAULT_SEED_DURATION_DAYS } from '../constants/habitSeeds';
import { Sheet } from '../ui';
import {
    COLOR_OPTIONS,
    DAYS,
    EMOJI_OPTIONS,
    inputClass,
    labelClass,
    SEED_DURATION_OPTIONS,
    SCORE_MAX,
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
        <Sheet open={isOpen} onClose={onClose} title={habit ? 'Edit habit' : 'New habit'} className="habit-sheet">
                    <form onSubmit={handleSubmit} className="habit-form flex-1 overflow-y-auto">
                        <div className="space-y-2">
                            <label className={labelClass}>Habit Name</label>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                    className="habit-form__emoji-button flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] text-2xl transition-colors hover:bg-[var(--color-paper-3)]"
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
                                                        ? 'bg-[var(--color-card-raised)] ring-2 ring-[var(--color-accent)]'
                                                        : 'bg-transparent hover:bg-[var(--color-card-raised)]'
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
                                        className={`habit-form__choice rounded-2xl border px-2 py-2.5 text-center text-xs font-medium transition-colors ${
                                            timeOfDay === option.value
                                                ? 'is-selected border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]'
                                                : 'border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]'
                                        }`}
                                    >
                                        <option.icon
                                            size={16}
                                            className={`mx-auto mb-1 ${timeOfDay === option.value ? 'text-[var(--color-paper)]' : option.color}`}
                                        />
                                        {option.label}
                                    </button>
                                ))}
                            </div>

                            <div className={`${surfaceClass} flex items-center gap-3 px-4 py-3`}>
                                <Clock size={15} className="text-[var(--color-muted)]" />
                                <span className="text-sm text-[var(--color-muted)]">Scheduled time</span>
                                <input
                                    type="time"
                                    value={reminderTime}
                                    onChange={(e) => setReminderTime(e.target.value)}
                                    className="ml-auto rounded-xl border border-[var(--color-rule)] bg-[var(--color-card-raised)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                                />
                                {reminderTime && (
                                    <button
                                        type="button"
                                        onClick={() => setReminderTime('')}
                                        className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-ink)]"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className={labelClass}>Type</label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                                {[
                                    { value: 'check', label: 'Simple', icon: Check },
                                    { value: 'count', label: 'Count', icon: Hash },
                                    { value: 'duration', label: 'Duration', icon: Clock },
                                    { value: 'score', label: 'Score', icon: Star },
                                    { value: 'time', label: 'Time', icon: Clock },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => {
                                            setType(option.value);
                                            if (option.value === 'score') setTarget(SCORE_MAX);
                                            if (option.value === 'time') setTarget(1);
                                        }}
                                        className={`habit-form__choice flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                                            type === option.value
                                                ? 'is-selected border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]'
                                                : 'border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]'
                                        }`}
                                    >
                                        <option.icon size={15} />
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {type !== 'check' && type !== 'score' && (
                            <Motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className={`space-y-2 ${surfaceClass} p-4`}
                            >
                                <label className="text-sm font-medium text-[var(--color-ink-2)]">
                                    Goal: {target} {type === 'duration' ? 'minutes' : 'times'}
                                </label>
                                <input
                                    type="range"
                                    min="1"
                                    max={type === 'duration' ? 120 : 20}
                                    value={target}
                                    onChange={(e) => setTarget(parseInt(e.target.value, 10))}
                                    className="w-full accent-[var(--color-accent)]"
                                />
                                <div className="flex justify-between text-xs text-[var(--color-muted)]">
                                    <span>1</span>
                                    <span>{type === 'duration' ? '120 min' : '20 times'}</span>
                                </div>
                            </Motion.div>
                        )}

                        {type === 'score' && (
                            <div className={`${surfaceClass} flex items-center justify-between gap-3`}>
                                <div>
                                    <div className="text-sm font-medium text-[var(--color-ink)]">Daily score</div>
                                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">Choose one number from 1 to {SCORE_MAX} each day.</p>
                                </div>
                                <span className="shrink-0 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)]">1–{SCORE_MAX}</span>
                            </div>
                        )}

                        {type === 'time' && (
                            <div className={`${surfaceClass} flex items-center justify-between gap-3`}>
                                <div>
                                    <div className="text-sm font-medium text-[var(--color-ink)]">Daily time</div>
                                    <p className="mt-0.5 text-xs text-[var(--color-muted)]">Record a time such as when you wake up.</p>
                                </div>
                                <span className="shrink-0 rounded-full bg-[var(--color-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-accent)]">Time</span>
                            </div>
                        )}

                        <div className={`space-y-3 ${surfaceClass} p-4`}>
                            <button
                                type="button"
                                onClick={() => setIsSeed((prev) => !prev)}
                                className={`habit-form__seed-toggle w-full rounded-2xl border px-4 py-4 text-left transition-colors ${
                                    isSeed
                                        ? 'border-[var(--color-success)] bg-[var(--color-success-soft)]'
                                        : 'border-[var(--color-rule)] bg-[var(--color-card-raised)] hover:bg-[var(--color-paper-2)]'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                                        isSeed ? 'bg-[var(--color-success)] text-white' : 'bg-[var(--color-paper-2)] text-[var(--color-muted)]'
                                    }`}>
                                        <Sprout size={16} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-[var(--color-ink)]">Gentle start</div>
                                                <p className="mt-1 text-xs text-[var(--color-muted)]">
                                                    Skip streak pressure for the first days while the habit settles.
                                                </p>
                                            </div>
                                            <div className={`h-6 w-11 rounded-full p-1 transition-all ${isSeed ? 'bg-[var(--color-success)]' : 'bg-[var(--color-rule)]'}`}>
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
                                            <label className={labelClass}>Duration</label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {SEED_DURATION_OPTIONS.map((days) => (
                                                    <button
                                                        key={days}
                                                        type="button"
                                                        onClick={() => setSeedDurationDays(days)}
                                                        className={`habit-form__choice rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                                                            seedDurationDays === days
                                                                ? 'is-selected border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]'
                                                                : 'border-[var(--color-rule)] bg-[var(--color-card-raised)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-2)]'
                                                        }`}
                                                    >
                                                        {days} days
                                                    </button>
                                                ))}
                                            </div>
                                            <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card-raised)] px-3 py-3">
                                                <span className="text-sm text-[var(--color-muted)]">Custom</span>
                                                <input
                                                    type="number"
                                                    min="7"
                                                    max="365"
                                                    value={seedDurationDays}
                                                    onChange={(e) => setSeedDurationDays(Math.max(7, Math.min(365, parseInt(e.target.value, 10) || DEFAULT_SEED_DURATION_DAYS)))}
                                                    className="ml-auto w-24 rounded-xl border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]"
                                                />
                                                <span className="text-sm text-[var(--color-muted)]">days</span>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className={labelClass}>Why this habit?</label>
                                            <textarea
                                                value={seedWhy}
                                                onChange={(e) => setSeedWhy(e.target.value)}
                                                placeholder="A short reason to keep going."
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
                                        className={`habit-form__choice rounded-2xl border px-3 py-3 text-sm font-medium transition-colors ${
                                            frequency === option.value
                                                ? 'is-selected border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]'
                                                : 'border-[var(--color-rule)] bg-[var(--color-paper-2)] text-[var(--color-ink-2)] hover:bg-[var(--color-paper-3)]'
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
                                            className={`habit-form__choice flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                                                scheduleDays.includes(day.value)
                                                    ? 'is-selected border-[var(--color-ink)] bg-[var(--color-ink)] text-[var(--color-paper)]'
                                                    : 'border-[var(--color-rule)] bg-[var(--color-card-raised)] text-[var(--color-muted)] hover:bg-[var(--color-paper-2)]'
                                            }`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                                <div className="text-xs text-[var(--color-muted)]">
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
                                        className={`habit-form__color h-10 w-10 rounded-full ${colorOption.swatch} transition-transform ${
                                            color === colorOption.name ? 'scale-110 ring-2 ring-[var(--color-ink)] ring-offset-2 ring-offset-[var(--color-card)]' : 'opacity-70 hover:opacity-100'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>
                    </form>

                    <div className="habit-form__footer flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card-raised)] px-4 py-3 text-sm font-medium text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-paper-2)]"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            onClick={handleSubmit}
                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--color-ink)] px-4 py-3 text-sm font-medium text-[var(--color-paper)] transition-colors hover:opacity-90"
                        >
                            <Plus size={16} />
                            {habit ? 'Update Habit' : 'Create Habit'}
                        </button>
                    </div>
        </Sheet>
);

export default HabitModalForm;
