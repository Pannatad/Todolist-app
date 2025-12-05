import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanTask } from './KanbanTask';

export const KanbanColumn = ({ column, tasks, onEditTask, onDeleteTask, isSorted }) => {
    const { setNodeRef } = useDroppable({
        id: column.id,
    });

    const isDoneColumn = column.title.toLowerCase() === 'done';

    // Get column-specific gradient
    const getColumnGradient = (title) => {
        switch (title.toLowerCase()) {
            case 'to do':
                return 'from-purple-500/30 to-indigo-500/30';
            case 'in progress':
                return 'from-amber-500/30 to-orange-500/30';
            case 'review':
                return 'from-pink-500/30 to-rose-500/30';
            case 'done':
                return 'from-emerald-500/30 to-teal-500/30';
            default:
                return 'from-purple-500/30 to-indigo-500/30';
        }
    };

    // Get badge color
    const getBadgeColor = (title) => {
        switch (title.toLowerCase()) {
            case 'to do':
                return 'bg-purple-500 shadow-purple-500/50';
            case 'in progress':
                return 'bg-amber-500 shadow-amber-500/50';
            case 'review':
                return 'bg-pink-500 shadow-pink-500/50';
            case 'done':
                return 'bg-emerald-500 shadow-emerald-500/50';
            default:
                return 'bg-purple-500 shadow-purple-500/50';
        }
    };

    return (
        <div className="flex flex-col h-full min-w-[280px] w-80 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-xl overflow-hidden">
            {/* Column Header with Gradient */}
            <div className={`p-4 border-b border-white/10 flex justify-between items-center bg-gradient-to-r ${getColumnGradient(column.title)}`}>
                <h3 className="font-bold text-white text-lg">{column.title}</h3>
                <span className={`text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg ${getBadgeColor(column.title)}`}>
                    {tasks.length}
                </span>
            </div>

            <div ref={setNodeRef} className="flex-1 p-3 overflow-y-auto space-y-3 min-h-[150px]">
                <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    {tasks.map(task => (
                        <KanbanTask key={task.id} task={task} onEdit={onEditTask} onDelete={onDeleteTask} isDone={isDoneColumn} />
                    ))}
                </SortableContext>

                {tasks.length === 0 && (
                    <div className="h-full flex items-center justify-center text-white/30 text-sm italic border-2 border-dashed border-white/10 rounded-xl bg-white/5 backdrop-blur-sm">
                        Drop tasks here
                    </div>
                )}
            </div>
        </div>
    );
};
