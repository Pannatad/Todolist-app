export const DEFAULT_SEED_DURATION_DAYS = 21;
export const SEED_COMPLETION_MILESTONE_DAYS = 7;

export const SEED_STAGES = ['seed', 'sprout', 'rooted', 'blooming'];

export const SEED_STAGE_META = {
    seed: {
        label: 'Seed',
        shortLabel: 'Seed',
        accent: 'from-amber-300 via-lime-200 to-emerald-300',
        description: 'A tiny promise worth protecting.',
    },
    sprout: {
        label: 'Sprout',
        shortLabel: 'Sprout',
        accent: 'from-lime-300 via-emerald-300 to-teal-300',
        description: 'Early growth is showing up.',
    },
    rooted: {
        label: 'Rooted',
        shortLabel: 'Rooted',
        accent: 'from-emerald-300 via-teal-300 to-cyan-300',
        description: 'This habit is starting to hold.',
    },
    blooming: {
        label: 'Blooming',
        shortLabel: 'Blooming',
        accent: 'from-fuchsia-300 via-pink-300 to-amber-200',
        description: 'Steady care has turned into momentum.',
    },
};

export const SEED_HEALTH_META = {
    healthy: {
        label: 'Healthy',
        accent: 'from-emerald-400 to-teal-400',
        badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        description: 'Steady care is keeping this seed alive.',
    },
    recovering: {
        label: 'Recovering',
        accent: 'from-cyan-400 to-emerald-400',
        badge: 'bg-cyan-100 text-cyan-700 border-cyan-200',
        description: 'A fresh streak is bringing the seed back.',
    },
    dry: {
        label: 'Dry Soil',
        accent: 'from-amber-300 to-orange-300',
        badge: 'bg-amber-100 text-amber-700 border-amber-200',
        description: 'One missed day is drying the soil out.',
    },
    warning: {
        label: 'Warning',
        accent: 'from-red-400 to-orange-400',
        badge: 'bg-red-100 text-red-700 border-red-200',
        description: 'Two missed days in a row puts this seed at risk.',
    },
    final_warning: {
        label: 'Final Warning',
        accent: 'from-rose-500 to-red-600',
        badge: 'bg-rose-100 text-rose-700 border-rose-200',
        description: 'Three missed days in a row. One more miss ends this seed.',
    },
    rotting: {
        label: 'Rotting',
        accent: 'from-orange-400 to-rose-400',
        badge: 'bg-orange-100 text-orange-700 border-orange-200',
        description: 'More than two missed days has started to damage this seed.',
    },
    dead: {
        label: 'Dead',
        accent: 'from-slate-500 to-slate-700',
        badge: 'bg-slate-200 text-slate-700 border-slate-300',
        description: 'This seed has gone dormant after a long miss streak.',
    },
    ended: {
        label: 'Ended',
        accent: 'from-zinc-500 to-red-700',
        badge: 'bg-zinc-200 text-zinc-800 border-zinc-300',
        description: 'This seed ended after four missed days in a row.',
    },
};

export const getSeedStageFromProgress = (progress = 0) => {
    if (progress >= 1) return 'blooming';
    if (progress >= 0.66) return 'rooted';
    if (progress >= 0.33) return 'sprout';
    return 'seed';
};

export const getSeedCompletionMilestones = (durationDays = DEFAULT_SEED_DURATION_DAYS) => {
    const duration = Math.max(1, Number(durationDays) || DEFAULT_SEED_DURATION_DAYS);
    const sproutAt = Math.max(1, Math.min(SEED_COMPLETION_MILESTONE_DAYS, Math.ceil(duration * 0.33)));
    const rootedAt = Math.max(sproutAt + 1, Math.min(SEED_COMPLETION_MILESTONE_DAYS * 2, Math.ceil(duration * 0.66)));

    return {
        sproutAt,
        rootedAt,
        bloomAt: duration,
    };
};

export const getSeedStageFromCompletedDays = (completedDays = 0, durationDays = DEFAULT_SEED_DURATION_DAYS) => {
    const completed = Math.max(0, Number(completedDays) || 0);
    const { sproutAt, rootedAt, bloomAt } = getSeedCompletionMilestones(durationDays);

    if (completed >= bloomAt) return 'blooming';
    if (completed >= rootedAt) return 'rooted';
    if (completed >= sproutAt) return 'sprout';
    return 'seed';
};

export const getNextSeedCompletionMilestone = (completedDays = 0, durationDays = DEFAULT_SEED_DURATION_DAYS) => {
    const completed = Math.max(0, Number(completedDays) || 0);
    const { sproutAt, rootedAt, bloomAt } = getSeedCompletionMilestones(durationDays);
    return [sproutAt, rootedAt, bloomAt].find((milestone) => milestone > completed) || bloomAt;
};
