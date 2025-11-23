import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const GoalModal = ({ isOpen, onClose, onSave, goal = null }) => {
    const [formData, setFormData] = useState({
        title: goal?.title || '',
        emoji: goal?.emoji || '🎯',
        colorTheme: goal?.colorTheme || 'sage',
        motivation: goal?.motivation || '',
        deadline: goal?.deadline || ''
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.title.trim()) return;

        onSave({
            ...goal,
            ...formData,
            id: goal?.id || Date.now()
        });
        onClose();
    };

    const colorThemes = [
        { name: 'sage', label: 'Sage', color: '#84b59f' },
        { name: 'lavender', label: 'Lavender', color: '#a855f7' },
        { name: 'peach', label: 'Peach', color: '#fb923c' },
        { name: 'sky', label: 'Sky', color: '#38bdf8' },
        { name: 'mint', label: 'Mint', color: '#34d399' },
        { name: 'rose', label: 'Rose', color: '#fb7185' },
        { name: 'amber', label: 'Amber', color: '#fbbf24' },
        { name: 'purple', label: 'Purple', color: '#c084fc' }
    ];

    const popularEmojis = ['🎯', '💪', '🌟', '🚀', '💼', '📚', '🏆', '💰', '🏠', '✈️', '❤️', '🎨', '🎓', '⚡', '🌈', '🔥'];

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.9, y: 20 }}
                    className="bg-white dark:bg-void-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-sage-200 dark:border-white/10 max-h-[90vh] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-sage-800 dark:text-bone-200">
                            {goal ? 'Edit Goal' : 'Create New Goal'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-sage-100 dark:hover:bg-void-800 transition-colors"
                        >
                            <X className="w-5 h-5 text-sage-600 dark:text-sage-400" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Goal Title */}
                        <div>
                            <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-2">
                                Goal Title *
                            </label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                placeholder="What do you want to achieve?"
                                className="w-full px-4 py-3 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-xl text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400"
                                required
                            />
                        </div>

                        {/* Emoji Selector */}
                        <div>
                            <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-2">
                                Choose an Emoji
                            </label>
                            <div className="grid grid-cols-8 gap-2">
                                {popularEmojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, emoji })}
                                        className={`text-2xl p-2 rounded-lg hover:bg-sage-100 dark:hover:bg-void-800 transition-colors ${formData.emoji === emoji ? 'bg-sage-200 dark:bg-void-700 ring-2 ring-sage-400' : ''
                                            }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={formData.emoji}
                                onChange={(e) => setFormData({ ...formData, emoji: e.target.value })}
                                placeholder="Or type your own emoji"
                                className="w-full px-4 py-2 mt-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-200 text-center text-2xl"
                                maxLength={2}
                            />
                        </div>

                        {/* Color Theme */}
                        <div>
                            <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-2">
                                Color Theme
                            </label>
                            <div className="grid grid-cols-4 gap-3">
                                {colorThemes.map((theme) => (
                                    <button
                                        key={theme.name}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, colorTheme: theme.name })}
                                        className={`p-3 rounded-xl border-2 transition-all ${formData.colorTheme === theme.name
                                                ? 'border-sage-500 dark:border-sage-400 scale-105'
                                                : 'border-transparent hover:scale-105'
                                            }`}
                                        style={{ backgroundColor: theme.color + '40' }}
                                    >
                                        <div className="text-xs font-medium text-center" style={{ color: theme.color }}>
                                            {theme.label}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* My Motivation */}
                        <div>
                            <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-2">
                                My Motivation
                            </label>
                            <textarea
                                value={formData.motivation}
                                onChange={(e) => setFormData({ ...formData, motivation: e.target.value })}
                                placeholder="Why do you want to achieve this goal? What will it mean to you?"
                                className="w-full px-4 py-3 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-xl text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400 resize-none"
                                rows={4}
                            />
                        </div>

                        {/* Deadline */}
                        <div>
                            <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-2">
                                Target Date
                            </label>
                            <input
                                type="date"
                                value={formData.deadline}
                                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                                className="w-full px-4 py-3 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-xl text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-3 bg-sage-200 dark:bg-void-800 text-sage-700 dark:text-bone-300 rounded-xl font-bold hover:bg-sage-300 dark:hover:bg-void-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-3 bg-sage-500 hover:bg-sage-600 text-white rounded-xl font-bold transition-colors"
                            >
                                {goal ? 'Save Changes' : 'Create Goal'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default GoalModal;
