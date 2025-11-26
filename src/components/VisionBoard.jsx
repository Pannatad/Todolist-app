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

    // Colors for the week - User liked these!
    const dayColors = [
        {
            bg: 'bg-rose-50 dark:bg-rose-900/20',
            border: 'border-rose-200 dark:border-rose-800',
            text: 'text-rose-800 dark:text-rose-200',
            boxBg: 'bg-rose-100 dark:bg-rose-900/40',
            boxBorder: 'border-rose-300 dark:border-rose-700',
            ring: 'ring-rose-400'
        },
        {
            bg: 'bg-orange-50 dark:bg-orange-900/20',
            border: 'border-orange-200 dark:border-orange-800',
            text: 'text-orange-800 dark:text-orange-200',
            boxBg: 'bg-orange-100 dark:bg-orange-900/40',
            boxBorder: 'border-orange-300 dark:border-orange-700',
            ring: 'ring-orange-400'
        },
        {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            border: 'border-amber-200 dark:border-amber-800',
            text: 'text-amber-800 dark:text-amber-200',
            boxBg: 'bg-amber-100 dark:bg-amber-900/40',
            boxBorder: 'border-amber-300 dark:border-amber-700',
            ring: 'ring-amber-400'
        },
        {
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            border: 'border-emerald-200 dark:border-emerald-800',
            text: 'text-emerald-800 dark:text-emerald-200',
            boxBg: 'bg-emerald-100 dark:bg-emerald-900/40',
            boxBorder: 'border-emerald-300 dark:border-emerald-700',
            ring: 'ring-emerald-400'
        },
        {
            bg: 'bg-teal-50 dark:bg-teal-900/20',
            border: 'border-teal-200 dark:border-teal-800',
            text: 'text-teal-800 dark:text-teal-200',
            boxBg: 'bg-teal-100 dark:bg-teal-900/40',
            boxBorder: 'border-teal-300 dark:border-teal-700',
            ring: 'ring-teal-400'
        },
        {
            bg: 'bg-cyan-50 dark:bg-cyan-900/20',
            border: 'border-cyan-200 dark:border-cyan-800',
            text: 'text-cyan-800 dark:text-cyan-200',
            boxBg: 'bg-cyan-100 dark:bg-cyan-900/40',
            boxBorder: 'border-cyan-300 dark:border-cyan-700',
            ring: 'ring-cyan-400'
        },
        {
            bg: 'bg-indigo-50 dark:bg-indigo-900/20',
            border: 'border-indigo-200 dark:border-indigo-800',
            text: 'text-indigo-800 dark:text-indigo-200',
            boxBg: 'bg-indigo-100 dark:bg-indigo-900/40',
            boxBorder: 'border-indigo-300 dark:border-indigo-700',
            ring: 'ring-indigo-400'
        },
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
            <div className="mb-12 space-y-6">
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
                    const colorTheme = dayColors[dayIndex % dayColors.length];

                    return (
                        <div
                            key={dateKey}
                            className={`rounded-2xl p-6 border-2 transition-all ${colorTheme.bg} ${colorTheme.border} ${isToday ? `ring-2 ring-offset-2 ${colorTheme.ring}` : ''}`}
                        >
                            {/* Date Header */}
                            <div className="mb-4 flex items-center gap-3">
                                <h4 className={`text-lg font-bold px-3 py-1 rounded-lg border shadow-sm inline-block bg-white/80 dark:bg-void-900/80 ${colorTheme.text} ${colorTheme.border}`}>
                                    {date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: '2-digit' })}
                                </h4>
                                {isToday && (
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full bg-white/50 dark:bg-black/20 ${colorTheme.text}`}>
                                        Today
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
                                            className={`relative group min-h-[80px] rounded-xl border-2 p-4 flex flex-col items-center justify-center transition-all hover:scale-[1.02] hover:shadow-md ${colorTheme.boxBg} ${colorTheme.boxBorder} ${goalData?.completed ? 'opacity-60' : ''}`}
                                        >
                                            {goalData ? (
                                                <div className="w-full h-full flex flex-col items-center justify-center relative">
                                                    {/* Checkbox - Top Right */}
                                                    <div
                                                        className={`absolute -top-2 -right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center cursor-pointer transition-colors z-10 ${goalData.completed ? 'bg-emerald-500 border-emerald-500 text-white' : `bg-white dark:bg-void-800 ${colorTheme.border} text-transparent hover:border-emerald-400`}`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onUpdateHighlight(uniqueKey, goalData.text, !goalData.completed);
                                                        }}
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                        </svg>
                                                    </div>

                                                    <p
                                                        className={`text-center font-bold text-lg leading-tight ${colorTheme.text} ${goalData.completed ? 'line-through decoration-2 opacity-70' : ''} cursor-pointer`}
                                                        onClick={() => {
                                                            const text = prompt(`Edit goal #${goalIndex + 1} for ${date.toLocaleDateString()}:`, goalData.text);
                                                            if (text !== null) {
                                                                onUpdateHighlight(uniqueKey, text, goalData.completed);
                                                            }
                                                        }}
                                                    >
                                                        {goalData.text}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div
                                                    className={`flex items-center gap-2 opacity-60 group-hover:opacity-100 transition-opacity ${colorTheme.text} cursor-pointer w-full h-full justify-center`}
                                                    onClick={() => {
                                                        const text = prompt(`Enter goal #${goalIndex + 1} for ${date.toLocaleDateString()}:`, '');
                                                        if (text !== null) {
                                                            onUpdateHighlight(uniqueKey, text, false);
                                                        }
                                                    }}
                                                >
                                                    <span className="text-lg">✨</span>
                                                    <span className="font-bold">Add Goal {goalIndex + 1}</span>
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
