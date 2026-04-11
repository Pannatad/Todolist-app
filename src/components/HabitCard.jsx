import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Clock, Edit2, Flame, Hash, Sprout, Trash2 } from 'lucide-react';
import SeedVisualization from './SeedVisualization';
import { SEED_HEALTH_META, SEED_STAGE_META } from '../constants/habitSeeds';

const COLOR_CONFIGS = {
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

const INDEX_COLORS = ['teal', 'purple', 'pink', 'emerald', 'amber'];

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

const HabitCard = ({ habit, log, onLog, onEdit, onDelete, streak, seedInsight, compact = false, index = 0 }) => {
    const [showActions, setShowActions] = useState(false);
    const [justCompleted, setJustCompleted] = useState(false);
    const [localDuration, setLocalDuration] = useState(null);

    const colorKey = habit.color || INDEX_COLORS[index % INDEX_COLORS.length];
    const color = COLOR_CONFIGS[colorKey] || COLOR_CONFIGS.teal;

    const actualValue = log?.value || 0;
    const currentValue = localDuration !== null ? localDuration : actualValue;
    const isCompleted = log?.completed || false;
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

    const pulseCompletion = () => {
        setJustCompleted(true);
        setTimeout(() => setJustCompleted(false), 1000);
    };

    const handleIncrement = (event) => {
        event?.stopPropagation();
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
        setLocalDuration(parseInt(event.target.value, 10));
    };

    const handleDurationCommit = (event) => {
        event.stopPropagation();
        if (localDuration === null) return;

        if (localDuration >= habit.target && actualValue < habit.target) pulseCompletion();
        onLog(habit.id, localDuration, localDuration >= habit.target);
        setLocalDuration(null);
    };

    if (compact) {
        return (
            <motion.button
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.94 }}
                onClick={handleIncrement}
                className={`h-10 w-10 rounded-2xl border shadow-sm transition-all ${isCompleted
                    ? `${color.actionBg} border-transparent text-white`
                    : `bg-white ${color.border} text-slate-400`
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
            onHoverStart={() => setShowActions(true)}
            onHoverEnd={() => setShowActions(false)}
            className={`group relative overflow-hidden rounded-[32px] border ${color.border} bg-gradient-to-br ${color.surface} shadow-[0_20px_45px_rgba(15,23,42,0.06)]`}
        >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${habit.is_seed ? seedStageMeta?.accent || 'from-emerald-300 to-teal-300' : 'from-white via-white to-white'}`} />
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-white/40 blur-3xl" />

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

            <div className="relative z-10 p-5">
                <div className="flex items-start gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[22px] ${color.iconBg} ring-8 ${color.ring} text-2xl shadow-sm`}>
                        {habit.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className={`truncate text-lg font-semibold text-slate-800 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                                        {habit.name}
                                    </h3>
                                    {habit.is_seed && seedStageMeta && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                                            <Sprout size={12} />
                                            {seedStageMeta.label}
                                        </span>
                                    )}
                                    {habit.is_seed && seedHealthMeta && (
                                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${seedHealthMeta.badge}`}>
                                            {seedHealthMeta.label}
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                                    <span>{getFrequencyLabel(habit)}</span>
                                    {habit.reminder_time && (
                                        <span className={color.softText}>{formatTime12h(habit.reminder_time)}</span>
                                    )}
                                    {currentStreak > 0 && (
                                        <span className="inline-flex items-center gap-1 font-medium text-orange-500">
                                            <Flame size={14} />
                                            {currentStreak} day streak
                                        </span>
                                    )}
                                    {habit.is_seed && seedInsight && (
                                        <span className="font-medium text-emerald-700">
                                            Day {seedInsight.elapsedDays} of {seedInsight.durationDays}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex shrink-0 items-center gap-2">
                                {habit.type === 'check' && (
                                    <motion.button
                                        whileTap={{ scale: 0.92 }}
                                        onClick={handleIncrement}
                                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${isCompleted
                                            ? 'border-transparent bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                            : 'border-white/60 bg-white/75 text-slate-400 hover:border-emerald-300 hover:text-emerald-500'
                                            }`}
                                    >
                                        <Check size={20} strokeWidth={3} />
                                    </motion.button>
                                )}

                                {habit.type === 'count' && (
                                    <motion.button
                                        whileTap={{ scale: 0.96 }}
                                        onClick={handleIncrement}
                                        className={`rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/5 ${color.actionBg}`}
                                    >
                                        Log Progress
                                    </motion.button>
                                )}

                                {habit.type === 'duration' && (
                                    <div className="w-36 rounded-2xl border border-white/60 bg-white/70 p-3">
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
                                            className="w-full cursor-pointer appearance-none bg-transparent"
                                            style={{ accentColor: '#14B8A6' }}
                                            onClick={(event) => event.stopPropagation()}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {!habit.is_seed && (
                            <div className="mt-4 rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-sm">
                                {habit.type === 'check' && (
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium text-slate-700">Daily check-in</div>
                                            <div className="mt-1 text-xs text-slate-500">
                                                {isCompleted ? 'Completed for this day.' : 'Tap the check button when done.'}
                                            </div>
                                        </div>
                                        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                            {isCompleted ? 'Done' : 'Pending'}
                                        </div>
                                    </div>
                                )}

                                {habit.type === 'count' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="text-sm font-medium text-slate-700">Count progress</div>
                                            <div className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700">
                                                <Hash size={14} />
                                                {currentValue}/{habit.target}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {Array.from({ length: Math.min(habit.target, 12) }).map((_, dotIndex) => (
                                                <div
                                                    key={dotIndex}
                                                    className={`h-4 w-4 rounded-full transition-all ${dotIndex < currentValue ? color.dot : color.dotEmpty}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {habit.type === 'duration' && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                                                <Clock size={15} />
                                                Focus duration
                                            </div>
                                            <div className="text-sm font-semibold text-slate-700">{currentValue}/{habit.target} min</div>
                                        </div>
                                        <div className={`h-2.5 overflow-hidden rounded-full ${color.progressBg}`}>
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

                        {habit.is_seed && seedInsight && (
                            <div className="mt-4">
                                <SeedVisualization
                                    insight={seedInsight}
                                    title={habit.seed_why || 'A tiny ritual worth protecting.'}
                                    subtitle={seedHealthMeta?.description}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {showActions && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        className="absolute right-4 top-4 z-20 flex gap-2"
                    >
                        <button
                            onClick={(event) => { event.stopPropagation(); onEdit?.(habit); }}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/90 text-slate-500 shadow-sm transition-colors hover:text-slate-800"
                        >
                            <Edit2 size={14} />
                        </button>
                        <button
                            onClick={(event) => { event.stopPropagation(); onDelete?.(habit.id); }}
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/90 text-slate-500 shadow-sm transition-colors hover:text-red-500"
                        >
                            <Trash2 size={14} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.article>
    );
};

export default HabitCard;
