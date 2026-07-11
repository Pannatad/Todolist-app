import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    X,
    Send,
    Mic,
    MicOff,
    Trash2,
    Sparkles,
    MessageCircle,
    CalendarClock,
    ListChecks,
    Timer,
    Target,
    RefreshCw
} from 'lucide-react';
import { useChatContext } from '../context/ChatContext';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import { confirmAction } from '../utils/confirm';

const GUIDE_MODES = [
    {
        id: 'plan',
        label: 'Plan',
        icon: CalendarClock,
        title: 'Build a plan',
        fields: [
            { id: 'horizon', label: 'Plan for', options: ['Rest of today', 'Tomorrow', 'This week'] },
            { id: 'priority', label: 'Optimize for', options: ['Finish urgent work', 'Balanced day', 'Deep focus'] },
            { id: 'detail', label: 'Output', options: ['Short plan', 'Time blocks', 'Tasks + schedule'] }
        ],
        prompt: ({ horizon, priority, detail, notes }) => `Help me plan ${horizon}. Optimize for ${priority}. Output as ${detail}. ${notes ? `Extra context: ${notes}.` : ''} If one important detail is missing, ask me one focused follow-up question before finalizing.`
    },
    {
        id: 'prioritize',
        label: 'Prioritize',
        icon: ListChecks,
        title: 'Choose what matters',
        fields: [
            { id: 'scope', label: 'Scope', options: ['Today only', 'Next 48 hours', 'All active tasks'] },
            { id: 'energy', label: 'Energy', options: ['Low', 'Normal', 'High'] },
            { id: 'detail', label: 'Output', options: ['Top 3 only', 'Ranked list', 'Next action plan'] }
        ],
        prompt: ({ scope, energy, detail, notes }) => `Prioritize my tasks for ${scope}. Assume my energy is ${energy}. Output: ${detail}. ${notes ? `Extra context: ${notes}.` : ''} Explain tradeoffs briefly and give one recommended next action.`
    },
    {
        id: 'slots',
        label: 'Free slots',
        icon: Timer,
        title: 'Use open time',
        fields: [
            { id: 'duration', label: 'Slot size', options: ['25 min', '45 min', '90 min'] },
            { id: 'workType', label: 'Best for', options: ['Quick wins', 'Deep work', 'Recovery'] },
            { id: 'detail', label: 'Output', options: ['Best slot', 'All slots', 'Schedule proposal'] }
        ],
        prompt: ({ duration, workType, detail, notes }) => `Find free time slots today. Prefer ${duration} blocks for ${workType}. Output: ${detail}. ${notes ? `Extra context: ${notes}.` : ''} Avoid schedule conflicts and suggest what to do in the best slot.`
    },
    {
        id: 'habits',
        label: 'Habits',
        icon: Target,
        title: 'Recover habits',
        fields: [
            { id: 'effort', label: 'Effort', options: ['Tiny version', 'Normal effort', 'Push today'] },
            { id: 'tone', label: 'Tone', options: ['Gentle', 'Direct', 'Coach me'] },
            { id: 'detail', label: 'Output', options: ['One habit', 'Habit order', 'Habit + schedule'] }
        ],
        prompt: ({ effort, tone, detail, notes }) => `Help me recover my unfinished habits today. Use ${effort}. Tone: ${tone}. Output: ${detail}. ${notes ? `Extra context: ${notes}.` : ''} Make it realistic and not guilt-heavy.`
    },
    {
        id: 'review',
        label: 'Review',
        icon: RefreshCw,
        title: 'Review the day',
        fields: [
            { id: 'focus', label: 'Check for', options: ['Overload', 'Conflicts', 'Missed priorities'] },
            { id: 'depth', label: 'Depth', options: ['Fast scan', 'Detailed', 'Fix it'] },
            { id: 'detail', label: 'Output', options: ['Risks only', 'Fix list', 'Revised plan'] }
        ],
        prompt: ({ focus, depth, detail, notes }) => `Review my day for ${focus}. Depth: ${depth}. Output: ${detail}. ${notes ? `Extra context: ${notes}.` : ''} If there is a conflict or overload, propose the smallest useful fix.`
    }
];

