import React from 'react';
import { Check } from 'lucide-react';
import { buttonPressProps, formatMinutes, getRitualItemEstimate } from './dailyRitualUtils';

const RitualChoice = ({ item, selected, onToggle }) => {
    const deadline = item.kind === 'task' && item.task.deadline ? new Date(item.task.deadline) : null;
    const label = item.kind === 'habit' ? 'habit' : 'task';

    return (
        <button
            type="button"
            {...buttonPressProps(() => onToggle(item.key))}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${selected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)] shadow-sm'
                : 'border-[var(--color-rule)] bg-[var(--color-card)] hover:border-[var(--color-rule-2)] hover:bg-[var(--color-card-raised)]'
                }`}
        >
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]' : 'border-[var(--color-rule-2)] bg-[var(--color-card-raised)] text-transparent'}`}>
                    <Check size={12} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--color-ink)]">{item.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                        <span>{label}</span>
                        <span>{formatMinutes(getRitualItemEstimate(item))}</span>
                        {deadline && <span>due {deadline.toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                    </div>
                </div>
            </div>
        </button>
    );
};

export default RitualChoice;
