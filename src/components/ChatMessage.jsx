import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User, Check, X, Loader2, Clock, Sparkles } from 'lucide-react';

// Action type to display info
const ACTION_DISPLAY = {
    add_task: { icon: '📝', label: 'Add Task', color: 'bg-blue-50 border-blue-200' },
    edit_task: { icon: '✏️', label: 'Edit Task', color: 'bg-amber-50 border-amber-200' },
    delete_task: { icon: '🗑️', label: 'Delete Task', color: 'bg-red-50 border-red-200' },
    complete_task: { icon: '✅', label: 'Complete Task', color: 'bg-green-50 border-green-200' },
    add_schedule: { icon: '📅', label: 'Add Event', color: 'bg-purple-50 border-purple-200' },
    edit_schedule: { icon: '📅', label: 'Edit Event', color: 'bg-amber-50 border-amber-200' },
    delete_schedule: { icon: '🗑️', label: 'Delete Event', color: 'bg-red-50 border-red-200' },
    complete_habit: { icon: '🎯', label: 'Complete Habit', color: 'bg-green-50 border-green-200' },
    set_goal: { icon: '🌟', label: 'Set Goal', color: 'bg-yellow-50 border-yellow-200' },
    navigate: { icon: '🔗', label: 'Navigate', color: 'bg-gray-50 border-gray-200' },
    info_response: { icon: '💬', label: 'Info', color: 'bg-indigo-50 border-indigo-200' },
    clarify: { icon: '❓', label: 'Question', color: 'bg-orange-50 border-orange-200' }
};

const ActionCard = ({ action, showDetails = true }) => {
    const display = ACTION_DISPLAY[action.type] || { icon: '📋', label: action.type, color: 'bg-gray-50 border-gray-200' };

    return (
        <div className={`p-2 rounded-lg border ${display.color} text-sm`}>
            <div className="flex items-center gap-2 font-medium text-gray-700">
                <span>{display.icon}</span>
                <span>{display.label}</span>
            </div>
            {showDetails && action.params && (
                <div className="mt-1 text-gray-600 text-xs">
                    {action.params.title && <span>"{action.params.title}"</span>}
                    {action.params.message && <span>{action.params.message}</span>}
                </div>
            )}
        </div>
    );
};

const ChatMessage = ({
    message,
    onConfirm,
    onCancel,
    isLast = false
}) => {
    const isUser = message.role === 'user';
    const hasActions = message.actions && message.actions.length > 0;
    const hasPendingConfirmation = message.pendingConfirmation;
    const wasExecuted = message.actionsExecuted;
    const wasCancelled = message.actionsCancelled;

    // Format timestamp
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser
                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                    : 'bg-gradient-to-br from-emerald-400 to-teal-500'
                }`}>
                {isUser ? (
                    <User size={16} className="text-white" />
                ) : (
                    <Sparkles size={16} className="text-white" />
                )}
            </div>

            {/* Message Content */}
            <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Main bubble */}
                <div className={`px-4 py-2.5 rounded-2xl ${isUser
                        ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md'
                        : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm'
                    } ${message.isError ? 'border-red-200 bg-red-50' : ''}`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>

                {/* Action Cards (for assistant messages with actions) */}
                {!isUser && hasActions && (
                    <div className="mt-2 space-y-2 w-full">
                        {message.actions.filter(a => a.type !== 'info_response').map((action, idx) => (
                            <ActionCard key={idx} action={action} />
                        ))}

                        {/* Confirmation buttons */}
                        {hasPendingConfirmation && (
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => onConfirm?.(message.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
                                >
                                    <Check size={14} />
                                    Confirm
                                </button>
                                <button
                                    onClick={() => onCancel?.(message.id)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                                >
                                    <X size={14} />
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Executed indicator */}
                        {wasExecuted && (
                            <div className="flex items-center gap-1.5 text-emerald-600 text-xs mt-1">
                                <Check size={12} />
                                <span>Actions completed</span>
                            </div>
                        )}

                        {/* Cancelled indicator */}
                        {wasCancelled && (
                            <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-1">
                                <X size={12} />
                                <span>Cancelled</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Timestamp */}
                <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400`}>
                    <Clock size={10} />
                    <span>{formatTime(message.timestamp)}</span>
                </div>
            </div>
        </motion.div>
    );
};

// Typing indicator component
export const TypingIndicator = () => (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-3"
    >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
            <Sparkles size={16} className="text-white" />
        </div>
        <div className="px-4 py-3 bg-white border border-gray-100 rounded-2xl rounded-bl-md shadow-sm">
            <div className="flex gap-1">
                <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.1 }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                />
                <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                    className="w-2 h-2 bg-gray-400 rounded-full"
                />
            </div>
        </div>
    </motion.div>
);

export default ChatMessage;
