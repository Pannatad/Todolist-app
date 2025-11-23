import React, { useState } from 'react';
import { motion } from 'framer-motion';
import GoalCard from './GoalCard';
import GoalModal from './GoalModal';

const VisionBoard = ({ goals, onAddGoal, onUpdateGoal, onDeleteGoal }) => {
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
