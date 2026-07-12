import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Brain, Plus, X, Trash2, SparklesIcon, User, Heart, Clock, Edit2, Check, MessageSquare } from 'lucide-react';
import { useUserIntelligence, INTELLIGENCE_CATEGORIES } from '../context/UserIntelligenceContext';

const CATEGORY_CONFIG = {
    fact: {
        label: 'About Me',
        icon: User,
        color: 'indigo',
        placeholder: 'e.g., "I\'m a computer science student"'
    },
    preference: {
        label: 'Preferences',
        icon: Heart,
        color: 'pink',
        placeholder: 'e.g., "I prefer working in the morning"'
    },
    pattern: {
        label: 'Patterns',
        icon: Clock,
        color: 'amber',
        placeholder: 'e.g., "I usually exercise on weekdays"'
    },
    reminder: {
        label: 'Reminders',
        icon: MessageSquare,
        color: 'emerald',
        placeholder: 'e.g., "Always remind me to take breaks"'
    }
};

const TeachAgentModal = ({ isOpen, onClose }) => {
    const { intelligence, learnFact, updateIntelligence, deleteIntelligence, isLoading } = useUserIntelligence();

    const [newContent, setNewContent] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('fact');
    const [editingId, setEditingId] = useState(null);
    const [editContent, setEditContent] = useState('');
    const [isAdding, setIsAdding] = useState(false);

    // Group intelligence by category
    const groupedIntelligence = {
        fact: intelligence.filter(i => i.category === 'fact'),
        preference: intelligence.filter(i => i.category === 'preference'),
        pattern: intelligence.filter(i => i.category === 'pattern'),
        reminder: intelligence.filter(i => i.category === 'reminder')
    };

    const handleAdd = async () => {
        if (!newContent.trim()) return;

        setIsAdding(true);
        try {
            await learnFact(newContent.trim(), selectedCategory, 'explicit', 1.0);
            setNewContent('');
        } catch (error) {
            console.error('Error adding:', error);
        } finally {
            setIsAdding(false);
        }
    };

    const handleStartEdit = (item) => {
        setEditingId(item.id);
        setEditContent(item.content);
    };

    const handleSaveEdit = async (id) => {
        if (!editContent.trim()) return;
        await updateIntelligence(id, { content: editContent.trim() });
        setEditingId(null);
        setEditContent('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditContent('');
    };

    const handleDelete = async (id) => {
        await deleteIntelligence(id);
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <Motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <Motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl z-50 max-h-[85vh] overflow-hidden"
                    >
                        <div className="bg-white dark:bg-void-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-100 dark:border-void-700 flex flex-col max-h-[85vh]">
                            {/* Header */}
                            <div className="p-6 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 shrink-0">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                                            <Brain size={28} className="text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white">Teach Your Agent</h2>
                                            <p className="text-white/80 text-sm mt-1">
                                                Help me understand you better
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                                    >
                                        <X size={20} className="text-white" />
                                    </button>
                                </div>
                            </div>

                            {/* Add New Section */}
                            <div className="p-4 bg-gray-50 dark:bg-void-800 border-b border-gray-200 dark:border-void-700 shrink-0">
                                {/* Category Selector */}
                                <div className="flex gap-2 mb-3 flex-wrap">
                                    {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                                        const Icon = config.icon;
                                        return (
                                            <button
                                                key={key}
                                                onClick={() => setSelectedCategory(key)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${selectedCategory === key
                                                        ? `bg-${config.color}-100 text-${config.color}-700 dark:bg-${config.color}-900/30 dark:text-${config.color}-300 ring-2 ring-${config.color}-500`
                                                        : 'bg-white dark:bg-void-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-void-600'
                                                    }`}
                                            >
                                                <Icon size={14} />
                                                {config.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Input */}
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newContent}
                                        onChange={(e) => setNewContent(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                                        placeholder={CATEGORY_CONFIG[selectedCategory].placeholder}
                                        className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-void-600 rounded-xl text-gray-900 dark:text-white bg-white dark:bg-void-700 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                    <button
                                        onClick={handleAdd}
                                        disabled={!newContent.trim() || isAdding}
                                        className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 dark:disabled:bg-void-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Plus size={18} />
                                        Add
                                    </button>
                                </div>
                            </div>

                            {/* Content List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                                {isLoading ? (
                                    <div className="flex justify-center py-8">
                                        <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full"></div>
                                    </div>
                                ) : intelligence.length === 0 ? (
                                    <div className="text-center py-12">
                                        <SparklesIcon className="w-16 h-16 mx-auto text-gray-300 dark:text-void-600 mb-4" />
                                        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-300 mb-2">
                                            No learned information yet
                                        </h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            Add some facts about yourself, or just chat with the agent!
                                        </p>
                                    </div>
                                ) : (
                                    Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
                                        const items = groupedIntelligence[category];
                                        if (items.length === 0) return null;

                                        const Icon = config.icon;
                                        return (
                                            <div key={category}>
                                                <h3 className={`flex items-center gap-2 text-sm font-semibold text-${config.color}-600 dark:text-${config.color}-400 mb-2`}>
                                                    <Icon size={16} />
                                                    {config.label}
                                                    <span className="text-xs font-normal text-gray-400">({items.length})</span>
                                                </h3>
                                                <div className="space-y-2">
                                                    {items.map(item => (
                                                        <Motion.div
                                                            key={item.id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className={`flex items-start gap-3 p-3 rounded-xl bg-${config.color}-50 dark:bg-${config.color}-900/10 border border-${config.color}-100 dark:border-${config.color}-800/30`}
                                                        >
                                                            {editingId === item.id ? (
                                                                <>
                                                                    <input
                                                                        type="text"
                                                                        value={editContent}
                                                                        onChange={(e) => setEditContent(e.target.value)}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter') handleSaveEdit(item.id);
                                                                            if (e.key === 'Escape') handleCancelEdit();
                                                                        }}
                                                                        className="flex-1 px-3 py-1.5 border rounded-lg text-sm bg-white dark:bg-void-700 dark:text-white border-gray-200 dark:border-void-600"
                                                                        autoFocus
                                                                    />
                                                                    <button
                                                                        onClick={() => handleSaveEdit(item.id)}
                                                                        className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                                                                    >
                                                                        <Check size={16} />
                                                                    </button>
                                                                    <button
                                                                        onClick={handleCancelEdit}
                                                                        className="p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-void-700 rounded-lg"
                                                                    >
                                                                        <X size={16} />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="flex-1">
                                                                        <p className="text-sm text-gray-800 dark:text-gray-200">{item.content}</p>
                                                                        {item.source === 'inferred' && (
                                                                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                                                                                Learned from conversation
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleStartEdit(item)}
                                                                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-white/50 dark:hover:bg-void-700 rounded-lg transition-colors"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleDelete(item.id)}
                                                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </Motion.div>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 bg-gray-50 dark:bg-void-800 border-t border-gray-200 dark:border-void-700 shrink-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {intelligence.length} item{intelligence.length !== 1 ? 's' : ''} learned
                                    </p>
                                    <button
                                        onClick={onClose}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    </Motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default TeachAgentModal;
