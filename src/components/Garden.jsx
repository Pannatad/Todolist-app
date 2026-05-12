import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { ArrowUpDown, CheckCircle2, ChevronDown, Circle, Clock, GripVertical, Palette, Play, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';
import { getTaskChunkEstimate, isTaskActive, isTaskCompleted, normalizeTaskSubtasks } from '../utils/taskState';

const ChunkReorderItem = ({
    chunk,
    difficultyStyle,
    chunkDifficultyOptions,
    editingChunkDifficultyId,
    expandedChunkIds,
    getChunkDifficultyStyle,
    newNestedDraft,
    onAddNested,
    onChooseDifficulty,
    onDelete,
    onDeleteNested,
    onDragEnd,
    onSetEditingDifficulty,
    onToggleExpanded,
    onUpdate,
    onUpdateNested,
    onUpdateNestedDraft
}) => {
    const dragControls = useDragControls();
    const nestedSubtasks = normalizeTaskSubtasks(chunk.subtasks);
    const nestedTotalMinutes = nestedSubtasks.reduce((total, nestedSubtask) => total + nestedSubtask.estimatedTime, 0);
    const isExpanded = expandedChunkIds.has(chunk.id);
    const hasNestedSubtasks = nestedSubtasks.length > 0;
    const draft = newNestedDraft || { title: '', estimatedTime: '' };

    return (
        <Reorder.Item
            as="div"
            value={chunk}
            dragListener={false}
            dragControls={dragControls}
            onDragEnd={onDragEnd}
            className={`relative p-3 rounded-xl border shadow-sm cursor-default ${difficultyStyle.panel}`}
            whileDrag={{ scale: 1.02, boxShadow: '0 18px 35px rgba(15, 23, 42, 0.18)', zIndex: 40 }}
        >
            <div className="grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2">
                <button
                    type="button"
                    onPointerDown={(event) => {
                        event.preventDefault();
                        dragControls.start(event);
                    }}
                    className="p-2 rounded-lg text-sage-400 hover:text-sage-700 hover:bg-white/55 dark:text-bone-300 dark:hover:text-bone-100 touch-none cursor-grab active:cursor-grabbing transition-colors"
                    title="Drag to reorder chunk"
                >
                    <GripVertical size={16} />
                </button>
                <input
                    type="checkbox"
                    checked={chunk.completed}
                    onChange={(event) => onUpdate(chunk.id, { completed: event.target.checked })}
                    className="w-5 h-5 rounded border-sage-300 text-sage-600 focus:ring-sage-500 dark:bg-void-700 dark:border-white/10"
                />
                <input
                    type="text"
                    value={chunk.title}
                    onChange={(event) => onUpdate(chunk.id, { title: event.target.value })}
                    className={`min-w-0 w-full px-2 py-2 rounded-lg bg-transparent border border-transparent text-sm font-semibold leading-6 ${difficultyStyle.text} placeholder-sage-400 focus:outline-none focus:ring-2 ${difficultyStyle.focus} focus:bg-white/45 dark:focus:bg-void-900/45 ${chunk.completed ? 'line-through opacity-60' : ''}`}
                    placeholder="Small next step"
                />
                <button
                    type="button"
                    onClick={() => onDelete(chunk.id)}
                    className="p-2 rounded-lg text-sage-400 hover:text-red-500 hover:bg-white/55 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete chunk"
                >
                    <Trash2 size={16} />
                </button>
                <div className="col-start-3 col-span-2 flex min-w-0 flex-wrap items-center justify-between gap-2 pl-2">
                    <button
                        type="button"
                        onClick={() => onToggleExpanded(chunk.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold transition-colors ${hasNestedSubtasks ? difficultyStyle.icon : 'text-sage-400 hover:text-sage-700 hover:bg-white/55 dark:text-bone-300 dark:hover:text-bone-100'}`}
                        title="Show sub-steps"
                    >
                        <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        {hasNestedSubtasks ? `${nestedSubtasks.length} sub` : 'Sub-steps'}
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                        <input
                            type="number"
                            min="0"
                            value={hasNestedSubtasks ? nestedTotalMinutes || '' : chunk.estimatedTime || ''}
                            onChange={(event) => onUpdate(chunk.id, { estimatedTime: parseInt(event.target.value, 10) || 0 })}
                            readOnly={hasNestedSubtasks}
                            className={`w-16 px-2 py-1.5 text-right rounded-lg bg-transparent border border-transparent text-sm font-bold ${difficultyStyle.text} placeholder-sage-400 focus:outline-none focus:ring-2 ${difficultyStyle.focus} focus:bg-white/45 dark:focus:bg-void-900/45 ${hasNestedSubtasks ? 'cursor-default opacity-80' : ''}`}
                            placeholder="min"
                            title={hasNestedSubtasks ? 'Total from sub-steps' : 'Chunk minutes'}
                        />
                        <button
                            type="button"
                            onClick={() => onSetEditingDifficulty(editingChunkDifficultyId === chunk.id ? null : chunk.id)}
                            className={`relative p-2 rounded-lg transition-colors ${difficultyStyle.icon}`}
                            title="Edit chunk difficulty"
                        >
                            <Palette size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {editingChunkDifficultyId === chunk.id && (
                <div className="absolute right-3 top-12 z-30 flex gap-1 rounded-xl border border-white/70 dark:border-white/10 bg-white/95 dark:bg-void-900/95 p-1.5 shadow-xl">
                    {chunkDifficultyOptions.map(option => {
                        const optionStyle = getChunkDifficultyStyle(option.value);
                        const isActive = chunk.difficulty === option.value;

                        return (
                            <button
                                key={option.value}
                                type="button"
                                onClick={() => onChooseDifficulty(chunk.id, option.value)}
                                className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition-colors ${isActive ? optionStyle.activeButton : optionStyle.inactiveButton}`}
                                title={`${option.label} difficulty`}
                            >
                                {option.label}
                            </button>
                        );
                    })}
                </div>
            )}

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="mt-3 ml-10 space-y-2 border-l border-sage-200/80 dark:border-white/10 pl-3">
                            {nestedSubtasks.map((nestedSubtask) => (
                                <div key={nestedSubtask.id} className="grid grid-cols-[auto_1fr_4rem_auto] items-center gap-2 rounded-lg bg-white/55 dark:bg-void-900/45 px-2 py-2">
                                    <input
                                        type="checkbox"
                                        checked={nestedSubtask.completed}
                                        onChange={(event) => onUpdateNested(chunk.id, nestedSubtask.id, { completed: event.target.checked })}
                                        className="w-4 h-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500 dark:bg-void-700 dark:border-white/10"
                                    />
                                    <input
                                        type="text"
                                        value={nestedSubtask.title}
                                        onChange={(event) => onUpdateNested(chunk.id, nestedSubtask.id, { title: event.target.value })}
                                        className={`min-w-0 px-1 py-1.5 rounded-md bg-transparent border border-transparent text-xs font-semibold ${difficultyStyle.text} placeholder-sage-400 focus:outline-none focus:ring-2 ${difficultyStyle.focus} focus:bg-white/60 dark:focus:bg-void-900/60 ${nestedSubtask.completed ? 'line-through opacity-60' : ''}`}
                                        placeholder="Tiny step"
                                    />
                                    <input
                                        type="number"
                                        min="0"
                                        value={nestedSubtask.estimatedTime || ''}
                                        onChange={(event) => onUpdateNested(chunk.id, nestedSubtask.id, { estimatedTime: parseInt(event.target.value, 10) || 0 })}
                                        className={`w-full px-1.5 py-1.5 text-right rounded-md bg-transparent border border-transparent text-xs font-bold ${difficultyStyle.text} placeholder-sage-400 focus:outline-none focus:ring-2 ${difficultyStyle.focus} focus:bg-white/60 dark:focus:bg-void-900/60`}
                                        placeholder="min"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onDeleteNested(chunk.id, nestedSubtask.id)}
                                        className="p-1.5 rounded-md text-sage-400 hover:text-red-500 hover:bg-white/60 dark:hover:bg-red-900/20 transition-colors"
                                        title="Delete sub-step"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}

                            <div className="grid grid-cols-[1fr_4rem_auto] items-center gap-2 rounded-lg bg-white/35 dark:bg-void-900/30 px-2 py-2">
                                <input
                                    type="text"
                                    value={draft.title}
                                    onChange={(event) => onUpdateNestedDraft(chunk.id, { title: event.target.value })}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            onAddNested(chunk.id);
                                        }
                                    }}
                                    className={`min-w-0 px-1 py-1.5 rounded-md bg-transparent border border-transparent text-xs font-semibold ${difficultyStyle.text} placeholder-sage-400 focus:outline-none focus:ring-2 ${difficultyStyle.focus} focus:bg-white/60 dark:focus:bg-void-900/60`}
                                    placeholder="Add tiny step"
                                />
                                <input
                                    type="number"
                                    min="1"
                                    value={draft.estimatedTime}
                                    onChange={(event) => onUpdateNestedDraft(chunk.id, { estimatedTime: event.target.value })}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            onAddNested(chunk.id);
                                        }
                                    }}
                                    className={`w-full px-1.5 py-1.5 text-right rounded-md bg-transparent border border-transparent text-xs font-bold ${difficultyStyle.text} placeholder-sage-400 focus:outline-none focus:ring-2 ${difficultyStyle.focus} focus:bg-white/60 dark:focus:bg-void-900/60`}
                                    placeholder="min"
                                />
                                <button
                                    type="button"
                                    onClick={() => onAddNested(chunk.id)}
                                    disabled={!draft.title.trim()}
                                    className="p-1.5 rounded-md bg-sage-600 hover:bg-sage-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="Add sub-step"
                                >
                                    <Plus size={15} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Reorder.Item>
    );
};

