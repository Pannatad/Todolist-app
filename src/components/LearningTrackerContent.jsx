import { AnimatePresence, motion as Motion } from 'framer-motion';
import {
    Archive,
    BarChart3,
    BookOpen,
    ChevronRight,
    FolderOpen,
    GraduationCap,
    Minus,
    Plus,
    Search,
    Settings,
    Target,
    Zap,
} from 'lucide-react';
import LearningPathCard from './LearningPathCard';
import LearningPathModal from './LearningPathModal';
import { COLOR_OPTIONS } from './LearningPathModal';
import SubjectProgressDashboard from './SubjectProgressDashboard';
import TimetableSummary from './TimetableSummary';

const LearningTrackerContent = ({
    activeCount,
    archiveLearningPath,
    canStart,
    dashboardCategories,
    dashboardCategory,
    dashboardShowArchived,
    dashboardSort,
    deleteLearningPath,
    editingPath,
    existingCategories,
    filteredDashboardSubjects,
    filteredPaths,
    formatTime,
    getPathEstimatedTime,
    getPathProgress,
    getPathTotalTime,
    groupedPaths,
    handleSavePath,
    handleTogglePinnedPath,
    inProgressTopics,
    isLoading,
    learningView,
    maxConcurrentPaths,
    pinnedPathIds,
    searchQuery,
    restoreLearningPath,
    setCurrentPathId,
    setDashboardCategory,
    setDashboardShowArchived,
    setDashboardSort,
    setEditingPath,
    setLearningView,
    setMaxConcurrentPaths,
    setSearchQuery,
    setShowArchived,
    setShowPathModal,
    setShowSettings,
    showArchived,
    showPathModal,
    showSettings,
    stats,
    topics,
}) => (
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

export default LearningTrackerContent;
