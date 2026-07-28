import { useEffect, useMemo, useState } from 'react';
import { Bot, Plus, Sparkles, Trash2 } from 'lucide-react';
import { Sheet } from '../../ui';
import {
    createScheduleId,
    getTimelinePreviewGeometry,
    minutesFromTime,
    sanitizeMagicTemplateBlocks,
    SCHEDULE_ITEM_KINDS,
    timeFromMinutes
} from '../../services/magicSchedule';
import { toast } from '../../ui/Toast';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6'];
const PREVIEW_HOURS = [7, 12, 17, 22];

const blankBlock = (startTime = '09:00') => ({
    id: createScheduleId('block'),
    kind: SCHEDULE_ITEM_KINDS.EVENT,
    title: '',
    startTime,
    duration: 60,
    category: 'Other',
    color: COLORS[0],
    notes: '',
    children: []
});

const blankChild = (parent) => ({
    id: createScheduleId('child'),
    title: '',
    startTime: parent.startTime,
    duration: Math.min(60, parent.duration),
    category: parent.category || 'Other',
    color: parent.color || COLORS[0],
    notes: ''
});

const TimelinePreview = ({ blocks }) => {
    const previewBlocks = blocks.flatMap((block) => [
        { ...block, previewKey: block.id, previewKind: block.kind },
        ...(block.kind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL
            ? (block.children || []).map((child) => ({
                ...child,
                previewKey: `${block.id}-${child.id}`,
                previewKind: 'nested'
            }))
            : [])
    ]);

    return (
        <div className="magic-template-preview" aria-label="Template day preview">
            <div className="magic-template-preview__hours">
                {PREVIEW_HOURS.map((hour) => <span key={hour}>{hour}</span>)}
            </div>
            <div className="magic-template-preview__track">
                {PREVIEW_HOURS.slice(1, -1).map((hour) => (
                    <span
                        key={hour}
                        className="magic-template-preview__tick"
                        style={{ left: `${((hour - PREVIEW_HOURS[0]) / (PREVIEW_HOURS.at(-1) - PREVIEW_HOURS[0])) * 100}%` }}
                        aria-hidden="true"
                    />
                ))}
                {previewBlocks.map((block) => {
                    const geometry = getTimelinePreviewGeometry(block);
                    if (!geometry) return null;
                    return (
                        <span
                            key={block.previewKey}
                            className={`magic-template-preview__block ${block.previewKind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL ? 'is-shell' : ''} ${block.previewKind === 'nested' ? 'is-nested' : ''}`}
                            style={{
                                left: `${geometry.left}%`,
                                width: `${geometry.width}%`,
                                '--template-block-color': block.color || COLORS[0]
                            }}
                            title={`${block.previewKind === 'nested' ? 'Nested · ' : ''}${block.startTime} ${block.title || 'Untitled'}`}
                        />
                    );
                })}
            </div>
            <div className="magic-template-preview__labels" aria-label="Template activities">
                {previewBlocks.slice(0, 4).map((block) => (
                    <span key={`label-${block.previewKey}`}>
                        <i style={{ backgroundColor: block.color || COLORS[0] }} />
                        <strong>{block.title || 'Untitled'}</strong>
                    </span>
                ))}
                {previewBlocks.length > 4 && <span className="is-more">+{previewBlocks.length - 4}</span>}
            </div>
        </div>
    );
};

