import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Loader2, Mic, MicOff } from 'lucide-react';
import { useChatContext } from '../context/ChatContext';

const EXAMPLE_PROMPTS = [
    "Add a task to finish my report by Friday",
    "Schedule a 1-hour focus block tomorrow at 9am",
    "What did I accomplish this week?",
    "Help me plan my morning routine",
    "Set my top 3 goals for today",
    "How many tasks do I have left?",
    "Block time for exercise this week",
];

const MagicBox = ({ onSubmit, isLoading: externalLoading = false }) => {
    const { sendMessage, openSidebar, isTyping } = useChatContext();
    const isLoading = externalLoading || isTyping;
    const [input, setInput] = useState('');
    const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(false);
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);

    // Initialize speech recognition with mobile support
    useEffect(() => {
        // Check for speech recognition support (works on Chrome, Edge, Safari 14.1+)
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
                recognitionRef.current.maxAlternatives = 1;

                recognitionRef.current.onstart = () => {
                    console.log('🎤 Speech recognition started');
                    setIsListening(true);
                };

                recognitionRef.current.onresult = (event) => {
                    const transcript = Array.from(event.results)
                        .map(result => result[0].transcript)
                        .join('');
                    setInput(transcript);
                };

                recognitionRef.current.onend = () => {
                    console.log('🎤 Speech recognition ended');
                    setIsListening(false);
                };

                recognitionRef.current.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);

                    // Handle specific errors
                    if (event.error === 'not-allowed') {
                        alert('Microphone access denied. Please allow microphone access in your browser settings.');
                    } else if (event.error === 'no-speech') {
                        // Silent fail for no speech detected
                    } else if (event.error === 'network') {
                        alert('Network error. Speech recognition requires an internet connection.');
                    }
                };
            } catch (error) {
                console.error('Error initializing speech recognition:', error);
                setSpeechSupported(false);
            }
        } else {
            console.log('Speech recognition not supported in this browser');
            setSpeechSupported(false);
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch (e) {
                    // Ignore errors during cleanup
                }
            }
        };
    }, []);

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

        // Send message to chat conversation
        sendMessage(input.trim());

        // Open the chat sidebar to show the conversation
        openSidebar();

        // Also call the original onSubmit if provided (for backward compatibility)
        if (onSubmit) {
            onSubmit(input.trim());
        }

        setInput('');
    };

    const handleExampleClick = () => {
        setInput(EXAMPLE_PROMPTS[currentExampleIndex]);
        inputRef.current?.focus();
    };

    const toggleListening = async () => {
        if (!speechSupported || !recognitionRef.current) {
            alert('Speech recognition is not supported in your browser. Try using Chrome, Edge, or Safari 14.1+.');
            return;
        }

        if (isListening) {
            try {
                recognitionRef.current.stop();
            } catch (e) {
                console.error('Error stopping recognition:', e);
            }
            setIsListening(false);
        } else {
            // Request microphone permission explicitly for mobile
            try {
                // Check if we need to request permission first
                if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                    await navigator.mediaDevices.getUserMedia({ audio: true });
                }

                setInput('');
                recognitionRef.current.start();
            } catch (error) {
                console.error('Error starting recognition:', error);
                if (error.name === 'NotAllowedError') {
                    alert('Microphone access was denied. Please allow microphone access and try again.');
                } else {
                    alert('Could not start voice input. Please check your microphone settings.');
                }
                setIsListening(false);
            }
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            {/* Main Search Bar */}
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow overflow-hidden">
                    {/* Gradient accent line at top */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${isListening
                        ? 'bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 animate-pulse'
                        : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500'}`}></div>

                    <div className="flex items-center p-4 pt-5">
                        {/* Magic Icon */}
                        <div className="flex-shrink-0 mr-3 sm:mr-4">
                            <motion.div
                                animate={{
                                    rotate: isLoading ? 360 : 0,
                                    scale: isLoading ? [1, 1.1, 1] : 1
                                }}
                                transition={{
                                    rotate: { duration: 2, repeat: isLoading ? Infinity : 0, ease: "linear" },
                                    scale: { duration: 1, repeat: isLoading ? Infinity : 0 }
                                }}
                                className="p-2 sm:p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-md"
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="text-white animate-spin sm:w-6 sm:h-6" />
                                ) : (
                                    <Sparkles size={20} className="text-white sm:w-6 sm:h-6" />
                                )}
                            </motion.div>
                        </div>

                        {/* Input Field */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "🎤 Listening..." : "What would you like to do today?"}
                            disabled={isLoading}
                            className="flex-1 text-base sm:text-lg text-gray-900 placeholder-gray-400 bg-transparent border-none outline-none focus:ring-0 disabled:opacity-50 min-w-0"
                        />

                        {/* Voice Input Button - Only show if supported */}
                        {speechSupported && (
                            <button
                                type="button"
                                onClick={toggleListening}
                                disabled={isLoading}
                                className={`flex-shrink-0 ml-2 p-2 sm:p-3 rounded-xl transition-all hover:scale-105 active:scale-95 touch-manipulation ${isListening
                                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                    }`}
                                title={isListening ? "Stop listening" : "Voice input"}
                                aria-label={isListening ? "Stop listening" : "Start voice input"}
                            >
                                {isListening ? <MicOff size={18} className="sm:w-5 sm:h-5" /> : <Mic size={18} className="sm:w-5 sm:h-5" />}
                            </button>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="flex-shrink-0 ml-2 p-2 sm:p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-xl text-white transition-all hover:scale-105 active:scale-95 shadow-md touch-manipulation"
                            aria-label="Send"
                        >
                            <Send size={18} className="sm:w-5 sm:h-5" />
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
