import React, { useState } from 'react';
import { DndContext, closestCorners, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { ArrowLeft, Plus, Sparkles } from 'lucide-react';
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

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2 rounded-full hover:bg-sage-100 dark:hover:bg-void-700 text-sage-600 dark:text-bone-200 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-sage-800 dark:text-bone-100">{project.title}</h2>
                        <div className="flex items-center gap-4 text-sm text-sage-500 dark:text-bone-400">
                            <span>{project.tasks.length} Tasks</span>
                            <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-sage-200 dark:bg-void-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-sage-500 dark:bg-magma-500 transition-all duration-500"
                                        style={{ width: `${project.progress}%` }}
                                    />
                                </div>
                                <span>{project.progress}% Done</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-700 dark:text-bone-200 hover:bg-sage-50 dark:hover:bg-void-700 transition-colors">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        AI Suggestions
                    </button>
                    <button
                        onClick={handleAddTask}
                        className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-sm"
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
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-6 h-full min-w-max px-1">
                        {project.columns.map(column => (
                            <KanbanColumn
                                key={column.id}
                                column={column}
                                tasks={project.tasks.filter(t => t.columnId === column.id)}
                                onEditTask={handleEditTask}
                                onDeleteTask={handleDeleteTask}
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
        </div >
    );
};

export default ProjectDetailView;
