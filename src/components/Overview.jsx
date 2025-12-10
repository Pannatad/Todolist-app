import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Target, Zap, Clock, Calendar, CheckCircle2, AlertCircle, ChevronRight, Plus, Coins, Flame, Brain, CheckSquare, Check, Sun, Moon, Edit2, Trash2, Mic, MicOff, Loader2, X } from 'lucide-react';
import { useTask } from '../context/TaskContext';
import { useGoal } from '../context/GoalContext';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { parseTaskInput } from '../services/gemini';
import Penguin from './Penguin';
import ScheduleEventModal from './ScheduleEventModal';
import TaskModal from './TaskModal';



const CurrentEventWidget = ({ scheduleItems }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [currentEvent, setCurrentEvent] = useState(null);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000 * 60); // Update every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!scheduleItems) return;

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        // Helper to check recurrence (reused logic for consistency)
        const doesRecurOnToday = (item) => {
            const recurrenceType = item.recurrence_type || item.recurrenceType || 'none';
            if (recurrenceType === 'none') return false;

            const eventDate = new Date(item.startTime || item.start_time);
            eventDate.setHours(0, 0, 0, 0);
            const todayDate = new Date(now);
            todayDate.setHours(0, 0, 0, 0);

            if (todayDate < eventDate) return false;

            const endDate = item.recurrence_end_date || item.recurrenceEndDate;
            if (endDate && todayDate > new Date(endDate)) return false;

            const interval = item.recurrence_interval || item.recurrenceInterval || 1;
            const daysDiff = Math.floor((todayDate - eventDate) / (1000 * 60 * 60 * 24));

            switch (recurrenceType) {
                case 'daily': return daysDiff % interval === 0;
                case 'weekly': {
                    const daysOfWeek = item.recurrence_days_of_week || item.recurrenceDaysOfWeek || [];
                    if (daysOfWeek.length > 0) return daysOfWeek.includes(todayDate.getDay());
                    return daysDiff % (7 * interval) === 0;
                }
                case 'monthly': {
                    const monthsDiff = (todayDate.getFullYear() - eventDate.getFullYear()) * 12 + (todayDate.getMonth() - eventDate.getMonth());
                    return monthsDiff % interval === 0 && todayDate.getDate() === eventDate.getDate();
                }
                case 'yearly': {
                    const yearsDiff = todayDate.getFullYear() - eventDate.getFullYear();
                    return yearsDiff % interval === 0 && todayDate.getMonth() === eventDate.getMonth() && todayDate.getDate() === eventDate.getDate();
                }
                default: return false;
            }
        };

        // Find active event
        const active = scheduleItems.find(item => {
            const recurrenceType = item.recurrence_type || item.recurrenceType || 'none';
            let itemStart = new Date(item.startTime || item.start_time);

            // Adjust time for recurring events to today
            if (recurrenceType !== 'none') {
                if (!doesRecurOnToday(item)) return false;
                const originalTime = itemStart;
                itemStart = new Date(now);
                itemStart.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
            } else {
                // Non-recurring: must be today
                if (itemStart.toISOString().split('T')[0] !== todayStr) return false;
            }

            const duration = item.duration || 60;
            const itemEnd = new Date(itemStart.getTime() + duration * 60000);

            return now >= itemStart && now < itemEnd;
        });

        if (active) {
            // Calculate display times and progress
            const recurrenceType = active.recurrence_type || active.recurrenceType || 'none';
            let start = new Date(active.startTime || active.start_time);
            if (recurrenceType !== 'none') {
                const originalTime = start;
                start = new Date(now);
                start.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
            }

            const duration = active.duration || 60;
            const end = new Date(start.getTime() + duration * 60000);
            const totalDuration = end.getTime() - start.getTime();
            const elapsed = now.getTime() - start.getTime();
            const prog = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

            setCurrentEvent({
                ...active,
                displayStart: start,
                displayEnd: end
            });
            setProgress(prog);
        } else {
            setCurrentEvent(null);
            setProgress(0);
        }

    }, [scheduleItems, currentTime]);



    return (
        <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-400/20 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} className="text-white/80" />
                            {currentEvent ? 'Now Happening' : 'Current Status'}
                        </h3>
                        <div className="text-3xl font-bold text-white mt-1 font-mono">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    {currentEvent && (
                        <div className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold border border-white/30">
                            On Track
                        </div>
                    )}
                </div>

                {currentEvent ? (
                    <div>
                        <h4 className="text-xl font-bold text-white mb-1">{currentEvent.title}</h4>
                        <div className="flex justify-between text-sm text-white/70 mb-3">
                            <span>{currentEvent.displayStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>{currentEvent.displayEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-white"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <p className="text-right text-xs text-white/60 mt-1">{Math.round(progress)}% Complete</p>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 py-2">
                        <div className="p-3 bg-white/20 rounded-full text-white">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-white">Free Time</h4>
                            <p className="text-sm text-white/70">Recharge or pick a task from the garden.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// Quick Schedule Widget Component (Popup Version)
const QuickScheduleWidget = ({ addScheduleItem, isOpen, onClose, buttonRef }) => {
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('');
    const [duration, setDuration] = useState('60');
    const popupRef = useRef(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target) &&
                buttonRef?.current && !buttonRef.current.contains(e.target)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, buttonRef]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !time) return;

        const today = new Date();
        const [hours, minutes] = time.split(':');
        const startTime = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(hours), parseInt(minutes));

        addScheduleItem({
            title: title.trim(),
            startTime: startTime.toISOString(),
            duration: parseInt(duration),
            category: 'Other'
        });

        setTitle('');
        setTime('');
        setDuration('60');
        onClose();
    };

    if (!isOpen) return null;

    // Calculate position based on button ref
    const buttonRect = buttonRef?.current?.getBoundingClientRect();
    const style = buttonRect ? {
        position: 'fixed',
        top: buttonRect.bottom + 8,
        right: window.innerWidth - buttonRect.right,
        zIndex: 99999
    } : {};

    return createPortal(
        <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            style={style}
            className="w-72"
        >
            <div className="bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-5 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden border border-white/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-400/20 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none"></div>

                <div className="flex items-center justify-between mb-3 relative z-10">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                        <Calendar size={16} className="text-white/90" /> Quick Schedule
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-2 relative z-10">
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Event name..."
                        className="w-full bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                        autoFocus
                    />

                    <div className="flex gap-2">
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="flex-1 bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                        />
                        <select
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                        >
                            <option value="30" className="text-gray-800">30m</option>
                            <option value="60" className="text-gray-800">1h</option>
                            <option value="90" className="text-gray-800">1.5h</option>
                            <option value="120" className="text-gray-800">2h</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-white text-orange-600 py-2 rounded-lg font-bold text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2"
                    >
                        <Plus size={14} /> Add to Schedule
                    </button>
                </form>
            </div>
        </motion.div>,
        document.body
    );
};

