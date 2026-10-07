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
            aria-pressed={selected}
            className={`ritual-choice${selected ? ' is-selected' : ''}`}
        >
            <div className="flex items-start gap-3">
                <span className="ritual-choice__check" aria-hidden="true">
                    <Check size={12} strokeWidth={3} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-[var(--color-ink)]">{item.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted)]">
                        <span>{[label === 'habit' ? 'Habit' : 'Task', formatMinutes(getRitualItemEstimate(item)), deadline ? `due ${deadline.toLocaleDateString([], { month: 'short', day: 'numeric' })}` : null].filter(Boolean).join(' · ')}</span>
                    </div>
                </div>
            </div>
        </button>
    );
};

export default RitualChoice;
