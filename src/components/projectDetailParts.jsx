import React from 'react';
import { ArrowLeft, ArrowRight, Check, Edit3, Plus, Trash2 } from 'lucide-react';
import { RowMenu, Sheet } from '../ui';
import { isTaskDone } from './projectDetailUtils';

const SegmentButton = ({ active, onClick, children }) => (
    <button type="button" onClick={onClick} className={`ios-codex-segment ${active ? 'is-active' : ''}`}>
        {children}
    </button>
);

const NameDialog = ({ dialog, onChange, onClose, onSubmit }) => {
    const entityLabel = dialog?.type === 'stage' ? 'Stage' : 'Work Tree';
    const title = dialog ? `${dialog.mode === 'create' ? 'New' : 'Rename'} ${entityLabel}` : '';

    return (
        <Sheet open={Boolean(dialog)} onClose={onClose} title={title} className="form-sheet">
            <form onSubmit={onSubmit} className="form-stack">
                <div className="form-group">
                    <label className="form-field">
                        <span className="sr-only">Name</span>
                        <input
                            id="project-board-name-dialog"
                            value={dialog?.value || ''}
                            onChange={(event) => onChange(event.target.value)}
                            placeholder="Name"
                            autoFocus
                        />
                    </label>
                </div>
                <button type="submit" className="ui-button ui-button--accent form-submit">Save</button>
            </form>
        </Sheet>
    );
};

const WorkTree = ({
    column,
    tasks,
    project,
    columns,
    onAddTask,
    onEditTask,
    onDeleteTask,
    onToggleDone,
    onMoveTask,
    onOpenWorkTreeDialog,
    onDeleteWorkTree,
    canDeleteWorkTree
}) => (
    <section className="project-worktree" aria-label={column.title}>
        <div className="ui-section-title project-worktree__title">
            <h3>{column.title}</h3>
            <span>{tasks.length}</span>
            <RowMenu
                label={`Actions for ${column.title}`}
                items={[
                    { label: 'Add Task', icon: Plus, onSelect: () => onAddTask(column.id) },
                    { label: 'Rename', icon: Edit3, onSelect: () => onOpenWorkTreeDialog(column) },
                    ...(canDeleteWorkTree ? [{ label: 'Delete', icon: Trash2, destructive: true, onSelect: () => onDeleteWorkTree(column) }] : []),
                ]}
            />
        </div>

        <div className="ui-group project-worktree__list">
            {tasks.map((task) => (
                <WorkTreeTask
                    key={task.id}
                    task={task}
                    project={project}
                    columns={columns}
                    currentColumnId={column.id}
                    onEditTask={onEditTask}
                    onDeleteTask={onDeleteTask}
                    onToggleDone={onToggleDone}
                    onMoveTask={onMoveTask}
                />
            ))}
            <button type="button" className="project-worktree__add" onClick={() => onAddTask(column.id)}>
                <span aria-hidden="true"><Plus size={14} strokeWidth={2.8} /></span>
                Add Task
            </button>
        </div>
    </section>
);

const WorkTreeTask = ({
    task,
    project,
    columns,
    currentColumnId,
    onEditTask,
    onDeleteTask,
    onToggleDone,
    onMoveTask
}) => {
    const done = isTaskDone(task, project);
    const currentIndex = columns.findIndex((column) => column.id === currentColumnId);
    const previousColumn = columns[currentIndex - 1];
    const nextColumn = columns[currentIndex + 1];

    return (
        <article className={`project-task${done ? ' is-done' : ''}`}>
            <button
                type="button"
                onClick={() => onToggleDone(task)}
                className="task-check"
                aria-pressed={done}
                aria-label={done ? `Mark ${task.title} open` : `Mark ${task.title} done`}
            >
                <span>{done && <Check size={12} strokeWidth={3.2} />}</span>
            </button>
            <button type="button" onClick={() => onEditTask(task)} className="project-task__body">
                <span className="project-task__title">{task.title}</span>
                <span className="project-task__meta">
                    {[task.priority || 'Medium', task.description].filter(Boolean).join(' · ')}
                </span>
            </button>
            <RowMenu
                label={`Actions for ${task.title}`}
                items={[
                    ...(previousColumn ? [{ label: `Move to ${previousColumn.title}`, icon: ArrowLeft, onSelect: () => onMoveTask(task, previousColumn.id) }] : []),
                    ...(nextColumn ? [{ label: `Move to ${nextColumn.title}`, icon: ArrowRight, onSelect: () => onMoveTask(task, nextColumn.id) }] : []),
                    { label: 'Edit', icon: Edit3, onSelect: () => onEditTask(task) },
                    { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => onDeleteTask(task.id) },
                ]}
            />
        </article>
    );
};


export { NameDialog, SegmentButton, WorkTree };
