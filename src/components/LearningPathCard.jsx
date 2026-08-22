import { motion as Motion } from 'framer-motion';
import {
    Archive,
    ArchiveRestore,
    BookOpen,
    ChevronRight,
    Clock,
    Edit2,
    Pin,
    Trash2,
} from 'lucide-react';
import { confirmAction } from '../utils/confirm';

const LearningPathCard = ({
    path,
    progress,
    topicCount,
    completedCount,
    plannedTime,
    studiedTime,
    isPinned = false,
    onClick,
    onEdit,
    onDelete,
    onArchive,
    onRestore,
    onTogglePin,
}) => {
    const getDaysLeft = () => {
        if (!path.target_completion_date) return null;

        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const [year, month, day] = path.target_completion_date.split('-').map(Number);
        const end = new Date(year, (month || 1) - 1, day || 1);
        end.setHours(0, 0, 0, 0);
        const days = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

        if (days < 0) return { text: 'Overdue', urgent: true };
        if (days === 0) return { text: 'Due today', urgent: true };
        if (days === 1) return { text: '1 day left', urgent: false };
        return { text: `${days} days left`, urgent: days <= 7 };
    };

    const formatTime = (minutes) => {
        if (!minutes) return '0h';
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const remainder = minutes % 60;
        return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
    };

    const deadline = getDaysLeft();

    return (
        <article className="learning-path-card" data-learning-color={path.color || 'purple'}>
            <div className="learning-path-card__header">
                <button
                    type="button"
                    className="learning-path-card__identity"
                    onClick={onClick}
                    aria-label={`Open ${path.name}`}
                >
                    <span className="learning-path-card__icon" aria-hidden="true">
                        {path.icon || '📚'}
                    </span>
                    <span className="learning-path-card__heading">
                        <span className="learning-path-card__title-row">
                            <span className="learning-path-card__title">{path.name}</span>
                            {isPinned && <Pin size={13} fill="currentColor" aria-label="Pinned" />}
                        </span>
                        {path.category && (
                            <span className="learning-path-card__category">
                                <span aria-hidden="true" />
                                {path.category}
                            </span>
                        )}
                    </span>
                </button>

                <div className="learning-path-card__actions" aria-label={`${path.name} actions`}>
                    <button
                        type="button"
                        onClick={() => onTogglePin?.(path.id)}
                        className={isPinned ? 'is-active' : ''}
                        title={isPinned ? 'Unpin path' : 'Pin path'}
                        aria-label={isPinned ? `Unpin ${path.name}` : `Pin ${path.name}`}
                    >
                        <Pin size={15} fill={isPinned ? 'currentColor' : 'none'} />
                    </button>
                    <button type="button" onClick={() => onEdit(path)} title="Edit path" aria-label={`Edit ${path.name}`}>
                        <Edit2 size={15} />
                    </button>
                    <button
                        type="button"
                        onClick={() => (path.archived ? onRestore(path.id) : onArchive(path.id))}
                        title={path.archived ? 'Restore path' : 'Archive path'}
                        aria-label={path.archived ? `Restore ${path.name}` : `Archive ${path.name}`}
                    >
                        {path.archived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                    </button>
                    <button
                        type="button"
                        className="is-danger"
                        onClick={() => {
                            if (confirmAction('Delete this learning path and all its topics?')) onDelete(path.id);
                        }}
                        title="Delete path"
                        aria-label={`Delete ${path.name}`}
                    >
                        <Trash2 size={15} />
                    </button>
                </div>
            </div>

            <button type="button" className="learning-path-card__body" onClick={onClick}>
                {path.description && <span className="learning-path-card__description">{path.description}</span>}

                <span className="learning-path-card__progress-copy">
                    <span>Progress</span>
                    <strong>{progress}%</strong>
                </span>
                <span className="learning-path-card__track" aria-hidden="true">
                    <Motion.span
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    />
                </span>

                <span className="learning-path-card__footer">
                    <span className="learning-path-card__meta">
                        <span><BookOpen size={14} /> {completedCount}/{topicCount} topics</span>
                        <span>
                            <Clock size={14} /> {formatTime(studiedTime)}
                            {plannedTime > 0 && <span className="learning-path-card__planned"> / {formatTime(plannedTime)} planned</span>}
                        </span>
                    </span>
                    <span className="learning-path-card__open">
                        {deadline && <span className={deadline.urgent ? 'is-urgent' : ''}>{deadline.text}</span>}
                        <ChevronRight size={17} aria-hidden="true" />
                    </span>
                </span>
            </button>
        </article>
    );
};

export default LearningPathCard;
