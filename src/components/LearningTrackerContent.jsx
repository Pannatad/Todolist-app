import { AnimatePresence, motion as Motion } from 'framer-motion';
import {
    Archive,
    BarChart3,
    BookOpen,
    CheckCircle2,
    ChevronRight,
    Clock,
    FolderOpen,
    GraduationCap,
    Minus,
    Plus,
    Search,
    Settings,
    Target,
    Zap,
} from 'lucide-react';
import { SegmentedControl } from '../ui';
import LearningPathCard from './LearningPathCard';
import LearningPathModal from './LearningPathModal';
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
        <div className="learning-screen space-y-6">
            {/* Header Section */}
            <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="learning-header border-b border-slate-200 pb-4 dark:border-white/10"
            >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0">
                        <h1 className="app-page-title">Learning</h1>
                        <p className="learning-header__description">
                            Keep your subjects focused and know exactly what to study next.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <SegmentedControl
                        className="learning-view-switch"
                        items={[
                            { id: 'paths', label: 'Paths', icon: BookOpen },
                            { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                        ]}
                        value={learningView}
                        onChange={setLearningView}
                        ariaLabel="Learning view"
                    />
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className={`ui-icon-button learning-settings-trigger${showSettings ? ' is-active' : ''}`}
                        title="Learning Tracker Settings"
                        type="button"
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
                        className="learning-primary-button"
                        type="button"
                    >
                        <Plus size={18} />
                        New path
                    </button>
                </div>
                </div>
            </Motion.div>

            <section className="learning-summary" aria-label="Learning overview">
                <div className="learning-summary__lead">
                    <span className="learning-summary__mark" aria-hidden="true"><GraduationCap size={20} /></span>
                    <span>
                        <strong>{stats.inProgress > 0 ? 'Keep your momentum' : 'Your study workspace'}</strong>
                        <span>
                            {stats.inProgress > 0
                                ? `${stats.inProgress} ${stats.inProgress === 1 ? 'path is' : 'paths are'} ready to continue.`
                                : 'Build one clear path for every subject you want to move forward.'}
                        </span>
                    </span>
                </div>
                <dl className="learning-summary__stats">
                    <div><dt><BookOpen size={14} /> Paths</dt><dd>{stats.totalPaths}</dd></div>
                    <div><dt><Zap size={14} /> In progress</dt><dd>{stats.inProgress}</dd></div>
                    <div><dt><CheckCircle2 size={14} /> Completed</dt><dd>{stats.completed}</dd></div>
                    <div><dt><Clock size={14} /> Studied</dt><dd>{formatTime(stats.studiedTime)}</dd></div>
                </dl>
            </section>

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <Motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="learning-settings-panel ui-card mb-2 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="app-section-title text-sm">Focus limit</h3>
                                <p className="mt-1 max-w-lg text-xs text-gray-500">
                                    Limit the number of paths you actively study at once.
                                </p>
                            </div>
                            <div className="learning-stepper flex items-center gap-3">
                                <button
                                    onClick={() => setMaxConcurrentPaths(Math.max(1, maxConcurrentPaths - 1))}
                                    className="ui-icon-button learning-stepper__button"
                                    disabled={maxConcurrentPaths <= 1}
                                >
                                    <Minus size={16} />
                                </button>
                                <span className="w-8 text-center text-lg font-semibold text-gray-800">
                                    {maxConcurrentPaths}
                                </span>
                                <button
                                    onClick={() => setMaxConcurrentPaths(maxConcurrentPaths + 1)}
                                    className="ui-icon-button learning-stepper__button"
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
                    className="learning-notice learning-notice--warning flex items-center gap-3"
                >
                    <div className="learning-notice__icon"><Target size={18} /></div>
                    <div className="flex-1">
                        <p className="text-sm font-semibold">Focus limit reached</p>
                        <p className="text-xs">
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
                    transition={{ duration: 0.2 }}
                >
                    <div className="learning-section-heading mb-3 flex items-center gap-2">
                        <Zap size={17} />
                        <h3 className="app-section-title">Continue learning</h3>
                        <span className="ui-chip learning-count-chip">
                            {inProgressTopics.length} in progress
                        </span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-sage-200">
                        {inProgressTopics.map((topic) => {
                            return (
                                <Motion.button
                                    key={topic.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ duration: 0.2 }}
                                    whileHover={{ y: -2 }}
                                    onClick={() => setCurrentPathId(topic.learning_path_id)}
                                    data-learning-color={topic.path?.color || 'purple'}
                                    className="learning-continue-card group flex-shrink-0 min-w-[240px] max-w-[300px] p-4 text-left"
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="learning-continue-card__icon flex h-8 w-8 items-center justify-center rounded-lg text-sm">
                                            {topic.path?.icon || '📚'}
                                        </div>
                                        <span className="truncate text-xs font-medium">{topic.path?.name}</span>
                                    </div>
                                    <h4 className="mb-2 truncate text-sm font-semibold">{topic.title}</h4>
                                    <div className="learning-continue-card__action flex items-center gap-1.5 text-xs font-semibold">
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
            <div className="learning-search flex items-center gap-3">
                <div className="flex-1 relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search learning paths..."
                        className="learning-input w-full py-3 pl-9 pr-4 text-sm outline-none"
                    />
                </div>
                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`ui-icon-button learning-archive-button${showArchived ? ' is-active' : ''}`}
                    title={showArchived ? 'Showing archived' : 'Show archived'}
                    type="button"
                >
                    <Archive size={16} />
                </button>
            </div>

            {/* Learning Paths — Grouped by Category */}
            {isLoading ? (
                <div className="learning-empty text-center py-16">
                    <div className="learning-loading-mark mx-auto mb-3" aria-hidden="true" />
                    <p className="text-sm">Loading your learning paths…</p>
                </div>
            ) : filteredPaths.length === 0 ? (
                <Motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="learning-empty py-16"
                >
                    <div className="learning-empty__content">
                        <div className="learning-empty__icon"><BookOpen size={22} /></div>
                        <div>
                            <h3 className="app-section-title">
                                {searchQuery ? 'No paths found' : showArchived ? 'No archived paths' : 'Start with one subject'}
                            </h3>
                            <p>
                                {searchQuery
                                    ? 'Try a different search term.'
                                    : 'Add its topics, choose the next step, and keep your study time in one place.'}
                            </p>
                        </div>
                        {!searchQuery && !showArchived && (
                            <button
                                onClick={() => {
                                    if (canStart) {
                                        setEditingPath(null);
                                        setShowPathModal(true);
                                    }
                                }}
                                disabled={!canStart}
                                className="learning-primary-button"
                                type="button"
                            >
                                <Plus size={18} />
                                Create your first path
                            </button>
                        )}
                    </div>
                </Motion.div>
            ) : (
                <div className="space-y-8">
                    {groupedPaths.map(({ category, paths: catPaths }) => (
                        <div key={category}>
                            {/* Category Header */}
                            {groupedPaths.length > 1 || category !== 'Uncategorized' ? (
                                <div className="learning-category-header mb-4 flex items-center gap-2.5">
                                    {category === 'Pinned' ? (
                                        <Target size={16} className="text-gray-400" />
                                    ) : (
                                        <FolderOpen size={16} className="text-gray-400" />
                                    )}
                                    <h3 className="text-sm font-semibold">{category}</h3>
                                    <span className="text-xs font-medium">{catPaths.length}</span>
                                </div>
                            ) : null}

                            {/* Path Cards Grid */}
                            <Motion.div layout className="learning-path-grid grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                                <AnimatePresence>
                                    {catPaths.map((path) => {
                                        const pathTopics = topics.filter(t => t.learning_path_id === path.id);
                                        const completedCount = pathTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;

                                        return (
                                            <Motion.div
                                                key={path.id}
                                                layout
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.9 }}
                                                transition={{ duration: 0.2 }}
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
