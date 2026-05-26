import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Edit2, FileText, Flame, Hash, Lock, Sprout, Trash2 } from 'lucide-react';
import { SEED_HEALTH_META, SEED_STAGE_META } from '../constants/habitSeeds';

const COLOR_CONFIGS = {
    slate: {
        surface: 'from-slate-50 via-white to-slate-100',
        border: 'border-slate-200',
        iconBg: 'bg-slate-100',
        accentText: 'text-slate-700',
        softText: 'text-slate-500',
        actionBg: 'bg-slate-600 hover:bg-slate-700',
        progressBg: 'bg-slate-100',
        progressFill: 'bg-slate-600',
        dot: 'bg-slate-600',
        dotEmpty: 'bg-slate-200',
        ring: 'ring-slate-100',
    },
    rose: {
        surface: 'from-rose-50 via-white to-pink-50',
        border: 'border-rose-200',
        iconBg: 'bg-rose-100',
        accentText: 'text-rose-700',
        softText: 'text-rose-500',
        actionBg: 'bg-rose-500 hover:bg-rose-600',
        progressBg: 'bg-rose-100',
        progressFill: 'bg-rose-500',
        dot: 'bg-rose-500',
        dotEmpty: 'bg-rose-200',
        ring: 'ring-rose-100',
    },
    purple: {
        surface: 'from-purple-50 via-white to-indigo-50',
        border: 'border-purple-200',
        iconBg: 'bg-purple-100',
        accentText: 'text-purple-700',
        softText: 'text-purple-500',
        actionBg: 'bg-purple-500 hover:bg-purple-600',
        progressBg: 'bg-purple-100',
        progressFill: 'bg-purple-500',
        dot: 'bg-purple-500',
        dotEmpty: 'bg-purple-200',
        ring: 'ring-purple-100',
    },
    pink: {
        surface: 'from-pink-50 via-white to-rose-50',
        border: 'border-pink-200',
        iconBg: 'bg-pink-100',
        accentText: 'text-pink-700',
        softText: 'text-pink-500',
        actionBg: 'bg-pink-500 hover:bg-pink-600',
        progressBg: 'bg-pink-100',
        progressFill: 'bg-pink-500',
        dot: 'bg-pink-500',
        dotEmpty: 'bg-pink-200',
        ring: 'ring-pink-100',
    },
    indigo: {
        surface: 'from-indigo-50 via-white to-blue-50',
        border: 'border-indigo-200',
        iconBg: 'bg-indigo-100',
        accentText: 'text-indigo-700',
        softText: 'text-indigo-500',
        actionBg: 'bg-indigo-500 hover:bg-indigo-600',
        progressBg: 'bg-indigo-100',
        progressFill: 'bg-indigo-500',
        dot: 'bg-indigo-500',
        dotEmpty: 'bg-indigo-200',
        ring: 'ring-indigo-100',
    },
    blue: {
        surface: 'from-blue-50 via-white to-sky-50',
        border: 'border-blue-200',
        iconBg: 'bg-blue-100',
        accentText: 'text-blue-700',
        softText: 'text-blue-500',
        actionBg: 'bg-blue-500 hover:bg-blue-600',
        progressBg: 'bg-blue-100',
        progressFill: 'bg-blue-500',
        dot: 'bg-blue-500',
        dotEmpty: 'bg-blue-200',
        ring: 'ring-blue-100',
    },
    teal: {
        surface: 'from-teal-50 via-white to-cyan-50',
        border: 'border-teal-200',
        iconBg: 'bg-teal-100',
        accentText: 'text-teal-700',
        softText: 'text-teal-500',
        actionBg: 'bg-teal-500 hover:bg-teal-600',
        progressBg: 'bg-teal-100',
        progressFill: 'bg-teal-500',
        dot: 'bg-teal-500',
        dotEmpty: 'bg-teal-200',
        ring: 'ring-teal-100',
    },
    cyan: {
        surface: 'from-cyan-50 via-white to-sky-50',
        border: 'border-cyan-200',
        iconBg: 'bg-cyan-100',
        accentText: 'text-cyan-700',
        softText: 'text-cyan-500',
        actionBg: 'bg-cyan-500 hover:bg-cyan-600',
        progressBg: 'bg-cyan-100',
        progressFill: 'bg-cyan-500',
        dot: 'bg-cyan-500',
        dotEmpty: 'bg-cyan-200',
        ring: 'ring-cyan-100',
    },
    lime: {
        surface: 'from-lime-50 via-white to-emerald-50',
        border: 'border-lime-200',
        iconBg: 'bg-lime-100',
        accentText: 'text-lime-700',
        softText: 'text-lime-500',
        actionBg: 'bg-lime-500 hover:bg-lime-600',
        progressBg: 'bg-lime-100',
        progressFill: 'bg-lime-500',
        dot: 'bg-lime-500',
        dotEmpty: 'bg-lime-200',
        ring: 'ring-lime-100',
    },
    amber: {
        surface: 'from-amber-50 via-white to-orange-50',
        border: 'border-amber-200',
        iconBg: 'bg-amber-100',
        accentText: 'text-amber-700',
        softText: 'text-amber-500',
        actionBg: 'bg-amber-500 hover:bg-amber-600',
        progressBg: 'bg-amber-100',
        progressFill: 'bg-amber-500',
        dot: 'bg-amber-500',
        dotEmpty: 'bg-amber-200',
        ring: 'ring-amber-100',
    },
    emerald: {
        surface: 'from-emerald-50 via-white to-green-50',
        border: 'border-emerald-200',
        iconBg: 'bg-emerald-100',
        accentText: 'text-emerald-700',
        softText: 'text-emerald-500',
        actionBg: 'bg-emerald-500 hover:bg-emerald-600',
        progressBg: 'bg-emerald-100',
        progressFill: 'bg-emerald-500',
        dot: 'bg-emerald-500',
        dotEmpty: 'bg-emerald-200',
        ring: 'ring-emerald-100',
    },
};

