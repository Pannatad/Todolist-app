import { DEFAULT_SEED_DURATION_DAYS } from '../constants/habitSeeds';
import { toLocalDateKey } from '../utils/scheduleOccurrences';

const startOfDay = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
};

const isSameDay = (left, right) => toLocalDateKey(left) === toLocalDateKey(right);

const normalizeHabit = (habit) => ({
    ...habit,
    is_seed: Boolean(habit?.is_seed),
    archived: habit?.archived === true,
    seed_started_at: habit?.seed_started_at || null,
    seed_duration_days: Number(habit?.seed_duration_days) > 0
        ? Number(habit.seed_duration_days)
        : DEFAULT_SEED_DURATION_DAYS,
    seed_why: habit?.seed_why || '',
    seed_stage: habit?.seed_stage || null,
    completedDates: Array.isArray(habit?.completedDates) ? habit.completedDates : [],
    completedToday: habit?.completedToday === true,
    streak: Number(habit?.streak) || 0,
    bestStreak: Number(habit?.bestStreak) || 0,
});

const normalizeHabitLog = (log) => ({
    ...log,
    notes: log?.notes || '',
});

const isHabitScheduledOnDate = (habit, date) => {
    if (habit.frequency === 'daily') return true;
    if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
        return habit.schedule_days?.includes(date.getDay());
    }
    return true;
};

const getHabitLogKey = (habitId, date) => (
    `${habitId}_${typeof date === 'string' ? date : toLocalDateKey(date)}`
);

const getHabitLogFromMap = (logsMap, habitId, date) => (
    logsMap[getHabitLogKey(habitId, date)] || null
);

const getYesterdayDate = (referenceDate = new Date()) => {
    const yesterday = startOfDay(referenceDate);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
};

const canEditHabitLogDate = (date, referenceDate = new Date()) => {
    const dateKey = typeof date === 'string' ? date : toLocalDateKey(date);
    const todayKey = toLocalDateKey(referenceDate);
    const yesterdayKey = toLocalDateKey(getYesterdayDate(referenceDate));

    return dateKey === todayKey || dateKey === yesterdayKey;
};

const buildCompletedDatesByHabit = (logsMap) => {
    const completedDatesByHabit = {};

    Object.values(logsMap).forEach((log) => {
        if (!log?.habit_id || !log.completed) return;
        if (!completedDatesByHabit[log.habit_id]) {
            completedDatesByHabit[log.habit_id] = [];
        }
        completedDatesByHabit[log.habit_id].push(log.date);
    });

    Object.values(completedDatesByHabit).forEach((dates) => dates.sort());

    return completedDatesByHabit;
};

const calculateHabitStreak = (habit, logsMap) => {
    if (!habit) return { current: 0, best: 0 };

    let currentStreak = 0;
    let bestStreak = 0;
    let tempStreak = 0;

    const today = startOfDay(new Date());

    for (let index = 0; index < 365; index += 1) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - index);

        if (!isHabitScheduledOnDate(habit, checkDate)) continue;

        const log = getHabitLogFromMap(logsMap, habit.id, checkDate);
        if (log?.completed) {
            tempStreak += 1;
            if (index === 0 || currentStreak > 0) {
                currentStreak = tempStreak;
            }
            bestStreak = Math.max(bestStreak, tempStreak);
            continue;
        }

        if (index > 0) {
            tempStreak = 0;
            if (currentStreak > 0) currentStreak = 0;
        }
    }

    return { current: currentStreak, best: bestStreak };
};

const decorateHabit = (habit, logsMap, completedDatesByHabit, todayKey) => {
    const completedDates = completedDatesByHabit[habit.id] || [];
    const streak = calculateHabitStreak(habit, logsMap);

    return normalizeHabit({
        ...habit,
        completedDates,
        completedToday: completedDates.includes(todayKey),
        streak: streak.current,
        bestStreak: streak.best,
    });
};


export {
    buildCompletedDatesByHabit,
    calculateHabitStreak,
    canEditHabitLogDate,
    decorateHabit,
    getHabitLogFromMap,
    getHabitLogKey,
    isHabitScheduledOnDate,
    isSameDay,
    normalizeHabit,
    normalizeHabitLog,
    startOfDay,
};
