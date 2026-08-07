import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
    Bot,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    CircleHelp,
    Clock3,
    LayoutTemplate,
    Loader2,
    Mic,
    MoreHorizontal,
    Pencil,
    Plus,
    Redo2,
    Repeat2,
    Send,
    Sparkles,
    Trash2,
    Undo2,
    Unlink,
    Upload,
    WandSparkles,
    X
} from 'lucide-react';
import ScheduleEventModal from '../ScheduleEventModal';
import MagicTemplateEditor, { TimelinePreview } from './MagicTemplateEditor';
import MagicConflictSheet from './MagicConflictSheet';
import { useScheduleTemplates } from '../../context/ScheduleTemplateContext';
import { useChatContext } from '../../context/ChatContext';
import { sendChatMessage } from '../../services/ConversationService';
import { parseScheduleCommand, parseScheduleImage } from '../../services/aiClient';
import {
    autoFitTemplateItems,
    buildFutureTemplateUpdateSteps,
    buildTemplateSchedulePayloads,
    createScheduleId,
    detectScheduleConflicts,
    getScheduleOverlapLayout,
    removeConflictingProposals,
    SCHEDULE_ITEM_KINDS,
    timeFromMinutes
} from '../../services/magicSchedule';
import {
    buildScheduleAssistantMutationPlan,
    isScheduleAssistantWriteAction,
    normalizeScheduleAssistantActions,
    resolveTemplate
} from '../../services/agentScheduleActions';
import { getScheduleItemsForDate, toLocalDateKey, upsertOverride } from '../../utils/scheduleOccurrences';
import { hasExceededDragThreshold } from '../../utils/pointerGestures';
import { useScheduleTransactions } from '../../hooks/useScheduleTransactions';
import { toast } from '../../ui/Toast';
import { Sheet } from '../../ui';
import { confirmAction } from '../../utils/confirm';
import './magic-schedule.css';

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 72;
const DAY_MINUTES = (END_HOUR - START_HOUR) * 60;
const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const SCHEDULE_ASSISTANT_INTENTS = [
    { id: 'add', label: 'Add', icon: Plus, hint: 'Create a new block or template' },
    { id: 'delete', label: 'Delete', icon: Trash2, hint: 'Remove an existing block' },
    { id: 'modify', label: 'Modify', icon: Pencil, hint: 'Move, resize, or rename a block' },
    { id: 'ask', label: 'Ask', icon: CircleHelp, hint: 'Get schedule advice or an explanation' }
];
const mondayFor = (input) => {
    const date = new Date(input);
    date.setHours(12, 0, 0, 0);
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    return date;
};

