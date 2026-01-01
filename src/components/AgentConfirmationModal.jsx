import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Check, X, Edit2, Loader2, ListTodo, Calendar, Target, Navigation, BarChart3, MessageCircle, Send, Lightbulb, Info, ArrowRight } from 'lucide-react';
import RichTextRenderer from './RichTextRenderer';

// Icon mapping for different action types
const ACTION_ICONS = {
    add_task: ListTodo,
    add_schedule: Calendar,
    set_goal: Target,
    navigate: Navigation,
    analyze: BarChart3,
    info_response: Info,
    clarify: MessageCircle,
};

const ACTION_COLORS = {
    add_task: 'text-blue-600 bg-blue-50',
    add_schedule: 'text-purple-600 bg-purple-50',
    set_goal: 'text-amber-600 bg-amber-50',
    navigate: 'text-teal-600 bg-teal-50',
    analyze: 'text-rose-600 bg-rose-50',
    info_response: 'text-sky-600 bg-sky-50',
    clarify: 'text-indigo-600 bg-indigo-50',
};

const AgentConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    onClarifyResponse,
    onEditPrompt,
    onNavigate,
    actionPlan,
    isExecuting = false,
    originalPrompt = ''
}) => {
    const [clarifyInput, setClarifyInput] = useState('');
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [editedPrompt, setEditedPrompt] = useState('');

    // Initialize edited prompt when modal opens
    useEffect(() => {
        if (isOpen && originalPrompt) {
            setEditedPrompt(originalPrompt);
            setIsEditingPrompt(false);
        }
    }, [isOpen, originalPrompt]);

    if (!isOpen || !actionPlan) return null;

    const { actions = [], summary = '' } = actionPlan;

    // Check special modes
    const clarifyAction = actions.find(a => a.type === 'clarify');
    const isClarifyMode = !!clarifyAction;

    const infoAction = actions.find(a => a.type === 'info_response');
    const isInfoMode = !!infoAction && actions.length === 1;

    const handleClarifySubmit = () => {
        if (!clarifyInput.trim() || !onClarifyResponse) return;
        onClarifyResponse(clarifyInput.trim());
        setClarifyInput('');
    };

    const handleSuggestionClick = (suggestion) => {
        if (!onClarifyResponse) return;
        onClarifyResponse(suggestion);
    };

    const handleEditPromptSubmit = () => {
        if (!editedPrompt.trim() || !onEditPrompt) return;
        onEditPrompt(editedPrompt.trim());
        setIsEditingPrompt(false);
    };

    const handleNavigateToTab = (tabName) => {
        if (onNavigate) {
            onNavigate(tabName);
        }
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50"
                    >
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                            {/* Header */}
                            <div className={`p-6 ${isClarifyMode
                                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500'
                                : isInfoMode
                                    ? 'bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500'
                                    : isEditingPrompt
                                        ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500'
                                        : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'}`}
                            >
                                <div className="flex items-center gap-4">
                                    <motion.div
                                        animate={{ rotate: isExecuting ? 360 : 0 }}
                                        transition={{ duration: 2, repeat: isExecuting ? Infinity : 0, ease: "linear" }}
                                        className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm"
                                    >
                                        {isExecuting ? (
                                            <Loader2 size={28} className="text-white animate-spin" />
                                        ) : isClarifyMode ? (
                                            <MessageCircle size={28} className="text-white" />
                                        ) : isInfoMode ? (
                                            <Info size={28} className="text-white" />
                                        ) : isEditingPrompt ? (
                                            <Edit2 size={28} className="text-white" />
                                        ) : (
                                            <Bot size={28} className="text-white" />
                                        )}
                                    </motion.div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">
                                            {isExecuting ? "Executing..."
                                                : isClarifyMode ? "I need more info:"
                                                    : isInfoMode ? "Here's what I found:"
                                                        : isEditingPrompt ? "Edit your command:"
                                                            : "Here's what I'll do:"}
                                        </h2>
                                        <p className="text-white/80 text-sm mt-1">
                                            {isEditingPrompt ? "Modify your request and submit" : summary}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Content Area */}
                            <div className="p-6 max-h-[50vh] overflow-y-auto">
                                {isEditingPrompt ? (
                                    /* Prompt Editing Mode */
                                    <div className="space-y-4">
                                        <textarea
                                            value={editedPrompt}
                                            onChange={(e) => setEditedPrompt(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                                            rows={4}
                                            placeholder="Type your command..."
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                onClick={() => setIsEditingPrompt(false)}
                                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleEditPromptSubmit}
                                                disabled={!editedPrompt.trim()}
                                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl font-medium transition-colors"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Send size={16} /> Submit
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                ) : isClarifyMode ? (
                                    /* Clarify Mode: Show question and input */
                                    <div className="space-y-4">
                                        <p className="text-gray-700 text-lg font-medium">
                                            {clarifyAction.params?.question || "Could you please provide more details?"}
                                        </p>

                                        {/* Suggestions */}
                                        {clarifyAction.params?.suggestions?.length > 0 && (
                                            <div className="space-y-2">
                                                <p className="text-gray-500 text-sm flex items-center gap-2">
                                                    <Lightbulb size={14} /> Based on your history:
                                                </p>
                                                <div className="flex flex-wrap gap-2">
                                                    {clarifyAction.params.suggestions.map((suggestion, i) => (
                                                        <button
                                                            key={i}
                                                            onClick={() => handleSuggestionClick(suggestion)}
                                                            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-medium transition-colors"
                                                        >
                                                            {suggestion}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Input Field */}
                                        <div className="flex gap-2 mt-4">
                                            <input
                                                type="text"
                                                value={clarifyInput}
                                                onChange={(e) => setClarifyInput(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleClarifySubmit()}
                                                placeholder="Type your response..."
                                                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                            <button
                                                onClick={handleClarifySubmit}
                                                disabled={!clarifyInput.trim()}
                                                className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-xl transition-colors"
                                            >
                                                <Send size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ) : isInfoMode ? (
                                    /* Info Response Mode: Show answer with rich formatting */
                                    <div className="space-y-4">
                                        <div className="p-4 bg-gradient-to-br from-gray-50 to-sky-50/50 rounded-2xl border border-sky-100/50">
                                            <RichTextRenderer text={infoAction.params?.message || "Here's the information you requested."} />
                                        </div>

                                        {/* Optional: Navigate to tab for more details */}
                                        {infoAction.params?.suggestedTab && (
                                            <button
                                                onClick={() => handleNavigateToTab(infoAction.params.suggestedTab)}
                                                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                                            >
                                                <span>View more in {infoAction.params.suggestedTab.charAt(0).toUpperCase() + infoAction.params.suggestedTab.slice(1)}</span>
                                                <ArrowRight size={16} />
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    /* Normal Mode: Show actions list */
                                    <div className="space-y-3">
                                        {actions.map((action, index) => {
                                            const Icon = ACTION_ICONS[action.type] || ListTodo;
                                            const colorClass = ACTION_COLORS[action.type] || 'text-gray-600 bg-gray-50';

                                            return (
                                                <motion.div
                                                    key={index}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.1 }}
                                                    className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-colors"
                                                >
                                                    <div className={`p-2 rounded-xl ${colorClass}`}>
                                                        <Icon size={20} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-semibold text-gray-900 text-sm">
                                                            {action.explanation || action.type}
                                                        </p>
                                                        {(action.params?.title || action.params?.tabName || action.params?.goalText || action.params?.message) && (
                                                            <p className="text-gray-500 text-xs mt-1 truncate">
                                                                {action.params.title || action.params.tabName || action.params.goalText || action.params.message?.slice(0, 50)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                                            <Check size={12} className="text-green-600" />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="p-6 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                                <button
                                    onClick={onClose}
                                    disabled={isExecuting}
                                    className="px-5 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl font-medium transition-colors disabled:opacity-50"
                                >
                                    <span className="flex items-center gap-2">
                                        <X size={16} /> {isInfoMode ? 'Close' : 'Cancel'}
                                    </span>
                                </button>

                                {!isClarifyMode && !isEditingPrompt && (
                                    <div className="flex items-center gap-3">
                                        {/* Edit Prompt Button */}
                                        {onEditPrompt && !isInfoMode && (
                                            <button
                                                onClick={() => setIsEditingPrompt(true)}
                                                disabled={isExecuting}
                                                className="px-5 py-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl font-medium transition-colors disabled:opacity-50"
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Edit2 size={16} /> Edit
                                                </span>
                                            </button>
                                        )}

                                        {/* Confirm Button (not shown for info-only responses) */}
                                        {!isInfoMode && (
                                            <button
                                                onClick={() => onConfirm()}
                                                disabled={isExecuting}
                                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 shadow-md hover:shadow-lg"
                                            >
                                                {isExecuting ? (
                                                    <span className="flex items-center gap-2">
                                                        <Loader2 size={16} className="animate-spin" /> Working...
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-2">
                                                        <Check size={16} /> Confirm
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AgentConfirmationModal;
