import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanTask } from './KanbanTask';

export const KanbanColumn = ({ column, tasks, onEditTask, onDeleteTask }) => {
    const { setNodeRef } = useDroppable({
        id: column.id,
    });

    return (
        <div className="flex flex-col h-full min-w-[280px] w-80 bg-sage-50/50 dark:bg-void-900/50 rounded-xl border border-sage-200/50 dark:border-white/5 backdrop-blur-sm">
            <div className="p-4 border-b border-sage-200/50 dark:border-white/5 flex justify-between items-center">
                <h3 className="font-bold text-sage-700 dark:text-bone-200">{column.title}</h3>
                <span className="bg-sage-200 dark:bg-void-700 text-sage-700 dark:text-bone-300 text-xs px-2 py-1 rounded-full font-medium">
                    {tasks.length}
                </span>
            </div>

            <div ref={setNodeRef} className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[150px]">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <KanbanTask key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} />
                    ))}
                </SortableContext>
                {tasks.length === 0 && (
                    <div className="h-full flex items-center justify-center text-sage-400 dark:text-bone-500/30 text-sm italic border-2 border-dashed border-sage-200 dark:border-white/5 rounded-lg">
                        Drop tasks here
                    </div>
                )}
            </div>
        </div>
    );
};
