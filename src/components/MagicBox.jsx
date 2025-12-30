import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Loader2 } from 'lucide-react';

const EXAMPLE_PROMPTS = [
    "Add a task to finish my report by Friday",
    "Schedule a 1-hour focus block tomorrow at 9am",
    "What did I accomplish this week?",
    "Help me plan my morning routine",
    "Set my top 3 goals for today",
    "Create a study plan for my upcoming exam",
    "Block time for exercise this week",
];

const MagicBox = ({ onSubmit, isLoading = false }) => {
    const [input, setInput] = useState('');
    const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
    const inputRef = useRef(null);

    // Rotate example prompts every 3 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentExampleIndex((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        onSubmit(input.trim());
    };

    const handleExampleClick = () => {
        setInput(EXAMPLE_PROMPTS[currentExampleIndex]);
        inputRef.current?.focus();
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Main Search Bar */}
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow overflow-hidden">
                    {/* Gradient accent line at top */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>

                    <div className="flex items-center p-4 pt-5">
                        {/* Magic Icon */}
                        <div className="flex-shrink-0 mr-4">
                            <motion.div
                                animate={{
                                    rotate: isLoading ? 360 : 0,
                                    scale: isLoading ? [1, 1.1, 1] : 1
                                }}
                                transition={{
                                    rotate: { duration: 2, repeat: isLoading ? Infinity : 0, ease: "linear" },
                                    scale: { duration: 1, repeat: isLoading ? Infinity : 0 }
                                }}
                                className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md"
                            >
                                {isLoading ? (
                                    <Loader2 size={24} className="text-white animate-spin" />
                                ) : (
                                    <Sparkles size={24} className="text-white" />
                                )}
                            </motion.div>
                        </div>

                        {/* Input Field */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="What would you like to do today?"
                            disabled={isLoading}
                            className="flex-1 text-lg text-gray-900 placeholder-gray-400 bg-transparent border-none outline-none focus:ring-0 disabled:opacity-50"
                        />

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="flex-shrink-0 ml-4 p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl text-white transition-all hover:scale-105 active:scale-95 shadow-md"
                        >
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            </form>

            {/* Animated Example Prompts */}
            <div className="mt-4 text-center">
                <span className="text-gray-500 text-sm">Try: </span>
                <AnimatePresence mode="wait">
                    <motion.button
                        key={currentExampleIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        onClick={handleExampleClick}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium italic cursor-pointer hover:underline"
                    >
                        "{EXAMPLE_PROMPTS[currentExampleIndex]}"
                    </motion.button>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default MagicBox;
