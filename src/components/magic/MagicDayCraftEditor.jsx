import { useEffect, useMemo, useState } from 'react';
import { Bot, CalendarDays, Copy, FileText, Plus, Send } from 'lucide-react';
import { Sheet } from '../../ui';
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
import {
    BlockEditor,
    TimelinePreview
} from './MagicTemplateEditor';

const createCraftBlock = (startTime = '09:00') => ({
    id: createScheduleId('block'),
    kind: SCHEDULE_ITEM_KINDS.EVENT,
    title: '',
    startTime,
    duration: 60,
    category: 'Other',
    color: '#6366f1',
    notes: '',
    children: []
});

const formatDate = (dateKey) => new Date(`${dateKey}T12:00:00`).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
});

const EMPTY_BLOCKS = [];
const DEFAULT_DATE = new Date();

const formatMinutes = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${remainder}m planned`;
    if (!remainder) return `${hours}h planned`;
    return `${hours}h ${remainder}m planned`;
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
    const [blocks, setBlocks] = useState(() => sanitizeMagicTemplateBlocks(initialBlocks).length
        ? sanitizeMagicTemplateBlocks(initialBlocks)
        : [createCraftBlock()]);
    const [starter, setStarter] = useState(initialAssistantPrompt ? 'assistant' : 'blank');
    const [templateId, setTemplateId] = useState('');
    const [copyDate, setCopyDate] = useState(() => toLocalDateKey(initialDate));
    const [assistantInput, setAssistantInput] = useState(initialAssistantPrompt);
    const [assistantMessage, setAssistantMessage] = useState('');
    const [assistantBusy, setAssistantBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        const nextDate = typeof initialDate === 'string'
            ? initialDate
            : toLocalDateKey(initialDate || new Date());
        const restoredBlocks = sanitizeMagicTemplateBlocks(initialBlocks);
        setDateKey(nextDate);
        setCopyDate(nextDate);
        setBlocks(restoredBlocks.length ? restoredBlocks : [createCraftBlock()]);
        setStarter(initialAssistantPrompt ? 'assistant' : 'blank');
        setTemplateId('');
        setAssistantInput(initialAssistantPrompt || '');
        setAssistantMessage('');
        setAssistantBusy(false);
    }, [initialAssistantPrompt, initialBlocks, initialDate, open]);

    useEffect(() => {
        if (open && !templateId && templates[0]?.id) setTemplateId(String(templates[0].id));
    }, [open, templateId, templates]);

    const validBlocks = useMemo(() => sanitizeMagicTemplateBlocks(blocks), [blocks]);
    const totalMinutes = useMemo(() => validBlocks.reduce((sum, block) => sum + Number(block.duration || 0), 0), [validBlocks]);
    const hasDraft = validBlocks.length > 0;

    const replaceDraft = (nextBlocks, sourceLabel) => {
        const cleanBlocks = sanitizeMagicTemplateBlocks(nextBlocks);
        if (!cleanBlocks.length) {
            toast(`No usable blocks found in ${sourceLabel}.`, { tone: 'error' });
            return false;
        }
        if (hasDraft && !confirmAction('Replace the current day draft with this starting point?')) return false;
        setBlocks(cleanBlocks);
        setAssistantMessage('');
        return true;
    };

    const addBlock = () => {
        const latestEnd = blocks.reduce((max, block) => (
            Math.max(max, (minutesFromTime(block.startTime) || 540) + Number(block.duration || 60))
        ), 540);
        setBlocks((items) => [...items, createCraftBlock(timeFromMinutes(Math.min(latestEnd, 1320)))]);
    };

    const updateBlock = (id, updates) => setBlocks((items) => (
        items.map((block) => block.id === id ? { ...block, ...updates } : block)
    ));

    const loadTemplate = () => {
        const template = templates.find((item) => String(item.id) === String(templateId));
        if (!template) {
            toast('Choose a template first.', { tone: 'error' });
            return;
        }
        replaceDraft(template.blocks, `template “${template.name}”`);
    };

    const copyDay = () => {
        const sourceDate = new Date(`${copyDate}T12:00:00`);
        const sourceBlocks = occurrencesToMagicTemplateBlocks(getScheduleItemsForDate(events, sourceDate));
        if (!sourceBlocks.length) {
            toast(`No schedule blocks found on ${formatDate(copyDate)}.`, { tone: 'error' });
            return;
        }
        replaceDraft(sourceBlocks, `the day of ${formatDate(copyDate)}`);
    };

    const draftWithAssistant = async () => {
        if (assistantBusy) return;
        const request = assistantInput.trim() || 'Create a balanced day with focused work, useful breaks, and room to breathe.';
        const userMessage = { id: createScheduleId('craft-message'), role: 'user', content: request };
        setAssistantBusy(true);
        setAssistantMessage('');
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
                setStarter('assistant');
                setAssistantMessage(`Drafted ${draftedBlocks.length} block${draftedBlocks.length === 1 ? '' : 's'} for ${formatDate(dateKey)}. Nothing has been saved yet.`);
            }
        } catch (error) {
            setAssistantMessage(error.message || 'The schedule assistant is unavailable right now.');
        } finally {
            setAssistantBusy(false);
        }
    };

    const preview = () => {
        if (!validBlocks.length) {
            toast('Add at least one complete schedule block before reviewing.', { tone: 'error' });
            return;
        }
        onPreview?.({ dateKey, blocks: validBlocks });
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title="Craft a day"
            description={`Shape a one-time plan for ${formatDate(dateKey)}.`}
            className="magic-day-craft-sheet"
        >
            <div className="magic-day-craft">
                <div className="magic-day-craft__date-row">
                    <label className="magic-day-craft__date">
                        <CalendarDays size={16} aria-hidden="true" />
                        <span>Plan for</span>
                        <input
                            type="date"
                            value={dateKey}
                            onChange={(event) => setDateKey(event.target.value)}
                            aria-label="Crafted day date"
                        />
                    </label>
                    <span className="magic-day-craft__one-time">One-time plan · no repeats</span>
                </div>

                <div className="magic-day-craft__layout">
                    <section className="magic-day-craft__preview" aria-labelledby="magic-day-craft-preview-title">
                        <div className="magic-day-craft__section-heading">
                            <div>
                                <span className="magic-day-craft__section-label">Day at a glance</span>
                                <strong id="magic-day-craft-preview-title">{formatDate(dateKey)}</strong>
                            </div>
                            <span>{formatMinutes(totalMinutes)}</span>
                        </div>
                        <TimelinePreview blocks={validBlocks} ariaLabel="Crafted day timeline preview" />
                        <div className="magic-day-craft__preview-note">
                            {validBlocks.length
                                ? `${validBlocks.length} block${validBlocks.length === 1 ? '' : 's'} ready to review.`
                                : 'Your finished blocks will appear here.'}
                        </div>
                    </section>

                    <section className="magic-day-craft__composer" aria-label="Crafted day blocks">
                        <div className="magic-day-craft__section-heading">
                            <div>
                                <span className="magic-day-craft__section-label">Build the day</span>
                                <strong>Start wherever feels easiest</strong>
                            </div>
                        </div>

                        <div className="magic-day-craft__starter" role="group" aria-label="Choose a starting point">
                            <button type="button" className={starter === 'blank' ? 'is-selected' : ''} onClick={() => { setStarter('blank'); replaceDraft([createCraftBlock()], 'a blank day'); }}>
                                <Plus size={15} /> Blank
                            </button>
                            <button type="button" className={starter === 'template' ? 'is-selected' : ''} onClick={() => setStarter('template')}>
                                <FileText size={15} /> Template
                            </button>
                            <button type="button" className={starter === 'copy' ? 'is-selected' : ''} onClick={() => setStarter('copy')}>
                                <Copy size={15} /> Copy day
                            </button>
                            <button type="button" className={starter === 'assistant' ? 'is-selected' : ''} onClick={() => setStarter('assistant')}>
                                <Bot size={15} /> Ask assistant
                            </button>
                        </div>

                        {starter === 'template' && (
                            <div className="magic-day-craft__source">
                                <label>
                                    <span>Use a saved template</span>
                                    <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={!templates.length}>
                                        {!templates.length && <option value="">No templates yet</option>}
                                        {templates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
                                    </select>
                                </label>
                                <button type="button" className="magic-secondary-button" disabled={!templates.length} onClick={loadTemplate}>Use template</button>
                            </div>
                        )}

                        {starter === 'copy' && (
                            <div className="magic-day-craft__source">
                                <label>
                                    <span>Copy blocks from</span>
                                    <input type="date" value={copyDate} onChange={(event) => setCopyDate(event.target.value)} />
                                </label>
                                <button type="button" className="magic-secondary-button" onClick={copyDay}>Copy day</button>
                            </div>
                        )}

                        {starter === 'assistant' && (
                            <div className="magic-day-craft__assistant">
                                <textarea
                                    value={assistantInput}
                                    onChange={(event) => setAssistantInput(event.target.value)}
                                    placeholder="Example: a calm study day with a long writing block in the morning…"
                                    rows={3}
                                    aria-label="Describe the day for the assistant"
                                />
                                <button type="button" className="magic-primary-button" disabled={assistantBusy} onClick={draftWithAssistant}>
                                    <Send size={15} /> {assistantBusy ? 'Drafting…' : 'Draft with assistant'}
                                </button>
                                {assistantMessage && <p aria-live="polite">{assistantMessage}</p>}
                            </div>
                        )}

                        <div className="magic-day-craft__block-list">
                            {blocks.map((block) => (
                                <BlockEditor
                                    key={block.id}
                                    block={block}
                                    onChange={(updates) => updateBlock(block.id, updates)}
                                    onRemove={() => setBlocks((items) => items.filter((item) => item.id !== block.id))}
                                />
                            ))}
                        </div>

                        <button type="button" className="magic-add-block" onClick={addBlock}>
                            <Plus size={17} /> Add block
                        </button>
                    </section>
                </div>

                <div className="magic-day-craft__footer">
                    <span aria-live="polite">{validBlocks.length} block{validBlocks.length === 1 ? '' : 's'} · {formatMinutes(totalMinutes)}</span>
                    <button type="button" className="magic-secondary-button" onClick={onClose}>Cancel</button>
                    <button type="button" className="magic-primary-button" disabled={!validBlocks.length || assistantBusy} onClick={preview}>Review day</button>
                </div>
            </div>
        </Sheet>
    );
};

export default MagicDayCraftEditor;