const TaskListRow = ({
    task,
    isCompleted = false,
    isSelected = false,
    onComplete,
    onDelete,
    onRequestAIHelp,
    onRestore,
    onSelect,
    onStartFocus
}) => {
    const subjectColor = getColorForSubject(task.subject);
    const subtasks = normalizeTaskSubtasks(task.subtasks);
    const completedSubtasks = subtasks.filter(subtask => subtask.completed).length;
    const chunkTotalMinutes = getTaskChunkEstimate(task);

    const formatEstimatedTime = (minutes) => {
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
        if (hours > 0) return `${hours}h`;
        return `${mins}m`;
    };

    const getDueLabel = () => {
        if (!task.deadline) return 'No due date';
        const due = new Date(task.deadline);
        const now = new Date();
        const isToday = due.toDateString() === now.toDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const datePart = isToday
            ? 'Today'
            : due.toDateString() === tomorrow.toDateString()
                ? 'Tomorrow'
                : due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return `${datePart} ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`group rounded-xl border bg-white/80 dark:bg-void-900/80 shadow-sm transition-all ${isSelected ? 'border-sage-500 ring-2 ring-sage-300 dark:ring-magma-500/30' : 'border-sage-200 dark:border-white/10 hover:border-sage-300 dark:hover:border-white/20 hover:shadow-md'} ${isCompleted ? 'opacity-65' : ''}`}
        >
            <div
                onClick={() => isCompleted ? onRestore(task.id) : onSelect(task.id)}
                className="w-full px-3 sm:px-4 py-3 flex items-center gap-3 text-left cursor-pointer"
            >
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        if (isCompleted) onRestore(task.id);
                        else onComplete(task.id);
                    }}
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        event.stopPropagation();
                        if (isCompleted) onRestore(task.id);
                        else onComplete(task.id);
                    }}
                    className={`shrink-0 rounded-full transition-colors ${isCompleted ? 'text-sage-500' : 'text-sage-400 hover:text-sage-700 dark:hover:text-bone-200'}`}
                    title={isCompleted ? 'Restore task' : 'Complete task'}
                >
                    {isCompleted ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                </button>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                        <h3 className={`font-bold text-sm sm:text-base text-sage-800 dark:text-bone-100 truncate ${isCompleted ? 'line-through' : ''}`}>
                            {task.title || 'Untitled Task'}
                        </h3>
                        {isSelected && (
                            <span className="hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wide text-sage-600 dark:text-magma-300">
                                Open
                            </span>
                        )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-sage-500 dark:text-bone-200/60">
                        {task.subject && (
                            <span
                                className="px-2 py-0.5 rounded-full font-bold"
                                style={{
                                    backgroundColor: subjectColor.bgColor,
                                    color: subjectColor.color
                                }}
                            >
                                {task.subject}
                            </span>
                        )}
                        <span className="capitalize">{task.difficulty || 'easy'}</span>
                        <span>{getDueLabel()}</span>
                        {subtasks.length > 0 && (
                            <span>
                                {completedSubtasks}/{subtasks.length} chunks
                                {chunkTotalMinutes > 0 ? ` - ${formatEstimatedTime(chunkTotalMinutes)}` : ''}
                            </span>
                        )}
                    </div>
                </div>

                <div className="shrink-0 flex items-center gap-1">
                    {!isCompleted && onStartFocus && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onStartFocus(task);
                            }}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                event.stopPropagation();
                                onStartFocus(task);
                            }}
                            className="hidden sm:inline-flex p-2 rounded-lg text-sage-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                            title="Start focus"
                        >
                            <Play size={16} fill="currentColor" />
                        </button>
                    )}
                    {!isCompleted && (
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onRequestAIHelp(task);
                            }}
                            onKeyDown={(event) => {
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                event.stopPropagation();
                                onRequestAIHelp(task);
                            }}
                            className="hidden sm:inline-flex p-2 rounded-lg text-sage-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                            title="Get AI help"
                        >
                            <Sparkles size={16} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onDelete(task.id);
                        }}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') return;
                            event.preventDefault();
                            event.stopPropagation();
                            onDelete(task.id);
                        }}
                        className="p-2 rounded-lg text-sage-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Delete task"
                    >
                        <Trash2 size={16} />
                    </button>
                    {!isCompleted && <ChevronDown size={16} className={`text-sage-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} />}
                </div>
            </div>
        </motion.div>
    );
};

