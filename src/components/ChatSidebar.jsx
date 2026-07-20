import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { useChatContext } from '../context/ChatContext';
import { confirmAction } from '../utils/confirm';
import ChatSidebarPanel from './ChatSidebarPanel';
import { getAIHealth } from '../services/generativeClient';
import { prepareChatAttachment } from '../services/chatAttachments';
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
        stopMessage,
        confirmActions,
        cancelActions,
        clearConversation,
        selectedAIProvider,
        setSelectedAIProvider,
        localThinkingEnabled,
        setLocalThinkingEnabled,
        aiProviderOptions
    } = useChatContext();

    const [input, setInput] = useState('');
    const [activeGuide, setActiveGuide] = useState(null);
    const [guideAnswers, setGuideAnswers] = useState({});
    const [tomorrowPlanner, setTomorrowPlanner] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [localAIStatus, setLocalAIStatus] = useState({ status: 'checking', message: 'Checking LM Studio…' });
    const [attachment, setAttachment] = useState(null);
    const [attachmentError, setAttachmentError] = useState('');
    const [isPreparingAttachment, setIsPreparingAttachment] = useState(false);
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
    const fileInputRef = useRef(null);

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

    useEffect(() => {
        if (!isOpen || selectedAIProvider !== 'local') return undefined;

        let cancelled = false;
        getAIHealth('lmstudio').then((health) => {
            if (!cancelled) setLocalAIStatus(health);
        });

        return () => {
            cancelled = true;
        };
    }, [isOpen, selectedAIProvider]);

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
        if ((!input.trim() && !attachment) || isTyping || isPreparingAttachment) return;
        if (!attachment && isTomorrowPlanningRequest(input)) {
            setTomorrowPlanner(createPlannerState({ context: input.trim() }));
            setActiveGuide(null);
            setInput('');
            return;
        }
        const prompt = input.trim() || (attachment?.kind === 'pdf'
            ? 'Summarize this PDF and identify the most important points.'
            : 'Describe this image and explain what is important.');
        sendMessage(prompt, attachment);
        setInput('');
        setAttachment(null);
        setAttachmentError('');
    };

    const handleAttachmentChange = async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        setAttachmentError('');
        setIsPreparingAttachment(true);
        try {
            setAttachment(await prepareChatAttachment(file));
        } catch (error) {
            setAttachment(null);
            setAttachmentError(error.message || 'Could not prepare this attachment.');
        } finally {
            setIsPreparingAttachment(false);
        }
    };

    const removeAttachment = () => {
        setAttachment(null);
        setAttachmentError('');
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
            attachment={attachment}
            attachmentError={attachmentError}
            fileInputRef={fileInputRef}
            handleAttachmentChange={handleAttachmentChange}
            handleClearChat={handleClearChat}
            handleSubmit={handleSubmit}
            input={input}
            inputRef={inputRef}
            isListening={isListening}
            isOpen={isOpen}
            isPreparingAttachment={isPreparingAttachment}
            isTyping={isTyping}
            localAIStatus={localAIStatus}
            localThinkingEnabled={localThinkingEnabled}
            messages={messages}
            messagesEndRef={messagesEndRef}
            movePlannerStep={movePlannerStep}
            openGuide={openGuide}
            removeAttachment={removeAttachment}
            selectedAIProvider={selectedAIProvider}
            sendMessage={sendMessage}
            stopMessage={stopMessage}
            sendTomorrowPlan={sendTomorrowPlan}
            setActiveGuide={setActiveGuide}
            setInput={setInput}
            setLocalThinkingEnabled={setLocalThinkingEnabled}
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
            className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition-shadow hover:shadow-xl sm:bottom-6 sm:right-6 sm:h-14 sm:w-14"
            title="Open agent"
            aria-label="Open agent"
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
