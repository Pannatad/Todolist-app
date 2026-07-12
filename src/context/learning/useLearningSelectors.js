import { useCallback } from 'react';
import { toLocalDateKey } from '../../utils/scheduleOccurrences';

export const useLearningSelectors = ({
    learningPaths,
    maxConcurrentPaths,
    resources,
    timeLogs,
    topics,
}) => {
    const getTopicsByPath = useCallback((pathId) => {
        return topics.filter(t => t.learning_path_id === pathId);
    }, [topics]);

    const getTopicsBySection = useCallback((pathId, section) => {
        return topics
            .filter(t => t.learning_path_id === pathId && t.section === section)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }, [topics]);

    const getResourcesByTopic = useCallback((topicId) => {
        return resources
            .filter(r => r.topic_id === topicId)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }, [resources]);

    const getTopicTimeLogs = useCallback((topicId) => {
        return timeLogs
            .filter((log) => log.topic_id === topicId)
            .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
    }, [timeLogs]);

    const getPathProgress = useCallback((pathId) => {
        const pathTopics = topics.filter(t => t.learning_path_id === pathId);
        if (pathTopics.length === 0) return 0;
        const completed = pathTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;
        return Math.round((completed / pathTopics.length) * 100);
    }, [topics]);

    const getPathEstimatedTime = useCallback((pathId) => {
        return topics
            .filter((topic) => topic.learning_path_id === pathId)
            .reduce((sum, topic) => sum + (topic.estimated_time || 0), 0);
    }, [topics]);

    const getPathTotalTime = useCallback((pathId) => {
        const pathTopicIds = topics.filter(t => t.learning_path_id === pathId).map(t => t.id);
        return timeLogs
            .filter(l => pathTopicIds.includes(l.topic_id))
            .reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    }, [topics, timeLogs]);

    const getTopicTotalTime = useCallback((topicId) => {
        return timeLogs
            .filter(l => l.topic_id === topicId)
            .reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    }, [timeLogs]);

    const getCurrentFocusTopics = useCallback(() => {
        return topics
            .filter(t => t.section === 'current_focus')
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }, [topics]);

    const getLearningStreak = useCallback(() => {
        if (timeLogs.length === 0) return 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get unique dates with logged time
        const logDates = [...new Set(
            timeLogs.map(l => {
                const d = new Date(l.logged_at);
                d.setHours(0, 0, 0, 0);
                return d.getTime();
            })
        )].sort((a, b) => b - a); // most recent first

        let streak = 0;
        let checkDate = today.getTime();

        for (const logDate of logDates) {
            if (logDate === checkDate) {
                streak++;
                checkDate -= 86400000; // subtract one day
            } else if (logDate < checkDate) {
                // Check if yesterday (allow current day to not have a log yet)
                if (streak === 0 && logDate === checkDate - 86400000) {
                    streak++;
                    checkDate = logDate - 86400000;
                } else {
                    break;
                }
            }
        }

        return streak;
    }, [timeLogs]);

    const getWeeklyStats = useCallback(() => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400000);

        const weekLogs = timeLogs.filter(l => new Date(l.logged_at) >= weekAgo);
        const weekTopicsCompleted = topics.filter(t =>
            t.completed_at && new Date(t.completed_at) >= weekAgo
        ).length;

        return {
            totalMinutes: weekLogs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0),
            sessionsCount: weekLogs.length,
            topicsCompleted: weekTopicsCompleted,
        };
    }, [timeLogs, topics]);

    const getActivePaths = useCallback(() => {
        return learningPaths.filter(p => !p.archived);
    }, [learningPaths]);

    const getCategories = useCallback(() => {
        const cats = learningPaths
            .map(p => p.category)
            .filter(c => c && c.trim() !== '');
        return [...new Set(cats)].sort();
    }, [learningPaths]);

    const getInProgressTopicsWithPaths = useCallback(() => {
        return topics
            .filter(t => t.status === 'in_progress')
            .map(t => {
                const path = learningPaths.find(p => p.id === t.learning_path_id);
                return { ...t, path };
            })
            .filter(t => t.path && !t.path.archived);
    }, [topics, learningPaths]);

    // ── Path Dependency / Concurrent Limit ─────────────
    const getActiveInProgressPathCount = useCallback(() => {
        const activePaths = learningPaths.filter((path) => !path.archived);
        return activePaths.filter((path) => {
            const pathTopics = topics.filter((topic) => topic.learning_path_id === path.id);
            if (pathTopics.length === 0) return false;

            const hasStartedTopic = pathTopics.some((topic) => topic.status !== 'not_started');
            const hasIncompleteTopic = pathTopics.some((topic) => topic.status !== 'completed' && topic.status !== 'mastered');

            return hasStartedTopic && hasIncompleteTopic;
        }).length;
    }, [learningPaths, topics]);

    const canStartNewPath = useCallback(() => {
        return getActiveInProgressPathCount() < maxConcurrentPaths;
    }, [getActiveInProgressPathCount, maxConcurrentPaths]);

    // ── Timetable Helpers ──────────────────────────────
    const getTimetableForDay = useCallback((dayOfWeek, date = null) => {
        // Returns all timetable entries across active paths for a given day (0=Sun...6=Sat)
        // If date is provided, also filters by startDate/endDate range
        const activePaths = learningPaths.filter(p => !p.archived);
        const entries = [];
        const dateStr = date ? toLocalDateKey(date) : null;

        activePaths.forEach(path => {
            const timetable = path.timetable || [];
            timetable.forEach(slot => {
                if (slot.day !== dayOfWeek) return;

                // Check date range if present
                if (dateStr) {
                    if (slot.startDate && dateStr < slot.startDate) return;
                    if (slot.endDate && dateStr > slot.endDate) return;
                }

                entries.push({
                    ...slot,
                    pathId: path.id,
                    pathName: path.name,
                    pathIcon: path.icon,
                    pathColor: path.color,
                });
            });
        });
        return entries;
    }, [learningPaths]);

    const getAllTimetableEntries = useCallback(() => {
        const activePaths = learningPaths.filter(p => !p.archived);
        const entries = [];
        activePaths.forEach(path => {
            const timetable = path.timetable || [];
            timetable.forEach(slot => {
                entries.push({
                    ...slot,
                    pathId: path.id,
                    pathName: path.name,
                    pathIcon: path.icon,
                    pathColor: path.color,
                });
            });
        });
        return entries;
    }, [learningPaths]);

    // ── File Upload Helpers (Supabase Storage) ─────────
    return {
        canStartNewPath,
        getActiveInProgressPathCount,
        getActivePaths,
        getAllTimetableEntries,
        getCategories,
        getCurrentFocusTopics,
        getInProgressTopicsWithPaths,
        getLearningStreak,
        getPathEstimatedTime,
        getPathProgress,
        getPathTotalTime,
        getResourcesByTopic,
        getTimetableForDay,
        getTopicTimeLogs,
        getTopicTotalTime,
        getTopicsByPath,
        getTopicsBySection,
        getWeeklyStats,
    };
};

