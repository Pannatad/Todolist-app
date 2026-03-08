import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Minus, Plus, Clock, Trash2, Edit2, Sunrise, Sun, Sunset, Moon, Flame } from 'lucide-react';

// Color configurations for accent colors
const COLOR_CONFIGS = {
    purple: {
        accent: '#8B5CF6',
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        text: 'text-purple-700',
        lightText: 'text-purple-500',
        check: 'bg-purple-500',
        checkHover: 'hover:bg-purple-600',
        progressBg: 'bg-purple-100',
        progressFill: 'bg-purple-500',
        dot: 'bg-purple-500',
        dotEmpty: 'bg-purple-200',
        logBtn: 'bg-purple-500 hover:bg-purple-600',
    },
    pink: {
        accent: '#EC4899',
        bg: 'bg-pink-50',
        border: 'border-pink-200',
        text: 'text-pink-700',
        lightText: 'text-pink-500',
        check: 'bg-pink-500',
        checkHover: 'hover:bg-pink-600',
        progressBg: 'bg-pink-100',
        progressFill: 'bg-pink-500',
        dot: 'bg-pink-500',
        dotEmpty: 'bg-pink-200',
        logBtn: 'bg-pink-500 hover:bg-pink-600',
    },
    teal: {
        accent: '#14B8A6',
        bg: 'bg-teal-50',
        border: 'border-teal-200',
        text: 'text-teal-700',
        lightText: 'text-teal-500',
        check: 'bg-teal-500',
        checkHover: 'hover:bg-teal-600',
        progressBg: 'bg-teal-100',
        progressFill: 'bg-teal-500',
        dot: 'bg-teal-500',
        dotEmpty: 'bg-teal-200',
        logBtn: 'bg-teal-500 hover:bg-teal-600',
    },
    amber: {
        accent: '#F59E0B',
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        text: 'text-amber-700',
        lightText: 'text-amber-500',
        check: 'bg-amber-500',
        checkHover: 'hover:bg-amber-600',
        progressBg: 'bg-amber-100',
        progressFill: 'bg-amber-500',
        dot: 'bg-amber-500',
        dotEmpty: 'bg-amber-200',
        logBtn: 'bg-amber-500 hover:bg-amber-600',
    },
    emerald: {
        accent: '#10B981',
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        text: 'text-emerald-700',
        lightText: 'text-emerald-500',
        check: 'bg-emerald-500',
        checkHover: 'hover:bg-emerald-600',
        progressBg: 'bg-emerald-100',
        progressFill: 'bg-emerald-500',
        dot: 'bg-emerald-500',
        dotEmpty: 'bg-emerald-200',
        logBtn: 'bg-emerald-500 hover:bg-emerald-600',
    },
};

const INDEX_COLORS = ['teal', 'purple', 'pink', 'emerald', 'amber'];

const TIME_OF_DAY_CONFIG = {
    morning: { label: 'Morning', icon: Sunrise },
    afternoon: { label: 'Afternoon', icon: Sun },
    evening: { label: 'Evening', icon: Sunset },
    night: { label: 'Night', icon: Moon },
    anytime: { label: 'Anytime', icon: Clock },
};

const formatTime12h = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
};

const getFrequencyLabel = (habit) => {
    if (habit.frequency === 'daily') return 'Daily';
    if (habit.schedule_days && habit.schedule_days.length > 0) {
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return habit.schedule_days.map(d => dayNames[d]).join(', ');
    }
    return 'Custom';
};

