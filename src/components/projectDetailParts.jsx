import React from 'react';
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    Check,
    Circle,
    Edit3,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import { isTaskDone } from './projectDetailUtils';

const SegmentButton = ({ active, onClick, children }) => (
    <button
        onClick={onClick}
        className={`ios-codex-segment ${active ? 'is-active' : ''}`}
    >
        {children}
    </button>
);

const NameDialog = ({ dialog, onChange, onClose, onSubmit }) => {
    if (!dialog) return null;

    const entityLabel = dialog.type === 'stage' ? 'stage' : 'work tree';
    const actionLabel = dialog.mode === 'create' ? 'Add' : 'Rename';
    const title = `${actionLabel} ${entityLabel}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm">
            <form
                onSubmit={onSubmit}
                className="ios-codex-dialog w-full max-w-sm p-4"
            >
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-bold text-slate-950 dark:text-bone-100">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="ios-codex-mini-button rounded-md p-1.5"
                        title="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <label className="block text-sm text-slate-500 dark:text-bone-200/60" htmlFor="project-board-name-dialog">
                    Name
                </label>
                <input
                    id="project-board-name-dialog"
                    value={dialog.value}
                    onChange={(event) => onChange(event.target.value)}
                    className="ios-codex-input mt-2 w-full px-3 py-2 text-sm"
                    autoFocus
                />

                <div className="mt-5 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="ios-codex-button"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="ios-codex-button ios-codex-button-primary inline-flex items-center gap-2"
                    >
                        <Check className="h-4 w-4" />
                        Save
                    </button>
                </div>
            </form>
        </div>
    );
};

const WorkTree = ({
    column,
    columnIndex,
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
    <section className="ios-codex-worktree w-64 shrink-0">
        <div className="mb-4 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
                <div className="truncate text-xl font-bold text-slate-950 dark:text-bone-100">{column.title}</div>
                <div className="mt-1 truncate text-sm text-slate-500 dark:text-bone-200/60">Work tree {columnIndex + 1} / {tasks.length} tasks</div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <button
                    onClick={() => onOpenWorkTreeDialog(column)}
                    className="ios-codex-mini-button rounded-md p-1.5"
                    title="Edit work tree name"
                >
                    <Edit3 className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onDeleteWorkTree(column)}
                    disabled={!canDeleteWorkTree}
                    className="ios-codex-mini-button ios-codex-danger rounded-md p-1.5 disabled:cursor-not-allowed disabled:opacity-35"
                    title={canDeleteWorkTree ? 'Delete work tree' : 'Keep at least one work tree'}
                >
                    <Trash2 className="h-4 w-4" />
                </button>
                <button
                    onClick={() => onAddTask(column.id)}
                    className="ios-codex-icon-button rounded-lg p-2"
                    title={`Add task to ${column.title}`}
                >
                    <Plus className="h-4 w-4" />
                </button>
            </div>
        </div>

        <div className="space-y-4">
            {tasks.map((task, taskIndex) => (
                <React.Fragment key={task.id}>
                    <WorkTreeTask
                        task={task}
                        project={project}
                        columns={columns}
                        currentColumnId={column.id}
                        onEditTask={onEditTask}
                        onDeleteTask={onDeleteTask}
                        onToggleDone={onToggleDone}
                        onMoveTask={onMoveTask}
                    />
                    {taskIndex < tasks.length - 1 && (
                        <div className="flex justify-center text-slate-500 dark:text-bone-200/50">
                            <ArrowDown className="h-6 w-6" />
                        </div>
                    )}
                </React.Fragment>
            ))}

            {tasks.length === 0 && (
                <button
                    onClick={() => onAddTask(column.id)}
                    className="ios-codex-empty-card flex h-28 w-full items-center justify-center text-sm font-semibold"
                >
                    Add work item
                </button>
            )}
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
        <article className={`ios-codex-task-card group px-3 py-3 ${done ? 'is-done' : ''}`}>
            <div className="flex items-start gap-3">
                <button
                    onClick={() => onToggleDone(task)}
                    className={`ios-codex-checkbox mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center ${done ? 'is-done' : ''}`}
                    title={done ? 'Mark open' : 'Mark done'}
                >
                    {done ? <Check className="h-5 w-5" /> : <Circle className="h-4 w-4" />}
                </button>

                <button
                    onClick={() => onEditTask(task)}
                    className="min-w-0 flex-1 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
                >
                    <div className={`truncate text-lg font-bold ${done ? 'line-through opacity-70' : ''}`}>{task.title}</div>
                    {task.description && (
                        <p className="mt-1 line-clamp-2 text-sm opacity-70">{task.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                        <span className="rounded-md bg-white/70 px-2 py-1 text-slate-600 dark:bg-white/10 dark:text-bone-200">{task.priority || 'Medium'}</span>
                        <span className="rounded-md bg-white/70 px-2 py-1 text-slate-600 dark:bg-white/10 dark:text-bone-200">{task.difficulty || 'Medium'}</span>
                    </div>
                </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-black/10 pt-2 opacity-100 dark:border-white/10 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                <div className="flex items-center gap-1">
                    {previousColumn && (
                        <button
                            onClick={() => onMoveTask(task, previousColumn.id)}
                            className="ios-codex-mini-button rounded-md p-1.5"
                            title={`Move to ${previousColumn.title}`}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>
                    )}
                    {nextColumn && (
                        <button
                            onClick={() => onMoveTask(task, nextColumn.id)}
                            className="ios-codex-mini-button rounded-md p-1.5"
                            title={`Move to ${nextColumn.title}`}
                        >
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => onEditTask(task)}
                        className="ios-codex-mini-button rounded-md p-1.5"
                        title="Edit task"
                    >
                        <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => onDeleteTask(task.id)}
                        className="ios-codex-mini-button ios-codex-danger rounded-md p-1.5"
                        title="Delete task"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </article>
    );
};


export { NameDialog, SegmentButton, WorkTree };

