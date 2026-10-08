import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowUp,
    CalendarDays,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Copy,
    FileText,
    Minus,
    Plus,
    Sparkles,
    Trash2
} from 'lucide-react';
import { RowMenu, SegmentedControl, Sheet } from '../../ui';
import { useChatContext } from '../../context/ChatContext';
import { sendChatMessage } from '../../services/ConversationService';
import {
    createScheduleId,
    minutesFromTime,
    occurrencesToMagicTemplateBlocks,
    sanitizeMagicTemplateBlocks,
    SCHEDULE_ITEM_KINDS,
    timeFromMinutes
} from '../../services/magicSchedule';
import { getScheduleItemsForDate, toLocalDateKey } from '../../utils/scheduleOccurrences';
import { toast } from '../../ui/Toast';
import { confirmAction } from '../../utils/confirm';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6'];
const SUGGESTIONS = [
    'A focused deep-work morning',
    'A light, restful day',
    'A study day with spaced breaks'
];
const PANES = [
    { id: 'blocks', label: 'Blocks' },
    { id: 'timeline', label: 'Timeline' }
];
const EMPTY_BLOCKS = [];
const DEFAULT_DATE = new Date();

const createCraftBlock = (startTime = '09:00', duration = 60) => ({
    id: createScheduleId('block'),
    kind: SCHEDULE_ITEM_KINDS.EVENT,
    title: '',
    startTime,
    duration,
    category: 'Other',
    color: COLORS[0],
    notes: '',
    children: []
});

const createCraftChild = (parent) => ({
    id: createScheduleId('child'),
    title: '',
    startTime: parent.startTime,
    duration: Math.min(30, Number(parent.duration) || 30),
    category: parent.category || 'Other',
    color: parent.color || COLORS[0],
    notes: ''
});

const dateFromKey = (dateKey) => new Date(`${dateKey}T12:00:00`);

const shiftDateKey = (dateKey, days) => {
    const date = dateFromKey(dateKey);
    date.setDate(date.getDate() + days);
    return toLocalDateKey(date);
};

const formatDate = (dateKey, options = { weekday: 'long', month: 'long', day: 'numeric' }) => (
    dateFromKey(dateKey).toLocaleDateString([], options)
);

