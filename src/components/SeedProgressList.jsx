import React from 'react';
import { AlertTriangle, Award, Check, CheckCircle2, Circle, CircleX, Flower2, Leaf, Sprout } from 'lucide-react';
import { SEED_HEALTH_META, SEED_STAGE_META } from '../constants/habitSeeds';

const boxStyles = {
    completed: 'border-emerald-300 bg-emerald-100 text-emerald-700',
    missed: 'border-red-300 bg-red-100 text-red-700',
    warning: 'border-red-400 bg-red-100 text-red-700 ring-1 ring-red-200',
    'final-warning': 'border-rose-500 bg-rose-100 text-rose-800 ring-2 ring-rose-200',
    ended: 'border-zinc-400 bg-zinc-200 text-zinc-700',
    today: 'border-sky-300 bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    future: 'border-slate-200 bg-white text-slate-300',
};

const getEntryStyle = (entry) => {
    if (entry.status === 'completed') return boxStyles.completed;
    if (entry.status === 'missed' || entry.status === 'rotting' || entry.status === 'dead') return boxStyles.missed;
    if (entry.status === 'warning') return boxStyles.warning;
    if (entry.status === 'final-warning') return boxStyles['final-warning'];
    if (entry.status === 'ended') return boxStyles.ended;
    if (entry.status === 'today') return boxStyles.today;
    return boxStyles.future;
};

const getEntryIcon = (entry) => {
    if (entry.status === 'completed') return <Check size={14} strokeWidth={3} />;
    if (entry.status === 'warning' || entry.status === 'final-warning') return <AlertTriangle size={13} strokeWidth={2.7} />;
    if (entry.status === 'ended' || entry.status === 'dead') return <CircleX size={13} strokeWidth={2.5} />;
    if (entry.status === 'missed' || entry.status === 'rotting') return <span className="text-xs font-bold">!</span>;
    if (entry.status === 'today') return <Sprout size={13} strokeWidth={2.5} />;
    return <Circle size={10} strokeWidth={2.4} />;
};

const stageIcons = {
    seed: Sprout,
    sprout: Sprout,
    rooted: Leaf,
    blooming: Flower2,
    ended: CircleX,
};

const stageIconStyles = {
    seed: 'border-amber-200 bg-amber-50 text-amber-700',
    sprout: 'border-lime-200 bg-lime-50 text-lime-700',
    rooted: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    blooming: 'border-pink-200 bg-pink-50 text-pink-700',
    ended: 'border-zinc-300 bg-zinc-100 text-zinc-700',
};

const CircularProgress = ({ percent, ended }) => {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const clampedPercent = Math.max(0, Math.min(100, percent || 0));
    const strokeOffset = circumference - (clampedPercent / 100) * circumference;

    return (
        <div className="relative flex h-14 w-14 items-center justify-center">
            <svg viewBox="0 0 44 44" className="h-14 w-14 -rotate-90">
                <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-slate-200"
                />
                <circle
                    cx="22"
                    cy="22"
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeOffset}
                    className={ended ? 'text-zinc-500' : 'text-emerald-500'}
                />
            </svg>
            <span className="absolute text-[11px] font-bold text-slate-700">
                {ended ? 'End' : `${clampedPercent}%`}
            </span>
        </div>
    );
};

const milestones = [
    { days: 7, label: 'Sprout' },
    { days: 14, label: 'Rooted' },
    { days: 21, label: 'Bloom' },
];

