import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Zap, Clock, Calendar, ChevronLeft, ChevronRight, Plus, Flame, Check, Trash2, Mic, MicOff, Loader2, X, Sparkles, AlertTriangle, FileText, Lightbulb, Sunrise, CheckCircle2, Settings, Activity, ListTodo, StickyNote, BookOpen, Pin, ListChecks } from 'lucide-react';
import { useTask } from '../context/TaskContext';
import { useGoal } from '../context/GoalContext';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useAgentMemory } from '../context/AgentMemoryContext';
import { useProject } from '../context/ProjectContext';
import { useHabit } from '../context/HabitContext';
import { useLearning } from '../context/LearningContext';
import { useChatContext } from '../context/ChatContext';
import { useIdeaBoard } from '../context/IdeaBoardContext';
import { parseTaskInput, routeAgentCommand } from '../services/aiClient';
import { canHandleLocally, generateLocalResponse, getCachedResponse, cacheResponse, generateCacheKey } from '../services/localAgentHandler';
import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences';
import { getTaskCompletionTimestamp, isTaskActive } from '../utils/taskState';
import { getColorForSubject } from '../constants/subjects';
import Penguin from './Penguin';
import ScheduleEventModal from './ScheduleEventModal';
import TaskModal from './TaskModal';
import MagicBox from './MagicBox';
import AgentConfirmationModal from './AgentConfirmationModal';
import DailyRitualModal from './DailyRitualModal';

const OVERVIEW_WIDGETS = [
    {
        id: 'schedule',
        label: "Today's Schedule",
        description: 'Timeline of scheduled events for the selected day.',
        icon: Calendar,
    },
    {
        id: 'current',
        label: 'Current Status',
        description: 'What is happening now and what comes next.',
        icon: Activity,
    },
    {
        id: 'postIt',
        label: 'Post-it Note',
        description: 'A warm little note that stays on your Overview.',
        icon: StickyNote,
    },
    {
        id: 'pinnedLearning',
        label: 'Pinned Learning',
        description: 'Pinned learning paths with one-click access to study.',
        icon: BookOpen,
    },
    {
        id: 'todayHabits',
        label: "Today's Habits",
        description: 'A compact habit list with quick check and miss actions.',
        icon: ListChecks,
    },
    {
        id: 'nextAction',
        label: 'Next Best Action',
        description: 'A recommended task, habit, or idea to do next.',
        icon: Zap,
    },
    {
        id: 'attention',
        label: 'Needs Attention',
        description: 'Overdue tasks, late habits, and schedule collisions.',
        icon: AlertTriangle,
    },
    {
        id: 'timeGaps',
        label: 'Time Gap Finder',
        description: 'Free windows left in the day.',
        icon: Clock,
    },
    {
        id: 'priorityTasks',
        label: 'Priority Tasks',
        description: 'Overdue and soon-due active tasks.',
        icon: ListTodo,
    },
    {
        id: 'recentNotes',
        label: 'Recent Notes',
        description: 'Latest notes from habit logs.',
        icon: FileText,
    },
    {
        id: 'ideaSpotlight',
        label: 'Idea Spotlight',
        description: 'Relevant ideas to revisit.',
        icon: Lightbulb,
    },
];

const DEFAULT_OVERVIEW_WIDGET_IDS = ['current', 'todayHabits', 'priorityTasks', 'recentNotes'];
const OVERVIEW_WIDGET_STORAGE_KEY = 'overview-widget-ids';
const OVERVIEW_USEFUL_WIDGETS_MIGRATION_KEY = 'overview-useful-widgets-v1';
const OVERVIEW_POST_IT_STORAGE_KEY = 'overview-post-it-note';
const OVERVIEW_POST_IT_THEME_STORAGE_KEY = 'overview-post-it-theme';
const LEARNING_PINNED_PATHS_STORAGE_KEY = 'learning-pinned-path-ids';
const USEFUL_OVERVIEW_WIDGET_IDS = [];

