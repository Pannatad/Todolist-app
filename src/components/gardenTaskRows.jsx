import React, { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { AlertCircle, Check, ChevronDown, Circle, GripVertical, MoreHorizontal, Play, Sparkles, Trash2 } from 'lucide-react';
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
    return (
        <Reorder.Item value={chunk} dragListener={false} dragControls={dragControls} onDragEnd={onDragEnd} className="subtask-row">
            <div className="subtask-main">
                <button type="button" className="subtask-icon" onPointerDown={(event) => dragControls.start(event)} aria-label="Reorder subtask"><GripVertical size={16} /></button>
                <label className="task-checkbox-target"><input type="checkbox" checked={chunk.completed} onChange={(event) => onUpdate(chunk.id, { completed: event.target.checked })} aria-label={`Complete ${chunk.title}`} /></label>
                <input className={chunk.completed ? 'line-through opacity-60' : ''} value={chunk.title} onChange={(event) => onUpdate(chunk.id, { title: event.target.value })} aria-label="Subtask title" />
                <input className="subtask-estimate" type="number" min="0" readOnly={nested.length > 0} value={nested.length ? nested.reduce((sum, item) => sum + item.estimatedTime, 0) || '' : chunk.estimatedTime || ''} onChange={(event) => onUpdate(chunk.id, { estimatedTime: Number(event.target.value) || 0 })} aria-label="Subtask estimate in minutes" placeholder="min" />
                <button type="button" className="subtask-icon" onClick={() => onDelete(chunk.id)} aria-label="Delete subtask"><Trash2 size={15} /></button>
            </div>
            <button type="button" className="nested-toggle" onClick={() => onToggleExpanded(chunk.id)}><ChevronDown size={14} className={expanded ? 'rotate-180' : ''} /> {nested.length ? `${nested.length} nested` : 'Add nested'}</button>
            {expanded && <div className="nested-list">
                {nested.map((item) => <div key={item.id} className="nested-row">
                    <label className="task-checkbox-target"><input type="checkbox" checked={item.completed} onChange={(event) => onUpdateNested(chunk.id, item.id, { completed: event.target.checked })} aria-label={`Complete ${item.title}`} /></label>
                    <input value={item.title} onChange={(event) => onUpdateNested(chunk.id, item.id, { title: event.target.value })} aria-label="Nested subtask title" />
                    <input type="number" min="0" value={item.estimatedTime || ''} onChange={(event) => onUpdateNested(chunk.id, item.id, { estimatedTime: Number(event.target.value) || 0 })} aria-label="Nested estimate in minutes" placeholder="min" />
                    <button type="button" className="subtask-icon" onClick={() => onDeleteNested(chunk.id, item.id)} aria-label="Delete nested subtask"><Trash2 size={14} /></button>
                </div>)}
                <div className="nested-row nested-new">
                    <input value={draft.title} onChange={(event) => onUpdateNestedDraft(chunk.id, { title: event.target.value })} placeholder="Nested task" aria-label="New nested task" />
                    <input type="number" min="1" value={draft.estimatedTime} onChange={(event) => onUpdateNestedDraft(chunk.id, { estimatedTime: event.target.value })} placeholder="min" aria-label="New nested estimate" />
                    <button type="button" onClick={() => onAddNested(chunk.id)} disabled={!draft.title.trim()}>Add</button>
                </div>
            </div>}
        </Reorder.Item>
    );
};

const TaskListRow = ({ task, isCompleted = false, isSelected = false, onComplete, onDelete, onRequestAIHelp, onRestore, onSelect, onStartFocus, onToggleDueMode, showRelativeDue }) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const color = getColorForSubject(task.subject);
    const category = task.subject || 'Uncategorized';
    const dueState = getTaskDueState(task.deadline, isCompleted);
    const absoluteDue = formatTaskDueAbsolute(task.deadline, isCompleted);
    const dueLabel = showRelativeDue ? formatTaskDueRelative(task.deadline) : absoluteDue;
    return <div className={`task-list-row ${isSelected ? 'is-selected' : ''} ${isCompleted ? 'is-completed' : ''} ${dueState.isDueToday ? 'is-due-today' : ''} ${dueState.isOverdue ? 'is-overdue' : ''}`}>
        <button type="button" className="task-complete-button" onClick={() => isCompleted ? onRestore(task.id) : onComplete(task.id)} aria-label={isCompleted ? `Restore ${task.title}` : `Complete ${task.title}`}>{isCompleted ? <Check size={18} /> : <Circle size={18} />}</button>
        <button type="button" className="task-row-content" onClick={() => !isCompleted && onSelect(task.id)}>
            <span className="task-row-primary">
                <span className="task-row-title"><span className="task-row-title-text">{task.title || 'Untitled task'}</span>{dueState.isOverdue && <span className="task-row-warning" role="img" aria-label="Overdue" title="Overdue"><AlertCircle size={14} aria-hidden="true" /></span>}</span>
                <span className="task-row-meta"><span className="task-row-category" title={category}><i style={{ backgroundColor: color.color }} />{category}</span><span>{formatEstimate(getTaskChunkEstimate(task))}</span></span>
            </span>
        </button>
        <button type="button" className="task-row-due" onClick={(event) => { event.stopPropagation(); onToggleDueMode(); }} disabled={!task.deadline} aria-label={task.deadline ? `${dueState.isOverdue ? 'Overdue. ' : ''}${dueLabel}. Show ${showRelativeDue ? 'absolute due date' : 'time remaining'}` : 'No due date'} title={task.deadline ? `Show ${showRelativeDue ? 'absolute due date' : 'time remaining'}` : 'No due date'}>{dueLabel}</button>
        <div className="task-overflow">
            <button type="button" className="task-overflow-trigger" onClick={() => setMenuOpen((open) => !open)} aria-label={`Actions for ${task.title}`} aria-expanded={menuOpen}><MoreHorizontal size={19} /></button>
            {menuOpen && <div className="task-overflow-menu" aria-label={`Actions for ${task.title}`}>
                {!isCompleted && <button type="button" onClick={() => { onStartFocus(task); setMenuOpen(false); }}><Play size={15} />Focus</button>}
                {!isCompleted && <button type="button" onClick={() => { onRequestAIHelp(task); setMenuOpen(false); }}><Sparkles size={15} />AI help</button>}
                <button type="button" className="danger" onClick={() => onDelete(task.id)}><Trash2 size={15} />Delete</button>
            </div>}
        </div>
    </div>;
};

export { ChunkReorderItem, TaskListRow };
