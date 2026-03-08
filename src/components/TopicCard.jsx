import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, ChevronRight, BookOpen } from 'lucide-react';

const STATUS_CONFIG = {
    not_started: {
        label: 'Not Started',
        dotColor: 'bg-gray-300',
        icon: null,
    },
    in_progress: {
        label: 'In Progress',
        dotColor: 'bg-amber-400',
        icon: Zap,
    },
    completed: {
        label: 'Completed',
        dotColor: 'bg-emerald-400',
        icon: Check,
    },
    mastered: {
        label: 'Mastered',
        dotColor: 'bg-yellow-400',
        icon: Star,
    },
};

const TopicCard = ({ topic, onCycleStatus, onClick, resourceCount = 0, tintBorder = 'border-gray-100' }) => {
    const status = STATUS_CONFIG[topic.status] || STATUS_CONFIG.not_started;

    const handleStatusClick = (e) => {
        e.stopPropagation();
        onCycleStatus(topic.id);
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            whileHover={{ scale: 1.01 }}
            onClick={onClick}
            className={`group relative flex items-center gap-3 p-4 rounded-2xl cursor-pointer transition-all duration-200
                bg-white hover:bg-gray-50 border ${tintBorder} hover:border-gray-200 shadow-sm hover:shadow
                ${topic.status === 'completed' ? 'opacity-75' : ''}
                ${topic.status === 'mastered' ? 'ring-1 ring-yellow-300/50 border-yellow-200' : ''}`}
        >
            {/* Status Indicator / Click Target */}
            <button
                onClick={handleStatusClick}
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
                    ${topic.status === 'not_started' ? 'bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300 hover:border-gray-400' : ''}
                    ${topic.status === 'in_progress' ? 'bg-amber-50 hover:bg-amber-100 border border-amber-300' : ''}
                    ${topic.status === 'completed' ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-300' : ''}
                    ${topic.status === 'mastered' ? 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.15)]' : ''}
                `}
                title={`Click to change status (${status.label})`}
            >
                {topic.status === 'not_started' && (
                    <div className="w-3 h-3 rounded-full bg-gray-300" />
                )}
                {topic.status === 'in_progress' && (
                    <Zap size={18} className="text-amber-500" />
                )}
                {topic.status === 'completed' && (
                    <Check size={18} className="text-emerald-500" strokeWidth={3} />
                )}
                {topic.status === 'mastered' && (
                    <Star size={18} className="text-yellow-500 fill-yellow-400" />
                )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <h4 className={`font-semibold text-sm truncate ${topic.status === 'completed' || topic.status === 'mastered' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {topic.title}
                </h4>

                {/* Resource Count & Description */}
                <div className="flex items-center gap-2 mt-1">
                    {resourceCount > 0 && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                            <BookOpen size={10} />
                            {resourceCount} resource{resourceCount > 1 ? 's' : ''}
                        </span>
                    )}
                </div>

                {topic.description && (
                    <p className="text-xs text-gray-400 mt-1 truncate">{topic.description}</p>
                )}
            </div>

            {/* Chevron */}
            <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-400 transition-colors flex-shrink-0" />
        </motion.div>
    );
};

export default TopicCard;
export { STATUS_CONFIG };
