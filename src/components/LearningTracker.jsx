import React, { useEffect, useMemo, useState } from 'react';
import { useLearning } from '../context/LearningContext';
import LearningPathDetailView from './LearningPathDetailView';
import LearningTrackerContent from './LearningTrackerContent';
import { DASHBOARD_SORT_OPTIONS, PINNED_PATHS_STORAGE_KEY } from './learningTrackerUtils';

const LearningTracker = () => {
    const {
        learningPaths,
        topics,
        timeLogs,
        isLoading,
        currentPathId,
        setCurrentPathId,
        addLearningPath,
        updateLearningPath,
        deleteLearningPath,
        archiveLearningPath,
        restoreLearningPath,
        getPathProgress,
        getPathEstimatedTime,
        getPathTotalTime,
        getCategories,
        getInProgressTopicsWithPaths,
        canStartNewPath,
        getActiveInProgressPathCount,
        maxConcurrentPaths,
        setMaxConcurrentPaths,
    } = useLearning();

    const [showPathModal, setShowPathModal] = useState(false);
    const [editingPath, setEditingPath] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [learningView, setLearningView] = useState('paths');
    const [dashboardSort, setDashboardSort] = useState('needs_attention');
    const [dashboardCategory, setDashboardCategory] = useState('all');
    const [dashboardShowArchived, setDashboardShowArchived] = useState(false);
    const [pinnedPathIds, setPinnedPathIds] = useState(() => {
        try {
            const saved = localStorage.getItem(PINNED_PATHS_STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (error) {
            console.error('Failed to load pinned learning paths:', error);
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem(PINNED_PATHS_STORAGE_KEY, JSON.stringify(pinnedPathIds));
    }, [pinnedPathIds]);

    // Get current detail path
    const currentPath = useMemo(() =>
        learningPaths.find(p => p.id === currentPathId),
        [learningPaths, currentPathId]
    );

    // Filtered paths
    const filteredPaths = useMemo(() => {
        let paths = learningPaths.filter(p => showArchived ? p.archived : !p.archived);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            paths = paths.filter(p =>
                p.name.toLowerCase().includes(q) ||
                p.description?.toLowerCase().includes(q) ||
                p.category?.toLowerCase().includes(q)
            );
        }
        return paths;
    }, [learningPaths, showArchived, searchQuery]);

    // Group by category
    const groupedPaths = useMemo(() => {
        const groups = {};
        const pinnedPaths = filteredPaths.filter((path) => pinnedPathIds.includes(path.id));
        const unpinnedPaths = filteredPaths.filter((path) => !pinnedPathIds.includes(path.id));

        unpinnedPaths.forEach(path => {
            const cat = path.category && path.category.trim() !== '' ? path.category.trim() : 'Uncategorized';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(path);
        });
        // Sort categories alphabetically, but Uncategorized last
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            if (a === 'Uncategorized') return 1;
            if (b === 'Uncategorized') return -1;
            return a.localeCompare(b);
        });
        const categoryGroups = sortedKeys.map(key => ({ category: key, paths: groups[key] }));
        return pinnedPaths.length > 0
            ? [{ category: 'Pinned', paths: pinnedPaths }, ...categoryGroups]
            : categoryGroups;
    }, [filteredPaths, pinnedPathIds]);

    // In-progress topics
    const inProgressTopics = useMemo(() => getInProgressTopicsWithPaths(), [getInProgressTopicsWithPaths]);
    const canStart = canStartNewPath();
    const activeCount = getActiveInProgressPathCount();

    // Existing categories for autocomplete
    const existingCategories = useMemo(() => getCategories(), [getCategories]);
    const dashboardCategories = useMemo(() => {
        const categories = learningPaths.map((path) => path.category?.trim() || 'Uncategorized');
        return [...new Set(categories)].sort((a, b) => {
            if (a === 'Uncategorized') return 1;
            if (b === 'Uncategorized') return -1;
            return a.localeCompare(b);
        });
    }, [learningPaths]);

    // Overall stats
    const stats = useMemo(() => {
        const activePaths = learningPaths.filter(p => !p.archived);
        const activePathIds = activePaths.map(p => p.id);
        const activeTopics = topics.filter((topic) => activePathIds.includes(topic.learning_path_id));
        const completed = activeTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;
        const inProgress = activeTopics.filter(t => t.status === 'in_progress').length;
        const plannedTime = activeTopics
            .filter(t => activePathIds.includes(t.learning_path_id))
            .reduce((sum, t) => sum + (t.estimated_time || 0), 0);
        const studiedTime = activePathIds.reduce((sum, pathId) => sum + getPathTotalTime(pathId), 0);

        return {
            totalPaths: activePaths.length,
            totalTopics: activeTopics.length,
            completed,
            inProgress,
            plannedTime,
            studiedTime,
        };
    }, [learningPaths, topics, getPathTotalTime]);

    const subjectDashboard = useMemo(() => {
        return learningPaths
            .map((path) => {
                const pathTopics = topics
                    .filter((topic) => topic.learning_path_id === path.id)
                    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                const topicIds = pathTopics.map((topic) => topic.id);
                const completedCount = pathTopics.filter((topic) => topic.status === 'completed' || topic.status === 'mastered').length;
                const inProgressCount = pathTopics.filter((topic) => topic.status === 'in_progress').length;
                const plannedTime = pathTopics.reduce((sum, topic) => sum + (topic.estimated_time || 0), 0);
                const pathLogs = timeLogs
                    .filter((log) => topicIds.includes(log.topic_id))
                    .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
                const nextTopic = (
                    pathTopics.find((topic) => topic.section === 'current_focus' && topic.status !== 'completed' && topic.status !== 'mastered') ||
                    pathTopics.find((topic) => topic.status === 'in_progress') ||
                    pathTopics.find((topic) => topic.status !== 'completed' && topic.status !== 'mastered')
                )?.title;

                return {
                    id: path.id,
                    name: path.name,
                    icon: path.icon,
                    color: path.color,
                    category: path.category?.trim() || 'Uncategorized',
                    archived: !!path.archived,
                    progress: getPathProgress(path.id),
                    topicCount: pathTopics.length,
                    completedCount,
                    inProgressCount,
                    plannedTime,
                    studiedTime: getPathTotalTime(path.id),
                    lastStudiedAt: pathLogs[0]?.logged_at || null,
                    nextTopic,
                };
            });
    }, [learningPaths, topics, timeLogs, getPathProgress, getPathTotalTime]);

    const filteredDashboardSubjects = useMemo(() => {
        const lastStudiedTime = (subject) => (
            subject.lastStudiedAt ? new Date(subject.lastStudiedAt).getTime() : 0
        );

        return subjectDashboard
            .filter((subject) => dashboardShowArchived || !subject.archived)
            .filter((subject) => dashboardCategory === 'all' || subject.category === dashboardCategory)
            .sort((a, b) => {
                if (a.archived !== b.archived) return a.archived ? 1 : -1;

                switch (dashboardSort) {
                    case 'progress_desc':
                        return b.progress - a.progress || a.name.localeCompare(b.name);
                    case 'progress_asc':
                        return a.progress - b.progress || a.name.localeCompare(b.name);
                    case 'recent':
                        return lastStudiedTime(b) - lastStudiedTime(a) || a.name.localeCompare(b.name);
                    case 'studied_desc':
                        return b.studiedTime - a.studiedTime || a.name.localeCompare(b.name);
                    case 'name':
                        return a.name.localeCompare(b.name);
                    case 'needs_attention':
                    default:
                        if (a.progress === 100 && b.progress !== 100) return 1;
                        if (b.progress === 100 && a.progress !== 100) return -1;
                        if (b.inProgressCount !== a.inProgressCount) return b.inProgressCount - a.inProgressCount;
                        return a.progress - b.progress || a.name.localeCompare(b.name);
                }
            });
    }, [subjectDashboard, dashboardShowArchived, dashboardCategory, dashboardSort]);

    const formatTime = (minutes) => {
        if (!minutes) return '0h';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        return `${h}h`;
    };

    // Handle save path
    const handleSavePath = async (pathData) => {
        if (pathData.id) {
            await updateLearningPath(pathData.id, pathData);
        } else {
            await addLearningPath(pathData);
        }
    };

    const handleTogglePinnedPath = (pathId) => {
        setPinnedPathIds((prev) => (
            prev.includes(pathId)
                ? prev.filter((id) => id !== pathId)
                : [pathId, ...prev]
        ));
    };

    // If viewing a specific path detail
    if (currentPath) {
        return (
            <LearningPathDetailView
                path={currentPath}
                onBack={() => setCurrentPathId(null)}
            />
        );
    }

    return (
        <LearningTrackerContent
            activeCount={activeCount}
            canStart={canStart}
            dashboardCategories={dashboardCategories}
            dashboardCategory={dashboardCategory}
            dashboardShowArchived={dashboardShowArchived}
            dashboardSort={dashboardSort}
            archiveLearningPath={archiveLearningPath}
            deleteLearningPath={deleteLearningPath}
            editingPath={editingPath}
            existingCategories={existingCategories}
            filteredDashboardSubjects={filteredDashboardSubjects}
            filteredPaths={filteredPaths}
            formatTime={formatTime}
            getPathEstimatedTime={getPathEstimatedTime}
            getPathProgress={getPathProgress}
            getPathTotalTime={getPathTotalTime}
            groupedPaths={groupedPaths}
            handleSavePath={handleSavePath}
            handleTogglePinnedPath={handleTogglePinnedPath}
            inProgressTopics={inProgressTopics}
            isLoading={isLoading}
            learningView={learningView}
            maxConcurrentPaths={maxConcurrentPaths}
            pinnedPathIds={pinnedPathIds}
            searchQuery={searchQuery}
            restoreLearningPath={restoreLearningPath}
            setCurrentPathId={setCurrentPathId}
            setDashboardCategory={setDashboardCategory}
            setDashboardShowArchived={setDashboardShowArchived}
            setDashboardSort={setDashboardSort}
            setEditingPath={setEditingPath}
            setLearningView={setLearningView}
            setMaxConcurrentPaths={setMaxConcurrentPaths}
            setSearchQuery={setSearchQuery}
            setShowArchived={setShowArchived}
            setShowPathModal={setShowPathModal}
            setShowSettings={setShowSettings}
            showArchived={showArchived}
            showPathModal={showPathModal}
            showSettings={showSettings}
            stats={stats}
            topics={topics}
        />
    );
};

export default LearningTracker;
