import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, BookOpen, Clock, Flame, TrendingUp, GraduationCap, Search, Archive } from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import LearningPathCard from './LearningPathCard';
import LearningPathModal from './LearningPathModal';
import LearningPathDetailView from './LearningPathDetailView';

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
        getPathTotalTime,
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
                p.description?.toLowerCase().includes(q)
            );
        }
        return paths;
    }, [learningPaths, showArchived, searchQuery]);

    // Overall stats
    const stats = useMemo(() => {
        const activePaths = learningPaths.filter(p => !p.archived);
        const allTopics = topics;
        const completed = allTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;
        const inProgress = allTopics.filter(t => t.status === 'in_progress').length;
        const totalTime = activePaths.reduce((sum, p) => sum + getPathTotalTime(p.id), 0);

        return {
            totalPaths: activePaths.length,
            totalTopics: allTopics.length,
            completed,
            inProgress,
            totalTime,
        };
    }, [learningPaths, topics, getPathTotalTime]);

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
                        <span className="text-xs font-bold uppercase tracking-wide">Total Time</span>
                    </div>
                    <div className="text-3xl font-bold text-white">{formatTime(stats.totalTime)}</div>
                </motion.div>
            </div>

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

            {/* Learning Paths Grid */}
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
                <motion.div
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    <AnimatePresence>
                        {filteredPaths.map((path, index) => {
                            const pathTopics = topics.filter(t => t.learning_path_id === path.id);
                            const completedCount = pathTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;

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
                                        totalTime={getPathTotalTime(path.id)}
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
            )}

            {/* Path Modal */}
            <LearningPathModal
                isOpen={showPathModal}
                onClose={() => { setShowPathModal(false); setEditingPath(null); }}
                onSave={handleSavePath}
                path={editingPath}
            />
        </div>
    );
};

export default LearningTracker;