const Garden = ({ tasks, onCompleteTask, onDeleteTask, onUpdateTask, onRestoreTask, onRequestAIHelp, existingSubjects = [], unlockedPlots = 12, coins = 0, onBuyPlot, displayMode, onStartFocus }) => {
    const [sortBy, setSortBy] = useState('deadline');
    const [showSort, setShowSort] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('all');
    const [selectedTaskId, setSelectedTaskId] = useState(() => {
        try {
            return localStorage.getItem('growth-selected-task-id');
        } catch {
            return null;
        }
    });
    const [newChunkTitle, setNewChunkTitle] = useState('');
    const [newChunkEstimate, setNewChunkEstimate] = useState('');
    const [newChunkDifficulty, setNewChunkDifficulty] = useState('easy');
    const [editingChunkDifficultyId, setEditingChunkDifficultyId] = useState(null);
    const [isNewChunkDifficultyOpen, setIsNewChunkDifficultyOpen] = useState(false);
    const [orderedChunks, setOrderedChunks] = useState([]);
    const [expandedChunkIds, setExpandedChunkIds] = useState(() => new Set());
    const [newNestedDrafts, setNewNestedDrafts] = useState({});
    const sortRef = useRef(null);

    const chunkDifficultyOptions = [
        { value: 'easy', label: 'Easy', dot: 'bg-emerald-500' },
        { value: 'medium', label: 'Medium', dot: 'bg-amber-500' },
        { value: 'hard', label: 'Hard', dot: 'bg-rose-500' },
    ];

    const getChunkDifficultyStyle = (difficulty = 'easy') => {
        const styles = {
            easy: {
                panel: 'bg-emerald-50/75 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/40',
                text: 'text-emerald-900 dark:text-emerald-100',
                icon: 'text-emerald-600 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/40 hover:bg-emerald-200/80 dark:hover:bg-emerald-800/60',
                activeButton: 'bg-emerald-500 text-white border-emerald-500',
                inactiveButton: 'bg-white/80 dark:bg-void-900/80 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/40',
                focus: 'focus:ring-emerald-400'
            },
            medium: {
                panel: 'bg-amber-50/75 dark:bg-amber-950/20 border-amber-100 dark:border-amber-800/40',
                text: 'text-amber-950 dark:text-amber-100',
                icon: 'text-amber-600 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-900/40 hover:bg-amber-200/80 dark:hover:bg-amber-800/60',
                activeButton: 'bg-amber-500 text-white border-amber-500',
                inactiveButton: 'bg-white/80 dark:bg-void-900/80 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:bg-amber-100 dark:hover:bg-amber-900/40',
                focus: 'focus:ring-amber-400'
            },
            hard: {
                panel: 'bg-rose-50/75 dark:bg-rose-950/20 border-rose-100 dark:border-rose-800/40',
                text: 'text-rose-950 dark:text-rose-100',
                icon: 'text-rose-600 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/40 hover:bg-rose-200/80 dark:hover:bg-rose-800/60',
                activeButton: 'bg-rose-500 text-white border-rose-500',
                inactiveButton: 'bg-white/80 dark:bg-void-900/80 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 hover:bg-rose-100 dark:hover:bg-rose-900/40',
                focus: 'focus:ring-rose-400'
            }
        };

        return styles[difficulty] || styles.easy;
    };

    // Filter tasks by subject
    const filteredTasks = selectedSubject === 'all'
        ? tasks
        : tasks.filter(task => task.subject === selectedSubject);

    const activeTasks = filteredTasks.filter(isTaskActive);
    const completedTasks = filteredTasks.filter(isTaskCompleted);
    const selectedTask = tasks.find(task => String(task.id) === String(selectedTaskId) && isTaskActive(task));
    const selectedChunks = normalizeTaskSubtasks(selectedTask?.subtasks);
    const selectedChunkKey = JSON.stringify(selectedChunks);
    const hasMatchingOrderedChunks = orderedChunks.length === selectedChunks.length
        && orderedChunks.every(chunk => selectedChunks.some(selectedChunk => selectedChunk.id === chunk.id));
    const visibleChunks = hasMatchingOrderedChunks ? orderedChunks : selectedChunks;
    const completedChunks = selectedChunks.filter(chunk => chunk.completed).length;
    const chunkTotalMinutes = getTaskChunkEstimate(selectedTask);

    const formatEstimatedTime = (minutes) => {
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
        if (hours > 0) return `${hours}h`;
        return `${mins}m`;
    };

    // Close sort menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortRef.current && !sortRef.current.contains(event.target)) {
                setShowSort(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (selectedTaskId && !tasks.some(task => String(task.id) === String(selectedTaskId) && isTaskActive(task))) {
            setSelectedTaskId(null);
            setNewChunkTitle('');
            setNewChunkEstimate('');
            setNewChunkDifficulty('easy');
            setEditingChunkDifficultyId(null);
            setIsNewChunkDifficultyOpen(false);
            setExpandedChunkIds(new Set());
            setNewNestedDrafts({});
            localStorage.removeItem('growth-selected-task-id');
        }
    }, [selectedTaskId, tasks]);

    useEffect(() => {
        if (selectedTaskId) {
            localStorage.setItem('growth-selected-task-id', selectedTaskId);
        } else {
            localStorage.removeItem('growth-selected-task-id');
        }
    }, [selectedTaskId]);

    useEffect(() => {
        setOrderedChunks(selectedChunks);
    }, [selectedTask?.id, selectedChunkKey]);

    const handleSelectTask = (taskId) => {
        setSelectedTaskId(taskId);
        setNewChunkTitle('');
        setNewChunkEstimate('');
        setNewChunkDifficulty('easy');
        setEditingChunkDifficultyId(null);
        setIsNewChunkDifficultyOpen(false);
        setExpandedChunkIds(new Set());
        setNewNestedDrafts({});
    };

    const updateSelectedChunks = (chunks) => {
        if (!selectedTask) return;
        onUpdateTask(selectedTask.id, { subtasks: normalizeTaskSubtasks(chunks) });
    };

    const addChunk = () => {
        if (!selectedTask || !newChunkTitle.trim()) return;
        const estimate = parseInt(newChunkEstimate, 10);
        updateSelectedChunks([
            ...visibleChunks,
            {
                id: crypto.randomUUID(),
                title: newChunkTitle.trim(),
                estimatedTime: Number.isFinite(estimate) && estimate > 0 ? estimate : 0,
                difficulty: newChunkDifficulty,
                completed: false
            }
        ]);
        setNewChunkTitle('');
        setNewChunkEstimate('');
        setNewChunkDifficulty('easy');
        setIsNewChunkDifficultyOpen(false);
    };

    const updateChunk = (chunkId, updates) => {
        updateSelectedChunks(visibleChunks.map(chunk => (
            chunk.id === chunkId ? { ...chunk, ...updates } : chunk
        )));
    };

    const chooseChunkDifficulty = (chunkId, difficulty) => {
        updateChunk(chunkId, { difficulty });
        setEditingChunkDifficultyId(null);
    };

    const toggleChunkExpanded = (chunkId) => {
        setExpandedChunkIds(prev => {
            const next = new Set(prev);
            if (next.has(chunkId)) next.delete(chunkId);
            else next.add(chunkId);
            return next;
        });
    };

    const updateNestedDraft = (chunkId, updates) => {
        setNewNestedDrafts(prev => ({
            ...prev,
            [chunkId]: {
                title: '',
                estimatedTime: '',
                ...(prev[chunkId] || {}),
                ...updates
            }
        }));
    };

    const addNestedSubtask = (chunkId) => {
        const draft = newNestedDrafts[chunkId] || { title: '', estimatedTime: '' };
        if (!draft.title?.trim()) return;

        const estimate = parseInt(draft.estimatedTime, 10);
        updateSelectedChunks(visibleChunks.map(chunk => {
            if (chunk.id !== chunkId) return chunk;
            const nextNestedSubtasks = [
                ...normalizeTaskSubtasks(chunk.subtasks),
                {
                    id: crypto.randomUUID(),
                    title: draft.title.trim(),
                    estimatedTime: Number.isFinite(estimate) && estimate > 0 ? estimate : 0,
                    completed: false,
                    difficulty: chunk.difficulty || 'easy'
                }
            ];

            return {
                ...chunk,
                estimatedTime: nextNestedSubtasks.reduce((total, nestedSubtask) => total + nestedSubtask.estimatedTime, 0),
                subtasks: nextNestedSubtasks
            };
        }));
        setNewNestedDrafts(prev => ({
            ...prev,
            [chunkId]: { title: '', estimatedTime: '' }
        }));
        setExpandedChunkIds(prev => new Set(prev).add(chunkId));
    };

    const updateNestedSubtask = (chunkId, nestedSubtaskId, updates) => {
        updateSelectedChunks(visibleChunks.map(chunk => {
            if (chunk.id !== chunkId) return chunk;
            const nextNestedSubtasks = normalizeTaskSubtasks(
                normalizeTaskSubtasks(chunk.subtasks).map(nestedSubtask => (
                    nestedSubtask.id === nestedSubtaskId ? { ...nestedSubtask, ...updates } : nestedSubtask
                ))
            );

            return {
                ...chunk,
                estimatedTime: nextNestedSubtasks.length > 0
                    ? nextNestedSubtasks.reduce((total, nestedSubtask) => total + nestedSubtask.estimatedTime, 0)
                    : 0,
                subtasks: nextNestedSubtasks
            };
        }));
    };

    const deleteNestedSubtask = (chunkId, nestedSubtaskId) => {
        updateSelectedChunks(visibleChunks.map(chunk => {
            if (chunk.id !== chunkId) return chunk;
            const nextNestedSubtasks = normalizeTaskSubtasks(chunk.subtasks)
                .filter(nestedSubtask => nestedSubtask.id !== nestedSubtaskId);

            return {
                ...chunk,
                estimatedTime: nextNestedSubtasks.length > 0
                    ? nextNestedSubtasks.reduce((total, nestedSubtask) => total + nestedSubtask.estimatedTime, 0)
                    : 0,
                subtasks: nextNestedSubtasks
            };
        }));
    };

    const reorderChunks = (chunks) => {
        setOrderedChunks(chunks);
        setEditingChunkDifficultyId(null);
        updateSelectedChunks(chunks);
    };

    const saveChunkOrder = () => {
        updateSelectedChunks(visibleChunks);
    };

    const deleteChunk = (chunkId) => {
        updateSelectedChunks(visibleChunks.filter(chunk => chunk.id !== chunkId));
    };

    const clearSelectedTask = () => {
        setSelectedTaskId(null);
        setNewChunkTitle('');
        setNewChunkEstimate('');
        setNewChunkDifficulty('easy');
        setEditingChunkDifficultyId(null);
        setIsNewChunkDifficultyOpen(false);
        setExpandedChunkIds(new Set());
        setNewNestedDrafts({});
        localStorage.removeItem('growth-selected-task-id');
    };

    // Sorting Logic
    const sortedTasks = [...activeTasks].sort((a, b) => {
        if (sortBy === 'deadline') {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        }
        if (sortBy === 'difficulty') {
            const diffOrder = { hard: 3, medium: 2, easy: 1 };
            return diffOrder[b.difficulty] - diffOrder[a.difficulty];
        }
        if (sortBy === 'chunkTime') {
            const timeA = getTaskChunkEstimate(a) || Infinity;
            const timeB = getTaskChunkEstimate(b) || Infinity;
            return timeA - timeB;
        }
        return b.id - a.id;
    });

    // Get unique subjects
    const uniqueSubjects = [...new Set(tasks.map(t => t.subject).filter(Boolean))];
    const subjectCounts = uniqueSubjects.map(subject => ({
        name: subject,
        color: getColorForSubject(subject),
        count: tasks.filter(t => t.subject === subject && isTaskActive(t)).length
    }));
    const allCount = tasks.filter(isTaskActive).length;

    // Today's Tasks Logic
    const todayTasks = tasks.filter(task => {
        if (!task.deadline || !isTaskActive(task)) return false;
        const date = new Date(task.deadline);
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    return (
        <div className="w-full flex flex-col lg:flex-row gap-8 lg:gap-16">
            {/* Main Task List */}
            <div className="flex-1">
                <div className="mb-6 sm:mb-12">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 sm:mb-6 px-2 gap-3">
                        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                            <h2 className="text-xl sm:text-2xl font-serif text-sage-600 dark:text-magma-500 drop-shadow-sm dark:drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">Tasks</h2>

                            <div className="relative z-20" ref={sortRef}>
                                <button
                                    onClick={() => setShowSort(!showSort)}
                                    className={`flex items-center gap-1 text-xs font-bold px-2 sm:px-3 py-1.5 rounded-full border transition-all ${showSort ? 'bg-sage-100 dark:bg-void-800 border-sage-500 dark:border-magma-500/50 text-sage-700 dark:text-magma-400' : 'bg-white/50 dark:bg-void-800/50 border-sage-200 dark:border-white/10 text-sage-600 dark:text-bone-200 hover:bg-white/80 dark:hover:bg-void-800'}`}
                                >
                                    <ArrowUpDown size={12} />
                                    <span className="capitalize">{sortBy === 'deadline' ? 'Due Date' : sortBy === 'chunkTime' ? 'Chunk Time' : sortBy}</span>
                                    <ChevronDown size={12} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showSort && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full left-0 mt-2 w-32 bg-gradient-to-br from-indigo-900/95 to-purple-900/95 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl overflow-hidden z-30"
                                        >
                                            <button onClick={() => { setSortBy('deadline'); setShowSort(false); }} className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/10 ${sortBy === 'deadline' ? 'text-purple-300' : 'text-white/70'}`}>
                                                Due Date
                                            </button>
                                            <button onClick={() => { setSortBy('difficulty'); setShowSort(false); }} className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/10 ${sortBy === 'difficulty' ? 'text-purple-300' : 'text-white/70'}`}>
                                                Difficulty
                                            </button>
                                            <button onClick={() => { setSortBy('newest'); setShowSort(false); }} className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/10 ${sortBy === 'newest' ? 'text-purple-300' : 'text-white/70'}`}>
                                                Newest
                                            </button>
                                            <button onClick={() => { setSortBy('chunkTime'); setShowSort(false); }} className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/10 ${sortBy === 'chunkTime' ? 'text-purple-300' : 'text-white/70'}`}>
                                                Chunk Time
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <p className="text-xs text-sage-500 dark:text-bone-200/60 px-2 sm:px-0">
                            Click a task to open chunks on the right.
                        </p>
                    </div>

                    {/* Subject Filter Pills */}
                    {uniqueSubjects.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4 px-2">
                            <button
                                onClick={() => setSelectedSubject('all')}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedSubject === 'all'
                                    ? 'bg-sage-600 text-white shadow-md'
                                    : 'bg-sage-100 text-sage-600 hover:bg-sage-200'
                                    }`}
                            >
                                All ({allCount})
                            </button>
                            {subjectCounts.map(subject => subject.count > 0 && (
                                <button
                                    key={subject.name}
                                    onClick={() => setSelectedSubject(subject.name)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedSubject === subject.name
                                        ? 'shadow-md'
                                        : 'hover:opacity-80'
                                        }`}
                                    style={{
                                        backgroundColor: selectedSubject === subject.name ? subject.color.color : subject.color.bgColor,
                                        color: selectedSubject === subject.name ? 'white' : subject.color.color
                                    }}
                                >
                                    {subject.name} ({subject.count})
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="space-y-2 px-2">
                        <AnimatePresence mode="popLayout">
                            {sortedTasks.map(task => (
                                <TaskListRow
                                    key={task.id}
                                    task={task}
                                    isSelected={String(selectedTaskId) === String(task.id)}
                                    onComplete={onCompleteTask}
                                    onDelete={onDeleteTask}
                                    onRequestAIHelp={onRequestAIHelp}
                                    onRestore={onRestoreTask}
                                    onSelect={handleSelectTask}
                                    onStartFocus={onStartFocus}
                                />
                            ))}
                        </AnimatePresence>

                        {sortedTasks.length === 0 && (
                            <div className="rounded-xl border border-dashed border-sage-200 dark:border-white/10 bg-white/60 dark:bg-void-900/60 p-6 text-center text-sm text-sage-500 dark:text-bone-200/60">
                                No active tasks here.
                            </div>
                        )}
                    </div>
                </div>

                {completedTasks.length > 0 && (
                    <div className="border-t border-sage-200 dark:border-white/10 pt-6 sm:pt-8">
                        <h2 className="text-lg sm:text-xl font-serif text-sage-400 dark:text-bone-200/50 mb-4 pl-2">Completed</h2>
                        <div className="space-y-2 px-2 opacity-75 hover:opacity-100 transition-opacity">
                            {completedTasks.map(task => (
                                <TaskListRow
                                    key={`completed-${task.id}`}
                                    task={task}
                                    isCompleted
                                    onComplete={onCompleteTask}
                                    onDelete={onDeleteTask}
                                    onRequestAIHelp={onRequestAIHelp}
                                    onRestore={onRestoreTask}
                                    onSelect={handleSelectTask}
                                    onStartFocus={onStartFocus}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Task Chunking / Daily Schedule Sidebar */}
            <div className="w-full lg:w-[26rem] shrink-0 order-first lg:order-last">
                <div className="lg:sticky lg:top-8">
                    {selectedTask ? (
                        <div className="rounded-2xl bg-white/80 dark:bg-void-900/80 border border-sage-200 dark:border-white/10 shadow-xl overflow-hidden">
                            <div className="p-5 border-b border-sage-100 dark:border-white/10">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold uppercase text-sage-400 dark:text-bone-200/50 tracking-wide">Selected Task</p>
                                        <h3 className="text-xl font-bold text-sage-800 dark:text-bone-100 leading-tight mt-1 break-words">
                                            {selectedTask.title || 'Untitled Task'}
                                        </h3>
                                    </div>
                                    <button
                                        onClick={clearSelectedTask}
                                        className="p-2 rounded-lg text-sage-400 hover:text-sage-700 hover:bg-sage-100 dark:hover:bg-void-800 dark:hover:text-bone-200 transition-colors"
                                        title="Back to schedule"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-4 text-xs font-bold">
                                    {selectedTask.subject && (
                                        <span
                                            className="px-2.5 py-1 rounded-full"
                                            style={{
                                                backgroundColor: getColorForSubject(selectedTask.subject).bgColor,
                                                color: getColorForSubject(selectedTask.subject).color
                                            }}
                                        >
                                            {selectedTask.subject}
                                        </span>
                                    )}
                                    <span className="px-2.5 py-1 rounded-full bg-sage-100 dark:bg-void-800 text-sage-600 dark:text-bone-300 capitalize">
                                        {selectedTask.difficulty}
                                    </span>
                                    {chunkTotalMinutes > 0 && (
                                        <span className="px-2.5 py-1 rounded-full bg-sage-100 dark:bg-void-800 text-sage-600 dark:text-bone-300 inline-flex items-center gap-1">
                                            <Clock size={12} />
                                            {formatEstimatedTime(chunkTotalMinutes)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="p-5">
                                <div className="flex items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h4 className="text-lg font-bold text-sage-800 dark:text-bone-100">Task Chunks</h4>
                                        <p className="text-sm text-sage-500 dark:text-bone-200/60">
                                            {selectedChunks.length > 0
                                                ? `${completedChunks}/${selectedChunks.length} done${chunkTotalMinutes > 0 ? ` - ${formatEstimatedTime(chunkTotalMinutes)} total` : ''}`
                                                : 'Break it into one small next step.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onCompleteTask(selectedTask.id)}
                                        className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-sage-600 hover:bg-sage-700 text-white text-sm font-bold transition-colors"
                                    >
                                        <CheckCircle2 size={16} />
                                        Done
                                    </button>
                                </div>

                                <Reorder.Group
                                    as="div"
                                    axis="y"
                                    values={visibleChunks}
                                    onReorder={reorderChunks}
                                    className="space-y-3"
                                >
                                    {visibleChunks.map((chunk) => {
                                        const difficultyStyle = getChunkDifficultyStyle(chunk.difficulty);

                                        return (
                                            <ChunkReorderItem
                                                key={chunk.id}
                                                chunk={chunk}
                                                difficultyStyle={difficultyStyle}
                                                chunkDifficultyOptions={chunkDifficultyOptions}
                                                editingChunkDifficultyId={editingChunkDifficultyId}
                                                expandedChunkIds={expandedChunkIds}
                                                getChunkDifficultyStyle={getChunkDifficultyStyle}
                                                newNestedDraft={newNestedDrafts[chunk.id]}
                                                onAddNested={addNestedSubtask}
                                                onChooseDifficulty={chooseChunkDifficulty}
                                                onDelete={deleteChunk}
                                                onDeleteNested={deleteNestedSubtask}
                                                onDragEnd={saveChunkOrder}
                                                onSetEditingDifficulty={setEditingChunkDifficultyId}
                                                onToggleExpanded={toggleChunkExpanded}
                                                onUpdate={updateChunk}
                                                onUpdateNested={updateNestedSubtask}
                                                onUpdateNestedDraft={updateNestedDraft}
                                            />
                                        );
                                    })}
                                </Reorder.Group>

                                <div className={`relative mt-4 rounded-xl border p-3 ${getChunkDifficultyStyle(newChunkDifficulty).panel}`}>
                                    <div className="grid grid-cols-[1fr_4.5rem_auto_auto] gap-2 items-center">
                                        <input
                                            type="text"
                                            value={newChunkTitle}
                                            onChange={(event) => setNewChunkTitle(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    addChunk();
                                                }
                                            }}
                                            className={`min-w-0 px-1 py-2.5 rounded-lg bg-transparent border border-transparent text-sm font-semibold ${getChunkDifficultyStyle(newChunkDifficulty).text} placeholder-sage-500 focus:outline-none focus:ring-2 ${getChunkDifficultyStyle(newChunkDifficulty).focus} focus:bg-white/45 dark:focus:bg-void-900/45`}
                                            placeholder="Add a small step"
                                        />
                                        <input
                                            type="number"
                                            min="1"
                                            value={newChunkEstimate}
                                            onChange={(event) => setNewChunkEstimate(event.target.value)}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    addChunk();
                                                }
                                            }}
                                            className={`px-2 py-2.5 text-right rounded-lg bg-transparent border border-transparent text-sm font-bold ${getChunkDifficultyStyle(newChunkDifficulty).text} placeholder-sage-500 focus:outline-none focus:ring-2 ${getChunkDifficultyStyle(newChunkDifficulty).focus} focus:bg-white/45 dark:focus:bg-void-900/45`}
                                            placeholder="min"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setIsNewChunkDifficultyOpen(!isNewChunkDifficultyOpen)}
                                            className={`p-2.5 rounded-xl transition-colors ${getChunkDifficultyStyle(newChunkDifficulty).icon}`}
                                            title="Edit new chunk difficulty"
                                        >
                                            <Palette size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={addChunk}
                                            disabled={!newChunkTitle.trim()}
                                            className="p-2.5 rounded-xl bg-sage-600 hover:bg-sage-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            title="Add chunk"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>

                                    {isNewChunkDifficultyOpen && (
                                        <div className="absolute right-12 top-14 z-30 flex gap-1 rounded-xl border border-white/70 dark:border-white/10 bg-white/95 dark:bg-void-900/95 p-1.5 shadow-xl">
                                            {chunkDifficultyOptions.map(option => {
                                                const optionStyle = getChunkDifficultyStyle(option.value);
                                                const isActive = newChunkDifficulty === option.value;

                                                return (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewChunkDifficulty(option.value);
                                                            setIsNewChunkDifficultyOpen(false);
                                                        }}
                                                        className={`h-8 px-2.5 rounded-lg border text-xs font-bold transition-colors ${isActive ? optionStyle.activeButton : optionStyle.inactiveButton}`}
                                                    >
                                                        {option.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <h3 className="text-lg sm:text-xl font-serif font-bold text-sage-600 dark:text-magma-500 mb-3 sm:mb-4 flex items-center gap-2">
                                <span className="text-xl sm:text-2xl">📅</span> Today's Schedule
                            </h3>

                            <div className="space-y-3">
                                {todayTasks.length === 0 ? (
                                    <div className="p-4 sm:p-6 text-center bg-gradient-to-br from-purple-500/20 to-indigo-600/20 backdrop-blur-sm border border-purple-400/30 rounded-xl text-purple-200/80 italic text-sm sm:text-base">
                                        No tasks scheduled for today.
                                        <br />
                                        <span className="text-sm">Enjoy your freedom!</span>
                                    </div>
                                ) : (
                                    todayTasks.map(task => {
                                        const subjectColor = getColorForSubject(task.subject);
                                        const time = new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        const taskChunkMinutes = getTaskChunkEstimate(task);

                                        return (
                                            <div
                                                key={task.id}
                                                className="p-3 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                                style={{
                                                    backgroundColor: subjectColor.bgColor,
                                                    borderLeftColor: subjectColor.color
                                                }}
                                                onClick={() => handleSelectTask(task.id)}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span
                                                        className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20"
                                                        style={{ color: subjectColor.color }}
                                                    >
                                                        {task.subject}
                                                    </span>
                                                    <span className="text-xs font-medium opacity-70" style={{ color: subjectColor.color }}>
                                                        {time}
                                                    </span>
                                                </div>
                                                <h4 className="font-bold text-sm mb-1 text-ink-800 dark:text-ink-800 line-clamp-2">
                                                    {task.title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs opacity-80 text-ink-500">
                                                    <span className="capitalize">{task.difficulty}</span>
                                                    {task.status === 'growing' && <span>In Progress</span>}
                                                    {taskChunkMinutes > 0 && (
                                                        <span className="ml-auto font-medium" style={{ color: subjectColor.color }}>
                                                            {formatEstimatedTime(taskChunkMinutes)}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                {activeTasks.length > 0 && (
                                    <p className="text-xs text-sage-500 dark:text-bone-200/60 text-center px-2">
                                        Click any task to open chunking here.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Garden;