const buildInitialGuideAnswers = (mode) => {
    const answers = {};
    mode.fields.forEach((field) => {
        answers[field.id] = field.options[0];
    });
    answers.notes = '';
    return answers;
};

const TOMORROW_PLANNER_STEPS = [
    {
        id: 'theme',
        label: 'Theme',
        title: '1. What should tomorrow feel like?',
        helper: 'Pick the flow before picking exact times.',
        placeholder: 'Example: calm study day, errands first then deep work, recovery day...',
        chips: ['Deep focus', 'Balanced reset', 'Catch-up day', 'Light recovery', 'Errands first']
    },
    {
        id: 'context',
        label: 'Mind',
        title: '2. What is already in your head?',
        helper: 'Tasks, appointments, constraints, worries, must-dos. Messy is fine.',
        placeholder: 'Example: class at 10, finish essay, gym, call parents, low energy...',
        chips: ['Fixed appointments', 'Urgent task', 'Low energy', 'Need exercise', 'Avoid late night']
    },
    {
        id: 'morning',
        label: 'Morning',
        title: '3. Shape the morning',
        helper: 'What kind of morning would make the rest easier?',
        placeholder: 'Example: wake slow, breakfast, review notes, first focus block...',
        chips: ['Slow start', 'Hardest task first', 'Exercise first', 'Admin first', 'Class prep']
    },
    {
        id: 'afternoon',
        label: 'Afternoon',
        title: '4. Shape the afternoon',
        helper: 'This is usually where the plan needs realism and buffers.',
        placeholder: 'Example: deep work after lunch, errands, study block, meeting buffer...',
        chips: ['Deep work', 'Errands', 'Study block', 'Break buffer', 'Social/meeting']
    },
    {
        id: 'evening',
        label: 'Evening',
        title: '5. Shape the evening',
        helper: 'Choose between finishing, recovery, or setup for the next day.',
        placeholder: 'Example: gym, light review, dinner, clean room, prepare tomorrow...',
        chips: ['Wind down', 'Exercise', 'Light work', 'House reset', 'Prep tomorrow']
    },
    {
        id: 'night',
        label: 'Night',
        title: '6. Shape the night',
        helper: 'Protect sleep and decide what should not happen late.',
        placeholder: 'Example: no heavy work after 9, journal, screen off, sleep by 11...',
        chips: ['Early sleep', 'No heavy work', 'Journal', 'Plan next day', 'Flexible']
    },
    {
        id: 'review',
        label: 'Review',
        title: '7. Review before drafting',
        helper: 'Send this to the agent only when the shape feels close enough.',
        placeholder: '',
        chips: []
    }
];

const createPlannerState = (seed = {}) => ({
    stepIndex: 0,
    answers: {
        theme: seed.theme || '',
        context: seed.context || '',
        morning: '',
        afternoon: '',
        evening: '',
        night: ''
    }
});

const plannerSummaryLines = (answers) => (
    TOMORROW_PLANNER_STEPS
        .filter(step => step.id !== 'review')
        .map(step => `${step.label}: ${answers[step.id]?.trim() || 'Not specified'}`)
);

const buildTomorrowPlannerPrompt = (answers) => `We are slowly crafting my plan for tomorrow. Do not jump to a rigid final schedule.

Use this draft shape:
${plannerSummaryLines(answers).map(line => `- ${line}`).join('\n')}

Please respond in this structure:
Recommendation: give a compact tomorrow flow divided into Morning, Afternoon, Evening, Night.
Why: explain 2-3 tradeoffs you used.
Next step: ask me which single section I want to refine first.

Rules:
- Keep it specific to what I wrote.
- Keep buffers and recovery realistic.
- Do not create tasks or schedule events yet unless I explicitly confirm.`;

