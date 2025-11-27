import React, { useState } from 'react';
import { motion } from 'framer-motion';
import GoalCard from './GoalCard';
import GoalModal from './GoalModal';

const VisionBoard = ({ goals, onAddGoal, onUpdateGoal, onDeleteGoal, dailyHighlights, onUpdateHighlight }) => {
    const [showModal, setShowModal] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);

    const handleCardClick = (goal) => {
        setEditingGoal(goal);
        setShowModal(true);
    };

    const handleAddNew = () => {
        setEditingGoal(null);
        setShowModal(true);
    };

    const handleSave = (goalData) => {
        if (editingGoal) {
            onUpdateGoal(goalData.id, goalData);
        } else {
            onAddGoal(goalData);
        }
        setShowModal(false);
        setEditingGoal(null);
    };

    // Sunset Theme Colors
    const dayColors = [
        { bg: 'bg-gradient-to-r from-red-400 to-orange-400', shadow: 'shadow-red-200 dark:shadow-none', text: 'text-white' },
        { bg: 'bg-gradient-to-r from-orange-400 to-amber-400', shadow: 'shadow-orange-200 dark:shadow-none', text: 'text-white' },
        { bg: 'bg-gradient-to-r from-amber-300 to-yellow-300', shadow: 'shadow-amber-200 dark:shadow-none', text: 'text-amber-900' },
        { bg: 'bg-gradient-to-r from-yellow-200 to-lime-200', shadow: 'shadow-yellow-200 dark:shadow-none', text: 'text-lime-900' },
        { bg: 'bg-gradient-to-r from-lime-200 to-emerald-200', shadow: 'shadow-lime-200 dark:shadow-none', text: 'text-emerald-900' },
        { bg: 'bg-gradient-to-r from-emerald-200 to-teal-200', shadow: 'shadow-emerald-200 dark:shadow-none', text: 'text-teal-900' },
        { bg: 'bg-gradient-to-r from-teal-200 to-cyan-200', shadow: 'shadow-teal-200 dark:shadow-none', text: 'text-cyan-900' },
    ];

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-8 text-center">
                <h2 className="text-3xl font-serif font-bold text-sage-600 dark:text-magma-500 mb-2">
                    Vision Board
                </h2>
                <p className="text-sage-500 dark:text-bone-200/60 italic">
                    Your long-term goals and dreams
                </p>
            </div>

            {/* Weekly Focus (7 Days Vertical) */}
            <div className="mb-12 space-y-4">
                <div className="flex items-center gap-3 mb-6">
                    <div className="bg-sage-100 dark:bg-sage-900/30 p-2 rounded-lg">
                        <span className="text-2xl">📅</span>
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-sage-700 dark:text-bone-200">
                            Weekly Focus
                        </h3>
                        <p className="text-sage-500 dark:text-bone-200/60 font-medium">Plan your main goals for the week</p>
                    </div>
                </div>

                {Array.from({ length: 7 }).map((_, dayIndex) => {
                    const date = new Date();
                    date.setDate(date.getDate() + dayIndex);
                    const dateKey = date.toISOString().split('T')[0];
                    const isToday = dayIndex === 0;
                    const theme = dayColors[dayIndex % dayColors.length];

                    return (
                        <div
                            key={dateKey}
                            className={`rounded-2xl p-4 sm:p-6 transition-all ${theme.bg} ${theme.shadow} shadow-lg`}
                        >
                            {/* Date Header */}
                            <div className="mb-4 flex items-center gap-3">
                                <h4 className={`text-lg font-bold ${theme.text}`}>
                                    {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                                </h4>
                                {isToday && (
                                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-white/30 text-white backdrop-blur-sm">
                                        TODAY
                                    </span>
                                )}
                            </div>

                            {/* 3 Goal Boxes */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {[0, 1, 2].map((goalIndex) => {
                                    const uniqueKey = `${dateKey}_${goalIndex}`;
                                    const rawData = dailyHighlights?.[uniqueKey];
                                    const goalData = typeof rawData === 'string'
                                        ? { text: rawData, completed: false }
                                        : (rawData || null);

                                    return (
                                        <div
                                            key={uniqueKey}
                                            className={`relative group min-h-[60px] rounded-xl flex items-center justify-center transition-all 
                                                ${goalData
                                                    ? 'bg-white shadow-sm hover:shadow-md'
                                                    : 'border-2 border-dashed border-white/40 hover:bg-white/10 cursor-pointer'
                                                }
                                            `}
                                            onClick={() => {
                                                if (!goalData) {
                                                    const text = prompt(`Enter goal #${goalIndex + 1} for ${date.toLocaleDateString()}:`, '');
                                                    if (text !== null) {
                                                        onUpdateHighlight(uniqueKey, text, false);
                                                    }
                                                }
                                            }}
                                        >
                                            {goalData ? (
                                                <div className="w-full h-full flex items-center px-4 py-3 gap-3">
                                                    {/* Checkbox */}
                                                    <div
                                                        className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors
                                                            ${goalData.completed
                                                                ? 'bg-orange-400 border-orange-400 text-white'
                                                                : 'border-gray-300 text-transparent hover:border-orange-400'
                                                            }
                                                        `}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUpdateHighlight(uniqueKey, goalData.text, !goalData.completed);
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>

                                                    <p
                                                        className={`flex-1 text-sm font-medium text-gray-700 truncate cursor-pointer ${goalData.completed ? 'line-through text-gray-400' : ''}`}
                                                        onClick={() => {
                                                            const text = prompt(`Edit goal #${goalIndex + 1}:`, goalData.text);
                                                            if (text !== null) {
                                                                onUpdateHighlight(uniqueKey, text, goalData.completed);
                                                            }
                                                        }}
                                                    >
                                                        {goalData.text}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-white/70 font-medium text-sm">
                                                    <span>✨</span>
                                                    <span>Add Goal {goalIndex + 1}</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Masonry Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 auto-rows-min">
                {goals.map((goal) => (
                    <motion.div
                        key={goal.id}
                        layout
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <GoalCard
                            goal={goal}
                            onClick={() => handleCardClick(goal)}
                            onDelete={onDeleteGoal}
                        />
                    </motion.div>
                ))}

                {/* Add New Goal Button */}
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    onClick={handleAddNew}
                    className="min-h-[250px] rounded-2xl bg-white/50 dark:bg-void-900/50 border-2 border-dashed border-sage-300 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/80 dark:hover:bg-void-800 transition-colors shadow-sm group"
                >
                    <span className="text-6xl mb-3 group-hover:scale-110 transition-transform">✨</span>
                    <span className="text-lg font-bold text-sage-600 dark:text-sage-400">Add New Goal</span>
                    <span className="text-sm text-sage-500 dark:text-bone-200/50 mt-1">Dream big!</span>
                </motion.div>
            </div>

            {/* Empty State */}
            {goals.length === 0 && (
                <div className="text-center py-16">
                    <div className="text-6xl mb-4">🌟</div>
                    <h3 className="text-2xl font-bold text-sage-600 dark:text-sage-400 mb-2">
                        Start Your Journey
                    </h3>
                    <p className="text-sage-500 dark:text-bone-200/60 mb-6">
                        Create your first goal and visualize your dreams
                    </p>
                </div>
            )}

            {/* Goal Modal */}
            <GoalModal
                isOpen={showModal}
                onClose={() => {
                    setShowModal(false);
                    setEditingGoal(null);
                }}
                onSave={handleSave}
                goal={editingGoal}
            />
        </div>
    );
};

export default VisionBoard;
