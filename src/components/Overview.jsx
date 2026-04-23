import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, Calendar, ChevronLeft, ChevronRight, Plus, Flame, Check, Trash2, Mic, MicOff, Loader2, X, Sparkles, AlertTriangle, FileText, Lightbulb } from 'lucide-react';
import { useTask } from '../context/TaskContext';
import { useGoal } from '../context/GoalContext';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useAgentMemory } from '../context/AgentMemoryContext';
import { useProject } from '../context/ProjectContext';
import { useHabit } from '../context/HabitContext';
import { useChatContext } from '../context/ChatContext';
import { useIdeaBoard } from '../context/IdeaBoardContext';
import { parseTaskInput, routeAgentCommand } from '../services/aiClient';
import { canHandleLocally, generateLocalResponse, getCachedResponse, cacheResponse, generateCacheKey } from '../services/localAgentHandler';
import { generateProactiveSuggestions } from '../services/proactiveEngine';
import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences';
import { getTaskCompletionTimestamp, isTaskActive } from '../utils/taskState';
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


const CurrentEventWidget = ({ scheduleItems, habitItems }) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000 * 60); // Update every minute
        return () => clearInterval(timer);
    }, []);

    const { currentEvent, nextEvent, progress } = useMemo(() => {
        const now = currentTime;
        const todayEvents = getScheduleItemsForDate(scheduleItems || [], now).map((item) => ({
            ...item,
            adjustedStart: item.displayTime || new Date(item.startTime || item.start_time)
        }));

        const active = todayEvents.find((item) => {
            const duration = item.duration || 60;
            const itemEnd = new Date(item.adjustedStart.getTime() + duration * 60000);
            return now >= item.adjustedStart && now < itemEnd;
        });

        // If no active schedule event, check habits
        const activeHabit = !active && habitItems ? habitItems.find(h => {
            if (!h.startTime) return false;
            const itemStart = new Date(h.startTime);
            const duration = h.duration || 30;
            const itemEnd = new Date(itemStart.getTime() + duration * 60000);
            return now >= itemStart && now < itemEnd;
        }) : null;

        const activeItem = active || activeHabit;

        if (activeItem) {
            const isHabitEvent = !!activeHabit;
            const start = isHabitEvent
                ? new Date(activeItem.startTime)
                : activeItem.adjustedStart;

            const duration = activeItem.duration || (isHabitEvent ? 30 : 60);
            const end = new Date(start.getTime() + duration * 60000);
            const totalDuration = end.getTime() - start.getTime();
            const elapsed = now.getTime() - start.getTime();
            const prog = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

            const derivedCurrentEvent = {
                ...activeItem,
                displayStart: start,
                displayEnd: end,
                isHabit: !!isHabitEvent,
            };

            const allUpcoming = [...todayEvents.filter((item) => item.adjustedStart > now)];
            if (habitItems) {
                habitItems.forEach(h => {
                    if (h.startTime) {
                        const hStart = new Date(h.startTime);
                        if (hStart > now) {
                            allUpcoming.push({ ...h, adjustedStart: hStart, isHabit: true });
                        }
                    }
                });
            }
            allUpcoming.sort((a, b) => a.adjustedStart - b.adjustedStart);

            return {
                currentEvent: derivedCurrentEvent,
                nextEvent: allUpcoming[0] || null,
                progress: prog
            };
        }

        const allUpcoming = [...todayEvents.filter((item) => item.adjustedStart > now)];
        if (habitItems) {
            habitItems.forEach(h => {
                if (h.startTime) {
                    const hStart = new Date(h.startTime);
                    if (hStart > now) {
                        allUpcoming.push({ ...h, adjustedStart: hStart, isHabit: true });
                    }
                }
            });
        }
        allUpcoming.sort((a, b) => a.adjustedStart - b.adjustedStart);

        return {
            currentEvent: null,
            nextEvent: allUpcoming[0] || null,
            progress: 0
        };
    }, [currentTime, habitItems, scheduleItems]);



    return (
        <div className="bg-white p-6 rounded-[2rem] shadow-sm relative overflow-hidden group border border-gray-100">
            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-50/30 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none"></div>

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                            <Clock size={14} className={currentEvent?.isHabit ? 'text-teal-500' : 'text-indigo-500'} />
                            {currentEvent ? (currentEvent.isHabit ? 'Current Habit' : 'Now Happening') : 'Current Status'}
                        </h3>
                        <div className="text-3xl font-bold text-gray-900 mt-1 font-mono">
                            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                    {currentEvent && (
                        <div className={`px-3 py-1 rounded-full text-xs font-bold border ${currentEvent.isHabit ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-indigo-50 text-indigo-600 border-indigo-100'}`}>
                            {currentEvent.isHabit ? 'Habit' : 'On Track'}
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
                                className={`h-full ${currentEvent.isHabit ? 'bg-teal-500' : 'bg-indigo-500'}`}
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
                                    <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wide">
                                        {nextEvent.isHabit ? 'Up Next (Habit)' : 'Up Next'}
                                    </p>
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

const sortTasksByDeadline = (left, right) => {
    const leftTime = left.deadline ? new Date(left.deadline).getTime() : Number.POSITIVE_INFINITY;
    const rightTime = right.deadline ? new Date(right.deadline).getTime() : Number.POSITIVE_INFINITY;
    return leftTime - rightTime;
};

const getTaskUrgencyMeta = (task, now, todayStart, todayEnd) => {
    const deadline = task?.deadline ? new Date(task.deadline) : null;
    if (!deadline || Number.isNaN(deadline.getTime())) {
        return {
            label: 'No date',
            badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
        };
    }

    if (deadline < todayStart) {
        return {
            label: 'Overdue',
            badgeClass: 'bg-rose-50 text-rose-600 border border-rose-200',
        };
    }

    if (deadline >= todayStart && deadline < todayEnd) {
        return {
            label: 'Today',
            badgeClass: 'bg-amber-50 text-amber-700 border border-amber-200',
        };
    }

    if ((deadline - now) / (1000 * 60 * 60) <= 72) {
        return {
            label: 'Soon',
            badgeClass: 'bg-indigo-50 text-indigo-600 border border-indigo-200',
        };
    }

    return {
        label: 'Upcoming',
        badgeClass: 'bg-slate-100 text-slate-600 border border-slate-200',
    };
};

const getMinutesBetween = (start, end) => (
    Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
);

const formatMinutesLabel = (minutes) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const getDifficultyWeight = (difficulty) => {
    switch (String(difficulty || '').toLowerCase()) {
        case 'easy':
            return 12;
        case 'medium':
            return 6;
        case 'hard':
            return 0;
        default:
            return 4;
    }
};

const scoreTaskForWindow = (task, now, todayStart, todayEnd, availableMinutes = 0) => {
    const urgency = getTaskUrgencyMeta(task, now, todayStart, todayEnd);
    let score = 0;

    switch (urgency.label) {
        case 'Overdue':
            score += 120;
            break;
        case 'Today':
            score += 90;
            break;
        case 'Soon':
            score += 60;
            break;
        default:
            score += 25;
            break;
    }

    const estimatedMinutes = Number(task.estimatedTime ?? task.estimated_time ?? 0);
    if (availableMinutes > 0) {
        if (estimatedMinutes > 0 && estimatedMinutes <= availableMinutes + 10) {
            score += 24;
        } else if (estimatedMinutes > availableMinutes && availableMinutes <= 90) {
            score -= 16;
        } else if (!estimatedMinutes) {
            score += 8;
        }
    }

    if (availableMinutes > 0 && availableMinutes <= 45) {
        score += getDifficultyWeight(task.difficulty);
    } else {
        score += Math.round(getDifficultyWeight(task.difficulty) / 2);
    }

    if (task.deadline) {
        const hoursUntilDeadline = (new Date(task.deadline).getTime() - now.getTime()) / 3600000;
        if (hoursUntilDeadline <= 6) score += 18;
        else if (hoursUntilDeadline <= 24) score += 10;
    }

    return score;
};

const pickBestTaskForWindow = (tasks, now, todayStart, todayEnd, availableMinutes = 0) => (
    [...tasks]
        .sort((left, right) => (
            scoreTaskForWindow(right, now, todayStart, todayEnd, availableMinutes) -
            scoreTaskForWindow(left, now, todayStart, todayEnd, availableMinutes)
        ))[0] || null
);

const getIdeaDepth = (nodes, node) => {
    let depth = 0;
    let currentParentId = node?.parentId || null;

    while (currentParentId) {
        const parent = nodes.find((candidate) => candidate.id === currentParentId);
        if (!parent) break;
        depth += 1;
        currentParentId = parent.parentId;
    }

    return depth;
};

// Quick Schedule Widget Component (Popup Version)
const QuickScheduleWidget = ({ addScheduleItem, isOpen, onClose, buttonRef, popupStyle }) => {
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

    return createPortal(
        <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            style={popupStyle || undefined}
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
const QuickAddTaskWidget = ({ addTask, isOpen, onClose, buttonRef, popupStyle }) => {
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

    return createPortal(
        <motion.div
            ref={popupRef}
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            style={popupStyle || undefined}
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

const Overview = ({ onNavigate }) => {
    const { tasks, addTask, updateTask, deleteTask, completeTask, scheduleItems, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useTask();
    const { dailyHighlights, goals } = useGoal();
    const { user } = useAuth();
    const { profile, getProfileSummary } = useUserProfile();
    const { logInteraction, getMemorySummary, getRecentInteractions, generatePatternInsights } = useAgentMemory();
    const { projects } = useProject();
    const { habits, logHabit, getHabitsForDate, getHabitLog, getHabitNoteHistory } = useHabit();
    const { sendMessage, openSidebar } = useChatContext();
    const { nodes: ideaNodes } = useIdeaBoard();

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedScheduleItem, setSelectedScheduleItem] = useState(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showQuickSchedulePopup, setShowQuickSchedulePopup] = useState(false);
    const [showQuickAddTaskPopup, setShowQuickAddTaskPopup] = useState(false);
    const quickScheduleButtonRef = useRef(null);
    const quickAddTaskButtonRef = useRef(null);
    const [quickSchedulePopupStyle, setQuickSchedulePopupStyle] = useState(null);
    const [quickAddTaskPopupStyle, setQuickAddTaskPopupStyle] = useState(null);
    const [scheduleDate, setScheduleDate] = useState(new Date()); // Date for schedule navigation
    const [nowTick, setNowTick] = useState(Date.now());

    // Agent state (kept for backward compatibility with existing modals)
    const [agentPlan, setAgentPlan] = useState(null);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [isExecutingActions, setIsExecutingActions] = useState(false);
    const [originalPrompt, setOriginalPrompt] = useState('');

    // Clarify conversation state (for iterative prompting)
    const [clarifyConversation, setClarifyConversation] = useState([]);

    // Proactive suggestions state
    const [proactiveSuggestions, setProactiveSuggestions] = useState([]);
    const [dismissedSuggestions, setDismissedSuggestions] = useState([]);

    const now = useMemo(() => new Date(nowTick), [nowTick]);
    const todayStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now]);
    const todayEnd = useMemo(() => {
        const end = new Date(todayStart);
        end.setDate(end.getDate() + 1);
        return end;
    }, [todayStart]);
    const activeTasks = useMemo(() => (tasks || []).filter(isTaskActive), [tasks]);

    // Handler to route actions through chat
    const handleChatAction = (action) => {
        sendMessage(action);
        openSidebar();
    };

    const openTaskEditor = (task) => {
        setSelectedTask(task);
        setShowTaskModal(true);
    };

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNowTick(Date.now());
        }, 60000);

        return () => window.clearInterval(timer);
    }, []);

    // Generate proactive suggestions
    useEffect(() => {
        if (profile?.preferences?.proactiveSuggestions === false) return;

        const suggestions = generateProactiveSuggestions({
            tasks,
            schedule: scheduleItems,
            habits,
            profile,
            currentTime: new Date().toISOString()
        });

        // Filter out dismissed suggestions
        const filtered = suggestions.filter(s => !dismissedSuggestions.includes(s.id));
        setProactiveSuggestions(filtered);
    }, [tasks, scheduleItems, habits, profile, dismissedSuggestions]);

    const handleDismissSuggestion = (suggestionId) => {
        setDismissedSuggestions(prev => [...prev, suggestionId]);
    };

    const getPopupStyle = (buttonRef) => {
        const buttonRect = buttonRef?.current?.getBoundingClientRect();
        if (!buttonRect) {
            return null;
        }

        return {
            position: 'fixed',
            top: buttonRect.bottom + 8,
            right: window.innerWidth - buttonRect.right,
            zIndex: 99999
        };
    };
    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
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

    const todaySchedule = useMemo(() => (
        getScheduleItemsForDate(scheduleItems || [], now)
    ), [now, scheduleItems]);

    const todaysHabits = useMemo(() => (
        getHabitsForDate(now)
    ), [getHabitsForDate, now]);

    const todayPendingHabits = useMemo(() => {
        const todayKey = toLocalDateKey(now);

        return todaysHabits
            .map((habit) => {
                const log = getHabitLog(habit.id, todayKey);
                const [hours, minutes] = habit.reminder_time
                    ? habit.reminder_time.split(':').map(Number)
                    : [null, null];

                const reminderDate = Number.isInteger(hours) && Number.isInteger(minutes)
                    ? new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0)
                    : null;

                return {
                    ...habit,
                    log,
                    reminderDate,
                    completed: log?.completed === true,
                };
            })
            .filter((habit) => !habit.completed);
    }, [getHabitLog, now, todaysHabits]);

    const todayTimelineItems = useMemo(() => {
        const scheduleTimelineItems = todaySchedule.map((item) => {
            const start = item.displayTime || new Date(item.startTime || item.start_time);
            const duration = item.duration || 60;
            const end = new Date(start.getTime() + duration * 60000);
            return {
                id: `schedule_${item.id}_${item._occurrenceDate || toLocalDateKey(now)}`,
                type: 'schedule',
                title: item.title,
                start,
                end,
                duration,
                source: item,
            };
        });

        const habitTimelineItems = todayPendingHabits
            .filter((habit) => habit.reminderDate)
            .map((habit) => {
                const duration = habit.type === 'duration' ? (habit.target || 30) : 30;
                const end = new Date(habit.reminderDate.getTime() + duration * 60000);
                return {
                    id: `habit_${habit.id}`,
                    type: 'habit',
                    title: habit.name,
                    start: habit.reminderDate,
                    end,
                    duration,
                    source: habit,
                };
            });

        return [...scheduleTimelineItems, ...habitTimelineItems]
            .sort((left, right) => left.start.getTime() - right.start.getTime());
    }, [now, todayPendingHabits, todaySchedule]);

    const timeGaps = useMemo(() => {
        const endOfDay = new Date(todayStart);
        endOfDay.setHours(23, 0, 0, 0);
        let cursor = new Date(now);
        const gaps = [];

        todayTimelineItems
            .filter((item) => item.end > now)
            .forEach((item) => {
                if (item.start > cursor) {
                    const minutes = getMinutesBetween(cursor, item.start);
                    if (minutes >= 15) {
                        gaps.push({
                            start: new Date(cursor),
                            end: new Date(item.start),
                            minutes,
                        });
                    }
                }

                if (item.end > cursor) {
                    cursor = new Date(item.end);
                }
            });

        if (endOfDay > cursor) {
            const minutes = getMinutesBetween(cursor, endOfDay);
            if (minutes >= 15) {
                gaps.push({
                    start: new Date(cursor),
                    end: endOfDay,
                    minutes,
                });
            }
        }

        return gaps.slice(0, 4);
    }, [now, todayStart, todayTimelineItems]);

    const nextBestAction = useMemo(() => {
        const nextGap = timeGaps[0] || null;
        const bestTask = pickBestTaskForWindow(activeTasks, now, todayStart, todayEnd, nextGap?.minutes || 0);
        const overdueHabit = todayPendingHabits.find((habit) => habit.reminderDate && habit.reminderDate <= now);
        const unscheduledHabit = todayPendingHabits.find((habit) => !habit.reminderDate);
        const spotlightIdea = [...(ideaNodes || [])]
            .sort((left, right) => {
                if (left.focused !== right.focused) return left.focused ? -1 : 1;
                if (left.completed !== right.completed) return left.completed ? 1 : -1;
                return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
            })[0] || null;

        if (bestTask) {
            const urgency = getTaskUrgencyMeta(bestTask, now, todayStart, todayEnd);
            const estimatedMinutes = Number(bestTask.estimatedTime ?? bestTask.estimated_time ?? 0);
            return {
                type: 'task',
                title: bestTask.title,
                eyebrow: 'Next Best Action',
                description: nextGap
                    ? `You have ${formatMinutesLabel(nextGap.minutes)} free before ${nextGap.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. ${estimatedMinutes ? `Estimated ${formatMinutesLabel(estimatedMinutes)}.` : 'This looks like a good fit.'}`
                    : `Best task to tackle next based on urgency. ${estimatedMinutes ? `Estimated ${formatMinutesLabel(estimatedMinutes)}.` : ''}`,
                meta: urgency.label,
                task: bestTask,
            };
        }

        if (overdueHabit || unscheduledHabit) {
            const habit = overdueHabit || unscheduledHabit;
            return {
                type: 'habit',
                title: habit.name,
                eyebrow: 'Next Best Action',
                description: overdueHabit
                    ? `This habit reminder already passed at ${habit.reminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`
                    : 'A simple remaining habit is a good reset before you add more tasks.',
                meta: overdueHabit ? 'Habit overdue' : 'Habit remaining',
                habit,
            };
        }

        if (spotlightIdea) {
            return {
                type: 'idea',
                title: spotlightIdea.title,
                eyebrow: 'Next Best Action',
                description: spotlightIdea.details?.trim()
                    ? spotlightIdea.details
                    : 'No urgent work is blocking you. This is a good time to continue an idea branch.',
                meta: spotlightIdea.focused ? 'Focused idea' : 'Idea spotlight',
                idea: spotlightIdea,
            };
        }

        return null;
    }, [activeTasks, ideaNodes, now, timeGaps, todayEnd, todayPendingHabits, todayStart]);

    const attentionItems = useMemo(() => {
        const overdueTaskItems = activeTasks
            .filter((task) => task.deadline && new Date(task.deadline) < todayStart)
            .sort(sortTasksByDeadline)
            .slice(0, 3)
            .map((task) => ({
                id: `task_${task.id}`,
                type: 'task',
                severity: 'high',
                title: task.title,
                subtitle: `Overdue since ${new Date(task.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
                task,
            }));

        const overdueHabitItems = todayPendingHabits
            .filter((habit) => habit.reminderDate && habit.reminderDate < now)
            .slice(0, 2)
            .map((habit) => ({
                id: `habit_${habit.id}`,
                type: 'habit',
                severity: 'medium',
                title: habit.name,
                subtitle: `Habit reminder passed at ${habit.reminderDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                habit,
            }));

        const conflictItems = [];
        for (let index = 1; index < todayTimelineItems.length; index += 1) {
            const previous = todayTimelineItems[index - 1];
            const current = todayTimelineItems[index];
            if (current.start < previous.end) {
                conflictItems.push({
                    id: `conflict_${previous.id}_${current.id}`,
                    type: 'conflict',
                    severity: 'medium',
                    title: 'Schedule conflict',
                    subtitle: `${previous.title} overlaps with ${current.title}`,
                });
            }
        }

        const severityOrder = { high: 0, medium: 1, low: 2 };
        return [...overdueTaskItems, ...overdueHabitItems, ...conflictItems]
            .sort((left, right) => severityOrder[left.severity] - severityOrder[right.severity])
            .slice(0, 5);
    }, [activeTasks, now, todayPendingHabits, todayStart, todayTimelineItems]);

    const recentHabitNotes = useMemo(() => (
        (habits || [])
            .flatMap((habit) => (
                getHabitNoteHistory(habit.id).slice(0, 4).map((entry) => ({
                    id: `${habit.id}_${entry.date}`,
                    habitId: habit.id,
                    habitName: habit.name,
                    habitIcon: habit.icon || '🌱',
                    date: entry.date,
                    notes: entry.notes,
                }))
            ))
            .sort((left, right) => new Date(`${right.date}T12:00:00`) - new Date(`${left.date}T12:00:00`))
            .slice(0, 5)
    ), [getHabitNoteHistory, habits]);

    const ideaSpotlight = useMemo(() => {
        const childCountById = Object.create(null);
        (ideaNodes || []).forEach((node) => {
            if (!node.parentId) return;
            childCountById[node.parentId] = (childCountById[node.parentId] || 0) + 1;
        });

        return [...(ideaNodes || [])]
            .sort((left, right) => {
                if (left.focused !== right.focused) return left.focused ? -1 : 1;
                if (left.completed !== right.completed) return left.completed ? 1 : -1;
                return new Date(right.createdAt || 0) - new Date(left.createdAt || 0);
            })
            .slice(0, 3)
            .map((node) => ({
                ...node,
                depth: getIdeaDepth(ideaNodes || [], node),
                branchCount: childCountById[node.id] || 0,
            }));
    }, [ideaNodes]);

    const todaySummary = useMemo(() => {
        const today = now;
        const todayStr = toLocalDateKey(today);
        const eventsToday = todaySchedule.length;

        const totalHabits = todaysHabits.length;
        const completedHabits = todaysHabits.filter((habit) => (
            getHabitLog(habit.id, todayStr)?.completed
        )).length;
        const habitsLeft = Math.max(0, totalHabits - completedHabits);

        const calculateStreak = () => {
            let streak = 0;
            const checkDate = new Date();

            for (let i = 0; i < 365; i++) {
                const dateStr = toLocalDateKey(checkDate);
                const hasActivity =
                    (dailyHighlights && Object.keys(dailyHighlights).some(key => key.startsWith(dateStr))) ||
                    (tasks && tasks.some(t => {
                        const completedAt = getTaskCompletionTimestamp(t);
                        return completedAt && toLocalDateKey(completedAt) === dateStr;
                    }));

                if (hasActivity) {
                    streak++;
                    checkDate.setDate(checkDate.getDate() - 1);
                } else {
                    break;
                }
            }
            return streak;
        };

        const overdueTasks = activeTasks.filter((task) => (
            task.deadline && new Date(task.deadline) < todayStart
        )).length;
        return {
            eventsToday,
            habitCompletion: { completed: completedHabits, total: totalHabits },
            habitsLeft,
            streakDays: calculateStreak(),
            overdueTasks
        };
    }, [activeTasks, dailyHighlights, getHabitLog, now, tasks, todaySchedule, todayStart, todaysHabits]);

    const priorityTasks = useMemo(() => {
        const threeDaysFromNow = new Date(todayEnd);
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 2);

        const scheduledActiveTasks = activeTasks
            .filter((task) => task.deadline)
            .sort(sortTasksByDeadline);

        const overdue = scheduledActiveTasks.filter((task) => new Date(task.deadline) < todayStart);
        const dueToday = scheduledActiveTasks.filter((task) => {
            const deadline = new Date(task.deadline);
            return deadline >= todayStart && deadline < todayEnd;
        });
        const upcoming = scheduledActiveTasks.filter((task) => {
            const deadline = new Date(task.deadline);
            return deadline >= todayEnd && deadline <= threeDaysFromNow;
        });

        return [...overdue, ...dueToday, ...upcoming].slice(0, 6);
    }, [activeTasks, todayEnd, todayStart]);

    // Handle Magic Box submission
    const handleMagicBoxSubmit = async (input) => {
        // Track original prompt for edit functionality (only set on first submit)
        if (!originalPrompt) {
            setOriginalPrompt(input);
        }
        try {
            const today = new Date();
            const todaySchedule = getScheduleItemsForDate(scheduleItems || [], today);

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
                recentTasks: tasks?.filter(isTaskActive).slice(0, 15) || [],
                // Tasks due today for overview
                tasksDueToday: tasks?.filter(t => {
                    if (!isTaskActive(t)) return false;
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
                    completedToday: h.completedToday === true
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
                setClarifyConversation(prev => [...prev, { input, response: clarifyAction.params.question }]);
                setAgentPlan(plan);
                setShowAgentModal(true);
            } else {
                // Normal action plan - log and show confirmation
                setAgentPlan(plan);
                setShowAgentModal(true);
                // Clear conversation history since we got a concrete plan
                setClarifyConversation([]);
            }
        } catch (error) {
            console.error('Error processing Magic Box input:', error);
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
                            await completeTask(action.params.taskId);
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
                            const today = toLocalDateKey(new Date());
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
                        <span className="text-2xl font-bold text-purple-600">{todaySummary.eventsToday}</span>
                        <span className="text-xs text-gray-600 uppercase font-bold">Events Today</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow transition-shadow flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-teal-600">{todaySummary.habitsLeft}</span>
                        <span className="text-xs text-gray-600 uppercase font-bold">Habits Left</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow transition-shadow flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-orange-600 flex items-center gap-1">
                            {todaySummary.streakDays} <span className="text-sm">🔥</span>
                        </span>
                        <span className="text-xs text-gray-600 uppercase font-bold">Streak</span>
                    </div>
                    <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm hover:shadow transition-shadow flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-red-600">{todaySummary.overdueTasks}</span>
                        <span className="text-xs text-gray-600 uppercase font-bold">Overdue</span>
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
                                    <h2 className="text-xl font-bold text-gray-900 mx-2 text-center flex-1">
                                        {(() => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            const selected = new Date(scheduleDate);
                                            selected.setHours(0, 0, 0, 0);
                                            const diffDays = Math.round((selected - today) / (1000 * 60 * 60 * 24));

                                            if (diffDays === 0) return "Today's Schedule";
                                            if (diffDays === 1) return "Tomorrow's Schedule";
                                            if (diffDays === -1) return "Yesterday's Schedule";
                                            return `${scheduleDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} Schedule`;
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
                                        onClick={() => {
                                            if (showQuickSchedulePopup) {
                                                setShowQuickSchedulePopup(false);
                                                setQuickSchedulePopupStyle(null);
                                                return;
                                            }

                                            setQuickSchedulePopupStyle(getPopupStyle(quickScheduleButtonRef));
                                            setShowQuickSchedulePopup(true);
                                        }}
                                        className="p-2 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-600 transition-all hover:scale-105"
                                        title="Quick Add Schedule"
                                    >
                                        <Plus size={18} />
                                    </button>
                                    <QuickScheduleWidget
                                        addScheduleItem={addScheduleItem}
                                        isOpen={showQuickSchedulePopup}
                                        onClose={() => {
                                            setShowQuickSchedulePopup(false);
                                            setQuickSchedulePopupStyle(null);
                                        }}
                                        buttonRef={quickScheduleButtonRef}
                                        popupStyle={quickSchedulePopupStyle}
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
                                const daySchedule = getScheduleItemsForDate(scheduleItems || [], selectedDate);
                                const sortedSchedule = [...daySchedule].sort((a, b) => a.displayTime - b.displayTime);

                                if (sortedSchedule.length === 0) {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0);
                                    const isToday = selectedDate.getTime() === today.getTime();
                                    return (
                                        <div className="pl-10 text-gray-400 italic text-sm py-4">
                                            No schedule for {isToday ? 'today' : 'this day'}.
                                        </div>
                                    );
                                }

                                return sortedSchedule.map((item, i) => {
                                    // Calculate height based on duration (min: 60px for <30min, scales up)
                                    const duration = item.duration || 60;
                                    const paddingX = 'px-4';

                                    return (
                                        <div key={item.id || i} className="relative pl-10 group flex items-center">
                                            {/* Timeline Dot (Centered to card) */}
                                            <div className={`absolute left-[11px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 z-10 bg-white`}
                                                style={{ borderColor: item.color || '#6366f1' }}></div>

                                            <div
                                                onClick={() => {
                                                    setSelectedScheduleItem(item);
                                                    setShowScheduleModal(true);
                                                }}
                                                className={`w-full ${paddingX} py-3 rounded-2xl transition-all hover:scale-[1.02] border border-transparent bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05),_0_0_2px_rgba(0,0,0,0.02)] hover:shadow-md cursor-pointer flex items-center`}
                                            >
                                                <div className="flex justify-between items-center w-full">
                                                    <div className="flex-1">
                                                        <h3 className={`font-bold leading-tight text-gray-900 text-base flex items-center gap-1.5`}>
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
                        <CurrentEventWidget
                            scheduleItems={scheduleItems}
                            habitItems={todayPendingHabits
                                .filter((habit) => habit.reminderDate)
                                .map((habit) => ({
                                    id: `habit_${habit.id}`,
                                    title: `${habit.icon || '✨'} ${habit.name}`,
                                    startTime: habit.reminderDate.toISOString(),
                                    duration: habit.type === 'duration' ? (habit.target || 30) : 30,
                                    isHabit: true,
                                    completed: false,
                                }))}
                        />
                    </div>

                    {/* Next Best Action */}
                    <div className="md:col-span-2 bg-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden border border-gray-100">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-50/50 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-28 h-28 bg-indigo-50/30 rounded-full blur-2xl -ml-6 -mb-6 pointer-events-none"></div>

                        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-2xl bg-indigo-50 text-indigo-600">
                                        <Zap size={18} />
                                    </div>
                                    <div>
                                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
                                            {nextBestAction?.eyebrow || 'Next Best Action'}
                                        </div>
                                        <h3 className="text-2xl font-bold text-gray-900 mt-1">
                                            {nextBestAction?.title || 'You have room to choose intentionally'}
                                        </h3>
                                    </div>
                                </div>
                                <p className="mt-4 text-sm text-gray-600 max-w-2xl">
                                    {nextBestAction?.description || 'No urgent items are pushing right now. This is a good time to clean up, capture an idea, or reset your priorities.'}
                                </p>
                            </div>

                            {nextBestAction?.meta && (
                                <div className="self-start px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold border border-indigo-100">
                                    {nextBestAction.meta}
                                </div>
                            )}
                        </div>

                        <div className="relative z-10 mt-5 flex flex-wrap items-center gap-3">
                            {nextBestAction?.type === 'task' && (
                                <>
                                    <button
                                        onClick={() => openTaskEditor(nextBestAction.task)}
                                        className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                                    >
                                        Open task
                                    </button>
                                    <button
                                        onClick={() => onNavigate('garden')}
                                        className="px-4 py-2 rounded-xl bg-indigo-50 text-indigo-600 text-sm font-semibold hover:bg-indigo-100 transition-colors"
                                    >
                                        View tasks
                                    </button>
                                </>
                            )}
                            {nextBestAction?.type === 'habit' && (
                                <>
                                    <button
                                        onClick={() => logHabit(
                                            nextBestAction.habit.id,
                                            toLocalDateKey(now),
                                            nextBestAction.habit.type === 'count' || nextBestAction.habit.type === 'duration'
                                                ? (nextBestAction.habit.target || 1)
                                                : 1,
                                            true
                                        )}
                                        className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
                                    >
                                        Mark done
                                    </button>
                                    <button
                                        onClick={() => onNavigate('habits')}
                                        className="px-4 py-2 rounded-xl bg-teal-50 text-teal-700 text-sm font-semibold hover:bg-teal-100 transition-colors"
                                    >
                                        Open habits
                                    </button>
                                </>
                            )}
                            {nextBestAction?.type === 'idea' && (
                                <button
                                    onClick={() => onNavigate('ideas')}
                                    className="px-4 py-2 rounded-xl bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
                                >
                                    Open ideas
                                </button>
                            )}
                            {!nextBestAction && (
                                <button
                                    onClick={() => onNavigate('ideas')}
                                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors"
                                >
                                    Open ideas board
                                </button>
                            )}
                        </div>
                    </div>

                    {/* What Needs Attention */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden border border-gray-100 flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50/50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="relative z-10 flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-2xl bg-rose-50 text-rose-600">
                                <AlertTriangle size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">What Needs Attention</h3>
                                <p className="text-xs text-gray-500">One place for overdue work, late habits, and collisions.</p>
                            </div>
                        </div>

                        <div className="space-y-3 flex-1 relative z-10">
                            {attentionItems.length === 0 && (
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                    Nothing looks urgent right now.
                                </div>
                            )}

                            {attentionItems.map((item) => (
                                <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3 flex items-center gap-3">
                                    <div className={`w-2.5 h-2.5 rounded-full ${item.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-semibold text-gray-900 truncate">{item.title}</div>
                                        <div className="text-xs text-gray-500 mt-0.5 truncate">{item.subtitle}</div>
                                    </div>
                                    {item.type === 'task' && (
                                        <button
                                            onClick={() => openTaskEditor(item.task)}
                                            className="px-3 py-1.5 rounded-xl bg-white text-sm font-medium text-rose-600 border border-rose-100 hover:bg-rose-50 transition-colors"
                                        >
                                            Open
                                        </button>
                                    )}
                                    {item.type === 'habit' && (
                                        <button
                                            onClick={() => logHabit(
                                                item.habit.id,
                                                toLocalDateKey(now),
                                                item.habit.type === 'count' || item.habit.type === 'duration'
                                                    ? (item.habit.target || 1)
                                                    : 1,
                                                true
                                            )}
                                            className="px-3 py-1.5 rounded-xl bg-white text-sm font-medium text-teal-600 border border-teal-100 hover:bg-teal-50 transition-colors"
                                        >
                                            Done
                                        </button>
                                    )}
                                    {item.type === 'conflict' && (
                                        <button
                                            onClick={() => onNavigate('schedule')}
                                            className="px-3 py-1.5 rounded-xl bg-white text-sm font-medium text-indigo-600 border border-indigo-100 hover:bg-indigo-50 transition-colors"
                                        >
                                            View
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Time Gap Finder */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden border border-gray-100 flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50/50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="relative z-10 flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-2xl bg-sky-50 text-sky-600">
                                <Clock size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Time Gap Finder</h3>
                                <p className="text-xs text-gray-500">Free windows for the rest of today.</p>
                            </div>
                        </div>

                        <div className="space-y-3 flex-1 relative z-10">
                            {timeGaps.length === 0 && (
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                    No clear free windows left today.
                                </div>
                            )}

                            {timeGaps.slice(0, 3).map((gap, index) => {
                                const suggestedTask = pickBestTaskForWindow(activeTasks, now, todayStart, todayEnd, gap.minutes);
                                return (
                                    <div key={`${gap.start.toISOString()}_${index}`} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {gap.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {gap.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                <div className="text-xs text-sky-600 font-semibold mt-1">{formatMinutesLabel(gap.minutes)} free</div>
                                            </div>
                                            {suggestedTask ? (
                                                <button
                                                    onClick={() => openTaskEditor(suggestedTask)}
                                                    className="px-3 py-1.5 rounded-xl bg-white text-sm font-medium text-sky-700 border border-sky-100 hover:bg-sky-50 transition-colors"
                                                >
                                                    Use it
                                                </button>
                                            ) : null}
                                        </div>

                                        <div className="mt-3 text-sm text-gray-600">
                                            {suggestedTask
                                                ? `Best fit: ${suggestedTask.title}`
                                                : 'Good slot for quick recovery, notes, or a short idea session.'}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Priority Tasks Widget */}
                    <div className="bg-white p-6 rounded-[2rem] shadow-sm flex flex-col relative overflow-hidden border border-gray-100">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-50/30 rounded-full blur-xl -ml-6 -mb-6 pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Clock size={18} className="text-teal-600" /> Priority Tasks
                            </h3>
                            <div className="relative">
                                <button
                                    ref={quickAddTaskButtonRef}
                                    onClick={() => {
                                        if (showQuickAddTaskPopup) {
                                            setShowQuickAddTaskPopup(false);
                                            setQuickAddTaskPopupStyle(null);
                                            return;
                                        }

                                        setQuickAddTaskPopupStyle(getPopupStyle(quickAddTaskButtonRef));
                                        setShowQuickAddTaskPopup(true);
                                    }}
                                    className="p-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-600 transition-all hover:scale-105"
                                    title="Quick Add Task"
                                >
                                    <Plus size={16} />
                                </button>
                                <QuickAddTaskWidget
                                    addTask={addTask}
                                    isOpen={showQuickAddTaskPopup}
                                    onClose={() => {
                                        setShowQuickAddTaskPopup(false);
                                        setQuickAddTaskPopupStyle(null);
                                    }}
                                    buttonRef={quickAddTaskButtonRef}
                                    popupStyle={quickAddTaskPopupStyle}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-3 relative z-10">
                            Overdue first, then due today, then the next few days.
                        </p>
                        <div className="flex-1 space-y-2 overflow-y-auto max-h-[200px] custom-scrollbar">
                            {(() => {
                                const now = new Date();
                                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                                const todayEnd = new Date(todayStart);
                                todayEnd.setDate(todayEnd.getDate() + 1);

                                if (priorityTasks.length === 0) {
                                    return (
                                        <div className="text-gray-400 text-sm italic text-center py-4">
                                            Nothing urgent right now. Good breathing room.
                                        </div>
                                    );
                                }

                                return priorityTasks.map(task => {
                                    const urgency = getTaskUrgencyMeta(task, now, todayStart, todayEnd);
                                    return (
                                    <div
                                        key={task.id}
                                        onClick={() => {
                                            setSelectedTask(task);
                                            setShowTaskModal(true);
                                        }}
                                        className="bg-gray-50 border border-gray-100 rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:border-teal-200 hover:shadow-sm transition-all group"
                                    >
                                        <div className="w-2 h-2 rounded-full bg-teal-500"></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-gray-800 text-sm font-medium truncate">{task.title}</div>
                                            <div className="mt-1 flex items-center gap-2">
                                                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${urgency.badgeClass}`}>
                                                    {urgency.label}
                                                </span>
                                                <span className="text-gray-500 text-xs">
                                                    {new Date(task.deadline).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                completeTask(task.id);
                                            }}
                                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                                            title="Mark complete"
                                        >
                                            <Check size={12} />
                                        </button>
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
                                    </div>
                                )});
                            })()}
                        </div>
                    </div>

                    {/* Recent Notes */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden border border-gray-100 flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-50/50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="relative z-10 flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-2xl bg-teal-50 text-teal-600">
                                <FileText size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Recent Notes</h3>
                                <p className="text-xs text-gray-500">The latest notes from your habit logs.</p>
                            </div>
                        </div>

                        <div className="space-y-3 flex-1 relative z-10">
                            {recentHabitNotes.length === 0 && (
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                    No habit notes yet. Add notes from the Habits tab and they will show up here.
                                </div>
                            )}

                            {recentHabitNotes.map((entry) => (
                                <div key={entry.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold text-gray-900 truncate">
                                            {entry.habitIcon} {entry.habitName}
                                        </div>
                                        <div className="text-xs text-gray-400 shrink-0">
                                            {new Date(`${entry.date}T12:00:00`).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                                        {entry.notes}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button onClick={() => onNavigate('habits')} className="mt-4 text-gray-700 hover:text-gray-900 text-sm font-medium flex items-center gap-1 transition-colors relative z-10">
                            Open habits <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Idea Spotlight */}
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden border border-gray-100 flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50/50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="relative z-10 flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-2xl bg-amber-50 text-amber-600">
                                <Lightbulb size={18} />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Idea Spotlight</h3>
                                <p className="text-xs text-gray-500">Easy jump back into your most relevant ideas.</p>
                            </div>
                        </div>

                        <div className="space-y-3 flex-1 relative z-10">
                            {ideaSpotlight.length === 0 && (
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                    No ideas yet. Start with one main idea and branch from there.
                                </div>
                            )}

                            {ideaSpotlight.map((idea) => (
                                <div key={idea.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm font-semibold text-gray-900 truncate">{idea.title}</div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            {idea.focused && (
                                                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[11px] font-semibold">
                                                    Focused
                                                </span>
                                            )}
                                            <span className="px-2 py-0.5 rounded-full bg-white text-gray-500 text-[11px] font-semibold border border-gray-200">
                                                {idea.depth === 0 ? 'Idea' : idea.depth === 1 ? 'Subidea' : 'Sub-subidea'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                        <span>{idea.branchCount} branches</span>
                                        <span>•</span>
                                        <span>{idea.completed ? 'Completed' : 'Open'}</span>
                                    </div>
                                    {idea.details?.trim() && (
                                        <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                                            {idea.details}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button onClick={() => onNavigate('ideas')} className="mt-4 text-gray-700 hover:text-gray-900 text-sm font-medium flex items-center gap-1 transition-colors relative z-10">
                            Open ideas <ChevronRight size={14} />
                        </button>
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
                onSave={async (eventData) => {
                    if (selectedScheduleItem?.id) {
                        await updateScheduleItem(selectedScheduleItem.id, eventData);
                    } else {
                        await addScheduleItem(eventData);
                    }
                    setShowScheduleModal(false);
                    setSelectedScheduleItem(null);
                }}
                onDelete={selectedScheduleItem?.id ? async (_eventId, options) => {
                    await deleteScheduleItem(selectedScheduleItem.id, options);
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
