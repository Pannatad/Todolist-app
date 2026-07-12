import React from 'react';
import { motion as Motion, Reorder, useDragControls } from 'framer-motion';
import { CheckCircle2, ChevronDown, Circle, Clock, GripVertical, Palette, Play, Sparkles, Target, Trash2 } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';
import { getTaskChunkEstimate, isTaskActive, normalizeTaskSubtasks } from '../utils/taskState';

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


export { ChunkReorderItem, TaskListRow };

