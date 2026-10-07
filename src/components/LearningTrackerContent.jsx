import { AnimatePresence, motion as Motion } from 'framer-motion';
import {
    Archive,
    ChevronRight,
    FolderOpen,
    Minus,
    Plus,
    Search,
    Settings,
    Target,
} from 'lucide-react';
import { BarButton, PageHeader, SegmentedControl } from '../ui';
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
        <div className="learning-screen">
            <PageHeader
                title="Learning"
                actions={(
                    <>
                        <BarButton
                            icon={Settings}
                            label="Learning settings"
                            aria-expanded={showSettings}
                            onClick={() => setShowSettings(!showSettings)}
                        />
                        <BarButton
                            icon={Plus}
                            tone="primary"
                            label="New path"
                            disabled={!canStart}
                            onClick={() => {
                                if (canStart) {
                                    setEditingPath(null);
                                    setShowPathModal(true);
                                }
                            }}
                        />
                    </>
                )}
            />

            <SegmentedControl
                className="learning-view-switch"
                items={[
                    { id: 'paths', label: 'Paths' },
                    { id: 'dashboard', label: 'Progress' },
                ]}
                value={learningView}
                onChange={setLearningView}
                ariaLabel="Learning view"
            />

            <dl className="learning-summary__stats learning-stats">
                <div><dt>Paths</dt><dd>{stats.totalPaths}</dd></div>
                <div><dt>Active</dt><dd>{stats.inProgress}</dd></div>
                <div><dt>Done</dt><dd>{stats.completed}</dd></div>
                <div><dt>Studied</dt><dd>{formatTime(stats.studiedTime)}</dd></div>
            </dl>

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
                            <h3 className="app-section-title text-sm">Paths at once</h3>
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
                    <p className="text-sm font-semibold">Focus limit reached · {activeCount} of {maxConcurrentPaths} in progress</p>
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
                    <h3 className="ui-section-title learning-continue-title">Continue</h3>
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
                                    <span className="learning-continue-card__path">{topic.path?.name}</span>
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
                    <Search size={16} className="learning-search__icon" aria-hidden="true" />
                    <input
                        type="search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search"
                        aria-label="Search learning paths"
                        className="learning-input w-full outline-none"
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
                        <h3 className="app-section-title">
                            {searchQuery ? 'No results' : showArchived ? 'No archived paths' : 'No learning paths yet'}
                        </h3>
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
                                New Path
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
