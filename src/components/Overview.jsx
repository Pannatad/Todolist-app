import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, Calendar, ChevronLeft, ChevronRight, Plus, Flame, Check, Trash2, Mic, MicOff, Loader2, X, Sparkles, AlertTriangle, Sunrise, CheckCircle2, Repeat2 } from 'lucide-react';
import { useTask } from '../context/TaskContext';
import { useGoal } from '../context/GoalContext';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useAgentMemory } from '../context/AgentMemoryContext';
import { useProject } from '../context/ProjectContext';
import { useHabit } from '../context/HabitContext';
import { useChatContext } from '../context/ChatContext';
import { parseTaskInput, routeAgentCommand } from '../services/aiClient';
import { canHandleLocally, generateLocalResponse, getCachedResponse, cacheResponse, generateCacheKey } from '../services/localAgentHandler';
import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences';
import { getTaskCompletionTimestamp, isTaskActive } from '../utils/taskState';
import { getColorForSubject } from '../constants/subjects';
import ScheduleEventModal from './ScheduleEventModal';
import TaskModal from './TaskModal';
import MagicBox from './MagicBox';
import AgentConfirmationModal from './AgentConfirmationModal';
import DailyRitualModal from './DailyRitualModal';
import { Card, Chip, ListRow } from '../ui';
import { toast } from '../ui/Toast';

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
        <Motion.div
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
        </Motion.div>,
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
            toast('Speech recognition is not supported in your browser.', { tone: 'error' });
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
        <Motion.div
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
        </Motion.div>,
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
    const { habits, logHabit, getHabitsForDate, getHabitLog } = useHabit();
    const { sendMessage, openSidebar } = useChatContext();

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedScheduleItem, setSelectedScheduleItem] = useState(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showDailyRitual, setShowDailyRitual] = useState(false);
    const [ritualCompletedAt, setRitualCompletedAt] = useState(null);
    const [nowTick, setNowTick] = useState(Date.now());

    // Agent state (kept for backward compatibility with existing modals)
    const [agentPlan, setAgentPlan] = useState(null);
    const [showAgentModal, setShowAgentModal] = useState(false);
    const [isExecutingActions, setIsExecutingActions] = useState(false);
    const [originalPrompt, setOriginalPrompt] = useState('');

    // Clarify conversation state (for iterative prompting)
    const [clarifyConversation, setClarifyConversation] = useState([]);

    const now = useMemo(() => new Date(nowTick), [nowTick]);
    const todayStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now]);
    const todayEnd = useMemo(() => {
        const end = new Date(todayStart);
        end.setDate(end.getDate() + 1);
        return end;
    }, [todayStart]);
    const todayKey = useMemo(() => toLocalDateKey(now), [now]);
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

    const markHabitForToday = (habit, completed) => {
        logHabit(
            habit.id,
            todayKey,
            completed
                ? (habit.type === 'count' || habit.type === 'duration' ? (habit.target || 1) : 1)
                : 0,
            completed
        );
    };

    useEffect(() => {
        const timer = window.setInterval(() => {
            setNowTick(Date.now());
        }, 60000);

        return () => window.clearInterval(timer);
    }, []);

    useEffect(() => {
        try {
            setRitualCompletedAt(localStorage.getItem(`daily-ritual-completed-${todayKey}`));
        } catch {
            setRitualCompletedAt(null);
        }
    }, [todayKey]);

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

    const todayHabitWidgetItems = useMemo(() => (
        todaysHabits.map((habit) => {
            const log = getHabitLog(habit.id, todayKey);
            const targetValue = habit.type === 'count' || habit.type === 'duration'
                ? (habit.target || 1)
                : 1;
            const targetLabel = habit.type === 'duration'
                ? `${targetValue} min`
                : habit.type === 'count'
                    ? `${targetValue}x`
                    : habit.time_of_day || 'Anytime';

            return {
                ...habit,
                log,
                completed: log?.completed === true,
                missed: log?.completed === false,
                targetValue,
                targetLabel,
            };
        })
    ), [getHabitLog, todayKey, todaysHabits]);

    const completedHabitWidgetCount = useMemo(() => (
        todayHabitWidgetItems.filter((habit) => habit.completed).length
    ), [todayHabitWidgetItems]);

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
            .sort((left, right) => new Date(left.deadline) - new Date(right.deadline));

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

    const displayName = profile?.nickname || user?.email?.split('@')[0] || 'Traveler';
    const todayLabel = now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    const commandCenterScheduleItems = [...todaySchedule]
        .sort((left, right) => {
            const leftTime = left.displayTime || new Date(left.startTime || left.start_time);
            const rightTime = right.displayTime || new Date(right.startTime || right.start_time);
            return leftTime - rightTime;
        });

    const scheduleBriefing = useMemo(() => {
        const entries = commandCenterScheduleItems
            .map((item) => {
                const start = item.displayTime || new Date(item.startTime || item.start_time);
                const duration = item.duration || 60;
                const end = new Date(start.getTime() + duration * 60000);
                const category = (item.category || item.subject || 'Other').toString().trim() || 'Other';
                return { item, start, end, duration, category };
            })
            .filter((entry) => !Number.isNaN(entry.start.getTime()));

        const totalBlocks = entries.length;
        const totalMinutes = entries.reduce((sum, entry) => sum + entry.duration, 0);
        const remainingBlocks = entries.filter((entry) => entry.end > now).length;
        const remainingMinutes = entries.reduce((sum, entry) => (
            entry.end > now ? sum + Math.max(0, getMinutesBetween(entry.start < now ? now : entry.start, entry.end)) : sum
        ), 0);

        const byCategory = new Map();
        entries.forEach((entry) => {
            const existing = byCategory.get(entry.category) || {
                category: entry.category,
                count: 0,
                minutes: 0,
                remaining: 0,
                color: getColorForSubject(entry.category),
            };
            existing.count += 1;
            existing.minutes += entry.duration;
            if (entry.end > now) existing.remaining += 1;
            byCategory.set(entry.category, existing);
        });

        const categories = [...byCategory.values()].sort((left, right) => (
            right.remaining - left.remaining || right.minutes - left.minutes
        ));

        return { totalBlocks, totalMinutes, remainingBlocks, remainingMinutes, categories };
    }, [commandCenterScheduleItems, now]);

    const scheduleSpotlight = (() => {
        const timedItems = commandCenterScheduleItems
            .map((item) => {
                const start = item.displayTime || new Date(item.startTime || item.start_time);
                const duration = item.duration || 60;
                const end = new Date(start.getTime() + duration * 60000);

                return {
                    item,
                    start,
                    end,
                    duration,
                    isNow: now >= start && now < end,
                    isPast: end < now,
                };
            })
            .filter((entry) => !Number.isNaN(entry.start.getTime()));

        const activeEntry = timedItems.find((entry) => entry.isNow);
        const nextEntry = timedItems.find((entry) => entry.start > now);
        const featuredEntry = activeEntry || nextEntry;
        const remainingCount = timedItems.filter((entry) => entry.end > now).length;

        if (!featuredEntry) {
            return {
                eyebrow: 'Current Schedule',
                title: 'Nothing scheduled right now',
                description: commandCenterScheduleItems.length
                    ? 'Everything scheduled for today has passed.'
                    : 'Your schedule is clear today.',
                meta: commandCenterScheduleItems.length ? 'Day complete' : 'Free day',
                event: null,
                rangeLabel: null,
            };
        }

        const startLabel = featuredEntry.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const endLabel = featuredEntry.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const minutesUntilStart = Math.max(0, getMinutesBetween(now, featuredEntry.start));
        const minutesLeft = Math.max(0, getMinutesBetween(now, featuredEntry.end));

        return {
            eyebrow: 'Current Schedule',
            title: featuredEntry.item.title,
            description: featuredEntry.isNow
                ? `Happening now until ${endLabel}. ${formatMinutesLabel(minutesLeft)} left.`
                : `Next at ${startLabel}. Starts in ${formatMinutesLabel(minutesUntilStart)}.`,
            meta: featuredEntry.isNow ? 'Now happening' : 'Up next',
            event: featuredEntry.item,
            rangeLabel: `${startLabel}-${endLabel}`,
            remainingCount,
        };
    })();

    const renderScheduleAction = () => {
        return (
            <button
                type="button"
                onClick={() => {
                    if (scheduleSpotlight.event) {
                        setSelectedScheduleItem(scheduleSpotlight.event);
                        setShowScheduleModal(true);
                        return;
                    }
                    onNavigate('schedule');
                }}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
                {scheduleSpotlight.event ? 'Open event' : 'Open schedule'}
                <ChevronRight size={16} />
            </button>
        );
    };

    return (
        <div className="h-full flex flex-col p-2 md:p-4 overflow-y-auto space-y-5 custom-scrollbar bg-transparent">
            <section className="overflow-hidden rounded-2xl border border-sage-200/70 bg-white/85 shadow-sm dark:border-white/10 dark:bg-void-900">
                <div className="min-w-0">
                    <div className="min-w-0 p-5 sm:p-6">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                                <div className="app-eyebrow flex flex-wrap items-center gap-2">
                                    <span>{todayLabel}</span>
                                    <span className="h-1 w-1 rounded-full bg-sage-300" aria-hidden="true"></span>
                                    <span>{greeting}</span>
                                </div>
                                <h1 className="app-page-title mt-2">
                                    {displayName}'s overview
                                </h1>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDailyRitual(true)}
                                    className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-semibold transition-colors ${ritualCompletedAt
                                        ? 'text-emerald-700 hover:bg-emerald-50'
                                        : 'bg-slate-950 text-white hover:bg-slate-800'
                                        }`}
                                >
                                    {ritualCompletedAt ? <CheckCircle2 size={17} /> : <Sunrise size={17} />}
                                    {ritualCompletedAt ? 'Ritual done' : 'Start ritual'}
                                </button>
                            </div>
                        </div>

                        <div className="mt-7 border-l-2 border-indigo-400 pl-4">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="min-w-0">
                                    <div className="app-eyebrow mb-2 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1">
                                            <Calendar size={13} />
                                            Current Schedule
                                        </span>
                                        {scheduleSpotlight.meta && (
                                            <span className="font-semibold tracking-normal text-gray-400">
                                                {scheduleSpotlight.meta}
                                            </span>
                                        )}
                                        {scheduleSpotlight.rangeLabel && (
                                            <span className="font-semibold tracking-normal text-gray-400">
                                                {scheduleSpotlight.rangeLabel}
                                            </span>
                                        )}
                                    </div>
                                    <h2 className="app-section-title">
                                        {scheduleSpotlight.title}
                                    </h2>
                                    <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                                        {scheduleSpotlight.description}
                                    </p>
                                </div>
                                <div className="shrink-0">
                                    {renderScheduleAction()}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 min-w-0 overflow-hidden">
                            <MagicBox />
                        </div>

                        <div className="mt-6 border-t border-sage-100 pt-5">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h2 className="app-section-title">Today</h2>
                                    <p className="mt-1 text-xs font-medium text-gray-500">
                                        {todaySummary.eventsToday ? `${todaySummary.eventsToday} scheduled` : 'No scheduled events'}
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => onNavigate('schedule')}
                                    className="text-xs font-bold text-sage-700 transition-colors hover:text-sage-900"
                                >
                                    View all
                                </button>
                            </div>

                            {scheduleBriefing.totalBlocks > 0 && (
                                <div className="mt-4 rounded-xl border border-sage-200/70 bg-white/70 p-3.5">
                                    <p className="text-sm font-semibold leading-6 text-gray-700">
                                        {scheduleBriefing.remainingBlocks > 0 ? (
                                            <>
                                                You have{' '}
                                                <span className="font-black text-gray-950">{scheduleBriefing.remainingBlocks}</span>
                                                {' '}of {scheduleBriefing.totalBlocks}{' '}
                                                {scheduleBriefing.totalBlocks === 1 ? 'block' : 'blocks'} still ahead
                                                {' '}· {formatMinutesLabel(scheduleBriefing.remainingMinutes)} of scheduled time left
                                            </>
                                        ) : (
                                            <>
                                                All{' '}
                                                <span className="font-black text-gray-950">{scheduleBriefing.totalBlocks}</span>
                                                {' '}
                                                {scheduleBriefing.totalBlocks === 1 ? 'block is' : 'blocks are'} behind you
                                                {' '}· {formatMinutesLabel(scheduleBriefing.totalMinutes)} scheduled today
                                            </>
                                        )}
                                        {' '}across {scheduleBriefing.categories.length}{' '}
                                        {scheduleBriefing.categories.length === 1 ? 'area' : 'areas'}.
                                    </p>
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {scheduleBriefing.categories.map((cat) => (
                                            <span
                                                key={cat.category}
                                                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                                                style={{ backgroundColor: cat.color.bgColor, color: cat.color.color }}
                                            >
                                                <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: cat.color.color }}></span>
                                                {cat.category}
                                                <span className="opacity-70">
                                                    {cat.count} · {formatMinutesLabel(cat.minutes)}
                                                </span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-5 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
                                {commandCenterScheduleItems.length === 0 ? (
                                    <div className="pt-8 text-sm leading-6 text-gray-500">
                                        Nothing scheduled here yet.
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {commandCenterScheduleItems.map((item, index) => {
                                            const start = item.displayTime || new Date(item.startTime || item.start_time);
                                            const duration = item.duration || 60;
                                            const end = new Date(start.getTime() + duration * 60000);
                                            const isNow = now >= start && now < end;
                                            const isPast = end < now;
                                            const startLabel = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            const endLabel = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                            return (
                                                <button
                                                    key={item.id || `${item.title}_${index}`}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedScheduleItem(item);
                                                        setShowScheduleModal(true);
                                                    }}
                                                    className={`group grid w-full grid-cols-[4.25rem_1rem_minmax(0,1fr)] items-start gap-3 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-white/65 ${
                                                        isNow
                                                            ? 'text-gray-950'
                                                            : isPast
                                                                ? 'text-gray-400'
                                                                : 'text-gray-700'
                                                    }`}
                                                >
                                                    <div className="pt-0.5 text-xs font-semibold text-gray-500">
                                                        <div>{startLabel}</div>
                                                        <div className="mt-1 text-gray-400">{endLabel}</div>
                                                    </div>
                                                    <div className="flex shrink-0 flex-col items-center pt-0.5">
                                                        <div
                                                            className={`h-2.5 w-2.5 rounded-full ${isPast ? 'opacity-40' : ''}`}
                                                            style={{ backgroundColor: item.color || '#6366f1' }}
                                                        ></div>
                                                        {index < commandCenterScheduleItems.length - 1 && (
                                                            <div className="mt-2 h-9 w-px bg-gray-200"></div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-baseline justify-between gap-3">
                                                            <div className="truncate text-sm font-bold">{item.title}</div>
                                                            {isNow && <span className="font-bold text-indigo-600">Now</span>}
                                                        </div>
                                                        {item.category && (
                                                            <div className="mt-1 truncate text-xs text-gray-500">{item.category}</div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </section>

            <div className="mx-auto max-w-3xl space-y-4">
                <Card>
                    <div className="mb-3 flex items-baseline justify-between gap-3">
                        <h2>Habits</h2>
                        <span className="text-sm text-[var(--color-muted)]">
                            {completedHabitWidgetCount} of {todayHabitWidgetItems.length} done
                        </span>
                    </div>
                    <div>
                        {todayHabitWidgetItems.length === 0 ? (
                            <p className="text-sm text-[var(--color-muted)]">No habits today.</p>
                        ) : todayHabitWidgetItems.map((habit) => (
                            <ListRow
                                key={habit.id}
                                icon={habit.icon ? null : Repeat2}
                                title={habit.name}
                                trailing={habit.completed ? (
                                    <Check size={18} aria-label="Done" />
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => markHabitForToday(habit, true)}
                                        className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-white"
                                    >
                                        Done
                                    </button>
                                )}
                            />
                        ))}
                    </div>
                </Card>

                <Card>
                    <h2 className="mb-3">Tasks</h2>
                    <div>
                        {priorityTasks.length === 0 ? (
                            <p className="text-sm text-[var(--color-muted)]">No tasks today.</p>
                        ) : priorityTasks.slice(0, 5).map((task) => {
                            const urgency = getTaskUrgencyMeta(task, now, todayStart, todayEnd);
                            return (
                                <ListRow
                                    key={task.id}
                                    title={task.title}
                                    subtitle={task.subject}
                                    trailing={<Chip>{urgency.label}</Chip>}
                                    onClick={() => openTaskEditor(task)}
                                    className="cursor-pointer"
                                />
                            );
                        })}
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2>Daily ritual</h2>
                            <p className="mt-1 text-sm text-[var(--color-muted)]">Review your day and set the next step.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowDailyRitual(true)}
                            className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-white"
                        >
                            Open
                        </button>
                    </div>
                </Card>
            </div>

            <DailyRitualModal
                isOpen={showDailyRitual}
                onClose={() => setShowDailyRitual(false)}
                profile={profile}
                user={user}
                tasks={tasks}
                scheduleItems={scheduleItems}
                habits={todaysHabits}
                getHabitLog={getHabitLog}
                logHabit={logHabit}
                addScheduleItem={addScheduleItem}
                onOpenTask={(task) => {
                    setSelectedTask(task);
                    setShowTaskModal(true);
                }}
                onNavigate={onNavigate}
                onAskAgent={handleChatAction}
                onComplete={setRitualCompletedAt}
            />

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