const ChildEditor = ({ child, onChange, onRemove }) => (
    <div className="magic-template-child">
        <input
            value={child.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Nested activity"
            aria-label="Nested activity name"
        />
        <input type="time" value={child.startTime} onChange={(event) => onChange({ startTime: event.target.value })} aria-label="Nested activity start" />
        <input
            type="number"
            min="5"
            step="5"
            value={child.duration}
            onChange={(event) => onChange({ duration: Number(event.target.value) })}
            aria-label="Nested activity duration"
        />
        <button type="button" className="ui-icon-button" onClick={onRemove} aria-label="Remove nested activity"><Trash2 size={15} /></button>
    </div>
);

const BlockEditor = ({ block, onChange, onRemove }) => {
    const endTime = timeFromMinutes((minutesFromTime(block.startTime) || 0) + Number(block.duration || 0));
    const updateChild = (childId, updates) => onChange({
        children: block.children.map((child) => child.id === childId ? { ...child, ...updates } : child)
    });

    return (
        <section className={`magic-template-block-editor ${block.kind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL ? 'is-shell' : ''}`}>
            <div className="magic-template-block-editor__color" style={{ backgroundColor: block.color }} />
            <div className="magic-template-block-editor__main">
                <input
                    className="magic-template-block-editor__title"
                    value={block.title}
                    onChange={(event) => onChange({ title: event.target.value })}
                    placeholder={block.kind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL ? 'Flexible block name' : 'Event name'}
                    aria-label="Block name"
                />
                <div className="magic-template-block-editor__row">
                    <label>
                        Start
                        <input type="time" value={block.startTime} onChange={(event) => onChange({ startTime: event.target.value })} />
                    </label>
                    <label>
                        Minutes
                        <input type="number" min="5" step="5" value={block.duration} onChange={(event) => onChange({ duration: Number(event.target.value) })} />
                    </label>
                    <span className="magic-template-block-editor__end">ends {endTime}</span>
                </div>
                <div className="magic-template-block-editor__row">
                    <label className="magic-switch-label">
                        <input
                            type="checkbox"
                            checked={block.kind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL}
                            onChange={(event) => onChange({
                                kind: event.target.checked ? SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL : SCHEDULE_ITEM_KINDS.EVENT,
                                children: event.target.checked ? block.children : []
                            })}
                        />
                        Flexible shell
                    </label>
                    <div className="magic-color-dots" aria-label="Block color">
                        {COLORS.map((color) => (
                            <button
                                key={color}
                                type="button"
                                className={block.color === color ? 'is-selected' : ''}
                                style={{ backgroundColor: color }}
                                onClick={() => onChange({ color })}
                                aria-label={`Use color ${color}`}
                            />
                        ))}
                    </div>
                </div>
                {block.kind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL && (
                    <div className="magic-template-children">
                        {block.children.map((child) => (
                            <ChildEditor
                                key={child.id}
                                child={child}
                                onChange={(updates) => updateChild(child.id, updates)}
                                onRemove={() => onChange({ children: block.children.filter((item) => item.id !== child.id) })}
                            />
                        ))}
                        <button
                            type="button"
                            className="magic-inline-action"
                            onClick={() => onChange({ children: [...block.children, blankChild(block)] })}
                        >
                            <Plus size={14} /> Add nested activity
                        </button>
                    </div>
                )}
            </div>
            <button type="button" className="ui-icon-button" onClick={onRemove} aria-label="Remove block"><Trash2 size={16} /></button>
        </section>
    );
};

const MagicTemplateEditor = ({
    open,
    onClose,
    onSave,
    template,
    currentDayBlocks = [],
    onAskAI
}) => {
    const [name, setName] = useState('');
    const [blocks, setBlocks] = useState([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) return;
        setName(template?.name || '');
        setBlocks(template?.blocks?.length ? template.blocks : [blankBlock()]);
    }, [open, template]);

    const validBlocks = useMemo(() => sanitizeMagicTemplateBlocks(blocks), [blocks]);

    const updateBlock = (id, updates) => setBlocks((items) => (
        items.map((block) => block.id === id ? { ...block, ...updates } : block)
    ));

    const addBlock = () => {
        const latestEnd = blocks.reduce((max, block) => (
            Math.max(max, (minutesFromTime(block.startTime) || 540) + Number(block.duration || 60))
        ), 540);
        setBlocks((items) => [...items, blankBlock(timeFromMinutes(Math.min(latestEnd, 1320)))]);
    };

    const save = async () => {
        if (!name.trim() || !validBlocks.length || busy) return;
        setBusy(true);
        try {
            await onSave({ id: template?.id, name: name.trim(), blocks: validBlocks });
            toast(`Saved “${name.trim()}”.`, { tone: 'success' });
            onClose();
        } catch (error) {
            toast(error.message || 'Could not save this template.', { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet
            open={open}
            onClose={onClose}
            title={template ? 'Edit visual template' : 'New visual template'}
            description="Shape one day here. Repeat choices come when you apply it."
            className="magic-template-sheet"
        >
            <div className="magic-template-editor">
                <input
                    className="magic-template-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Template name — e.g. Deep Work Day"
                    aria-label="Template name"
                    autoFocus
                />

                <TimelinePreview blocks={validBlocks} />

                <div className="magic-template-shortcuts">
                    <button
                        type="button"
                        onClick={() => {
                            if (!currentDayBlocks.length) {
                                toast('This day has no schedule blocks yet.', { tone: 'error' });
                                return;
                            }
                            setBlocks(currentDayBlocks);
                        }}
                    >
                        <Sparkles size={15} /> Use current day
                    </button>
                    <button type="button" onClick={onAskAI}><Bot size={15} /> Ask AI</button>
                </div>

                <div className="magic-template-block-list">
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

                <div className="magic-template-editor__footer">
                    <span>{validBlocks.length} block{validBlocks.length === 1 ? '' : 's'} ready</span>
                    <button type="button" className="magic-primary-button" disabled={!name.trim() || !validBlocks.length || busy} onClick={save}>
                        {busy ? 'Saving…' : 'Save template'}
                    </button>
                </div>
            </div>
        </Sheet>
    );
};

export { TimelinePreview };
export default MagicTemplateEditor;
