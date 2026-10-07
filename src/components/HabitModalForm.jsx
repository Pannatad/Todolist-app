import { DEFAULT_SEED_DURATION_DAYS } from '../constants/habitSeeds';
import { Sheet } from '../ui';
import {
    COLOR_OPTIONS,
    DAYS,
    EMOJI_OPTIONS,
    HABIT_COLORS,
    HABIT_TYPE_OPTIONS,
    SEED_DURATION_OPTIONS,
    SCORE_MAX,
    TIME_OF_DAY_OPTIONS,
} from './habitModalUtils';

// Settings-style habit form: grouped rows with pickers instead of chip grids.
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
}) => {
    const durationOptions = SEED_DURATION_OPTIONS.includes(seedDurationDays)
        ? SEED_DURATION_OPTIONS
        : [...SEED_DURATION_OPTIONS, seedDurationDays].sort((a, b) => a - b);

    const changeType = (value) => {
        setType(value);
        if (value === 'score') setTarget(SCORE_MAX);
        if (value === 'time') setTarget(1);
    };

    return (
        <Sheet open={isOpen} onClose={onClose} title={habit ? 'Edit Habit' : 'New Habit'} className="form-sheet">
            <form onSubmit={handleSubmit} className="form-stack habit-form-ios">
                <div className="form-group">
                    <div className="form-field habit-form-ios__name">
                        <button
                            type="button"
                            className="habit-form-ios__icon"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            aria-label="Choose icon"
                            aria-expanded={showEmojiPicker}
                            style={{ '--habit': HABIT_COLORS[color] || 'var(--color-accent)' }}
                        >
                            {icon}
                        </button>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Name"
                            aria-label="Habit name"
                            autoFocus={!habit}
                        />
                    </div>
                    {showEmojiPicker && (
                        <div className="form-field habit-form-ios__emoji" role="group" aria-label="Icon">
                            {EMOJI_OPTIONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    aria-pressed={icon === emoji}
                                    className={icon === emoji ? 'is-selected' : undefined}
                                    onClick={() => {
                                        setIcon(emoji);
                                        setShowEmojiPicker(false);
                                    }}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Time of Day</span>
                        <select value={timeOfDay} onChange={(e) => handleTimeOfDayChange(e.target.value)}>
                            {TIME_OF_DAY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    {timeOfDay !== 'anytime' && (
                        <label className="form-field form-field--value">
                            <span className="form-field__label">Time</span>
                            <input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
                        </label>
                    )}
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Repeat</span>
                        <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
                            <option value="daily">Every Day</option>
                            <option value="weekly">Specific Days</option>
                        </select>
                    </label>
                    {frequency !== 'daily' && (
                        <div className="form-field form-days" role="group" aria-label="Days">
                            {DAYS.map((day) => (
                                <button
                                    key={day.value}
                                    type="button"
                                    aria-pressed={scheduleDays.includes(day.value)}
                                    aria-label={day.full}
                                    onClick={() => toggleDay(day.value)}
                                    className={`form-day${scheduleDays.includes(day.value) ? ' is-selected' : ''}`}
                                >
                                    {day.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Track</span>
                        <select value={type} onChange={(e) => changeType(e.target.value)}>
                            {HABIT_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>
                    {(type === 'count' || type === 'duration') && (
                        <label className="form-field form-field--value">
                            <span className="form-field__label">Goal</span>
                            <input
                                type="number"
                                min="1"
                                max={type === 'duration' ? 600 : 100}
                                value={target}
                                onChange={(e) => setTarget(Math.max(1, parseInt(e.target.value, 10) || 1))}
                            />
                            <span className="form-field__suffix">{type === 'duration' ? 'min' : 'times'}</span>
                        </label>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-field">
                        <span className="form-goal">Gentle Start</span>
                        <input
                            type="checkbox"
                            role="switch"
                            className="ui-switch"
                            checked={isSeed}
                            onChange={(e) => setIsSeed(e.target.checked)}
                        />
                    </label>
                    {isSeed && (
                        <>
                            <label className="form-field form-field--value">
                                <span className="form-field__label">Length</span>
                                <select
                                    value={seedDurationDays}
                                    onChange={(e) => setSeedDurationDays(parseInt(e.target.value, 10) || DEFAULT_SEED_DURATION_DAYS)}
                                >
                                    {durationOptions.map((days) => <option key={days} value={days}>{days} days</option>)}
                                </select>
                            </label>
                            <label className="form-field form-field--stacked">
                                <span className="sr-only">Why this habit?</span>
                                <textarea
                                    value={seedWhy}
                                    onChange={(e) => setSeedWhy(e.target.value)}
                                    placeholder="Why this habit?"
                                    rows={2}
                                />
                            </label>
                        </>
                    )}
                </div>
                <p className="form-note habit-form-ios__note">
                    {isSeed ? 'No streak pressure while the habit settles in.' : 'Turn on to skip streak pressure for the first days.'}
                </p>

                <div className="form-group">
                    <div className="form-swatches" role="radiogroup" aria-label="Color">
                        {COLOR_OPTIONS.map((colorOption) => (
                            <button
                                key={colorOption.name}
                                type="button"
                                role="radio"
                                aria-checked={color === colorOption.name}
                                aria-label={colorOption.name}
                                onClick={() => setColor(colorOption.name)}
                                className={`form-swatch${color === colorOption.name ? ' is-selected' : ''}`}
                                style={{ '--swatch': HABIT_COLORS[colorOption.name] }}
                            />
                        ))}
                    </div>
                </div>

                <button type="submit" disabled={!name.trim()} className="ui-button ui-button--accent form-submit">
                    {habit ? 'Save' : 'Add Habit'}
                </button>
            </form>
        </Sheet>
    );
};

export default HabitModalForm;
