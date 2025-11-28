import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

export const KanbanTask = ({ task, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: task.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const getPriorityColor = (p) => {
        switch (p?.toLowerCase()) {
            case 'high': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            case 'medium': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
            case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    const handleCardClick = (e) => {
        // Only trigger edit if not clicking on the drag handle or delete button
        if (!e.target.closest('.drag-handle') && !e.target.closest('.delete-button')) {
            onEdit && onEdit(task);
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this task?')) {
            onDelete && onDelete(task.id);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            onClick={handleCardClick}
            className="bg-white dark:bg-void-800 p-3 rounded-lg shadow-sm border border-sage-200 dark:border-white/10 group hover:border-sage-400 dark:hover:border-white/30 transition-all cursor-pointer"
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-medium text-sage-800 dark:text-bone-100 text-sm flex-1">{task.title}</h4>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleDelete}
                        className="delete-button opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 hover:text-red-600 dark:text-red-400 transition-all"
                        title="Delete task"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        {...listeners}
                        className="drag-handle text-sage-400 hover:text-sage-600 dark:text-bone-500 cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            <p className="text-xs text-sage-500 dark:text-bone-400 mb-3 line-clamp-2">{task.description}</p>

            <div className="flex gap-2 flex-wrap">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                </span>
                {task.difficulty && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        {task.difficulty}
                    </span>
                )}
            </div>
        </div>
    );
};
