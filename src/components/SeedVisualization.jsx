import React from 'react';
import { motion } from 'framer-motion';
import { Flower2, Leaf, Sparkles, Sprout, Waves } from 'lucide-react';
import { SEED_HEALTH_META, SEED_STAGE_META } from '../constants/habitSeeds';

const PlantInPot = ({ entry, compact = false }) => {
    const potSize = compact ? 'h-20 w-14' : 'h-28 w-20';
    const potBase = compact ? 'h-9' : 'h-12';
    const labelClass = compact ? 'text-[10px]' : 'text-[11px]';

    const renderGrowth = () => {
        if (entry.status === 'future' || entry.status === 'future-rest') {
            return (
                <div className="absolute bottom-10 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full border border-dashed border-white/60 bg-white/20" />
            );
        }

        if (entry.status === 'rest') {
            return (
                <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-stone-300" />
                    <div className="h-1.5 w-1.5 rounded-full bg-stone-200" />
                </div>
            );
        }

        if (entry.status === 'today') {
            return (
                <>
                    <motion.div
                        animate={{ scale: [1, 1.14, 1] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute bottom-9 left-1/2 h-7 w-7 -translate-x-1/2 rounded-full border-2 border-emerald-400/60"
                    />
                    <div className="absolute bottom-11 left-1/2 h-3.5 w-4 -translate-x-1/2 rounded-full bg-emerald-700 shadow-[0_0_0_6px_rgba(16,185,129,0.08)]" />
                </>
            );
        }

        if (entry.status === 'missed') {
            return (
                <>
                    <div className="absolute bottom-10 left-1/2 h-3.5 w-4 -translate-x-1/2 rounded-full bg-amber-800/75" />
                    <div className="absolute bottom-7 left-1/2 h-0.5 w-7 -translate-x-1/2 rotate-6 bg-amber-950/20" />
                </>
            );
        }

        if (entry.status === 'rotting') {
            return (
                <>
                    <div className="absolute bottom-10 left-1/2 h-4 w-5 -translate-x-1/2 rounded-full bg-gradient-to-br from-lime-700 to-amber-900" />
                    <div className="absolute bottom-12 left-1/2 h-1.5 w-1.5 translate-x-1 rounded-full bg-black/25" />
                    <div className="absolute bottom-14 left-1/2 -translate-x-4 text-amber-800/70">
                        <Waves size={compact ? 10 : 12} />
                    </div>
                </>
            );
        }

        if (entry.status === 'dead') {
            return (
                <>
                    <div className="absolute bottom-10 left-1/2 h-6 w-1 -translate-x-1/2 rounded-full bg-slate-600" />
                    <div className="absolute bottom-[3.35rem] left-1/2 h-3 w-5 -translate-x-1/2 rotate-12 rounded-full border border-slate-700/80 bg-slate-500/60" />
                </>
            );
        }

        if (entry.status === 'completed') {
            const progress = Math.min(1, entry.growthScale);
            const stemHeight = 10 + Math.round(progress * (compact ? 18 : 30));
            const seedSize = 8 + Math.round(progress * (compact ? 8 : 14));
            const showStem = progress > 0.55;
            const showLeaves = progress > 0.72;
            const showFlower = progress > 1.02;

            return (
                <>
                    {!showStem && (
                        <motion.div
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1, y: [0, -1.5, 0] }}
                            transition={{ opacity: { duration: 0.3 }, scale: { duration: 0.35 }, y: { duration: 2.6, repeat: Infinity, ease: 'easeInOut' } }}
                            className="absolute left-1/2 rounded-full bg-emerald-700 shadow-[0_0_0_6px_rgba(16,185,129,0.08)]"
                            style={{
                                bottom: compact ? '2.4rem' : '2.9rem',
                                width: `${seedSize}px`,
                                height: `${Math.max(seedSize - 1, 6)}px`,
                                transform: 'translateX(-50%)',
                            }}
                        />
                    )}

                    {showStem && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: stemHeight }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            className="absolute bottom-10 left-1/2 w-1.5 -translate-x-1/2 rounded-full bg-gradient-to-t from-emerald-700 to-emerald-400"
                        />
                    )}

                    {showStem && !showFlower && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ duration: 0.35, delay: 0.1 }}
                            className="absolute left-1/2 text-emerald-500"
                            style={{ bottom: `${stemHeight + 28}px`, transform: 'translateX(-50%)' }}
                        >
                            <Sprout size={compact ? 15 : 20} />
                        </motion.div>
                    )}

                    {showLeaves && (
                        <>
                            <motion.div
                                initial={{ scale: 0, rotate: -25 }}
                                animate={{ scale: 1, rotate: [-18, -8, -18] }}
                                transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
                                className="absolute text-emerald-500"
                                style={{ left: compact ? '26%' : '24%', bottom: `${stemHeight + 4}px` }}
                            >
                                <Leaf size={compact ? 12 : 16} fill="currentColor" />
                            </motion.div>
                            <motion.div
                                initial={{ scale: 0, rotate: 25 }}
                                animate={{ scale: 1, rotate: [18, 8, 18] }}
                                transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                                className="absolute text-emerald-500"
                                style={{ right: compact ? '24%' : '22%', bottom: `${stemHeight + 10}px` }}
                            >
                                <Leaf size={compact ? 12 : 16} fill="currentColor" />
                            </motion.div>
                        </>
                    )}

                    {showFlower && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, rotate: [0, 4, 0, -4, 0] }}
                            transition={{ scale: { duration: 0.45, delay: 0.1 }, rotate: { duration: 5.2, repeat: Infinity, ease: 'easeInOut' } }}
                            className="absolute left-1/2 text-pink-500"
                            style={{ bottom: `${stemHeight + 22}px`, transform: 'translateX(-50%)' }}
                        >
                            <Flower2 size={compact ? 16 : 20} fill="currentColor" />
                        </motion.div>
                    )}
                </>
            );
        }

        return null;
    };

    return (
        <div className="flex w-full flex-col items-center gap-2">
            <div className={`${labelClass} font-semibold text-slate-500`}>
                Day {entry.dayNumber}
            </div>
            <div className={`relative ${potSize} overflow-hidden rounded-[26px] bg-gradient-to-b from-sky-100 via-emerald-50 to-amber-100/90 px-2 pt-3 shadow-inner ${entry.isToday ? 'ring-2 ring-emerald-300/80 ring-offset-2 ring-offset-white/60' : ''}`}>
                <motion.div
                    animate={{ opacity: [0.25, 0.45, 0.25] }}
                    transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute right-2 top-2 h-6 w-6 rounded-full bg-white/60 blur-lg"
                />
                <div className="absolute bottom-0 left-0 right-0 h-9 bg-gradient-to-t from-amber-900 via-amber-700 to-amber-500" />
                <div className="absolute bottom-0 left-1/2 h-[1px] w-12 -translate-x-1/2 bg-black/10" />
                {renderGrowth()}
                <div className={`absolute bottom-1 left-1/2 ${potBase} w-[72%] -translate-x-1/2 rounded-b-[20px] rounded-t-[16px] border border-amber-900/15 bg-gradient-to-b from-[#f0b26c] via-[#ce8452] to-[#9d5b3d] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]`} />
                {(entry.status === 'missed' || entry.status === 'rotting' || entry.status === 'dead') && (
                    <div className="absolute bottom-[0.95rem] left-1/2 h-2 w-8 -translate-x-1/2 rounded-full bg-black/10 blur-sm" />
                )}
            </div>
            <div className={`${labelClass} text-slate-400`}>
                {entry.completed ? 'Done' : entry.status === 'today' ? 'Today' : entry.status === 'rest' ? 'Rest' : entry.status === 'future' || entry.status === 'future-rest' ? 'Soon' : 'Missed'}
            </div>
        </div>
    );
};

