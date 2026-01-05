import React, { useState } from 'react';
import { DndContext, closestCorners, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';
import { KanbanColumn } from './KanbanColumn';
import { KanbanTask } from './KanbanTask';
import TaskModal from './TaskModal';
import { useProject } from '../context/ProjectContext';

const dropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
        styles: {
            active: {
                opacity: '0.5',
            },
        },
    }),
};

const ProjectDetailView = ({ project, onBack, selectedPhaseId }) => {
    const { moveTask, updateProject, addTask, updateTask, deleteTask, addPhase, updatePhase, deletePhase, reorderPhases } = useProject();
    const [activeId, setActiveId] = useState(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [sortBy, setSortBy] = useState('manual');
    const [sortDirection, setSortDirection] = useState('desc');

    // Use the passed phase ID or default to first phase
    const sortedPhases = [...(project.phases || [])].sort((a, b) => a.order - b.order);
    const activePhaseId = selectedPhaseId || sortedPhases[0]?.id || 'phase-1';
    const activePhase = sortedPhases.find(p => p.id === activePhaseId);

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeTaskId = active.id;
        const overId = over.id;

        const activeTask = project.tasks.find(t => t.id === activeTaskId);
        if (!activeTask) return;

        const isOverColumn = project.columns.find(c => c.id === overId);
        const overTask = project.tasks.find(t => t.id === overId);

        let newColumnId = activeTask.columnId;

        if (isOverColumn) {
            newColumnId = isOverColumn.id;
        } else if (overTask) {
            newColumnId = overTask.columnId;
        }

        if (activeTask.columnId !== newColumnId) {
            moveTask(project.id, activeTaskId, newColumnId);
        }
    };

    const activeTask = activeId ? project.tasks.find(t => t.id === activeId) : null;

    const handleAddTask = () => {
        setEditingTask(null);
        setIsTaskModalOpen(true);
    };

    const handleEditTask = (task) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const handleSaveTask = (taskData) => {
        if (editingTask) {
            updateTask(project.id, editingTask.id, taskData);
        } else {
            // Add task to current phase
            addTask(project.id, {
                ...taskData,
                columnId: project.columns[0].id,
                phaseId: activePhaseId
            });
        }
        setIsTaskModalOpen(false);
    };

    const handleDeleteTask = (taskId) => {
        deleteTask(project.id, taskId);
    };

    // Filter tasks by current phase
    const phaseTasks = project.tasks.filter(t => t.phaseId === activePhaseId);

    // Sorting Logic
    const getSortedTasks = (tasks) => {
        if (sortBy === 'manual') return tasks;

        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        const difficultyOrder = { 'Hard': 3, 'Medium': 2, 'Easy': 1 };

        return [...tasks].sort((a, b) => {
            let result = 0;
            if (sortBy === 'priority') {
                const pA = priorityOrder[a.priority] || 0;
                const pB = priorityOrder[b.priority] || 0;
                result = pB - pA;
            } else if (sortBy === 'difficulty') {
                const dA = difficultyOrder[a.difficulty] || 0;
                const dB = difficultyOrder[b.difficulty] || 0;
                result = dB - dA;
            }
            return sortDirection === 'asc' ? -result : result;
        });
    };

    // Phase handlers
    const handleAddPhase = (name) => {
        addPhase(project.id, name);
    };

    const handleUpdatePhase = (phaseId, updates) => {
        updatePhase(project.id, phaseId, updates);
    };

    const handleDeletePhase = (phaseId) => {
        if (confirm('Delete this phase? Tasks will be moved to the first remaining phase.')) {
            deletePhase(project.id, phaseId);
            // Switch to first phase if deleting active phase
            if (phaseId === activePhaseId) {
                const remaining = project.phases.filter(p => p.id !== phaseId);
                setActivePhaseId(remaining[0]?.id);
            }
        }
    };

    const getTasksCountForPhase = (phaseId) => {
        return project.tasks.filter(t => t.phaseId === phaseId).length;
    };

    // Calculate phase progress
    const getPhaseProgress = () => {
        const doneColumn = project.columns.find(c => c.title.toLowerCase() === 'done');
        if (!doneColumn || phaseTasks.length === 0) return 0;
        const doneTasks = phaseTasks.filter(t => t.columnId === doneColumn.id).length;
        return Math.round((doneTasks / phaseTasks.length) * 100);
    };

    return (
        <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 rounded-2xl">
            {/* Header - Responsive */}
            <div className="relative z-10 p-4 sm:p-6 border-b border-white/20 bg-white/10 backdrop-blur-xl">
                {/* Top row: Back button + Title + Add Task */}
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                            onClick={onBack}
                            className="flex-shrink-0 p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-white/80 mb-1 font-medium truncate">
                                <span className="truncate">{project.title}</span>
                                <span>•</span>
                                <span className="flex-shrink-0">Phase {(sortedPhases.findIndex(p => p.id === activePhaseId) + 1)}</span>
                            </div>
                            <h2 className="text-lg sm:text-2xl font-bold text-white truncate">{activePhase?.name || 'Phase'}</h2>
                        </div>
                    </div>
                    <button
                        onClick={handleAddTask}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 sm:px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-indigo-500/30 transition-all font-semibold text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Task</span>
                    </button>
                </div>

                {/* Second row: Stats + Sorting */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    {/* Phase stats */}
                    <div className="flex items-center gap-3 text-xs sm:text-sm text-white/80 font-medium">
                        <span>{phaseTasks.length} Tasks</span>
                        <div className="flex items-center gap-2">
                            <div className="w-16 sm:w-24 h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                                <div
                                    className="h-full bg-white transition-all duration-500"
                                    style={{ width: `${getPhaseProgress()}%` }}
                                />
                            </div>
                            <span>{getPhaseProgress()}%</span>
                        </div>
                    </div>

                    {/* Sorting controls - horizontal scroll on mobile */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                        <div className="flex bg-white/20 backdrop-blur-xl rounded-lg border border-white/30 p-1 flex-shrink-0">
                            <button
                                onClick={() => setSortBy('manual')}
                                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${sortBy === 'manual'
                                    ? 'bg-white/30 backdrop-blur-md text-white shadow-sm'
                                    : 'text-white/70 hover:text-white'
                                    }`}
                            >
                                Manual
                            </button>
                            <button
                                onClick={() => setSortBy('priority')}
                                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${sortBy === 'priority'
                                    ? 'bg-white/30 backdrop-blur-md text-white shadow-sm'
                                    : 'text-white/70 hover:text-white'
                                    }`}
                            >
                                Priority
                            </button>
                            <button
                                onClick={() => setSortBy('difficulty')}
                                className={`px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition-colors whitespace-nowrap ${sortBy === 'difficulty'
                                    ? 'bg-white/30 backdrop-blur-md text-white shadow-sm'
                                    : 'text-white/70 hover:text-white'
                                    }`}
                            >
                                Difficulty
                            </button>
                        </div>

                        {sortBy !== 'manual' && (
                            <button
                                onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                                className="flex-shrink-0 flex items-center gap-1 px-2 py-1.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white hover:bg-white/30 transition-colors"
                                title={sortDirection === 'desc' ? 'Descending' : 'Ascending'}
                            >
                                {sortDirection === 'desc' ? (
                                    <ArrowDown className="w-4 h-4" />
                                ) : (
                                    <ArrowUp className="w-4 h-4" />
                                )}
                            </button>
                        )}

                        <button className="flex-shrink-0 hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-lg text-white hover:bg-white/30 transition-colors font-medium text-sm">
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                            AI
                        </button>
                    </div>
                </div>
            </div>

            {/* Phase name badge removed - navigation via PhaseSelectionView */}

            {/* Board - Mobile optimized: horizontal scroll with snap */}
            <DndContext
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="relative z-10 flex-1 overflow-x-auto pb-4 p-3 sm:p-6 snap-x snap-mandatory sm:snap-none">
                    <div className="flex gap-3 sm:gap-6 h-full min-w-max">
                        {project.columns.map(column => (
                            <div key={column.id} className="snap-center">
                                <KanbanColumn
                                    column={column}
                                    tasks={getSortedTasks(phaseTasks.filter(t => t.columnId === column.id))}
                                    onEditTask={handleEditTask}
                                    onDeleteTask={handleDeleteTask}
                                    isSorted={sortBy !== 'manual'}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                <DragOverlay dropAnimation={dropAnimation}>
                    {activeTask ? <KanbanTask task={activeTask} /> : null}
                </DragOverlay>
            </DndContext>

            <TaskModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleSaveTask}
                initialData={editingTask}
                mode={editingTask ? 'edit' : 'create'}
            />
        </div>
    );
};

export default ProjectDetailView;
