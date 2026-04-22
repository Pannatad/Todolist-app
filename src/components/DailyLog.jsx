import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUp, Code, BookOpen, Dumbbell, Heart, Briefcase, Home, MoreHorizontal, ChevronLeft, ChevronRight, Calendar, Sparkles, Loader2, Play, Square, Volume2, VolumeX, CheckCircle, Plus, Settings, RefreshCw, Save } from 'lucide-react';
import { generateDailySchedule, getSmartSuggestions } from '../services/aiClient';

const DailyLog = ({ logs, onAddLog, onDeleteLog, tasks }) => {
    const [input, setInput] = useState('');
    const [category, setCategory] = useState('Study');
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [isPlanning, setIsPlanning] = useState(false);

    // Suggestions State
    const [suggestedActivities, setSuggestedActivities] = useState([]);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const [showRoutineSettings, setShowRoutineSettings] = useState(false);
    const [routinePreferences, setRoutinePreferences] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem('routinePreferences'));
            // Migrate old format if necessary or default to empty array
            if (saved && !Array.isArray(saved)) return [];
            return saved || [];
        } catch (e) {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('routinePreferences', JSON.stringify(routinePreferences));
    }, [routinePreferences]);

    // Initial fetch of suggestions
    useEffect(() => {
        refreshSuggestions();
    }, []); // Run once on mount

    // Focus Session State
    const [isFocusing, setIsFocusing] = useState(false);
    const [showFocusModal, setShowFocusModal] = useState(false);
    const [focusActivity, setFocusActivity] = useState('');
    const [focusCategory, setFocusCategory] = useState('Study');
    const [focusStartTime, setFocusStartTime] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    // Category configurations
    const categories = {
        Coding: { icon: Code, color: '#3b82f6', bg: '#dbeafe' },
        Study: { icon: BookOpen, color: '#8b5cf6', bg: '#ede9fe' },
        Exercise: { icon: Dumbbell, color: '#ef4444', bg: '#fee2e2' },
        Health: { icon: Heart, color: '#ec4899', bg: '#fce7f3' },
        Work: { icon: Briefcase, color: '#f59e0b', bg: '#fef3c7' },
        Chore: { icon: Home, color: '#10b981', bg: '#d1fae5' },
        Other: { icon: MoreHorizontal, color: '#6b7280', bg: '#f3f4f6' }
    };

    // Natural language parsing
    const parseActivity = (text) => {
        const hourMinPattern = /^(.+?)\s+(\d+)h\s*(\d+)?m?$/i;
        const minOnlyPattern = /^(.+?)\s+(\d+)m$/i;
        const hourOnlyPattern = /^(.+?)\s+(\d+)h$/i;

        let activity = '';
        let duration = 0;

        const hourMinMatch = text.match(hourMinPattern);
        if (hourMinMatch) {
            activity = hourMinMatch[1].trim();
            duration = parseInt(hourMinMatch[2]) * 60 + (hourMinMatch[3] ? parseInt(hourMinMatch[3]) : 0);
        } else {
            const minMatch = text.match(minOnlyPattern);
            if (minMatch) {
                activity = minMatch[1].trim();
                duration = parseInt(minMatch[2]);
            } else {
                const hourMatch = text.match(hourOnlyPattern);
                if (hourMatch) {
                    activity = hourMatch[1].trim();
                    duration = parseInt(hourMatch[2]) * 60;
                }
            }
        }

        return { activity, duration };
    };

    // Timer effect - updates every second while focusing
    useEffect(() => {
        let interval;
        if (isFocusing && focusStartTime) {
            interval = setInterval(() => {
                const now = new Date();
                const elapsed = Math.floor((now - focusStartTime) / 1000);
                setElapsedSeconds(elapsed);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isFocusing, focusStartTime]);

    // Prevent body scroll when focusing
    useEffect(() => {
        if (isFocusing) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isFocusing]);

    const handleOpenFocusModal = () => {
        setShowFocusModal(true);
    };

    const handleStartFocus = () => {
        if (!focusActivity.trim()) {
            alert('Please enter an activity name');
            return;
        }
        setFocusStartTime(new Date());
        setIsFocusing(true);
        setShowFocusModal(false);
        setElapsedSeconds(0);
    };

    const handleStopFocus = () => {
        if (!isFocusing) return;

        const durationMinutes = Math.floor(elapsedSeconds / 60);

        onAddLog({
            id: Date.now(),
            activity: focusActivity,
            duration: durationMinutes,
            category: focusCategory,
            timestamp: new Date().toISOString()
        });

        // Reset focus state
        setIsFocusing(false);
        setFocusStartTime(null);
        setElapsedSeconds(0);
        setFocusActivity('');
        setFocusCategory('Study');
    };

    const formatElapsedTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };


    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const { activity, duration } = parseActivity(input);

        if (!activity || duration === 0) {
            alert('Please use format: "Activity Name Xh Ym" or "Activity Xm"');
            return;
        }

        onAddLog({
            id: Date.now(),
            activity,
            duration,
            category,
            timestamp: new Date().toISOString()
        });

        setInput('');
        setSelectedDate(new Date());
    };

    // Date navigation
    const goToPreviousDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() - 1);
        setSelectedDate(newDate);
    };

    const goToNextDay = () => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + 1);
        if (newDate <= new Date()) {
            setSelectedDate(newDate);
        }
    };

    const goToToday = () => {
        setSelectedDate(new Date());
    };

    const isToday = selectedDate.toDateString() === new Date().toDateString();

    // Filter logs for selected date
    const selectedDateLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate.toDateString() === selectedDate.toDateString();
    }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Calculate stats (exclude planned items)
    const completedLogs = selectedDateLogs.filter(log => !log.isPlanned);
    const totalMinutes = completedLogs.reduce((sum, log) => sum + log.duration, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Category breakdown (exclude planned items)
    const categoryStats = {};
    completedLogs.forEach(log => {
        if (!categoryStats[log.category]) {
            categoryStats[log.category] = 0;
        }
        categoryStats[log.category] += log.duration;
    });

    const formatDuration = (minutes) => {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    const formatTime = (timestamp) => {
        return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date) => {
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

        return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    };

    const handlePlanDay = async () => {
        if (isPlanning) return;
        setIsPlanning(true);

        try {
            const schedule = await generateDailySchedule(tasks);
            if (schedule && schedule.length > 0) {
                schedule.forEach((item, index) => {
                    // Add a slight delay for each item to simulate "building" the schedule
                    setTimeout(() => {
                        onAddLog({
                            id: Date.now() + index,
                            activity: item.activity,
                            duration: item.duration,
                            category: item.category || 'Work',
                            timestamp: new Date().toISOString(), // Or calculate based on start time if provided
                            isPlanned: true // Flag as planned
                        });
                    }, index * 100);
                });
            }
        } catch (error) {
            console.error("Failed to plan day:", error);
        } finally {
            setIsPlanning(false);
        }
    };

    // Dynamic Suggestions Logic
    const getTimeOfDay = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Morning';
        if (hour >= 12 && hour < 17) return 'Afternoon';
        if (hour >= 17 && hour < 21) return 'Evening';
    };

    const refreshSuggestions = async () => {
        setIsLoadingSuggestions(true);
        const timeOfDay = getTimeOfDay();
        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();

        let newSuggestions = [];

        // 1. Get User Routine Preferences (Time-based)
        // Find routines within +/- 60 minutes of now
        const matchingRoutines = routinePreferences.filter(routine => {
            if (!routine.time || !routine.activity) return false;
            const [h, m] = routine.time.split(':').map(Number);
            const routineMinutes = h * 60 + m;
            const diff = Math.abs(currentMinutes - routineMinutes);
            return diff <= 60; // Match if within 1 hour
        });

        matchingRoutines.forEach(routine => {
            newSuggestions.push({
                id: 'routine-' + routine.id,
                activity: routine.activity,
                duration: 30, // Default
                category: 'Other', // Default
                isRoutine: true,
                time: routine.time
            });
        });

        // 2. Get AI Suggestions
        try {
            const aiSuggestions = await getSmartSuggestions(tasks, timeOfDay);
            // Add IDs and merge
            const formattedAiSuggestions = aiSuggestions.map((s, i) => ({
                ...s,
                id: 'ai-' + Date.now() + i,
                isAi: true
            }));
            newSuggestions = [...newSuggestions, ...formattedAiSuggestions];
        } catch (error) {
            console.error("Failed to get AI suggestions", error);
        }

        // 3. Fallback if empty
        if (newSuggestions.length === 0) {
            newSuggestions = [
                { id: 'def-1', activity: 'Quick Stretch', duration: 10, category: 'Health' },
                { id: 'def-2', activity: 'Review Tasks', duration: 15, category: 'Work' }
            ];
        }

        setSuggestedActivities(newSuggestions.slice(0, 4)); // Limit to 4
        setIsLoadingSuggestions(false);
    };

    const handleAddRoutineSlot = () => {
        setRoutinePreferences([...routinePreferences, { id: Date.now(), time: '09:00', activity: '' }]);
    };

    const handleRemoveRoutineSlot = (id) => {
        setRoutinePreferences(routinePreferences.filter(r => r.id !== id));
    };

    const handleRoutineChange = (id, field, value) => {
        setRoutinePreferences(routinePreferences.map(r =>
            r.id === id ? { ...r, [field]: value } : r
        ));
    };

    const handleSaveRoutine = (e) => {
        e.preventDefault();
        setShowRoutineSettings(false);
        refreshSuggestions(); // Refresh to show new routine immediately
    };

    const handleLogSuggestion = (suggestion) => {
        onAddLog({
            id: Date.now(),
            activity: suggestion.activity,
            duration: suggestion.duration,
            category: suggestion.category,
            timestamp: new Date().toISOString()
        });
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-serif font-bold text-sage-600 dark:text-magma-500 mb-2">
                    Daily Log
                </h2>
                <p className="text-sage-500 dark:text-bone-200/60 italic mb-4">
                    Track your accomplishments and productivity
                </p>
                {isToday && (
                    <button
                        onClick={handlePlanDay}
                        disabled={isPlanning}
                        className={`inline-flex items-center gap-2 px-6 py-2 rounded-full font-bold text-white transition-all shadow-md hover:scale-105 active:scale-95 ${isPlanning ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                    >
                        {isPlanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        {isPlanning ? 'Consulting the Stars...' : 'Plan My Day'}
                    </button>
                )}
            </div>

            {/* Date Navigation */}
            <div className="mb-6 flex items-center justify-center gap-3">
                <button
                    onClick={goToPreviousDay}
                    className="p-2 rounded-full hover:bg-sage-100 dark:hover:bg-void-800 transition-colors"
                    title="Previous Day"
                >
                    <ChevronLeft className="w-5 h-5 text-sage-600 dark:text-sage-400" />
                </button>

                <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-void-900 border border-sage-200 dark:border-white/10 rounded-xl">
                    <Calendar className="w-4 h-4 text-sage-600 dark:text-sage-400" />
                    <span className="font-bold text-sage-800 dark:text-sage-200">
                        {formatDate(selectedDate)}
                    </span>
                </div>

                <button
                    onClick={goToNextDay}
                    disabled={isToday}
                    className={`p-2 rounded-full transition-colors ${isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-sage-100 dark:hover:bg-void-800'}`}
                    title="Next Day"
                >
                    <ChevronRight className="w-5 h-5 text-sage-600 dark:text-sage-400" />
                </button>

                {!isToday && (
                    <button
                        onClick={goToToday}
                        className="ml-2 px-3 py-1 bg-sage-500 hover:bg-sage-600 text-white text-sm rounded-full font-bold transition-colors"
                    >
                        Today
                    </button>
                )}
            </div>

            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <motion.div
                    key={selectedDate.toDateString()}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-6 rounded-3xl bg-emerald-50/60 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-500/20 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                            <Clock className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200">Total Time</h3>
                    </div>
                    <div className="text-5xl font-bold text-emerald-900 dark:text-emerald-100 mb-2">
                        {totalHours > 0 && <span className="mr-2">{totalHours}h</span>}
                        <span>{remainingMinutes}m</span>
                    </div>
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                        {selectedDateLogs.length} {selectedDateLogs.length === 1 ? 'activity' : 'activities'} logged
                    </p>
                </motion.div>

                <motion.div
                    key={`breakdown-${selectedDate.toDateString()}`}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-3xl bg-purple-50/60 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-500/20 shadow-sm"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                        <h3 className="text-lg font-bold text-purple-800 dark:text-purple-200">Category Breakdown</h3>
                    </div>
                    <div className="space-y-3">
                        {Object.entries(categoryStats).map(([cat, minutes]) => {
                            const percentage = (minutes / totalMinutes) * 100;
                            const config = categories[cat] || categories.Study;
                            return (
                                <div key={cat}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-purple-900 dark:text-purple-100">{cat}</span>
                                        <span className="text-purple-700 dark:text-purple-300">{formatDuration(minutes)}</span>
                                    </div>
                                    <div className="h-2 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${percentage}%` }}
                                            transition={{ duration: 0.5 }}
                                            className="h-full rounded-full"
                                            style={{ backgroundColor: config.color }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(categoryStats).length === 0 && (
                            <p className="text-sm text-purple-500 dark:text-purple-300/60 italic text-center py-4">
                                No activities logged yet today
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Log Activity & Suggestions Section */}
            {isToday && (
                <div className="mb-8 p-6 rounded-3xl bg-white dark:bg-void-900 border border-sage-200 dark:border-white/10 shadow-lg">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Left: Manual Log */}
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-sage-700 dark:text-sage-300 mb-4">Log Activity</h3>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder='e.g., "Math homework 1h 30m" or "Gym 45m"'
                                    className="w-full px-4 py-3 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-xl text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400 transition-all"
                                />
                                <div className="flex gap-3">
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="px-4 py-3 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-xl text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400 cursor-pointer"
                                    >
                                        {Object.keys(categories).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-sage-600 hover:bg-sage-700 text-white rounded-xl font-bold transition-colors shadow-md hover:shadow-lg"
                                    >
                                        Log Session
                                    </button>
                                </div>
                            </form>
                            <div className="flex items-center justify-between mt-4">
                                <p className="text-xs text-sage-500 dark:text-bone-200/50 italic">
                                    Tip: Use format "Activity Name Xh Ym"
                                </p>
                                <button
                                    type="button"
                                    onClick={handleOpenFocusModal}
                                    className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm"
                                >
                                    <Play className="w-4 h-4" />
                                    Start Focus Session
                                </button>
                            </div>
                        </div>

                        {/* Right: Suggested Activities */}
                        <div className="flex-1 lg:border-l lg:border-sage-100 dark:lg:border-white/5 lg:pl-8 relative">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-sage-700 dark:text-sage-300">Suggested Activities</h3>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowRoutineSettings(!showRoutineSettings)}
                                        className="p-2 text-sage-400 hover:text-sage-600 dark:hover:text-sage-200 hover:bg-sage-100 dark:hover:bg-void-800 rounded-full transition-colors"
                                        title="Routine Settings"
                                    >
                                        <Settings size={18} />
                                    </button>
                                    <button
                                        onClick={refreshSuggestions}
                                        disabled={isLoadingSuggestions}
                                        className={`p-2 text-sage-400 hover:text-sage-600 dark:hover:text-sage-200 hover:bg-sage-100 dark:hover:bg-void-800 rounded-full transition-colors ${isLoadingSuggestions ? 'animate-spin' : ''}`}
                                        title="Refresh Suggestions"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Routine Settings Popover */}
                            <AnimatePresence>
                                {showRoutineSettings && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        className="absolute top-12 right-0 w-80 bg-white dark:bg-void-900 rounded-2xl shadow-xl border border-sage-200 dark:border-white/10 p-4 z-20"
                                    >
                                        <h4 className="font-bold text-sage-700 dark:text-sage-300 mb-3 flex items-center justify-between">
                                            <span className="flex items-center gap-2"><Clock size={16} /> Routine Schedule</span>
                                            <button
                                                type="button"
                                                onClick={handleAddRoutineSlot}
                                                className="text-xs bg-sage-100 dark:bg-void-800 hover:bg-sage-200 dark:hover:bg-void-700 text-sage-600 dark:text-sage-300 px-2 py-1 rounded-lg transition-colors"
                                            >
                                                + Add Slot
                                            </button>
                                        </h4>
                                        <form onSubmit={handleSaveRoutine} className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                            {routinePreferences.length === 0 && (
                                                <p className="text-xs text-sage-400 italic text-center py-2">No routines set. Add one!</p>
                                            )}
                                            {routinePreferences.map((routine) => (
                                                <div key={routine.id} className="flex items-center gap-2">
                                                    <input
                                                        type="time"
                                                        value={routine.time}
                                                        onChange={(e) => handleRoutineChange(routine.id, 'time', e.target.value)}
                                                        className="w-24 px-2 py-1.5 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sm text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-1 focus:ring-sage-400"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={routine.activity}
                                                        onChange={(e) => handleRoutineChange(routine.id, 'activity', e.target.value)}
                                                        placeholder="Activity..."
                                                        className="flex-1 px-2 py-1.5 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sm text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-1 focus:ring-sage-400"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveRoutineSlot(routine.id)}
                                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                    >
                                                        <VolumeX size={14} className="rotate-45" /> {/* Using VolumeX as X icon fallback or just X */}
                                                    </button>
                                                </div>
                                            ))}
                                            <button
                                                type="submit"
                                                className="w-full py-2 bg-sage-600 hover:bg-sage-700 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 mt-2"
                                            >
                                                <Save size={14} /> Save Schedule
                                            </button>
                                        </form>
                                    </motion.div>
                                )}
                            </AnimatePresence>


                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {isLoadingSuggestions ? (
                                    <div className="col-span-2 py-8 flex flex-col items-center justify-center text-sage-400">
                                        <Loader2 className="w-8 h-8 animate-spin mb-2" />
                                        <span className="text-sm">Consulting the oracle...</span>
                                    </div>
                                ) : suggestedActivities.length > 0 ? (
                                    suggestedActivities.map((suggestion) => {
                                        const Icon = categories[suggestion.category]?.icon || Sparkles;
                                        const config = categories[suggestion.category] || categories.Other;
                                        return (
                                            <button
                                                key={suggestion.id}
                                                onClick={() => handleLogSuggestion(suggestion)}
                                                className="flex items-center gap-3 p-3 rounded-xl border border-sage-200 dark:border-white/10 hover:border-sage-400 dark:hover:border-white/30 hover:bg-sage-50 dark:hover:bg-void-800 transition-all group text-left relative overflow-hidden"
                                            >
                                                {suggestion.isRoutine && (
                                                    <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg">
                                                        ROUTINE
                                                    </div>
                                                )}
                                                <div className="p-2 rounded-lg" style={{ backgroundColor: config.bg }}>
                                                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-sage-700 dark:text-bone-200 truncate">{suggestion.activity}</div>
                                                    <div className="text-xs text-sage-500 dark:text-bone-400">{formatDuration(suggestion.duration)}</div>
                                                </div>
                                                <div className="px-3 py-1 bg-sage-200 dark:bg-void-700 text-sage-600 dark:text-bone-300 text-xs font-bold rounded-lg group-hover:bg-sage-300 dark:group-hover:bg-void-600 transition-colors">
                                                    Log
                                                </div>
                                            </button>
                                        );
                                    })
                                ) : (
                                    <div className="col-span-2 text-center py-8 text-sage-400 italic">
                                        No suggestions available. Try refreshing!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Activities Timeline */}
            <div>
                <h3 className="text-2xl font-bold text-sage-700 dark:text-sage-300 mb-4">
                    {isToday ? "Today's" : formatDate(selectedDate)} Activities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence mode="wait">
                        {selectedDateLogs.map((log) => {
                            const Icon = categories[log.category]?.icon || BookOpen;
                            const config = categories[log.category] || categories.Study;

                            return (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={`p-4 rounded-2xl border shadow-sm hover:shadow-md transition-all flex items-center gap-4 group ${log.isPlanned ? 'bg-sage-50/50 dark:bg-void-900/50 border-dashed border-sage-300 dark:border-white/20' : 'bg-white dark:bg-void-900 border-sage-200 dark:border-white/10'}`}
                                >
                                    <div className="relative">
                                        <div className={`p-3 rounded-xl ${log.isPlanned ? 'opacity-50' : ''}`} style={{ backgroundColor: config.bg }}>
                                            <Icon className="w-6 h-6" style={{ color: config.color }} />
                                        </div>
                                        {!log.isPlanned && (
                                            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-void-900 rounded-full p-0.5">
                                                <CheckCircle className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h4 className={`font-bold text-lg truncate ${log.isPlanned ? 'text-sage-600 dark:text-sage-400 italic' : 'text-sage-800 dark:text-sage-200'}`}>
                                            {log.activity}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-sm font-medium text-sage-500 dark:text-bone-200/60">
                                                {formatDuration(log.duration)}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-sage-300 dark:bg-white/20" />
                                            <span className="text-sm text-sage-400 dark:text-bone-200/40">
                                                {formatTime(log.timestamp)}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {log.isPlanned ? (
                                            <button
                                                onClick={() => {
                                                    onDeleteLog(log.id);
                                                    onAddLog({ ...log, id: Date.now(), isPlanned: false });
                                                }}
                                                className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                                title="Mark as Complete"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => onDeleteLog(log.id)}
                                                className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 text-xs font-bold transition-colors"
                                            >
                                                Delete
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
                {selectedDateLogs.length === 0 && (
                    <div className="text-center py-12 bg-sage-50/50 dark:bg-void-900/30 rounded-3xl border border-dashed border-sage-200 dark:border-white/10">
                        <div className="p-4 bg-white dark:bg-void-800 rounded-full inline-block mb-3 shadow-sm">
                            <Sparkles className="w-6 h-6 text-sage-400" />
                        </div>
                        <p className="text-sage-500 dark:text-bone-200/50 font-medium">
                            No activities logged {isToday ? 'yet. Start tracking your day!' : 'for this day.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Focus Setup Modal */}
            <AnimatePresence>
                {showFocusModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowFocusModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-void-900 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-sage-200 dark:border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-2xl font-bold text-sage-700 dark:text-sage-300 mb-6">Start Focus Session</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-sage-600 dark:text-sage-400 mb-2">
                                        Activity Name
                                    </label>
                                    <input
                                        type="text"
                                        value={focusActivity}
                                        onChange={(e) => setFocusActivity(e.target.value)}
                                        placeholder="e.g., Deep Work, Reading, Exercise"
                                        className="w-full px-4 py-3 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-xl text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-sage-600 dark:text-sage-400 mb-2">
                                        Category
                                    </label>
                                    <select
                                        value={focusCategory}
                                        onChange={(e) => setFocusCategory(e.target.value)}
                                        className="w-full px-4 py-3 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-xl text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                    >
                                        {Object.keys(categories).map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowFocusModal(false)}
                                    className="flex-1 px-6 py-3 bg-sage-200 dark:bg-void-800 text-sage-700 dark:text-sage-300 rounded-xl font-bold hover:bg-sage-300 dark:hover:bg-void-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStartFocus}
                                    className="flex-1 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors shadow-md flex items-center justify-center gap-2"
                                >
                                    <Play className="w-5 h-5" />
                                    Begin
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Focus Session Overlay */}
            <AnimatePresence>
                {isFocusing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
                    >
                        {/* Background Image */}
                        <img
                            src="/cozy-cafe.png"
                            alt="Cozy Cafe"
                            className="absolute inset-0 w-full h-full object-cover opacity-80"
                        />

                        {/* Audio */}
                        <audio
                            autoPlay
                            loop
                            muted={isMuted}
                        >
                            <source src="https://cdn.pixabay.com/audio/2022/05/13/audio_2fe7f89e90.mp3" type="audio/mpeg" />
                        </audio>

                        {/* YouTube Music Player (optional) */}
                        <div className="absolute bottom-8 right-8 z-10">
                            <iframe
                                width="200"
                                height="113"
                                src="https://www.youtube.com/embed/9a8eBDuc3uA?autoplay=1&loop=1&playlist=9a8eBDuc3uA&controls=1"
                                title="Lofi Music"
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                className="rounded-lg shadow-lg opacity-80 hover:opacity-100 transition-opacity"
                            ></iframe>
                        </div>


                        {/* Overlay Content */}
                        <div className="relative z-10 flex flex-col items-center justify-center h-full">
                            <motion.div
                                initial={{ scale: 0.8 }}
                                animate={{ scale: 1 }}
                                className="text-center"
                            >
                                <motion.div
                                    animate={{
                                        scale: [1, 1.05, 1],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="mb-8"
                                >
                                    <div className="text-white/90 text-2xl font-medium mb-4 drop-shadow-lg px-6 py-3 rounded-2xl bg-gradient-to-r from-white/10 via-white/5 to-white/10 backdrop-blur-md border border-white/20">
                                        {focusActivity}
                                    </div>
                                    <div className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-100 to-purple-100 text-9xl font-bold tracking-wider font-mono drop-shadow-2xl">
                                        {formatElapsedTime(elapsedSeconds)}
                                    </div>
                                </motion.div>

                                <div className="flex items-center gap-2 text-white/90 text-sm mb-12">
                                    <span className="px-4 py-2 bg-gradient-to-r from-white/20 via-white/10 to-white/20 rounded-full backdrop-blur-md drop-shadow-lg border border-white/30 font-medium">
                                        {focusCategory}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleStopFocus}
                                        className="px-8 py-4 bg-gradient-to-r from-white/20 via-white/15 to-white/20 hover:from-white/30 hover:via-white/25 hover:to-white/30 text-white rounded-2xl font-bold transition-all shadow-lg backdrop-blur-md flex items-center gap-3 border border-white/40"
                                    >
                                        <Square className="w-6 h-6" />
                                        Stop & Log Session
                                    </button>

                                    <button
                                        onClick={() => setIsMuted(!isMuted)}
                                        className="p-4 bg-gradient-to-r from-white/20 via-white/15 to-white/20 hover:from-white/30 hover:via-white/25 hover:to-white/30 text-white rounded-2xl font-bold transition-all shadow-lg backdrop-blur-md border border-white/40"
                                        title={isMuted ? "Unmute" : "Mute"}
                                    >
                                        {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default DailyLog;
