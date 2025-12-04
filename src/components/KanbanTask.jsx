import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Check } from 'lucide-react';

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

    // Card Styles based on Priority (Background + Left Border)
    const getPriorityStyles = (p) => {
        switch (p?.toLowerCase()) {
            case 'high':
                return 'bg-red-100 dark:bg-red-900/30 border-l-4 border-l-red-500';
            case 'medium':
                return 'bg-amber-100 dark:bg-amber-900/30 border-l-4 border-l-amber-500';
            case 'low':
                return 'bg-blue-100 dark:bg-blue-900/30 border-l-4 border-l-blue-500';
            default:
                return 'bg-white dark:bg-void-800 border-l-4 border-l-gray-300';
        }
    };

    // Difficulty Badge Styles (White Pill with Colored Text)
    const getDifficultyStyle = (d) => {
        switch (d?.toLowerCase()) {
            case 'easy': return 'bg-white/80 dark:bg-void-800/80 text-green-600 dark:text-green-400';
            case 'medium': return 'bg-white/80 dark:bg-void-800/80 text-orange-600 dark:text-orange-400';
            case 'hard': return 'bg-white/80 dark:bg-void-800/80 text-red-600 dark:text-red-400';
            default: return 'bg-white/80 dark:bg-void-800/80 text-gray-600 dark:text-gray-400';
        }
    };

    const handleCardClick = (e) => {
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
            className={`p-4 rounded-xl shadow-sm group transition-all cursor-pointer relative overflow-hidden
                ${getPriorityStyles(task.priority)}
                ${isDone ? 'opacity-60 grayscale' : ''}
                hover:shadow-md
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className={`font-bold text-sm flex-1 ${isDone
                    ? 'text-gray-500 line-through'
                    : 'text-gray-800 dark:text-white'
                    }`}>{task.title}</h4>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleDelete}
                        className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-red-500 transition-colors"
                        title="Delete task"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        {...listeners}
                        className="drag-handle text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {task.description && (
                <p className={`text-xs mb-3 line-clamp-2 ${isDone
                    ? 'text-gray-500'
                    : 'text-gray-600 dark:text-gray-300'
                    }`}>{task.description}</p>
            )}

            {/* Subtasks List */}
            {task.subtasks && task.subtasks.length > 0 && (
                <div className="mb-3 space-y-1.5 bg-white/40 dark:bg-black/10 p-2 rounded-lg">
                    {task.subtasks.map((subtask, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs">
                            <div className={`mt-0.5 min-w-[12px] h-3 rounded-full border flex items-center justify-center ${subtask.completed
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'border-gray-400 dark:border-gray-500 bg-white/50 dark:bg-white/10'
                                }`}>
                                {subtask.completed && <Check size={8} strokeWidth={4} />}
                            </div>
                            <span className={`leading-4 ${subtask.completed ? 'text-gray-500 line-through' : 'text-gray-700 dark:text-gray-200'}`}>
                                {subtask.title}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-2 items-center mt-auto">
                {/* Difficulty Badge */}
                {task.difficulty && (
                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold shadow-sm ${getDifficultyStyle(task.difficulty)}`}>
                        {task.difficulty}
                    </span>
                )}
            </div>
        </div>
    );
};