const readPinnedLearningPathIds = () => {
    if (typeof window === 'undefined') return [];

    try {
        const saved = JSON.parse(localStorage.getItem(LEARNING_PINNED_PATHS_STORAGE_KEY) || '[]');
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
};

const POST_IT_THEMES = [
    {
        id: 'honey',
        name: 'Honey',
        shellClass: 'border-amber-200/80 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50',
        paperClass: 'border-amber-200/80 bg-[#fff8d9] text-amber-950 placeholder:text-amber-700/45',
        iconClass: 'bg-white/80 text-amber-600',
        tapeClass: 'bg-amber-200/70',
        textClass: 'text-amber-950',
        subTextClass: 'text-amber-700/75',
        buttonClass: 'text-amber-700 hover:bg-white/70',
        lineColor: 'rgba(217, 119, 6, 0.16)',
        swatchClass: 'bg-[#facc15]',
    },
    {
        id: 'blush',
        name: 'Blush',
        shellClass: 'border-rose-200/80 bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50',
        paperClass: 'border-rose-200/80 bg-[#fff1f2] text-rose-950 placeholder:text-rose-700/45',
        iconClass: 'bg-white/80 text-rose-500',
        tapeClass: 'bg-rose-200/75',
        textClass: 'text-rose-950',
        subTextClass: 'text-rose-700/75',
        buttonClass: 'text-rose-700 hover:bg-white/70',
        lineColor: 'rgba(225, 29, 72, 0.14)',
        swatchClass: 'bg-[#fda4af]',
    },
    {
        id: 'mint',
        name: 'Mint',
        shellClass: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-teal-50 to-yellow-50',
        paperClass: 'border-emerald-200/80 bg-[#ecfdf5] text-emerald-950 placeholder:text-emerald-700/45',
        iconClass: 'bg-white/80 text-emerald-600',
        tapeClass: 'bg-emerald-200/75',
        textClass: 'text-emerald-950',
        subTextClass: 'text-emerald-700/75',
        buttonClass: 'text-emerald-700 hover:bg-white/70',
        lineColor: 'rgba(5, 150, 105, 0.14)',
        swatchClass: 'bg-[#6ee7b7]',
    },
];

const OverviewWidgetPicker = ({ isOpen, onClose, visibleWidgetIds, onToggleWidget, onResetWidgets }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
            <div className="w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
                <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5">
                    <div>
                        <div className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">Overview Widgets</div>
                        <h2 className="mt-1 text-2xl font-bold text-gray-900">Customize your dashboard</h2>
                        <p className="mt-1 text-sm text-gray-500">Choose which blocks appear on the Overview page.</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
                        aria-label="Close widget picker"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="max-h-[65vh] overflow-y-auto p-5">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {OVERVIEW_WIDGETS.map((widget) => {
                            const WidgetIcon = widget.icon;
                            const isVisible = visibleWidgetIds.includes(widget.id);

                            return (
                                <button
                                    key={widget.id}
                                    type="button"
                                    onClick={() => onToggleWidget(widget.id)}
                                    className={`flex items-start gap-4 rounded-3xl border p-4 text-left transition-all ${isVisible
                                        ? 'border-indigo-200 bg-indigo-50 shadow-sm'
                                        : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                                        }`}
                                >
                                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${isVisible ? 'bg-white text-indigo-600' : 'bg-white text-gray-500'}`}>
                                        <WidgetIcon size={20} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="font-bold text-gray-900">{widget.label}</div>
                                            <div className={`relative h-6 w-11 rounded-full transition-colors ${isVisible ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                                                <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${isVisible ? 'translate-x-6' : 'translate-x-1'}`}></div>
                                            </div>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-500">{widget.description}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
                    <button
                        type="button"
                        onClick={onResetWidgets}
                        className="rounded-2xl px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-100"
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-2xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

const PostItWidget = () => {
    const [note, setNote] = useState(() => {
        try {
            return localStorage.getItem(OVERVIEW_POST_IT_STORAGE_KEY) || '';
        } catch {
            return '';
        }
    });
    const [themeId, setThemeId] = useState(() => {
        try {
            return localStorage.getItem(OVERVIEW_POST_IT_THEME_STORAGE_KEY) || 'honey';
        } catch {
            return 'honey';
        }
    });

    const theme = POST_IT_THEMES.find((candidate) => candidate.id === themeId) || POST_IT_THEMES[0];

    useEffect(() => {
        try {
            localStorage.setItem(OVERVIEW_POST_IT_STORAGE_KEY, note);
        } catch {
            // Keep the note usable even if storage is unavailable.
        }
    }, [note]);

    useEffect(() => {
        try {
            localStorage.setItem(OVERVIEW_POST_IT_THEME_STORAGE_KEY, themeId);
        } catch {
            // Theme choice is a visual preference, so storage failure should not block typing.
        }
    }, [themeId]);

    const handleNoteChange = (event) => {
        setNote(event.target.value.slice(0, 280));
    };

    return (
        <div className={`relative overflow-hidden rounded-[2rem] border p-5 shadow-sm transition-all ${theme.shellClass}`}>
            <div className={`absolute left-1/2 top-3 h-3 w-24 -translate-x-1/2 rotate-[-2deg] rounded-full shadow-sm ${theme.tapeClass}`}></div>
            <div className="absolute right-5 top-5 h-10 w-10 rounded-bl-[1.25rem] border-b border-l border-white/70 bg-white/35 shadow-sm"></div>
            <div className="relative z-10 pt-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl shadow-sm ${theme.iconClass}`}>
                            <StickyNote size={18} />
                        </div>
                        <div>
                            <h3 className={`font-bold ${theme.textClass}`}>Post-it</h3>
                            <p className={`text-xs font-medium ${theme.subTextClass}`}>Tiny note for today.</p>
                        </div>
                    </div>

                    {note.trim() && (
                        <button
                            type="button"
                            onClick={() => setNote('')}
                            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${theme.buttonClass}`}
                        >
                            Clear
                        </button>
                    )}
                </div>

                <div className={`relative overflow-hidden rounded-[1.65rem] border shadow-[0_14px_30px_-24px_rgba(120,53,15,0.45)] ${theme.paperClass}`}>
                    <Sparkles size={15} className="absolute right-4 top-4 opacity-30" />
                    <textarea
                        value={note}
                        onChange={handleNoteChange}
                        maxLength={280}
                        rows={5}
                        placeholder="Write one gentle reminder..."
                        className="relative z-10 min-h-[152px] w-full resize-none bg-transparent px-5 py-5 pr-10 text-[15px] leading-7 outline-none"
                        style={{
                            backgroundImage: `linear-gradient(${theme.lineColor} 1px, transparent 1px)`,
                            backgroundPosition: '0 45px',
                            backgroundSize: '100% 28px',
                            fontFamily: '"Noteworthy", "Marker Felt", "Bradley Hand", "Chalkboard SE", "Segoe Print", cursive',
                            letterSpacing: '0.01em',
                        }}
                    />
                </div>

                <div className={`mt-3 flex items-center justify-between gap-3 text-xs font-semibold ${theme.subTextClass}`}>
                    <div className="flex items-center gap-2">
                        <span>{note.trim() ? 'Saved automatically' : 'Ready when you are'}</span>
                        <div className="flex items-center gap-1">
                            {POST_IT_THEMES.map((candidate) => (
                                <button
                                    key={candidate.id}
                                    type="button"
                                    onClick={() => setThemeId(candidate.id)}
                                    className={`h-4 w-4 rounded-full border border-white/80 shadow-sm transition-transform ${candidate.swatchClass} ${candidate.id === theme.id ? 'scale-110 ring-2 ring-white/90' : 'hover:scale-110'}`}
                                    aria-label={`Use ${candidate.name} post-it color`}
                                    title={candidate.name}
                                />
                            ))}
                        </div>
                    </div>
                    <span>{note.length}/280</span>
                </div>
            </div>
        </div>
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
                            <Motion.div
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
                                <p className="text-sm text-gray-600">Recharge or pick a task from Tasks.</p>
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
    const { habits, logHabit, getHabitsForDate, getHabitLog, getHabitNoteHistory } = useHabit();
    const { learningPaths, topics, setCurrentPathId, getPathProgress } = useLearning();
    const { sendMessage, openSidebar } = useChatContext();
    const { nodes: ideaNodes } = useIdeaBoard();

    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedScheduleItem, setSelectedScheduleItem] = useState(null);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [showDailyRitual, setShowDailyRitual] = useState(false);
    const [ritualCompletedAt, setRitualCompletedAt] = useState(null);
    const [showWidgetPicker, setShowWidgetPicker] = useState(false);
    const [visibleWidgetIds, setVisibleWidgetIds] = useState(DEFAULT_OVERVIEW_WIDGET_IDS);
    const [pinnedLearningPathIds, setPinnedLearningPathIds] = useState(readPinnedLearningPathIds);
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

    const now = useMemo(() => new Date(nowTick), [nowTick]);
    const todayStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now]);
    const todayEnd = useMemo(() => {
        const end = new Date(todayStart);
        end.setDate(end.getDate() + 1);
        return end;
    }, [todayStart]);
    const todayKey = useMemo(() => toLocalDateKey(now), [now]);
    const activeTasks = useMemo(() => (tasks || []).filter(isTaskActive), [tasks]);
    const visibleWidgetSet = useMemo(() => new Set(visibleWidgetIds), [visibleWidgetIds]);
    const isWidgetVisible = (widgetId) => visibleWidgetSet.has(widgetId);
    const visibleMainWidgetCount = visibleWidgetIds.filter((widgetId) => widgetId !== 'schedule').length;

    // Handler to route actions through chat
    const handleChatAction = (action) => {
        sendMessage(action);
        openSidebar();
    };

    const openTaskEditor = (task) => {
        setSelectedTask(task);
        setShowTaskModal(true);
    };

    const openLearningPath = (pathId) => {
        setCurrentPathId(pathId);
        onNavigate('learning');
    };

    const openLearningHome = () => {
        setCurrentPathId(null);
        onNavigate('learning');
    };

    const togglePinnedLearningPath = (pathId) => {
        setPinnedLearningPathIds((previous) => (
            previous.includes(pathId)
                ? previous.filter((id) => id !== pathId)
                : [pathId, ...previous]
        ));
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
        localStorage.setItem(OVERVIEW_WIDGET_STORAGE_KEY, JSON.stringify(visibleWidgetIds));
    }, [visibleWidgetIds]);

    useEffect(() => {
        try {
            if (localStorage.getItem(OVERVIEW_USEFUL_WIDGETS_MIGRATION_KEY)) return;

            setVisibleWidgetIds((previous) => {
                const validIds = new Set(OVERVIEW_WIDGETS.map((widget) => widget.id));
                const nextIds = previous.filter((id) => validIds.has(id));

                USEFUL_OVERVIEW_WIDGET_IDS.forEach((id) => {
                    if (!nextIds.includes(id)) {
                        nextIds.push(id);
                    }
                });

                return nextIds;
            });
            localStorage.setItem(OVERVIEW_USEFUL_WIDGETS_MIGRATION_KEY, 'true');
        } catch {
            // Widget customizations are optional.
        }
    }, []);

    useEffect(() => {
        const refreshPinnedPaths = () => setPinnedLearningPathIds(readPinnedLearningPathIds());

        window.addEventListener('storage', refreshPinnedPaths);
        return () => window.removeEventListener('storage', refreshPinnedPaths);
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(LEARNING_PINNED_PATHS_STORAGE_KEY, JSON.stringify(pinnedLearningPathIds));
        } catch {
            // Pinning is still usable for the current session.
        }
    }, [pinnedLearningPathIds]);

    const handleToggleWidget = (widgetId) => {
        setVisibleWidgetIds((previous) => (
            previous.includes(widgetId)
                ? previous.filter((id) => id !== widgetId)
                : [...previous, widgetId]
        ));
    };

    const handleResetWidgets = () => {
        setVisibleWidgetIds(DEFAULT_OVERVIEW_WIDGET_IDS);
    };

    useEffect(() => {
        try {
            setRitualCompletedAt(localStorage.getItem(`daily-ritual-completed-${todayKey}`));
        } catch {
            setRitualCompletedAt(null);
        }
    }, [todayKey]);

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

    const activeLearningPaths = useMemo(() => (
        (learningPaths || []).filter((path) => !path.archived)
    ), [learningPaths]);

    const pinnedLearningPaths = useMemo(() => {
        const pinnedSet = new Set(pinnedLearningPathIds);
        return activeLearningPaths
            .filter((path) => pinnedSet.has(path.id))
            .sort((left, right) => pinnedLearningPathIds.indexOf(left.id) - pinnedLearningPathIds.indexOf(right.id));
    }, [activeLearningPaths, pinnedLearningPathIds]);

    const learningWidgetItems = useMemo(() => {
        const inProgressPaths = activeLearningPaths.filter((path) => getPathProgress(path.id) < 100);
        const sourcePaths = pinnedLearningPaths.length > 0
            ? pinnedLearningPaths
            : (inProgressPaths.length > 0 ? inProgressPaths : activeLearningPaths);

        return sourcePaths.slice(0, 3).map((path) => {
            const pathTopics = (topics || [])
                .filter((topic) => topic.learning_path_id === path.id)
                .sort((left, right) => (left.display_order || 0) - (right.display_order || 0));
            const completedCount = pathTopics.filter((topic) => topic.status === 'completed' || topic.status === 'mastered').length;
            const nextTopic = pathTopics.find((topic) => topic.status !== 'completed' && topic.status !== 'mastered');
            const nextTopicTitle = nextTopic?.title || nextTopic?.name;
            const progress = getPathProgress(path.id);

            return {
                path,
                progress,
                topicCount: pathTopics.length,
                completedCount,
                nextTopicName: nextTopicTitle || (pathTopics.length ? 'All topics completed' : 'Add the first topic'),
                isPinned: pinnedLearningPathIds.includes(path.id),
            };
        });
    }, [activeLearningPaths, getPathProgress, pinnedLearningPathIds, pinnedLearningPaths, topics]);

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
                                <button
                                    type="button"
                                    onClick={() => setShowWidgetPicker(true)}
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                                    aria-label="Customize Overview widgets"
                                    title="Customize widgets"
                                >
                                    <Settings size={17} />
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

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

                {/* LEFT COLUMN: Today's Schedule */}
                {isWidgetVisible('schedule') && (
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
                )}

                {/* MIDDLE/RIGHT COLUMN: Vision Board + Widgets */}
                <div className={`${isWidgetVisible('schedule') ? 'lg:col-span-2' : 'lg:col-span-3'} grid grid-cols-1 gap-5 md:grid-cols-2`}>

                    {/* Current Event Widget */}
                    {isWidgetVisible('current') && (
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
                    )}

                    {/* Post-it Widget */}
                    {isWidgetVisible('postIt') && (
                        <PostItWidget />
                    )}

                    {/* Today's Habits Widget */}
                    {isWidgetVisible('todayHabits') && (
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden border border-gray-100 flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full blur-2xl -mr-8 -mt-8 pointer-events-none"></div>
                        <div className="relative z-10 flex items-start justify-between gap-4 mb-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-2xl bg-emerald-50 text-emerald-600">
                                    <ListChecks size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-900">Today's Habits</h3>
                                    <p className="text-xs text-gray-500">
                                        {todayHabitWidgetItems.length
                                            ? `${completedHabitWidgetCount}/${todayHabitWidgetItems.length} complete`
                                            : 'Nothing scheduled today'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => onNavigate('habits')}
                                className="shrink-0 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 transition-colors hover:bg-emerald-100"
                            >
                                Open
                            </button>
                        </div>

                        <div className="space-y-2 flex-1 relative z-10 overflow-y-auto max-h-[260px] custom-scrollbar">
                            {todayHabitWidgetItems.length === 0 && (
                                <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                                    Add scheduled habits to see quick actions here.
                                </div>
                            )}

                            {todayHabitWidgetItems.slice(0, 6).map((habit) => (
                                <div
                                    key={habit.id}
                                    className={`rounded-2xl border px-3 py-3 flex items-center gap-3 transition-colors ${
                                        habit.completed
                                            ? 'border-emerald-100 bg-emerald-50/70'
                                            : habit.missed
                                                ? 'border-rose-100 bg-rose-50/70'
                                                : 'border-gray-100 bg-gray-50'
                                    }`}
                                >
                                    <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                        habit.completed
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : habit.missed
                                                ? 'bg-rose-100 text-rose-700'
                                                : 'bg-white text-gray-500'
                                    }`}>
                                        {habit.completed ? <CheckCircle2 size={18} /> : habit.missed ? <X size={18} /> : <ListChecks size={18} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-sm font-bold text-gray-900 truncate">{habit.name}</div>
                                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-gray-500">
                                            {habit.reminder_time && <span>{habit.reminder_time}</span>}
                                            {habit.reminder_time && <span className="text-gray-300">•</span>}
                                            <span>{habit.targetLabel}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => markHabitForToday(habit, true)}
                                            className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${
                                                habit.completed
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-white text-emerald-600 border border-emerald-100 hover:bg-emerald-50'
                                            }`}
                                            title="Mark complete"
                                        >
                                            <Check size={15} />
                                        </button>
                                        <button
                                            onClick={() => markHabitForToday(habit, false)}
                                            className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors ${
                                                habit.missed
                                                    ? 'bg-rose-600 text-white'
                                                    : 'bg-white text-rose-500 border border-rose-100 hover:bg-rose-50'
                                            }`}
                                            title="Mark missed"
                                        >
                                            <X size={15} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {todayHabitWidgetItems.length > 6 && (
                            <button
                                onClick={() => onNavigate('habits')}
                                className="mt-4 text-gray-700 hover:text-gray-900 text-sm font-medium flex items-center gap-1 transition-colors relative z-10"
                            >
                                View {todayHabitWidgetItems.length - 6} more <ChevronRight size={14} />
                            </button>
                        )}
                    </div>
                    )}

                    {/* Pinned Learning Widget */}
                    {isWidgetVisible('pinnedLearning') && (
                    <div className="md:col-span-2 bg-white rounded-[2rem] p-6 shadow-sm relative overflow-hidden border border-gray-100">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-violet-50/60 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-28 h-28 bg-sky-50/50 rounded-full blur-2xl -ml-8 -mb-8 pointer-events-none"></div>
                        <div className="relative z-10 flex items-start justify-between gap-4 mb-5">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-2xl bg-violet-50 text-violet-600">
                                    <BookOpen size={18} />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="font-bold text-gray-900">Pinned Learning</h3>
                                    <p className="text-xs text-gray-500">
                                        {pinnedLearningPaths.length > 0
                                            ? 'Jump straight back into your pinned courses.'
                                            : 'Pin courses in Learning; showing active paths for now.'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={openLearningHome}
                                className="shrink-0 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 transition-colors hover:bg-violet-100"
                            >
                                Learning
                            </button>
                        </div>

                        {learningWidgetItems.length === 0 ? (
                            <div className="relative z-10 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-5 text-sm text-gray-500">
                                Create a learning path, then pin the courses you want to keep on this dashboard.
                            </div>
                        ) : (
                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-3">
                                {learningWidgetItems.map((item) => (
                                    <div
                                        key={item.path.id}
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => openLearningPath(item.path.id)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' || event.key === ' ') {
                                                event.preventDefault();
                                                openLearningPath(item.path.id);
                                            }
                                        }}
                                        className="rounded-2xl border border-gray-100 bg-gray-50 p-4 cursor-pointer hover:border-violet-200 hover:bg-violet-50/40 transition-all group"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex items-center gap-3">
                                                <div className="h-11 w-11 rounded-2xl bg-white text-violet-600 border border-violet-100 flex items-center justify-center shrink-0">
                                                    <BookOpen size={20} />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-bold text-gray-900 truncate">{item.path.name}</div>
                                                    <div className="text-[11px] font-semibold text-gray-500 truncate mt-0.5">
                                                        {item.path.category?.trim() || 'Learning path'}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    togglePinnedLearningPath(item.path.id);
                                                }}
                                                className={`h-8 w-8 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                                                    item.isPinned
                                                        ? 'bg-amber-100 text-amber-600'
                                                        : 'bg-white text-gray-400 border border-gray-100 hover:text-amber-600 hover:bg-amber-50'
                                                }`}
                                                title={item.isPinned ? 'Unpin course' : 'Pin course'}
                                            >
                                                <Pin size={15} fill={item.isPinned ? 'currentColor' : 'none'} />
                                            </button>
                                        </div>

                                        <div className="mt-4 flex items-center gap-3">
                                            <div
                                                className="relative h-14 w-14 rounded-full shrink-0"
                                                style={{ background: `conic-gradient(#7c3aed ${item.progress * 3.6}deg, #ede9fe 0deg)` }}
                                            >
                                                <div className="absolute inset-1.5 rounded-full bg-white flex items-center justify-center text-[11px] font-black text-violet-700">
                                                    {item.progress}%
                                                </div>
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-[11px] font-bold uppercase text-violet-500">Next topic</div>
                                                <div className="mt-1 text-sm font-semibold text-gray-800 line-clamp-2">{item.nextTopicName}</div>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between gap-3 text-xs">
                                            <span className="font-semibold text-gray-500">
                                                {item.completedCount}/{item.topicCount} topics
                                            </span>
                                            <span className="inline-flex items-center gap-1 font-bold text-violet-600">
                                                Learn <ChevronRight size={13} />
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    )}

                    {/* Next Best Action */}
                    {isWidgetVisible('nextAction') && (
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
                    )}

                    {/* What Needs Attention */}
                    {isWidgetVisible('attention') && (
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
                    )}

                    {/* Time Gap Finder */}
                    {isWidgetVisible('timeGaps') && (
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
                    )}

                    {/* Priority Tasks Widget */}
                    {isWidgetVisible('priorityTasks') && (
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
                    )}

                    {/* Recent Notes */}
                    {isWidgetVisible('recentNotes') && (
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
                    )}

                    {/* Idea Spotlight */}
                    {isWidgetVisible('ideaSpotlight') && (
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
                    )}

                    {visibleMainWidgetCount === 0 && (
                        <div className="md:col-span-2 rounded-[2rem] border border-dashed border-gray-200 bg-white p-8 text-center shadow-sm">
                            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                                <Settings size={22} />
                            </div>
                            <h3 className="mt-4 text-xl font-bold text-gray-900">No widgets selected</h3>
                            <p className="mt-2 text-sm text-gray-500">Choose the blocks you want on your Overview page.</p>
                            <button
                                type="button"
                                onClick={() => setShowWidgetPicker(true)}
                                className="mt-5 rounded-2xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-800"
                            >
                                Customize Widgets
                            </button>
                        </div>
                    )}

                </div>
            </div>

            <OverviewWidgetPicker
                isOpen={showWidgetPicker}
                onClose={() => setShowWidgetPicker(false)}
                visibleWidgetIds={visibleWidgetIds}
                onToggleWidget={handleToggleWidget}
                onResetWidgets={handleResetWidgets}
            />

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
