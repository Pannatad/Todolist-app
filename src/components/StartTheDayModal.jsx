import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Sun, Moon, Cloud, Sparkles, ChevronRight, ChevronLeft,
    CheckCircle2, Circle, Calendar, Target, Zap, Clock,
    Plus, Mic, Brain, Quote, Rocket, X
} from 'lucide-react';
import { parseScheduleCommand } from '../services/gemini';
import ScheduleEventModal from './ScheduleEventModal';

// Helper function to check if a recurring event occurs on a specific date
const doesRecurringEventOccurOnDate = (event, targetDate) => {
    const eventDate = new Date(event.startTime || event.start_time);
    const target = new Date(targetDate);

    // Reset to start of day for comparison
    eventDate.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    const recurrenceType = event.recurrence_type || event.recurrenceType || 'none';
    if (recurrenceType === 'none') return false;

    // Check if target is before event start
    if (target < eventDate) return false;

    // Check recurrence end date
    const endDate = event.recurrence_end_date || event.recurrenceEndDate;
    if (endDate && target > new Date(endDate)) return false;

    const interval = event.recurrence_interval || event.recurrenceInterval || 1;
    const daysDiff = Math.floor((target - eventDate) / (1000 * 60 * 60 * 24));

    switch (recurrenceType) {
        case 'daily':
            return daysDiff % interval === 0;
        case 'weekly': {
            const daysOfWeek = event.recurrence_days_of_week || event.recurrenceDaysOfWeek || [];
            const targetDayOfWeek = target.getDay();
            // If specific days are set, check them
            if (daysOfWeek.length > 0) {
                return daysOfWeek.includes(targetDayOfWeek);
            }
            // Otherwise, check if it's on the same day of week as original
            return daysDiff % (7 * interval) === 0;
        }
        case 'monthly': {
            const monthsDiff = (target.getFullYear() - eventDate.getFullYear()) * 12 +
                (target.getMonth() - eventDate.getMonth());
            return monthsDiff % interval === 0 && target.getDate() === eventDate.getDate();
        }
        case 'yearly': {
            const yearsDiff = target.getFullYear() - eventDate.getFullYear();
            return yearsDiff % interval === 0 &&
                target.getMonth() === eventDate.getMonth() &&
                target.getDate() === eventDate.getDate();
        }
        default:
            return false;
    }
};



const SLEEP_OPTIONS = [
    { emoji: '😴', label: 'Poor', value: 1, color: 'from-red-500 to-orange-500' },
    { emoji: '😔', label: 'Fair', value: 2, color: 'from-orange-400 to-yellow-400' },
    { emoji: '😊', label: 'Good', value: 3, color: 'from-yellow-400 to-green-400' },
    { emoji: '😄', label: 'Great', value: 4, color: 'from-green-400 to-emerald-400' },
    { emoji: '🌟', label: 'Excellent', value: 5, color: 'from-emerald-400 to-cyan-400' },
];

