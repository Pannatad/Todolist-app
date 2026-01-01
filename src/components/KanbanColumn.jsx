import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanTask } from './KanbanTask';

export const KanbanColumn = ({ column, tasks, onEditTask, onDeleteTask, isSorted }) => {
    const { setNodeRef } = useDroppable({
        id: column.id,
    });

    const isDoneColumn = column.title.toLowerCase() === 'done';

    // Get column-specific color scheme
    const getColumnColor = (title) => {
        switch (title.toLowerCase()) {
            case 'to do':
                return { bg: 'bg-indigo-500/90', badge: 'bg-white', text: 'text-white', badgeText: 'text-indigo-600' };
            case 'in progress':
                return { bg: 'bg-amber-500/90', badge: 'bg-white', text: 'text-white', badgeText: 'text-amber-600' };
            case 'review':
                return { bg: 'bg-pink-500/90', badge: 'bg-white', text: 'text-white', badgeText: 'text-pink-600' };
            case 'done':
                return { bg: 'bg-emerald-500/90', badge: 'bg-white', text: 'text-white', badgeText: 'text-emerald-600' };
            default:
                return { bg: 'bg-indigo-500/90', badge: 'bg-white', text: 'text-white', badgeText: 'text-indigo-600' };
        }
    };

    const colors = getColumnColor(column.title);

    return (
        <div className="flex flex-col h-full min-w-[280px] w-80 bg-white/25 backdrop-blur-2xl rounded-2xl border border-white/30 shadow-2xl overflow-hidden">
            {/* Column Header */}
            <div className={`p-4 border-b border-white/20 flex justify-between items-center ${colors.bg} backdrop-blur-md`}>
                <h3 className={`font-bold text-lg ${colors.text}`}>{column.title}</h3>
                <span className={`${colors.badgeText} text-xs px-3 py-1 rounded-full font-bold shadow-sm ${colors.badge}`}>
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
                    <div className="h-full flex items-center justify-center text-white/60 text-sm font-medium border-2 border-dashed border-white/30 rounded-xl bg-white/5 backdrop-blur-sm p-6">
                        Drop tasks here
                    </div>
                )}
            </div>
        </div>
    );
};
