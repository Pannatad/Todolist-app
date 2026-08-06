import React, { useMemo, useState } from 'react';
import {
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Check,
    ChevronDown,
    ChevronRight,
    Circle,
    Edit3,
    PanelLeftClose,
    PanelLeftOpen,
    Plus,
    Trash2,
} from 'lucide-react';
import TaskModal from './TaskModal';
import { useProject } from '../context/ProjectContext';
import { confirmAction } from '../utils/confirm';
import { NameDialog, SegmentButton, WorkTree } from './projectDetailParts';
import {
    getDoneColumn,
    getPhaseColumns,
    getPhaseProgress,
    getPhaseTasks,
    getSortedPhases,
    isTaskDone,
    priorityOrder,
} from './projectDetailUtils';

const ProjectDetailView = ({ project, onBack, selectedPhaseId }) => {
    const { moveTask, addTask, updateTask, deleteTask, addPhase, updatePhase, deletePhase, addColumn, updateColumn, deleteColumn } = useProject();
    const sortedPhases = useMemo(() => getSortedPhases(project), [project]);
    const initialPhaseId = selectedPhaseId || sortedPhases[0]?.id || 'phase-1';
    const initialColumns = getPhaseColumns(project, initialPhaseId);

    const [activePhaseId, setActivePhaseId] = useState(initialPhaseId);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [taskTargetColumnId, setTaskTargetColumnId] = useState(initialColumns[0]?.id || 'c-1');
    const [sortBy, setSortBy] = useState('manual');
    const [sortDirection, setSortDirection] = useState('desc');
    const [namingDialog, setNamingDialog] = useState(null);

    const activePhase = sortedPhases.find((phase) => phase.id === activePhaseId) || sortedPhases[0];
    const safeActivePhaseId = activePhase?.id || activePhaseId;
    const activeColumns = getPhaseColumns(project, safeActivePhaseId);
    const phaseTasks = getPhaseTasks(project, safeActivePhaseId);

    const getSortedTasks = (tasks) => {
        if (sortBy === 'manual') return tasks;

        return [...tasks].sort((a, b) => {
            let result = 0;
            if (sortBy === 'priority') {
                result = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
            }

            return sortDirection === 'asc' ? -result : result;
        });
    };

    const handleAddTask = (columnId = activeColumns[0]?.id || 'c-1') => {
        setEditingTask(null);
        setTaskTargetColumnId(columnId);
        setIsTaskModalOpen(true);
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setTaskTargetColumnId(task.columnId || activeColumns[0]?.id || 'c-1');
        setIsTaskModalOpen(true);
    };

    const handleSaveTask = (taskData) => {
        if (editingTask) {
            updateTask(project.id, editingTask.id, taskData);
        } else {
            addTask(project.id, {
                ...taskData,
                columnId: taskTargetColumnId,
                phaseId: safeActivePhaseId
            });
        }

        setIsTaskModalOpen(false);
        setEditingTask(null);
    };

    const handleDeleteTask = (taskId) => {
        if (confirmAction('Delete this task?')) {
            deleteTask(project.id, taskId);
        }
    };

    const openStageDialog = (phase = null) => {
        setNamingDialog({
            type: 'stage',
            mode: phase ? 'edit' : 'create',
            id: phase?.id || null,
            value: phase?.name || `Stage ${sortedPhases.length + 1}`
        });
    };

    const openWorkTreeDialog = (column = null) => {
        setNamingDialog({
            type: 'worktree',
            mode: column ? 'edit' : 'create',
            id: column?.id || null,
            value: column?.title || `Work tree ${activeColumns.length + 1}`
        });
    };

    const closeNamingDialog = () => {
        setNamingDialog(null);
    };

    const handleCreateStage = async (stageName) => {
        const name = stageName.trim() || `Stage ${sortedPhases.length + 1}`;
        const newPhase = await addPhase(project.id, name);
        if (newPhase?.id) {
            setActivePhaseId(newPhase.id);
        }
    };

    const handleSaveStageName = async (phaseId, stageName) => {
        const name = stageName.trim();
        if (!phaseId || !name) return;
        await updatePhase(project.id, phaseId, { name });
    };

    const handleDeleteStage = async (phase) => {
        if (sortedPhases.length <= 1) return;
        if (!confirmAction(`Delete "${phase.name}"? Tasks in this stage will move to the first remaining stage.`)) return;

        const remainingPhases = sortedPhases.filter((item) => item.id !== phase.id);
        await deletePhase(project.id, phase.id);
        if (phase.id === safeActivePhaseId) {
            setActivePhaseId(remainingPhases[0]?.id || 'phase-1');
        }
    };

    const handleCreateWorkTree = async (workTreeName) => {
        const title = workTreeName.trim() || `Work tree ${activeColumns.length + 1}`;
        const newColumn = await addColumn(project.id, title, safeActivePhaseId);
        if (newColumn?.id) {
            setTaskTargetColumnId(newColumn.id);
        }
    };

    const handleSaveWorkTreeName = async (columnId, workTreeName) => {
        const title = workTreeName.trim();
        if (!columnId || !title) return;
        await updateColumn(project.id, columnId, { title }, safeActivePhaseId);
    };

    const handleDeleteWorkTree = async (column) => {
        if (activeColumns.length <= 1) return;
        if (!confirmAction(`Delete "${column.title}"? Tasks in this work tree will move to the first remaining work tree.`)) return;

        await deleteColumn(project.id, column.id, safeActivePhaseId);
        if (taskTargetColumnId === column.id) {
            const fallbackColumn = activeColumns.find((item) => item.id !== column.id);
            setTaskTargetColumnId(fallbackColumn?.id || 'c-1');
        }
    };

    const handleSubmitNamingDialog = async (event) => {
        event.preventDefault();
        if (!namingDialog) return;

        if (namingDialog.type === 'stage' && namingDialog.mode === 'create') {
            await handleCreateStage(namingDialog.value);
        } else if (namingDialog.type === 'stage') {
            await handleSaveStageName(namingDialog.id, namingDialog.value);
        } else if (namingDialog.type === 'worktree' && namingDialog.mode === 'create') {
            await handleCreateWorkTree(namingDialog.value);
        } else {
            await handleSaveWorkTreeName(namingDialog.id, namingDialog.value);
        }

        closeNamingDialog();
    };

    const handleToggleDone = (task) => {
        const doneColumn = getDoneColumn(project, safeActivePhaseId);
        const firstOpenColumn = activeColumns.find((column) => column.id !== doneColumn?.id) || activeColumns[0];
        const done = isTaskDone(task, project);

        if (!doneColumn || !firstOpenColumn) {
            updateTask(project.id, task.id, { completed: !done });
            return;
        }

        const nextColumnId = done ? firstOpenColumn.id : doneColumn.id;
        moveTask(project.id, task.id, nextColumnId, safeActivePhaseId);
        updateTask(project.id, task.id, { completed: !done, columnId: nextColumnId });
    };

    const handleMoveTask = (task, columnId) => {
        if (task.columnId === columnId) return;
        moveTask(project.id, task.id, columnId, safeActivePhaseId);
        updateTask(project.id, task.id, {
            columnId,
            completed: columnId === getDoneColumn(project, safeActivePhaseId)?.id
        });
    };

    return (
        <div className="ios-codex-board grid h-[calc(100vh-132px)] min-h-[760px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden rounded-lg border border-slate-200 text-slate-900 shadow-sm dark:border-white/10 dark:text-bone-100">
            <header className="ios-codex-board-header flex flex-col gap-3 px-4 py-3 md:px-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                        <button
                            onClick={onBack}
                            className="ios-codex-icon-button rounded-lg p-2"
                            title="Back to projects"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => setIsSidebarOpen((current) => !current)}
                            className="ios-codex-icon-button rounded-lg p-2"
                            title={isSidebarOpen ? 'Hide stages sidebar' : 'Show stages sidebar'}
                        >
                            {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
                        </button>
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-500 dark:text-bone-200/60">{project.title}</div>
                            <h2 className="mt-1 truncate text-2xl font-bold text-slate-950 dark:text-bone-100">Context</h2>
                        </div>
                    </div>

                    <button
                        onClick={() => handleAddTask()}
                        className="ios-codex-button ios-codex-button-primary inline-flex shrink-0 items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Task
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="ios-codex-inline-status">
                        <span>Stage: {activePhase?.name || 'No stage'}</span>
                        <span>{phaseTasks.length} tasks</span>
                        <span>{getPhaseProgress(project, safeActivePhaseId)}% done</span>
                    </div>

                    <div className="ml-auto flex items-center gap-2 overflow-x-auto">
                        <SegmentButton active={sortBy === 'manual'} onClick={() => setSortBy('manual')}>Manual</SegmentButton>
                        <SegmentButton active={sortBy === 'priority'} onClick={() => setSortBy('priority')}>Priority</SegmentButton>
                        {sortBy !== 'manual' && (
                            <button
                                onClick={() => setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                                className="ios-codex-button inline-flex items-center p-2"
                                title={sortDirection === 'desc' ? 'Descending' : 'Ascending'}
                            >
                                {sortDirection === 'desc' ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <div className={`grid min-h-0 ${isSidebarOpen ? 'md:grid-cols-[216px_minmax(0,1fr)]' : 'md:grid-cols-[minmax(0,1fr)]'}`}>
                {isSidebarOpen && (
                <aside className="ios-codex-sidebar min-h-0 overflow-y-auto border-b border-slate-200 md:border-b-0 md:border-r dark:border-white/10">
                    <div className="px-4 pb-3 pt-4">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                                <div className="truncate text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-bone-200/40">Stages</div>
                                <div className="mt-0.5 truncate text-sm font-bold text-slate-900 dark:text-bone-100">{project.title}</div>
                            </div>
                            <button
                                onClick={() => openStageDialog()}
                                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-transform hover:scale-105 active:scale-95 dark:bg-sage-500 dark:text-void-950"
                                title="Add stage"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="space-y-1 px-2.5 pb-4">
                        {sortedPhases.map((phase, phaseIndex) => {
                            const isActive = phase.id === safeActivePhaseId;
                            const progress = getPhaseProgress(project, phase.id);
                            const phaseTaskCount = getPhaseTasks(project, phase.id).length;

                            return (
                                <div key={phase.id} className="group relative">
                                    <button
                                        onClick={() => setActivePhaseId(phase.id)}
                                        className={`relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all duration-200 ${
                                            isActive
                                                ? 'bg-white/90 shadow-sm ring-1 ring-slate-900/[0.06] dark:bg-white/[0.08] dark:ring-white/[0.08]'
                                                : 'hover:bg-white/60 dark:hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        {isActive && (
                                            <span className="absolute -left-0.5 top-2 bottom-2 w-[3px] rounded-full bg-slate-900 dark:bg-sage-400" />
                                        )}

                                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                                            isActive
                                                ? 'bg-slate-900 text-white dark:bg-sage-500 dark:text-void-950'
                                                : 'bg-slate-200/70 text-slate-500 group-hover:bg-slate-200 dark:bg-white/10 dark:text-bone-200/60'
                                        }`}>
                                            {phaseIndex + 1}
                                        </span>

                                        <span className="min-w-0 flex-1">
                                            <span className="flex items-center gap-1.5">
                                                <span className={`block truncate text-[13px] font-semibold ${
                                                    isActive ? 'text-slate-900 dark:text-bone-100' : 'text-slate-600 dark:text-bone-200/70'
                                                }`}>{phase.name}</span>
                                                <span className={`shrink-0 text-[11px] tabular-nums ${
                                                    isActive ? 'text-slate-500 dark:text-bone-200/50' : 'text-slate-400 dark:text-bone-200/30'
                                                }`}>{phaseTaskCount}</span>
                                            </span>
                                            <span className="mt-1.5 flex items-center gap-2">
                                                <span className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-slate-200/80 dark:bg-white/10">
                                                    <span
                                                        className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out ${
                                                            progress === 100
                                                                ? 'bg-emerald-500'
                                                                : isActive
                                                                    ? 'bg-slate-900 dark:bg-sage-400'
                                                                    : 'bg-slate-400 dark:bg-bone-200/30'
                                                        }`}
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </span>
                                                <span className={`shrink-0 text-[10px] font-semibold tabular-nums ${
                                                    progress === 100
                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                        : isActive
                                                            ? 'text-slate-500 dark:text-bone-200/50'
                                                            : 'text-slate-400 dark:text-bone-200/30'
                                                }`}>{progress}%</span>
                                            </span>
                                        </span>

                                        <span className="flex shrink-0 items-center gap-0.5">
                                            {isActive
                                                ? <ChevronDown className="h-3.5 w-3.5 text-slate-400 dark:text-bone-200/40" />
                                                : <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-bone-200/20" />
                                            }
                                        </span>
                                    </button>

                                    <span className="ml-3 flex items-center gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100" style={{ position: 'absolute', right: 8, top: 8 }}>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openStageDialog(phase); }}
                                            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:text-bone-200/40 dark:hover:text-bone-200/70 transition-colors"
                                            title="Edit stage name"
                                        >
                                            <Edit3 className="h-3 w-3" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDeleteStage(phase); }}
                                            disabled={sortedPhases.length <= 1}
                                            className="flex h-6 w-6 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:text-bone-200/40 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
                                            title={sortedPhases.length <= 1 ? 'Keep at least one stage' : 'Delete stage'}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    </span>

                                    {isActive && (
                                        <div className="ml-[1.15rem] mt-1 space-y-0.5 pb-1">
                                            {activeColumns.map((column) => {
                                                const count = phaseTasks.filter((task) => task.columnId === column.id).length;

                                                return (
                                                    <button
                                                        key={column.id}
                                                        onClick={() => handleAddTask(column.id)}
                                                        className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/70 dark:hover:bg-white/[0.04]"
                                                        title={`Add task to ${column.title}`}
                                                    >
                                                        <Circle className="h-[5px] w-[5px] shrink-0 fill-slate-300 text-slate-300 dark:fill-bone-200/30 dark:text-bone-200/30" />
                                                        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-slate-500 dark:text-bone-200/50">{column.title}</span>
                                                        <span className="shrink-0 min-w-[18px] text-center text-[11px] font-semibold tabular-nums text-slate-400 dark:text-bone-200/30">{count}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </aside>
                )}

                <main className="ios-codex-canvas min-h-0 overflow-auto p-3 md:p-5">
                    <div className="mb-4 max-w-none text-left">
                        <h3 className="text-2xl font-bold text-slate-950 dark:text-bone-100">Context</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-bone-200/60">
                            {activePhase?.name || 'Selected stage'} work trees
                        </p>
                    </div>

                    <div className="mb-5 flex items-center justify-start">
                        <button
                            onClick={() => openWorkTreeDialog()}
                            className="ios-codex-button inline-flex items-center gap-2"
                            title="Add work tree"
                        >
                            <Plus className="h-4 w-4" />
                            Work tree
                        </button>
                    </div>

                    <div className="flex min-w-max gap-5 pb-6">
                        {activeColumns.map((column, columnIndex) => {
                            const columnTasks = getSortedTasks(phaseTasks.filter((task) => task.columnId === column.id));

                            return (
                                <WorkTree
                                    key={column.id}
                                    column={column}
                                    columnIndex={columnIndex}
                                    tasks={columnTasks}
                                    project={project}
                                    columns={activeColumns}
                                    onAddTask={handleAddTask}
                                    onEditTask={handleEditTask}
                                    onDeleteTask={handleDeleteTask}
                                    onToggleDone={handleToggleDone}
                                    onMoveTask={handleMoveTask}
                                    onOpenWorkTreeDialog={openWorkTreeDialog}
                                    onDeleteWorkTree={handleDeleteWorkTree}
                                    canDeleteWorkTree={activeColumns.length > 1}
                                />
                            );
                        })}
                    </div>
                </main>
            </div>

            <TaskModal
                key={editingTask?.id || `new-${taskTargetColumnId}-${safeActivePhaseId}`}
                isOpen={isTaskModalOpen}
                onClose={() => {
                    setIsTaskModalOpen(false);
                    setEditingTask(null);
                }}
                onSave={handleSaveTask}
                initialData={editingTask}
                mode={editingTask ? 'edit' : 'create'}
            />

            <NameDialog
                dialog={namingDialog}
                onChange={(value) => setNamingDialog((current) => current ? { ...current, value } : current)}
                onClose={closeNamingDialog}
                onSubmit={handleSubmitNamingDialog}
            />
        </div>
    );
};


export default ProjectDetailView;
