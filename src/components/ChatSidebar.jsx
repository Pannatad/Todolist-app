import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Mic, MicOff, Trash2, Sparkles, MessageCircle, Zap, Lightbulb } from 'lucide-react';
import { useChatContext } from '../context/ChatContext';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import { getModelPreference, setModelPreference } from '../services/gemini';

const ChatSidebar = () => {
    const {
        isOpen,
        messages,
        isTyping,
        closeSidebar,
        sendMessage,
        confirmActions,
        cancelActions,
        clearConversation
    } = useChatContext();

    const [input, setInput] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const [modelMode, setModelMode] = useState(getModelPreference());
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);

    // Initialize speech recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition ||
            window.webkitSpeechRecognition ||
            window.mozSpeechRecognition ||
            window.msSpeechRecognition;

        if (SpeechRecognition) {
            setSpeechSupported(true);
            try {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'en-US';

                recognitionRef.current.onstart = () => setIsListening(true);
                recognitionRef.current.onresult = (event) => {
                    const transcript = Array.from(event.results)
                        .map(result => result[0].transcript)
                        .join('');
                    setInput(transcript);
                };
                recognitionRef.current.onend = () => setIsListening(false);
                recognitionRef.current.onerror = () => setIsListening(false);
            } catch (error) {
                console.error('Error initializing speech recognition:', error);
                setSpeechSupported(false);
            }
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) { }
            }
        };
    }, []);

    // Scroll to bottom when messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    // Focus input when sidebar opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && isOpen) {
                closeSidebar();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeSidebar]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || isTyping) return;
        sendMessage(input.trim());
        setInput('');
    };

    const toggleListening = async () => {
        if (!speechSupported || !recognitionRef.current) return;

        if (isListening) {
            recognitionRef.current.stop();
            setIsListening(false);
        } else {
            try {
                if (navigator.mediaDevices?.getUserMedia) {
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                }
                setInput('');
                recognitionRef.current.start();
            } catch (error) {
                console.error('Error starting recognition:', error);
                setIsListening(false);
            }
        }
    };

    const handleClearChat = () => {
        if (window.confirm('Clear all conversation history?')) {
            clearConversation();
        }
    };

    const handleModelToggle = () => {
        const newMode = modelMode === 'lite' ? 'flash' : 'lite';
        setModelMode(newMode);
        setModelPreference(newMode);
    };

    // Quick action suggestions
    const quickActions = [
        "What's on my schedule today?",
        "How many tasks do I have?",
        "Add a task",
        "Help me plan my day"
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeSidebar}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    />

                    {/* Sidebar Panel */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-full w-full sm:w-96 md:w-[420px] bg-gradient-to-b from-gray-50 to-white shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                                    <Sparkles size={18} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="font-bold text-gray-800">Chat with Agent</h2>
                                    <p className="text-xs text-gray-500">Your personal AI assistant</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Model Toggle Switch */}
                                <button
                                    onClick={handleModelToggle}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${modelMode === 'lite'
                                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                                        }`}
                                    title={modelMode === 'lite' ? 'Lite mode (cheaper, faster)' : 'Flash mode (smarter)'}
                                >
                                    {modelMode === 'lite' ? (
                                        <>
                                            <Lightbulb size={14} />
                                            Lite
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={14} />
                                            Flash
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleClearChat}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                                    title="Clear conversation"
                                >
                                    <Trash2 size={18} />
                                </button>
                                <button
                                    onClick={closeSidebar}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-4">
                                        <MessageCircle size={32} className="text-indigo-500" />
                                    </div>
                                    <h3 className="font-bold text-gray-800 mb-2">Start a conversation</h3>
                                    <p className="text-gray-500 text-sm mb-6">
                                        Ask me anything about your tasks, schedule, or let me help you plan your day.
                                    </p>

                                    {/* Quick action buttons */}
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {quickActions.map((action, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => sendMessage(action)}
                                                className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-colors"
                                            >
                                                {action}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {messages.map((message, idx) => (
                                        <ChatMessage
                                            key={message.id}
                                            message={message}
                                            onConfirm={confirmActions}
                                            onCancel={cancelActions}
                                            isLast={idx === messages.length - 1}
                                        />
                                    ))}
                                    {isTyping && <TypingIndicator />}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-gray-100 bg-white p-4">
                            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={isListening ? "🎤 Listening..." : "Type a message..."}
                                        disabled={isTyping}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-300 disabled:opacity-50 transition-all"
                                    />
                                </div>

                                {/* Voice button */}
                                {speechSupported && (
                                    <button
                                        type="button"
                                        onClick={toggleListening}
                                        disabled={isTyping}
                                        className={`p-3 rounded-xl transition-all ${isListening
                                            ? 'bg-red-500 text-white animate-pulse'
                                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                    >
                                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                    </button>
                                )}

                                {/* Send button */}
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl transition-all disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                            <p className="text-xs text-gray-400 text-center mt-2">
                                Press Enter to send • Escape to close
                            </p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

// Floating Chat Button Component
export const FloatingChatButton = () => {
    const { toggleSidebar, isOpen, messages } = useChatContext();
    const unreadCount = 0; // Could track unread messages if needed

    if (isOpen) return null;

    return (
        <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleSidebar}
            className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-white z-30 transition-shadow"
        >
            <MessageCircle size={24} />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
                    {unreadCount}
                </span>
            )}
        </motion.button>
    );
};

export default ChatSidebar;
