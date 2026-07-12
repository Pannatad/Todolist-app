import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatContext } from '../context/ChatContext';
import { confirmAction } from '../utils/confirm';
import ChatSidebarPanel from './ChatSidebarPanel';
import {
    buildInitialGuideAnswers,
    buildTomorrowPlannerPrompt,
    createPlannerState,
    isTomorrowPlanningRequest,
    TOMORROW_PLANNER_STEPS,
} from './chatSidebarUtils';

const ChatSidebar = () => {
    const {
        isOpen,
        messages,
        isTyping,
        closeSidebar,
        sendMessage,
        confirmActions,
        cancelActions,
        clearConversation,
        selectedAIProvider,
        setSelectedAIProvider,
        aiProviderOptions
    } = useChatContext();

    const [input, setInput] = useState('');
    const [activeGuide, setActiveGuide] = useState(null);
    const [guideAnswers, setGuideAnswers] = useState({});
    const [tomorrowPlanner, setTomorrowPlanner] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [speechSupported] = useState(() => {
        if (typeof window === 'undefined') return false;
        return Boolean(
            window.SpeechRecognition ||
            window.webkitSpeechRecognition ||
            window.mozSpeechRecognition ||
            window.msSpeechRecognition
        );
    });
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
                recognitionRef.current = null;
            }
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.stop();
                } catch {
                    recognitionRef.current = null;
                }
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
        if (isTomorrowPlanningRequest(input)) {
            setTomorrowPlanner(createPlannerState({ context: input.trim() }));
            setActiveGuide(null);
            setInput('');
            return;
        }
        sendMessage(input.trim());
        setInput('');
    };

    const openGuide = (mode) => {
        if (mode.id === 'plan') {
            setTomorrowPlanner(createPlannerState());
            setActiveGuide(null);
            return;
        }
        setActiveGuide(mode);
        setTomorrowPlanner(null);
        setGuideAnswers(buildInitialGuideAnswers(mode));
    };

    const updateGuideAnswer = (fieldId, value) => {
        setGuideAnswers((current) => ({ ...current, [fieldId]: value }));
    };

    const submitGuide = () => {
        if (!activeGuide || isTyping) return;
        if (activeGuide.id === 'plan' && guideAnswers.horizon === 'Tomorrow') {
            setTomorrowPlanner(createPlannerState({
                theme: guideAnswers.priority,
                context: guideAnswers.notes
            }));
            setActiveGuide(null);
            setGuideAnswers({});
            return;
        }
        const prompt = activeGuide.prompt(guideAnswers);
        sendMessage(prompt);
        setActiveGuide(null);
        setGuideAnswers({});
    };

    const updatePlannerAnswer = (stepId, value) => {
        setTomorrowPlanner((current) => {
            if (!current) return current;
            return {
                ...current,
                answers: {
                    ...current.answers,
                    [stepId]: value
                }
            };
        });
    };

    const applyPlannerChip = (stepId, value) => {
        setTomorrowPlanner((current) => {
            if (!current) return current;
            const existing = current.answers[stepId]?.trim();
            return {
                ...current,
                answers: {
                    ...current.answers,
                    [stepId]: existing ? `${existing}; ${value}` : value
                }
            };
        });
    };

    const movePlannerStep = (direction) => {
        setTomorrowPlanner((current) => {
            if (!current) return current;
            const nextIndex = Math.min(
                Math.max(current.stepIndex + direction, 0),
                TOMORROW_PLANNER_STEPS.length - 1
            );
            return { ...current, stepIndex: nextIndex };
        });
    };

    const sendTomorrowPlan = () => {
        if (!tomorrowPlanner || isTyping) return;
        sendMessage(buildTomorrowPlannerPrompt(tomorrowPlanner.answers));
        setTomorrowPlanner(null);
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
        if (confirmAction('Clear all conversation history?')) {
            clearConversation();
        }
    };

    return (
        <ChatSidebarPanel
            activeGuide={activeGuide}
            aiProviderOptions={aiProviderOptions}
            applyPlannerChip={applyPlannerChip}
            cancelActions={cancelActions}
            closeSidebar={closeSidebar}
            confirmActions={confirmActions}
            guideAnswers={guideAnswers}
            handleClearChat={handleClearChat}
            handleSubmit={handleSubmit}
            input={input}
            inputRef={inputRef}
            isListening={isListening}
            isOpen={isOpen}
            isTyping={isTyping}
            messages={messages}
            messagesEndRef={messagesEndRef}
            movePlannerStep={movePlannerStep}
            openGuide={openGuide}
            selectedAIProvider={selectedAIProvider}
            sendMessage={sendMessage}
            sendTomorrowPlan={sendTomorrowPlan}
            setActiveGuide={setActiveGuide}
            setInput={setInput}
            setSelectedAIProvider={setSelectedAIProvider}
            setTomorrowPlanner={setTomorrowPlanner}
            speechSupported={speechSupported}
            submitGuide={submitGuide}
            tomorrowPlanner={tomorrowPlanner}
            toggleListening={toggleListening}
            updateGuideAnswer={updateGuideAnswer}
            updatePlannerAnswer={updatePlannerAnswer}
        />
    );
};

// Floating Chat Button Component
export const FloatingChatButton = () => {
    const { toggleSidebar, isOpen } = useChatContext();
    const unreadCount = 0; // Could track unread messages if needed

    if (isOpen) return null;

    return (
        <button
            onClick={toggleSidebar}
            className="fixed bottom-6 right-6 w-14 h-14 bg-slate-900 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center text-white z-30 transition-shadow"
            title="Open agent"
        >
            <MessageCircle size={24} />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs font-bold flex items-center justify-center">
                    {unreadCount}
                </span>
            )}
        </button>
    );
};

export default ChatSidebar;
