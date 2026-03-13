import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Clock, Flame, TrendingUp, GraduationCap, Search, Archive, Zap, ChevronRight, FolderOpen } from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import LearningPathCard from './LearningPathCard';
import LearningPathModal from './LearningPathModal';
import LearningPathDetailView from './LearningPathDetailView';
import { COLOR_OPTIONS } from './LearningPathModal';

const LearningTracker = () => {
    const {
        learningPaths,
        topics,
        isLoading,
        currentPathId,
        setCurrentPathId,
        addLearningPath,
        updateLearningPath,
        deleteLearningPath,
        archiveLearningPath,
        getPathProgress,
        getCategories,
        getInProgressTopicsWithPaths,
    } = useLearning();

    const [showPathModal, setShowPathModal] = useState(false);
    const [editingPath, setEditingPath] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

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
        filteredPaths.forEach(path => {
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
        return sortedKeys.map(key => ({ category: key, paths: groups[key] }));
    }, [filteredPaths]);

    // In-progress topics
    const inProgressTopics = useMemo(() => getInProgressTopicsWithPaths(), [getInProgressTopicsWithPaths]);

    // Existing categories for autocomplete
    const existingCategories = useMemo(() => getCategories(), [getCategories]);

    // Overall stats
    const stats = useMemo(() => {
        const activePaths = learningPaths.filter(p => !p.archived);
        const allTopics = topics;
        const completed = allTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;
        const inProgress = allTopics.filter(t => t.status === 'in_progress').length;
        const activePathIds = activePaths.map(p => p.id);
        const totalTime = allTopics
            .filter(t => activePathIds.includes(t.learning_path_id))
            .reduce((sum, t) => sum + (t.estimated_time || 0), 0);
        const learnedTime = allTopics
            .filter(t => activePathIds.includes(t.learning_path_id) && (t.status === 'completed' || t.status === 'mastered'))
            .reduce((sum, t) => sum + (t.estimated_time || 0), 0);

        return {
            totalPaths: activePaths.length,
            totalTopics: allTopics.length,
            completed,
            inProgress,
            totalTime,
            learnedTime,
        };
    }, [learningPaths, topics]);

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="bg-purple-100 p-2 rounded-xl">
                            <GraduationCap className="text-purple-600" size={24} />
                        </div>
                        Learning Tracker
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 ml-14">
                        Track your learning journey across different subjects
                    </p>
                </div>

                <button
                    onClick={() => { setEditingPath(null); setShowPathModal(true); }}
                    className="px-5 py-2.5 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Plus size={18} />
                    New Learning Path
                </button>
            </div>

            {/* Stats Overview - Vibrant Gradient Cards like Habit Tracker */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 }}
                    className="bg-gradient-to-r from-purple-500 via-purple-400 to-indigo-400 rounded-2xl p-4 shadow-lg shadow-purple-500/20"
                >
                    <div className="flex items-center gap-2 text-white/80 mb-1">
                        <BookOpen size={14} />
                        <span className="text-xs font-bold uppercase tracking-wide">Paths</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.totalPaths}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="bg-gradient-to-r from-yellow-400 via-orange-400 to-orange-500 rounded-2xl p-4 shadow-lg shadow-orange-500/20"
                >
                    <div className="flex items-center gap-2 text-white/80 mb-1">
                        <Flame size={14} />
                        <span className="text-xs font-bold uppercase tracking-wide">In Progress</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.inProgress}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-r from-teal-400 via-emerald-400 to-green-400 rounded-2xl p-4 shadow-lg shadow-teal-500/20"
                >
                    <div className="flex items-center gap-2 text-white/80 mb-1">
                        <TrendingUp size={14} />
                        <span className="text-xs font-bold uppercase tracking-wide">Completed</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{stats.completed}</div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="bg-gradient-to-r from-blue-400 via-blue-500 to-cyan-400 rounded-2xl p-4 shadow-lg shadow-blue-500/20"
                >
                    <div className="flex items-center gap-2 text-white/80 mb-1">
                        <Clock size={14} />
                        <span className="text-xs font-bold uppercase tracking-wide">Learned</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{formatTime(stats.learnedTime)}</div>
                    {stats.totalTime > 0 && (
                        <div className="text-xs text-white/60 font-medium mt-0.5">of {formatTime(stats.totalTime)} total</div>
                    )}
                </motion.div>
            </div>

            {/* ── Continue Learning Block ─────────────────────── */}
            {inProgressTopics.length > 0 && (
                <motion.div
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
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-200">
                        {inProgressTopics.map((topic, idx) => {
                            const pathColor = COLOR_OPTIONS.find(c => c.name === topic.path?.color) || COLOR_OPTIONS[0];
                            return (
                                <motion.button
                                    key={topic.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.2 + idx * 0.05 }}
                                    onClick={() => setCurrentPathId(topic.learning_path_id)}
                                    className="flex-shrink-0 min-w-[240px] max-w-[300px] bg-white border border-amber-200/80 rounded-2xl p-4 text-left hover:shadow-md hover:border-amber-300 hover:scale-[1.02] transition-all group"
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
                                </motion.button>
                            );
                        })}
                    </div>
                </motion.div>
            )}

            {/* Search & Filter Bar */}
            <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search learning paths..."
                        className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-300 shadow-sm transition-all"
                    />
                </div>
                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`p-2.5 rounded-xl border transition-all flex items-center gap-2 text-sm shadow-sm
                        ${showArchived
                            ? 'bg-purple-50 border-purple-200 text-purple-600'
                            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600'
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
                <motion.div
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
                            onClick={() => { setEditingPath(null); setShowPathModal(true); }}
                            className="px-6 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/20 hover:scale-105 transition-all inline-flex items-center gap-2"
                        >
                            <Plus size={18} />
                            Create Learning Path
                        </button>
                    )}
                </motion.div>
            ) : (
                <div className="space-y-8">
                    {groupedPaths.map(({ category, paths: catPaths }) => (
                        <div key={category}>
                            {/* Category Header */}
                            {groupedPaths.length > 1 || category !== 'Uncategorized' ? (
                                <div className="flex items-center gap-2.5 mb-4">
                                    <div className="w-1 h-6 bg-gradient-to-b from-purple-400 to-indigo-500 rounded-full" />
                                    <FolderOpen size={16} className="text-gray-400" />
                                    <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider">{category}</h3>
                                    <span className="text-xs text-gray-400 font-medium">{catPaths.length}</span>
                                </div>
                            ) : null}

                            {/* Path Cards Grid */}
                            <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <AnimatePresence>
                                    {catPaths.map((path, index) => {
                                        const pathTopics = topics.filter(t => t.learning_path_id === path.id);
                                        const completedCount = pathTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;
                                        const pathTotalTime = pathTopics.reduce((sum, t) => sum + (t.estimated_time || 0), 0);

                                        return (
                                            <motion.div
                                                key={path.id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ delay: index * 0.05 }}
                                            >
                                                <LearningPathCard
                                                    path={path}
                                                    progress={getPathProgress(path.id)}
                                                    topicCount={pathTopics.length}
                                                    completedCount={completedCount}
                                                    totalTime={pathTotalTime}
                                                    onClick={() => setCurrentPathId(path.id)}
                                                    onEdit={(p) => { setEditingPath(p); setShowPathModal(true); }}
                                                    onDelete={deleteLearningPath}
                                                    onArchive={archiveLearningPath}
                                                />
                                            </motion.div>
                                        );
                                    })}
                                </AnimatePresence>
                            </motion.div>
                        </div>
                    ))}
                </div>
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