const SeedProgressList = ({ seeds, selectedDateStr, canCheckSelectedDate = false, onQuickCheck, onQuickMiss }) => {
    if (!seeds?.length) return null;

    return (
        <section className="seed-progress rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:p-5">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">Long progress</div>
                    <h3 className="mt-1 text-base font-semibold text-slate-900">Seed checklist</h3>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1"><Check size={12} className="text-emerald-600" /> done</span>
                    <span className="inline-flex items-center gap-1"><span className="font-bold text-red-600">!</span> missed</span>
                    <span className="inline-flex items-center gap-1"><Circle size={10} /> upcoming</span>
                </div>
            </div>

            <div className="seed-progress__items mt-4 space-y-3">
                {seeds.map(({ habit, insight }) => {
                    const stageKey = insight.ended ? 'ended' : insight.stage || 'seed';
                    const StageIcon = stageIcons[stageKey] || Sprout;
                    const stageMeta = SEED_STAGE_META[insight.stage || 'seed'] || SEED_STAGE_META.seed;
                    const healthMeta = SEED_HEALTH_META[insight.health || 'healthy'] || SEED_HEALTH_META.healthy;
                    const scheduledEntries = (insight.timeline || []).filter((entry) => entry.scheduled);
                    const progressPercent = Math.round((insight.growthProgress || 0) * 100);
                    const selectedEntry = selectedDateStr
                        ? scheduledEntries.find((entry) => entry.date === selectedDateStr)
                        : null;
                    const canQuickCheck = Boolean(
                        onQuickCheck &&
                        canCheckSelectedDate &&
                        selectedEntry &&
                        selectedEntry.status !== 'completed' &&
                        !insight.ended
                    );
                    const canQuickMiss = Boolean(
                        onQuickMiss &&
                        canCheckSelectedDate &&
                        selectedEntry &&
                        !['missed', 'warning', 'final-warning', 'ended', 'dead', 'rotting'].includes(selectedEntry.status) &&
                        !insight.ended
                    );
                    const visibleMilestones = milestones.filter((milestone) => milestone.days <= insight.durationDays);
                    const currentStreak = insight.currentRecoveryStreak || 0;

                    return (
                        <div key={habit.id} className="seed-progress__item rounded-[18px] border border-slate-200 bg-slate-50 p-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                                <div className="min-w-0 lg:w-64">
                                    <div className="flex min-w-0 items-center gap-2">
                                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border shadow-sm ${stageIconStyles[stageKey] || stageIconStyles.seed}`}>
                                            <StageIcon size={22} strokeWidth={2.5} />
                                        </span>
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-slate-900">{habit.name}</div>
                                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] font-medium">
                                                <span className="rounded-full bg-white px-2 py-0.5 text-slate-600">{stageMeta.shortLabel}</span>
                                                <span className={`rounded-full border px-2 py-0.5 ${healthMeta.badge}`}>{healthMeta.label}</span>
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                {visibleMilestones.map((milestone) => {
                                                    const unlocked = insight.completedDays >= milestone.days;
                                                    return (
                                                        <span
                                                            key={milestone.days}
                                                            title={`${milestone.days}-day ${milestone.label} milestone${unlocked ? ', unlocked' : ', locked'}`}
                                                            aria-label={`${milestone.days}-day ${milestone.label} milestone${unlocked ? ', unlocked' : ', locked'}`}
                                                            role="img"
                                                            className={`seed-progress__milestone inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${unlocked ? 'is-unlocked' : ''}`}
                                                        >
                                                            <Award size={10} />
                                                            {milestone.days}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="seed-progress__stats">
                                    <div className="seed-progress__stat seed-progress__stat--passed">
                                        <div className="seed-progress__stat-value">{insight.elapsedDays}</div>
                                        <div className="seed-progress__stat-label">Passed</div>
                                    </div>
                                    <div className="seed-progress__stat seed-progress__stat--done">
                                        <div className="seed-progress__stat-value">{insight.completedDays}</div>
                                        <div className="seed-progress__stat-label">Done</div>
                                    </div>
                                    <div className="seed-progress__stat seed-progress__stat--streak">
                                        <div className="seed-progress__stat-value">{currentStreak}</div>
                                        <div className="seed-progress__stat-label">Streak</div>
                                    </div>
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap gap-1.5">
                                        {scheduledEntries.map((entry, index) => (
                                            <div
                                                key={entry.date}
                                                title={`Step ${index + 1}: ${entry.status}`}
                                                className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs transition-colors ${getEntryStyle(entry)}`}
                                            >
                                                {getEntryIcon(entry)}
                                                {entry.status === 'completed' && (
                                                    <span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold leading-none opacity-70">
                                                        {entry.completionNumber || index + 1}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex shrink-0 items-center gap-3">
                                    <CircularProgress percent={progressPercent} ended={insight.ended} />
                                    <div className="flex shrink-0 gap-1.5">
                                        <button
                                            type="button"
                                            onClick={() => onQuickCheck?.(habit)}
                                            disabled={!canQuickCheck}
                                            title={
                                                insight.ended
                                                    ? 'This seed ended. Replant to restart.'
                                                    : selectedEntry?.status === 'completed'
                                                        ? 'Already checked for this day.'
                                                        : !selectedEntry
                                                            ? 'This seed is not scheduled for the selected day.'
                                                            : !canCheckSelectedDate
                                                                ? 'Only today and yesterday can be edited.'
                                                                : 'Check this seed for the selected day.'
                                            }
                                            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                                                canQuickCheck
                                                    ? 'border-emerald-200 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                                                    : 'border-slate-200 bg-white text-slate-300'
                                            }`}
                                        >
                                            <CheckCircle2 size={18} strokeWidth={2.6} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => onQuickMiss?.(habit)}
                                            disabled={!canQuickMiss}
                                            title={
                                                insight.ended
                                                    ? 'This seed ended. Replant to restart.'
                                                    : !selectedEntry
                                                        ? 'This seed is not scheduled for the selected day.'
                                                        : !canCheckSelectedDate
                                                            ? 'Only today and yesterday can be edited.'
                                                            : ['missed', 'warning', 'final-warning', 'ended', 'dead', 'rotting'].includes(selectedEntry.status)
                                                                ? 'Already marked uncompleted for this day.'
                                                                : 'Mark this seed uncompleted for the selected day.'
                                            }
                                            className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                                                canQuickMiss
                                                    ? 'border-red-200 bg-red-600 text-white shadow-sm hover:bg-red-700'
                                                    : 'border-slate-200 bg-white text-slate-300'
                                            }`}
                                        >
                                            <CircleX size={18} strokeWidth={2.6} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
};

export default SeedProgressList;
