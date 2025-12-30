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
        <div className="h-full flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-indigo-950 rounded-2xl">
            {/* Aurora Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-teal-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute bottom-1/3 left-1/3 w-48 h-48 bg-pink-500/15 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '3s' }} />
            </div>

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 text-sm text-white/50 mb-1">
                            <span>{project.title}</span>
                            <span>•</span>
                            <span>Phase {(sortedPhases.findIndex(p => p.id === activePhaseId) + 1)}</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">{activePhase?.name || 'Phase'}</h2>
                        <div className="flex items-center gap-4 text-sm text-white/60 mt-1">
                            <span>{phaseTasks.length} Tasks in Phase</span>
                            <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                                        style={{ width: `${getPhaseProgress()}%` }}
                                    />
                                </div>
                                <span>{getPhaseProgress()}% Done</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <div className="flex bg-white/10 backdrop-blur-md rounded-lg border border-white/20 p-1">
                        <button
                            onClick={() => setSortBy('manual')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${sortBy === 'manual'
                                ? 'bg-white/20 text-white'
                                : 'text-white/60 hover:text-white'
                                }`}
                        >
                            Manual
                        </button>
                        <button
                            onClick={() => setSortBy('priority')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${sortBy === 'priority'
                                ? 'bg-white/20 text-white'
                                : 'text-white/60 hover:text-white'
                                }`}
                        >
                            Priority
                        </button>
                        <button
                            onClick={() => setSortBy('difficulty')}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${sortBy === 'difficulty'
                                ? 'bg-white/20 text-white'
                                : 'text-white/60 hover:text-white'
                                }`}
                        >
                            Difficulty
                        </button>
                    </div>

                    {sortBy !== 'manual' && (
                        <button
                            onClick={() => setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="flex items-center gap-2 px-3 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white/80 hover:bg-white/20 transition-colors"
                            title={sortDirection === 'desc' ? 'Descending (High to Low)' : 'Ascending (Low to High)'}
                        >
                            {sortDirection === 'desc' ? (
                                <ArrowDown className="w-4 h-4" />
                            ) : (
                                <ArrowUp className="w-4 h-4" />
                            )}
                        </button>
                    )}

                    <button className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white/80 hover:bg-white/20 transition-colors">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        AI Suggestions
                    </button>
                    <button
                        onClick={handleAddTask}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-colors shadow-lg shadow-purple-500/30"
                    >
                        <Plus className="w-4 h-4" />
                        Add Task
                    </button>
                </div>
            </div>

            {/* Phase name badge removed - navigation via PhaseSelectionView */}

            {/* Board */}
            <DndContext
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="relative z-10 flex-1 overflow-x-auto pb-4 p-6">
                    <div className="flex gap-6 h-full min-w-max">
                        {project.columns.map(column => (
                            <KanbanColumn
                                key={column.id}
                                column={column}
                                tasks={getSortedTasks(phaseTasks.filter(t => t.columnId === column.id))}
                                onEditTask={handleEditTask}
                                onDeleteTask={handleDeleteTask}
                                isSorted={sortBy !== 'manual'}
                            />
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
