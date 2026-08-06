/* eslint-disable react-hooks/set-state-in-effect */
import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { Check, Circle, Clock, Edit2, FileText, Flame, Lock, Trash2 } from 'lucide-react';

const formatTime12h = (timeStr) => {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

const getFrequencyLabel = (habit) => {
    if (habit.frequency === 'daily') return 'Daily';
    if (habit.schedule_days?.length) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return habit.schedule_days.map((day) => dayNames[day]).join(', ');
    }
    return 'Custom';
};

const HabitCard = ({
    habit,
    log,
    onLog,
    onSaveNote,
    noteCount = 0,
    onViewNotes,
    onEdit,
    onDelete,
    streak,
    seedInsight,
    compact = false,
    disabled = false,
    disabledReason = '',
}) => {
    const [justCompleted, setJustCompleted] = useState(false);
    const [localDuration, setLocalDuration] = useState(null);
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteDraft, setNoteDraft] = useState(log?.notes || '');
    const actualValue = log?.value || 0;
    const currentValue = localDuration !== null ? localDuration : actualValue;
    const isCompleted = log?.completed || false;
    const noteText = log?.notes || '';
    const progress = habit.type === 'check'
        ? (isCompleted ? 100 : 0)
        : Math.min((currentValue / habit.target) * 100, 100);
    const currentStreak = streak?.current || 0;
    const seedEnded = Boolean(seedInsight?.ended);

    useEffect(() => {
        setNoteDraft(log?.notes || '');
    }, [log?.notes]);

    const pulseCompletion = () => {
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 1000);
    };

    const handleIncrement = (event) => {
        event?.stopPropagation();
        if (disabled) return;
        if (habit.type === 'check') {
            if (!isCompleted) pulseCompletion();
            onLog(habit.id, isCompleted ? 0 : 1, !isCompleted);
            return;
        }
        const nextValue = Math.min(currentValue + 1, habit.target);
        if (nextValue >= habit.target && !isCompleted) pulseCompletion();
        onLog(habit.id, nextValue, nextValue >= habit.target);
    };

    const handleDurationChange = (event) => {
        event.stopPropagation();
        if (disabled) return;
        const parsedValue = parseInt(event.target.value, 10);
        setLocalDuration(Number.isFinite(parsedValue) ? Math.max(0, parsedValue) : 0);
    };

    const handleDurationCommit = (event) => {
        event?.stopPropagation();
        if (disabled || localDuration === null) return;
        if (localDuration >= habit.target && actualValue < habit.target) pulseCompletion();
        onLog(habit.id, localDuration, localDuration >= habit.target);
        setLocalDuration(null);
    };

    const handleSaveNote = () => {
        if (disabled) return;
        onSaveNote?.(habit.id, noteDraft.trim());
        setIsEditingNote(false);
    };

    if (compact) {
        return (
            <Motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleIncrement}
                disabled={disabled}
                aria-label={isCompleted ? `Undo ${habit.name}` : `Complete ${habit.name}`}
                className={`habit-compact-control${isCompleted ? ' is-completed' : ''}`}
            >
                {isCompleted ? <Check size={16} strokeWidth={3} /> : <span>+</span>}
            </Motion.button>
        );
    }

    return (
        <Motion.article
            className={`habit-row${isCompleted ? ' is-completed' : ''}${disabled ? ' is-disabled' : ''}`}
            data-habit-color={habit.color || 'slate'}
        >
            <AnimatePresence>
                {justCompleted && (
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="habit-row__completion"
                        aria-hidden="true"
                    />
                )}
            </AnimatePresence>

            <div className="habit-row__main">
                <div className="habit-row__mark">
                    {habit.type === 'duration' ? (
                        <span className="habit-row__type-icon" title="Duration habit">
                            <Clock size={17} aria-hidden="true" />
                        </span>
                    ) : (
                        <Motion.button
                            whileTap={{ scale: 0.92 }}
                            onClick={handleIncrement}
                            disabled={disabled}
                            title={disabled ? disabledReason : undefined}
                            aria-label={isCompleted ? `Undo ${habit.name}` : `Log ${habit.name}`}
                            className={`habit-row__check${isCompleted ? ' is-completed' : ''}`}
                        >
                            {isCompleted ? <Check size={17} strokeWidth={3} /> : <Circle size={19} strokeWidth={1.8} />}
                        </Motion.button>
                    )}
                </div>

                <div className="habit-row__body">
                    <div className="habit-row__heading">
                        <div className="habit-row__title-line">
                            <span className="habit-row__icon" aria-hidden="true">{habit.icon}</span>
                            <h3 className={isCompleted ? 'is-completed' : ''}>{habit.name}</h3>
                        </div>
                        <div className="habit-row__meta">
                            <span>{getFrequencyLabel(habit)}</span>
                            {habit.reminder_time && <span>{formatTime12h(habit.reminder_time)}</span>}
                            {currentStreak > 0 && (
                                <span className="habit-row__streak">
                                    <Flame size={13} strokeWidth={2.5} aria-hidden="true" />
                                    {currentStreak} day streak
                                </span>
                            )}
                            {disabled && (
                                <span title={disabledReason}>
                                    <Lock size={12} aria-hidden="true" />
                                    {seedEnded ? 'Seed ended' : 'Read-only'}
                                </span>
                            )}
                        </div>
                    </div>

                    {habit.type !== 'check' && (
                        <div className="habit-row__progress">
                            {habit.type === 'count' && (
                                <div className="habit-progress-line">
                                    <div className="habit-progress-line__bar" aria-hidden="true">
                                        <span style={{ width: `${progress}%` }} />
                                    </div>
                                    <span className="habit-progress-line__value">{currentValue}/{habit.target}</span>
                                </div>
                            )}
                            {habit.type === 'duration' && (
                                <div className="habit-duration-line">
                                    <input
                                        id={`habit-duration-${habit.id}`}
                                        type="range"
                                        min="0"
                                        max={habit.target}
                                        value={currentValue}
                                        onChange={handleDurationChange}
                                        onMouseUp={handleDurationCommit}
                                        onTouchEnd={handleDurationCommit}
                                        onBlur={handleDurationCommit}
                                        disabled={disabled}
                                        title={disabled ? disabledReason : undefined}
                                        aria-label={`${habit.name} duration`}
                                    />
                                    <span className="habit-progress-line__value">{currentValue}/{habit.target} min</span>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="habit-row__notes">
                        {isEditingNote ? (
                            <div className="habit-note-editor">
                                <textarea
                                    value={noteDraft}
                                    onChange={(event) => setNoteDraft(event.target.value)}
                                    onClick={(event) => event.stopPropagation()}
                                    disabled={disabled}
                                    rows={2}
                                    placeholder={habit.type === 'duration' ? 'e.g. Woke up at 6:20 AM' : 'e.g. Walking, running 2 km, weight training'}
                                />
                                <div className="habit-note-editor__actions">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setNoteDraft(noteText);
                                            setIsEditingNote(false);
                                        }}
                                    >
                                        Cancel
                                    </button>
                                    <button type="button" onClick={handleSaveNote} disabled={disabled} className="is-primary">
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="habit-row__note-copy">
                                {noteText && (
                                    <span className="habit-row__note-text">
                                        <FileText size={13} aria-hidden="true" />
                                        {noteText}
                                    </span>
                                )}
                                <div className="habit-row__note-actions">
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            if (!disabled) setIsEditingNote(true);
                                        }}
                                        disabled={disabled}
                                        title={disabled ? disabledReason : undefined}
                                    >
                                        {noteText ? 'Edit' : 'Add note'}
                                    </button>
                                    {onViewNotes && noteCount > 0 && (
                                        <button type="button" onClick={(event) => { event.stopPropagation(); onViewNotes(); }}>
                                            History ({noteCount})
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="habit-row__actions">
                    {habit.type === 'count' && (
                        <button type="button" className="habit-row__log-button" onClick={handleIncrement} disabled={disabled}>
                            {isCompleted ? 'Done' : '+1'}
                        </button>
                    )}
                    <button type="button" onClick={(event) => { event.stopPropagation(); onEdit?.(habit); }} aria-label={`Edit ${habit.name}`} title="Edit habit">
                        <Edit2 size={16} aria-hidden="true" />
                    </button>
                    <button type="button" onClick={(event) => { event.stopPropagation(); onDelete?.(habit.id); }} aria-label={`Delete ${habit.name}`} title="Delete habit" className="is-danger">
                        <Trash2 size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </Motion.article>
    );
};

export default HabitCard;