const StartTheDayModal = ({
    isOpen,
    onClose,
    tasks = [],
    goals = [],
    dailyHighlights = {},
    scheduleItems = [],
    onAddScheduleItem
}) => {
    const [currentPhase, setCurrentPhase] = useState(1);
    const [sleepQuality, setSleepQuality] = useState(null);
    const [morningThoughts, setMorningThoughts] = useState('');

    const [isListening, setIsListening] = useState(false);
    const [quickSchedule, setQuickSchedule] = useState([]);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEventForEdit, setSelectedEventForEdit] = useState(null);

    // Reset to first phase when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentPhase(1);
            setSleepQuality(null);
            setMorningThoughts('');
            setQuickSchedule([]);
        }
    }, [isOpen]);

    // Get today's tasks
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => {
        if (!t.deadline || t.status === 'harvested') return false;
        return t.deadline.startsWith(todayStr);
    });

    // Get top 3 goals
    const topGoals = goals.slice(0, 3);

    // Get today's existing schedule items (including recurring events)
    const todayScheduleItems = (() => {
        const today = new Date();
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);

        const items = [];

        scheduleItems.forEach(item => {
            const itemDate = new Date(item.startTime || item.start_time);
            const itemDateStr = itemDate.toISOString().split('T')[0];
            const recurrenceType = item.recurrence_type || item.recurrenceType || 'none';

            // Check if it's on today directly
            if (itemDateStr === todayStr) {
                items.push({ ...item, isRecurring: recurrenceType !== 'none' });
            }
            // Check if it's a recurring event that occurs today
            else if (recurrenceType !== 'none' && doesRecurringEventOccurOnDate(item, todayStart)) {
                // Create a copy with adjusted date for display
                const adjustedItem = {
                    ...item,
                    isRecurringInstance: true,
                    originalStartTime: item.startTime || item.start_time
                };
                // Adjust start time to today but keep the time
                const originalTime = new Date(item.startTime || item.start_time);
                const adjustedTime = new Date(todayStart);
                adjustedTime.setHours(originalTime.getHours(), originalTime.getMinutes());
                adjustedItem.startTime = adjustedTime.toISOString();
                adjustedItem.start_time = adjustedTime.toISOString();
                items.push(adjustedItem);
            }
        });

        // Sort by start time
        return items.sort((a, b) => {
            const timeA = new Date(a.startTime || a.start_time).getTime();
            const timeB = new Date(b.startTime || b.start_time).getTime();
            return timeA - timeB;
        });
    })();

    // Get daily highlights for TODAY only (filter by date key)
    const todayHighlights = Object.entries(dailyHighlights)
        .filter(([key, value]) => key.startsWith(todayStr))
        .map(([key, value]) => ({
            key,
            ...(typeof value === 'string' ? { text: value, completed: false } : value)
        }))
        .filter(h => h.text);

    const handleNext = () => {
        if (currentPhase < 4) {
            setCurrentPhase(prev => prev + 1);
        } else {
            handleFinish();
        }
    };

    const handleBack = () => {
        if (currentPhase > 1) {
            setCurrentPhase(prev => prev - 1);
        }
    };

    const handleFinish = () => {
        // Add quick schedule items
        quickSchedule.forEach(item => {
            onAddScheduleItem({
                title: item.title,
                startTime: item.startTime,
                duration: item.duration || 60,
                category: item.category || 'Other'
            });
        });

        // Save morning data (could be extended to persist)
        console.log('Morning check-in:', { sleepQuality, morningThoughts });

        onClose();
    };

    const handleVoiceSchedule = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice recognition not supported. Please use Chrome or Edge.");
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            try {
                const parsed = await parseScheduleCommand(transcript);
                if (parsed) {
                    setQuickSchedule(prev => [...prev, parsed]);
                }
            } catch (error) {
                console.error('Voice parsing error:', error);
            }
        };

        recognition.start();
    };

    const addQuickBlock = (title, hour, duration = 60) => {
        const startTime = new Date();
        startTime.setHours(hour, 0, 0, 0);
        setQuickSchedule(prev => [...prev, {
            title,
            startTime: startTime.toISOString(),
            duration,
            category: 'Work'
        }]);
    };

    const removeQuickBlock = (index) => {
        setQuickSchedule(prev => prev.filter((_, i) => i !== index));
    };

    if (!isOpen) return null;

    // Phase Components
    const Phase1 = () => (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-col items-center justify-center h-full px-8 py-12"
        >
            {/* Sun Icon with glow */}
            <motion.div
                className="relative mb-8"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 blur-3xl opacity-30 rounded-full scale-150" />
                <Sun className="w-24 h-24 text-amber-400 drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]" />
            </motion.div>

            <h2 className="text-4xl font-serif font-bold text-white mb-2 text-center">
                Good Morning! ☀️
            </h2>
            <p className="text-white/60 text-lg mb-10">How did you sleep last night?</p>

            {/* Sleep Quality Options */}
            <div className="flex gap-4 mb-10">
                {SLEEP_OPTIONS.map((option) => (
                    <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.1, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSleepQuality(option.value)}
                        className={`flex flex-col items-center p-4 rounded-2xl transition-all ${sleepQuality === option.value
                            ? `bg-gradient-to-br ${option.color} shadow-lg shadow-white/20`
                            : 'bg-white/10 hover:bg-white/20'
                            }`}
                    >
                        <span className="text-4xl mb-2">{option.emoji}</span>
                        <span className={`text-sm font-medium ${sleepQuality === option.value ? 'text-white' : 'text-white/70'}`}>
                            {option.label}
                        </span>
                    </motion.button>
                ))}
            </div>

            {/* Morning Thoughts Input */}
            <div className="w-full max-w-md">
                <label className="block text-white/60 text-sm mb-2">Anything on your mind this morning?</label>
                <textarea
                    value={morningThoughts}
                    onChange={(e) => setMorningThoughts(e.target.value)}
                    placeholder="I'm feeling..."
                    className="w-full p-4 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent backdrop-blur-sm resize-none h-24"
                />
            </div>
        </motion.div>
    );

    const Phase2 = () => (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="h-full px-8 py-8 overflow-y-auto"
        >
            <div className="text-center mb-8">
                <h2 className="text-3xl font-serif font-bold text-white mb-2">Today's Focus 🎯</h2>
                <p className="text-white/60">Here's what's on your plate</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {/* Tasks Due Today */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        <h3 className="text-lg font-bold text-white">Tasks Due Today</h3>
                    </div>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                        {todayTasks.length > 0 ? todayTasks.map(task => (
                            <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                <div className={`w-2 h-2 rounded-full ${task.difficulty === 'hard' ? 'bg-red-400' :
                                    task.difficulty === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                                    }`} />
                                <span className="text-white/80 text-sm truncate flex-1">{task.title}</span>
                                {task.estimatedTime && (
                                    <span className="text-white/40 text-xs">{task.estimatedTime}m</span>
                                )}
                            </div>
                        )) : (
                            <p className="text-white/40 text-sm italic">No tasks due today!</p>
                        )}
                    </div>
                </div>

                {/* Today's Vision */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-pink-400" />
                        <h3 className="text-lg font-bold text-white">Today's Vision</h3>
                    </div>
                    <div className="space-y-3">
                        {todayHighlights.length > 0 ? todayHighlights.slice(0, 3).map(h => (
                            <div key={h.key} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                                {h.completed ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
                                ) : (
                                    <Circle className="w-5 h-5 text-white/30 flex-shrink-0" />
                                )}
                                <span className={`text-sm ${h.completed ? 'text-white/40 line-through' : 'text-white/80'}`}>
                                    {h.text}
                                </span>
                            </div>
                        )) : (
                            <p className="text-white/40 text-sm italic">No highlights set for today. Add them in Vision Board!</p>
                        )}
                    </div>
                </div>

                {/* Quick Habits */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-white">Morning Habits</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { emoji: '💧', label: 'Water' },
                            { emoji: '🧘', label: 'Meditate' },
                            { emoji: '🏃', label: 'Exercise' },
                            { emoji: '📚', label: 'Read' },
                            { emoji: '🍳', label: 'Breakfast' },
                            { emoji: '📝', label: 'Journal' },
                        ].map(habit => (
                            <button
                                key={habit.label}
                                className="flex items-center gap-2 p-3 rounded-xl bg-white/5 hover:bg-white/15 transition-colors text-left group"
                            >
                                <span className="text-xl">{habit.emoji}</span>
                                <span className="text-white/70 text-sm group-hover:text-white transition-colors">{habit.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const Phase3 = () => (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="h-full px-8 py-8 overflow-y-auto"
        >
            <div className="text-center mb-8">
                <h2 className="text-3xl font-serif font-bold text-white mb-2">Plan Your Day 📅</h2>
                <p className="text-white/60">Quick-add time blocks for today</p>
            </div>

            <div className="max-w-3xl mx-auto">
                {/* Quick Add Buttons */}
                <div className="flex flex-wrap justify-center gap-3 mb-8">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addQuickBlock('Morning Routine', 7, 60)}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium text-sm flex items-center gap-2"
                    >
                        <Sun className="w-4 h-4" /> Morning Routine
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addQuickBlock('Deep Work', 9, 120)}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium text-sm flex items-center gap-2"
                    >
                        <Brain className="w-4 h-4" /> Deep Work
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addQuickBlock('Lunch Break', 12, 60)}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium text-sm flex items-center gap-2"
                    >
                        🍽️ Lunch
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addQuickBlock('Exercise', 18, 60)}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-medium text-sm flex items-center gap-2"
                    >
                        🏋️ Exercise
                    </motion.button>
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleVoiceSchedule}
                        disabled={isListening}
                        className={`px-4 py-2 rounded-full font-medium text-sm flex items-center gap-2 ${isListening
                            ? 'bg-red-500 animate-pulse'
                            : 'bg-gradient-to-r from-cyan-500 to-blue-500'
                            } text-white`}
                    >
                        <Mic className="w-4 h-4" /> {isListening ? 'Listening...' : 'Voice Add'}
                    </motion.button>
                    {/* Add Custom Event Button */}
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                            setSelectedEventForEdit(null);
                            setShowEventModal(true);
                        }}
                        className="px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium text-sm flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add Custom Event
                    </motion.button>
                </div>

                {/* Schedule Preview */}
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-cyan-400" />
                        Today's Schedule
                    </h3>

                    {(todayScheduleItems.length > 0 || quickSchedule.length > 0) ? (
                        <div className="space-y-3">
                            {/* Existing schedule items */}
                            {todayScheduleItems.map((item) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between p-4 rounded-xl border"
                                    style={{
                                        backgroundColor: item.color ? `${item.color}20` : 'rgba(99, 102, 241, 0.1)',
                                        borderColor: item.color || '#6366f1'
                                    }}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="font-mono text-sm" style={{ color: item.color || '#a5b4fc' }}>
                                            {new Date(item.startTime || item.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-white font-medium">{item.title}</span>
                                        <span className="text-white/40 text-sm">{item.duration}m</span>
                                        {(item.isRecurring || item.isRecurringInstance) && (
                                            <span className="text-xs text-cyan-400 px-2 py-0.5 bg-cyan-500/20 rounded-full">🔄 Repeat</span>
                                        )}
                                    </div>
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || '#6366f1' }} />
                                </motion.div>
                            ))}
                            {/* Quick schedule items (new ones being added) */}
                            {quickSchedule.map((block, index) => (
                                <motion.div
                                    key={`quick-${index}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30"
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-purple-300 font-mono text-sm">
                                            {new Date(block.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <span className="text-white font-medium">{block.title}</span>
                                        <span className="text-white/40 text-sm">{block.duration}m</span>
                                        <span className="text-xs text-amber-400 px-2 py-0.5 bg-amber-500/20 rounded-full">NEW</span>
                                    </div>
                                    <button
                                        onClick={() => removeQuickBlock(index)}
                                        className="p-1 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-white/40">
                            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                            <p>Use the buttons above to quickly add time blocks</p>
                            <p className="text-sm mt-1">or use voice to say "Meeting at 2pm for 1 hour"</p>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );

    const Phase4 = () => (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-col items-center justify-center h-full px-8 py-12"
        >
            {/* Sparkles Animation */}
            <motion.div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            opacity: [0, 1, 0],
                            scale: [0, 1.5, 0],
                        }}
                        transition={{
                            duration: 2 + Math.random() * 2,
                            repeat: Infinity,
                            delay: Math.random() * 2,
                        }}
                    />
                ))}
            </motion.div>

            {/* Quote */}
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-12 relative"
            >
                <div className="relative z-10">
                    <Quote className="w-12 h-12 text-purple-400/50 mx-auto mb-6" />
                    <div className="flex flex-col gap-4 font-bold text-white uppercase tracking-wider">
                        <p className="text-3xl md:text-5xl drop-shadow-2xl">
                            WHERE ARE YOU WAITING FOR?
                        </p>
                        <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed">
                            YOU'LL NEVER KNOW YOUR FULL POTENTIAL UNLESS YOU PUSH YOURSELF TO IT
                        </p>
                    </div>
                </div>
                {/* Background glow for the quote */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-purple-500/10 blur-3xl -z-10 rounded-full"></div>
            </motion.div>

            {/* Top Goals */}
            {topGoals.length > 0 && (
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="mb-12"
                >
                    <h3 className="text-center text-white/60 text-sm uppercase tracking-wider mb-4">Your Goals</h3>
                    <div className="flex gap-4">
                        {topGoals.map((goal, index) => (
                            <div
                                key={goal.id || index}
                                className="px-6 py-3 rounded-full bg-white/10 border border-white/20 flex items-center gap-2"
                            >
                                <span className="text-xl">{goal.icon || '🎯'}</span>
                                <span className="text-white font-medium">{goal.title}</span>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Launch Button */}
            <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFinish}
                className="px-12 py-4 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white font-bold text-xl shadow-lg shadow-orange-500/30 flex items-center gap-3"
            >
                <Rocket className="w-6 h-6" />
                Start Your Day!
            </motion.button>
        </motion.div>
    );
    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                    >
                        {/* Backdrop */}
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            {/* Animated gradient orbs */}
                            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                            <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                        </motion.div>

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors z-50"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Main Content */}
                        <div className="relative w-full h-full max-w-6xl max-h-[90vh] mx-auto flex flex-col">
                            {/* Phase Content */}
                            <div className="flex-1 overflow-hidden">
                                <AnimatePresence mode="wait">
                                    {currentPhase === 1 && <Phase1 key="phase1" />}
                                    {currentPhase === 2 && <Phase2 key="phase2" />}
                                    {currentPhase === 3 && <Phase3 key="phase3" />}
                                    {currentPhase === 4 && <Phase4 key="phase4" />}
                                </AnimatePresence>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-between px-8 py-6">
                                {/* Progress Dots */}
                                <div className="flex gap-2">
                                    {[1, 2, 3, 4].map(phase => (
                                        <motion.div
                                            key={phase}
                                            className={`w-3 h-3 rounded-full transition-colors ${phase === currentPhase
                                                ? 'bg-white'
                                                : phase < currentPhase
                                                    ? 'bg-white/50'
                                                    : 'bg-white/20'
                                                }`}
                                            whileHover={{ scale: 1.2 }}
                                        />
                                    ))}
                                </div>

                                {/* Navigation Buttons */}
                                <div className="flex gap-4">
                                    {currentPhase > 1 && (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleBack}
                                            className="px-6 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium flex items-center gap-2 transition-colors"
                                        >
                                            <ChevronLeft className="w-5 h-5" />
                                            Back
                                        </motion.button>
                                    )}
                                    {currentPhase < 4 && (
                                        <motion.button
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            onClick={handleNext}
                                            className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium flex items-center gap-2 shadow-lg shadow-purple-500/30"
                                        >
                                            Continue
                                            <ChevronRight className="w-5 h-5" />
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )
                }
            </AnimatePresence>

            {/* Schedule Event Modal for adding events in Phase 3 */}
            <ScheduleEventModal
                isOpen={showEventModal}
                onClose={() => {
                    setShowEventModal(false);
                    setSelectedEventForEdit(null);
                }}
                onSave={(eventData) => {
                    // Set start time to today if not specified
                    const eventToSave = {
                        ...eventData,
                        startTime: eventData.startTime || new Date().toISOString()
                    };
                    if (onAddScheduleItem) {
                        onAddScheduleItem(eventToSave);
                    }
                    setShowEventModal(false);
                }}
                event={selectedEventForEdit}
                selectedDate={new Date()}
            />
        </>
    );
};

export default StartTheDayModal;
