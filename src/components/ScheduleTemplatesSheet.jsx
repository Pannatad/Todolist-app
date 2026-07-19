import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Sheet } from '../ui';
import { toast } from '../ui/Toast';
import { confirmAction } from '../utils/confirm';
import { useScheduleTemplates } from '../context/ScheduleTemplateContext';
import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences';
import { buildPlanDayPayloads, occurrencesToTemplateBlocks } from '../services/agentScheduleActions';

const blocksSummary = (blocks = []) => blocks.map((block) => `${block.startTime} ${block.title}`).join(' · ');

const ScheduleTemplatesSheet = ({ isOpen, onClose, events = [], onAddEvent }) => {
    const { templates, saveTemplate, deleteTemplate } = useScheduleTemplates();
    const [newName, setNewName] = useState('');
    const [busy, setBusy] = useState(false);

    const applyTemplate = async (template, dayOffset) => {
        if (busy) return;
        setBusy(true);
        try {
            const target = new Date();
            target.setDate(target.getDate() + dayOffset);
            const payloads = buildPlanDayPayloads({ date: toLocalDateKey(target), blocks: template.blocks });
            for (const payload of payloads) await onAddEvent?.(payload);
            toast(`Added ${payloads.length} blocks from “${template.name}” to ${dayOffset === 0 ? 'today' : 'tomorrow'}.`);
            onClose();
        } catch (error) {
            toast(error?.message || 'Could not apply template.', { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    const saveToday = async () => {
        if (busy || !newName.trim()) return;
        setBusy(true);
        try {
            const blocks = occurrencesToTemplateBlocks(getScheduleItemsForDate(events, new Date()));
            if (!blocks.length) {
                toast('Nothing scheduled today to save.', { tone: 'error' });
                return;
            }
            await saveTemplate({ name: newName.trim(), blocks });
            setNewName('');
            toast(`Saved today as “${newName.trim()}”.`);
        } catch (error) {
            toast(error?.message || 'Could not save template.', { tone: 'error' });
        } finally {
            setBusy(false);
        }
    };

    return (
        <Sheet open={isOpen} onClose={onClose} title="Day templates" description="Reusable day layouts. Your agent can save and apply these too.">
            <div className="space-y-3">
                {templates.length === 0 && (
                    <p className="text-sm text-[var(--color-muted)]">
                        No templates yet. Save today below, or ask your agent: “save today as my standard workday”.
                    </p>
                )}
                {templates.map((template) => (
                    <div key={template.id} className="rounded-xl border border-[var(--color-rule)] bg-[var(--color-card)] p-3.5">
                        <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <div className="truncate text-sm font-bold text-[var(--color-ink)]">{template.name}</div>
                                <div className="mt-0.5 truncate text-xs text-[var(--color-muted)]">{blocksSummary(template.blocks) || 'Empty'}</div>
                            </div>
                            <button
                                type="button"
                                onClick={() => { if (confirmAction(`Delete template “${template.name}”?`)) deleteTemplate(template.id); }}
                                className="ui-icon-button shrink-0"
                                aria-label={`Delete template ${template.name}`}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        <div className="mt-2.5 flex gap-2">
                            <button type="button" disabled={busy} onClick={() => applyTemplate(template, 0)} className="rounded-full bg-[var(--color-accent)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-accent-ink)]">Apply today</button>
                            <button type="button" disabled={busy} onClick={() => applyTemplate(template, 1)} className="rounded-full border border-[var(--color-rule)] px-3.5 py-1.5 text-xs font-semibold text-[var(--color-ink)]">Apply tomorrow</button>
                        </div>
                    </div>
                ))}

                <div className="flex gap-2 border-t border-[var(--color-rule)] pt-3">
                    <input
                        type="text"
                        value={newName}
                        onChange={(event) => setNewName(event.target.value)}
                        placeholder="Save today as..."
                        className="min-w-0 flex-1 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-2)] px-3 py-2 text-sm text-[var(--color-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    />
                    <button
                        type="button"
                        onClick={saveToday}
                        disabled={busy || !newName.trim()}
                        className={`shrink-0 rounded-lg px-4 py-2 text-sm font-semibold ${newName.trim() ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)]' : 'bg-[var(--color-paper-2)] text-[var(--color-muted)]'}`}
                    >
                        Save
                    </button>
                </div>
            </div>
        </Sheet>
    );
};

export default ScheduleTemplatesSheet;
