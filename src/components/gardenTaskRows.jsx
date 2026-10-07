import React, { useEffect, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { Check, ChevronDown, GripVertical, MessageCircle, MoreHorizontal, Play, Trash2, X } from 'lucide-react';
import { RowMenu } from '../ui';
import { getColorForSubject } from '../constants/subjects';
import { getTaskChunkEstimate, normalizeTaskSubtasks } from '../utils/taskState';
import { formatTaskDueAbsolute, formatTaskDueRelative, getTaskDueState } from './taskDueFormat';

const formatEstimate = (minutes) => {
    if (!minutes) return 'No estimate';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return hours ? `${hours}h${rest ? ` ${rest}m` : ''}` : `${rest}m`;
};

const ChunkReorderItem = ({ chunk, expandedChunkIds, newNestedDraft, onAddNested, onDelete, onDeleteNested, onDragEnd, onToggleExpanded, onUpdate, onUpdateNested, onUpdateNestedDraft }) => {
    const dragControls = useDragControls();
    const nested = normalizeTaskSubtasks(chunk.subtasks);
    const expanded = expandedChunkIds.has(chunk.id);
    const draft = newNestedDraft || { title: '', estimatedTime: '' };
    const estimate = nested.length ? nested.reduce((sum, item) => sum + item.estimatedTime, 0) : chunk.estimatedTime;
    return (
        <Reorder.Item value={chunk} dragListener={false} dragControls={dragControls} onDragEnd={onDragEnd} className="subtask-row">
            <div className="subtask-main">
                <button type="button" className="subtask-grip" onPointerDown={(event) => dragControls.start(event)} aria-label="Reorder subtask"><GripVertical size={15} /></button>
                <button type="button" className="task-check subtask-check" aria-pressed={chunk.completed} onClick={() => onUpdate(chunk.id, { completed: !chunk.completed })} aria-label={chunk.completed ? `Mark ${chunk.title} not done` : `Complete ${chunk.title}`}>
                    <span>{chunk.completed && <Check size={12} strokeWidth={3.2} />}</span>
                </button>
                <input className={`subtask-title${chunk.completed ? ' is-done' : ''}`} value={chunk.title} onChange={(event) => onUpdate(chunk.id, { title: event.target.value })} aria-label="Subtask title" />
                <label className="subtask-estimate">
                    <input type="number" min="0" readOnly={nested.length > 0} value={estimate || ''} onChange={(event) => onUpdate(chunk.id, { estimatedTime: Number(event.target.value) || 0 })} aria-label="Subtask estimate in minutes" placeholder="–" />
                    <span aria-hidden="true">m</span>
                </label>
                <RowMenu
                    label={`Actions for ${chunk.title}`}
                    items={[
                        { label: expanded ? 'Hide Steps' : nested.length ? 'Show Steps' : 'Add Steps', icon: ChevronDown, onSelect: () => onToggleExpanded(chunk.id) },
                        { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => onDelete(chunk.id) },
                    ]}
                />
            </div>
            {nested.length > 0 && !expanded && (
                <button type="button" className="nested-toggle" onClick={() => onToggleExpanded(chunk.id)}>{nested.length} {nested.length === 1 ? 'step' : 'steps'}</button>
            )}
            {expanded && <div className="nested-list">
                {nested.map((item) => <div key={item.id} className="nested-row">
                    <button type="button" className="task-check subtask-check" aria-pressed={item.completed} onClick={() => onUpdateNested(chunk.id, item.id, { completed: !item.completed })} aria-label={item.completed ? `Mark ${item.title} not done` : `Complete ${item.title}`}>
                        <span>{item.completed && <Check size={11} strokeWidth={3.2} />}</span>
                    </button>
                    <input className={`subtask-title${item.completed ? ' is-done' : ''}`} value={item.title} onChange={(event) => onUpdateNested(chunk.id, item.id, { title: event.target.value })} aria-label="Nested subtask title" />
                    <label className="subtask-estimate">
                        <input type="number" min="0" value={item.estimatedTime || ''} onChange={(event) => onUpdateNested(chunk.id, item.id, { estimatedTime: Number(event.target.value) || 0 })} aria-label="Nested estimate in minutes" placeholder="–" />
                        <span aria-hidden="true">m</span>
                    </label>
                    <button type="button" className="form-remove" onClick={() => onDeleteNested(chunk.id, item.id)} aria-label="Delete nested subtask"><X size={13} strokeWidth={2.6} /></button>
                </div>)}
                <div className="nested-row nested-new">
                    <input value={draft.title} onChange={(event) => onUpdateNestedDraft(chunk.id, { title: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); onAddNested(chunk.id); } }} placeholder="Add step" aria-label="New nested task" />
                    <label className="subtask-estimate">
                        <input type="number" min="1" value={draft.estimatedTime} onChange={(event) => onUpdateNestedDraft(chunk.id, { estimatedTime: event.target.value })} placeholder="–" aria-label="New nested estimate" />
                        <span aria-hidden="true">m</span>
                    </label>
                    {draft.title.trim() && <button type="button" className="ui-text-button" onClick={() => onAddNested(chunk.id)}>Add</button>}
                </div>
            </div>}
        </Reorder.Item>
    );
};

