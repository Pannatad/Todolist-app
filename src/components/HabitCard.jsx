import React from 'react';
import { motion } from 'framer-motion';
import { Check, Minus, Plus, Clock, Trash2, Edit2, Sunrise, Sun, Sunset, Moon } from 'lucide-react';

// Gradient configurations for different colors
const COLOR_CONFIGS = {
    purple: {
        gradient: 'from-purple-400/30 via-purple-200/20 to-transparent',
        border: 'border-purple-200',
        icon: 'from-purple-400 to-indigo-500',
        button: 'from-purple-500 to-indigo-600',
        text: 'text-purple-600',
    },
    pink: {
        gradient: 'from-pink-400/30 via-pink-200/20 to-transparent',
        border: 'border-pink-200',
        icon: 'from-pink-400 to-rose-500',
        button: 'from-pink-500 to-rose-600',
        text: 'text-pink-600',
    },
    teal: {
        gradient: 'from-teal-400/30 via-teal-200/20 to-transparent',
        border: 'border-teal-200',
        icon: 'from-teal-400 to-cyan-500',
        button: 'from-teal-500 to-cyan-600',
        text: 'text-teal-600',
    },
    amber: {
        gradient: 'from-amber-400/30 via-amber-200/20 to-transparent',
        border: 'border-amber-200',
        icon: 'from-amber-400 to-orange-500',
        button: 'from-amber-500 to-orange-600',
        text: 'text-amber-600',
    },
    emerald: {
        gradient: 'from-emerald-400/30 via-emerald-200/20 to-transparent',
        border: 'border-emerald-200',
        icon: 'from-emerald-400 to-green-500',
        button: 'from-emerald-500 to-green-600',
        text: 'text-emerald-600',
    },
};

// Assign colors based on index for variety
const INDEX_COLORS = ['purple', 'teal', 'pink', 'emerald', 'amber'];

const TIME_OF_DAY_CONFIG = {
    morning: { label: 'Morning', icon: Sunrise, bgColor: 'bg-amber-100', textColor: 'text-amber-600' },
    afternoon: { label: 'Afternoon', icon: Sun, bgColor: 'bg-yellow-100', textColor: 'text-yellow-600' },
    evening: { label: 'Evening', icon: Sunset, bgColor: 'bg-orange-100', textColor: 'text-orange-600' },
    night: { label: 'Night', icon: Moon, bgColor: 'bg-indigo-100', textColor: 'text-indigo-600' },
    anytime: { label: 'Anytime', icon: Clock, bgColor: 'bg-gray-100', textColor: 'text-gray-500' },
};

const HabitCard = ({ habit, log, onLog, onEdit, onDelete, compact = false, index = 0 }) => {
    // Use habit color or assign based on index for variety
    const colorKey = habit.color || INDEX_COLORS[index % INDEX_COLORS.length];
    const colorConfig = COLOR_CONFIGS[colorKey] || COLOR_CONFIGS.purple;

    const currentValue = log?.value || 0;
    const isCompleted = log?.completed || false;
    const progress = habit.type === 'check'
        ? (isCompleted ? 100 : 0)
        : Math.min((currentValue / habit.target) * 100, 100);

    const timeConfig = TIME_OF_DAY_CONFIG[habit.time_of_day] || TIME_OF_DAY_CONFIG.anytime;
    const TimeIcon = timeConfig.icon;

    const handleIncrement = (e) => {
        e.stopPropagation();
        if (habit.type === 'check') {
            onLog(habit.id, isCompleted ? 0 : 1, !isCompleted);
        } else {
            const newValue = Math.min(currentValue + 1, habit.target);
            onLog(habit.id, newValue, newValue >= habit.target);
        }
    };

    const handleDecrement = (e) => {
        e.stopPropagation();
        if (habit.type !== 'check' && currentValue > 0) {
            const newValue = currentValue - 1;
            onLog(habit.id, newValue, newValue >= habit.target);
        }
    };

    const getProgressLabel = () => {
        if (habit.type === 'check') {
            return isCompleted ? 'Completed!' : 'Tap to complete';
        }
        if (habit.type === 'duration') {
            return `${currentValue}/${habit.target} min`;
        }
        return `${currentValue}/${habit.target}`;
    };

    if (compact) {
        // Compact version for weekly grid
        return (
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleIncrement}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border-2 ${isCompleted
                        ? `bg-gradient-to-br ${colorConfig.button} border-transparent shadow-lg`
                        : `bg-white/50 ${colorConfig.border} hover:bg-white/80`
                    }`}
            >
                {isCompleted && <Check size={16} className="text-white" strokeWidth={3} />}
            </motion.button>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative rounded-2xl overflow-hidden transition-all group border ${colorConfig.border} bg-white shadow-sm hover:shadow-md ${isCompleted ? 'ring-2 ring-green-400/50' : ''
                }`}
        >
            {/* Left Gradient Background */}
            <div className={`absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r ${colorConfig.gradient}`} />

            {/* Content */}
            <div className="relative p-4 flex items-center gap-4">
                {/* Icon with gradient background */}
                <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${colorConfig.icon} flex items-center justify-center text-2xl shadow-md`}>
                    <span className="drop-shadow-sm">{habit.icon}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <h3 className={`font-bold text-gray-800 truncate ${isCompleted ? 'line-through opacity-60' : ''}`}>
                            {habit.name}
                        </h3>
                        {/* Time of Day Badge */}
                        {habit.time_of_day && habit.time_of_day !== 'anytime' && (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${timeConfig.bgColor} ${timeConfig.textColor}`}>
                                <TimeIcon size={10} />
                                {timeConfig.label}
                            </span>
                        )}
                    </div>
                    <p className={`text-sm ${colorConfig.text} flex items-center gap-1`}>
                        {habit.type === 'duration' && <Clock size={12} />}
                        {getProgressLabel()}
                    </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                    {habit.type !== 'check' && (
                        <>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleDecrement}
                                className={`w-9 h-9 rounded-full bg-gradient-to-br ${colorConfig.button} flex items-center justify-center text-white shadow-md hover:shadow-lg transition-all ${currentValue === 0 ? 'opacity-50' : ''}`}
                                disabled={currentValue === 0}
                            >
                                <Minus size={18} strokeWidth={3} />
                            </motion.button>
                            <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={handleIncrement}
                                className={`w-9 h-9 rounded-full flex items-center justify-center text-white shadow-md hover:shadow-lg transition-all ${isCompleted
                                        ? 'bg-gradient-to-br from-green-400 to-emerald-500'
                                        : `bg-gradient-to-br ${colorConfig.button}`
                                    }`}
                            >
                                <Plus size={18} strokeWidth={3} />
                            </motion.button>
                        </>
                    )}

                    {habit.type === 'check' && (
                        <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={handleIncrement}
                            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg ${isCompleted
                                    ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white'
                                    : `bg-gradient-to-br ${colorConfig.button} text-white`
                                }`}
                        >
                            <Check size={22} strokeWidth={3} />
                        </motion.button>
                    )}

                    {/* Edit/Delete buttons - show on hover */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit && onEdit(habit);
                            }}
                            className="p-1.5 rounded-lg bg-white/80 hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors shadow-sm"
                        >
                            <Edit2 size={12} />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete && onDelete(habit.id);
                            }}
                            className="p-1.5 rounded-lg bg-white/80 hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors shadow-sm"
                        >
                            <Trash2 size={12} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Bottom Progress Bar */}
            <div className="h-1 bg-gray-100">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className={`h-full bg-gradient-to-r ${colorConfig.button}`}
                />
            </div>
        </motion.div>
    );
};

export default HabitCard;
