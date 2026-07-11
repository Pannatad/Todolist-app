import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Check } from 'lucide-react';
import { confirmAction } from '../utils/confirm';

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

    // Card Styles based on Priority - solid white with colored left border
    const getPriorityStyles = (p) => {
        switch (p?.toLowerCase()) {
            case 'high':
                return 'bg-white border-2 border-l-4 border-l-red-500 border-gray-200';
            case 'medium':
                return 'bg-white border-2 border-l-4 border-l-amber-500 border-gray-200';
            case 'low':
                return 'bg-white border-2 border-l-4 border-l-emerald-500 border-gray-200';
            default:
                return 'bg-white border-2 border-l-4 border-l-indigo-500 border-gray-200';
        }
    };

    // Difficulty Badge Styles - colored badges
    const getDifficultyStyle = (d) => {
        switch (d?.toLowerCase()) {
            case 'easy': return 'bg-cyan-400 text-white';
            case 'medium': return 'bg-emerald-500 text-white';
            case 'hard': return 'bg-red-500 text-white';
            default: return 'bg-indigo-500 text-white';
        }
    };

    const handleCardClick = (e) => {
        if (!e.target.closest('.drag-handle') && !e.target.closest('.delete-button')) {
            onEdit && onEdit(task);
        }
    };

    const handleDelete = (e) => {
        e.stopPropagation();
        if (confirmAction('Are you sure you want to delete this task?')) {
            onDelete && onDelete(task.id);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            onClick={handleCardClick}
            className={`p-4 rounded-xl group transition-all cursor-pointer relative overflow-hidden shadow-md
                ${getPriorityStyles(task.priority)}
                ${isDone ? 'opacity-50 grayscale' : ''}
                hover:shadow-lg hover:scale-[1.02]
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className={`font-bold text-sm flex-1 ${isDone
                    ? 'text-gray-400 line-through'
                    : 'text-gray-900'
                    }`}>{task.title}</h4>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleDelete}
                        className="delete-button p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete task"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        {...listeners}
                        className="drag-handle text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {task.description && (
                <p className={`text-xs mb-3 line-clamp-2 ${isDone
                    ? 'text-gray-300'
                    : 'text-gray-500'
                    }`}>{task.description}</p>
            )}

            {/* Subtasks List */}
            {task.subtasks && task.subtasks.length > 0 && (
                <div className="mb-3 space-y-1.5 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    {task.subtasks.map((subtask, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs">
                            <div className={`mt-0.5 min-w-[12px] h-3 rounded-full border flex items-center justify-center ${subtask.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-gray-300 bg-white'
                                }`}>
                                {subtask.completed && <Check size={8} strokeWidth={4} />}
                            </div>
                            <span className={`leading-4 ${subtask.completed ? 'text-gray-400 line-through' : 'text-gray-600'}`}>
                                {subtask.title}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex gap-2 items-center mt-auto">
                {/* Difficulty Badge */}
                {task.difficulty && (
                    <span className={`text-[10px] px-3 py-1 rounded-full font-bold ${getDifficultyStyle(task.difficulty)}`}>
                        {task.difficulty}
                    </span>
                )}
            </div>
        </div>
    );
};
