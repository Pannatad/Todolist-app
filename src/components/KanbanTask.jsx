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

    // Card Styles based on Priority (Glass with Glow Border)
    const getPriorityStyles = (p) => {
        switch (p?.toLowerCase()) {
            case 'high':
                return 'bg-white/15 backdrop-blur-md border-l-4 border-l-red-500 shadow-[inset_0_0_20px_rgba(239,68,68,0.15)]';
            case 'medium':
                return 'bg-white/15 backdrop-blur-md border-l-4 border-l-amber-500 shadow-[inset_0_0_20px_rgba(245,158,11,0.15)]';
            case 'low':
                return 'bg-white/15 backdrop-blur-md border-l-4 border-l-emerald-500 shadow-[inset_0_0_20px_rgba(16,185,129,0.15)]';
            default:
                return 'bg-white/15 backdrop-blur-md border-l-4 border-l-purple-500 shadow-[inset_0_0_20px_rgba(168,85,247,0.15)]';
        }
    };

    // Difficulty Badge Styles (Glowing Pills)
    const getDifficultyStyle = (d) => {
        switch (d?.toLowerCase()) {
            case 'easy': return 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
            case 'medium': return 'bg-amber-500/20 text-amber-300 border border-amber-500/30';
            case 'hard': return 'bg-red-500/20 text-red-300 border border-red-500/30';
            default: return 'bg-purple-500/20 text-purple-300 border border-purple-500/30';
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
            className={`p-4 rounded-xl group transition-all cursor-pointer relative overflow-hidden border border-white/10
                ${getPriorityStyles(task.priority)}
                ${isDone ? 'opacity-50 grayscale' : ''}
                hover:bg-white/20 hover:shadow-lg hover:scale-[1.02] hover:border-white/20
            `}
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className={`font-bold text-sm flex-1 ${isDone
                    ? 'text-white/40 line-through'
                    : 'text-white'
                    }`}>{task.title}</h4>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={handleDelete}
                        className="delete-button p-1 rounded hover:bg-white/10 text-white/50 hover:text-red-400 transition-colors"
                        title="Delete task"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        {...listeners}
                        className="drag-handle text-white/40 hover:text-white cursor-grab active:cursor-grabbing"
                    >
                        <GripVertical className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {task.description && (
                <p className={`text-xs mb-3 line-clamp-2 ${isDone
                    ? 'text-white/30'
                    : 'text-white/60'
                    }`}>{task.description}</p>
            )}

            {/* Subtasks List */}
            {task.subtasks && task.subtasks.length > 0 && (
                <div className="mb-3 space-y-1.5 bg-white/5 p-2 rounded-lg border border-white/10">
                    {task.subtasks.map((subtask, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs">
                            <div className={`mt-0.5 min-w-[12px] h-3 rounded-full border flex items-center justify-center ${subtask.completed
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-white/30 bg-white/10'
                                }`}>
                                {subtask.completed && <Check size={8} strokeWidth={4} />}
                            </div>
                            <span className={`leading-4 ${subtask.completed ? 'text-white/40 line-through' : 'text-white/70'}`}>
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
