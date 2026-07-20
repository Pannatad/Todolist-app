import React, { useMemo, useState } from 'react';
import {
    User,
    Check,
    X,
    Clock,
    Sparkles,
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
    ChevronDown,
    ChevronUp,
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
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    return (
        <div className={`rounded-lg border p-3 text-sm ${display.color}`}>
            <div className="flex items-start gap-2">
                <div className="mt-0.5 rounded-md bg-white/70 p-1">
                    <Icon size={14} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold uppercase tracking-wide opacity-75">{display.label}</div>
                    <div className="mt-0.5 break-words font-medium text-slate-900">{title}</div>
                    {(isPending || isCancelled || action.explanation) && (
                        <div className="mt-1 text-xs text-slate-500">
                            {isPending
                                ? 'Pending your confirmation.'
                                : isCancelled
                                    ? 'Proposal cancelled.'
                                    : action.explanation}
                        </div>
                    )}
                </div>
            </div>
            {showDetails && action.params && action.type !== 'clarify' && (
                <div className="mt-2 text-slate-600 text-xs space-y-1">
                    {action.params.message && <span>{action.params.message}</span>}
                    {/* Show time and duration for schedule actions */}
                    {isScheduleAction && (scheduleTime || duration) && (
                        <div className="flex flex-wrap items-center gap-2 font-medium">
                            {scheduleDate && <span>{scheduleDate}</span>}
                            {scheduleTime && <span>{scheduleTime}</span>}
                            {duration && <span>{duration} min</span>}
                        </div>
                    )}
                    {/* Show the proposed blocks for a full day plan */}
                    {(action.type === 'plan_day' || action.type === 'save_template') && Array.isArray(action.params.blocks) && (
                        <div className="space-y-0.5 font-medium">
                            {action.params.blocks.map((block, index) => (
                                <div key={`${block.startTime}-${index}`}>{block.startTime} · {block.title} ({block.duration || 60} min)</div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            {suggestions.length > 0 && (
                <div className="mt-3 grid gap-1.5">
                    {suggestions.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => onSendMessage?.(suggestion)}
                            className="rounded-md border border-white/70 bg-white/75 px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-white"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}
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
    onSendMessage
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

    // Format timestamp
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
        >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser
                ? 'bg-slate-900'
                : 'bg-white border border-slate-200'
                }`}>
                {isUser ? (
                    <User size={16} className="text-white" />
                ) : (
                    <Sparkles size={16} className="text-slate-700" />
                )}
            </div>

            {/* Message Content */}
            <div className={`flex flex-col ${isUser ? 'max-w-[82%] items-end' : 'max-w-[88%] items-start'}`}>
                {/* Main bubble */}
                <div className={`rounded-xl px-4 py-3 ${isUser
                    ? 'bg-slate-900 text-white rounded-br-sm'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm shadow-sm'
                    } ${message.isError ? 'border-red-200 bg-red-50' : ''}`}>
                    {isUser ? (
                        <div>
                            {message.attachment && (
                                <div className="mb-2 flex items-center gap-2 rounded-md bg-white/10 px-2 py-1.5 text-xs text-slate-200">
                                    {message.attachment.kind === 'pdf'
                                        ? <FileText size={14} />
                                        : <ImageIcon size={14} />}
                                    <span className="truncate">{message.attachment.name}</span>
                                </div>
                            )}
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        </div>
                    ) : (
                        <div className="text-sm leading-relaxed">
                            <RichTextRenderer text={renderedContent} renderHint={message.renderHint} />
                        </div>
                    )}
                    {collapsible && (
                        <button
                            type="button"
                            onClick={() => setExpanded((value) => !value)}
                            className="mt-3 inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                        >
                            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            {expanded ? 'Less' : 'Details'}
                        </button>
                    )}
                </div>

                {/* Action Cards (for assistant messages with actions) */}
                {!isUser && hasActions && (
                    <div className="mt-2 space-y-2 w-full">
                        {message.actions.filter(a => a.type !== 'info_response').map((action, idx) => (
                            <ActionCard
                                key={idx}
                                action={action}
                                isCancelled={wasCancelled}
                                isPending={hasPendingConfirmation}
                                onSendMessage={onSendMessage}
                            />
                        ))}

                        {/* Confirmation buttons */}
                        {hasPendingConfirmation && (
                            <div className="flex gap-2 mt-2">
                                <button
                                    onClick={() => onConfirm?.(message.id)}
                                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                                >
                                    <Check size={14} />
                                    Confirm
                                </button>
                                <button
                                    onClick={() => onCancel?.(message.id)}
                                    className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
                                >
                                    <X size={14} />
                                    Cancel
                                </button>
                            </div>
                        )}

                        {/* Executed indicator */}
                        {wasExecuted && (
                            <div className="flex items-center gap-1.5 text-emerald-600 text-xs mt-1">
                                <Check size={12} />
                                <span>Actions completed</span>
                            </div>
                        )}

                        {/* Cancelled indicator */}
                        {wasCancelled && (
                            <div className="flex items-center gap-1.5 text-slate-500 text-xs mt-1">
                                <X size={12} />
                                <span>Cancelled</span>
                            </div>
                        )}
                    </div>
                )}

                {!isUser && !message.isError && (
                    <div className="mt-2 w-full">
                        <button
                            type="button"
                            onClick={() => setShowRefine((value) => !value)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        >
                            <SlidersHorizontal size={13} />
                            Refine
                        </button>
                        {showRefine && (
                            <div className="mt-2 grid grid-cols-2 gap-1.5">
                                {REFINEMENT_ACTIONS.map((action) => (
                                    <button
                                        key={action.label}
                                        type="button"
                                        onClick={() => {
                                            onSendMessage?.(action.prompt);
                                            setShowRefine(false);
                                        }}
                                        className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Timestamp */}
                <div className={`flex items-center gap-1 mt-1 text-xs text-slate-400`}>
                    <Clock size={10} />
                    <span>{formatTime(message.timestamp)}</span>
                </div>
            </div>
        </div>
    );
};

// Typing indicator component
export const TypingIndicator = () => (
    <div
        className="flex gap-3"
    >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
            <Sparkles size={16} className="text-slate-700" />
        </div>
        <div className="px-4 py-3 bg-white border border-slate-200 rounded-xl rounded-bl-sm shadow-sm">
            <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:120ms]" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:240ms]" />
            </div>
        </div>
    </div>
);

export default ChatMessage;
