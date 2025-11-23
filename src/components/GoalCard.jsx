import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

const GoalCard = ({ goal, onClick, onDelete }) => {
    const { title, emoji, colorTheme, motivation, deadline } = goal;

    // Calculate days left
    const getDaysLeft = () => {
        if (!deadline) return null;
        const now = new Date();
        const end = new Date(deadline);
        const diff = end - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

        if (days < 0) return 'Overdue';
        if (days === 0) return 'Today';
        if (days === 1) return '1 day left';
        return `${days} days left`;
    };

    const daysLeft = getDaysLeft();

    // Color theme mapping (soft, washed-out versions)
    const colorThemes = {
        sage: { bg: '#e8f3ea', text: '#568171', accent: '#84b59f' },
        lavender: { bg: '#f3e8ff', text: '#6b21a8', accent: '#a855f7' },
        peach: { bg: '#fff4ed', text: '#c2410c', accent: '#fb923c' },
        sky: { bg: '#e0f2fe', text: '#0369a1', accent: '#38bdf8' },
        mint: { bg: '#d1fae5', text: '#065f46', accent: '#34d399' },
        rose: { bg: '#ffe4e6', text: '#9f1239', accent: '#fb7185' },
        amber: { bg: '#fef3c7', text: '#92400e', accent: '#fbbf24' },
        purple: { bg: '#f3e8ff', text: '#581c87', accent: '#c084fc' }
    };

    const theme = colorThemes[colorTheme] || colorThemes.sage;

    return (
        <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            onClick={onClick}
            className="p-6 rounded-2xl shadow-md hover:shadow-xl cursor-pointer transition-shadow relative overflow-hidden group"
            style={{ backgroundColor: theme.bg }}
        >
            {/* Delete Button - Appears on Hover (desktop) or Always Visible (mobile) */}
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Are you sure you want to delete this goal?')) {
                        onDelete(goal.id);
                    }
                }}
                className="absolute top-2 right-2 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform hover:scale-110 z-10"
                title="Delete Goal"
            >
                <X size={14} strokeWidth={3} />
            </button>

            {/* Emoji Icon */}
            <div className="text-5xl mb-4 text-center">
                {emoji || '🎯'}
            </div>

            {/* Goal Title */}
            <h3
                className="text-xl font-bold mb-3 text-center break-words"
                style={{ color: theme.text }}
            >
                {title}
            </h3>

            {/* Motivation Text */}
            {motivation && (
                <p
                    className="text-sm italic mb-4 text-center opacity-80 line-clamp-3"
                    style={{ color: theme.text }}
                >
                    "{motivation}"
                </p>
            )}

            {/* Deadline Countdown */}
            {daysLeft && (
                <div className="flex justify-center">
                    <span
                        className="px-3 py-1 rounded-full text-xs font-bold"
                        style={{
                            backgroundColor: theme.accent + '40', // 25% opacity
                            color: theme.accent
                        }}
                    >
                        ⏰ {daysLeft}
                    </span>
                </div>
            )}
        </motion.div>
    );
};

export default GoalCard;
