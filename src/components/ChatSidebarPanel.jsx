import { useRef, useState } from 'react';
import {
    ArrowUp,
    CalendarPlus,
    CheckSquare,
    MessageCircle,
    FileText,
    Image as ImageIcon,
    LoaderCircle,
    Mic,
    MicOff,
    MoreHorizontal,
    Paperclip,
    Plus,
    Square,
    Trash2,
    X,
} from 'lucide-react';
import { MenuButton, RowMenu, useMediaQuery, usePresence } from '../ui';
import './agent.css';
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
                await addTask({ title, deadline: `${date}T${taskTime || '23:59'}` });
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
    const wide = useMediaQuery('(min-width: 40rem)');
    const rendered = usePresence(isOpen, 320);
    const sheetRef = useRef(null);
    const dragRef = useRef(null);

    // Drag the header down to dismiss, like a native sheet.
    const startDrag = (event) => {
        if (wide || event.button !== 0 || event.target.closest('button')) return;
        dragRef.current = { startY: event.clientY, lastY: event.clientY, lastTime: performance.now(), velocity: 0 };
        try {
            event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
            // Pointer already released; drag still works without capture.
        }
        if (sheetRef.current) sheetRef.current.dataset.dragging = 'true';
    };
    const moveDrag = (event) => {
        const drag = dragRef.current;
        const sheet = sheetRef.current;
        if (!drag || !sheet) return;
        const now = performance.now();
        drag.velocity = (event.clientY - drag.lastY) / Math.max(1, now - drag.lastTime);
        drag.lastY = event.clientY;
        drag.lastTime = now;
        const delta = event.clientY - drag.startY;
        sheet.style.transform = `translate3d(0, ${delta > 0 ? delta : -Math.sqrt(-delta) * 2}px, 0)`;
    };
    const endDrag = () => {
        const drag = dragRef.current;
        const sheet = sheetRef.current;
        dragRef.current = null;
        if (!drag || !sheet) return;
        delete sheet.dataset.dragging;
        const distance = drag.lastY - drag.startY;
        if (distance > 120 || (distance > 24 && drag.velocity > 0.6)) {
            sheet.dataset.flicked = 'true';
            sheet.style.transform = 'translate3d(0, 100%, 0)';
            closeSidebar();
            return;
        }
        sheet.style.transform = '';
    };

    const onComposerSubmit = (event) => {
        if (quickAdd.mode) {
            event.preventDefault();
            quickAdd.submit();
        } else {
            handleSubmit(event);
        }
    };

    const settingsSections = [
        {
            title: 'Model',
            items: aiProviderOptions.map((option) => ({
                id: option.id,
                label: option.label,
                checked: selectedAIProvider === option.id,
                disabled: isTyping,
                onSelect: () => setSelectedAIProvider(option.id),
            })),
        },
        ...(selectedAIProvider === 'local' ? [{
            title: 'Local model',
            items: [{
                id: 'thinking',
                label: 'Thinking Mode',
                checked: localThinkingEnabled,
                disabled: isTyping,
                onSelect: () => setLocalThinkingEnabled(!localThinkingEnabled),
            }],
        }] : []),
        {
            items: [{ id: 'clear', label: 'Clear Conversation', icon: Trash2, destructive: true, onSelect: handleClearChat }],
        },
    ];

    const addMenuItems = [
        { label: 'Photo or PDF', icon: Paperclip, onSelect: () => fileInputRef.current?.click() },
        { label: 'New Event', icon: CalendarPlus, onSelect: () => quickAdd.toggleMode('event') },
        { label: 'New Task', icon: CheckSquare, onSelect: () => quickAdd.toggleMode('task') },
    ];

    const showEmptyState = messages.length === 0 && !activeGuide && !tomorrowPlanner;
    const localStatusLabel = localAIStatus.status === 'checking' ? 'Checking LM Studio…' : 'LM Studio is offline';

    if (!rendered) return null;
    const closing = !isOpen;

    return (
        <>
                    <div
                        className="agent-backdrop"
                        data-closing={closing ? 'true' : undefined}
                        onClick={closeSidebar}
                    />

                    <section
                        ref={sheetRef}
                        className="agent-sheet"
                        data-closing={closing ? 'true' : undefined}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Agent"
                    >
                        <div
                            className="agent-header"
                            onPointerDown={startDrag}
                            onPointerMove={moveDrag}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                        >
                            <span className="agent-header__grabber" aria-hidden="true" />
                            <MenuButton
                                icon={MoreHorizontal}
                                label="Agent settings"
                                sections={settingsSections}
                                align="left"
                                buttonClassName="agent-header__button"
                            />
                            <h2 className="agent-header__title">Agent</h2>
                            <button type="button" onClick={closeSidebar} className="ui-sheet__close agent-header__close" aria-label="Close agent">
                                <X size={17} strokeWidth={2.4} />
                            </button>
                        </div>

                        {selectedAIProvider === 'local' && localAIStatus.status !== 'ready' && (
                            <p className={`agent-status is-${localAIStatus.status}`} role="status" title={localAIStatus.message}>
                                <span aria-hidden="true" />
                                {localStatusLabel}
                            </p>
                        )}

                        <div className="agent-messages">
                            {activeGuide && (
                                <div className="agent-card">
                                    <div className="agent-card__header">
                                        <h3>{activeGuide.title}</h3>
                                        <button type="button" onClick={() => setActiveGuide(null)} className="ui-sheet__close" aria-label="Close guide">
                                            <X size={15} strokeWidth={2.4} />
                                        </button>
                                    </div>
                                    {activeGuide.fields.map((field) => (
                                        <div key={field.id} className="agent-card__field">
                                            <span className="agent-card__label">{field.label}</span>
                                            <div className="agent-card__options">
                                                {field.options.map((option) => (
                                                    <button
                                                        key={option}
                                                        type="button"
                                                        onClick={() => updateGuideAnswer(field.id, option)}
                                                        className={`agent-chip${guideAnswers[field.id] === option ? ' is-selected' : ''}`}
                                                        aria-pressed={guideAnswers[field.id] === option}
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
                                        placeholder="Anything else? (optional)"
                                        rows={2}
                                        className="agent-textarea"
                                    />
                                    <div className="agent-card__footer">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setInput(activeGuide.prompt(guideAnswers));
                                                setActiveGuide(null);
                                            }}
                                            className="ui-text-button"
                                        >
                                            Edit First
                                        </button>
                                        <button type="button" onClick={submitGuide} disabled={isTyping} className="ui-button ui-button--accent">Ask</button>
                                    </div>
                                </div>
                            )}

                            {tomorrowPlanner && (() => {
                                const step = TOMORROW_PLANNER_STEPS[tomorrowPlanner.stepIndex];
                                const isReview = step.id === 'review';
                                return (
                                    <div className="agent-card">
                                        <div className="agent-card__header">
                                            <div>
                                                <span className="agent-card__label">Tomorrow · {tomorrowPlanner.stepIndex + 1} of {TOMORROW_PLANNER_STEPS.length}</span>
                                                <h3>{step.title}</h3>
                                            </div>
                                            <button type="button" onClick={() => setTomorrowPlanner(null)} className="ui-sheet__close" aria-label="Close planner">
                                                <X size={15} strokeWidth={2.4} />
                                            </button>
                                        </div>
                                        <div className="agent-progress" aria-hidden="true">
                                            {TOMORROW_PLANNER_STEPS.map((item, index) => (
                                                <span key={item.id} className={index <= tomorrowPlanner.stepIndex ? 'is-done' : ''} />
                                            ))}
                                        </div>
                                        {!isReview ? (
                                            <>
                                                <div className="agent-card__options">
                                                    {step.chips.map((chip) => (
                                                        <button key={chip} type="button" onClick={() => applyPlannerChip(step.id, chip)} className="agent-chip">
                                                            {chip}
                                                        </button>
                                                    ))}
                                                </div>
                                                <textarea
                                                    value={tomorrowPlanner.answers[step.id] || ''}
                                                    onChange={(event) => updatePlannerAnswer(step.id, event.target.value)}
                                                    placeholder={step.placeholder}
                                                    rows={3}
                                                    className="agent-textarea"
                                                />
                                            </>
                                        ) : (
                                            <ul className="agent-card__summary">
                                                {plannerSummaryLines(tomorrowPlanner.answers).map((line) => <li key={line}>{line}</li>)}
                                            </ul>
                                        )}
                                        <div className="agent-card__footer">
                                            <button type="button" onClick={() => movePlannerStep(-1)} disabled={tomorrowPlanner.stepIndex === 0} className="ui-text-button">
                                                Back
                                            </button>
                                            {isReview ? (
                                                <button type="button" onClick={sendTomorrowPlan} disabled={isTyping} className="ui-button ui-button--accent">Draft Plan</button>
                                            ) : (
                                                <button type="button" onClick={() => movePlannerStep(1)} className="ui-button ui-button--accent">
                                                    {tomorrowPlanner.answers[step.id]?.trim() ? 'Next' : 'Skip'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                            {showEmptyState ? (
                                <div className="agent-empty">
                                    <span className="agent-empty__icon" aria-hidden="true"><MessageCircle size={26} strokeWidth={2} /></span>
                                    <h3>How can I help?</h3>
                                    <div className="agent-empty__guides">
                                        {GUIDE_MODES.map((command) => {
                                            const Icon = command.icon;
                                            return (
                                                <button
                                                    key={command.label}
                                                    type="button"
                                                    onClick={() => openGuide(command)}
                                                    disabled={isTyping}
                                                    className="agent-chip agent-chip--large"
                                                    title={command.title}
                                                >
                                                    <Icon size={15} aria-hidden="true" />
                                                    {command.label}
                                                </button>
                                            );
                                        })}
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

                        <div className="agent-composer">
                            {quickAdd.mode && (
                                <div className="agent-quick-add">
                                    <button type="button" className="agent-chip is-selected" onClick={() => quickAdd.toggleMode(quickAdd.mode)} aria-label={`Stop adding ${quickAdd.mode}`}>
                                        {quickAdd.mode === 'event' ? <CalendarPlus size={14} /> : <CheckSquare size={14} />}
                                        {quickAdd.mode === 'event' ? 'Event' : 'Task'}
                                        <X size={13} strokeWidth={2.6} />
                                    </button>
                                    <input type="date" value={quickAdd.date} onChange={(e) => quickAdd.setDate(e.target.value)} className="agent-time-input" aria-label={quickAdd.mode === 'event' ? 'Event date' : 'Due date'} />
                                    {quickAdd.mode === 'event' ? (
                                        <>
                                            <input type="time" value={quickAdd.startTime} onChange={(e) => { quickAdd.setStartTime(e.target.value); quickAdd.setEndTime(addMinutes(e.target.value, 90)); }} className="agent-time-input" aria-label="Start time" />
                                            <span className="agent-quick-add__dash">–</span>
                                            <input type="time" value={quickAdd.endTime} onChange={(e) => quickAdd.setEndTime(e.target.value)} className="agent-time-input" aria-label="End time" />
                                        </>
                                    ) : (
                                        <input type="time" value={quickAdd.taskTime} onChange={(e) => quickAdd.setTaskTime(e.target.value)} className="agent-time-input" aria-label="Due time" />
                                    )}
                                </div>
                            )}

                            {!quickAdd.mode && (attachment || isPreparingAttachment) && (
                                <div className="agent-attachment">
                                    {isPreparingAttachment ? <LoaderCircle size={15} className="animate-spin" /> : attachment.kind === 'pdf' ? <FileText size={15} /> : <ImageIcon size={15} />}
                                    <span>{isPreparingAttachment ? 'Preparing…' : attachment.name}</span>
                                    {!isPreparingAttachment && (
                                        <button type="button" onClick={removeAttachment} aria-label="Remove attachment"><X size={14} strokeWidth={2.4} /></button>
                                    )}
                                </div>
                            )}
                            {!quickAdd.mode && attachmentError && <p className="agent-error" role="alert">{attachmentError}</p>}

                            <form onSubmit={onComposerSubmit} className="agent-composer__form">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp,application/pdf"
                                    onChange={handleAttachmentChange}
                                    className="hidden"
                                />
                                <RowMenu
                                    variant="plain"
                                    icon={Plus}
                                    label="Add"
                                    disabled={isTyping || isPreparingAttachment}
                                    items={addMenuItems}
                                />
                                <div className="agent-field">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={isListening ? 'Listening…' : quickAdd.mode === 'event' ? 'Event title' : quickAdd.mode === 'task' ? 'Task title' : 'Message'}
                                        disabled={(isTyping && !quickAdd.mode) || isPreparingAttachment}
                                        enterKeyHint="send"
                                    />
                                    {speechSupported && !input.trim() && !isTyping && (
                                        <button
                                            type="button"
                                            onClick={toggleListening}
                                            className={`agent-field__mic${isListening ? ' is-listening' : ''}`}
                                            aria-label={isListening ? 'Stop dictation' : 'Dictate'}
                                        >
                                            {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                                        </button>
                                    )}
                                </div>
                                {!quickAdd.mode && isTyping ? (
                                    <button type="button" onClick={stopMessage} className="agent-send" aria-label="Stop response">
                                        <Square size={13} fill="currentColor" />
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        disabled={quickAdd.mode ? (!input.trim() || quickAdd.isSaving) : ((!input.trim() && !attachment) || isPreparingAttachment)}
                                        className="agent-send"
                                        aria-label={quickAdd.mode ? 'Add' : 'Send'}
                                    >
                                        <ArrowUp size={19} strokeWidth={2.6} />
                                    </button>
                                )}
                            </form>
                        </div>
                    </section>
        </>
    );
};

export default ChatSidebarPanel;