const formatClock = (minutes) => {
    const date = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const formatHour = (hour) => new Date(2000, 0, 1, hour % 24).toLocaleTimeString([], { hour: 'numeric' });

const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${remainder}m`;
    if (!remainder) return `${hours}h`;
    return `${hours}h ${remainder}m`;
};

const toLocalTime = (value) => {
    const direct = String(value || '').match(/^([01]?\d|2[0-3]):([0-5]\d)/);
    if (direct) return `${String(Number(direct[1])).padStart(2, '0')}:${direct[2]}`;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const assistantBlock = (block, index) => ({
    ...block,
    id: block.id || createScheduleId(`assistant-block-${index + 1}`),
    kind: block.kind || block.itemKind || SCHEDULE_ITEM_KINDS.EVENT,
    startTime: toLocalTime(block.startTime),
    children: (block.children || []).map((child, childIndex) => ({
        ...child,
        id: child.id || createScheduleId(`assistant-child-${index + 1}-${childIndex + 1}`),
        startTime: toLocalTime(child.startTime)
    }))
});

// Start/end minutes for anything with a time and a positive duration, titled or not.
const blockSpan = (block) => {
    const start = minutesFromTime(block.startTime);
    const duration = Number(block.duration);
    if (start == null || !Number.isFinite(duration) || duration <= 0) return null;
    return { start, end: Math.min(1440, start + duration) };
};

const overlaps = (first, second) => first.start < second.end && second.start < first.end;

// Side-by-side lanes for overlapping items, like a calendar day view.
const layoutLanes = (items) => {
    const sorted = [...items].sort((first, second) => first.start - second.start || second.end - first.end);
    const placed = [];
    let cluster = [];
    let clusterEnd = -Infinity;
    const flush = () => {
        const laneEnds = [];
        cluster.forEach((item) => {
            let lane = laneEnds.findIndex((end) => end <= item.start);
            if (lane === -1) {
                lane = laneEnds.length;
                laneEnds.push(item.end);
            } else {
                laneEnds[lane] = item.end;
            }
            item.lane = lane;
        });
        cluster.forEach((item) => placed.push({ ...item, lanes: laneEnds.length }));
        cluster = [];
        clusterEnd = -Infinity;
    };
    sorted.forEach((item) => {
        if (cluster.length && item.start >= clusterEnd) flush();
        cluster.push({ ...item });
        clusterEnd = Math.max(clusterEnd, item.end);
    });
    if (cluster.length) flush();
    return placed;
};

const DayTimeline = ({ open, visible, dateKey, blocks, existingBlocks, activeId, onSelect, onCreateAt }) => {
    const scrollRef = useRef(null);
    const gridRef = useRef(null);
    const isToday = dateKey === toLocalDateKey(new Date());

    const items = useMemo(() => [
        ...existingBlocks.map((block) => {
            const span = blockSpan(block);
            return span && { ...span, key: `existing-${block.id}`, source: 'existing', block };
        }),
        ...blocks.map((block) => {
            const span = blockSpan(block);
            return span && { ...span, key: `draft-${block.id}`, source: 'draft', block };
        })
    ].filter(Boolean), [blocks, existingBlocks]);

    const earliest = Math.min(...items.map((item) => item.start), 7 * 60);
    const latest = Math.max(...items.map((item) => item.end), 21 * 60);
    const startHour = Math.max(0, Math.floor(earliest / 60));
    const endHour = Math.min(24, Math.ceil(latest / 60));
    const rangeStart = startHour * 60;
    const rangeMinutes = (endHour - startHour) * 60;
    const hours = Array.from({ length: endHour - startHour + 1 }, (_, index) => startHour + index);
    const placed = useMemo(() => layoutLanes(items), [items]);
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const firstDraftStart = items.find((item) => item.source === 'draft')?.start;

    useEffect(() => {
        if (!open) return undefined;
        // Wait a frame so the sheet (and a just-revealed pane) has been laid out.
        const frame = window.requestAnimationFrame(() => {
            const scroller = scrollRef.current;
            const grid = gridRef.current;
            if (!scroller || !grid) return;
            const focusMinutes = firstDraftStart ?? (isToday ? nowMinutes : 8 * 60);
            const offset = ((focusMinutes - rangeStart) / rangeMinutes) * grid.offsetHeight;
            scroller.scrollTop = Math.max(0, offset - 64);
        });
        return () => window.cancelAnimationFrame(frame);
        // Only re-anchor when the day or view changes, not on every edit.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, dateKey, visible]);

    useEffect(() => {
        if (!activeId) return;
        scrollRef.current?.querySelector('.craft-timeline__event.is-active')
            ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, [activeId]);

    const createFromPointer = (event) => {
        if (event.target.closest('.craft-timeline__event')) return;
        const rect = gridRef.current.getBoundingClientRect();
        const minutes = rangeStart + ((event.clientY - rect.top) / rect.height) * rangeMinutes;
        onCreateAt(Math.max(0, Math.min(1380, Math.floor(minutes / 15) * 15)));
    };

    const percent = (minutes) => `${((minutes - rangeStart) / rangeMinutes) * 100}%`;

    return (
        <div className="craft-timeline" ref={scrollRef}>
            <div
                className="craft-timeline__grid"
                ref={gridRef}
                style={{ '--craft-hours': endHour - startHour }}
                onClick={createFromPointer}
                role="presentation"
            >
                {hours.map((hour) => (
                    <div key={hour} className="craft-timeline__hour" style={{ top: percent(hour * 60) }}>
                        <span>{hour === startHour ? '' : formatHour(hour)}</span>
                    </div>
                ))}
                {isToday && nowMinutes >= rangeStart && nowMinutes <= rangeStart + rangeMinutes && (
                    <div className="craft-timeline__now" style={{ top: percent(nowMinutes) }} aria-hidden="true" />
                )}
                {placed.map((item) => {
                    const { block } = item;
                    const isDraft = item.source === 'draft';
                    const short = item.end - item.start < 40;
                    const style = {
                        top: percent(item.start),
                        height: `calc(${percent(item.end)} - ${percent(item.start)} - 2px)`,
                        left: `calc(var(--craft-gutter) + (100% - var(--craft-gutter)) * ${item.lane / item.lanes})`,
                        width: `calc((100% - var(--craft-gutter)) / ${item.lanes} - 3px)`,
                        '--craft-color': block.color || COLORS[0]
                    };
                    const className = [
                        'craft-timeline__event',
                        `is-${item.source}`,
                        block.kind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL ? 'is-shell' : '',
                        short ? 'is-short' : '',
                        !block.title?.trim() ? 'is-untitled' : '',
                        activeId === block.id && isDraft ? 'is-active' : ''
                    ].filter(Boolean).join(' ');
                    const content = (
                        <>
                            <strong>{block.title?.trim() || 'New block'}</strong>
                            <span>{short ? formatClock(item.start) : `${formatClock(item.start)} – ${formatClock(item.end)}`}</span>
                        </>
                    );
                    return isDraft ? (
                        <button
                            key={item.key}
                            type="button"
                            className={className}
                            style={style}
                            onClick={() => onSelect(block.id)}
                            aria-label={`Edit ${block.title?.trim() || 'new block'} at ${formatClock(item.start)}`}
                        >
                            {content}
                        </button>
                    ) : (
                        <div key={item.key} className={className} style={style} title={`Already scheduled · ${block.title}`}>
                            {content}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const DurationStepper = ({ value, max, onChange }) => {
    const minutes = Number(value) || 0;
    const step = (direction) => {
        const snapped = direction > 0
            ? Math.floor(minutes / 15) * 15 + 15
            : Math.ceil(minutes / 15) * 15 - 15;
        onChange(Math.max(15, Math.min(max, snapped)));
    };
    return (
        <div className="craft-stepper">
            <button type="button" onClick={() => step(-1)} disabled={minutes <= 15} aria-label="Shorter by 15 minutes">
                <Minus size={16} strokeWidth={2.4} aria-hidden="true" />
            </button>
            <output aria-live="polite">{formatDuration(minutes)}</output>
            <button type="button" onClick={() => step(1)} disabled={minutes >= max} aria-label="Longer by 15 minutes">
                <Plus size={16} strokeWidth={2.4} aria-hidden="true" />
            </button>
        </div>
    );
};

const BlockCard = ({ block, open, conflict, autoFocus, onToggle, onChange, onRemove }) => {
    const span = blockSpan(block);
    const isShell = block.kind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL;
    const title = block.title?.trim();
    const start = minutesFromTime(block.startTime) ?? 0;
    const updateChild = (childId, updates) => onChange({
        children: block.children.map((child) => child.id === childId ? { ...child, ...updates } : child)
    });

    return (
        <li className={`craft-block${open ? ' is-open' : ''}`} data-block-id={block.id} style={{ '--craft-color': block.color || COLORS[0] }}>
            <button type="button" className="craft-block__summary" onClick={onToggle} aria-expanded={open}>
                <span className={`craft-block__swatch${isShell ? ' is-shell' : ''}`} aria-hidden="true" />
                <span className="craft-block__text">
                    <strong className={title ? '' : 'is-placeholder'}>{title || 'Untitled block'}</strong>
                    <span>
                        {span ? `${formatClock(span.start)} – ${formatClock(span.end)} · ${formatDuration(span.end - span.start)}` : 'Set a time'}
                        {isShell && ' · Flexible'}
                    </span>
                    {conflict && <span className="craft-block__conflict">Overlaps {conflict}</span>}
                </span>
                <ChevronDown className="craft-block__chevron" size={18} aria-hidden="true" />
            </button>

            {open && (
                <div className="craft-block__editor">
                    <div className="form-group">
                        <label className="form-field">
                            <input
                                value={block.title}
                                onChange={(event) => onChange({ title: event.target.value })}
                                placeholder={isShell ? 'Flexible block name' : 'Title'}
                                aria-label="Block title"
                                autoFocus={autoFocus}
                            />
                        </label>
                        <label className="form-field form-field--value">
                            <span className="form-field__label">Starts</span>
                            <input type="time" value={block.startTime} onChange={(event) => onChange({ startTime: event.target.value })} />
                        </label>
                        <div className="form-field">
                            <span className="form-field__label">Duration</span>
                            <DurationStepper
                                value={block.duration}
                                max={Math.max(15, 1440 - start)}
                                onChange={(duration) => onChange({ duration })}
                            />
                        </div>
                        <div className="form-field">
                            <span className="form-field__label">Color</span>
                            <div className="craft-swatches" role="radiogroup" aria-label="Block color">
                                {COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        role="radio"
                                        aria-checked={block.color === color}
                                        className={`form-swatch${block.color === color ? ' is-selected' : ''}`}
                                        style={{ '--swatch': color }}
                                        onClick={() => onChange({ color })}
                                        aria-label={`Color ${COLORS.indexOf(color) + 1}`}
                                    />
                                ))}
                            </div>
                        </div>
                        <label className="form-field">
                            <span className="form-field__label">Flexible block</span>
                            <input
                                type="checkbox"
                                className="ui-switch"
                                checked={isShell}
                                onChange={(event) => onChange({
                                    kind: event.target.checked ? SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL : SCHEDULE_ITEM_KINDS.EVENT,
                                    children: event.target.checked ? block.children : []
                                })}
                            />
                        </label>
                    </div>
                    {isShell && (
                        <>
                            <p className="form-section-label">Inside this block</p>
                            <div className="form-group">
                                {block.children.map((child) => (
                                    <div key={child.id} className="form-field craft-child">
                                        <button
                                            type="button"
                                            className="form-remove"
                                            onClick={() => onChange({ children: block.children.filter((item) => item.id !== child.id) })}
                                            aria-label={`Remove ${child.title || 'activity'}`}
                                        >
                                            <Minus size={14} strokeWidth={3} aria-hidden="true" />
                                        </button>
                                        <input
                                            value={child.title}
                                            onChange={(event) => updateChild(child.id, { title: event.target.value })}
                                            placeholder="Activity"
                                            aria-label="Activity name"
                                        />
                                        <input
                                            type="time"
                                            className="craft-child__time"
                                            value={child.startTime}
                                            onChange={(event) => updateChild(child.id, { startTime: event.target.value })}
                                            aria-label="Activity start"
                                        />
                                        <input
                                            type="number"
                                            className="craft-child__minutes"
                                            min="5"
                                            step="5"
                                            value={child.duration}
                                            onChange={(event) => updateChild(child.id, { duration: Number(event.target.value) })}
                                            aria-label="Activity minutes"
                                        />
                                        <span className="form-field__suffix">m</span>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="form-field form-option form-option--tinted"
                                    onClick={() => onChange({ children: [...block.children, createCraftChild(block)] })}
                                >
                                    Add activity
                                </button>
                            </div>
                            <p className="form-note">Smaller activities that happen within this time.</p>
                        </>
                    )}
                    <div className="form-group">
                        <button type="button" className="form-field form-option form-option--destructive" onClick={onRemove}>
                            Delete block
                        </button>
                    </div>
                </div>
            )}
        </li>
    );
};

const MagicDayCraftEditor = ({
    open,
    onClose,
    onPreview,
    initialDate = DEFAULT_DATE,
    initialBlocks = EMPTY_BLOCKS,
    initialAssistantPrompt = '',
    events = [],
    tasks = [],
    templates = []
}) => {
    const { selectedAIProvider, localThinkingEnabled } = useChatContext();
    const [dateKey, setDateKey] = useState(() => toLocalDateKey(initialDate));
    const [blocks, setBlocks] = useState(() => sanitizeMagicTemplateBlocks(initialBlocks));
    const [source, setSource] = useState(initialAssistantPrompt ? 'assistant' : null);
    const [pane, setPane] = useState('blocks');
    const [expandedId, setExpandedId] = useState(null);
    const [focusId, setFocusId] = useState(null);
    const [copyDate, setCopyDate] = useState(() => toLocalDateKey(initialDate));
    const [assistantInput, setAssistantInput] = useState(initialAssistantPrompt);
    const [assistantMessage, setAssistantMessage] = useState(null);
    const [assistantBusy, setAssistantBusy] = useState(false);
    const datePickerRef = useRef(null);
    const listRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        const nextDate = typeof initialDate === 'string'
            ? initialDate
            : toLocalDateKey(initialDate || new Date());
        setDateKey(nextDate);
        setCopyDate(shiftDateKey(nextDate, -7));
        setBlocks(sanitizeMagicTemplateBlocks(initialBlocks));
        setSource(initialAssistantPrompt ? 'assistant' : null);
        setPane('blocks');
        setExpandedId(null);
        setFocusId(null);
        setAssistantInput(initialAssistantPrompt || '');
        setAssistantMessage(null);
        setAssistantBusy(false);
    }, [initialAssistantPrompt, initialBlocks, initialDate, open]);

    const validBlocks = useMemo(() => sanitizeMagicTemplateBlocks(blocks), [blocks]);
    const blocksForDate = (key) => occurrencesToMagicTemplateBlocks(getScheduleItemsForDate(events, dateFromKey(key)));
    const existingBlocks = useMemo(() => occurrencesToMagicTemplateBlocks(
        getScheduleItemsForDate(events, dateFromKey(dateKey))
    ), [events, dateKey]);
    const sortedBlocks = useMemo(() => [...blocks].sort((first, second) => (
        (minutesFromTime(first.startTime) ?? Infinity) - (minutesFromTime(second.startTime) ?? Infinity)
    )), [blocks]);
    const totalMinutes = useMemo(() => validBlocks.reduce((sum, block) => sum + Number(block.duration || 0), 0), [validBlocks]);
    const untitledCount = blocks.filter((block) => !block.title?.trim()).length;
    const hasDraft = validBlocks.length > 0;
    const todayKey = toLocalDateKey(new Date());

    const weekDays = useMemo(() => {
        const anchor = dateFromKey(dateKey);
        const mondayOffset = (anchor.getDay() + 6) % 7;
        return Array.from({ length: 7 }, (_, index) => {
            const key = shiftDateKey(dateKey, index - mondayOffset);
            const date = dateFromKey(key);
            return {
                key,
                weekday: date.toLocaleDateString([], { weekday: 'narrow' }),
                day: date.getDate(),
                busy: getScheduleItemsForDate(events, date).length > 0
            };
        });
    }, [dateKey, events]);

    const conflicts = useMemo(() => {
        const result = new Map();
        blocks.forEach((block) => {
            const span = blockSpan(block);
            if (!span) return;
            const existing = existingBlocks.find((item) => {
                const other = blockSpan(item);
                return other && overlaps(span, other);
            });
            if (existing) {
                result.set(block.id, existing.title);
                return;
            }
            const sibling = blocks.find((item) => {
                const other = item.id !== block.id && blockSpan(item);
                return other && overlaps(span, other);
            });
            if (sibling) result.set(block.id, sibling.title?.trim() || 'another block');
        });
        return result;
    }, [blocks, existingBlocks]);

    const revealBlock = (id) => {
        setPane('blocks');
        setExpandedId(id);
        window.requestAnimationFrame(() => {
            listRef.current?.querySelector(`[data-block-id="${CSS.escape(id)}"]`)
                ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        });
    };

    const replaceDraft = (nextBlocks, sourceLabel) => {
        const cleanBlocks = sanitizeMagicTemplateBlocks(nextBlocks);
        if (!cleanBlocks.length) {
            toast(`No usable blocks found in ${sourceLabel}.`, { tone: 'error' });
            return false;
        }
        if (hasDraft && !confirmAction('Replace the current day draft with this starting point?')) return false;
        setBlocks(cleanBlocks);
        setExpandedId(null);
        setAssistantMessage(null);
        return true;
    };

    const addBlockAt = (startMinutes) => {
        const block = createCraftBlock(timeFromMinutes(startMinutes), Math.min(60, 1440 - startMinutes));
        setBlocks((items) => [...items, block]);
        setFocusId(block.id);
        revealBlock(block.id);
    };

    const addBlock = () => {
        const latestEnd = blocks.reduce((max, block) => {
            const span = blockSpan(block);
            return span ? Math.max(max, span.end) : max;
        }, 0);
        const firstFree = latestEnd || (dateKey === todayKey
            ? Math.ceil((new Date().getHours() * 60 + new Date().getMinutes()) / 30) * 30
            : 540);
        addBlockAt(Math.min(firstFree, 1380));
    };

    const updateBlock = (id, updates) => setBlocks((items) => (
        items.map((block) => block.id === id ? { ...block, ...updates } : block)
    ));

    const removeBlock = (id) => {
        setBlocks((items) => items.filter((item) => item.id !== id));
        if (expandedId === id) setExpandedId(null);
    };

    const clearDraft = () => {
        if (!blocks.length) return;
        if (hasDraft && !confirmAction('Clear every block in this draft?')) return;
        setBlocks([]);
        setExpandedId(null);
    };

    const applyTemplate = (template) => {
        if (replaceDraft(template.blocks, `template “${template.name}”`)) setSource(null);
    };

    const copyFrom = (key) => {
        const sourceBlocks = blocksForDate(key);
        if (!sourceBlocks.length) {
            toast(`Nothing is scheduled on ${formatDate(key)}.`, { tone: 'error' });
            return;
        }
        if (replaceDraft(sourceBlocks, `the day of ${formatDate(key)}`)) setSource(null);
    };

    const openDatePicker = () => {
        const input = datePickerRef.current;
        if (!input) return;
        try {
            input.showPicker();
        } catch {
            input.focus();
        }
    };

    const draftWithAssistant = async () => {
        if (assistantBusy) return;
        const request = assistantInput.trim() || 'Create a balanced day with focused work, useful breaks, and room to breathe.';
        const userMessage = { id: createScheduleId('craft-message'), role: 'user', content: request };
        setAssistantBusy(true);
        setAssistantMessage(null);
        try {
            const response = await sendChatMessage(
                `Draft a one-time schedule for ${dateKey}. ${request} Return a single plan_day action for exactly this date. Do not apply or save anything.`,
                [userMessage],
                {
                    tasks,
                    allScheduleItems: events,
                    recentSchedule: events,
                    scheduleTemplates: templates,
                    scheduleIntent: 'add',
                    scheduleScope: `Draft schedule blocks for ${dateKey} only. Never write directly; return a plan_day draft for the editor.`
                },
                selectedAIProvider,
                { enableThinking: selectedAIProvider === 'local' && localThinkingEnabled }
            );
            const actions = Array.isArray(response?.actions) ? response.actions : [];
            const plan = actions.find((action) => action?.type === 'plan_day');
            const proposedBlocks = plan?.params?.blocks?.length
                ? plan.params.blocks
                : actions
                    .filter((action) => action?.type === 'add_schedule')
                    .map((action) => action.params || {});
            const draftedBlocks = sanitizeMagicTemplateBlocks(proposedBlocks.map(assistantBlock));
            if (!draftedBlocks.length) throw new Error('The assistant did not return any usable schedule blocks.');
            if (replaceDraft(draftedBlocks, 'the assistant draft')) {
                setAssistantMessage({
                    tone: 'success',
                    text: `Drafted ${draftedBlocks.length} block${draftedBlocks.length === 1 ? '' : 's'}. Nothing is saved until you review.`
                });
            }
        } catch (error) {
            setAssistantMessage({ tone: 'error', text: error.message || 'The schedule assistant is unavailable right now.' });
        } finally {
            setAssistantBusy(false);
        }
    };

    const preview = () => {
        if (!validBlocks.length) {
            toast('Give at least one block a title and time before reviewing.', { tone: 'error' });
            return;
        }
        onPreview?.({ dateKey, blocks: validBlocks });
    };

    const copyOptions = [
        { id: 'yesterday', label: 'Yesterday', key: shiftDateKey(dateKey, -1) },
        { id: 'last-week', label: `Last ${formatDate(dateKey, { weekday: 'long' })}`, key: shiftDateKey(dateKey, -7) }
    ].map((option) => ({ ...option, count: blocksForDate(option.key).length }));
    const copyDateCount = blocksForDate(copyDate).length;

    const sources = [
        { id: 'template', label: 'Template', icon: FileText },
        { id: 'copy', label: 'Another day', icon: Copy },
        { id: 'assistant', label: 'Assistant', icon: Sparkles }
    ];

    const summary = hasDraft
        ? `${validBlocks.length} block${validBlocks.length === 1 ? '' : 's'} · ${formatDuration(totalMinutes)}`
        : 'Nothing planned yet';

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Craft a day"
            className="magic-day-craft-sheet"
            actions={(
                <RowMenu
                    variant="plain"
                    label="More options"
                    items={[
                        ...(dateKey !== todayKey ? [{ label: 'Go to today', icon: CalendarDays, onSelect: () => setDateKey(todayKey) }] : []),
                        { label: 'Clear draft', icon: Trash2, destructive: true, onSelect: clearDraft }
                    ]}
                />
            )}
        >
            <div className="craft">
                <header className="craft-date">
                    <div className="craft-date__top">
                        <div className="craft-date__title">
                            <strong>{formatDate(dateKey)}</strong>
                            <span>
                                {dateKey === todayKey ? 'Today · ' : ''}
                                {existingBlocks.length
                                    ? `${existingBlocks.length} already scheduled`
                                    : 'One-time plan'}
                            </span>
                        </div>
                        <div className="craft-date__nav">
                            <button type="button" onClick={() => setDateKey(shiftDateKey(dateKey, -7))} aria-label="Previous week">
                                <ChevronLeft size={19} aria-hidden="true" />
                            </button>
                            <button type="button" onClick={openDatePicker} aria-label="Pick a date">
                                <CalendarDays size={17} aria-hidden="true" />
                            </button>
                            <button type="button" onClick={() => setDateKey(shiftDateKey(dateKey, 7))} aria-label="Next week">
                                <ChevronRight size={19} aria-hidden="true" />
                            </button>
                            <input
                                ref={datePickerRef}
                                type="date"
                                className="craft-date__picker"
                                value={dateKey}
                                onChange={(event) => event.target.value && setDateKey(event.target.value)}
                                tabIndex={-1}
                                aria-hidden="true"
                            />
                        </div>
                    </div>
                    <div className="craft-week" role="radiogroup" aria-label="Day to plan">
                        {weekDays.map((day) => (
                            <button
                                key={day.key}
                                type="button"
                                role="radio"
                                aria-checked={day.key === dateKey}
                                aria-label={formatDate(day.key)}
                                className={`craft-week__day${day.key === dateKey ? ' is-selected' : ''}${day.key === todayKey ? ' is-today' : ''}`}
                                onClick={() => setDateKey(day.key)}
                            >
                                <span>{day.weekday}</span>
                                <strong>{day.day}</strong>
                                <i className={day.busy ? 'is-busy' : ''} aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                </header>

                <SegmentedControl
                    className="craft-panes"
                    items={PANES}
                    value={pane}
                    onChange={setPane}
                    ariaLabel="Craft a day view"
                />

                <div className="craft-layout" data-pane={pane}>
                    <section className="craft-layout__timeline" aria-label="Day timeline">
                        <DayTimeline
                            open={open}
                            visible={pane === 'timeline'}
                            dateKey={dateKey}
                            blocks={blocks}
                            existingBlocks={existingBlocks}
                            activeId={expandedId}
                            onSelect={revealBlock}
                            onCreateAt={addBlockAt}
                        />
                        <p className="craft-hint">
                            {existingBlocks.length
                                ? <><i className="craft-hint__existing" aria-hidden="true" />Already scheduled · tap an open slot to add a block</>
                                : 'Tap an open slot to add a block'}
                        </p>
                    </section>

                    <section className="craft-layout__blocks" aria-label="Blocks">
                        <div className="craft-sources">
                            <span className="craft-sources__label">Start from</span>
                            <div className="craft-sources__chips">
                                {sources.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <button
                                            key={item.id}
                                            type="button"
                                            className={`craft-chip${source === item.id ? ' is-selected' : ''}`}
                                            aria-expanded={source === item.id}
                                            onClick={() => setSource((current) => current === item.id ? null : item.id)}
                                        >
                                            <Icon size={15} aria-hidden="true" /> {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {source === 'template' && (
                            <div className="craft-panel">
                                {templates.length ? (
                                    <div className="form-group">
                                        {templates.map((template) => (
                                            <button key={template.id} type="button" className="form-field form-option" onClick={() => applyTemplate(template)}>
                                                <span className="form-goal">{template.name}</span>
                                                <span className="form-option__detail">
                                                    {template.blocks?.length || 0} block{template.blocks?.length === 1 ? '' : 's'}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="craft-panel__empty">No saved templates yet. Save one from Plan with New Template.</p>
                                )}
                            </div>
                        )}

                        {source === 'copy' && (
                            <div className="craft-panel">
                                <div className="form-group">
                                    {copyOptions.map((option) => (
                                        <button
                                            key={option.id}
                                            type="button"
                                            className="form-field form-option"
                                            disabled={!option.count}
                                            onClick={() => copyFrom(option.key)}
                                        >
                                            <span className="form-goal">
                                                {option.label}
                                                <small>{formatDate(option.key, { month: 'short', day: 'numeric' })}</small>
                                            </span>
                                            <span className="form-option__detail">
                                                {option.count ? `${option.count} block${option.count === 1 ? '' : 's'}` : 'Empty'}
                                            </span>
                                        </button>
                                    ))}
                                    <div className="form-field form-field--value">
                                        <span className="form-field__label">Other day</span>
                                        <input type="date" value={copyDate} onChange={(event) => setCopyDate(event.target.value)} aria-label="Day to copy" />
                                        <button
                                            type="button"
                                            className="craft-panel__inline"
                                            disabled={!copyDateCount}
                                            onClick={() => copyFrom(copyDate)}
                                        >
                                            Copy
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {source === 'assistant' && (
                            <div className="craft-panel">
                                <div className="craft-composer">
                                    <textarea
                                        value={assistantInput}
                                        onChange={(event) => setAssistantInput(event.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) draftWithAssistant();
                                        }}
                                        placeholder="Describe the day you want…"
                                        rows={2}
                                        aria-label="Describe the day for the assistant"
                                    />
                                    <button
                                        type="button"
                                        className="craft-composer__send"
                                        disabled={assistantBusy}
                                        onClick={draftWithAssistant}
                                        aria-label="Draft with assistant"
                                    >
                                        {assistantBusy ? <span className="craft-spinner" aria-hidden="true" /> : <ArrowUp size={18} strokeWidth={2.6} aria-hidden="true" />}
                                    </button>
                                </div>
                                {!assistantInput.trim() && !assistantBusy && (
                                    <div className="craft-suggestions">
                                        {SUGGESTIONS.map((suggestion) => (
                                            <button key={suggestion} type="button" className="craft-chip craft-chip--quiet" onClick={() => setAssistantInput(suggestion)}>
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                                <p className={`form-note${assistantMessage ? ` is-${assistantMessage.tone}` : ''}`} aria-live="polite">
                                    {assistantBusy
                                        ? 'Drafting around your existing schedule…'
                                        : assistantMessage?.text || 'Drafts appear below. Nothing is saved until you review.'}
                                </p>
                            </div>
                        )}

                        {sortedBlocks.length ? (
                            <ul className="craft-blocks" ref={listRef}>
                                {sortedBlocks.map((block) => (
                                    <BlockCard
                                        key={block.id}
                                        block={block}
                                        open={expandedId === block.id}
                                        conflict={conflicts.get(block.id)}
                                        autoFocus={focusId === block.id}
                                        onToggle={() => setExpandedId((current) => current === block.id ? null : block.id)}
                                        onChange={(updates) => updateBlock(block.id, updates)}
                                        onRemove={() => removeBlock(block.id)}
                                    />
                                ))}
                            </ul>
                        ) : (
                            <div className="craft-empty">
                                <strong>Shape your day</strong>
                                <span>Add blocks one by one, or start from a template, another day, or the assistant.</span>
                            </div>
                        )}

                        <button type="button" className="craft-add" onClick={addBlock}>
                            <Plus size={18} strokeWidth={2.4} aria-hidden="true" /> Add block
                        </button>
                    </section>
                </div>

                <footer className="craft-footer">
                    <div className="craft-footer__summary" aria-live="polite">
                        <strong>{summary}</strong>
                        {untitledCount > 0 && (
                            <span>{untitledCount} block{untitledCount === 1 ? ' needs' : 's need'} a title</span>
                        )}
                    </div>
                    <button type="button" className="ui-button ui-button--accent" disabled={!hasDraft || assistantBusy} onClick={preview}>
                        Review day
                    </button>
                </footer>
            </div>
        </Sheet>
    );
};

export default MagicDayCraftEditor;