// Quick Add Task Widget with Voice Support (Popup Version)
const QuickAddTaskWidget = ({ addTask, isOpen, onClose, buttonRef }) => {
    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const recognitionRef = useRef(null);
    const popupRef = useRef(null);

    // Handle click outside to close
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (popupRef.current && !popupRef.current.contains(e.target) &&
                buttonRef?.current && !buttonRef.current.contains(e.target)) {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onClose, buttonRef]);

    // Initialize Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                setInput(transcript);
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
        };
    }, []);

    const toggleListening = () => {
        if (!recognitionRef.current) {
            alert('Speech recognition is not supported in your browser.');
            return;
        }

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            setInput('');
            recognitionRef.current.start();
            setIsListening(true);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        setIsProcessing(true);
        try {
            // Use Gemini to parse the natural language input
            const parsed = await parseTaskInput(input);

            addTask({
                title: parsed.title || input,
                difficulty: parsed.difficulty || 'easy',
                deadline: parsed.deadline,
                subject: parsed.subject || "Today's Plan",
                estimatedTime: parsed.estimatedTime
            });

            setInput('');
            onClose();
        } catch (error) {
            console.error('Error processing task:', error);
            // Fallback to simple task creation
            addTask({
                title: input,
                difficulty: 'easy',
                subject: "Today's Plan"
            });
            setInput('');
            onClose();
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isOpen) return null;

    // Calculate position based on button ref
    const buttonRect = buttonRef?.current?.getBoundingClientRect();
    const style = buttonRect ? {
        position: 'fixed',
        top: buttonRect.bottom + 8,
        right: window.innerWidth - buttonRect.right,
        zIndex: 99999
    } : {};

    return createPortal(
        <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            style={style}
            className="w-80"
        >
            <div className="bg-gradient-to-br from-teal-500 via-emerald-500 to-green-500 p-5 rounded-2xl shadow-2xl flex flex-col relative overflow-hidden border border-white/20">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-400/20 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none"></div>

                <div className="flex items-center justify-between mb-3 relative z-10">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                        <Plus size={16} className="text-white/90" /> Quick Add Task
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-2 relative z-10">
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? 'Listening...' : 'e.g., "Math homework due tomorrow 3pm"'}
                            className="w-full bg-white/20 backdrop-blur-sm border border-white/20 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30"
                            disabled={isListening}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-white/20 text-white hover:bg-white/30'
                                }`}
                        >
                            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                        </button>
                    </div>

                    <p className="text-white/60 text-xs">
                        🎤 Say or type: "task name, due date, difficulty"
                    </p>

                    <button
                        type="submit"
                        disabled={isProcessing || !input.trim()}
                        className="w-full bg-white text-emerald-600 py-2 rounded-lg font-bold text-sm hover:bg-white/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={14} className="animate-spin" /> Processing...
                            </>
                        ) : (
                            <>
                                <Plus size={14} /> Add Task
                            </>
                        )}
                    </button>
                </form>
            </div>
        </motion.div>,
        document.body
    );
};

const Overview = ({ onNavigate, onStartDay, onEndDay }) => {
    const { tasks, addTask, updateTask, deleteTask, scheduleItems, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useTask();
    const { dailyHighlights, goals, updateHighlight } = useGoal();
    const { user } = useAuth();
    const { coins } = useGame();

    const [greeting, setGreeting] = useState('');
    const [quickCaptureText, setQuickCaptureText] = useState('');
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedScheduleItem, setSelectedScheduleItem] = useState(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showQuickSchedulePopup, setShowQuickSchedulePopup] = useState(false);
    const [showQuickAddTaskPopup, setShowQuickAddTaskPopup] = useState(false);
    const quickScheduleButtonRef = useRef(null);
    const quickAddTaskButtonRef = useRef(null);
    const [stats, setStats] = useState({
        taskProgress: 0,
        urgentCount: 0,
        nextTask: null,
        focusMinutes: 0,
        tasksLeft: 0
    });

    // Time-based greeting
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    // Calculate Stats
    useEffect(() => {
        if (!tasks) return;

        const today = new Date().toISOString().split('T')[0];
        const todaysTasks = tasks.filter(t => {
            if (!t.deadline) return false;
            return t.deadline.startsWith(today);
        });

        const completed = todaysTasks.filter(t => t.status === 'harvested').length;
        const total = todaysTasks.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const left = total - completed;

        const urgent = tasks.filter(t => {
            if (!t.deadline || t.status === 'harvested') return false;
            const now = new Date();
            const due = new Date(t.deadline);
            const diff = due - now;
            return diff > 0 && diff < 1000 * 60 * 60 * 24; // Due within 24h
        }).length;

        // Find next upcoming task
        const next = tasks
            .filter(t => {
                if (t.status === 'harvested' || !t.deadline) return false;
                return new Date(t.deadline) > new Date(); // Only future tasks
            })
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

        setStats({
            taskProgress: progress,
            urgentCount: urgent,
            nextTask: next,
            focusMinutes: 0, // Placeholder until FocusContext is integrated if needed
            tasksLeft: left
        });
    }, [tasks]);

    const handleQuickCapture = (e) => {
        e.preventDefault();
        if (!quickCaptureText.trim()) return;

        addTask({
            title: quickCaptureText,
            difficulty: 'medium',
            deadline: new Date().toISOString(), // Due today
            subject: 'Today\'s Plan'
        });
        setQuickCaptureText('');
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto space-y-8 custom-scrollbar">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-sage-800 dark:text-bone-100">
                        {greeting}, {user?.email?.split('@')[0] || 'Traveler'}
                    </h1>
                    <p className="text-sage-500 dark:text-bone-400 mt-1 flex items-center gap-2">
                        <Flame size={16} className="text-orange-500" />
                        Your productivity engine is online.
                    </p>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
                    <div className="bg-gradient-to-br from-purple-500/80 to-indigo-600/80 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-lg flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-white">{stats.tasksLeft}</span>
                        <span className="text-xs text-white/70 uppercase font-bold">Tasks Left</span>
                    </div>
                    <div className="bg-gradient-to-br from-fuchsia-500/80 to-pink-600/80 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-lg flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-white">{stats.taskProgress}%</span>
                        <span className="text-xs text-white/70 uppercase font-bold">Done</span>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/80 to-orange-600/80 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-lg flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-white flex items-center gap-1">
                            {coins} <span className="text-xs">🪙</span>
                        </span>
                        <span className="text-xs text-white/70 uppercase font-bold">Wealth</span>
                    </div>
                    <div className="bg-gradient-to-br from-blue-500/80 to-cyan-600/80 backdrop-blur-md p-3 rounded-2xl border border-white/20 shadow-lg flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-white">0</span>
                        <span className="text-xs text-white/70 uppercase font-bold">Focus (m)</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Today's Schedule (Indigo-Blue Gradient) */}
                <div className="lg:col-span-1 flex flex-col h-full">
                    <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-500 rounded-[2rem] p-6 shadow-xl h-full flex flex-col relative overflow-hidden">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <Calendar className="text-white/90" size={24} />
                                <h2 className="text-2xl font-bold text-white">Today's Schedule</h2>
                            </div>
                            <div className="relative">
                                <button
                                    ref={quickScheduleButtonRef}
                                    onClick={() => setShowQuickSchedulePopup(!showQuickSchedulePopup)}
                                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-105"
                                    title="Quick Add Schedule"
                                >
                                    <Plus size={18} />
                                </button>
                                <QuickScheduleWidget
                                    addScheduleItem={addScheduleItem}
                                    isOpen={showQuickSchedulePopup}
                                    onClose={() => setShowQuickSchedulePopup(false)}
                                    buttonRef={quickScheduleButtonRef}
                                />
                            </div>
                        </div>

                        <div className="flex-1 relative z-10 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                            {/* Timeline Line */}
                            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-white/20 rounded-full"></div>

                            {(() => {
                                const today = new Date();
                                const todayStr = today.toISOString().split('T')[0];

                                // Helper function for recurrence check
                                const doesRecurOnToday = (item) => {
                                    const recurrenceType = item.recurrence_type || item.recurrenceType || 'none';
                                    if (recurrenceType === 'none') return false;

                                    const eventDate = new Date(item.startTime || item.start_time);
                                    eventDate.setHours(0, 0, 0, 0);
                                    const todayDate = new Date(today);
                                    todayDate.setHours(0, 0, 0, 0);

                                    if (todayDate < eventDate) return false;

                                    const endDate = item.recurrence_end_date || item.recurrenceEndDate;
                                    if (endDate && todayDate > new Date(endDate)) return false;

                                    const interval = item.recurrence_interval || item.recurrenceInterval || 1;
                                    const daysDiff = Math.floor((todayDate - eventDate) / (1000 * 60 * 60 * 24));

                                    switch (recurrenceType) {
                                        case 'daily': return daysDiff % interval === 0;
                                        case 'weekly': {
                                            const daysOfWeek = item.recurrence_days_of_week || item.recurrenceDaysOfWeek || [];
                                            if (daysOfWeek.length > 0) return daysOfWeek.includes(todayDate.getDay());
                                            return daysDiff % (7 * interval) === 0;
                                        }
                                        case 'monthly': {
                                            const monthsDiff = (todayDate.getFullYear() - eventDate.getFullYear()) * 12 + (todayDate.getMonth() - eventDate.getMonth());
                                            return monthsDiff % interval === 0 && todayDate.getDate() === eventDate.getDate();
                                        }
                                        case 'yearly': {
                                            const yearsDiff = todayDate.getFullYear() - eventDate.getFullYear();
                                            return yearsDiff % interval === 0 && todayDate.getMonth() === eventDate.getMonth() && todayDate.getDate() === eventDate.getDate();
                                        }
                                        default: return false;
                                    }
                                };

                                // Get today's schedule items (including recurring)
                                const todaySchedule = scheduleItems?.filter(item => {
                                    if (!item.startTime && !item.start_time) return false;
                                    const itemDate = new Date(item.startTime || item.start_time);
                                    const itemDateStr = itemDate.toISOString().split('T')[0];
                                    return itemDateStr === todayStr || doesRecurOnToday(item);
                                }).map(item => {
                                    const recurrenceType = item.recurrence_type || item.recurrenceType || 'none';
                                    const originalTime = new Date(item.startTime || item.start_time);
                                    const adjustedTime = new Date(today);
                                    adjustedTime.setHours(originalTime.getHours(), originalTime.getMinutes());
                                    return {
                                        ...item,
                                        displayTime: adjustedTime,
                                        isRecurring: recurrenceType !== 'none'
                                    };
                                }).sort((a, b) => a.displayTime - b.displayTime) || [];

                                if (todaySchedule.length === 0) {
                                    return (
                                        <div className="pl-10 text-white/60 italic text-sm py-4">
                                            No schedule for today.
                                        </div>
                                    );
                                }

                                return todaySchedule.map((item, i) => (
                                    <div key={item.id || i} className="relative pl-10 group">
                                        {/* Timeline Dot */}
                                        <div className="absolute left-[11px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 z-10 bg-white"
                                            style={{ borderColor: item.color || '#6366f1' }}></div>

                                        <div
                                            onClick={() => {
                                                setSelectedScheduleItem(item);
                                                setShowScheduleModal(true);
                                            }}
                                            className="p-4 rounded-xl shadow-sm transition-all hover:scale-[1.02] bg-white/10 backdrop-blur-md border border-white/10 group-hover:bg-white/15 cursor-pointer"
                                        >
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h3 className="font-bold text-lg leading-tight text-white">
                                                        {item.title}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1 text-white/70">
                                                        <span className="flex items-center gap-1 text-xs font-bold">
                                                            <Clock size={12} />
                                                            {(() => {
                                                                const startHour = String(item.displayTime.getHours()).padStart(2, '0');
                                                                const startMin = String(item.displayTime.getMinutes()).padStart(2, '0');
                                                                const endTime = new Date(item.displayTime.getTime() + (item.duration || 60) * 60000);
                                                                const endHour = String(endTime.getHours()).padStart(2, '0');
                                                                const endMin = String(endTime.getMinutes()).padStart(2, '0');
                                                                return `${startHour}:${startMin}-${endHour}:${endMin}`;
                                                            })()}
                                                        </span>
                                                        {item.isRecurring && (
                                                            <span className="text-xs text-cyan-300 px-1.5 py-0.5 bg-cyan-500/20 rounded-full">🔄</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm(`Delete "${item.title}"?`)) {
                                                                deleteScheduleItem(item.id);
                                                            }
                                                        }}
                                                        className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 text-white/60 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || '#06b6d4' }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>

                {/* MIDDLE/RIGHT COLUMN: Vision Board + Widgets */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Current Event Widget */}
                    <div className="md:col-span-2">
                        <CurrentEventWidget scheduleItems={scheduleItems} />
                    </div>

                    {/* Start the Day Widget */}
                    <div
                        onClick={onStartDay}
                        className="bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-5 rounded-2xl shadow-xl flex items-center gap-4 relative overflow-hidden cursor-pointer hover:shadow-2xl transition-all group"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-400/20 rounded-full blur-2xl -ml-6 -mb-6 pointer-events-none"></div>

                        <div className="shrink-0 w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sun size={24} className="text-white" />
                        </div>

                        <div className="relative z-10 flex-1">
                            <h3 className="font-bold text-lg text-white">
                                Start Your Day
                            </h3>
                            <p className="text-white/70 text-xs">
                                Set your 3 main goals and plan your focus for today
                            </p>
                        </div>

                        <div className="hidden md:flex items-center gap-2 bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white font-bold text-sm group-hover:bg-white/30 transition-colors">
                            <span>Begin</span>
                            <ChevronRight size={14} />
                        </div>
                    </div>

                    {/* End the Day Widget */}
                    <div
                        onClick={onEndDay}
                        className="bg-gradient-to-br from-indigo-800 via-slate-800 to-purple-900 p-5 rounded-2xl shadow-xl flex items-center gap-4 relative overflow-hidden cursor-pointer hover:shadow-2xl transition-all group"
                    >
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl -ml-6 -mb-6 pointer-events-none"></div>

                        {/* Star decorations */}
                        <div className="absolute top-3 right-16 w-1 h-1 bg-white rounded-full animate-pulse"></div>
                        <div className="absolute top-6 right-24 w-1 h-1 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute bottom-4 right-12 w-1 h-1 bg-white/80 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>

                        <div className="shrink-0 w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform border border-white/10">
                            <Moon size={24} className="text-indigo-200" />
                        </div>

                        <div className="relative z-10 flex-1">
                            <h3 className="font-bold text-lg text-white">
                                End Your Day
                            </h3>
                            <p className="text-white/60 text-xs">
                                Reflect on achievements and set tomorrow's goals
                            </p>
                        </div>

                        <div className="hidden md:flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-lg text-white font-bold text-sm group-hover:bg-white/20 transition-colors border border-white/10">
                            <span>Reflect</span>
                            <ChevronRight size={14} />
                        </div>
                    </div>

                    {/* Vision Board Card (Purple-Pink Gradient) */}
                    <div className="bg-gradient-to-br from-purple-600 via-fuchsia-600 to-pink-500 rounded-[2rem] p-6 shadow-xl relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/15 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-400/20 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <Target className="text-white/90" size={24} />
                                <h2 className="text-2xl font-bold text-white">Vision Board (Today)</h2>
                            </div>
                            <button
                                onClick={onStartDay}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-bold transition-colors backdrop-blur-sm"
                            >
                                <Sun size={16} /> Start Day
                            </button>
                        </div>

                        <div className="space-y-3 relative z-10 flex-1">
                            {[0, 1, 2].map((index) => {
                                const todayKey = new Date().toISOString().split('T')[0];
                                const uniqueKey = `${todayKey}_${index}`;
                                const rawData = dailyHighlights?.[uniqueKey];
                                const highlight = typeof rawData === 'string'
                                    ? { text: rawData, completed: false }
                                    : rawData;

                                if (!highlight) return (
                                    <div key={index} className="p-4 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white/40 text-sm italic flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-white/30"></div>
                                        Empty Goal Slot
                                    </div>
                                );

                                return (
                                    <div
                                        key={index}
                                        onClick={() => {
                                            const newCompleted = !highlight.completed;
                                            updateHighlight(uniqueKey, highlight.text, newCompleted, newCompleted ? 'completed' : 'pending');
                                        }}
                                        className={`p-4 rounded-xl shadow-lg flex items-center gap-3 transition-all hover:scale-[1.02] backdrop-blur-sm border cursor-pointer ${highlight.completed
                                            ? 'bg-white/10 border-white/20 text-white/60'
                                            : 'bg-white/20 border-white/30 text-white'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${highlight.completed ? 'bg-green-500 text-white' : 'bg-white/30 hover:bg-white/50'
                                            }`}>
                                            {highlight.completed && <Check size={12} strokeWidth={3} />}
                                        </div>
                                        <span className={`font-bold text-sm ${highlight.completed ? 'line-through' : ''}`}>
                                            {highlight.text}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <button onClick={() => onNavigate('vision')} className="mt-4 text-white/80 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
                            Manage Goals <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Tasks Due Today Widget (Blue-Cyan Gradient) */}
                    <div className="bg-gradient-to-br from-blue-600 via-cyan-600 to-cyan-500 p-6 rounded-[2rem] shadow-xl flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-cyan-400/20 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Clock size={18} className="text-white/90" /> Tasks Due Today
                            </h3>
                            <div className="relative">
                                <button
                                    ref={quickAddTaskButtonRef}
                                    onClick={() => setShowQuickAddTaskPopup(!showQuickAddTaskPopup)}
                                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-all hover:scale-105"
                                    title="Quick Add Task"
                                >
                                    <Plus size={16} />
                                </button>
                                <QuickAddTaskWidget
                                    addTask={addTask}
                                    isOpen={showQuickAddTaskPopup}
                                    onClose={() => setShowQuickAddTaskPopup(false)}
                                    buttonRef={quickAddTaskButtonRef}
                                />
                            </div>
                        </div>
                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px] custom-scrollbar">
                            {(() => {
                                const today = new Date();
                                const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                const todayEnd = new Date(todayStart);
                                todayEnd.setDate(todayEnd.getDate() + 1);

                                const todayTasks = tasks.filter(task => {
                                    if (!task.deadline || task.status === 'harvested') return false;
                                    const deadline = new Date(task.deadline);
                                    return deadline >= todayStart && deadline < todayEnd;
                                });

                                if (todayTasks.length === 0) {
                                    return (
                                        <div className="text-white/60 text-sm italic text-center py-4">
                                            No tasks due today! 🎉
                                        </div>
                                    );
                                }

                                return todayTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => {
                                            setSelectedTask(task);
                                            setShowTaskModal(true);
                                        }}
                                        className="bg-white/20 backdrop-blur-sm border border-white/20 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/30 transition-colors group"
                                    >
                                        <div className={`w-2 h-2 rounded-full ${task.status === 'growing' ? 'bg-green-400' : 'bg-white/50'}`}></div>
                                        <span className="text-white text-sm font-medium flex-1 truncate">{task.title}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Delete "${task.title}"?`)) {
                                                    deleteTask(task.id);
                                                }
                                            }}
                                            className="p-1.5 rounded-lg bg-white/10 hover:bg-red-500/30 text-white/60 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        <span className="text-white/60 text-xs">
                                            {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>

                </div>
            </div>

            {/* Schedule Event Modal for editing */}
            <ScheduleEventModal
                isOpen={showScheduleModal}
                onClose={() => {
                    setShowScheduleModal(false);
                    setSelectedScheduleItem(null);
                }}
                onSave={(eventData) => {
                    if (selectedScheduleItem?.id) {
                        updateScheduleItem(selectedScheduleItem.id, eventData);
                    } else {
                        addScheduleItem(eventData);
                    }
                    setShowScheduleModal(false);
                    setSelectedScheduleItem(null);
                }}
                onDelete={selectedScheduleItem?.id ? () => {
                    deleteScheduleItem(selectedScheduleItem.id);
                    setShowScheduleModal(false);
                    setSelectedScheduleItem(null);
                } : null}
                event={selectedScheduleItem}
                selectedDate={new Date()}
            />

            {/* Task Modal for editing */}
            <TaskModal
                isOpen={showTaskModal}
                onClose={() => {
                    setShowTaskModal(false);
                    setSelectedTask(null);
                }}
                onSave={(taskData) => {
                    if (selectedTask?.id) {
                        updateTask(selectedTask.id, taskData);
                    } else {
                        addTask(taskData);
                    }
                    setShowTaskModal(false);
                    setSelectedTask(null);
                }}
                task={selectedTask}
            />
        </div>
    );
};

export default Overview;
