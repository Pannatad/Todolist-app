import React from 'react';
import { Check } from 'lucide-react';
import { buttonPressProps, formatMinutes, getRitualItemEstimate } from './dailyRitualUtils';

const RitualChoice = ({ item, selected, onToggle }) => {
    const deadline = item.kind === 'task' && item.task.deadline ? new Date(item.task.deadline) : null;
    const label = item.kind === 'habit' ? 'habit' : (item.task.difficulty || 'task');

    return (
        <button
            type="button"
            {...buttonPressProps(() => onToggle(item.key))}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${selected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] shadow-sm'
                : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
                }`}
        >
            <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border ${selected ? 'border-[var(--color-accent)]0 bg-[var(--color-accent)] text-white' : 'border-gray-300 bg-white text-transparent'}`}>
                    <Check size={12} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold text-gray-900">{item.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
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
