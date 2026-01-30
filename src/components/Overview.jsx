import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Zap, Clock, Calendar, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight, Plus, Coins, Flame, Brain, CheckSquare, Check, Sun, Moon, Edit2, Trash2, Mic, MicOff, Loader2, X, Sparkles, Lightbulb } from 'lucide-react';
import { useTask } from '../context/TaskContext';
import { useGoal } from '../context/GoalContext';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useAgentMemory } from '../context/AgentMemoryContext';
import { useProject } from '../context/ProjectContext';
import { useHabit } from '../context/HabitContext';
import { useChatContext } from '../context/ChatContext';
import { parseTaskInput, routeAgentCommand } from '../services/gemini';
import { canHandleLocally, generateLocalResponse, getCachedResponse, cacheResponse, generateCacheKey, clearCache } from '../services/localAgentHandler';
import { generateProactiveSuggestions } from '../services/proactiveEngine';
import Penguin from './Penguin';
import ScheduleEventModal from './ScheduleEventModal';
import TaskModal from './TaskModal';
import MagicBox from './MagicBox';
import AgentConfirmationModal from './AgentConfirmationModal';

// Proactive Suggestion Card Component
const ProactiveSuggestionCard = ({ suggestions, onAction, onDismiss }) => {
    if (!suggestions || suggestions.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="w-full max-w-2xl mx-auto mt-4"
        >
            <div className="space-y-2">
                {suggestions.map((suggestion) => (
                    <motion.div
                        key={suggestion.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md cursor-pointer ${suggestion.priority === 'urgent'
                            ? 'bg-red-50 border-red-200'
                            : suggestion.priority === 'high'
                                ? 'bg-amber-50 border-amber-200'
                                : 'bg-indigo-50 border-indigo-100'
                            }`}
                        onClick={() => suggestion.action && onAction(suggestion.action)}
                    >
                        <span className="text-2xl">{suggestion.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{suggestion.title}</p>
                            <p className="text-gray-600 text-xs mt-0.5 truncate">{suggestion.message}</p>
                        </div>
                        {suggestion.action && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onAction(suggestion.action); }}
                                className="flex-shrink-0 px-3 py-1.5 bg-white/80 hover:bg-white rounded-lg text-xs font-medium text-indigo-600 border border-indigo-200 transition-colors"
                            >
                                Act
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); onDismiss(suggestion.id); }}
                            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
};


const CurrentEventWidget = ({ scheduleItems }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [currentEvent, setCurrentEvent] = useState(null);
    const [nextEvent, setNextEvent] = useState(null);
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

            const timeValue = item.startTime || item.start_time;
            if (!timeValue) return false;
            const eventDate = new Date(timeValue);
            if (isNaN(eventDate.getTime())) return false;
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
            const timeValue = item.startTime || item.start_time;
            if (!timeValue) return false;
            const recurrenceType = item.recurrence_type || item.recurrenceType || 'none';
            let itemStart = new Date(timeValue);
            if (isNaN(itemStart.getTime())) return false;

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

        // Find next upcoming event (after now)
        const todayEvents = scheduleItems
            .map(item => {
                const timeValue = item.startTime || item.start_time;
                if (!timeValue) return null;
                const recurrenceType = item.recurrence_type || item.recurrenceType || 'none';
                let itemStart = new Date(timeValue);
                if (isNaN(itemStart.getTime())) return null;

                if (recurrenceType !== 'none') {
                    if (!doesRecurOnToday(item)) return null;
                    const originalTime = itemStart;
                    itemStart = new Date(now);
                    itemStart.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
                } else {
                    if (itemStart.toISOString().split('T')[0] !== todayStr) return null;
                }

                return { ...item, adjustedStart: itemStart };
            })
            .filter(item => item && item.adjustedStart > now)
            .sort((a, b) => a.adjustedStart - b.adjustedStart);

        if (todayEvents.length > 0) {
            setNextEvent(todayEvents[0]);
        } else {
            setNextEvent(null);
        }

    }, [scheduleItems, currentTime]);



    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm relative overflow-hidden group border border-gray-100">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} className="text-indigo-500" />
                            {currentEvent ? 'Now Happening' : 'Current Status'}
                        </h3>
                        <div className="text-3xl font-bold text-gray-900 mt-1 font-mono">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    {currentEvent && (
                        <div className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">
                            On Track
                        </div>
                    )}
                </div>

                {currentEvent ? (
                    <div>
                        <h4 className="text-xl font-bold text-gray-900 mb-1">{currentEvent.title}</h4>
                        <div className="flex justify-between text-sm text-gray-500 mb-3 font-medium">
                            <span>{currentEvent.displayStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>{currentEvent.displayEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                                className="h-full bg-indigo-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <p className="text-right text-xs text-gray-400 mt-1.5 font-medium">{Math.round(progress)}% Complete</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center gap-4 py-2">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-500">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h4 className="text-lg font-bold text-gray-900">Free Time</h4>
                                <p className="text-sm text-gray-600">Recharge or pick a task from the garden.</p>
                            </div>
                        </div>

                        {nextEvent && (
                            <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">Up Next</p>
                                    <p className="text-sm font-medium text-gray-900 truncate">{nextEvent.title}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-indigo-600">
                                        {nextEvent.adjustedStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        )}
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
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xl flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none"></div>

                <div className="flex items-center justify-between mb-3 relative z-10">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                        <div className="bg-indigo-100 p-1 rounded-lg">
                            <Calendar size={14} className="text-indigo-600" />
                        </div>
                        Quick Schedule
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
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
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                        autoFocus
                    />

                    <div className="flex gap-2">
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                        />
                        <select
                            value={duration}
                            onChange={(e) => setDuration(e.target.value)}
                            className="bg-gray-50 border border-gray-200 rounded-xl px-2 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500"
                        >
                            <option value="30">30m</option>
                            <option value="60">1h</option>
                            <option value="90">1.5h</option>
                            <option value="120">2h</option>
                        </select>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm"
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
            <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-xl flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-teal-50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none"></div>

                <div className="flex items-center justify-between mb-3 relative z-10">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                        <div className="bg-teal-100 p-1 rounded-lg">
                            <Plus size={14} className="text-teal-600" />
                        </div>
                        Quick Add Task
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
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
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 pr-10 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500"
                            disabled={isListening}
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={toggleListening}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening
                                ? 'bg-red-500 text-white animate-pulse'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                }`}
                        >
                            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                        </button>
                    </div>

                    <p className="text-gray-500 text-xs font-medium">
                        🎤 Say or type: "task name, due date, difficulty"
                    </p>

                    <button
                        type="submit"
                        disabled={isProcessing || !input.trim()}
                        className="w-full bg-teal-600 hover:bg-teal-700 text-white py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
    const { profile, getProfileSummary } = useUserProfile();
    const { logInteraction, getMemorySummary, getRecentInteractions, generatePatternInsights } = useAgentMemory();
    const { projects } = useProject();
    const { habits, logHabit } = useHabit();
    const { sendMessage, openSidebar } = useChatContext();

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
    const [scheduleDate, setScheduleDate] = useState(new Date()); // Date for schedule navigation
    const [stats, setStats] = useState({
        eventsToday: 0,
        habitCompletion: { completed: 0, total: 0 },
        streakDays: 0,
        tasksDueSoon: 0
    });

    // Agent state (kept for backward compatibility with existing modals)
    const [isAgentLoading, setIsAgentLoading] = useState(false);
    const [agentPlan, setAgentPlan] = useState(null);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [isExecutingActions, setIsExecutingActions] = useState(false);
    const [originalPrompt, setOriginalPrompt] = useState('');

    // Clarify conversation state (for iterative prompting)
    const [clarifyConversation, setClarifyConversation] = useState([]);
    const [pendingClarify, setPendingClarify] = useState(null);

    // Proactive suggestions state
    const [proactiveSuggestions, setProactiveSuggestions] = useState([]);
    const [dismissedSuggestions, setDismissedSuggestions] = useState([]);

    // Handler to route actions through chat
    const handleChatAction = (action) => {
        sendMessage(action);
        openSidebar();
    };

    // Generate proactive suggestions
    useEffect(() => {
        if (profile?.preferences?.proactiveSuggestions === false) return;

        const suggestions = generateProactiveSuggestions({
            tasks,
            schedule: scheduleItems,
            habits: [],
            profile,
            currentTime: new Date().toISOString()
        });

        // Filter out dismissed suggestions
        const filtered = suggestions.filter(s => !dismissedSuggestions.includes(s.id));
        setProactiveSuggestions(filtered);
    }, [tasks, scheduleItems, profile, dismissedSuggestions]);

    const handleDismissSuggestion = (suggestionId) => {
        setDismissedSuggestions(prev => [...prev, suggestionId]);
    };


    // Time-based greeting
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    // Generate pattern insights when data changes
    useEffect(() => {
        if (tasks?.length > 0 || scheduleItems?.length > 0) {
            generatePatternInsights({
                tasks,
                scheduleItems,
                habits,
                sleepData: [] // Will be enhanced later with sleep data
            });
        }
    }, [tasks, scheduleItems, habits, generatePatternInsights]);

    // Calculate Stats - New useful metrics
    useEffect(() => {
        // Events Today - count schedule items for today
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];

        const eventsToday = scheduleItems?.filter(item => {
            const timeValue = item.startTime || item.start_time;
            if (!timeValue) return false;
            const itemDate = new Date(timeValue);
            if (isNaN(itemDate.getTime())) return false;
            return itemDate.toISOString().split('T')[0] === todayStr;
        }).length || 0;

        // Habit Completion - X of Y completed today
        const todayDate = today.toISOString().split('T')[0];
        const totalHabits = habits?.length || 0;
        const completedHabits = habits?.filter(h =>
            h.completedDates?.includes(todayDate)
        ).length || 0;

        // Streak Days - consecutive days with activity (tasks completed or habits done)
        const calculateStreak = () => {
            // Simple implementation: count consecutive days with dailyHighlights or completed tasks
            let streak = 0;
            const checkDate = new Date();

            for (let i = 0; i < 365; i++) { // Max 365 days lookback
                const dateStr = checkDate.toISOString().split('T')[0];

                // Check if there's any activity on this day
                const hasActivity =
                    // Check if any daily highlights exist for this day
                    (dailyHighlights && Object.keys(dailyHighlights).some(key => key.startsWith(dateStr))) ||
                    // Or check if any tasks were completed on this day
                    (tasks && tasks.some(t => t.completedAt?.startsWith(dateStr)));

                if (hasActivity) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
            return streak;
        };

        // Tasks Due Soon - within next 3 days
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
        threeDaysFromNow.setHours(23, 59, 59, 999);

        const tasksDueSoon = tasks?.filter(t => {
            if (!t.deadline || t.status === 'harvested' || t.archived) return false;
            const deadline = new Date(t.deadline);
            return deadline >= today && deadline <= threeDaysFromNow;
        }).length || 0;

        setStats({
            eventsToday,
            habitCompletion: { completed: completedHabits, total: totalHabits },
            streakDays: calculateStreak(),
            tasksDueSoon
        });
    }, [tasks, scheduleItems, habits, dailyHighlights]);

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

    // Handle Magic Box submission
    const handleMagicBoxSubmit = async (input) => {
        setIsAgentLoading(true);
        // Track original prompt for edit functionality (only set on first submit)
        if (!originalPrompt) {
            setOriginalPrompt(input);
        }
        try {
            // Helper function to check if schedule item recurs on today
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];

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

            // Filter for today's schedule (including recurring events)
            const todaySchedule = scheduleItems?.filter(item => {
                if (!item.startTime && !item.start_time) return false;
                const itemDate = new Date(item.startTime || item.start_time);
                const itemDateStr = itemDate.toISOString().split('T')[0];
                return itemDateStr === todayStr || doesRecurOnToday(item);
            }).map(item => {
                // For recurring events, adjust the date to today
                const recurrenceType = item.recurrence_type || item.recurrenceType || 'none';
                const originalTime = new Date(item.startTime || item.start_time);
                const adjustedTime = new Date(today);
                adjustedTime.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
                return {
                    ...item,
                    displayTime: adjustedTime,
                    isRecurring: recurrenceType !== 'none'
                };
            }).sort((a, b) => a.displayTime - b.displayTime) || [];

            // Build rich context for the agent
            const context = {
                userProfile: {
                    name: profile.nickname || profile.name || user?.email?.split('@')[0] || 'User',
                    role: profile.role,
                    workingHours: profile.workingHours,
                    focusStyle: profile.focusStyle,
                    goals: profile.goals,
                    summary: getProfileSummary()
                },
                recentTasks: tasks?.filter(t => !t.archived && !t.completed).slice(0, 15) || [],
                // Tasks due today for overview
                tasksDueToday: tasks?.filter(t => {
                    if (t.archived || t.completed) return false;
                    if (!t.deadline) return false;
                    const deadline = new Date(t.deadline);
                    const today = new Date();
                    return deadline.toDateString() === today.toDateString();
                }).map(t => ({ title: t.title, deadline: t.deadline, difficulty: t.difficulty })) || [],
                recentSchedule: todaySchedule, // Use filtered today's schedule including recurring events
                // Include projects data
                projects: projects?.map(p => ({
                    id: p.id,
                    title: p.title,
                    status: p.status,
                    progress: p.progress,
                    category: p.category,
                    phases: p.phases?.map(ph => ({ name: ph.name, deadline: ph.deadline })),
                    taskCount: p.tasks?.length || 0,
                    tasksInProgress: p.tasks?.filter(t => t.columnId === 'c-2')?.length || 0,
                    tasksDone: p.tasks?.filter(t => t.columnId === 'c-4')?.length || 0
                })) || [],
                // Include habits data
                habits: habits?.map(h => ({
                    id: h.id,
                    name: h.name,
                    frequency: h.frequency,
                    streak: h.streak || 0,
                    completedToday: h.completedDates?.includes(new Date().toISOString().split('T')[0])
                })) || [],
                // Include goals data
                visionGoals: Array.isArray(goals) ? goals.slice(0, 10) : [],
                dailyHighlights: Array.isArray(dailyHighlights) ? dailyHighlights.slice(0, 5) : [],
                memorySummary: getMemorySummary(profile),
                recentInteractions: getRecentInteractions(5),
                // If there's an ongoing clarify conversation, include it
                conversationHistory: clarifyConversation.length > 0
                    ? clarifyConversation.map(c => `User: ${c.input}\nAgent: ${c.response}`).join('\n')
                    : null
            };

            // Token optimization: Check if we can handle locally first
            const patternType = canHandleLocally(input);
            let plan;

            if (patternType) {
                // Try local handling (0 tokens!)
                console.log('🚀 Handling locally:', patternType);
                plan = generateLocalResponse(patternType, context);
            } else {
                // Check cache for similar recent queries
                const cacheKey = generateCacheKey(input);
                const cachedPlan = getCachedResponse(cacheKey);

                if (cachedPlan) {
                    console.log('📦 Using cached response');
                    plan = cachedPlan;
                } else {
                    // Fallback to Gemini API
                    console.log('🤖 Calling Gemini API...');
                    plan = await routeAgentCommand(input, context);
                    // Cache the response
                    cacheResponse(cacheKey, plan);
                }
            }

            // Check if agent needs clarification
            const clarifyAction = plan.actions?.find(a => a.type === 'clarify');
            if (clarifyAction) {
                // Store the clarification request and wait for user response
                setPendingClarify(clarifyAction.params);
                setClarifyConversation(prev => [...prev, { input, response: clarifyAction.params.question }]);
                setAgentPlan(plan);
                setShowAgentModal(true);
            } else {
                // Normal action plan - log and show confirmation
                setAgentPlan(plan);
                setShowAgentModal(true);
                // Clear conversation history since we got a concrete plan
                setClarifyConversation([]);
                setPendingClarify(null);
            }
        } catch (error) {
            console.error('Error processing Magic Box input:', error);
        } finally {
            setIsAgentLoading(false);
        }
    };

    // Execute confirmed agent actions
    const executeAgentActions = async (editedPlan = null) => {
        // Use edited plan if provided, otherwise use stored plan
        const planToExecute = editedPlan || agentPlan;
        if (!planToExecute?.actions) return;

        setIsExecutingActions(true);
        try {
            for (const action of planToExecute.actions) {
                // Skip clarify actions
                if (action.type === 'clarify') continue;

                switch (action.type) {
                    case 'add_task':
                        await addTask({
                            title: action.params.title,
                            difficulty: action.params.difficulty || 'easy',
                            deadline: action.params.deadline,
                            subject: action.params.subject,
                            estimatedTime: action.params.estimatedTime
                        });
                        break;
                    case 'edit_task':
                        if (action.params.taskId && action.params.updates) {
                            await updateTask(action.params.taskId, action.params.updates);
                        }
                        break;
                    case 'delete_task':
                        if (action.params.taskId) {
                            await deleteTask(action.params.taskId);
                        }
                        break;
                    case 'complete_task':
                        if (action.params.taskId) {
                            await updateTask(action.params.taskId, { completed: true, completedAt: new Date().toISOString() });
                        }
                        break;
                    case 'add_schedule':
                        await addScheduleItem({
                            title: action.params.title,
                            startTime: action.params.startTime,
                            duration: action.params.duration || 60,
                            category: action.params.category || 'Other'
                        });
                        break;
                    case 'edit_schedule':
                        if (action.params.eventId && action.params.updates) {
                            await updateScheduleItem(action.params.eventId, action.params.updates);
                        }
                        break;
                    case 'delete_schedule':
                        if (action.params.eventId) {
                            await deleteScheduleItem(action.params.eventId);
                        }
                        break;
                    case 'complete_habit':
                        if (action.params.habitId) {
                            const today = new Date().toISOString().split('T')[0];
                            await logHabit(action.params.habitId, today, 1, true);
                        }
                        break;
                    case 'navigate':
                        if (onNavigate && action.params.tabName) {
                            onNavigate(action.params.tabName);
                        }
                        break;
                    case 'set_goal':
                        console.log('Set goal:', action.params);
                        break;
                    case 'analyze':
                        console.log('Analysis:', action.params.message);
                        break;
                    default:
                        console.log('Unknown action type:', action.type);
                }
            }
            // Log successful interaction to memory
            logInteraction({
                input: planToExecute.summary || 'Agent command',
                actions: planToExecute.actions,
                outcome: 'success'
            });
        } catch (error) {
            console.error('Error executing agent actions:', error);
        } finally {
            setIsExecutingActions(false);
            setShowAgentModal(false);
            setAgentPlan(null);
            setClarifyConversation([]);
            setPendingClarify(null);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto space-y-8 custom-scrollbar bg-transparent">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                        {greeting}, {profile?.nickname || user?.email?.split('@')[0] || 'Traveler'}
                    </h1>
                    <p className="text-gray-600 mt-1 flex items-center gap-2 italic">
                        <Flame size={16} className="text-orange-500" />
                        "The best way to predict the future is to create it."
                    </p>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
                    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow transition-shadow flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-purple-600">{stats.eventsToday}</span>
                        <span className="text-xs text-gray-600 uppercase font-bold">Events Today</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow transition-shadow flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-teal-600">
                            {stats.habitCompletion.completed}/{stats.habitCompletion.total}
                        </span>
                        <span className="text-xs text-gray-600 uppercase font-bold">Habits</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow transition-shadow flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-orange-600 flex items-center gap-1">
                            {stats.streakDays} <span className="text-sm">🔥</span>
                        </span>
                        <span className="text-xs text-gray-600 uppercase font-bold">Streak</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow transition-shadow flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-red-600">{stats.tasksDueSoon}</span>
                        <span className="text-xs text-gray-600 uppercase font-bold">Due Soon</span>
                    </div>
                </div>
            </div>

            {/* Magic Box - AI Agent Command Bar */}
            <div className="py-4">
                <MagicBox />

                {/* Proactive Suggestions */}
                <AnimatePresence>
                    {proactiveSuggestions.length > 0 && (
                        <ProactiveSuggestionCard
                            suggestions={proactiveSuggestions}
                            onAction={handleChatAction}
                            onDismiss={handleDismissSuggestion}
                        />
                    )}
                </AnimatePresence>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Today's Schedule */}
                <div className="lg:col-span-1 flex flex-col h-full">
                    <div className="bg-white rounded-3xl p-6 shadow-sm hover:shadow transition-shadow h-full flex flex-col relative overflow-hidden border border-gray-100">
                        {/* Subtle accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full blur-3xl -mr-8 -mt-8 pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-50 p-2 rounded-xl">
                                    <Calendar className="text-indigo-600" size={20} />
                                </div>
                                {/* Navigation Arrows and Date Display */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setScheduleDate(prev => {
                                            const newDate = new Date(prev);
                                            newDate.setDate(newDate.getDate() - 1);
                                            return newDate;
                                        })}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                        title="Previous Day"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <h2 className="text-lg font-bold text-gray-900 min-w-[120px] text-center">
                                        {(() => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const selected = new Date(scheduleDate);
                                            selected.setHours(0, 0, 0, 0);
                                            const diffDays = Math.round((selected - today) / (1000 * 60 * 60 * 24));

                                            if (diffDays === 0) return "Today's Schedule";
                                            if (diffDays === 1) return "Tomorrow";
                                            if (diffDays === -1) return "Yesterday";
                                            return scheduleDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                        })()}
                                    </h2>
                                    <button
                                        onClick={() => setScheduleDate(prev => {
                                            const newDate = new Date(prev);
                                            newDate.setDate(newDate.getDate() + 1);
                                            return newDate;
                                        })}
                                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                        title="Next Day"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                    {/* Today Button - only show if not on today */}
                                    {(() => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const selected = new Date(scheduleDate);
                                        selected.setHours(0, 0, 0, 0);
                                        if (today.getTime() !== selected.getTime()) {
                                            return (
                                                <button
                                                    onClick={() => setScheduleDate(new Date())}
                                                    className="ml-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Go to Today"
                                                >
                                                    Today
                                                </button>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* AI Quick Action */}
                                <button
                                    onClick={() => handleMagicBoxSubmit("Summarize and optimize my schedule for today")}
                                    className="p-2 rounded-xl bg-gradient-to-br from-purple-100 to-indigo-100 hover:from-purple-200 hover:to-indigo-200 text-purple-600 transition-all hover:scale-105"
                                    title="AI Optimize Schedule"
                                >
                                    <Sparkles size={16} />
                                </button>
                                <div className="relative">
                                    <button
                                        ref={quickScheduleButtonRef}
                                        onClick={() => setShowQuickSchedulePopup(!showQuickSchedulePopup)}
                                        className="p-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition-all hover:scale-105"
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
                        </div>

                        <div className="flex-1 relative z-10 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                            {/* Timeline Line */}
                            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-indigo-200 rounded-full"></div>

                            {(() => {
                                const selectedDate = new Date(scheduleDate);
                                selectedDate.setHours(0, 0, 0, 0);

                                // Helper function for recurrence check
                                const doesRecurOnSelectedDate = (item) => {
                                    const recurrenceType = item.recurrence_type || item.recurrenceType || 'none';
                                    if (recurrenceType === 'none') return false;

                                    const eventDate = new Date(item.startTime || item.start_time);
                                    eventDate.setHours(0, 0, 0, 0);

                                    if (selectedDate < eventDate) return false;

                                    const endDate = item.recurrence_end_date || item.recurrenceEndDate;
                                    if (endDate && selectedDate > new Date(endDate)) return false;

                                    const interval = item.recurrence_interval || item.recurrenceInterval || 1;
                                    const daysDiff = Math.floor((selectedDate - eventDate) / (1000 * 60 * 60 * 24));

                                    switch (recurrenceType) {
                                        case 'daily': return daysDiff % interval === 0;
                                        case 'weekly': {
                                            const daysOfWeek = item.recurrence_days_of_week || item.recurrenceDaysOfWeek || [];
                                            if (daysOfWeek.length > 0) return daysOfWeek.includes(selectedDate.getDay());
                                            return daysDiff % (7 * interval) === 0;
                                        }
                                        case 'monthly': {
                                            const monthsDiff = (selectedDate.getFullYear() - eventDate.getFullYear()) * 12 + (selectedDate.getMonth() - eventDate.getMonth());
                                            return monthsDiff % interval === 0 && selectedDate.getDate() === eventDate.getDate();
                                        }
                                        case 'yearly': {
                                            const yearsDiff = selectedDate.getFullYear() - eventDate.getFullYear();
                                            return yearsDiff % interval === 0 && selectedDate.getMonth() === eventDate.getMonth() && selectedDate.getDate() === eventDate.getDate();
                                        }
                                        default: return false;
                                    }
                                };

                                // Get selected day's schedule items (including recurring)
                                const daySchedule = scheduleItems?.filter(item => {
                                    const timeValue = item.startTime || item.start_time;
                                    if (!timeValue) return false;
                                    const itemDate = new Date(timeValue);
                                    if (isNaN(itemDate.getTime())) return false; // Skip invalid dates

                                    // Use local date comparison (not UTC-based toISOString)
                                    const itemYear = itemDate.getFullYear();
                                    const itemMonth = itemDate.getMonth();
                                    const itemDay = itemDate.getDate();
                                    const selectedYear = selectedDate.getFullYear();
                                    const selectedMonth = selectedDate.getMonth();
                                    const selectedDay = selectedDate.getDate();
                                    const isSelectedDay = itemYear === selectedYear && itemMonth === selectedMonth && itemDay === selectedDay;

                                    return isSelectedDay || doesRecurOnSelectedDate(item);
                                }).map(item => {
                                    const recurrenceType = item.recurrence_type || item.recurrenceType || 'none';
                                    const originalTime = new Date(item.startTime || item.start_time);
                                    const adjustedTime = new Date(scheduleDate);
                                    adjustedTime.setHours(originalTime.getHours(), originalTime.getMinutes());
                                    return {
                                        ...item,
                                        displayTime: adjustedTime,
                                        isRecurring: recurrenceType !== 'none'
                                    };
                                }).sort((a, b) => a.displayTime - b.displayTime) || [];

                                if (daySchedule.length === 0) {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const isToday = selectedDate.getTime() === today.getTime();
                                    return (
                                        <div className="pl-10 text-gray-400 italic text-sm py-4">
                                            No schedule for {isToday ? 'today' : 'this day'}.
                                        </div>
                                    );
                                }

                                return daySchedule.map((item, i) => {
                                    // Calculate height based on duration (min: 60px for <30min, scales up)
                                    const duration = item.duration || 60;
                                    // Height formula: base 50px + 1.5px per minute, min 50px, max 200px
                                    const minHeight = Math.min(200, Math.max(50, 50 + (duration - 30) * 1.5));
                                    // Adjust padding based on height
                                    const paddingY = duration <= 30 ? 'py-2' : duration <= 60 ? 'py-3' : 'py-4';
                                    const paddingX = 'px-4';

                                    return (
                                        <div key={item.id || i} className="relative pl-10 group">
                                            {/* Timeline Dot */}
                                            <div className="absolute left-[11px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 z-10 bg-white"
                                                style={{ borderColor: item.color || '#6366f1' }}></div>

                                            <div
                                                onClick={() => {
                                                    setSelectedScheduleItem(item);
                                                    setShowScheduleModal(true);
                                                }}
                                                className={`${paddingX} ${paddingY} rounded-2xl transition-all hover:scale-[1.02] bg-gray-50 border border-gray-100 hover:border-indigo-200 hover:shadow-sm cursor-pointer flex items-center`}
                                                style={{ minHeight: `${minHeight}px` }}
                                            >
                                                <div className="flex justify-between items-start w-full">
                                                    <div className="flex-1">
                                                        <h3 className={`font-bold leading-tight text-gray-900 ${duration <= 30 ? 'text-base' : 'text-lg'}`}>
                                                            {item.title}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-1 text-gray-500">
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
                                                            <span className="text-xs text-gray-400">({duration} min)</span>
                                                            {item.isRecurring && (
                                                                <span className="text-xs text-indigo-500 px-1.5 py-0.5 bg-indigo-50 rounded-full">🔄</span>
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
                                                            className="p-1.5 rounded-lg bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors border border-gray-100 opacity-0 group-hover:opacity-100"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || '#6366f1' }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                });
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
                        className="bg-white/95 backdrop-blur-sm p-5 rounded-3xl shadow-sm hover:shadow transition-all flex items-center gap-4 relative overflow-hidden cursor-pointer border border-gray-100 hover:border-indigo-200 group"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none"></div>

                        <div className="shrink-0 w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Sun size={24} className="text-amber-600" />
                        </div>

                        <div className="relative z-10 flex-1">
                            <h3 className="font-bold text-lg text-gray-900">
                                Start Your Day
                            </h3>
                            <p className="text-gray-600 text-xs">
                                Set your 3 main goals and plan your focus for today
                            </p>
                        </div>

                        <div className="hidden md:flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-xl text-indigo-700 font-bold text-sm transition-all">
                            <span>Begin</span>
                            <ChevronRight size={14} />
                        </div>
                    </div>

                    {/* End the Day Widget */}
                    <div
                        onClick={onEndDay}
                        className="bg-white/95 backdrop-blur-sm p-5 rounded-3xl shadow-sm hover:shadow transition-all flex items-center gap-4 relative overflow-hidden cursor-pointer border border-gray-100 hover:border-indigo-200 group"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none"></div>

                        {/* Soft star decorations */}
                        <div className="absolute top-3 right-16 w-1.5 h-1.5 bg-indigo-300 rounded-full animate-pulse"></div>
                        <div className="absolute top-6 right-24 w-1.5 h-1.5 bg-indigo-200 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute bottom-4 right-12 w-1.5 h-1.5 bg-indigo-300 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>

                        <div className="shrink-0 w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Moon size={24} className="text-indigo-600" />
                        </div>

                        <div className="relative z-10 flex-1">
                            <h3 className="font-bold text-lg text-gray-900">
                                End Your Day
                            </h3>
                            <p className="text-gray-600 text-xs">
                                Reflect on achievements and set tomorrow's goals
                            </p>
                        </div>

                        <div className="hidden md:flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-xl text-indigo-700 font-bold text-sm transition-all">
                            <span>Reflect</span>
                            <ChevronRight size={14} />
                        </div>
                    </div>

                    {/* Vision Board Card */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden flex flex-col border border-gray-100">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-rose-50/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-50/30 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none"></div>

                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div className="flex items-center gap-3">
                                <Target className="text-rose-500" size={24} />
                                <h2 className="text-2xl font-bold text-gray-900">Vision Board (Today)</h2>
                            </div>
                            <button
                                onClick={onStartDay}
                                className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 rounded-lg text-rose-600 text-sm font-bold transition-colors"
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
                                    <div key={index} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-gray-500 text-sm italic flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
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
                                        className={`p-4 rounded-2xl flex items-center gap-3 transition-all hover:scale-[1.02] border cursor-pointer ${highlight.completed
                                            ? 'bg-gray-50 border-gray-100 text-gray-500'
                                            : 'bg-rose-50 border-rose-200 hover:border-rose-300 text-gray-800'
                                            }`}
                                    >
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${highlight.completed ? 'bg-indigo-500 text-white' : 'bg-white border-2 border-rose-300 hover:border-rose-400'
                                            }`}>
                                            {highlight.completed && <Check size={12} strokeWidth={3} />}
                                        </div>
                                        <span className={`font-medium text-sm ${highlight.completed ? 'line-through' : ''}`}>
                                            {highlight.text}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <button onClick={() => onNavigate('vision')} className="mt-4 text-gray-700 hover:text-gray-900 text-sm font-medium flex items-center gap-1 transition-colors">
                            Manage Goals <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Tasks Due Today Widget */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm flex flex-col relative overflow-hidden border border-gray-100">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-50/30 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Clock size={18} className="text-teal-600" /> Tasks Due Today
                            </h3>
                            <div className="relative">
                                <button
                                    ref={quickAddTaskButtonRef}
                                    onClick={() => setShowQuickAddTaskPopup(!showQuickAddTaskPopup)}
                                    className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-600 transition-all hover:scale-105"
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
                                        <div className="text-gray-400 text-sm italic text-center py-4">
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
                                        className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:border-teal-200 hover:shadow-sm transition-all group"
                                    >
                                        <div className={`w-2 h-2 rounded-full ${task.status === 'growing' ? 'bg-teal-500' : 'bg-gray-300'}`}></div>
                                        <span className="text-gray-800 text-sm font-medium flex-1 truncate">{task.title}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Delete "${task.title}"?`)) {
                                                    deleteTask(task.id);
                                                }
                                            }}
                                            className="p-1.5 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                            title="Delete"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                        <span className="text-gray-500 text-xs">
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
                key={selectedTask?.id || 'new'}
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
                initialData={selectedTask}
                mode={selectedTask ? 'edit' : 'create'}
            />

            {/* Agent Confirmation Modal */}
            <AgentConfirmationModal
                isOpen={showAgentModal}
                onClose={() => {
                    setShowAgentModal(false);
                    setAgentPlan(null);
                    setClarifyConversation([]);
                    setPendingClarify(null);
                    setOriginalPrompt('');
                }}
                onConfirm={executeAgentActions}
                onClarifyResponse={(response) => {
                    setShowAgentModal(false);
                    handleMagicBoxSubmit(response);
                }}
                onEditPrompt={(newPrompt) => {
                    setShowAgentModal(false);
                    setOriginalPrompt(newPrompt);
                    handleMagicBoxSubmit(newPrompt);
                }}
                onNavigate={onNavigate}
                actionPlan={agentPlan}
                isExecuting={isExecutingActions}
                originalPrompt={originalPrompt}
            />
        </div>
    );
};

export default Overview;
