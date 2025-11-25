import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUp, Code, BookOpen, Dumbbell, Heart, Briefcase, Home, MoreHorizontal, ChevronLeft, ChevronRight, Calendar, Sparkles, Loader2, Play, Square, Volume2, VolumeX } from 'lucide-react';
import { generateDailySchedule } from '../services/gemini';

const DailyLog = ({ logs, onAddLog, onDeleteLog, tasks }) => {
    const [input, setInput] = useState('');
    const [category, setCategory] = useState('Study');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isPlanning, setIsPlanning] = useState(false);

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
                    className="p-6 rounded-2xl bg-gradient-to-br from-sage-100 to-sage-50 dark:from-void-800 dark:to-void-900 border border-sage-300 dark:border-white/10 shadow-lg"
                >
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-3 rounded-full bg-sage-500/20">
                            <Clock className="w-6 h-6 text-sage-600 dark:text-sage-400" />
                        </div>
                        <h3 className="text-lg font-bold text-sage-700 dark:text-sage-300">Total Time</h3>
                    </div>
                    <div className="text-4xl font-bold text-sage-800 dark:text-sage-200">
                        {totalHours > 0 && `${totalHours}h `}
                        {remainingMinutes > 0 && `${remainingMinutes}m`}
                        {totalMinutes === 0 && '0m'}
                    </div>
                    <p className="text-sm text-sage-600 dark:text-sage-400 mt-2">
                        {selectedDateLogs.length} {selectedDateLogs.length === 1 ? 'activity' : 'activities'} logged
                    </p>
                </motion.div>

                <motion.div
                    key={`breakdown-${selectedDate.toDateString()}`}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="p-6 rounded-2xl bg-white dark:bg-void-900 border border-sage-200 dark:border-white/10 shadow-lg"
                >
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-full bg-purple-500/20">
                            <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-sage-700 dark:text-sage-300">Category Breakdown</h3>
                    </div>
                    <div className="space-y-3">
                        {Object.entries(categoryStats).map(([cat, minutes]) => {
                            const percentage = (minutes / totalMinutes) * 100;
                            const config = categories[cat] || categories.Study;
                            return (
                                <div key={cat}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-medium text-sage-700 dark:text-sage-300">{cat}</span>
                                        <span className="text-sage-600 dark:text-sage-400">{formatDuration(minutes)}</span>
                                    </div>
                                    <div className="h-2 bg-sage-100 dark:bg-void-800 rounded-full overflow-hidden">
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
                            <p className="text-sm text-sage-500 dark:text-bone-200/50 italic text-center py-4">
                                No activities logged {isToday ? 'yet today' : 'for this day'}
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>

            {/* Activity Logger Form - Only show for today */}
            {isToday && (
                <div className="mb-8 p-6 rounded-2xl bg-white dark:bg-void-900 border border-sage-200 dark:border-white/10 shadow-lg">
                    <h3 className="text-xl font-bold text-sage-700 dark:text-sage-300 mb-4">Log Activity</h3>
                    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder='e.g., "Math homework 1h 30m" or "Gym 45m"'
                            className="flex-1 px-4 py-3 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-xl text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400"
                        />
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="px-4 py-3 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-xl text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400"
                        >
                            {Object.keys(categories).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="px-6 py-3 bg-sage-500 hover:bg-sage-600 text-white rounded-xl font-bold transition-colors shadow-md hover:shadow-lg"
                        >
                            Log Session
                        </button>
                    </form>
                    <div className="flex items-center justify-between mt-3">
                        <p className="text-xs text-sage-500 dark:text-bone-200/50 italic">
                            Tip: Use format "Activity Name Xh Ym" (e.g., "Study 2h 15m")
                        </p>
                        <button
                            type="button"
                            onClick={handleOpenFocusModal}
                            className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                        >
                            <Play className="w-4 h-4" />
                            Start Focus Session
                        </button>
                    </div>
                </div>
            )}

            {/* Activities Timeline */}
            <div>
                <h3 className="text-2xl font-bold text-sage-700 dark:text-sage-300 mb-4">
                    {isToday ? "Today's" : formatDate(selectedDate)} Activities
                </h3>
                <div className="space-y-3">
                    <AnimatePresence mode="wait">
                        {selectedDateLogs.map((log) => {
                            const Icon = categories[log.category]?.icon || BookOpen;
                            const config = categories[log.category] || categories.Study;

                            return (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 20 }}
                                    className={`p-4 rounded-xl border shadow-sm hover:shadow-md transition-all flex items-center gap-4 group ${log.isPlanned ? 'bg-sage-50/50 dark:bg-void-900/50 border-dashed border-sage-300 dark:border-white/20' : 'bg-white dark:bg-void-900 border-sage-200 dark:border-white/10'}`}
                                >
                                    <div className={`p-3 rounded-full ${log.isPlanned ? 'opacity-50' : ''}`} style={{ backgroundColor: config.bg }}>
                                        <Icon className="w-5 h-5" style={{ color: config.color }} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-bold ${log.isPlanned ? 'text-sage-600 dark:text-sage-400 italic' : 'text-sage-800 dark:text-sage-200'}`}>
                                            {log.activity} {log.isPlanned && <span className="text-xs font-normal not-italic opacity-70 ml-2">(Planned)</span>}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-xs font-bold ${log.isPlanned ? 'opacity-70' : ''}`}
                                                style={{ backgroundColor: config.bg, color: config.color }}
                                            >
                                                {log.category}
                                            </span>
                                            <span className="text-sm text-sage-500 dark:text-bone-200/60">
                                                {formatDuration(log.duration)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm text-sage-600 dark:text-sage-400">
                                            {formatTime(log.timestamp)}
                                        </span>
                                        <div className="flex flex-col items-end gap-1 mt-1">
                                            {log.isPlanned && (
                                                <button
                                                    onClick={() => {
                                                        // Convert to actual log
                                                        onDeleteLog(log.id); // Remove planned
                                                        onAddLog({ ...log, id: Date.now(), isPlanned: false }); // Add real
                                                    }}
                                                    className="text-xs text-emerald-500 hover:text-emerald-700 font-bold"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                            <button
                                                onClick={() => onDeleteLog(log.id)}
                                                className="text-xs text-red-500 hover:text-red-700 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                    {selectedDateLogs.length === 0 && (
                        <div className="text-center py-12 text-sage-500 dark:text-bone-200/50 italic">
                            No activities logged {isToday ? 'yet. Start tracking your day!' : 'for this day.'}
                        </div>
                    )}
                </div>
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
                        {/* Video Background */}
                        <video
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{ filter: 'brightness(0.6)' }}
                        >
                            <source src="https://cdn.pixabay.com/video/2023/08/25/177336-858525066_large.mp4" type="video/mp4" />
                        </video>

                        {/* Audio */}
                        <audio
                            autoPlay
                            loop
                            muted={isMuted}
                        >
                            <source src="https://cdn.pixabay.com/download/audio/2022/05/13/audio_0c647d3116.mp3" type="audio/mpeg" />
                        </audio>

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
                                    <div className="text-white/90 text-lg font-medium mb-4 drop-shadow-lg">
                                        {focusActivity}
                                    </div>
                                    <div className="text-white text-8xl font-bold tracking-wider font-mono drop-shadow-2xl">
                                        {formatElapsedTime(elapsedSeconds)}
                                    </div>
                                </motion.div>

                                <div className="flex items-center gap-2 text-white/80 text-sm mb-12">
                                    <span className="px-3 py-1 bg-white/20 rounded-full backdrop-blur-sm drop-shadow-lg">
                                        {focusCategory}
                                    </span>
                                </div>

                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={handleStopFocus}
                                        className="px-8 py-4 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all shadow-lg backdrop-blur-md flex items-center gap-3 border border-white/30"
                                    >
                                        <Square className="w-6 h-6" />
                                        Stop & Log Session
                                    </button>

                                    <button
                                        onClick={() => setIsMuted(!isMuted)}
                                        className="p-4 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-bold transition-all shadow-lg backdrop-blur-md border border-white/30"
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
        </div>
    );
};

export default DailyLog;