const HabitCard = ({ habit, log, onLog, onEdit, onDelete, streak, compact = false, index = 0 }) => {
    const [showActions, setShowActions] = useState(false);
    const [justCompleted, setJustCompleted] = useState(false);

    const colorKey = habit.color || INDEX_COLORS[index % INDEX_COLORS.length];
    const cc = COLOR_CONFIGS[colorKey] || COLOR_CONFIGS.teal;

    const currentValue = log?.value || 0;
    const isCompleted = log?.completed || false;
    const progress = habit.type === 'check'
        ? (isCompleted ? 100 : 0)
        : Math.min((currentValue / habit.target) * 100, 100);

    const currentStreak = streak?.current || 0;

    const handleIncrement = (e) => {
        e?.stopPropagation();
        if (habit.type === 'check') {
            if (!isCompleted) {
                setJustCompleted(true);
                setTimeout(() => setJustCompleted(false), 1000);
            }
            onLog(habit.id, isCompleted ? 0 : 1, !isCompleted);
        } else {
            const newValue = Math.min(currentValue + 1, habit.target);
            if (newValue >= habit.target && !isCompleted) {
                setJustCompleted(true);
                setTimeout(() => setJustCompleted(false), 1000);
            }
            onLog(habit.id, newValue, newValue >= habit.target);
        }
    };

    const handleDecrement = (e) => {
        e?.stopPropagation();
        if (habit.type !== 'check' && currentValue > 0) {
            const newValue = currentValue - 1;
            onLog(habit.id, newValue, newValue >= habit.target);
        }
    };

    if (compact) {
        // Compact version for weekly grid
        return (
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleIncrement}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border-2 ${isCompleted
                    ? `${cc.check} border-transparent shadow-lg`
                    : `bg-white ${cc.border} hover:bg-gray-50`
                    }`}
            >
                {isCompleted && <Check size={16} className="text-white" strokeWidth={3} />}
            </motion.button>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onHoverStart={() => setShowActions(true)}
            onHoverEnd={() => setShowActions(false)}
            className={`relative bg-white rounded-2xl border ${isCompleted ? 'border-green-200' : cc.border} shadow-sm hover:shadow-md transition-all group overflow-hidden`}
        >
            {/* Completion glow animation */}
            <AnimatePresence>
                {justCompleted && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-green-100/50 z-0 rounded-2xl"
                    />
                )}
            </AnimatePresence>

            <div className="relative z-10 p-4">
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-2xl ${cc.bg} flex items-center justify-center text-2xl flex-shrink-0`}>
                        {habit.icon}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        {/* Title Row */}
                        <div className="flex items-center gap-2">
                            <h3 className={`font-bold text-gray-800 uppercase tracking-wide text-sm ${isCompleted ? 'line-through text-gray-400' : ''}`}>
                                {habit.name}
                            </h3>
                        </div>

                        {/* Subtitle: frequency, streak, time */}
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1 text-xs text-gray-500">
                            <span>{getFrequencyLabel(habit)}</span>
                            {habit.reminder_time && (
                                <>
                                    <span className="text-gray-300">•</span>
                                    <span className={cc.lightText}>{formatTime12h(habit.reminder_time)}</span>
                                </>
                            )}
                            {currentStreak > 0 && (
                                <>
                                    <span className="text-gray-300">•</span>
                                    <span className="flex items-center gap-0.5 text-orange-500 font-medium">
                                        {currentStreak} days streak
                                        <Flame size={11} className="text-orange-400" />
                                    </span>
                                </>
                            )}
                        </div>

                        {/* Progress Info */}
                        <div className="mt-2">
                            {habit.type === 'check' && (
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-gray-500">Progress:</span>
                                    {isCompleted ? (
                                        <span className="text-xs font-semibold text-green-600 flex items-center gap-1">
                                            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                                            Completed
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">○ Mark Complete</span>
                                    )}
                                </div>
                            )}

                            {habit.type === 'count' && (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        {/* Visual dots */}
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(habit.target, 10) }).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-4 h-4 rounded-sm transition-all ${i < currentValue ? cc.dot : cc.dotEmpty}`}
                                                />
                                            ))}
                                        </div>
                                        {habit.target > 10 && (
                                            <span className="text-xs text-gray-400">
                                                {currentValue}/{habit.target}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {habit.type === 'count' ? `${currentValue}/${habit.target} done` : ''}
                                    </div>
                                </div>
                            )}

                            {habit.type === 'duration' && (
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Clock size={11} />
                                        <span>{currentValue}/{habit.target} min</span>
                                    </div>
                                    <div className={`h-1.5 rounded-full ${cc.progressBg}`}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                            className={`h-full rounded-full ${cc.progressFill}`}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Action Area — Right Side */}
                    <div className="flex-shrink-0 flex items-center gap-2 self-center">
                        {habit.type === 'check' && (
                            <motion.button
                                whileTap={{ scale: 0.85 }}
                                onClick={handleIncrement}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border-2 ${isCompleted
                                    ? 'bg-teal-500 border-teal-500 text-white shadow-md'
                                    : `bg-white ${cc.border} text-gray-300 hover:border-teal-400 hover:text-teal-400`
                                    }`}
                            >
                                <Check size={20} strokeWidth={3} />
                            </motion.button>
                        )}

                        {habit.type === 'count' && (
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleIncrement}
                                className={`px-4 py-2 rounded-xl text-white text-sm font-bold shadow-sm transition-all ${cc.logBtn}`}
                            >
                                Log
                            </motion.button>
                        )}

                        {habit.type === 'duration' && (
                            <div className="flex items-center gap-1">
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleDecrement}
                                    disabled={currentValue === 0}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${currentValue === 0 ? 'bg-gray-100 text-gray-300' : `${cc.bg} ${cc.text}`}`}
                                >
                                    <Minus size={14} strokeWidth={3} />
                                </motion.button>
                                <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    onClick={handleIncrement}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${cc.logBtn}`}
                                >
                                    <Plus size={14} strokeWidth={3} />
                                </motion.button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit/Delete overlay */}
            <AnimatePresence>
                {showActions && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-2 right-2 flex gap-1 z-20"
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); onEdit?.(habit); }}
                            className="p-1.5 rounded-lg bg-white/90 hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shadow-sm border border-gray-100"
                        >
                            <Edit2 size={12} />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete?.(habit.id); }}
                            className="p-1.5 rounded-lg bg-white/90 hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors shadow-sm border border-gray-100"
                        >
                            <Trash2 size={12} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default HabitCard;
