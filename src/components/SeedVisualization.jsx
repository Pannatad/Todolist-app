import React, { useMemo, useState } from 'react';
import { AlertTriangle, CircleDot, CircleX, Flower2, Leaf, Sparkles, Sprout } from 'lucide-react';
import { SEED_HEALTH_META, SEED_STAGE_META } from '../constants/habitSeeds';

const plantVisuals = {
    seed: {
        Icon: CircleDot,
        size: 22,
        shell: 'h-14 w-14 bg-amber-100 text-amber-700 ring-4 ring-amber-50',
        glow: 'bg-amber-200/50',
    },
    sprout: {
        Icon: Sprout,
        size: 28,
        shell: 'h-16 w-16 bg-lime-100 text-lime-700 ring-4 ring-lime-50',
        glow: 'bg-lime-200/50',
    },
    rooted: {
        Icon: Leaf,
        size: 34,
        shell: 'h-[72px] w-[72px] bg-emerald-100 text-emerald-700 ring-4 ring-emerald-50',
        glow: 'bg-emerald-200/50',
    },
    blooming: {
        Icon: Flower2,
        size: 40,
        shell: 'h-20 w-20 bg-pink-100 text-pink-700 ring-4 ring-pink-50',
        glow: 'bg-pink-200/50',
    },
    ended: {
        Icon: CircleX,
        size: 38,
        shell: 'h-20 w-20 bg-zinc-200 text-zinc-700 ring-4 ring-zinc-100',
        glow: 'bg-red-200/50',
    },
};

const PlantBadge = ({ stage, progress }) => {
    const visual = plantVisuals[stage] || plantVisuals.seed;
    const Icon = visual.Icon;
    const progressPercent = Math.round((progress || 0) * 100);

    return (
        <div className="relative flex shrink-0 items-center justify-center">
            <div className={`absolute rounded-full blur-xl ${visual.glow} ${visual.shell.split(' ').slice(0, 2).join(' ')}`} />
            <div className={`relative flex items-center justify-center rounded-full shadow-sm transition-all duration-500 ${visual.shell}`}>
                <Icon size={visual.size} strokeWidth={2.4} />
            </div>
            <div className="absolute -bottom-1 rounded-full border border-white bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white shadow-sm">
                {progressPercent}%
            </div>
        </div>
    );
};

const statusStyles = {
    completed: {
        cell: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        label: 'Done',
    },
    today: {
        cell: 'border-sky-200 bg-sky-50 text-sky-700 ring-1 ring-sky-200',
        icon: <Sprout size={14} />,
        label: 'Today',
    },
    missed: {
        cell: 'border-red-200 bg-red-50 text-red-700 ring-1 ring-red-100',
        icon: <span className="text-sm font-bold">!</span>,
        label: 'Missed',
    },
    warning: {
        cell: 'border-red-300 bg-red-100 text-red-700 ring-1 ring-red-200',
        icon: <AlertTriangle size={14} />,
        label: 'Warning',
    },
    'final-warning': {
        cell: 'border-rose-400 bg-rose-100 text-rose-800 ring-2 ring-rose-200',
        icon: <AlertTriangle size={15} strokeWidth={2.8} />,
        label: 'Final warning',
    },
    rotting: {
        cell: 'border-orange-200 bg-orange-50 text-orange-700',
        icon: <span className="text-sm">×</span>,
        label: 'Rotting',
    },
    dead: {
        cell: 'border-zinc-300 bg-zinc-100 text-zinc-600',
        icon: <CircleX size={14} />,
        label: 'Dead',
    },
    ended: {
        cell: 'border-zinc-400 bg-zinc-200 text-zinc-700 ring-1 ring-zinc-300',
        icon: <CircleX size={15} />,
        label: 'Ended',
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

const completedCellStyles = {
    seed: 'border-amber-200 bg-amber-50 text-amber-700',
    sprout: 'border-lime-200 bg-lime-50 text-lime-700',
    rooted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    blooming: 'border-pink-200 bg-pink-50 text-pink-700',
};

const completedIconSizes = {
    seed: 13,
    sprout: 15,
    rooted: 17,
    blooming: 18,
};

const SeedCell = ({ entry }) => {
    const style = statusStyles[entry.status] || statusStyles.future;
    const completedStage = entry.completionStage || 'seed';
    const completedVisual = plantVisuals[completedStage] || plantVisuals.seed;
    const CompletedIcon = completedVisual.Icon;
    const isCompleted = entry.status === 'completed';
    const icon = isCompleted
        ? <CompletedIcon size={completedIconSizes[completedStage] || 14} strokeWidth={2.6} />
        : style.icon;
    const cellClass = isCompleted
        ? completedCellStyles[completedStage] || completedCellStyles.seed
        : style.cell;

    return (
        <div className="space-y-1 text-center">
            <div className="text-[10px] font-medium text-slate-400">D{entry.dayNumber}</div>
            <div className={`relative flex aspect-square items-center justify-center rounded-2xl border text-sm transition-all duration-300 ${cellClass}`}>
                {icon}
                {isCompleted && entry.completionNumber && (
                    <span className="absolute bottom-0.5 right-1 text-[8px] font-bold leading-none opacity-70">
                        {entry.completionNumber}
                    </span>
                )}
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
    const displayStage = insight.ended ? 'ended' : insight.stage;
    const growthPercent = Math.round((insight.growthProgress || 0) * 100);
    const consistencyPercent = Math.round((insight.consistencyRate || 0) * 100);
    const completionLabel = `${insight.completedDays || 0}/${insight.durationDays || 0} completions`;
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
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="rounded-full bg-slate-100 px-2 py-1 font-medium text-slate-700">{stageMeta.label}</span>
                            <span className={`rounded-full border px-2 py-1 font-medium ${healthMeta.badge}`}>{healthMeta.label}</span>
                        </div>
                        <div className="mt-2 text-xs font-medium text-slate-500">
                            {completionLabel}
                            {insight.completionsToNextStage > 0 && (
                                <span className="text-slate-400"> • {insight.completionsToNextStage} to next growth</span>
                            )}
                        </div>
                    </div>
                    <PlantBadge stage={displayStage} progress={insight.growthProgress} />
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
                    <span>{insight.ended ? 'ended' : `${insight.daysRemaining} steps left`}</span>
                </div>
                <div className="mt-2 text-xs text-slate-400">Free days are neutral and do not count against growth.</div>
            </div>
        );
    }

    return (
        <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                    <PlantBadge stage={displayStage} progress={insight.growthProgress} />
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
                    <p className="mt-2 text-xs font-medium text-slate-500">{completionLabel}</p>
                    </div>
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
                        <div className="mt-1 text-sm font-semibold text-slate-900">{insight.ended ? 'Ended' : insight.daysRemaining}</div>
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
