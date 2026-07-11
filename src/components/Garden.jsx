import React, { useState, useRef, useEffect } from 'react';
import { motion as Motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { ArrowUpDown, CalendarDays, CheckCircle2, ChevronDown, Circle, Clock, GripVertical, Palette, Play, Plus, Save, Sparkles, Target, Trash2, X } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';
import { getTaskChunkEstimate, isTaskActive, isTaskCompleted, normalizeTaskSubtasks } from '../utils/taskState';
import { toast } from '../ui/Toast';
import { Sheet } from '../ui';
import FocusTimer from './FocusTimer';

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
                    <Motion.div
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
                    </Motion.div>
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
    const progress = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

    const formatEstimatedTime = (minutes) => {
        if (!minutes) return null;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
        if (hours > 0) return `${hours}h`;
        return `${mins}m`;
    };

    const getDueMeta = () => {
        if (!task.deadline) {
            return {
                label: 'No due date',
                tone: 'text-slate-500 bg-slate-100 dark:bg-void-800 dark:text-bone-300'
            };
        }

        const due = new Date(task.deadline);
        const now = new Date();
        const isToday = due.toDateString() === now.toDateString();
        const tomorrow = new Date(now);
        tomorrow.setDate(now.getDate() + 1);
        const isOverdue = due < now && !isCompleted;
        const datePart = isToday
            ? 'Today'
            : due.toDateString() === tomorrow.toDateString()
                ? 'Tomorrow'
                : due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        return {
            label: `${isOverdue ? 'Overdue' : datePart} ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            tone: isOverdue
                ? 'text-rose-700 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-200'
                : isToday
                    ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-200'
                    : 'text-sage-700 bg-sage-50 dark:bg-sage-950/30 dark:text-sage-200'
        };
    };

    const dueMeta = getDueMeta();
    const difficultyTone = {
        easy: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-200',
        medium: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-200',
        hard: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-200'
    }[task.difficulty] || 'bg-slate-100 text-slate-600 dark:bg-void-800 dark:text-bone-300';

    return (
        <Motion.div
            layout
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            whileHover={!isCompleted ? { x: 4 } : undefined}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className={`group relative overflow-hidden transition-colors dark:bg-transparent ${
                isSelected
                    ? 'rounded-[1.35rem] border-transparent bg-sage-50/95 shadow-[0_18px_42px_rgba(86,129,113,0.12)] ring-1 ring-sage-200 dark:bg-void-800/80 dark:ring-magma-500/20'
                    : 'bg-transparent hover:rounded-[1.35rem] hover:bg-white/60 dark:hover:bg-void-900/50'
            } ${isCompleted ? 'opacity-60 grayscale-[0.15]' : ''}`}
        >
            <div
                className="absolute left-0 top-5 h-10 w-1.5 rounded-full"
                style={{ backgroundColor: task.subject ? subjectColor.color : '#84b59f' }}
            />
            <div
                onClick={() => isCompleted ? onRestore(task.id) : onSelect(task.id)}
                className="w-full cursor-pointer px-2 py-4 pl-5 text-left sm:px-4"
            >
                <div className="flex items-start gap-3">
                    <Motion.button
                        type="button"
                        whileTap={{ scale: 0.86 }}
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
                        className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${
                            isCompleted
                                ? 'border-sage-500 bg-sage-500 text-white'
                                : 'border-sage-200 bg-white text-sage-500 shadow-sm hover:border-sage-500 hover:bg-sage-500 hover:text-white dark:border-white/10 dark:bg-void-800'
                        }`}
                        title={isCompleted ? 'Restore task' : 'Complete task'}
                    >
                        {isCompleted ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                    </Motion.button>

                    <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-2">
                                    <h3 className={`truncate text-base font-extrabold leading-6 text-sage-950 dark:text-bone-100 ${isCompleted ? 'line-through' : ''}`}>
                                        {task.title || 'Untitled Task'}
                                    </h3>
                                    {isSelected && (
                                        <Motion.span
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="hidden rounded-full bg-sage-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-sage-700 sm:inline-flex dark:bg-magma-900/40 dark:text-magma-200"
                                        >
                                            Open
                                        </Motion.span>
                                    )}
                                </div>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-bold">
                                    {task.subject && (
                                        <span
                                            className="rounded-full px-2.5 py-1"
                                            style={{
                                                backgroundColor: subjectColor.bgColor,
                                                color: subjectColor.color
                                            }}
                                        >
                                            {task.subject}
                                        </span>
                                    )}
                                    <span className={`rounded-full px-2.5 py-1 capitalize ${difficultyTone}`}>{task.difficulty || 'easy'}</span>
                                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 ${dueMeta.tone}`}>
                                        <Clock size={12} />
                                        {dueMeta.label}
                                    </span>
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
                                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-sage-400 transition-colors hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-900/20"
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
                                        className="hidden h-9 w-9 items-center justify-center rounded-xl text-sage-400 transition-colors hover:bg-sky-50 hover:text-sky-600 sm:inline-flex dark:hover:bg-sky-900/20"
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
                                    className="flex h-9 w-9 items-center justify-center rounded-xl text-sage-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20"
                                    title="Delete task"
                                >
                                    <Trash2 size={16} />
                                </button>
                                {!isCompleted && <ChevronDown size={17} className={`text-sage-400 transition-transform ${isSelected ? 'rotate-180' : ''}`} />}
                            </div>
                        </div>

                        {subtasks.length > 0 && (
                            <div className="mt-3 max-w-xl">
                                <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-sage-500 dark:text-bone-200/60">
                                    <span>{completedSubtasks}/{subtasks.length} chunks</span>
                                    <span>{chunkTotalMinutes > 0 ? formatEstimatedTime(chunkTotalMinutes) : `${progress}%`}</span>
                                </div>
                                <div className="h-1.5 overflow-hidden rounded-full bg-sage-100 dark:bg-void-800">
                                    <Motion.div
                                        className="h-full rounded-full bg-sage-500"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Motion.div>
    );
};

const toDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const toTimeInputValue = (value) => {
    if (!value) return '09:00';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '09:00';
    return date.toTimeString().slice(0, 5);
};

const Garden = ({ tasks, onCompleteTask, onDeleteTask, onUpdateTask, onRestoreTask, onRequestAIHelp, existingSubjects = [] }) => {
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
    const [taskDraft, setTaskDraft] = useState({
        title: '',
        date: '',
        time: '09:00',
        subject: '',
        difficulty: 'easy'
    });
    const [isTaskDraftDirty, setIsTaskDraftDirty] = useState(false);
    const [isTaskSaving, setIsTaskSaving] = useState(false);
    const [focusTask, setFocusTask] = useState(null);
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
    const selectedTaskTitle = selectedTask?.title || '';
    const selectedTaskDeadline = selectedTask?.deadline || null;
    const selectedTaskSubject = selectedTask?.subject || '';
    const selectedTaskDifficulty = selectedTask?.difficulty || 'easy';
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
    // selectedChunks is derived anew each render; selectedChunkKey tracks its meaningful changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTask?.id, selectedChunkKey]);

    useEffect(() => {
        if (!selectedTask) {
            setTaskDraft({
                title: '',
                date: '',
                time: '09:00',
                subject: '',
                difficulty: 'easy'
            });
            setIsTaskDraftDirty(false);
            setIsTaskSaving(false);
            return;
        }

        setTaskDraft({
            title: selectedTaskTitle,
            date: toDateInputValue(selectedTaskDeadline),
            time: toTimeInputValue(selectedTaskDeadline),
            subject: selectedTaskSubject,
            difficulty: selectedTaskDifficulty
        });
        setIsTaskDraftDirty(false);
        setIsTaskSaving(false);
    // selectedTask fields below are the values that should refresh this draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedTask?.id, selectedTaskDeadline, selectedTaskDifficulty, selectedTaskSubject, selectedTaskTitle]);

    const updateTaskDraft = (updates) => {
        setTaskDraft(prev => ({ ...prev, ...updates }));
        setIsTaskDraftDirty(true);
    };

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

    const saveTaskDetails = async () => {
        if (!selectedTask || !taskDraft.title.trim() || isTaskSaving) return;

        const deadline = taskDraft.date
            ? new Date(`${taskDraft.date}T${taskDraft.time || '09:00'}`).toISOString()
            : null;

        setIsTaskSaving(true);
        try {
            await onUpdateTask(selectedTask.id, {
                title: taskDraft.title.trim(),
                deadline,
                subject: taskDraft.subject.trim() || null,
                difficulty: taskDraft.difficulty
            });
            setIsTaskDraftDirty(false);
        } catch (error) {
            console.error('Failed to save task details:', error);
            toast(error?.message || 'Could not save this task.', { tone: 'error' });
        } finally {
            setIsTaskSaving(false);
        }
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
    const overdueCount = tasks.filter(task => task.deadline && isTaskActive(task) && new Date(task.deadline) < new Date()).length;
    const chunkedCount = tasks.filter(task => isTaskActive(task) && normalizeTaskSubtasks(task.subtasks).length > 0).length;

    return (
        <div className="w-full">
            <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 mx-2 overflow-hidden rounded-[1.75rem] border border-sage-100 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-void-900/70"
            >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="app-eyebrow flex items-center gap-2">
                            <Target size={15} />
                            Tasks
                        </div>
                        <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                            <span className="text-3xl font-bold leading-none text-sage-950 dark:text-bone-100">{allCount}</span>
                            <span className="pb-1 text-sm font-bold text-sage-500 dark:text-bone-200/60">active</span>
                        </div>
                    </div>

                    <div className="grid min-w-0 grid-cols-3 gap-2 sm:w-[23rem]">
                        <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] px-3 py-2">
                            <div className="app-eyebrow text-[var(--color-muted)]">Today</div>
                            <div className="text-xl font-bold text-[var(--color-ink)]">{todayTasks.length}</div>
                        </div>
                        <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] px-3 py-2">
                            <div className="app-eyebrow text-[var(--color-muted)]">Chunked</div>
                            <div className="text-xl font-bold text-[var(--color-ink)]">{chunkedCount}</div>
                        </div>
                        <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] px-3 py-2">
                            <div className="app-eyebrow text-[var(--color-muted)]">Late</div>
                            <div className="text-xl font-bold text-[var(--color-error)]">{overdueCount}</div>
                        </div>
                    </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-sage-500 via-amber-400 to-sky-500" />
            </Motion.div>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            {/* Main Task List */}
            <div className="min-w-0 flex-1">
                <div className="mb-6 px-2">
                    <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                            <div>
                                <h2 className="app-section-title">All tasks</h2>
                            </div>

                            <div className="relative z-20" ref={sortRef}>
                                <button
                                    onClick={() => setShowSort(!showSort)}
                                    className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all ${showSort ? 'bg-sage-600 border-sage-600 text-white shadow-md' : 'bg-white border-sage-200 text-sage-700 hover:border-sage-300 hover:bg-sage-50 dark:bg-void-800 dark:border-white/10 dark:text-bone-200'}`}
                                >
                                    <ArrowUpDown size={12} />
                                    <span className="capitalize">{sortBy === 'deadline' ? 'Due Date' : sortBy === 'chunkTime' ? 'Chunk Time' : sortBy}</span>
                                    <ChevronDown size={12} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showSort && (
                                        <Motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full left-0 mt-2 w-36 overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-2xl z-30 dark:border-white/10 dark:bg-void-900"
                                        >
                                            <button onClick={() => { setSortBy('deadline'); setShowSort(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-sage-50 dark:hover:bg-void-800 ${sortBy === 'deadline' ? 'text-sage-700' : 'text-slate-500 dark:text-bone-300'}`}>
                                                Due Date
                                            </button>
                                            <button onClick={() => { setSortBy('difficulty'); setShowSort(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-sage-50 dark:hover:bg-void-800 ${sortBy === 'difficulty' ? 'text-sage-700' : 'text-slate-500 dark:text-bone-300'}`}>
                                                Difficulty
                                            </button>
                                            <button onClick={() => { setSortBy('newest'); setShowSort(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-sage-50 dark:hover:bg-void-800 ${sortBy === 'newest' ? 'text-sage-700' : 'text-slate-500 dark:text-bone-300'}`}>
                                                Newest
                                            </button>
                                            <button onClick={() => { setSortBy('chunkTime'); setShowSort(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-sage-50 dark:hover:bg-void-800 ${sortBy === 'chunkTime' ? 'text-sage-700' : 'text-slate-500 dark:text-bone-300'}`}>
                                                Chunk Time
                                            </button>
                                        </Motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <span className="rounded-full bg-sage-50 px-3 py-1.5 text-xs font-bold text-sage-600 dark:bg-void-800 dark:text-bone-200">
                            {sortedTasks.length} shown
                        </span>
                    </div>

                    {/* Subject Filter Pills */}
                    {uniqueSubjects.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4 px-1">
                            <button
                                onClick={() => setSelectedSubject('all')}
                                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedSubject === 'all'
                                    ? 'bg-sage-600 text-white shadow-md shadow-sage-600/20'
                                    : 'bg-white text-sage-600 ring-1 ring-sage-100 hover:bg-sage-50'
                                    }`}
                            >
                                All ({allCount})
                            </button>
                            {subjectCounts.map(subject => subject.count > 0 && (
                                <button
                                    key={subject.name}
                                    onClick={() => setSelectedSubject(subject.name)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedSubject === subject.name
                                        ? 'shadow-md scale-[1.02]'
                                        : 'hover:opacity-80 ring-1 ring-white/60'
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

                    <Motion.div layout className="relative">
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
                                    onStartFocus={setFocusTask}
                                />
                            ))}
                        </AnimatePresence>

                        {sortedTasks.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-sage-200 bg-white/70 p-8 text-center text-sm font-medium text-sage-500 dark:border-white/10 dark:bg-void-900/60 dark:text-bone-200/60">
                                No tasks.
                            </div>
                        )}
                    </Motion.div>
                </div>

                {completedTasks.length > 0 && (
                    <div className="rounded-3xl border border-sage-100 bg-white/50 p-3 shadow-sm dark:border-white/10 dark:bg-void-900/40 sm:p-4">
                        <h2 className="app-section-title mb-4 pl-1">Completed</h2>
                        <div className="space-y-3 opacity-75 hover:opacity-100 transition-opacity">
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
                                    onStartFocus={setFocusTask}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Task Chunking / Daily Schedule Sidebar */}
            <div className="w-full lg:w-[28rem] shrink-0 order-first lg:order-last">
                <div className="lg:sticky lg:top-6">
                    <AnimatePresence mode="wait">
                    {selectedTask ? (
                        <Motion.div
                            key="selected-task"
                            initial={{ opacity: 0, x: 24, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 16, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
                            className="overflow-hidden rounded-[2rem] border border-sage-100 bg-white/90 shadow-xl shadow-sage-900/5 backdrop-blur dark:border-white/10 dark:bg-void-900/90"
                        >
                            <div className="border-b border-sage-100 bg-sage-50/75 p-5 dark:border-white/10 dark:bg-void-800/45">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-xs font-black uppercase tracking-wide text-sage-500 ring-1 ring-sage-100 dark:bg-void-900 dark:ring-white/10">
                                            <Target size={12} />
                                            Selected task
                                        </p>
                                        <input
                                            type="text"
                                            value={taskDraft.title}
                                            onChange={(event) => updateTaskDraft({ title: event.target.value })}
                                            onKeyDown={(event) => {
                                                if (event.key === 'Enter') {
                                                    event.preventDefault();
                                                    saveTaskDetails();
                                                }
                                            }}
                                            className="mt-3 w-full rounded-xl border border-transparent bg-transparent px-0 py-1 text-2xl font-black leading-tight text-sage-900 outline-none transition focus:border-sage-200 focus:bg-white/80 focus:px-3 focus:ring-2 focus:ring-sage-300 dark:text-bone-100 dark:focus:border-white/10 dark:focus:bg-void-800"
                                            placeholder="Task name"
                                        />
                                    </div>
                                    <button
                                        onClick={clearSelectedTask}
                                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-sage-400 shadow-sm ring-1 ring-sage-100 transition-colors hover:text-sage-700 dark:bg-void-900 dark:ring-white/10 dark:hover:text-bone-200"
                                        title="Back to schedule"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>

                                <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-sage-400 dark:text-bone-200/50">
                                            Due date
                                        </label>
                                        <input
                                            type="date"
                                            value={taskDraft.date}
                                            onChange={(event) => updateTaskDraft({ date: event.target.value })}
                                            className="w-full border-b border-sage-200 bg-transparent px-0 py-2 text-sm font-bold text-sage-900 outline-none transition focus:border-sage-500 dark:border-white/10 dark:text-bone-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-sage-400 dark:text-bone-200/50">
                                            Time
                                        </label>
                                        <input
                                            type="time"
                                            value={taskDraft.time}
                                            onChange={(event) => updateTaskDraft({ time: event.target.value })}
                                            disabled={!taskDraft.date}
                                            className="w-full border-b border-sage-200 bg-transparent px-0 py-2 text-sm font-bold text-sage-900 outline-none transition focus:border-sage-500 disabled:opacity-50 dark:border-white/10 dark:text-bone-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-sage-400 dark:text-bone-200/50">
                                            Tag
                                        </label>
                                        <input
                                            type="text"
                                            value={taskDraft.subject}
                                            onChange={(event) => updateTaskDraft({ subject: event.target.value })}
                                            list="garden-task-tags"
                                            className="w-full border-b border-sage-200 bg-transparent px-0 py-2 text-sm font-bold text-sage-900 outline-none transition placeholder:text-sage-400 focus:border-sage-500 dark:border-white/10 dark:text-bone-100"
                                            placeholder="Tag"
                                        />
                                        <datalist id="garden-task-tags">
                                            {existingSubjects.map(subject => (
                                                <option key={subject} value={subject} />
                                            ))}
                                        </datalist>
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-sage-400 dark:text-bone-200/50">
                                            Difficulty
                                        </label>
                                        <select
                                            value={taskDraft.difficulty}
                                            onChange={(event) => updateTaskDraft({ difficulty: event.target.value })}
                                            className="w-full border-b border-sage-200 bg-transparent px-0 py-2 text-sm font-bold capitalize text-sage-900 outline-none transition focus:border-sage-500 dark:border-white/10 dark:text-bone-100"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold">
                                    <button
                                        type="button"
                                        onClick={saveTaskDetails}
                                        disabled={!isTaskDraftDirty || !taskDraft.title.trim() || isTaskSaving}
                                        className="inline-flex items-center gap-1.5 rounded-xl bg-sage-600 px-3.5 py-2.5 text-white transition-colors hover:bg-sage-700 disabled:cursor-not-allowed disabled:opacity-45"
                                    >
                                        <Save size={14} />
                                        {isTaskSaving ? 'Saving...' : 'Save details'}
                                    </button>
                                    {taskDraft.date && (
                                        <button
                                            type="button"
                                            onClick={() => updateTaskDraft({ date: '', time: '09:00' })}
                                            className="rounded-xl px-3 py-2.5 text-sage-500 transition-colors hover:bg-white hover:text-sage-700 dark:text-bone-300 dark:hover:bg-void-800"
                                        >
                                            Clear due date
                                        </button>
                                    )}
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
                                        <h4 className="text-lg font-black text-sage-900 dark:text-bone-100">Task Chunks</h4>
                                        <p className="text-sm text-sage-500 dark:text-bone-200/60">
                                            {selectedChunks.length > 0
                                                ? `${completedChunks}/${selectedChunks.length} done${chunkTotalMinutes > 0 ? ` - ${formatEstimatedTime(chunkTotalMinutes)} total` : ''}`
                                                : 'Break it into one small next step.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => onCompleteTask(selectedTask.id)}
                                        className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-sage-600 hover:bg-sage-700 text-white text-sm font-bold transition-colors shadow-md shadow-sage-600/20"
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

                                <div className={`relative mt-4 rounded-2xl border p-3 ${getChunkDifficultyStyle(newChunkDifficulty).panel}`}>
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
                        </Motion.div>
                    ) : (
                        <Motion.div
                            key="today-panel"
                            initial={{ opacity: 0, x: 24, scale: 0.98 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 16, scale: 0.98 }}
                            transition={{ type: 'spring', stiffness: 340, damping: 34 }}
                            className="rounded-3xl border border-sage-100 bg-white/80 p-4 shadow-lg shadow-sage-900/5 backdrop-blur dark:border-white/10 dark:bg-void-900/80"
                        >
                            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-sage-800 dark:text-bone-100">
                                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-900/30">
                                    <CalendarDays size={18} />
                                </span>
                                Today's Schedule
                            </h3>

                            <div className="space-y-3">
                                {todayTasks.length === 0 ? (
                                    <div className="rounded-2xl border border-dashed border-sage-200 bg-sage-50/70 p-6 text-center text-sm font-medium text-sage-500 dark:border-white/10 dark:bg-void-800/60 dark:text-bone-200/60">
                                        Nothing scheduled today.
                                    </div>
                                ) : (
                                    todayTasks.map(task => {
                                        const subjectColor = getColorForSubject(task.subject);
                                        const time = new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                        const taskChunkMinutes = getTaskChunkEstimate(task);

                                        return (
                                            <Motion.div
                                                key={task.id}
                                                whileHover={{ y: -2, scale: 1.01 }}
                                                whileTap={{ scale: 0.99 }}
                                                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/70 p-3 shadow-sm transition-shadow hover:shadow-md dark:border-white/10"
                                                style={{
                                                    backgroundColor: subjectColor.bgColor,
                                                    boxShadow: `inset 4px 0 0 ${subjectColor.color}`
                                                }}
                                                onClick={() => handleSelectTask(task.id)}
                                            >
                                                <div className="mb-2 flex justify-between items-start gap-3">
                                                    <span
                                                        className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-black dark:bg-black/20"
                                                        style={{ color: subjectColor.color }}
                                                    >
                                                        {task.subject || 'Task'}
                                                    </span>
                                                    <span className="text-xs font-black opacity-70" style={{ color: subjectColor.color }}>
                                                        {time}
                                                    </span>
                                                </div>
                                                <h4 className="mb-2 line-clamp-2 text-sm font-black text-ink-800 dark:text-ink-800">
                                                    {task.title}
                                                </h4>
                                                <div className="flex items-center gap-2 text-xs font-bold opacity-80 text-ink-500">
                                                    <span className="capitalize">{task.difficulty}</span>
                                                    {task.status === 'growing' && <span>In Progress</span>}
                                                    {taskChunkMinutes > 0 && (
                                                        <span className="ml-auto font-medium" style={{ color: subjectColor.color }}>
                                                            {formatEstimatedTime(taskChunkMinutes)}
                                                        </span>
                                                    )}
                                                </div>
                                            </Motion.div>
                                        );
                                    })
                                )}
                                {activeTasks.length > 0 && (
                                    <p className="px-2 text-center text-xs font-medium text-sage-500 dark:text-bone-200/60">
                                        Click any task to open chunking here.
                                    </p>
                                )}
                            </div>
                        </Motion.div>
                    )}
                    </AnimatePresence>
                </div>
            </div>
            </div>
            <Sheet
                open={Boolean(focusTask)}
                onClose={() => setFocusTask(null)}
                title="Focus"
                description="Stay with one task."
            >
                {focusTask && (
                    <FocusTimer
                        task={focusTask}
                        onComplete={(minutes) => {
                            const focusSessions = Array.isArray(focusTask.focus_sessions) ? focusTask.focus_sessions : [];
                            onUpdateTask(focusTask.id, {
                                focus_sessions: [...focusSessions, { minutes, endedAt: new Date().toISOString() }],
                            });
                            setFocusTask(null);
                        }}
                    />
                )}
            </Sheet>
        </div>
    );
};

export default Garden;
