import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, Loader2, Mic, MicOff } from 'lucide-react';
import { useChatContext } from '../context/ChatContext';
import { useTask } from '../context/TaskContext';
import { useHabit } from '../context/HabitContext';
import { useUserIntelligence } from '../context/UserIntelligenceContext';
import { useGoal } from '../context/GoalContext';
import { isTaskActive } from '../utils/taskState';
import { toLocalDateKey } from '../utils/scheduleOccurrences';
import { toast } from '../ui/Toast';
import { log } from '../utils/log.js';

// Fallback prompts if no personalized data
const FALLBACK_PROMPTS = [
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
    const { tasks, scheduleItems } = useTask();
    const { habits } = useHabit();
    const { intelligence } = useUserIntelligence();
    const { goals } = useGoal();
    const isLoading = externalLoading || isTyping;
    const [input, setInput] = useState('');
    const [currentExampleIndex, setCurrentExampleIndex] = useState(0);
    const [isListening, setIsListening] = useState(false);
    const [speechSupported, setSpeechSupported] = useState(() => {
        const SpeechRecognition = window.SpeechRecognition ||
            window.webkitSpeechRecognition ||
            window.mozSpeechRecognition ||
            window.msSpeechRecognition;
        return Boolean(SpeechRecognition);
    });
    const inputRef = useRef(null);
    const recognitionRef = useRef(null);

    // Generate personalized suggestions based on user data
    const personalizedPrompts = useMemo(() => {
        const suggestions = [];
        const todayStr = toLocalDateKey(new Date());
        const now = new Date();

        // 1. Incomplete habits for today
        const incompleteHabits = (habits || []).filter(h => {
            const completedDates = h.completedDates || [];
            return !completedDates.includes(todayStr);
        });
        if (incompleteHabits.length > 0) {
            const habit = incompleteHabits[0];
            suggestions.push(`Complete my habit: ${habit.name}`);
            if (incompleteHabits.length > 1) {
                suggestions.push(`Log my ${incompleteHabits.length} incomplete habits for today`);
            }
        }

        // 2. Tasks due soon (within 2 days)
        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        const tasksDueSoon = (tasks || []).filter(t => {
            if (!isTaskActive(t) || !t.deadline) return false;
            const deadline = new Date(t.deadline);
            return deadline >= now && deadline <= twoDaysFromNow;
        });
        if (tasksDueSoon.length > 0) {
            const task = tasksDueSoon[0];
            suggestions.push(`Help me finish "${task.title}"`);
            if (tasksDueSoon.length > 1) {
                suggestions.push(`Show my ${tasksDueSoon.length} tasks due soon`);
            }
        }

        // 3. Today's schedule
        const todayEvents = (scheduleItems || []).filter(e => {
            const timeValue = e.startTime || e.start_time;
            if (!timeValue) return false;
            const eventDate = new Date(timeValue);
            return eventDate.toDateString() === now.toDateString() && eventDate > now;
        });
        if (todayEvents.length > 0) {
            suggestions.push("What's on my schedule today?");
        } else {
            suggestions.push("Schedule a focus block for today");
        }

        // 4. Learned intelligence/preferences
        if (intelligence && intelligence.length > 0) {
            const randomFact = intelligence[0];
            if (randomFact?.category === 'schedule' || randomFact?.category === 'routine') {
                suggestions.push("Help me optimize my daily routine");
            }
            if (randomFact?.category === 'preferences') {
                suggestions.push("What do you know about my preferences?");
            }
        }

        // 5. Goals
        if (goals && goals.length > 0) {
            suggestions.push("Update on my goals progress");
        }

        // 6. Generic productive suggestions
        suggestions.push("Block time for exercise this week");
        suggestions.push("Plan my priorities for tomorrow");

        // Return personalized prompts or fallback
        return suggestions.length > 3 ? suggestions : [...suggestions, ...FALLBACK_PROMPTS];
    }, [habits, tasks, scheduleItems, intelligence, goals]);

    // Initialize speech recognition with mobile support
    useEffect(() => {
        // Check for speech recognition support (works on Chrome, Edge, Safari 14.1+)
        const SpeechRecognition = window.SpeechRecognition ||
            window.webkitSpeechRecognition ||
            window.mozSpeechRecognition ||
            window.msSpeechRecognition;

        if (SpeechRecognition) {
            try {
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = false;
                recognitionRef.current.interimResults = true;
                recognitionRef.current.lang = 'en-US';
                recognitionRef.current.maxAlternatives = 1;

                recognitionRef.current.onstart = () => {
                    log('🎤 Speech recognition started');
                    setIsListening(true);
                };

                recognitionRef.current.onresult = (event) => {
                    const transcript = Array.from(event.results)
                        .map(result => result[0].transcript)
                        .join('');
                    setInput(transcript);
                };

                recognitionRef.current.onend = () => {
                    log('🎤 Speech recognition ended');
                    setIsListening(false);
                };

                recognitionRef.current.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    setIsListening(false);

                    // Handle specific errors
                    if (event.error === 'not-allowed') {
                        toast('Microphone access denied. Allow microphone access in your browser settings.', { tone: 'error' });
                    } else if (event.error === 'no-speech') {
                        // Silent fail for no speech detected
                    } else if (event.error === 'network') {
                        toast('Speech recognition requires an internet connection.', { tone: 'error' });
                    }
                };
            } catch (error) {
                console.error('Error initializing speech recognition:', error);
                setTimeout(() => setSpeechSupported(false), 0);
            }
        } else {
            log('Speech recognition not supported in this browser');
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {
                    // Ignore errors during cleanup
                }
            }
        };
    }, []);

    // Rotate personalized prompts every 4 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentExampleIndex((prev) => (prev + 1) % personalizedPrompts.length);
        }, 4000);
        return () => clearInterval(interval);
    }, [personalizedPrompts.length]);

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
        setInput(personalizedPrompts[currentExampleIndex] || '');
        inputRef.current?.focus();
    };

    const toggleListening = async () => {
        if (!speechSupported || !recognitionRef.current) {
            toast('Speech recognition is not supported in your browser.', { tone: 'error' });
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
                    toast('Microphone access was denied. Allow microphone access and try again.', { tone: 'error' });
                } else {
                    toast('Could not start voice input. Check your microphone settings.', { tone: 'error' });
                }
                setIsListening(false);
            }
        }
    };

    return (
        <div className="mx-auto w-full max-w-2xl min-w-0">
            {/* Main Search Bar */}
            <form onSubmit={handleSubmit} className="relative">
                <div className="relative min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
                    {/* Gradient accent line at top */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${isListening
                        ? 'bg-red-500 animate-pulse'
                        : 'bg-indigo-500'}`}></div>

                    <div className="flex min-w-0 items-center p-2.5 pt-4 sm:p-3 sm:pt-4">
                        {/* Magic Icon */}
                        <div className="mr-2 flex-shrink-0 sm:mr-4">
                            <Motion.div
                                animate={{
                                    rotate: isLoading ? 360 : 0,
                                    scale: isLoading ? [1, 1.1, 1] : 1
                                }}
                                transition={{
                                    rotate: { duration: 2, repeat: isLoading ? Infinity : 0, ease: "linear" },
                                    scale: { duration: 1, repeat: isLoading ? Infinity : 0 }
                                }}
                                className="rounded-xl bg-indigo-600 p-2 shadow-sm"
                            >
                                {isLoading ? (
                                    <Loader2 size={20} className="animate-spin text-white" />
                                ) : (
                                    <Sparkles size={20} className="text-white" />
                                )}
                            </Motion.div>
                        </div>

                        {/* Input Field */}
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "Listening..." : "Ask your agent..."}
                            disabled={isLoading}
                            className="min-w-0 flex-1 border-none bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0 disabled:opacity-50 sm:text-base"
                        />

                        {/* Voice Input Button - Only show if supported */}
                        {speechSupported && (
                            <button
                                type="button"
                                onClick={toggleListening}
                                disabled={isLoading}
                                className={`ml-1.5 flex-shrink-0 touch-manipulation rounded-xl p-2 transition-colors active:scale-95 sm:ml-2 sm:p-2.5 ${isListening
                                    ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                    }`}
                                title={isListening ? "Stop listening" : "Voice input"}
                                aria-label={isListening ? "Stop listening" : "Start voice input"}
                            >
                                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                            </button>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="ml-1.5 flex-shrink-0 touch-manipulation rounded-xl bg-indigo-600 p-2 text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 sm:ml-2 sm:p-2.5"
                            aria-label="Send"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </form>

            {/* Animated Personalized Suggestions */}
            <div className="mt-2 min-w-0 text-center">
                <span className="text-sm text-gray-500">Try: </span>
                <AnimatePresence mode="wait">
                    <Motion.button
                        key={currentExampleIndex}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                        onClick={handleExampleClick}
                        className="max-w-full cursor-pointer break-words text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
                    >
                        "{personalizedPrompts[currentExampleIndex] || FALLBACK_PROMPTS[0]}"
                    </Motion.button>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default MagicBox;