const isTomorrowPlanningRequest = (text) => {
    const lower = text.toLowerCase();
    return /\b(plan|schedule|craft|organize)\b/.test(lower) && /\btomorrow\b/.test(lower);
};

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
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={closeSidebar}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                    />

                    {/* Sidebar Panel */}
                    <div
                        className="fixed right-0 top-0 h-full w-full sm:w-[440px] md:w-[500px] bg-slate-50 shadow-2xl z-50 flex flex-col"
                    >
                        {/* Header */}
                        <div className="border-b border-slate-200 bg-white">
                            <div className="flex items-center justify-between px-4 py-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-900 rounded-lg">
                                        <Sparkles size={18} className="text-white" />
                                    </div>
                                    <div>
                                        <h2 className="font-semibold text-slate-900">Agent</h2>
                                        <p className="text-xs text-slate-500">Plan, decide, and act</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
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
                                        title="Close"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <div className="px-4 pb-3">
                                <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-1">
                                    <div className="grid grid-cols-2 gap-1">
                                        {aiProviderOptions.map((option) => {
                                            const isSelected = selectedAIProvider === option.id;
                                            return (
                                                <button
                                                    key={option.id}
                                                    type="button"
                                                    onClick={() => setSelectedAIProvider(option.id)}
                                                    disabled={isTyping}
                                                    className={`rounded-lg px-3 py-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isSelected
                                                        ? 'bg-slate-900 text-white shadow-sm'
                                                        : 'text-slate-600 hover:bg-white hover:text-slate-900'
                                                        }`}
                                                    title={option.description}
                                                >
                                                    <div className="text-xs font-semibold uppercase tracking-wide">{option.label}</div>
                                                    <div className={`mt-0.5 truncate text-[11px] ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                                                        {option.id === 'local' ? 'Local via LM Studio' : 'Cloud default'}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="grid grid-cols-5 gap-1.5">
                                    {GUIDE_MODES.map((command) => {
                                        const Icon = command.icon;
                                        const isActive = activeGuide?.id === command.id;
                                        return (
                                            <button
                                                key={command.label}
                                                type="button"
                                                onClick={() => openGuide(command)}
                                                disabled={isTyping}
                                                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${isActive
                                                    ? 'border-slate-900 bg-slate-900 text-white'
                                                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100'
                                                    }`}
                                                title={command.title}
                                            >
                                                <Icon size={16} />
                                                <span className="leading-none">{command.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {activeGuide && (
                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                    <div className="mb-3 flex items-center justify-between gap-3">
                                        <div>
                                            <h3 className="text-sm font-semibold text-slate-900">{activeGuide.title}</h3>
                                            <p className="text-xs text-slate-500">Answer a few knobs, then I’ll ask the agent.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setActiveGuide(null)}
                                            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            title="Close guide"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {activeGuide.fields.map((field) => (
                                            <div key={field.id}>
                                                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">{field.label}</div>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {field.options.map((option) => (
                                                        <button
                                                            key={option}
                                                            type="button"
                                                            onClick={() => updateGuideAnswer(field.id, option)}
                                                            className={`rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors ${guideAnswers[field.id] === option
                                                                ? 'border-slate-900 bg-slate-900 text-white'
                                                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                                                                }`}
                                                        >
                                                            {option}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}

                                        <textarea
                                            value={guideAnswers.notes || ''}
                                            onChange={(event) => updateGuideAnswer('notes', event.target.value)}
                                            placeholder="Optional: constraints, mood, deadline, what feels hard..."
                                            rows={2}
                                            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                                        />

                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={submitGuide}
                                                disabled={isTyping}
                                                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                            >
                                                Ask agent
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setInput(activeGuide.prompt(guideAnswers));
                                                    setActiveGuide(null);
                                                }}
                                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                                            >
                                                Edit first
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tomorrowPlanner && (
                            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                                    {(() => {
                                        const step = TOMORROW_PLANNER_STEPS[tomorrowPlanner.stepIndex];
                                        const isReview = step.id === 'review';
                                        const progress = `${tomorrowPlanner.stepIndex + 1}/${TOMORROW_PLANNER_STEPS.length}`;

                                        return (
                                            <>
                                                <div className="mb-3 flex items-start justify-between gap-3">
                                                    <div>
                                                        <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Tomorrow planner {progress}</div>
                                                        <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                                                        <p className="mt-0.5 text-xs text-slate-500">{step.helper}</p>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setTomorrowPlanner(null)}
                                                        className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                                        title="Close planner"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>

                                                <div className="mb-3 grid grid-cols-7 gap-1">
                                                    {TOMORROW_PLANNER_STEPS.map((item, index) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => setTomorrowPlanner((current) => current ? { ...current, stepIndex: index } : current)}
                                                            className={`h-1.5 rounded-full transition-colors ${index <= tomorrowPlanner.stepIndex ? 'bg-slate-900' : 'bg-slate-200'}`}
                                                            title={item.title}
                                                        />
                                                    ))}
                                                </div>

                                                {!isReview ? (
                                                    <div className="space-y-3">
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {step.chips.map((chip) => (
                                                                <button
                                                                    key={chip}
                                                                    type="button"
                                                                    onClick={() => applyPlannerChip(step.id, chip)}
                                                                    className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                                                                >
                                                                    {chip}
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <textarea
                                                            value={tomorrowPlanner.answers[step.id] || ''}
                                                            onChange={(event) => updatePlannerAnswer(step.id, event.target.value)}
                                                            placeholder={step.placeholder}
                                                            rows={3}
                                                            className="w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {plannerSummaryLines(tomorrowPlanner.answers).map((line) => (
                                                            <div key={line} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                                                {line}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="mt-3 flex items-center justify-between gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => movePlannerStep(-1)}
                                                        disabled={tomorrowPlanner.stepIndex === 0}
                                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                                    >
                                                        Back
                                                    </button>

                                                    <div className="flex items-center gap-2">
                                                        {!isReview && (
                                                            <button
                                                                type="button"
                                                                onClick={() => movePlannerStep(1)}
                                                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                                                            >
                                                                {tomorrowPlanner.answers[step.id]?.trim() ? 'Next' : 'Skip'}
                                                            </button>
                                                        )}
                                                        {isReview ? (
                                                            <button
                                                                type="button"
                                                                onClick={sendTomorrowPlan}
                                                                disabled={isTyping}
                                                                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                                            >
                                                                Draft with agent
                                                            </button>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={() => setTomorrowPlanner((current) => current ? { ...current, stepIndex: TOMORROW_PLANNER_STEPS.length - 1 } : current)}
                                                                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                                                            >
                                                                Review
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                    <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                        <MessageCircle size={32} className="text-slate-700" />
                                    </div>
                                    <h3 className="font-semibold text-slate-900 mb-2">What should we decide?</h3>
                                    <p className="text-slate-500 text-sm mb-6 max-w-sm">
                                        Use a command above for a focused answer, or ask naturally. Short, actionable requests work best.
                                    </p>

                                    {/* Quick action buttons */}
                                    <div className="grid w-full max-w-sm grid-cols-1 gap-2">
                                        {[
                                            'What is the single best task to do next?',
                                            'Create a realistic focus block for today',
                                            'What is overloaded or conflicting today?'
                                        ].map((action) => (
                                            <button
                                                key={action}
                                                onClick={() => sendMessage(action)}
                                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-100"
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
                                            onSendMessage={sendMessage}
                                            isLast={idx === messages.length - 1}
                                        />
                                    ))}
                                    {isTyping && <TypingIndicator />}
                                    <div ref={messagesEndRef} />
                                </>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="border-t border-slate-200 bg-white p-4">
                            <form onSubmit={handleSubmit} className="flex items-center gap-2">
                                <div className="flex-1 relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={isListening ? "Listening..." : "Ask for a decision or action..."}
                                        disabled={isTyping}
                                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 placeholder-slate-400 transition-all focus:border-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-200 disabled:opacity-50"
                                    />
                                </div>

                                {/* Voice button */}
                                {speechSupported && (
                                    <button
                                        type="button"
                                        onClick={toggleListening}
                                        disabled={isTyping}
                                        className={`p-3 rounded-lg transition-all ${isListening
                                            ? 'bg-red-500 text-white animate-pulse'
                                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                            }`}
                                        title={isListening ? 'Stop dictation' : 'Start dictation'}
                                    >
                                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                    </button>
                                )}

                                {/* Send button */}
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="rounded-lg bg-slate-900 p-3 text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    title="Send"
                                >
                                    <Send size={20} />
                                </button>
                            </form>
                            <p className="text-xs text-slate-400 text-center mt-2">
                                Press Enter to send • Escape to close
                            </p>
                        </div>
                    </div>
                </>
            )}
        </AnimatePresence>
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
