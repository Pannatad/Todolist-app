import React from 'react';
import { motion as Motion } from 'framer-motion';
import { Clock, BookOpen, Trash2, Edit2, ArchiveRestore, Archive, Pin } from 'lucide-react';
import { COLOR_OPTIONS } from './LearningPathModal';

const LearningPathCard = ({ path, progress, topicCount, completedCount, plannedTime, studiedTime, isPinned = false, onClick, onEdit, onDelete, onArchive, onRestore, onTogglePin }) => {
    const colorConfig = COLOR_OPTIONS.find(c => c.name === path.color) || COLOR_OPTIONS[0];

    const getDaysLeft = () => {
        if (!path.target_completion_date) return null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const [year, month, day] = path.target_completion_date.split('-').map(Number);
        const end = new Date(year, (month || 1) - 1, day || 1);
        end.setHours(0, 0, 0, 0);
        const diff = end - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        if (days < 0) return { text: 'Overdue', urgent: true };
        if (days === 0) return { text: 'Today!', urgent: true };
        if (days === 1) return { text: '1 day left', urgent: false };
        return { text: `${days} days left`, urgent: days <= 7 };
    };

    const formatTime = (minutes) => {
        if (!minutes) return '0h';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const deadline = getDaysLeft();

    return (
        <Motion.div
            whileHover={{ scale: 1.03, y: -4 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={onClick}
            className={`relative rounded-2xl overflow-hidden cursor-pointer group bg-white border shadow-sm hover:shadow-lg transition-all ${
                isPinned ? 'border-amber-200 ring-2 ring-amber-100' : 'border-gray-100'
            }`}
        >
            {/* Gradient Header */}
            <div className={`bg-gradient-to-r ${colorConfig.gradient} p-5 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -mr-8 -mt-8" />
                <div className="absolute bottom-0 left-0 w-16 h-16 bg-black/10 rounded-full blur-xl -ml-4 -mb-4" />

                <div className="relative z-10">
                    {/* Icon & Title */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl drop-shadow-md">{path.icon || '📚'}</span>
                            <div>
                                <h3 className="font-bold text-white text-lg leading-tight">{path.name}</h3>
                                {path.description && (
                                    <p className="text-white/60 text-xs mt-0.5 line-clamp-1">{path.description}</p>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className={`flex gap-1 transition-opacity ${isPinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button
                                onClick={(e) => { e.stopPropagation(); onTogglePin?.(path.id); }}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    isPinned
                                        ? 'bg-white/20 text-amber-100 hover:text-white'
                                        : 'hover:bg-white/20 text-white/60 hover:text-white'
                                }`}
                                title={isPinned ? 'Unpin course' : 'Pin course'}
                            >
                                <Pin size={14} fill={isPinned ? 'currentColor' : 'none'} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onEdit(path); }}
                                className="p-1.5 rounded-lg hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                                title="Edit"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (path.archived) {
                                        onRestore(path.id);
                                    } else {
                                        onArchive(path.id);
                                    }
                                }}
                                className="p-1.5 rounded-lg hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                                title={path.archived ? 'Restore' : 'Archive'}
                            >
                                {path.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Delete this learning path and all its topics?')) {
                                        onDelete(path.id);
                                    }
                                }}
                                className="p-1.5 rounded-lg hover:bg-red-500/30 text-white/60 hover:text-red-200 transition-colors"
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2">
                        <div className="flex items-center justify-between text-xs text-white/70 mb-1.5">
                            <span>Progress</span>
                            <span className="font-bold text-white">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-black/20 rounded-full overflow-hidden">
                            <Motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progress}%` }}
                                transition={{ duration: 0.8, ease: 'easeOut' }}
                                className="h-full bg-white/80 rounded-full"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Footer */}
            <div className="bg-white p-4">
                <div className="flex items-center justify-between">
                    <div className="flex gap-3 items-center">
                        {/* Topics Count — Prominent Badge */}
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r ${colorConfig.gradient} shadow-sm`}>
                            <BookOpen size={14} className="text-white/80" />
                            <span className="text-sm font-bold text-white">
                                {completedCount}<span className="text-white/60 font-medium">/{topicCount}</span>
                            </span>
                        </div>

                        {/* Time Spent */}
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                            <Clock size={13} />
                            <span className="font-medium text-gray-500">{formatTime(studiedTime)}</span>
                            {plannedTime > 0 && (
                                <span className="text-gray-300">/ {formatTime(plannedTime)} planned</span>
                            )}
                        </div>
                    </div>

                    {/* Deadline Badge */}
                    {deadline && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${deadline.urgent
                            ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-gray-50 text-gray-500 border border-gray-100'
                            }`}>
                            ⏰ {deadline.text}
                        </span>
                    )}
                </div>
            </div>
        </Motion.div>
    );
};

export default LearningPathCard;