const INDEX_COLORS = ['slate', 'rose', 'purple', 'pink', 'indigo', 'blue', 'teal', 'cyan', 'lime', 'amber'];

const inkBorder = 'border-2 border-slate-800 dark:border-bone-200/70';
const popMotion = 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]';

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

const HabitCard = ({ habit, log, onLog, onSaveNote, noteCount = 0, onViewNotes, onEdit, onDelete, streak, seedInsight, compact = false, index = 0, disabled = false, disabledReason = '' }) => {
    const [justCompleted, setJustCompleted] = useState(false);
    const [localDuration, setLocalDuration] = useState(null);
    const [isEditingNote, setIsEditingNote] = useState(false);
    const [noteDraft, setNoteDraft] = useState(log?.notes || '');

    const colorKey = habit.color || INDEX_COLORS[index % INDEX_COLORS.length];
    const color = COLOR_CONFIGS[colorKey] || COLOR_CONFIGS.teal;

    const actualValue = log?.value || 0;
    const currentValue = localDuration !== null ? localDuration : actualValue;
    const isCompleted = log?.completed || false;
    const noteText = log?.notes || '';
    const progress = habit.type === 'check'
        ? (isCompleted ? 100 : 0)
        : Math.min((currentValue / habit.target) * 100, 100);

    const currentStreak = streak?.current || 0;
    const seedStageMeta = habit.is_seed
        ? (SEED_STAGE_META[seedInsight?.stage || 'seed'] || SEED_STAGE_META.seed)
        : null;
    const seedHealthMeta = habit.is_seed
        ? (SEED_HEALTH_META[seedInsight?.health || 'healthy'] || SEED_HEALTH_META.healthy)
        : null;
    const seedEnded = Boolean(seedInsight?.ended);

    const pulseCompletion = () => {
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 1000);
    };

    useEffect(() => {
        setNoteDraft(log?.notes || '');
    }, [log?.notes]);

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
        event.stopPropagation();
        if (disabled) return;

        if (localDuration === null) return;

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
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleIncrement}
                disabled={disabled}
                className={`h-10 w-10 rounded-2xl border-2 border-slate-800 shadow-[3px_3px_0_#1E293B] transition-all disabled:cursor-not-allowed disabled:opacity-50 ${isCompleted
                    ? `${color.actionBg} text-white`
                    : 'bg-white text-slate-500'
                    }`}
            >
                {isCompleted ? <Check size={16} className="mx-auto" strokeWidth={3} /> : <span className="text-xs">+</span>}
            </motion.button>
        );
    }

    return (
        <motion.article
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className={`group relative overflow-hidden rounded-[24px] bg-gradient-to-br ${color.surface} shadow-[6px_6px_0_#E2E8F0] ${inkBorder}`}
        >
            <div className={`absolute inset-x-0 top-0 h-2 bg-gradient-to-r ${habit.is_seed ? seedStageMeta?.accent || 'from-emerald-300 to-teal-300' : 'from-violet-300 via-rose-300 to-amber-300'}`} />
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/55" />
            <div className="pointer-events-none absolute bottom-5 right-10 hidden h-6 w-10 rounded-full bg-amber-300/70 sm:block" />

            <AnimatePresence>
                {justCompleted && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-emerald-200/25"
                    />
                )}
            </AnimatePresence>

            <div className="relative z-10 p-4">
                <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border-2 border-slate-800 ${color.iconBg} text-xl shadow-[3px_3px_0_#1E293B]`}>
                        {habit.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className={`truncate text-base font-black text-slate-900 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                                        {habit.name}
                                    </h3>
                                    {habit.is_seed && seedStageMeta && (
                                        <span className="inline-flex items-center gap-1 rounded-full border-2 border-slate-800 bg-emerald-200 px-2.5 py-1 text-[11px] font-black text-emerald-950">
                                            <Sprout size={12} />
                                            {seedStageMeta.label}
                                        </span>
                                    )}
                                    {habit.is_seed && seedHealthMeta && (
                                        <span className={`rounded-full border-2 px-2.5 py-1 text-[11px] font-black ${seedHealthMeta.badge}`}>
                                            {seedHealthMeta.label}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                                    <span>{getFrequencyLabel(habit)}</span>
                                    {habit.reminder_time && (
                                        <span className={color.softText}>{formatTime12h(habit.reminder_time)}</span>
                                    )}
                                    {currentStreak > 0 && (
                                        <span className="inline-flex items-center gap-1 font-medium text-orange-500">
                                            <Flame size={14} strokeWidth={2.7} />
                                            {currentStreak} day streak
                                        </span>
                                    )}
                                    {disabled && (
                                        <span className="inline-flex items-center gap-1 font-medium text-slate-400" title={disabledReason}>
                                            <Lock size={13} strokeWidth={2.7} />
                                            {seedEnded ? 'Seed ended' : 'Read-only'}
                                        </span>
                                    )}
                                    {habit.is_seed && seedInsight && (
                                        <span className={`font-medium ${seedEnded ? 'text-zinc-600' : 'text-emerald-700'}`}>
                                            {seedEnded ? 'Replant needed' : `Step ${seedInsight.elapsedDays} of ${seedInsight.durationDays}`}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {habit.type === 'check' && (
                                    <motion.button
                                        whileTap={{ scale: 0.92 }}
                                        onClick={handleIncrement}
                                        disabled={disabled}
                                        title={disabled ? disabledReason : undefined}
                                        className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-all disabled:cursor-not-allowed disabled:opacity-55 ${isCompleted
                                            ? 'border-slate-800 bg-emerald-300 text-slate-950 shadow-[3px_3px_0_#1E293B]'
                                            : 'border-slate-800 bg-white text-slate-500 hover:bg-emerald-100 hover:text-emerald-700'
                                            }`}
                                    >
                                        <Check size={18} strokeWidth={3} />
                                    </motion.button>
                                )}

                                {habit.type === 'count' && (
                                    <motion.button
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleIncrement}
                                        disabled={disabled}
                                        title={disabled ? disabledReason : undefined}
                                        className={`rounded-full border-2 border-slate-800 px-3.5 py-2.5 text-sm font-black text-white shadow-[3px_3px_0_#1E293B] disabled:cursor-not-allowed disabled:opacity-55 ${color.actionBg}`}
                                    >
                                        Log Progress
                                    </motion.button>
                                )}

                                {habit.type === 'duration' && (
                                    <div className="w-32 rounded-xl border-2 border-slate-800 bg-white p-2.5">
                                        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                                            <span>Minutes</span>
                                            <span>{currentValue}/{habit.target}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max={habit.target}
                                            value={currentValue}
                                            onChange={handleDurationChange}
                                            onMouseUp={handleDurationCommit}
                                            onTouchEnd={handleDurationCommit}
                                            disabled={disabled}
                                            title={disabled ? disabledReason : undefined}
                                            className="w-full cursor-pointer appearance-none bg-transparent disabled:cursor-not-allowed disabled:opacity-55"
                                            style={{ accentColor: '#14B8A6' }}
                                            onClick={(event) => event.stopPropagation()}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {!habit.is_seed && (
                            <div className="mt-3 rounded-[18px] border-2 border-slate-800 bg-white/80 p-3">
                                {habit.type === 'check' && (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-black text-slate-800">Daily check-in</div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {isCompleted ? 'Completed for this day.' : 'Tap the check button when done.'}
                                            </div>
                                        </div>
                                        <div className={`rounded-full border-2 border-slate-800 px-3 py-1 text-xs font-black ${isCompleted ? 'bg-emerald-200 text-emerald-950' : 'bg-slate-100 text-slate-600'}`}>
                                            {isCompleted ? 'Done' : 'Pending'}
                                        </div>
                                    </div>
                                )}

                                {habit.type === 'count' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-black text-slate-800">Count progress</div>
                                            <div className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                                                <Hash size={14} />
                                                {currentValue}/{habit.target}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from({ length: Math.min(habit.target, 12) }).map((_, dotIndex) => (
                                                <div
                                                    key={dotIndex}
                                                    className={`h-4 w-4 rounded-full border-2 border-slate-800 transition-all ${dotIndex < currentValue ? color.dot : color.dotEmpty}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {habit.type === 'duration' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                    <div className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
                                                <Clock size={15} strokeWidth={2.7} />
                                                Focus duration
                                            </div>
                                            <div className="text-sm font-semibold text-slate-700">{currentValue}/{habit.target} min</div>
                                        </div>
                                        <div className={`h-3 overflow-hidden rounded-full border-2 border-slate-800 ${color.progressBg}`}>
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progress}%` }}
                                                transition={{ duration: 0.6, ease: 'easeOut' }}
                                                className={`h-full rounded-full ${color.progressFill}`}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="mt-3 rounded-[18px] border-2 border-slate-800 bg-white/80 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <div className="inline-flex items-center gap-2 text-sm font-black text-slate-700">
                                    <FileText size={14} strokeWidth={2.7} />
                                    Notes
                                </div>
                                {!isEditingNote && (
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            if (disabled) return;
                                            setIsEditingNote(true);
                                        }}
                                        disabled={disabled}
                                        title={disabled ? disabledReason : undefined}
                                        className="rounded-full border-2 border-slate-800 bg-slate-50 px-2.5 py-1 text-xs font-black text-slate-600 transition-colors hover:bg-amber-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {noteText ? 'Edit' : 'Add note'}
                                    </button>
                                )}
                            </div>

                            {isEditingNote ? (
                                <div className="mt-3 space-y-2">
                                    <textarea
                                        value={noteDraft}
                                        onChange={(event) => setNoteDraft(event.target.value)}
                                        onClick={(event) => event.stopPropagation()}
                                        disabled={disabled}
                                        rows={2}
                                        placeholder={habit.type === 'duration'
                                            ? 'e.g. Woke up at 6:20 AM'
                                            : 'e.g. Walking, running 2 km, weight training'}
                                        className="w-full rounded-xl border-2 border-slate-800 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setNoteDraft(noteText);
                                                setIsEditingNote(false);
                                            }}
                                            className="rounded-full border-2 border-slate-800 bg-white px-3 py-1.5 text-xs font-black text-slate-600 transition-colors hover:bg-slate-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                handleSaveNote();
                                            }}
                                            disabled={disabled}
                                            className="rounded-full border-2 border-slate-800 bg-violet-500 px-3 py-1.5 text-xs font-black text-white shadow-[2px_2px_0_#1E293B] transition-colors hover:bg-violet-600 disabled:cursor-not-allowed disabled:opacity-50"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-2 space-y-2">
                                    <div className="text-sm font-medium text-slate-500">
                                        {noteText || 'No note for this day.'}
                                    </div>
                                    {onViewNotes && (
                                        <button
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onViewNotes();
                                            }}
                                            className="text-xs font-black text-slate-500 transition-colors hover:text-slate-800"
                                        >
                                            {noteCount > 0 ? `View note history (${noteCount})` : 'Open note history'}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mt-3 flex items-center justify-end gap-2 border-t-2 border-dashed border-slate-800/25 pt-3">
                            <button
                                onClick={(event) => { event.stopPropagation(); onEdit?.(habit); }}
                                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-800 bg-white text-slate-500 shadow-[2px_2px_0_#1E293B] transition-colors hover:bg-amber-100 hover:text-slate-900"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={(event) => { event.stopPropagation(); onDelete?.(habit.id); }}
                                className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-800 bg-white text-slate-500 shadow-[2px_2px_0_#1E293B] transition-colors hover:bg-rose-100 hover:text-red-500"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </motion.article>
    );
};

export default HabitCard;
