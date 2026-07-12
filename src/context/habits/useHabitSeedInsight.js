import { useCallback } from 'react';
import {
    DEFAULT_SEED_DURATION_DAYS,
    getNextSeedCompletionMilestone,
    getSeedStageFromCompletedDays,
    getSeedStageFromProgress,
} from '../../constants/habitSeeds';
import { toLocalDateKey } from '../../utils/scheduleOccurrences';
import {
    getHabitLogFromMap,
    isHabitScheduledOnDate,
    isSameDay,
    startOfDay,
} from '../habitContextUtils';

export const useHabitSeedInsight = ({ habitLogs, storedHabits }) => (
    useCallback((habitId) => {
        const habit = storedHabits.find((item) => item.id === habitId && !item.archived);
        if (!habit?.is_seed) return null;

        const startedAt = startOfDay(habit.seed_started_at || habit.created_at || new Date());
        const today = startOfDay(new Date());
        const durationDays = Number(habit.seed_duration_days) > 0
            ? Number(habit.seed_duration_days)
            : DEFAULT_SEED_DURATION_DAYS;

        const timeline = [];
        const pastScheduledResults = [];

        let countedScheduledDays = 0;
        let completedDays = 0;
        let runningMissStreak = 0;
        let maxMissStreak = 0;
        let scheduledSlotsSeen = 0;
        let elapsedScheduledDays = 0;
        let seedEnded = false;
        let seedEndedAt = null;

        const maxTimelineDays = Math.max(durationDays * 14, durationDays + 14);

        for (let index = 0; index < maxTimelineDays && scheduledSlotsSeen < durationDays; index += 1) {
            const date = new Date(startedAt);
            date.setDate(startedAt.getDate() + index);

            const scheduled = isHabitScheduledOnDate(habit, date);
            if (scheduled) {
                scheduledSlotsSeen += 1;
                if (date <= today) {
                    elapsedScheduledDays += 1;
                }
            }
            const log = getHabitLogFromMap(habitLogs, habitId, date);
            const completed = Boolean(log?.completed);
            const explicitlyMarkedIncomplete = Boolean(log && log.completed === false && Number(log.value || 0) <= 0);
            const isFuture = date > today;
            const isToday = isSameDay(date, today);
            const isPast = date < today;
            const progressIndex = Math.max(scheduledSlotsSeen, 1);
            const growthScale = 0.45 + ((Math.min(progressIndex, durationDays) / durationDays) * 0.8);

            let status = 'future';
            let completionNumber = null;
            let completionStage = null;

            if (!scheduled) {
                status = seedEnded ? 'ended' : isFuture ? 'future-free' : 'free';
            } else if (seedEnded) {
                status = 'ended';
            } else if (completed) {
                status = 'completed';
                runningMissStreak = 0;

                if (isPast || isToday) {
                    countedScheduledDays += 1;
                    completedDays += 1;
                    completionNumber = completedDays;
                    completionStage = getSeedStageFromCompletedDays(completedDays, durationDays);
                    pastScheduledResults.push({ completed: true, date: toLocalDateKey(date) });
                }
            } else if (isFuture) {
                status = 'future';
            } else if (isToday && !explicitlyMarkedIncomplete) {
                status = 'today';
            } else {
                countedScheduledDays += 1;
                runningMissStreak += 1;
                maxMissStreak = Math.max(maxMissStreak, runningMissStreak);

                if (runningMissStreak >= 4) {
                    status = 'ended';
                    seedEnded = true;
                    seedEndedAt = toLocalDateKey(date);
                } else if (runningMissStreak >= 3) status = 'final-warning';
                else if (runningMissStreak >= 2) status = 'warning';
                else status = 'missed';

                pastScheduledResults.push({ completed: false, date: toLocalDateKey(date) });
            }

            timeline.push({
                index,
                dayNumber: timeline.length + 1,
                date: toLocalDateKey(date),
                scheduled,
                completed,
                isToday,
                isFuture,
                status,
                growthScale,
                stage: getSeedStageFromProgress((index + 1) / durationDays),
                completionNumber,
                completionStage,
            });
        }

        let currentMissStreak = 0;
        if (pastScheduledResults.length > 0) {
            for (let index = pastScheduledResults.length - 1; index >= 0; index -= 1) {
                if (!pastScheduledResults[index].completed) currentMissStreak += 1;
                else break;
            }
        }

        let currentRecoveryStreak = 0;
        if (currentMissStreak === 0 && pastScheduledResults.length > 0) {
            for (let index = pastScheduledResults.length - 1; index >= 0; index -= 1) {
                if (pastScheduledResults[index].completed) currentRecoveryStreak += 1;
                else break;
            }
        }

        let recentDecay = false;
        let localMissWindow = 0;
        const recentResults = pastScheduledResults.slice(-14);
        recentResults.forEach((result) => {
            if (result.completed) {
                localMissWindow = 0;
                return;
            }
            localMissWindow += 1;
            if (localMissWindow >= 3) recentDecay = true;
        });

        let health = 'healthy';
        if (seedEnded || maxMissStreak >= 4) health = 'ended';
        else if (currentMissStreak >= 3) health = 'final_warning';
        else if (currentMissStreak >= 2) health = 'warning';
        else if (currentMissStreak > 0) health = 'dry';
        else if (recentDecay && currentRecoveryStreak > 0 && currentRecoveryStreak < 3) health = 'recovering';

        const elapsedDays = Math.max(1, Math.min(durationDays, elapsedScheduledDays || 1));

        const timeProgress = elapsedDays / durationDays;
        const completionProgress = Math.min(1, completedDays / durationDays);
        const consistencyRate = countedScheduledDays > 0 ? completedDays / countedScheduledDays : 0;
        const growthProgress = completionProgress;
        const suggestedStage = getSeedStageFromCompletedDays(completedDays, durationDays);
        const nextGrowthMilestone = getNextSeedCompletionMilestone(completedDays, durationDays);
        const completionsToNextStage = suggestedStage === 'blooming'
            ? 0
            : Math.max(0, nextGrowthMilestone - completedDays);

        let healthMessage = 'Only scheduled days count for this seed. Free days stay neutral.';
        if (health === 'ended') {
            healthMessage = 'This seed ended after 4 missed days in a row. Replant a new seed to restart this habit.';
        } else if (health === 'final_warning') {
            healthMessage = 'Final warning: 3 missed days in a row. One more missed scheduled day will end this seed.';
        } else if (health === 'warning') {
            healthMessage = 'Warning: 2 missed days in a row. Complete the next scheduled day to keep this seed alive.';
        } else if (health === 'dry') {
            healthMessage = '1 missed day. The soil is dry, but this seed can recover with the next completion.';
        } else if (health === 'recovering') {
            healthMessage = 'Recovery has started. Keep the streak going for a few more days.';
        }

        return {
            startedAt: startedAt.toISOString(),
            durationDays,
            elapsedDays,
            daysRemaining: Math.max(0, durationDays - elapsedDays),
            scheduledDays: countedScheduledDays,
            completedDays,
            timeProgress,
            completionProgress,
            consistencyRate,
            growthProgress,
            stage: suggestedStage,
            storedStage: habit.seed_stage,
            suggestedStage,
            nextGrowthMilestone,
            completionsToNextStage,
            readyToGraduate: elapsedDays >= durationDays && consistencyRate >= 0.8,
            timeline,
            health,
            currentMissStreak,
            currentRecoveryStreak,
            maxMissStreak,
            recentDecay,
            healthMessage,
            ended: health === 'ended',
            endedAt: seedEndedAt,
        };
    }, [habitLogs, storedHabits])

);
