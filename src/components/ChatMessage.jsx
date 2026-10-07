import React, { useMemo, useState } from 'react';
import {
    Check,
    CalendarPlus,
    CalendarClock,
    ClipboardList,
    Edit3,
    Trash2,
    CheckCircle2,
    Target,
    Flag,
    HelpCircle,
    MessageSquare,
    ArrowRight,
    SlidersHorizontal,
    FileText,
    Image as ImageIcon
} from 'lucide-react';
import RichTextRenderer from './RichTextRenderer';

// Action type to display info
const ACTION_DISPLAY = {
    add_task: { icon: ClipboardList, label: 'Add Task', color: 'bg-blue-50 border-blue-200 text-blue-700' },
    edit_task: { icon: Edit3, label: 'Edit Task', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    delete_task: { icon: Trash2, label: 'Delete Task', color: 'bg-red-50 border-red-200 text-red-700' },
    complete_task: { icon: CheckCircle2, label: 'Complete Task', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    add_schedule: { icon: CalendarPlus, label: 'Add Event', color: 'bg-violet-50 border-violet-200 text-violet-700' },
    edit_schedule: { icon: CalendarClock, label: 'Edit Event', color: 'bg-amber-50 border-amber-200 text-amber-700' },
    delete_schedule: { icon: Trash2, label: 'Delete Event', color: 'bg-red-50 border-red-200 text-red-700' },
    duplicate_schedule: { icon: CalendarPlus, label: 'Duplicate Event', color: 'bg-violet-50 border-violet-200 text-violet-700' },
    override_schedule_day: { icon: CalendarClock, label: 'Customize Day', color: 'bg-sky-50 border-sky-200 text-sky-700' },
    plan_day: { icon: CalendarPlus, label: 'Plan Day', color: 'bg-violet-50 border-violet-200 text-violet-700' },
    save_template: { icon: ClipboardList, label: 'Save Template', color: 'bg-teal-50 border-teal-200 text-teal-700' },
    apply_template: { icon: CalendarPlus, label: 'Apply Template', color: 'bg-teal-50 border-teal-200 text-teal-700' },
    delete_template: { icon: Trash2, label: 'Delete Template', color: 'bg-red-50 border-red-200 text-red-700' },
    complete_habit: { icon: Target, label: 'Complete Habit', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    set_goal: { icon: Flag, label: 'Set Goal', color: 'bg-yellow-50 border-yellow-200 text-yellow-700' },
    navigate: { icon: ArrowRight, label: 'Navigate', color: 'bg-slate-50 border-slate-200 text-slate-700' },
    info_response: { icon: MessageSquare, label: 'Info', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    clarify: { icon: HelpCircle, label: 'Question', color: 'bg-orange-50 border-orange-200 text-orange-700' }
};

const getActionTitle = (action, displayLabel) => {
    if (action.type === 'plan_day' && Array.isArray(action.params?.blocks)) {
        return `${action.params.blocks.length} blocks · ${action.params.date || ''}`.trim();
    }
    if (action.type === 'override_schedule_day') {
        const when = action.params?.date || (action.params?.weekday !== undefined
            ? `every ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][action.params.weekday]}`
            : '');
        const label = action.params?.updates?.title || 'Customize';
        return when ? `${label} (${when})` : label;
    }
    if (action.type === 'save_template' && action.params?.name) {
        return `“${action.params.name}” · ${action.params.blocks?.length || 0} blocks`;
    }
    if (action.type === 'apply_template' && action.params?.name) {
        return `“${action.params.name}” → ${action.params.date || ''}`.trim();
    }
    if (action.params?.title) return action.params.title;
    if (action.params?.name) return action.params.name;
    if (action.params?.goalText) return action.params.goalText;
    if (action.params?.updates?.title) return action.params.updates.title;
    if (action.params?.question) return action.params.question;
    return displayLabel;
};

const ActionCard = ({ action, isCancelled = false, isPending = false, showDetails = true, onSendMessage }) => {
    const display = ACTION_DISPLAY[action.type] || {
        icon: ClipboardList,
        label: action.type,
        color: 'bg-slate-50 border-slate-200 text-slate-700'
    };
    const Icon = display.icon;

    // For clarify actions, show the actual question as the label
    const displayLabel = action.type === 'clarify' && action.params?.question
        ? action.params.question
        : display.label;

    // Helper to format time from ISO string
    const formatScheduleTime = (isoString) => {
        if (!isoString) return null;
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return null;
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } catch {
            return null;
        }
    };

    // Helper to format date
    const formatScheduleDate = (isoString) => {
        if (!isoString) return null;
        try {
            const date = new Date(isoString);
            if (isNaN(date.getTime())) return null;
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            if (date.toDateString() === today.toDateString()) return 'Today';
            if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
            return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
        } catch {
            return null;
        }
    };

    // Check if this is a schedule action
    const isScheduleAction = ['add_schedule', 'edit_schedule'].includes(action.type);
    const scheduleTime = formatScheduleTime(action.params?.startTime);
    const scheduleDate = formatScheduleDate(action.params?.startTime);
    const duration = action.params?.duration;
    const title = getActionTitle(action, displayLabel);
    const suggestions = action.type === 'clarify' && Array.isArray(action.params?.suggestions)
        ? action.params.suggestions.filter(Boolean).slice(0, 4)
        : [];

    const tint = /red/.test(display.color)
        ? 'var(--color-error)'
        : /emerald|green/.test(display.color)
            ? 'var(--color-success)'
            : /amber|orange|yellow/.test(display.color)
                ? 'var(--color-warning)'
                : 'var(--color-accent)';
    const scheduleMeta = isScheduleAction ? [scheduleDate, scheduleTime, duration ? `${duration} min` : null].filter(Boolean).join(' · ') : '';

    return (
        <div className="agent-action" style={{ '--action-tint': tint }}>
            <span className="agent-action__icon" aria-hidden="true"><Icon size={15} /></span>
            <div className="agent-action__body">
                <span className="agent-action__label">{display.label}</span>
                <span className="agent-action__title">{title}</span>
                {scheduleMeta && <span className="agent-action__meta">{scheduleMeta}</span>}
                {showDetails && action.params?.message && action.type !== 'clarify' && (
                    <span className="agent-action__meta">{action.params.message}</span>
                )}
                {showDetails && (action.type === 'plan_day' || action.type === 'save_template') && Array.isArray(action.params?.blocks) && (
                    <ul className="agent-action__blocks">
                        {action.params.blocks.map((block, index) => (
                            <li key={`${block.startTime}-${index}`}>{block.startTime} · {block.title} ({block.duration || 60} min)</li>
                        ))}
                    </ul>
                )}
                {!isPending && (isCancelled || action.explanation) && (
                    <span className="agent-action__meta">{isCancelled ? 'Cancelled' : action.explanation}</span>
                )}
                {suggestions.length > 0 && (
                    <div className="agent-action__suggestions">
                        {suggestions.map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => onSendMessage?.(suggestion)}
                                className="agent-chip"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const shouldCollapseMessage = (content) => {
    if (!content) return false;
    const lines = content.split('\n').filter(Boolean).length;
    return content.length > 520 || lines > 8;
};

const getPreviewText = (content) => {
    if (!content) return '';
    const lines = content.split('\n').filter(Boolean);
    if (lines.length > 5) return `${lines.slice(0, 5).join('\n')}\n...`;
    if (content.length > 520) return `${content.slice(0, 520).trim()}...`;
    return content;
};

const REFINEMENT_ACTIONS = [
    {
        label: 'Ask follow-up',
        prompt: 'Before improving that answer, ask me one focused question that would make the recommendation better.'
    },
    {
        label: 'Shorter',
        prompt: 'Rewrite your previous answer in a shorter, more decisive format with one recommended next step.'
    },
    {
        label: 'Alternatives',
        prompt: 'Give me 3 alternative versions of your previous recommendation and when each is best.'
    },
    {
        label: 'Make actions',
        prompt: 'Turn your previous answer into concrete task or schedule actions I can confirm.'
    }
];

const ChatMessage = ({
    message,
    onConfirm,
    onCancel,
    onSendMessage,
    isLast = false
}) => {
    const isUser = message.role === 'user';
    const hasActions = message.actions?.some(action => action.type !== 'info_response');
    const hasPendingConfirmation = message.pendingConfirmation;
    const wasExecuted = message.actionsExecuted;
    const wasCancelled = message.actionsCancelled;
    const [showRefine, setShowRefine] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const collapsible = !isUser && shouldCollapseMessage(message.content);
    const renderedContent = useMemo(() => (
        collapsible && !expanded ? getPreviewText(message.content) : message.content
    ), [collapsible, expanded, message.content]);

    const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    return (
        <div className={`agent-msg ${isUser ? 'is-user' : 'is-agent'}${message.isError ? ' is-error' : ''}`}>
            <div className="agent-bubble">
                {isUser ? (
                    <>
                        {message.attachment && (
                            <span className="agent-bubble__attachment">
                                {message.attachment.kind === 'pdf' ? <FileText size={14} /> : <ImageIcon size={14} />}
                                <span>{message.attachment.name}</span>
                            </span>
                        )}
                        <p>{message.content}</p>
                    </>
                ) : (
                    <RichTextRenderer text={renderedContent} renderHint={message.renderHint} />
                )}
                {collapsible && (
                    <button type="button" onClick={() => setExpanded((value) => !value)} className="agent-bubble__more">
                        {expanded ? 'Show Less' : 'Show More'}
                    </button>
                )}
            </div>

            {!isUser && hasActions && (
                <div className="agent-actions">
                    {message.actions.filter(a => a.type !== 'info_response').map((action, idx) => (
                        <ActionCard
                            key={idx}
                            action={action}
                            isCancelled={wasCancelled}
                            isPending={hasPendingConfirmation}
                            onSendMessage={onSendMessage}
                        />
                    ))}

                    {hasPendingConfirmation && (
                        <div className="agent-confirm">
                            <button type="button" onClick={() => onCancel?.(message.id)} className="ui-button">Cancel</button>
                            <button type="button" onClick={() => onConfirm?.(message.id)} className="ui-button ui-button--accent">
                                <Check size={16} strokeWidth={2.6} /> Confirm
                            </button>
                        </div>
                    )}

                    {wasExecuted && <p className="agent-note is-success"><Check size={13} strokeWidth={2.6} /> Done</p>}
                    {wasCancelled && <p className="agent-note">Cancelled</p>}
                </div>
            )}

            {!isUser && !message.isError && isLast && (
                <div className="agent-refine">
                    {showRefine ? REFINEMENT_ACTIONS.map((action) => (
                        <button
                            key={action.label}
                            type="button"
                            onClick={() => {
                                onSendMessage?.(action.prompt);
                                setShowRefine(false);
                            }}
                            className="agent-chip"
                        >
                            {action.label}
                        </button>
                    )) : (
                        <button type="button" onClick={() => setShowRefine(true)} className="agent-chip agent-chip--quiet">
                            <SlidersHorizontal size={13} /> Refine
                        </button>
                    )}
                </div>
            )}

            {isLast && <time className="agent-time">{formatTime(message.timestamp)}</time>}
        </div>
    );
};

// Typing indicator component
export const TypingIndicator = () => (
    <div className="agent-msg is-agent">
        <div className="agent-bubble agent-typing" aria-label="Agent is typing">
            <span /><span /><span />
        </div>
    </div>
);

export default ChatMessage;