const TimelineStrip = ({ insight, compact = false }) => {
    const timeline = insight.timeline || [];

    return (
        <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className={`flex min-w-max ${compact ? 'gap-3' : 'gap-4'}`}>
                {timeline.map((entry) => (
                    <div key={entry.date} className={compact ? 'w-16' : 'w-24'}>
                        <PlantInPot entry={entry} compact={compact} />
                    </div>
                ))}
            </div>
        </div>
    );
};

const SeedVisualization = ({ insight, compact = false, title, subtitle }) => {
    if (!insight) return null;

    const stageMeta = SEED_STAGE_META[insight.stage || 'seed'] || SEED_STAGE_META.seed;
    const healthMeta = SEED_HEALTH_META[insight.health || 'healthy'] || SEED_HEALTH_META.healthy;
    const growthPercent = Math.round((insight.growthProgress || 0) * 100);
    const consistencyPercent = Math.round((insight.consistencyRate || 0) * 100);

    if (compact) {
        return (
            <div className="rounded-[28px] border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800">{title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="rounded-full bg-emerald-50 px-2 py-1 font-medium text-emerald-700">{stageMeta.label}</span>
                            <span className={`rounded-full border px-2 py-1 font-medium ${healthMeta.badge}`}>{healthMeta.label}</span>
                        </div>
                    </div>
                    <div className="rounded-2xl bg-slate-900/5 px-3 py-2 text-right">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Care</div>
                        <div className="text-lg font-semibold text-slate-800">{consistencyPercent}%</div>
                    </div>
                </div>

                <div className="mt-4 rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-3">
                    <TimelineStrip insight={insight} compact />
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{insight.completedDays}/{insight.scheduledDays} completed</span>
                    <span>{insight.daysRemaining} days left</span>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-[32px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-amber-50 p-4 shadow-inner">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                            {stageMeta.label}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${healthMeta.badge}`}>
                            {healthMeta.label}
                        </span>
                    </div>
                    {title && <h4 className="mt-3 text-lg font-semibold text-slate-800">{title}</h4>}
                    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl bg-white/75 p-3 text-center shadow-sm">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Growth</div>
                        <div className="mt-1 text-xl font-semibold text-slate-800">{growthPercent}%</div>
                    </div>
                    <div className="rounded-2xl bg-white/75 p-3 text-center shadow-sm">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Care</div>
                        <div className="mt-1 text-xl font-semibold text-slate-800">{consistencyPercent}%</div>
                    </div>
                    <div className="rounded-2xl bg-white/75 p-3 text-center shadow-sm">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Done</div>
                        <div className="mt-1 text-xl font-semibold text-slate-800">{insight.completedDays}</div>
                    </div>
                    <div className="rounded-2xl bg-white/75 p-3 text-center shadow-sm">
                        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Left</div>
                        <div className="mt-1 text-xl font-semibold text-slate-800">{insight.daysRemaining}</div>
                    </div>
                </div>
            </div>

            <div className="mt-4 rounded-[28px] border border-emerald-100 bg-gradient-to-b from-sky-100 via-emerald-50 to-amber-100 p-4">
                <TimelineStrip insight={insight} />
            </div>

            <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                        <Sparkles size={16} className="text-emerald-600" />
                        <span className="text-sm font-semibold">Garden health</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{insight.healthMessage}</p>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200/70">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${growthPercent}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className={`h-full rounded-full bg-gradient-to-r ${healthMeta.accent}`}
                        />
                    </div>
                </div>

                <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-700">Pattern notes</div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <div className="flex items-center justify-between">
                            <span>Miss streak</span>
                            <span className="font-semibold text-slate-800">{insight.currentMissStreak}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Recovery streak</span>
                            <span className="font-semibold text-slate-800">{insight.currentRecoveryStreak}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Worst miss streak</span>
                            <span className="font-semibold text-slate-800">{insight.maxMissStreak}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SeedVisualization;