const useCompletion = (onComplete) => {
    const [done, setDone] = useState(false);
    const timer = useRef(null);
    useEffect(() => () => window.clearTimeout(timer.current), []);
    const complete = (id) => {
        if (done) return;
        setDone(true);
        // Let the filled circle register before the row leaves the list.
        timer.current = window.setTimeout(() => onComplete(id), 420);
    };
    return [done, complete];
};

const TaskListRow = ({ task, isCompleted = false, isSelected = false, onComplete, onDelete, onRequestAIHelp, onRestore, onSelect, onStartFocus, showRelativeDue }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const [completing, complete] = useCompletion(onComplete);
    const menuRef = useRef(null);
    const color = getColorForSubject(task.subject);
    const category = task.subject || 'No category';
    const dueState = getTaskDueState(task.deadline, isCompleted);
    const absoluteDue = formatTaskDueAbsolute(task.deadline, isCompleted);
    const dueLabel = showRelativeDue ? formatTaskDueRelative(task.deadline) : absoluteDue;
    const estimate = getTaskChunkEstimate(task);
    const checked = isCompleted || completing;

    useEffect(() => {
        if (!menuOpen) return undefined;
        const closeOnOutsidePress = (event) => {
            if (!menuRef.current?.contains(event.target)) setMenuOpen(false);
        };
        document.addEventListener('pointerdown', closeOnOutsidePress);
        return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
    }, [menuOpen]);

    return <div className={`task-list-row ${isSelected ? 'is-selected' : ''} ${isCompleted ? 'is-completed' : ''} ${completing ? 'is-completing' : ''} ${dueState.isOverdue ? 'is-overdue' : ''}`}>
        <button type="button" className="task-check" onClick={() => isCompleted ? onRestore(task.id) : complete(task.id)} aria-label={isCompleted ? `Restore ${task.title}` : `Complete ${task.title}`} aria-pressed={checked}>
            <span>{checked && <Check size={13} strokeWidth={3.2} aria-hidden="true" />}</span>
        </button>
        <button type="button" className="task-row-content" onClick={() => !isCompleted && onSelect(task.id)}>
            <span className="task-row-title">{task.title || 'Untitled task'}</span>
            <span className="task-row-meta">
                {task.deadline && (
                    <span className={`task-row-due${dueState.isOverdue ? ' is-overdue' : ''}${dueState.isDueToday && !dueState.isOverdue ? ' is-today' : ''}`}>{dueLabel}</span>
                )}
                <span className="task-row-category"><i style={{ backgroundColor: color.color }} aria-hidden="true" />{category}</span>
                {estimate > 0 && <span>{formatEstimate(estimate)}</span>}
            </span>
        </button>
        <div className="task-overflow" ref={menuRef}>
            <button type="button" className="task-overflow-trigger" onClick={() => setMenuOpen((open) => !open)} aria-label={`Actions for ${task.title}`} aria-haspopup="menu" aria-expanded={menuOpen}><MoreHorizontal size={19} aria-hidden="true" /></button>
            {menuOpen && <div className="ios-menu task-overflow-menu" role="menu" aria-label={`Actions for ${task.title}`}>
                {!isCompleted && <button type="button" role="menuitem" onClick={() => { onStartFocus(task); setMenuOpen(false); }}>Focus <Play size={17} aria-hidden="true" /></button>}
                {!isCompleted && <button type="button" role="menuitem" onClick={() => { onRequestAIHelp(task); setMenuOpen(false); }}>Ask Agent <MessageCircle size={17} aria-hidden="true" /></button>}
                <button type="button" role="menuitem" className="danger" onClick={() => { setMenuOpen(false); onDelete(task.id); }}>Delete <Trash2 size={17} aria-hidden="true" /></button>
            </div>}
        </div>
    </div>;
};

const TaskBoardCard = ({ task, isSelected = false, onComplete, onSelect }) => {
    const [completing, complete] = useCompletion(onComplete);
    const color = getColorForSubject(task.subject);
    const due = task.deadline ? new Date(task.deadline) : null;
    const dueState = getTaskDueState(task.deadline);
    const time = !due || Number.isNaN(due.getTime())
        ? null
        : due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    return <article className={`task-board-card ${isSelected ? 'is-selected' : ''} ${dueState.isOverdue ? 'is-overdue' : ''} ${completing ? 'is-completing' : ''}`}>
        <button type="button" className="task-check" onClick={() => complete(task.id)} aria-label={`Complete ${task.title}`} aria-pressed={completing}>
            <span>{completing && <Check size={12} strokeWidth={3.2} aria-hidden="true" />}</span>
        </button>
        <button type="button" className="task-board-card__content" onClick={() => onSelect(task.id)} aria-label={`Open ${task.title}`}>
            <span className="task-board-card__title">{task.title || 'Untitled task'}</span>
            <span className="task-board-card__meta">
                <i style={{ backgroundColor: color.color }} aria-hidden="true" />
                {[time, task.subject].filter(Boolean).join(' · ') || 'No category'}
            </span>
        </button>
    </article>;
};

export { ChunkReorderItem, TaskBoardCard, TaskListRow };