const formatRange = (dates) => {
    const first = dates[0];
    const last = dates.at(-1);
    const sameMonth = first.getMonth() === last.getMonth();
    return sameMonth
        ? `${first.toLocaleDateString([], { month: 'long' })} ${first.getDate()}–${last.getDate()}, ${last.getFullYear()}`
        : `${first.toLocaleDateString([], { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

const itemStart = (item) => new Date(item.displayTime || item.startTime || item.start_time || item.deadline);
const itemDuration = (item) => Number(item.duration || item.estimatedTime || item.estimated_time || 60);
const itemKind = (item) => item.itemKind || item.item_kind || SCHEDULE_ITEM_KINDS.EVENT;
const parentId = (item) => item.parentItemId || item.parent_item_id || null;
const recurrenceType = (item) => item.recurrenceType || item.recurrence_type || 'none';

const timeLabel = (date) => new Date(date).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
const rangeLabel = (item) => {
    const start = itemStart(item);
    const end = new Date(start.getTime() + itemDuration(item) * 60000);
    return `${timeLabel(start)} – ${timeLabel(end)}`;
};

const useMobileTimeline = () => {
    const [mobile, setMobile] = useState(() => (
        typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches
    ));
    useEffect(() => {
        const query = window.matchMedia('(max-width: 760px)');
        const update = () => setMobile(query.matches);
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);
    return mobile;
};

const occurrenceToTemplateBlocksV2 = (occurrences) => {
    const childrenByParent = new Map();
    occurrences.forEach((item) => {
        const linkedParent = parentId(item);
        if (!linkedParent) return;
        const entries = childrenByParent.get(String(linkedParent)) || [];
        entries.push(item);
        childrenByParent.set(String(linkedParent), entries);
    });
    return occurrences
        .filter((item) => !parentId(item))
        .map((item) => {
            const start = itemStart(item);
            return {
                id: item.templateBlockId || item.template_block_id || createScheduleId('block'),
                kind: itemKind(item),
                title: item.title,
                startTime: start.toTimeString().slice(0, 5),
                duration: itemDuration(item),
                category: item.category || 'Other',
                color: item.color || '#6366f1',
                notes: item.notes || '',
                children: (childrenByParent.get(String(item.id)) || []).map((child) => {
                    const childStart = itemStart(child);
                    return {
                        id: child.templateBlockId || child.template_block_id || createScheduleId('child'),
                        title: child.title,
                        startTime: childStart.toTimeString().slice(0, 5),
                        duration: itemDuration(child),
                        category: child.category || 'Other',
                        color: child.color || '#6366f1',
                        notes: child.notes || ''
                    };
                })
            };
        });
};

const MagicSchedule = ({
    events = [],
    tasks = [],
    onAddEvent,
    onUpdateEvent,
    onDeleteEvent
}) => {
    const mobile = useMobileTimeline();
    const { templates, saveTemplate, deleteTemplate } = useScheduleTemplates();
    const { selectedAIProvider, localThinkingEnabled } = useChatContext();
    const [anchorDate, setAnchorDate] = useState(() => new Date());
    const [selectedDate, setSelectedDate] = useState(() => new Date());
    const [selectedItem, setSelectedItem] = useState(null);
    const [modal, setModal] = useState(null);
    const [templateEditor, setTemplateEditor] = useState(null);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);
    const [applyMode, setApplyMode] = useState('once');
    const [repeatDays, setRepeatDays] = useState([]);
    const [repeatEndDate, setRepeatEndDate] = useState('');
    const [review, setReview] = useState(null);
    const [futureUpdateReview, setFutureUpdateReview] = useState(null);
    const [showApplyOptions, setShowApplyOptions] = useState(false);
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
    const [assistantInput, setAssistantInput] = useState('');
    const [assistantIntent, setAssistantIntent] = useState(null);
    const [assistantMessages, setAssistantMessages] = useState([]);
    const [assistantBusy, setAssistantBusy] = useState(false);
    const [pendingAssistantActions, setPendingAssistantActions] = useState(null);
    const [drag, setDrag] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [now, setNow] = useState(() => new Date());
    const recognitionRef = useRef(null);
    const fileInputRef = useRef(null);
    const canvasRef = useRef(null);
    const canvasScrollRef = useRef(null);
    const autoScrolledViewRef = useRef(null);
    const touchStartXRef = useRef(null);

    const transactions = useScheduleTransactions({
        addScheduleItem: onAddEvent,
        updateScheduleItem: onUpdateEvent,
        deleteScheduleItem: onDeleteEvent,
        restoreScheduleItem: onAddEvent
    });

    const weekDates = useMemo(() => {
        const monday = mondayFor(anchorDate);
        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            return date;
        });
    }, [anchorDate]);

    const visibleDates = mobile ? [selectedDate] : weekDates;
    const selectedDateKey = toLocalDateKey(selectedDate);
    const todayKey = toLocalDateKey(now);
    const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
    const currentTimeTop = ((currentTimeMinutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
    const selectedTemplate = templates.find((template) => String(template.id) === String(selectedTemplateId)) || null;

    useEffect(() => {
        if (!selectedTemplateId && templates[0]) setSelectedTemplateId(templates[0].id);
    }, [selectedTemplateId, templates]);

    useEffect(() => {
        const updateNow = () => setNow(new Date());
        const interval = window.setInterval(updateNow, 60_000);
        return () => window.clearInterval(interval);
    }, []);

    useLayoutEffect(() => {
        const visibleDateKeys = mobile
            ? [selectedDateKey]
            : weekDates.map((date) => toLocalDateKey(date));
        if (
            !visibleDateKeys.includes(todayKey)
            || currentTimeMinutes < START_HOUR * 60
            || currentTimeMinutes > END_HOUR * 60
        ) {
            autoScrolledViewRef.current = null;
            return undefined;
        }
        const viewKey = `${mobile ? 'day' : 'week'}:${visibleDateKeys.join(',')}:${todayKey}`;
        const initialScrollContainer = canvasScrollRef.current;
        const targetTop = initialScrollContainer
            ? Math.max(0, currentTimeTop - initialScrollContainer.clientHeight * 0.3)
            : 0;
        if (
            autoScrolledViewRef.current === viewKey
            && initialScrollContainer
            && Math.abs(initialScrollContainer.scrollTop - targetTop) < 4
        ) return undefined;
        autoScrolledViewRef.current = viewKey;
        let nestedFrame;
        let retryTimeout;
        const scrollToCurrentTime = () => {
            const scrollContainer = canvasScrollRef.current;
            if (!scrollContainer) return;
            scrollContainer.scrollTop = Math.max(0, currentTimeTop - scrollContainer.clientHeight * 0.3);
        };
        const frame = window.requestAnimationFrame(() => {
            nestedFrame = window.requestAnimationFrame(() => {
                scrollToCurrentTime();
                retryTimeout = window.setTimeout(scrollToCurrentTime, 250);
            });
        });
        return () => {
            window.cancelAnimationFrame(frame);
            if (nestedFrame) window.cancelAnimationFrame(nestedFrame);
            if (retryTimeout) window.clearTimeout(retryTimeout);
        };
    }, [
        currentTimeMinutes,
        currentTimeTop,
        events.length,
        mobile,
        selectedDateKey,
        templates.length,
        todayKey,
        weekDates
    ]);

    const daySchedule = useMemo(() => getScheduleItemsForDate(events, selectedDate), [events, selectedDate]);
    const currentDayBlocks = useMemo(() => occurrenceToTemplateBlocksV2(daySchedule), [daySchedule]);

    const itemsForDate = useCallback((date) => {
        const dateKey = toLocalDateKey(date);
        return getScheduleItemsForDate(events, date).map((item) => ({
            ...item,
            _type: 'schedule',
            _dateKey: dateKey
        }));
    }, [events]);

    const selectedChildren = useMemo(() => {
        if (!selectedItem || itemKind(selectedItem) !== SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL) return [];
        return daySchedule.filter((item) => String(parentId(item)) === String(selectedItem.id));
    }, [daySchedule, selectedItem]);

    const navigateWeek = (amount) => {
        const next = new Date(anchorDate);
        next.setDate(next.getDate() + amount * 7);
        setAnchorDate(next);
        setSelectedDate(mondayFor(next));
    };

    const shiftMobileDay = (amount) => {
        const index = weekDates.findIndex((date) => toLocalDateKey(date) === selectedDateKey);
        const nextIndex = index + amount;
        if (nextIndex >= 0 && nextIndex < weekDates.length) {
            setSelectedDate(weekDates[nextIndex]);
            return;
        }
        const nextAnchor = new Date(anchorDate);
        nextAnchor.setDate(nextAnchor.getDate() + (amount > 0 ? 7 : -7));
        const nextWeek = mondayFor(nextAnchor);
        const nextDate = new Date(nextWeek);
        if (amount < 0) nextDate.setDate(nextWeek.getDate() + 6);
        setAnchorDate(nextAnchor);
        setSelectedDate(nextDate);
    };

    const openQuickAdd = (date, startMinutes, duration = 60, options = {}) => {
        setSelectedDate(date);
        setModal({
            event: null,
            selectedDate: date,
            defaults: {
                startTime: timeFromMinutes(startMinutes),
                duration,
                ...options.defaults
            },
            itemKind: options.itemKind || SCHEDULE_ITEM_KINDS.EVENT,
            parentItemId: options.parentItemId || null,
            parent: options.parent || null
        });
    };

    const saveModal = async (payload) => {
        if (payload.id) {
            const before = events.find((item) => item.id === payload.id);
            return transactions.runBatch([{
                type: 'update',
                id: payload.id,
                updates: payload,
                before
            }], `Edited ${payload.title || before?.title || 'event'}`);
        }
        const parent = modal?.parent;
        const inherited = parent ? {
            recurrenceType: recurrenceType(parent),
            recurrenceInterval: parent.recurrenceInterval || parent.recurrence_interval || 1,
            recurrenceDaysOfWeek: parent.recurrenceDaysOfWeek || parent.recurrence_days_of_week || [],
            recurrenceEndDate: parent.recurrenceEndDate || parent.recurrence_end_date || null
        } : {};
        return transactions.runBatch([{
            type: 'create',
            payload: { ...payload, ...inherited }
        }], `Added ${payload.title}`);
    };

    const deleteSelected = async (mode = 'event') => {
        if (!selectedItem) return;
        const steps = [];
        if (itemKind(selectedItem) === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL) {
            if (mode === 'delete_children') {
                selectedChildren.forEach((child) => steps.push({ type: 'delete', item: child }));
            } else if (mode === 'detach_children') {
                selectedChildren.forEach((child) => steps.push({
                    type: 'update',
                    id: child.id,
                    updates: { parentItemId: null },
                    before: child
                }));
            }
        }
        steps.push({ type: 'delete', item: selectedItem });
        await transactions.runBatch(steps, `Deleted ${selectedItem.title}`);
        setSelectedItem(null);
    };

    const beginApplyTemplate = (template = selectedTemplate, options = {}) => {
        if (!template) return;
        const mode = options.mode || applyMode;
        const applicationDateKey = options.date || selectedDateKey;
        const activeRepeatDays = mode === 'repeat' ? repeatDays : [];
        const requestedRepeatDays = mode === 'repeat' && Array.isArray(options.repeatDays)
            ? options.repeatDays
            : activeRepeatDays;
        const activeEndDate = options.endDate !== undefined ? options.endDate : repeatEndDate;
        const proposals = buildTemplateSchedulePayloads(template, {
            date: applicationDateKey,
            repeatDays: requestedRepeatDays,
            endDate: mode === 'repeat' ? (activeEndDate || null) : null
        });
        const reviewEndDate = mode === 'repeat' && requestedRepeatDays.length
            ? (activeEndDate || undefined)
            : applicationDateKey;
        const conflicts = detectScheduleConflicts({
            proposedItems: proposals,
            scheduleItems: events,
            tasks,
            startDate: applicationDateKey,
            endDate: reviewEndDate
        });
        const autoFitProposals = autoFitTemplateItems(proposals, conflicts, 15, {
            scheduleItems: events,
            tasks,
            startDate: applicationDateKey,
            endDate: reviewEndDate
        });
        const autoFitConflicts = detectScheduleConflicts({
            proposedItems: autoFitProposals,
            scheduleItems: events,
            tasks,
            startDate: applicationDateKey,
            endDate: reviewEndDate
        });
        setReview({
            template,
            proposals,
            conflicts,
            autoFitProposals,
            autoFitConflicts
        });
    };

    const applyReviewedTemplate = async (resolution) => {
        if (!review) return;
        let proposals = review.proposals;
        const steps = [];
        if (resolution === 'skip') {
            proposals = removeConflictingProposals(proposals, review.conflicts);
        }
        if (resolution === 'auto_fit') {
            proposals = review.autoFitProposals || autoFitTemplateItems(proposals, review.conflicts);
        }
        if (resolution === 'replace') {
            const seen = new Set();
            review.conflicts.forEach((conflict) => {
                if (conflict.existing.source !== 'schedule') return;
                const existing = conflict.existing.item;
                const key = recurrenceType(existing) !== 'none'
                    ? `${existing.id}-${conflict.dateKey}`
                    : String(existing.id);
                if (seen.has(key)) return;
                seen.add(key);
                steps.push({
                    type: 'delete',
                    item: events.find((item) => item.id === existing.id) || existing,
                    options: recurrenceType(existing) !== 'none' ? { occurrenceDate: conflict.dateKey } : undefined
                });
            });
        }
        proposals.forEach((payload) => steps.push({ type: 'create', payload }));
        try {
            await transactions.runBatch(steps, `Applied ${review.template.name}`);
            toast(`Applied “${review.template.name}”.`, { tone: 'success' });
            setReview(null);
            setShowApplyOptions(false);
        } catch (error) {
            toast(error.message || 'Could not apply this template. No partial changes were kept.', { tone: 'error' });
        }
    };

    const handleImageImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setAssistantBusy(true);
        try {
            const parsed = await parseScheduleImage(file);
            const template = {
                id: 'image-import',
                name: 'Imported schedule',
                version: 1,
                blocks: (parsed || []).map((item) => ({
                    id: createScheduleId('imported'),
                    kind: SCHEDULE_ITEM_KINDS.EVENT,
                    title: item.activity,
                    startTime: item.startTime || '09:00',
                    duration: item.duration || 60,
                    category: item.category || 'Other',
                    color: item.color || '#6366f1',
                    children: []
                }))
            };
            if (!template.blocks.length) throw new Error('No schedule blocks were found in that image.');
            beginApplyTemplate(template, { mode: 'once' });
        } catch (error) {
            toast(error.message || 'Could not read that schedule image.', { tone: 'error' });
        } finally {
            setAssistantBusy(false);
            event.target.value = '';
        }
    };

    const handleVoice = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast('Voice recognition is not supported in this browser.', { tone: 'error' });
            return;
        }
        if (isListening) {
            recognitionRef.current?.stop();
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onresult = async (result) => {
            setAssistantBusy(true);
            try {
                const parsed = await parseScheduleCommand(result.results[0][0].transcript);
                if (!parsed) throw new Error('I could not understand that schedule request.');
                setPendingAssistantActions([{
                    type: 'add_schedule',
                    params: parsed,
                    explanation: `Add ${parsed.title}`
                }]);
                setAssistantMessages((messages) => [...messages, {
                    role: 'assistant',
                    content: `I understood: add “${parsed.title}” at ${timeLabel(parsed.startTime)}. Review and confirm below.`
                }]);
                setAssistantOpen(true);
            } catch (error) {
                toast(error.message, { tone: 'error' });
            } finally {
                setAssistantBusy(false);
            }
        };
        recognitionRef.current = recognition;
        recognition.start();
    };

    const sendAssistantMessage = async () => {
        const prompt = assistantInput.trim();
        if (!prompt || assistantBusy) return;
        const userMessage = { id: createScheduleId('message'), role: 'user', content: prompt };
        const nextMessages = [...assistantMessages, userMessage];
        setAssistantMessages(nextMessages);
        setAssistantInput('');
        setAssistantBusy(true);
        try {
            const response = await sendChatMessage(prompt, nextMessages, {
                tasks,
                allScheduleItems: events,
                recentSchedule: events,
                scheduleTemplates: templates,
                pendingActions: pendingAssistantActions,
                scheduleIntent: assistantIntent,
                scheduleScope: 'Read tasks, habits, projects, deadlines and preferences. Only write schedule items or schedule templates.'
            }, selectedAIProvider, {
                enableThinking: selectedAIProvider === 'local' && localThinkingEnabled
            });
            const actions = normalizeScheduleAssistantActions(
                Array.isArray(response.actions) ? response.actions : [],
                prompt
            );
            const rejected = actions.filter((action) => !isScheduleAssistantWriteAction(action.type)
                && !['info_response', 'clarify', 'analyze', 'navigate'].includes(action.type));
            const allowed = actions.filter((action) => isScheduleAssistantWriteAction(action.type));
            const info = actions.find((action) => ['info_response', 'clarify', 'analyze'].includes(action.type));
            const intentRequiresWrite = ['add', 'delete', 'modify'].includes(assistantIntent);
            const content = rejected.length
                ? `I can read that context, but this assistant only changes schedules and templates. ${response.summary || ''}`.trim()
                : allowed.length
                    ? `I prepared ${allowed.length} schedule change${allowed.length === 1 ? '' : 's'}. Review the preview below; nothing has changed yet.`
                    : intentRequiresWrite
                        ? 'I could not identify a safe schedule change from that message. Include the block name and time, then try again.'
                    : info?.params?.message || info?.params?.question || response.summary || 'Here is the schedule change I suggest.';
            setAssistantMessages((messages) => [...messages, { role: 'assistant', content }]);
            setPendingAssistantActions(allowed.length ? allowed : null);
        } catch (error) {
            setAssistantMessages((messages) => [...messages, { role: 'assistant', content: error.message || 'The schedule assistant is unavailable right now.' }]);
        } finally {
            setAssistantBusy(false);
        }
    };

    const confirmAssistantActions = async () => {
        if (!pendingAssistantActions?.length) return;
        const templateActions = [];
        for (const action of pendingAssistantActions) {
            const params = action.params || {};
            if (action.type === 'save_template' || action.type === 'delete_template') templateActions.push(action);
            if (action.type === 'apply_template') {
                const template = resolveTemplate(templates, params);
                if (template) {
                    setSelectedTemplateId(template.id);
                    const applicationDate = params.date || selectedDateKey;
                    const requestedRepeatDays = Array.isArray(params.repeatDays) ? params.repeatDays : [];
                    setSelectedDate(new Date(`${applicationDate}T12:00:00`));
                    setPendingAssistantActions(null);
                    beginApplyTemplate(template, {
                        date: applicationDate,
                        mode: requestedRepeatDays.length ? 'repeat' : 'once',
                        repeatDays: requestedRepeatDays,
                        endDate: params.endDate || null
                    });
                    return;
                }
            }
        }
        const { steps, unresolved } = buildScheduleAssistantMutationPlan(
            pendingAssistantActions,
            events
        );
        if (unresolved.length) {
            const reason = unresolved[0].reason;
            setPendingAssistantActions(null);
            setAssistantMessages((messages) => [...messages, {
                role: 'assistant',
                content: `I couldn't safely apply that change: ${reason} Please name the existing block and date, then try again.`
            }]);
            toast(reason, { tone: 'error' });
            return;
        }
        try {
            let appliedChanges = 0;
            if (steps.length) await transactions.runBatch(steps, 'Schedule assistant changes');
            appliedChanges += steps.length;
            for (const action of templateActions) {
                if (action.type === 'save_template') {
                    await saveTemplate(action.params);
                    appliedChanges += 1;
                }
                if (action.type === 'delete_template') {
                    const template = resolveTemplate(templates, action.params);
                    if (template) {
                        await deleteTemplate(template.id);
                        appliedChanges += 1;
                    }
                }
            }
            if (!appliedChanges) {
                throw new Error('No matching schedule or template change was found.');
            }
            setPendingAssistantActions(null);
            setAssistantMessages((messages) => [...messages, {
                role: 'assistant',
                content: `Done — applied ${appliedChanges} change${appliedChanges === 1 ? '' : 's'}. You can undo the schedule batch from the top bar.`
            }]);
        } catch (error) {
            toast(error.message || 'The schedule change failed and was rolled back.', { tone: 'error' });
        }
    };

    useEffect(() => () => recognitionRef.current?.stop?.(), []);

    useEffect(() => {
        if (!drag) return undefined;
        const handlePointerMove = (event) => {
            if (!drag.moved && !hasExceededDragThreshold(
                drag.originX,
                drag.originY,
                event.clientX,
                event.clientY
            )) return;
            const dateColumn = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-magic-date]');
            if (!dateColumn) return;
            const rect = dateColumn.getBoundingClientRect();
            const rawMinutes = START_HOUR * 60 + ((event.clientY - rect.top) / HOUR_HEIGHT) * 60;
            const snapped = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 15, Math.round(rawMinutes / 15) * 15));
            const date = new Date(`${dateColumn.dataset.magicDate}T12:00:00`);
            setDrag((current) => current ? { ...current, currentMinutes: snapped, currentDate: date, moved: true } : current);
        };
        const handlePointerUp = async () => {
            const current = drag;
            setDrag(null);
            if (!current?.moved) {
                if (current?.mode === 'create') openQuickAdd(current.currentDate, current.currentMinutes);
                return;
            }
            if (current.mode === 'create') {
                const start = Math.min(current.startMinutes, current.currentMinutes);
                const duration = Math.max(15, Math.abs(current.currentMinutes - current.startMinutes));
                openQuickAdd(current.currentDate, start, duration);
                return;
            }
            const item = current.item;
            if (!item) return;
            const targetDateKey = toLocalDateKey(current.currentDate);
            const currentDateKey = item._occurrenceDate || item._dateKey || toLocalDateKey(itemStart(item));
            const targetStartMinutes = current.mode === 'resize' ? current.startMinutes : current.currentMinutes;
            const nextStart = new Date(`${targetDateKey}T${timeFromMinutes(targetStartMinutes)}:00`);
            const updates = current.mode === 'resize'
                ? { duration: Math.max(15, current.currentMinutes - current.startMinutes) }
                : { startTime: nextStart.toISOString() };
            const linkedParent = parentId(item) ? events.find((candidate) => String(candidate.id) === String(parentId(item))) : null;
            if (linkedParent) {
                const parentOccurrence = getScheduleItemsForDate([linkedParent], current.currentDate)[0];
                const parentStart = parentOccurrence ? itemStart(parentOccurrence).getTime() : null;
                const parentEnd = parentStart == null ? null : parentStart + itemDuration(parentOccurrence) * 60000;
                const proposedEnd = nextStart.getTime() + Number(updates.duration || itemDuration(item)) * 60000;
                if (parentStart == null || nextStart.getTime() < parentStart || proposedEnd > parentEnd) {
                    if (!confirmAction('This move leaves the flexible shell. Detach it as a standalone event?')) return;
                    updates.parentItemId = null;
                }
            }
            if (recurrenceType(item) !== 'none' && targetDateKey === currentDateKey) {
                const override = current.mode === 'resize'
                    ? { duration: updates.duration }
                    : { startTime: timeFromMinutes(current.currentMinutes) };
                updates.recurrenceOverrides = upsertOverride(item, currentDateKey, override);
                delete updates.startTime;
                delete updates.duration;
            } else if (recurrenceType(item) !== 'none' && targetDateKey !== currentDateKey) {
                await transactions.runBatch([
                    { type: 'delete', item, options: { occurrenceDate: currentDateKey } },
                    {
                        type: 'create',
                        payload: {
                            ...item,
                            id: undefined,
                            startTime: nextStart.toISOString(),
                            recurrenceType: 'none',
                            recurrenceDaysOfWeek: [],
                            recurrenceEndDate: null,
                            parentItemId: updates.parentItemId ?? parentId(item)
                        }
                    }
                ], `Moved ${item.title}`);
                return;
            }
            await transactions.runBatch([{ type: 'update', id: item.id, updates, before: item }], `${current.mode === 'resize' ? 'Resized' : 'Moved'} ${item.title}`);
        };
        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp, { once: true });
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [drag, events, transactions]);

    const renderBlock = (item, date, overlapLayout) => {
        const start = itemStart(item);
        const minutes = start.getHours() * 60 + start.getMinutes();
        let top = ((minutes - START_HOUR * 60) / 60) * HOUR_HEIGHT;
        let height = Math.max(24, (itemDuration(item) / 60) * HOUR_HEIGHT);
        const shell = itemKind(item) === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL;
        const nested = Boolean(parentId(item));
        const lane = overlapLayout[String(item.id)] || { laneIndex: 0, laneCount: 1 };
        if (nested) {
            const parent = itemsForDate(date).find((candidate) => String(candidate.id) === String(parentId(item)));
            if (parent) {
                const parentStart = itemStart(parent);
                const parentMinutes = parentStart.getHours() * 60 + parentStart.getMinutes();
                if (parentMinutes === minutes) {
                    top += 26;
                    height = Math.max(24, height - 26);
                }
            }
        }
        if (minutes + itemDuration(item) < START_HOUR * 60 || minutes > END_HOUR * 60) return null;
        return (
            <button
                key={`${item._type}-${item.id}-${item._dateKey}`}
                type="button"
                className={`magic-event ${shell ? 'is-shell' : ''} ${nested ? 'is-nested' : ''} ${selectedItem?.id === item.id ? 'is-selected' : ''}`}
                style={{
                    top,
                    height,
                    '--event-lane-left': `${(lane.laneIndex / lane.laneCount) * 100}%`,
                    '--event-lane-width': `${100 / lane.laneCount}%`,
                    '--event-color': item.color || '#6366f1'
                }}
                onClick={(event) => {
                    event.stopPropagation();
                    setSelectedDate(date);
                    setSelectedItem(item);
                    setAssistantOpen(false);
                    setMobileInspectorOpen(true);
                }}
                onPointerDown={(event) => {
                    if (event.target.closest('.magic-event__resize')) return;
                    event.stopPropagation();
                    event.currentTarget.setPointerCapture?.(event.pointerId);
                    setDrag({
                        mode: 'move',
                        item,
                        startMinutes: minutes,
                        currentMinutes: minutes,
                        currentDate: date,
                        originX: event.clientX,
                        originY: event.clientY,
                        moved: false
                    });
                }}
                aria-label={`${shell ? 'Flexible shell' : nested ? 'Nested event' : 'Event'} ${item.title}, ${rangeLabel(item)}`}
            >
                <span className="magic-event__header">
                    <span className="magic-event__mark" aria-hidden="true" />
                    <span className="magic-event__title">{item.title}</span>
                </span>
                {height >= 42 && <span className="magic-event__time">{rangeLabel(item)}</span>}
                {shell && <span className="magic-event__badge">Flexible</span>}
                {nested && <span className="magic-event__badge">Nested</span>}
                <span
                    className="magic-event__resize"
                    onPointerDown={(event) => {
                        event.stopPropagation();
                        setDrag({
                            mode: 'resize',
                            item,
                            startMinutes: minutes,
                            currentMinutes: minutes + itemDuration(item),
                            currentDate: date,
                            originX: event.clientX,
                            originY: event.clientY,
                            moved: false
                        });
                    }}
                    aria-hidden="true"
                />
            </button>
        );
    };

    const quietSuggestion = useMemo(() => {
        const busyMinutes = daySchedule.reduce((sum, item) => sum + itemDuration(item), 0);
        if (!daySchedule.length) return 'This day is open. Try a template or ask the assistant to shape it.';
        if (busyMinutes > 600) return 'This is a dense day. Consider keeping one flexible recovery block.';
        return 'You still have room for one focused block without overpacking the day.';
    }, [daySchedule]);

    const linkedTemplate = selectedItem?.sourceTemplateId
        ? templates.find((template) => String(template.id) === String(selectedItem.sourceTemplateId))
        : null;
    const linkedTemplateIsNewer = Boolean(
        linkedTemplate
        && Number(linkedTemplate.version || 1) > Number(selectedItem?.sourceTemplateVersion || 1)
    );

    const prepareFutureTemplateUpdate = () => {
        if (!selectedItem || !linkedTemplate) return;
        const applicationId = selectedItem.templateApplicationId || selectedItem.template_application_id;
        const linkedItems = events.filter((item) => (
            applicationId
                ? String(item.templateApplicationId || item.template_application_id) === String(applicationId)
                : String(item.sourceTemplateId || item.source_template_id) === String(linkedTemplate.id)
        ));
        const steps = buildFutureTemplateUpdateSteps({
            template: linkedTemplate,
            applicationItems: linkedItems,
            cutoffDate: selectedDateKey
        });
        if (!steps.length) {
            toast('There are no linked future repeats to update.', { tone: 'error' });
            return;
        }
        setFutureUpdateReview({
            template: linkedTemplate,
            linkedItems,
            steps,
            cutoffDate: selectedDateKey
        });
    };

    return (
        <div className="magic-schedule">
            <header className="magic-header">
                <div>
                    <span className="magic-eyebrow"><Sparkles size={15} /> Magic Schedule</span>
                    <h2>{mobile ? selectedDate.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' }) : formatRange(weekDates)}</h2>
                    <p>Click, drag, resize—or ask the schedule assistant.</p>
                </div>
                <div className="magic-header__actions">
                    <button type="button" className="magic-icon-button" onClick={() => navigateWeek(-1)} aria-label="Previous week"><ChevronLeft size={18} /></button>
                    <button type="button" className="magic-secondary-button" onClick={() => { setAnchorDate(new Date()); setSelectedDate(new Date()); }}>Today</button>
                    <button type="button" className="magic-icon-button" onClick={() => navigateWeek(1)} aria-label="Next week"><ChevronRight size={18} /></button>
                    <button
                        type="button"
                        className="magic-secondary-button"
                        disabled={!transactions.canUndo || transactions.isRunning}
                        onClick={async () => {
                            await transactions.undo();
                            toast('Last schedule batch undone.', { tone: 'success' });
                        }}
                        title={transactions.undoLabel}
                    >
                        <Undo2 size={16} /> Undo
                    </button>
                    <div className="magic-add-menu-wrap">
                        <button type="button" className="magic-primary-button" onClick={() => setShowAddMenu((value) => !value)}>
                            <Plus size={17} /> Add
                        </button>
                        {showAddMenu && (
                            <div className="magic-add-menu">
                                <button type="button" onClick={() => { openQuickAdd(selectedDate, 9 * 60); setShowAddMenu(false); }}><Clock3 size={16} /> New event</button>
                                <button type="button" onClick={() => { openQuickAdd(selectedDate, 9 * 60, 180, { itemKind: SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL }); setShowAddMenu(false); }}><LayoutTemplate size={16} /> Flexible shell</button>
                                <button type="button" onClick={() => fileInputRef.current?.click()}><Upload size={16} /> Import image / camera</button>
                                <button type="button" onClick={handleVoice}><Mic size={16} /> {isListening ? 'Listening…' : 'Voice schedule'}</button>
                            </div>
                        )}
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleImageImport} hidden />
                </div>
            </header>

            <section className="magic-template-gallery" aria-label="Schedule templates">
                <button type="button" className="magic-template-card is-new" onClick={() => setTemplateEditor({})}>
                    <Plus size={20} />
                    <strong>New template</strong>
                    <span>One sheet, one save</span>
                </button>
                {templates.map((template) => (
                    <button
                        type="button"
                        key={template.id}
                        className={`magic-template-card ${String(selectedTemplateId) === String(template.id) ? 'is-selected' : ''}`}
                        onClick={() => {
                            setSelectedTemplateId(template.id);
                            setApplyMode('once');
                            setRepeatDays([]);
                            setRepeatEndDate('');
                            setShowApplyOptions(true);
                        }}
                    >
                        <div className="magic-template-card__top">
                            <strong>{template.name}</strong>
                            <MoreHorizontal size={16} />
                        </div>
                        <TimelinePreview blocks={template.blocks} />
                        <span>{template.blocks.length} block{template.blocks.length === 1 ? '' : 's'} · {template.blocks.some((block) => block.kind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL) ? 'flexible structure' : 'fixed day'}</span>
                    </button>
                ))}
                {!templates.length && (
                    <div className="magic-template-empty">
                        Start with “New template” or save the day already on your canvas.
                    </div>
                )}
            </section>

            {showApplyOptions && selectedTemplate && (
                <section className="magic-apply-bar">
                    <div>
                        <strong>Apply {selectedTemplate.name}</strong>
                        <span>Starts on {selectedDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div className="magic-apply-mode" aria-label="Template application mode">
                        <button
                            type="button"
                            className={applyMode === 'once' ? 'is-selected' : ''}
                            onClick={() => {
                                setApplyMode('once');
                                setRepeatDays([]);
                                setRepeatEndDate('');
                            }}
                        >
                            <CalendarDays size={15} /> This day
                        </button>
                        <button
                            type="button"
                            className={applyMode === 'repeat' ? 'is-selected' : ''}
                            onClick={() => {
                                setApplyMode('repeat');
                                setRepeatDays((days) => days.length ? days : [selectedDate.getDay()]);
                            }}
                        >
                            <Repeat2 size={15} /> Repeat
                        </button>
                    </div>
                    {applyMode === 'repeat' && (
                        <>
                            <div className="magic-repeat-days" aria-label="Repeat weekdays">
                                {DAYS.map((day, index) => (
                                    <button
                                        type="button"
                                        key={`${day}-${index}`}
                                        className={repeatDays.includes(index) ? 'is-selected' : ''}
                                        onClick={() => setRepeatDays((days) => days.includes(index) ? days.filter((value) => value !== index) : [...days, index].sort())}
                                        aria-label={`Repeat on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][index]}`}
                                    >
                                        {day}
                                    </button>
                                ))}
                            </div>
                            <label>
                                End
                                <input type="date" value={repeatEndDate} disabled={!repeatDays.length} onChange={(event) => setRepeatEndDate(event.target.value)} />
                            </label>
                        </>
                    )}
                    <button type="button" className="magic-secondary-button" onClick={() => setTemplateEditor(selectedTemplate)}><Pencil size={15} /> Edit</button>
                    <button type="button" className="magic-primary-button" onClick={() => beginApplyTemplate()}><WandSparkles size={16} /> Preview apply</button>
                </section>
            )}

            <div className="magic-workspace">
                <section
                    className="magic-canvas-card"
                    onTouchStart={(event) => {
                        touchStartXRef.current = event.touches[0]?.clientX ?? null;
                    }}
                    onTouchEnd={(event) => {
                        const startX = touchStartXRef.current;
                        const endX = event.changedTouches[0]?.clientX;
                        touchStartXRef.current = null;
                        if (startX == null || endX == null || Math.abs(endX - startX) < 55) return;
                        shiftMobileDay(endX < startX ? 1 : -1);
                    }}
                >
                    {mobile && (
                        <div className="magic-mobile-day-picker">
                            {weekDates.map((date) => (
                                <button
                                    key={toLocalDateKey(date)}
                                    type="button"
                                    className={toLocalDateKey(date) === selectedDateKey ? 'is-selected' : ''}
                                    onClick={() => setSelectedDate(date)}
                                >
                                    <span>{date.toLocaleDateString([], { weekday: 'short' })}</span>
                                    <strong>{date.getDate()}</strong>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="magic-canvas-scroll" ref={canvasScrollRef}>
                        <div className="magic-canvas" ref={canvasRef} style={{ '--day-count': visibleDates.length }}>
                            <div className="magic-time-heading" />
                            {visibleDates.map((date) => (
                                <button
                                    type="button"
                                    key={`heading-${toLocalDateKey(date)}`}
                                    className={`magic-day-heading ${toLocalDateKey(date) === toLocalDateKey(new Date()) ? 'is-today' : ''}`}
                                    onClick={() => setSelectedDate(date)}
                                >
                                    <span>{date.toLocaleDateString([], { weekday: 'short' })}</span>
                                    <strong>{date.getDate()}</strong>
                                </button>
                            ))}
                            <div className="magic-time-axis">
                                {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, index) => (
                                    <span key={index} style={{ top: index * HOUR_HEIGHT }}>{timeFromMinutes((START_HOUR + index) * 60)}</span>
                                ))}
                            </div>
                            {visibleDates.map((date) => {
                                const dateKey = toLocalDateKey(date);
                                const dayItems = itemsForDate(date);
                                const overlapLayout = getScheduleOverlapLayout(dayItems);
                                return (
                                    <div
                                        key={dateKey}
                                        className={`magic-day-column ${dateKey === selectedDateKey ? 'is-selected' : ''}`}
                                        data-magic-date={dateKey}
                                        onPointerDown={(event) => {
                                            if (event.target !== event.currentTarget) return;
                                            const rect = event.currentTarget.getBoundingClientRect();
                                            const raw = START_HOUR * 60 + ((event.clientY - rect.top) / HOUR_HEIGHT) * 60;
                                            const minutes = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - 15, Math.round(raw / 15) * 15));
                                            setSelectedDate(date);
                                            setDrag({
                                                mode: 'create',
                                                startMinutes: minutes,
                                                currentMinutes: minutes,
                                                currentDate: date,
                                                originX: event.clientX,
                                                originY: event.clientY,
                                                moved: false
                                            });
                                        }}
                                    >
                                        {Array.from({ length: END_HOUR - START_HOUR }, (_, index) => (
                                            <span key={index} className="magic-hour-line" style={{ top: index * HOUR_HEIGHT }} />
                                        ))}
                                        {dateKey === todayKey
                                            && currentTimeMinutes >= START_HOUR * 60
                                            && currentTimeMinutes <= END_HOUR * 60 && (
                                            <div
                                                className="magic-current-time"
                                                style={{ top: currentTimeTop }}
                                                aria-hidden="true"
                                            >
                                                <span>{timeLabel(now)}</span>
                                            </div>
                                        )}
                                        {dayItems.map((item) => renderBlock(item, date, overlapLayout))}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                <aside className={`magic-inspector ${assistantOpen ? 'is-assistant' : ''} ${mobileInspectorOpen ? 'is-mobile-open' : ''}`}>
                    <div className="magic-inspector__tabs">
                        <button type="button" className={!assistantOpen ? 'is-selected' : ''} onClick={() => { setAssistantOpen(false); setMobileInspectorOpen(true); }}>Inspector</button>
                        <button type="button" className={assistantOpen ? 'is-selected' : ''} onClick={() => setAssistantOpen(true)}><Bot size={15} /> Assistant</button>
                        <button type="button" className="magic-inspector__close" onClick={() => { setAssistantOpen(false); setMobileInspectorOpen(false); }} aria-label="Close schedule panel"><X size={16} /></button>
                    </div>
                    {assistantOpen ? (
                        <div className="magic-assistant">
                            <div className="magic-assistant__header">
                                <div className="magic-assistant__identity">
                                    <span className="magic-assistant__avatar"><Sparkles size={15} /></span>
                                    <div>
                                        <strong>Schedule assistant</strong>
                                        <span>Draft changes, then confirm</span>
                                    </div>
                                </div>
                                <span className="magic-assistant__status"><i /> Ready</span>
                            </div>
                            <div className="magic-assistant__messages">
                                {!assistantMessages.length && (
                                    <div className="magic-assistant__welcome">
                                        <Sparkles size={22} />
                                        <strong>What should we shape?</strong>
                                        <span>Choose an optional hint below, then describe the change in your own words.</span>
                                    </div>
                                )}
                                {assistantMessages.map((message, index) => (
                                    <div key={`${message.role}-${index}`} className={`magic-assistant__message is-${message.role}`}>
                                        <span className="magic-assistant__message-role">{message.role === 'user' ? 'You' : 'Schedule assistant'}</span>
                                        <span className="magic-assistant__message-content">{message.content}</span>
                                    </div>
                                ))}
                                {assistantBusy && <div className="magic-assistant__thinking"><span className="magic-assistant__thinking-dots"><i /><i /><i /></span> Reviewing your calendar…</div>}
                            </div>
                            {pendingAssistantActions && (
                                <div className="magic-assistant__preview">
                                    <strong>Review {pendingAssistantActions.length} proposed action{pendingAssistantActions.length === 1 ? '' : 's'}</strong>
                                    {pendingAssistantActions.map((action, index) => <span key={`${action.type}-${index}`}>{action.explanation || action.type.replaceAll('_', ' ')}</span>)}
                                    <div>
                                        <button type="button" onClick={() => setPendingAssistantActions(null)}>Cancel</button>
                                        <button type="button" onClick={confirmAssistantActions}>Confirm changes</button>
                                    </div>
                                </div>
                            )}
                            <div className="magic-assistant__intents" aria-label="Optional schedule action hint">
                                <span>Action (optional)</span>
                                <div>
                                    {SCHEDULE_ASSISTANT_INTENTS.map(({ id, label, hint }) => (
                                        <button
                                            type="button"
                                            key={id}
                                            className={assistantIntent === id ? 'is-selected' : ''}
                                            aria-pressed={assistantIntent === id}
                                            title={hint}
                                            onClick={() => setAssistantIntent((current) => current === id ? null : id)}
                                        >
                                            {id === 'add' && <Plus size={14} />}
                                            {id === 'delete' && <Trash2 size={14} />}
                                            {id === 'modify' && <Pencil size={14} />}
                                            {id === 'ask' && <CircleHelp size={14} />}
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="magic-assistant__composer">
                                <textarea
                                    value={assistantInput}
                                    onChange={(event) => setAssistantInput(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' && !event.shiftKey) {
                                            event.preventDefault();
                                            sendAssistantMessage();
                                        }
                                    }}
                                    placeholder={assistantIntent === 'add'
                                        ? 'What would you like to add?'
                                        : assistantIntent === 'delete'
                                            ? 'Which schedule block should be removed?'
                                            : assistantIntent === 'modify'
                                                ? 'What should change?'
                                                : assistantIntent === 'ask'
                                                    ? 'Ask about your schedule…'
                                                    : 'Describe a schedule change…'}
                                    rows={2}
                                />
                                <button type="button" onClick={sendAssistantMessage} disabled={!assistantInput.trim() || assistantBusy} aria-label="Send to schedule assistant"><Send size={17} /></button>
                            </div>
                        </div>
                    ) : selectedItem ? (
                        <div className="magic-inspector__content">
                            <span className="magic-inspector__type">
                                {itemKind(selectedItem) === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL ? 'Flexible shell' : parentId(selectedItem) ? 'Nested event' : 'Schedule event'}
                            </span>
                            <h3>{selectedItem.title}</h3>
                            <div className="magic-inspector__time"><Clock3 size={16} /> {rangeLabel(selectedItem)}</div>
                            <div className="magic-inspector__meta">
                                {recurrenceType(selectedItem) !== 'none' && <span><Repeat2 size={14} /> {recurrenceType(selectedItem)}</span>}
                                {selectedItem.sourceTemplateId && <span><LayoutTemplate size={14} /> Linked to template v{selectedItem.sourceTemplateVersion || 1}</span>}
                            </div>
                            {linkedTemplateIsNewer && (
                                <div className="magic-template-update">
                                    <strong>Template v{linkedTemplate.version} is available</strong>
                                    <span>Past occurrences stay unchanged. Customized dates and detached children win.</span>
                                    <button type="button" onClick={prepareFutureTemplateUpdate}><Redo2 size={15} /> Update future repeats</button>
                                </div>
                            )}
                            {selectedChildren.length > 0 && (
                                <div className="magic-inspector__children">
                                    <strong>Nested activities</strong>
                                    {selectedChildren.map((child) => (
                                        <button type="button" key={child.id} onClick={() => setSelectedItem(child)}>
                                            <span style={{ backgroundColor: child.color || '#6366f1' }} />
                                            <div><strong>{child.title}</strong><small>{rangeLabel(child)}</small></div>
                                            <ChevronRight size={15} />
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="magic-inspector__actions">
                                <button type="button" onClick={() => setModal({ event: selectedItem, selectedDate, defaults: {} })}><Pencil size={16} /> Edit details</button>
                                {itemKind(selectedItem) === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL && (
                                    <button type="button" onClick={() => {
                                        const start = itemStart(selectedItem);
                                        openQuickAdd(selectedDate, start.getHours() * 60 + start.getMinutes(), 60, {
                                            parentItemId: selectedItem.id,
                                            parent: selectedItem
                                        });
                                    }}><Plus size={16} /> Add nested event</button>
                                )}
                                {parentId(selectedItem) && (
                                    <button type="button" onClick={() => transactions.runBatch([{
                                        type: 'update',
                                        id: selectedItem.id,
                                        updates: { parentItemId: null },
                                        before: selectedItem
                                    }], `Detached ${selectedItem.title}`)}><Unlink size={16} /> Detach from shell</button>
                                )}
                            </div>
                            {itemKind(selectedItem) === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL ? (
                                <div className="magic-danger-zone">
                                    <strong>Delete shell</strong>
                                    <button type="button" onClick={() => deleteSelected('detach_children')}><Unlink size={15} /> Detach children, delete shell</button>
                                    <button type="button" onClick={() => deleteSelected('delete_children')}><Trash2 size={15} /> Delete shell and children</button>
                                </div>
                            ) : (
                                <button type="button" className="magic-delete-button" onClick={() => deleteSelected()}><Trash2 size={15} /> Delete event</button>
                            )}
                        </div>
                    ) : (
                        <div className="magic-inspector__empty">
                            <CalendarDays size={24} />
                            <strong>Select a block</strong>
                            <span>Inspect an event, resize it from the canvas, or click an empty time to add.</span>
                            <div className="magic-quiet-suggestion"><Sparkles size={15} /> {quietSuggestion}</div>
                        </div>
                    )}
                </aside>
            </div>

            <button type="button" className="magic-mobile-assistant-button" onClick={() => { setAssistantOpen(true); setMobileInspectorOpen(true); }}>
                <Bot size={19} /> Ask schedule assistant
            </button>

            <ScheduleEventModal
                isOpen={Boolean(modal)}
                onClose={() => setModal(null)}
                onSave={saveModal}
                onDelete={async () => {
                    if (!modal?.event) return;
                    await transactions.runBatch([{ type: 'delete', item: modal.event }], `Deleted ${modal.event.title}`);
                    setModal(null);
                    setSelectedItem(null);
                }}
                event={modal?.event || null}
                selectedDate={modal?.selectedDate || selectedDate}
                defaults={modal?.defaults}
                itemKind={modal?.itemKind}
                parentItemId={modal?.parentItemId}
            />

            <MagicTemplateEditor
                open={Boolean(templateEditor)}
                onClose={() => setTemplateEditor(null)}
                onSave={saveTemplate}
                template={templateEditor?.id ? templateEditor : null}
                currentDayBlocks={currentDayBlocks}
                onAskAI={() => {
                    setTemplateEditor(null);
                    setAssistantOpen(true);
                    setAssistantInput('Suggest a one-day schedule template for me based on my tasks, habits, projects, and preferences.');
                }}
            />

            <MagicConflictSheet
                open={Boolean(review)}
                onClose={() => setReview(null)}
                template={review?.template}
                proposals={review?.proposals}
                conflicts={review?.conflicts}
                autoFitProposals={review?.autoFitProposals}
                autoFitConflicts={review?.autoFitConflicts}
                busy={transactions.isRunning}
                onConfirm={applyReviewedTemplate}
                onCustomMerge={(request) => {
                    const conflictDetails = (review?.conflicts || []).map((conflict) => (
                        `${conflict.dateKey}: ${conflict.proposed.item.title} overlaps ${conflict.existing.item.title}`
                    )).join('; ');
                    const templateName = review?.template?.name || 'the selected template';
                    setReview(null);
                    setAssistantOpen(true);
                    setAssistantInput(`Apply “${templateName}” on ${selectedDateKey}. Conflicts: ${conflictDetails}. Resolve them with this rule: ${request}`);
                }}
            />

            <Sheet
                open={Boolean(futureUpdateReview)}
                onClose={() => setFutureUpdateReview(null)}
                title="Review future template update"
                description={`Past occurrences stay unchanged. The new version begins ${futureUpdateReview?.cutoffDate || ''}.`}
                className="magic-future-update-sheet"
            >
                <div className="magic-future-update-review">
                    <div className="magic-review__summary">
                        <span><LayoutTemplate size={16} /> {futureUpdateReview?.template?.name} v{futureUpdateReview?.template?.version}</span>
                        <span><Redo2 size={16} /> One undoable batch</span>
                    </div>
                    <div className="magic-future-update-review__stats">
                        <div><strong>{futureUpdateReview?.steps.filter((step) => step.type === 'update').length || 0}</strong><span>series split at cutoff</span></div>
                        <div><strong>{futureUpdateReview?.steps.filter((step) => step.type === 'create').length || 0}</strong><span>new linked blocks</span></div>
                        <div><strong>{futureUpdateReview?.linkedItems.filter((item) => Object.keys(item.recurrenceOverrides || item.recurrence_overrides || {}).length).length || 0}</strong><span>customized series preserved</span></div>
                    </div>
                    <p>Detached child events are left untouched. Date and weekday customizations are copied onto the updated future series.</p>
                    <div className="magic-review__footer">
                        <button type="button" className="magic-secondary-button" onClick={() => setFutureUpdateReview(null)}>Cancel</button>
                        <button
                            type="button"
                            className="magic-primary-button"
                            disabled={transactions.isRunning}
                            onClick={async () => {
                                await transactions.runBatch(
                                    futureUpdateReview.steps,
                                    `Updated future repeats from ${futureUpdateReview.template.name}`
                                );
                                toast('Future linked repeats updated.', { tone: 'success' });
                                setFutureUpdateReview(null);
                                setSelectedItem(null);
                            }}
                        >
                            {transactions.isRunning ? 'Updating…' : 'Confirm future update'}
                        </button>
                    </div>
                </div>
            </Sheet>
        </div>
    );
};

export default MagicSchedule;
