import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
    CalendarPlus,
    CheckSquare,
    MessageCircle,
    FileText,
    Image as ImageIcon,
    LoaderCircle,
    Mic,
    MicOff,
    Paperclip,
    Send,
    Sparkles,
    Square,
    Trash2,
    X,
} from 'lucide-react';
import ChatMessage, { TypingIndicator } from './ChatMessage';
import { GUIDE_MODES, plannerSummaryLines, TOMORROW_PLANNER_STEPS } from './chatSidebarUtils';
import { useTask } from '../context/TaskContext';
import { toLocalDateKey } from '../utils/scheduleOccurrences';
import { toast } from '../ui/Toast';

const nextRoundHour = () => {
    const date = new Date();
    date.setMinutes(0, 0, 0);
    date.setHours(date.getHours() + 1);
    return `${String(date.getHours()).padStart(2, '0')}:00`;
};

const addMinutes = (hhmm, minutes) => {
    const [hours, mins] = hhmm.split(':').map(Number);
    const total = Math.min(23 * 60 + 59, hours * 60 + mins + minutes);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const timeInputClass = 'rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-sm text-slate-900 focus:border-slate-400 focus:bg-white focus:outline-none';

/**
 * Structured quick-add: pick times/dates, type a title, send — the item is
 * created directly (no model round-trip). Lives above the chat input.
 */
const useQuickAdd = ({ input, setInput }) => {
    const { addScheduleItem, addTask } = useTask();
    const [mode, setMode] = useState(null); // null | 'event' | 'task'
    const [date, setDate] = useState(() => toLocalDateKey(new Date()));
    const [startTime, setStartTime] = useState(nextRoundHour);
    const [endTime, setEndTime] = useState(() => addMinutes(nextRoundHour(), 90));
    const [taskTime, setTaskTime] = useState('18:00');
    const [isSaving, setIsSaving] = useState(false);

    const toggleMode = (nextMode) => setMode((current) => (current === nextMode ? null : nextMode));

    const submit = async () => {
        const title = input.trim();
        if (!title || isSaving) return;
        setIsSaving(true);
        try {
            if (mode === 'event') {
                const start = new Date(`${date}T${startTime}`);
                let duration = Math.round((new Date(`${date}T${endTime}`) - start) / 60000);
                if (!Number.isFinite(duration) || duration <= 0) duration = 60;
                await addScheduleItem({ title, startTime: start.toISOString(), duration, category: 'Other' });
                toast(`Added “${title}” · ${startTime}–${endTime}`);
            } else {
                await addTask({ title, difficulty: 'easy', deadline: `${date}T${taskTime || '23:59'}` });
                toast(`Task “${title}” due ${date} ${taskTime}`);
            }
            setInput('');
        } catch (error) {
            toast(error?.message || 'Could not save.', { tone: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    return { mode, toggleMode, date, setDate, startTime, setStartTime, endTime, setEndTime, taskTime, setTaskTime, submit, isSaving };
};

const ChatSidebarPanel = ({
    activeGuide,
    attachment,
    attachmentError,
    aiProviderOptions,
    applyPlannerChip,
    cancelActions,
    closeSidebar,
    confirmActions,
    guideAnswers,
    fileInputRef,
    handleAttachmentChange,
    handleClearChat,
    handleSubmit,
    input,
    inputRef,
    isListening,
    isOpen,
    isPreparingAttachment,
    isTyping,
    localAIStatus,
    localThinkingEnabled,
    messages,
    messagesEndRef,
    movePlannerStep,
    openGuide,
    removeAttachment,
    selectedAIProvider,
    sendMessage,
    stopMessage,
    sendTomorrowPlan,
    setActiveGuide,
    setInput,
    setLocalThinkingEnabled,
    setSelectedAIProvider,
    setTomorrowPlanner,
    speechSupported,
    submitGuide,
    tomorrowPlanner,
    toggleListening,
    updateGuideAnswer,
    updatePlannerAnswer,
}) => {
    const quickAdd = useQuickAdd({ input, setInput });

    const onComposerSubmit = (event) => {
        if (quickAdd.mode) {
            event.preventDefault();
            quickAdd.submit();
        } else {
            handleSubmit(event);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={closeSidebar}
                        className="fixed inset-0 z-[400] bg-black/20 backdrop-blur-sm"
                    />

                    {/* Sidebar Panel */}
                    <div
                        className="fixed right-0 top-0 z-[410] flex h-dvh w-full flex-col bg-slate-50 shadow-2xl sm:w-[440px] md:w-[500px]"
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
                                {selectedAIProvider === 'local' && (
                                    <div className="mb-3 space-y-2">
                                        <div
                                            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs ${localAIStatus.status === 'ready'
                                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                : localAIStatus.status === 'checking'
                                                    ? 'border-slate-200 bg-white text-slate-500'
                                                    : 'border-amber-200 bg-amber-50 text-amber-800'
                                                }`}
                                            role="status"
                                        >
                                            <span
                                                className={`h-2 w-2 shrink-0 rounded-full ${localAIStatus.status === 'ready'
                                                    ? 'bg-emerald-500'
                                                    : localAIStatus.status === 'checking'
                                                        ? 'animate-pulse bg-slate-400'
                                                        : 'bg-amber-500'
                                                    }`}
                                            />
                                            <span className="truncate">
                                                {localAIStatus.status === 'ready'
                                                    ? `Ready · ${localAIStatus.model}`
                                                    : localAIStatus.message || 'Open LM Studio and start its local server.'}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                            <div className="min-w-0">
                                                <div className="text-xs font-semibold text-slate-700">Thinking mode</div>
                                                <div className="text-[11px] text-slate-400">
                                                    {localThinkingEnabled ? 'Enabled · slower, deeper response' : 'Disabled · faster response'}
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                role="switch"
                                                aria-checked={localThinkingEnabled}
                                                aria-label="Thinking mode"
                                                onClick={() => setLocalThinkingEnabled(!localThinkingEnabled)}
                                                disabled={isTyping}
                                                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${localThinkingEnabled ? 'bg-slate-900' : 'bg-slate-300'}`}
                                            >
                                                <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${localThinkingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                            </button>
                                        </div>
                                    </div>
                                )}
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
                        <div className="border-t border-slate-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                            {/* Quick-add mode chips */}
                            <div className="mb-2 flex items-center gap-1.5">
                                {[
                                    { id: 'event', label: 'Event', icon: CalendarPlus },
                                    { id: 'task', label: 'Task', icon: CheckSquare },
                                ].map((chip) => {
                                    const ChipIcon = chip.icon;
                                    const { id, label } = chip;
                                    return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => quickAdd.toggleMode(id)}
                                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${quickAdd.mode === id
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                                            }`}
                                        title={id === 'event' ? 'Add a schedule block directly' : 'Add a task directly'}
                                    >
                                        <ChipIcon size={13} />
                                        {label}
                                    </button>
                                    );
                                })}
                                {quickAdd.mode && (
                                    <span className="text-xs text-slate-400">added instantly, no agent</span>
                                )}
                            </div>

                            {/* Structured fields for the active quick-add mode */}
                            {quickAdd.mode === 'event' && (
                                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                    <input type="date" value={quickAdd.date} onChange={(e) => quickAdd.setDate(e.target.value)} className={timeInputClass} aria-label="Event date" />
                                    <input type="time" value={quickAdd.startTime} onChange={(e) => { quickAdd.setStartTime(e.target.value); quickAdd.setEndTime(addMinutes(e.target.value, 90)); }} className={timeInputClass} aria-label="Start time" />
                                    <span className="text-sm text-slate-400">–</span>
                                    <input type="time" value={quickAdd.endTime} onChange={(e) => quickAdd.setEndTime(e.target.value)} className={timeInputClass} aria-label="End time" />
                                </div>
                            )}
                            {quickAdd.mode === 'task' && (
                                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                                    <span className="text-xs font-medium text-slate-400">Due</span>
                                    <input type="date" value={quickAdd.date} onChange={(e) => quickAdd.setDate(e.target.value)} className={timeInputClass} aria-label="Due date" />
                                    <input type="time" value={quickAdd.taskTime} onChange={(e) => quickAdd.setTaskTime(e.target.value)} className={timeInputClass} aria-label="Due time" />
                                </div>
                            )}

                            {/* Attachments only apply to normal agent messages, not quick-add */}
                            {!quickAdd.mode && (attachment || isPreparingAttachment) && (
                                <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                                    <div className="flex min-w-0 items-center gap-2">
                                        {isPreparingAttachment ? (
                                            <LoaderCircle size={16} className="shrink-0 animate-spin" />
                                        ) : attachment.kind === 'pdf' ? (
                                            <FileText size={16} className="shrink-0" />
                                        ) : (
                                            <ImageIcon size={16} className="shrink-0" />
                                        )}
                                        <span className="truncate">
                                            {isPreparingAttachment ? 'Preparing attachment…' : attachment.name}
                                        </span>
                                    </div>
                                    {!isPreparingAttachment && (
                                        <button
                                            type="button"
                                            onClick={removeAttachment}
                                            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                                            aria-label="Remove attachment"
                                            title="Remove attachment"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            )}
                            {!quickAdd.mode && attachmentError && (
                                <p className="mb-2 text-xs text-red-600" role="alert">{attachmentError}</p>
                            )}

                            <form onSubmit={onComposerSubmit} className="flex items-center gap-2">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,application/pdf"
                                    onChange={handleAttachmentChange}
                                    className="hidden"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isTyping || isPreparingAttachment || Boolean(quickAdd.mode)}
                                    className="rounded-lg bg-slate-100 p-3 text-slate-500 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Attach image or PDF"
                                    aria-label="Attach image or PDF"
                                >
                                    <Paperclip size={20} />
                                </button>
                                <div className="flex-1 relative">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={isListening ? 'Listening...' : quickAdd.mode === 'event' ? 'Event title...' : quickAdd.mode === 'task' ? 'Task title...' : 'Ask for a decision or action...'}
                                        disabled={(isTyping && !quickAdd.mode) || isPreparingAttachment}
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

                                {/* Send button (quick-add: always Send; agent mode: Stop while streaming) */}
                                {quickAdd.mode ? (
                                    <button
                                        type="submit"
                                        disabled={!input.trim() || quickAdd.isSaving}
                                        className="rounded-lg bg-slate-900 p-3 text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                        title="Add"
                                    >
                                        <Send size={20} />
                                    </button>
                                ) : isTyping ? (
                                    <button
                                        type="button"
                                        onClick={stopMessage}
                                        className="rounded-lg bg-slate-900 p-3 text-white transition-colors hover:bg-slate-700"
                                        title="Stop response"
                                        aria-label="Stop response"
                                    >
                                        <Square size={18} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={(!input.trim() && !attachment) || isPreparingAttachment}
                                        className="rounded-lg bg-slate-900 p-3 text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                        title="Send"
                                    >
                                        <Send size={20} />
                                    </button>
                                )}
                            </form>
                            <p className="text-xs text-slate-400 text-center mt-2">
                                {quickAdd.mode ? 'Added instantly, no agent · Press Enter to add' : 'Attach PNG, JPEG, WebP, or PDF • Press Enter to send'}
                            </p>
                        </div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ChatSidebarPanel;
