import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';

export const KanbanTask = ({ task, onEdit, onDelete, isDone }) => {
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

    const getPriorityColor = (p, muted = false) => {
        if (muted) {
            switch (p?.toLowerCase()) {
                case 'high': return 'bg-purple-50 text-purple-400 dark:bg-purple-900/10 dark:text-purple-500/50';
                case 'medium': return 'bg-yellow-50 text-yellow-400 dark:bg-yellow-900/10 dark:text-yellow-500/50';
                case 'low': return 'bg-blue-50 text-blue-400 dark:bg-blue-900/10 dark:text-blue-500/50';
                default: return 'bg-gray-50 text-gray-400 dark:bg-gray-800/10 dark:text-gray-500/50';
            }
        }
        switch (p?.toLowerCase()) {
            case 'high': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
            case 'medium': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
            case 'low': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
        }
    };

    const getDifficultyColor = (d, muted = false) => {
        if (muted) {
            switch (d?.toLowerCase()) {
                case 'easy': return 'bg-green-50 text-green-400 dark:bg-green-900/10 dark:text-green-500/50';
                case 'medium': return 'bg-orange-50 text-orange-400 dark:bg-orange-900/10 dark:text-orange-500/50';
                case 'hard': return 'bg-red-50 text-red-400 dark:bg-red-900/10 dark:text-red-500/50';
                default: return 'bg-purple-50 text-purple-400 dark:bg-purple-900/10 dark:text-purple-500/50';
            }
        }
        switch (d?.toLowerCase()) {
            case 'easy': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
            case 'medium': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
            case 'hard': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
            default: return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
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
            className={`p-3 rounded-lg shadow-sm border group hover:border-sage-400 dark:hover:border-white/30 transition-all cursor-pointer ${isDone
                ? 'bg-white/40 dark:bg-void-800/40 border-sage-200/50 dark:border-white/5 opacity-60'
                : 'bg-white dark:bg-void-800 border-sage-200 dark:border-white/10'
                }`}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className={`font-medium text-sm flex-1 ${isDone
                    ? 'text-sage-500 dark:text-bone-400 line-through'
                    : 'text-sage-800 dark:text-bone-100'
                    }`}>{task.title}</h4>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleDelete}
                        className="delete-button opacity-70 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-red-500 hover:text-red-600 dark:text-red-400 transition-all"
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

            <p className={`text-xs mb-3 line-clamp-2 ${isDone
                ? 'text-sage-400 dark:text-bone-500'
                : 'text-sage-500 dark:text-bone-400'
                }`}>{task.description}</p>

            <div className="flex gap-2 flex-wrap">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getPriorityColor(task.priority, isDone)}`}>
                    {task.priority}
                </span>
                {task.difficulty && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getDifficultyColor(task.difficulty, isDone)}`}>
                        {task.difficulty}
                    </span>
                )}
                {task.subtasks && task.subtasks.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${isDone
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800/10 dark:text-gray-500/50'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                        <span className="text-[8px]">✓</span>
                        {task.subtasks.filter(st => st.completed).length}/{task.subtasks.length}
                    </span>
                )}
            </div>
        </div>
    );
};
