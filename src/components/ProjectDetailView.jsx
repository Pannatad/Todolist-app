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

const ProjectDetailView = ({ project, onBack }) => {
    const { moveTask, updateProject, addTask, updateTask, deleteTask } = useProject();
    const [activeId, setActiveId] = useState(null);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [sortBy, setSortBy] = useState('manual'); // 'manual', 'priority', 'difficulty'
    const [sortDirection, setSortDirection] = useState('desc'); // 'desc', 'asc'

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;
        setActiveId(null);

        if (!over) return;

        const activeId = active.id;
        const overId = over.id;

        // Find the task and its current column
        const activeTask = project.tasks.find(t => t.id === activeId);
        if (!activeTask) return;

        // Check if dropped over a column
        const isOverColumn = project.columns.find(c => c.id === overId);

        // Check if dropped over another task
        const overTask = project.tasks.find(t => t.id === overId);

        let newColumnId = activeTask.columnId;

        if (isOverColumn) {
            newColumnId = isOverColumn.id;
        } else if (overTask) {
            newColumnId = overTask.columnId;
        }

        if (activeTask.columnId !== newColumnId) {
            moveTask(project.id, activeId, newColumnId);
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
            addTask(project.id, { ...taskData, columnId: project.columns[0].id });
        }
        setIsTaskModalOpen(false);
    };

    const handleDeleteTask = (taskId) => {
        deleteTask(project.id, taskId);
    };

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
            // Reverse if ascending
            return sortDirection === 'asc' ? -result : result;
        });
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
                        <h2 className="text-2xl font-bold text-white">{project.title}</h2>
                        <div className="flex items-center gap-4 text-sm text-white/60">
                            <span>{project.tasks.length} Tasks</span>
                            <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                                    <div
                                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                                        style={{ width: `${project.progress}%` }}
                                    />
                                </div>
                                <span>{project.progress}% Done</span>
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
                                tasks={getSortedTasks(project.tasks.filter(t => t.columnId === column.id))}
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
