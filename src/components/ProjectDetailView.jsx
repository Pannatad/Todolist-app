import React, { useMemo, useState } from 'react';
import { ArrowUpDown, Edit3, Plus, Trash2 } from 'lucide-react';
import { BarButton, MenuButton, PageHeader, RowMenu } from '../ui';
import TaskModal from './TaskModal';
import { useProject } from '../context/ProjectContext';
import { confirmAction } from '../utils/confirm';
import { NameDialog, WorkTree } from './projectDetailParts';
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

    const doneCount = phaseTasks.filter((task) => isTaskDone(task, project)).length;

    return (
        <div className="project-board push-enter">
            <PageHeader
                title={project.title}
                subtitle={`${doneCount} of ${phaseTasks.length} done in ${activePhase?.name || 'this stage'}`}
                onBack={onBack}
                backLabel="Projects"
                showAccount={false}
                actions={(
                    <>
                        <MenuButton
                            icon={ArrowUpDown}
                            label="Sort tasks"
                            sections={[{
                                title: 'Sort By',
                                items: [
                                    { id: 'manual', label: 'Manual', checked: sortBy === 'manual', onSelect: () => setSortBy('manual') },
                                    { id: 'priority-desc', label: 'Priority, High First', checked: sortBy === 'priority' && sortDirection === 'desc', onSelect: () => { setSortBy('priority'); setSortDirection('desc'); } },
                                    { id: 'priority-asc', label: 'Priority, Low First', checked: sortBy === 'priority' && sortDirection === 'asc', onSelect: () => { setSortBy('priority'); setSortDirection('asc'); } },
                                ],
                            }]}
                        />
                        <BarButton icon={Plus} tone="primary" label="New task" onClick={() => handleAddTask()} />
                    </>
                )}
            />

            <div className="ui-section-title project-board__stages-title">
                <h2>Stages</h2>
                <RowMenu
                    label="Stage actions"
                    items={[
                        { label: 'New Stage', icon: Plus, onSelect: () => openStageDialog() },
                        ...(activePhase ? [{ label: 'Rename Stage', icon: Edit3, onSelect: () => openStageDialog(activePhase) }] : []),
                        ...(activePhase && sortedPhases.length > 1 ? [{ label: 'Delete Stage', icon: Trash2, destructive: true, onSelect: () => handleDeleteStage(activePhase) }] : []),
                    ]}
                />
            </div>
            <div className="project-stages" role="tablist" aria-label="Stages">
                {sortedPhases.map((phase, phaseIndex) => {
                    const isActive = phase.id === safeActivePhaseId;
                    return (
                        <button
                            key={phase.id}
                            type="button"
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActivePhaseId(phase.id)}
                            className={`project-stage${isActive ? ' is-active' : ''}`}
                        >
                            <span className="project-stage__index">{phaseIndex + 1}</span>
                            <span className="project-stage__name">{phase.name}</span>
                            <span className="project-stage__progress">{getPhaseProgress(project, phase.id)}%</span>
                        </button>
                    );
                })}
            </div>

            <div className="project-worktrees">
                {activeColumns.map((column) => {
                    const columnTasks = getSortedTasks(phaseTasks.filter((task) => task.columnId === column.id));

                    return (
                        <WorkTree
                            key={column.id}
                            column={column}
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
                <button type="button" className="ui-text-button project-worktrees__add" onClick={() => openWorkTreeDialog()}>
                    New Work Tree
                </button>
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
                allowAddToToday
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
