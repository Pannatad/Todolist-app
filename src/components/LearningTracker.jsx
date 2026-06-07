import React, { useEffect, useState, useMemo } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, GraduationCap, Search, Archive, Zap, ChevronRight, FolderOpen, Settings, Minus, Target, BarChart3, Award, CheckCircle2, SlidersHorizontal, Tags } from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import LearningPathCard from './LearningPathCard';
import LearningPathModal from './LearningPathModal';
import LearningPathDetailView from './LearningPathDetailView';
import TimetableSummary from './TimetableSummary';
import { COLOR_OPTIONS } from './LearningPathModal';

const formatStudyTime = (minutes) => {
    if (!minutes) return '0h';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const getLastStudiedLabel = (lastStudiedAt) => {
    if (!lastStudiedAt) return 'No study log yet';

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const studiedDate = new Date(lastStudiedAt);
    const studiedDay = new Date(studiedDate);
    studiedDay.setHours(0, 0, 0, 0);

    const dayDiff = Math.round((startOfToday - studiedDay) / 86400000);
    if (dayDiff === 0) return 'Studied today';
    if (dayDiff === 1) return 'Studied yesterday';
    if (dayDiff < 7) return `Studied ${dayDiff}d ago`;

    return studiedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const DASHBOARD_SORT_OPTIONS = [
    { value: 'needs_attention', label: 'Needs Attention' },
    { value: 'progress_desc', label: 'Most Complete' },
    { value: 'progress_asc', label: 'Least Complete' },
    { value: 'recent', label: 'Recently Studied' },
    { value: 'studied_desc', label: 'Most Time Studied' },
    { value: 'name', label: 'Name' },
];

const PINNED_PATHS_STORAGE_KEY = 'learning-pinned-path-ids';

const SubjectProgressDashboard = ({
    subjects,
    categories,
    selectedCategory,
    onCategoryChange,
    sortMode,
    onSortModeChange,
    showArchived,
    onShowArchivedChange,
    onOpenSubject,
}) => {
    const activeSubjects = subjects.filter((subject) => subject.topicCount > 0);
    const averageProgress = activeSubjects.length
        ? Math.round(activeSubjects.reduce((sum, subject) => sum + subject.progress, 0) / activeSubjects.length)
        : 0;
    const completedTopics = activeSubjects.reduce((sum, subject) => sum + subject.completedCount, 0);
    const totalTopics = activeSubjects.reduce((sum, subject) => sum + subject.topicCount, 0);
    const strongestSubject = [...activeSubjects].sort((a, b) => b.progress - a.progress)[0];
    const attentionSubject = [...activeSubjects]
        .filter((subject) => subject.progress < 100)
        .sort((a, b) => {
            if (a.inProgressCount !== b.inProgressCount) return b.inProgressCount - a.inProgressCount;
            return a.progress - b.progress;
        })[0];

    if (subjects.length === 0) {
        return (
            <section className="rounded-[1.75rem] border border-sage-100 bg-white/85 p-10 text-center shadow-sm dark:border-white/10 dark:bg-void-900/80">
                <div className="w-14 h-14 rounded-2xl bg-sage-50 text-sage-600 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 size={24} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">No subjects to visualize yet</h3>
                <p className="text-sm text-gray-400 mt-2">Create a learning path and add topics to see your dashboard.</p>
            </section>
        );
    }

    return (
        <section className="overflow-hidden rounded-[1.75rem] border border-sage-100 bg-white/85 shadow-sm dark:border-white/10 dark:bg-void-900/80">
            <div className="px-5 py-4 border-b border-sage-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sage-50 text-sage-600 flex items-center justify-center">
                        <BarChart3 size={20} />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900">Subjects Dashboard</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Progress, momentum, and next topic across selected subjects.</p>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 min-w-full lg:min-w-[360px]">
                    <div className="rounded-xl bg-sage-50 px-3 py-2">
                        <div className="text-[10px] uppercase font-bold text-sage-500 tracking-wide">Average</div>
                        <div className="text-lg font-bold text-gray-900">{averageProgress}%</div>
                    </div>
                    <div className="rounded-xl bg-emerald-50 px-3 py-2">
                        <div className="text-[10px] uppercase font-bold text-emerald-500 tracking-wide">Topics</div>
                        <div className="text-lg font-bold text-emerald-700">{completedTopics}/{totalTopics}</div>
                    </div>
                    <div className="rounded-xl bg-amber-50 px-3 py-2">
                        <div className="text-[10px] uppercase font-bold text-amber-500 tracking-wide">Focus</div>
                        <div className="text-sm font-bold text-amber-700 truncate">{attentionSubject?.name || strongestSubject?.name || 'Ready'}</div>
                    </div>
                </div>
            </div>

            <div className="px-5 py-3 border-b border-sage-100 bg-sage-50/50 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between dark:border-white/10 dark:bg-void-800/40">
                <div className="flex flex-col sm:flex-row gap-2">
                    <label className="flex items-center gap-2 rounded-xl border border-sage-100 bg-white px-3 py-2 text-sm text-gray-500">
                        <SlidersHorizontal size={15} className="text-gray-400" />
                        <select
                            value={sortMode}
                            onChange={(event) => onSortModeChange(event.target.value)}
                            className="bg-transparent font-bold text-gray-700 focus:outline-none"
                        >
                            {DASHBOARD_SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </label>

                    <label className="flex items-center gap-2 rounded-xl border border-sage-100 bg-white px-3 py-2 text-sm text-gray-500">
                        <Tags size={15} className="text-gray-400" />
                        <select
                            value={selectedCategory}
                            onChange={(event) => onCategoryChange(event.target.value)}
                            className="bg-transparent font-bold text-gray-700 focus:outline-none"
                        >
                            <option value="all">All categories</option>
                            {categories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <button
                    onClick={() => onShowArchivedChange(!showArchived)}
                    className={`inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
                        showArchived
                            ? 'border-sage-200 bg-sage-50 text-sage-700'
                            : 'border-sage-100 bg-white text-gray-500 hover:bg-sage-50'
                    }`}
                >
                    <Archive size={15} />
                    Archived {showArchived ? 'shown' : 'hidden'}
                </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px]">
                <div className="space-y-3 p-3">
                    {subjects.map((subject, index) => {
                        const colorConfig = COLOR_OPTIONS.find((color) => color.name === subject.color) || COLOR_OPTIONS[0];
                        const hasTopics = subject.topicCount > 0;

                        return (
                            <Motion.button
                                key={subject.id}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ type: 'spring', stiffness: 320, damping: 32, delay: index * 0.03 }}
                                whileHover={{ x: 3 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => onOpenSubject(subject.id)}
                                className={`group w-full rounded-[1.35rem] border p-3 text-left shadow-sm transition-colors hover:bg-white/70 hover:shadow-md dark:bg-void-900/70 ${
                                    subject.archived
                                        ? 'border-slate-200 bg-slate-50/90'
                                        : `${colorConfig.soft || 'bg-sage-50'} ${colorConfig.border || 'border-sage-100'}`
                                }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-14 h-14 rounded-full flex-shrink-0 grid place-items-center shadow-sm"
                                        style={{ background: `conic-gradient(rgb(106 158 133) ${subject.progress * 3.6}deg, rgba(255,255,255,0.72) 0deg)` }}
                                    >
                                        <div className="w-11 h-11 rounded-full bg-white grid place-items-center text-xl shadow-sm">
                                            {subject.icon || '📚'}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="truncate text-sm font-black text-slate-950">{subject.name}</h4>
                                                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ring-1 ${colorConfig.text || 'text-sage-700'} bg-white/60 ${colorConfig.border || 'border-sage-100'}`}>
                                                        {subject.category}
                                                    </span>
                                                    {subject.archived && (
                                                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                                                            Archived
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="mt-0.5 truncate text-xs font-semibold text-slate-500/80">
                                                    {hasTopics ? subject.nextTopic || 'All topics completed' : 'No topics yet'}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <div className="text-lg font-black text-slate-950">{subject.progress}%</div>
                                                <div className="text-[10px] font-semibold text-slate-400">{getLastStudiedLabel(subject.lastStudiedAt)}</div>
                                            </div>
                                        </div>

                                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/65">
                                            <Motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${subject.progress}%` }}
                                                transition={{ type: 'spring', stiffness: 210, damping: 26 }}
                                                className={`h-full rounded-full bg-gradient-to-r ${colorConfig.gradient}`}
                                            />
                                        </div>

                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                                            <span className="rounded-full bg-white/60 px-2 py-0.5 text-emerald-700 ring-1 ring-emerald-100">
                                                {subject.completedCount}/{subject.topicCount} done
                                            </span>
                                            <span className="rounded-full bg-white/60 px-2 py-0.5 text-amber-700 ring-1 ring-amber-100">
                                                {subject.inProgressCount} active
                                            </span>
                                            <span className="rounded-full bg-white/60 px-2 py-0.5 text-sky-700 ring-1 ring-sky-100">
                                                {formatStudyTime(subject.studiedTime)} studied
                                            </span>
                                            {subject.plannedTime > 0 && (
                                                <span className="rounded-full bg-white/50 px-2 py-0.5 text-slate-500 ring-1 ring-white/70">
                                                    {formatStudyTime(subject.plannedTime)} planned
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <ChevronRight size={16} className="flex-shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-slate-600" />
                                </div>
                            </Motion.button>
                        );
                    })}
                </div>

                <aside className="border-t xl:border-t-0 xl:border-l border-sage-100 p-5 bg-sage-50/45 space-y-4 dark:border-white/10 dark:bg-void-800/30">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Award size={16} className="text-yellow-500" />
                            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Strongest</h4>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{strongestSubject?.name || 'No subjects yet'}</p>
                        <p className="text-xs text-gray-400 mt-1">{strongestSubject ? `${strongestSubject.progress}% complete` : 'Create a subject to start tracking.'}</p>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Zap size={16} className="text-amber-500" />
                            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Next Push</h4>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{attentionSubject?.name || 'All clear'}</p>
                        <p className="text-xs text-gray-400 mt-1">{attentionSubject?.nextTopic || 'Nothing urgent right now.'}</p>
                    </div>

                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 size={16} className="text-emerald-500" />
                            <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500">Completion</h4>
                        </div>
                        <div className="h-2 rounded-full bg-white overflow-hidden">
                            <div
                                className="h-full rounded-full bg-emerald-400"
                                style={{ width: totalTopics ? `${(completedTopics / totalTopics) * 100}%` : '0%' }}
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">{completedTopics} of {totalTopics} active topics completed.</p>
                    </div>
                </aside>
            </div>
        </section>
    );
};

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
        <div className="space-y-6">
            {/* Header Section */}
            <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="border-b border-slate-200 pb-4 dark:border-white/10"
            >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-sage-600 dark:text-sage-300">
                            <GraduationCap size={14} />
                            Learning
                        </div>
                        <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                            <h2 className="text-2xl font-black leading-none text-slate-950 dark:text-bone-100">Learning paths</h2>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pb-0.5 text-sm font-semibold text-slate-500 dark:text-bone-200/60">
                                <span>{stats.totalPaths} paths</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span>{stats.inProgress} in progress</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span>{stats.completed} completed</span>
                                <span className="h-1 w-1 rounded-full bg-slate-300" />
                                <span>
                                    {formatTime(stats.studiedTime)} studied
                                    {stats.plannedTime > 0 ? ` / ${formatTime(stats.plannedTime)} planned` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm dark:border-white/10 dark:bg-void-800">
                        <button
                            onClick={() => setLearningView('paths')}
                            className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-1.5 transition-all ${
                                learningView === 'paths'
                                    ? 'bg-slate-900 text-white dark:bg-bone-100 dark:text-void-950'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-bone-200/70 dark:hover:bg-void-700'
                            }`}
                        >
                            <BookOpen size={15} />
                            Paths
                        </button>
                        <button
                            onClick={() => setLearningView('dashboard')}
                            className={`px-3 py-1.5 rounded-md text-sm font-bold flex items-center gap-1.5 transition-all ${
                                learningView === 'dashboard'
                                    ? 'bg-slate-900 text-white dark:bg-bone-100 dark:text-void-950'
                                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-bone-200/70 dark:hover:bg-void-700'
                            }`}
                        >
                            <BarChart3 size={15} />
                            Dashboard
                        </button>
                    </div>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`p-2.5 rounded-lg border transition-all ${
                            showSettings
                                ? 'border-slate-300 bg-slate-100 text-slate-900'
                                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:border-white/10 dark:bg-void-800'
                        }`}
                        title="Learning Tracker Settings"
                    >
                        <Settings size={20} />
                    </button>
                    <button
                        onClick={() => {
                            if (canStart) {
                                setEditingPath(null);
                                setShowPathModal(true);
                            }
                        }}
                        disabled={!canStart}
                        className={`px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-all
                            ${canStart
                                ? 'bg-sage-700 text-white shadow-sm hover:bg-sage-800 active:scale-95 dark:bg-bone-100 dark:text-void-950'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            }`}
                    >
                        <Plus size={18} />
                        New Learning Path
                    </button>
                </div>
                </div>
            </Motion.div>

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <Motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-white/85 border border-sage-100 rounded-[1.5rem] p-5 shadow-sm mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 dark:border-white/10 dark:bg-void-900/80">
                            <div>
                                <h3 className="text-sm font-bold text-gray-800">Concurrent Learning Paths Limit</h3>
                                <p className="text-xs text-gray-500 mt-1 max-w-lg">
                                    Set the maximum number of courses you want to focus on at the same time. This encourages completing ongoing paths before starting new ones.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 bg-sage-50 p-1.5 rounded-xl border border-sage-100">
                                <button
                                    onClick={() => setMaxConcurrentPaths(Math.max(1, maxConcurrentPaths - 1))}
                                    className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all text-gray-600 disabled:opacity-50"
                                    disabled={maxConcurrentPaths <= 1}
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="w-8 text-center font-bold text-gray-800 text-lg">
                                    {maxConcurrentPaths}
                                </span>
                                <button
                                    onClick={() => setMaxConcurrentPaths(maxConcurrentPaths + 1)}
                                    className="p-2 bg-white rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all text-gray-600"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>

            {/* Concurrent Path Limit Banner */}
            {!canStart && (
                <Motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl"
                >
                    <div className="text-2xl">🔒</div>
                    <div className="flex-1">
                        <p className="text-sm font-bold text-amber-800">Focus Mode Active</p>
                        <p className="text-xs text-amber-600">
                            You have {activeCount} of {maxConcurrentPaths} courses in progress.
                            Only paths with topics you have actually started count toward this limit.
                        </p>
                    </div>
                </Motion.div>
            )}

            {learningView === 'dashboard' ? (
                <SubjectProgressDashboard
                    subjects={filteredDashboardSubjects}
                    categories={dashboardCategories}
                    selectedCategory={dashboardCategory}
                    onCategoryChange={setDashboardCategory}
                    sortMode={dashboardSort}
                    onSortModeChange={setDashboardSort}
                    showArchived={dashboardShowArchived}
                    onShowArchivedChange={setDashboardShowArchived}
                    onOpenSubject={setCurrentPathId}
                />
            ) : (
                <>
            {/* ── Continue Learning Block ─────────────────────── */}
            {inProgressTopics.length > 0 && (
                <Motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="flex items-center gap-2 mb-3">
                        <Zap size={18} className="text-amber-500" />
                        <h3 className="text-base font-bold text-gray-800">Continue Learning</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                            {inProgressTopics.length} in progress
                        </span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-sage-200">
                        {inProgressTopics.map((topic, idx) => {
                            const pathColor = COLOR_OPTIONS.find(c => c.name === topic.path?.color) || COLOR_OPTIONS[0];
                            return (
                                <Motion.button
                                    key={topic.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ type: 'spring', stiffness: 320, damping: 30, delay: 0.2 + idx * 0.04 }}
                                    whileHover={{ y: -2 }}
                                    onClick={() => setCurrentPathId(topic.learning_path_id)}
                                    className="group flex-shrink-0 min-w-[240px] max-w-[300px] rounded-[1.35rem] border border-amber-100 bg-white/85 p-4 text-left shadow-sm transition-colors hover:border-amber-200 hover:bg-amber-50/40 dark:border-white/10 dark:bg-void-900/80"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${pathColor.gradient} flex items-center justify-center text-sm shadow-sm`}>
                                            {topic.path?.icon || '📚'}
                                        </div>
                                        <span className="text-xs text-gray-400 font-medium truncate">{topic.path?.name}</span>
                                    </div>
                                    <h4 className="font-semibold text-sm text-gray-800 truncate mb-2">{topic.title}</h4>
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 font-semibold group-hover:text-amber-700">
                                        <span>Continue</span>
                                        <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </Motion.button>
                            );
                        })}
                    </div>
                </Motion.div>
            )}

            {/* Weekly Study Schedule Overview */}
            <TimetableSummary />

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search learning paths..."
                        className="w-full rounded-2xl border border-sage-100 bg-white/85 py-3 pl-9 pr-4 text-sm font-semibold text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 focus:border-sage-300 focus:ring-2 focus:ring-sage-100 dark:border-white/10 dark:bg-void-900/80 dark:text-bone-100"
                    />
                </div>
                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`p-3 rounded-2xl border transition-all flex items-center gap-2 text-sm shadow-sm
                        ${showArchived
                            ? 'bg-sage-100 border-sage-200 text-sage-700'
                            : 'bg-white border-sage-100 text-slate-400 hover:bg-sage-50 hover:text-sage-700'
                        }`}
                    title={showArchived ? 'Showing archived' : 'Show archived'}
                >
                    <Archive size={16} />
                </button>
            </div>

            {/* Learning Paths — Grouped by Category */}
            {isLoading ? (
                <div className="text-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-500 border-t-transparent mx-auto mb-3" />
                    <p className="text-gray-400 text-sm">Loading your learning paths...</p>
                </div>
            ) : filteredPaths.length === 0 ? (
                <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-16"
                >
                    <div className="text-6xl mb-4">📚</div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">
                        {searchQuery ? 'No paths found' : showArchived ? 'No archived paths' : 'Start Your Learning Journey'}
                    </h3>
                    <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                        {searchQuery
                            ? 'Try a different search term'
                            : 'Create your first learning path to organize and track topics you want to master.'
                        }
                    </p>
                    {!searchQuery && !showArchived && (
                        <button
                            onClick={() => {
                                if (canStart) {
                                    setEditingPath(null);
                                    setShowPathModal(true);
                                }
                            }}
                            disabled={!canStart}
                            className={`px-6 py-3 rounded-2xl font-bold inline-flex items-center gap-2 transition-all
                                ${canStart
                                    ? 'text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105'
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                }`}
                        >
                            <Plus size={18} />
                            Create Learning Path
                        </button>
                    )}
                </Motion.div>
            ) : (
                <div className="space-y-8">
                    {groupedPaths.map(({ category, paths: catPaths }) => (
                        <div key={category}>
                            {/* Category Header */}
                            {groupedPaths.length > 1 || category !== 'Uncategorized' ? (
                                <div className="mb-4 flex items-center gap-2.5">
                                    <div className="w-1 h-6 rounded-full bg-gradient-to-b from-sage-400 to-sky-500" />
                                    {category === 'Pinned' ? (
                                        <Target size={16} className="text-gray-400" />
                                    ) : (
                                        <FolderOpen size={16} className="text-gray-400" />
                                    )}
                                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600">{category}</h3>
                                    <span className="text-xs text-gray-400 font-medium">{catPaths.length}</span>
                                </div>
                            ) : null}

                            {/* Path Cards Grid */}
                            <Motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                <AnimatePresence>
                                    {catPaths.map((path, index) => {
                                        const pathTopics = topics.filter(t => t.learning_path_id === path.id);
                                        const completedCount = pathTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;

                                        return (
                                            <Motion.div
                                                key={path.id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ type: 'spring', stiffness: 320, damping: 32, delay: index * 0.035 }}
                                            >
                                                <LearningPathCard
                                                    path={path}
                                                    progress={getPathProgress(path.id)}
                                                    topicCount={pathTopics.length}
                                                    completedCount={completedCount}
                                                    plannedTime={getPathEstimatedTime(path.id)}
                                                    studiedTime={getPathTotalTime(path.id)}
                                                    isPinned={pinnedPathIds.includes(path.id)}
                                                    onClick={() => setCurrentPathId(path.id)}
                                                    onEdit={(p) => { setEditingPath(p); setShowPathModal(true); }}
                                                    onDelete={deleteLearningPath}
                                                    onArchive={archiveLearningPath}
                                                    onRestore={restoreLearningPath}
                                                    onTogglePin={handleTogglePinnedPath}
                                                />
                                            </Motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </Motion.div>
                        </div>
                    ))}
                </div>
            )}
                </>
            )}

            {/* Path Modal */}
            <LearningPathModal
                isOpen={showPathModal}
                onClose={() => { setShowPathModal(false); setEditingPath(null); }}
                onSave={handleSavePath}
                path={editingPath}
                existingCategories={existingCategories}
            />
        </div>
    );
};

export default LearningTracker;
