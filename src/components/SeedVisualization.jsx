import React, { useMemo, useState } from 'react';
import { Flower2, Leaf, Sparkles, Sprout } from 'lucide-react';
import { SEED_HEALTH_META, SEED_STAGE_META } from '../constants/habitSeeds';

const statusStyles = {
    completed: {
        cell: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: <Leaf size={14} />,
        label: 'Done',
    },
    today: {
        cell: 'border-sky-200 bg-sky-50 text-sky-700 ring-1 ring-sky-200',
        icon: <Sprout size={14} />,
        label: 'Today',
    },
    missed: {
        cell: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: <span className="text-sm">•</span>,
        label: 'Missed',
    },
    rotting: {
        cell: 'border-orange-200 bg-orange-50 text-orange-700',
        icon: <span className="text-sm">×</span>,
        label: 'Rotting',
    },
    dead: {
        cell: 'border-slate-300 bg-slate-100 text-slate-500',
        icon: <span className="text-sm">×</span>,
        label: 'Dead',
    },
    free: {
        cell: 'border-slate-200 bg-slate-50 text-slate-400',
        icon: <span className="text-xs">-</span>,
        label: 'Free',
    },
    future: {
        cell: 'border-slate-200 bg-white text-slate-300',
        icon: <span className="text-xs">·</span>,
        label: 'Soon',
    },
    'future-free': {
        cell: 'border-slate-200 bg-white text-slate-300',
        icon: <span className="text-xs">·</span>,
        label: 'Soon',
    },
};

const SeedCell = ({ entry }) => {
    const style = statusStyles[entry.status] || statusStyles.future;

    return (
        <div className="space-y-1 text-center">
            <div className="text-[10px] font-medium text-slate-400">D{entry.dayNumber}</div>
            <div className={`flex aspect-square items-center justify-center rounded-2xl border text-sm ${style.cell}`}>
                {style.icon}
            </div>
        </div>
    );
};

const TimelineGrid = ({ entries }) => {
    const timeline = entries || [];

    return (
        <div className="grid grid-cols-7 gap-2">
            {timeline.map((entry) => (
                <SeedCell key={entry.date} entry={entry} />
            ))}
        </div>
    );
};

const SeedVisualization = ({ insight, compact = false, title, subtitle }) => {
    if (!insight) return null;

    const stageMeta = SEED_STAGE_META[insight.stage || 'seed'] || SEED_STAGE_META.seed;
    const healthMeta = SEED_HEALTH_META[insight.health || 'healthy'] || SEED_HEALTH_META.healthy;
    const growthPercent = Math.round((insight.growthProgress || 0) * 100);
    const consistencyPercent = Math.round((insight.consistencyRate || 0) * 100);
    const [isExpanded, setIsExpanded] = useState(false);

    const rowMeta = useMemo(() => {
        const timeline = insight.timeline || [];
        const rowSize = 7;
        const currentIndex = Math.max(0, Math.min((insight.elapsedDays || 1) - 1, Math.max(timeline.length - 1, 0)));
        const rowIndex = Math.floor(currentIndex / rowSize);
        const rowStart = rowIndex * rowSize;
        const rowEntries = timeline.slice(rowStart, rowStart + rowSize);
        const totalRows = Math.max(1, Math.ceil(timeline.length / rowSize));

        return {
            rowEntries,
            rowIndex,
            totalRows,
            allEntries: timeline,
        };
    }, [insight]);

    if (compact) {
        return (
            <div className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900">{title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                        <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">{stageMeta.label}</span>
                        <span className={`rounded-full border px-2 py-1 font-medium ${healthMeta.badge}`}>{healthMeta.label}</span>
                    </div>
                </div>

                {subtitle && (
                    <div className="mt-3 rounded-[16px] border border-emerald-100 bg-emerald-50 px-3 py-2.5">
                        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-600">Why plant this</div>
                        <div className="mt-1 text-sm text-emerald-900">{subtitle}</div>
                    </div>
                )}

                <div className="mt-4 rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-3 flex items-center justify-between text-[11px] font-medium text-slate-500">
                        <span>Current row</span>
                        <button
                            type="button"
                            onClick={() => setIsExpanded((prev) => !prev)}
                            className="text-slate-600 transition-colors hover:text-slate-900"
                        >
                            {isExpanded ? 'Collapse' : `Expand full garden (${rowMeta.totalRows} rows)`}
                        </button>
                    </div>
                    <TimelineGrid entries={isExpanded ? rowMeta.allEntries : rowMeta.rowEntries} />
                    {!isExpanded && rowMeta.totalRows > 1 && (
                        <div className="mt-3 text-xs text-slate-400">
                            Showing row {rowMeta.rowIndex + 1} of {rowMeta.totalRows}
                        </div>
                    )}
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{insight.completedDays}/{insight.scheduledDays} done</span>
                    <span>{consistencyPercent}% care</span>
                    <span>{insight.daysRemaining} days left</span>
                </div>
                <div className="mt-2 text-xs text-slate-400">Free days are neutral and do not count against growth.</div>
            </div>
        );
    }

    return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700">
                            {stageMeta.label}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${healthMeta.badge}`}>
                            {healthMeta.label}
                        </span>
                    </div>
                    {title && <h4 className="mt-2 text-sm font-semibold text-slate-900">{title}</h4>}
                    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Growth</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{growthPercent}%</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Care</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{consistencyPercent}%</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Done</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{insight.completedDays}</div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-center">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Left</div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{insight.daysRemaining}</div>
                    </div>
                </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-slate-200 bg-white p-3">
                <TimelineGrid entries={rowMeta.allEntries} />
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Sparkles size={14} className="text-emerald-600" />
                        Garden health
                    </div>
                    <p className="mt-2 text-sm text-slate-500">{insight.healthMessage}</p>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full bg-gradient-to-r ${healthMeta.accent}`} style={{ width: `${growthPercent}%` }} />
                    </div>
                </div>

                <div className="rounded-[18px] border border-slate-200 bg-white p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                        <Flower2 size={14} className="text-slate-500" />
                        Pattern notes
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-500">
                        <div className="flex items-center justify-between">
                            <span>Miss streak</span>
                            <span className="font-semibold text-slate-800">{insight.currentMissStreak}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Recovery</span>
                            <span className="font-semibold text-slate-800">{insight.currentRecoveryStreak}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Worst miss</span>
                            <span className="font-semibold text-slate-800">{insight.maxMissStreak}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeedVisualization;
