import { AnimatePresence, motion as Motion, Reorder } from 'framer-motion';
import {
    ArrowLeft,
    ArrowUpDown,
    BookOpen,
    Calendar,
    ChevronRight,
    Clock,
    Flame,
    Lock,
    Plus,
    Search,
    Sparkles,
    Target,
    TrendingUp,
    Unlock,
} from 'lucide-react';
import AITopicGenerator from './AITopicGenerator';
import { DAYS_SHORT, TOPIC_FILTERS } from './learningPathDetailUtils';
import TimetableEditor from './TimetableEditor';
import TopicModal from './TopicModal';

const LearningPathDetailContent = ({ view }) => {
    const {
        addMenuRef,
        addResource,
        addTopicsBatch,
        canReorderTopics,
        colorConfig,
        completedCount,
        deleteResource,
        deleteTimeLog,
        deleteTopic,
        editingTopic,
        feedbackMessage,
        filterCounts,
        focusTopics,
        formatTime,
        getTopicVideoUrl,
        handleAddTopic,
        handleEditTopic,
        handleReorder,
        handleSaveTimetable,
        handleSaveTopic,
        handleToggleSequentialLock,
        isSequentialLocked,
        logTime,
        onBack,
        path,
        pathTopics,
        plannedTime,
        progress,
        renderTopicRow,
        reorderTopics,
        setEditingTopic,
        setShowAddMenu,
        setShowAIGenerator,
        setShowTimetableEditor,
        setShowTopicModal,
        setTopicFilter,
        setTopicQuery,
        showAddMenu,
        showAIGenerator,
        showTimetableEditor,
        showTopicModal,
        timetable,
        topicFilter,
        topicLibraryEntries,
        topicQuery,
        topicResources,
        topicTimeLogs,
        totalTime,
        visibleTopics,
    } = view;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="rounded-3xl overflow-hidden shadow-lg border border-gray-100">
                <div className={`bg-gradient-to-r ${colorConfig.gradient} p-6 sm:p-8 relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl -ml-8 -mb-8" />

                    <div className="relative z-10">
                        {/* Back Button & Title */}
                        <div className="flex items-center gap-3 mb-6">
                            <button
                                onClick={onBack}
                                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
                            >
                                <ArrowLeft size={20} />
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{path.icon}</span>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-white truncate">{path.name}</h2>
                                </div>
                                {path.description && (
                                    <p className="text-white/60 text-sm mt-1 line-clamp-2">{path.description}</p>
                                )}
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                                <TrendingUp size={20} className="text-white/60 mx-auto mb-1" />
                                <p className="text-2xl font-bold text-white">{progress}%</p>
                                <p className="text-xs text-white/50">Progress</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                                <BookOpen size={20} className="text-white/60 mx-auto mb-1" />
                                <p className="text-2xl font-bold text-white">{completedCount}<span className="text-lg text-white/50">/{pathTopics.length}</span></p>
                                <p className="text-xs text-white/50">Topics</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                                <Clock size={20} className="text-white/60 mx-auto mb-1" />
                                <p className="text-2xl font-bold text-white">{formatTime(plannedTime)}</p>
                                <p className="text-xs text-white/50">Planned</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                                <Flame size={20} className="text-white/60 mx-auto mb-1" />
                                <p className="text-2xl font-bold text-white">{formatTime(totalTime)}</p>
                                <p className="text-xs text-white/50">Studied</p>
                            </div>
                        </div>

                        {/* Full Progress Bar */}
                        <div className="mt-4">
                            <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden">
                                <Motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progress}%` }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                    className="h-full bg-white/80 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                                />
                            </div>
                        </div>

                        {/* Timetable Preview */}
                        {timetable.length > 0 && (
                            <div className="mt-4 flex items-center gap-2 flex-wrap">
                                <Calendar size={14} className="text-white/50" />
                                {timetable.map((slot, idx) => (
                                    <span key={idx} className="text-xs bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full text-white/70 font-medium">
                                        {DAYS_SHORT[slot.day]} {slot.start}-{slot.end}
                                    </span>
                                ))}
                            </div>
                        )}

                        {focusTopics.length > 0 && (
                            <div className="mt-4 flex items-center gap-2 flex-wrap">
                                <Target size={14} className="text-white/60" />
                                {focusTopics.map((topic) => (
                                    <button
                                        key={topic.id}
                                        onClick={() => handleEditTopic(topic)}
                                        className="text-xs bg-white/15 backdrop-blur-sm px-2.5 py-1 rounded-full text-white/80 font-medium hover:bg-white/20 transition-colors"
                                    >
                                        {topic.title}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Topics Checklist */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* List Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <BookOpen size={16} className="text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700">Topics</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">
                            {completedCount}/{pathTopics.length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* Sequential Lock Toggle */}
                        <button
                            onClick={handleToggleSequentialLock}
                            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1
                                ${isSequentialLocked
                                    ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                } active:scale-95`}
                            title={isSequentialLocked ? 'Sequential mode ON — click to unlock all' : 'Lock topics sequentially'}
                        >
                            {isSequentialLocked ? <Lock size={12} /> : <Unlock size={12} />}
                            {isSequentialLocked ? 'Sequential' : 'Lock Order'}
                        </button>
                        {/* Timetable Button */}
                        <button
                            onClick={() => setShowTimetableEditor(true)}
                            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1
                                ${timetable.length > 0
                                    ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                } active:scale-95`}
                            title="Set study timetable"
                        >
                            <Calendar size={12} /> {timetable.length > 0 ? `${timetable.length} slots` : 'Timetable'}
                        </button>
                        {pathTopics.length > 1 && (
                            <button
                                onClick={() => reorderTopics(path.id, [...pathTopics].reverse().map(t => t.id))}
                                className="text-xs px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1
                                    bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 active:scale-95"
                                title="Reverse topic order"
                            >
                                <ArrowUpDown size={12} /> Reverse
                            </button>
                        )}
                        <div className="relative" ref={addMenuRef}>
                            <button
                                onClick={() => setShowAddMenu(!showAddMenu)}
                                className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1
                                    bg-gradient-to-r ${colorConfig.gradient} text-white hover:shadow-md hover:scale-105 active:scale-95`}
                            >
                                <Plus size={12} /> Add Topic
                            </button>

                            <AnimatePresence>
                                {showAddMenu && (
                                    <Motion.div
                                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20"
                                    >
                                        <div className="py-1">
                                            <button
                                                onClick={() => {
                                                    setShowAddMenu(false);
                                                    handleAddTopic();
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                                    <Plus size={16} className="text-gray-500" />
                                                </div>
                                                Add Manually
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setShowAddMenu(false);
                                                    setShowAIGenerator(true);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-amber-50 flex items-center gap-2 transition-colors"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                                                    <Sparkles size={16} className="text-orange-500" />
                                                </div>
                                                AI Generate Topics
                                            </button>
                                        </div>
                                    </Motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {feedbackMessage && (
                    <div className="px-5 pt-4">
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                            {feedbackMessage}
                        </div>
                    </div>
                )}

                <div className="px-5 pt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        {TOPIC_FILTERS.map((filter) => {
                            const isActiveFilter = topicFilter === filter.id;
                            return (
                                <button
                                    key={filter.id}
                                    onClick={() => setTopicFilter(filter.id)}
                                    className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors border ${
                                        isActiveFilter
                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                            : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                                    }`}
                                >
                                    {filter.label} ({filterCounts[filter.id] || 0})
                                </button>
                            );
                        })}
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            value={topicQuery}
                            onChange={(e) => setTopicQuery(e.target.value)}
                            placeholder="Search topics, notes, or descriptions..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-300"
                        />
                    </div>
                    {!canReorderTopics && (
                        <p className="text-xs text-gray-400">
                            Reordering is available when you are viewing the full topic list without a search.
                        </p>
                    )}
                </div>

                {/* Reorderable Topic List */}
                {pathTopics.length === 0 ? (
                    <div className="text-center py-16 px-6">
                        <div className="text-5xl mb-4">📝</div>
                        <h3 className="text-lg font-bold text-gray-700 mb-2">No topics yet</h3>
                        <p className="text-gray-400 text-sm mb-6 max-w-sm mx-auto">
                            Add topics to your learning path and track your progress through them like a course syllabus.
                        </p>
                        <button
                            onClick={handleAddTopic}
                            className={`text-sm px-5 py-2.5 rounded-xl font-bold transition-all inline-flex items-center gap-2
                                bg-gradient-to-r ${colorConfig.gradient} text-white hover:shadow-lg hover:scale-105 active:scale-95`}
                        >
                            <Plus size={16} /> Add your first topic
                        </button>
                    </div>
                ) : visibleTopics.length === 0 ? (
                    <div className="text-center py-14 px-6">
                        <div className="text-4xl mb-3">🔎</div>
                        <h3 className="text-base font-bold text-gray-700 mb-2">No topics match this view</h3>
                        <p className="text-gray-400 text-sm max-w-sm mx-auto">
                            Try another filter or clear the search to see the full learning path again.
                        </p>
                    </div>
                ) : canReorderTopics ? (
                    <Reorder.Group
                        axis="y"
                        values={visibleTopics}
                        onReorder={handleReorder}
                        className="divide-y divide-gray-50"
                    >
                        <AnimatePresence>
                            {visibleTopics.map((topic, index) => (
                                <Reorder.Item
                                    key={topic.id}
                                    value={topic}
                                >
                                    {renderTopicRow(topic, index)}
                                </Reorder.Item>
                            ))}
                        </AnimatePresence>
                    </Reorder.Group>
                ) : (
                    <div className="divide-y divide-gray-50">
                        <AnimatePresence>
                            {visibleTopics.map((topic, index) => renderTopicRow(topic, index))}
                        </AnimatePresence>
                    </div>
                )}

                {/* Add Topic Footer */}
                {pathTopics.length > 0 && (
                    <button
                        onClick={handleAddTopic}
                        className="w-full flex items-center justify-center gap-2 py-3.5 text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-50"
                    >
                        <Plus size={14} />
                        <span>Add Topic</span>
                    </button>
                )}
            </div>

            {topicLibraryEntries.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                        <div>
                            <h3 className="text-sm font-semibold text-gray-800">Notes & Materials</h3>
                            <p className="text-xs text-gray-400 mt-1">
                                Quick access to notes, files, links, and logged study sessions across this path.
                            </p>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500 font-medium">
                            {topicLibraryEntries.length} topic{topicLibraryEntries.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {topicLibraryEntries.map((entry) => (
                            <button
                                key={entry.id}
                                onClick={() => {
                                    const selectedTopic = pathTopics.find((topic) => topic.id === entry.id);
                                    if (selectedTopic) {
                                        handleEditTopic(selectedTopic);
                                    }
                                }}
                                className="w-full px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-sm font-semibold text-gray-800 truncate">{entry.title}</h4>
                                            {entry.primaryVideoUrl && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                                                    Video
                                                </span>
                                            )}
                                            {entry.resources.length > 0 && (
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                                                    {entry.resources.length} resource{entry.resources.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                        </div>
                                        {entry.notes && (
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{entry.notes}</p>
                                        )}
                                    </div>
                                    <div className="text-right flex-shrink-0">
                                        {entry.totalLoggedTime > 0 && (
                                            <p className="text-xs font-medium text-emerald-600">{formatTime(entry.totalLoggedTime)} studied</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">Open topic</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Topic Modal */}
            <TopicModal
                isOpen={showTopicModal}
                onClose={() => { setShowTopicModal(false); setEditingTopic(null); }}
                onSave={handleSaveTopic}
                onDelete={deleteTopic}
                topic={editingTopic}
                pathId={path.id}
                resources={topicResources}
                timeLogs={topicTimeLogs}
                onAddResource={addResource}
                onDeleteResource={deleteResource}
                onLogTime={logTime}
                onDeleteTimeLog={deleteTimeLog}
                availablePrerequisites={pathTopics.filter((topic) => topic.id !== editingTopic?.id)}
                primaryVideoUrl={editingTopic ? getTopicVideoUrl(editingTopic) : ''}
            />

            {/* AI Topic Generator Modal */}
            <AITopicGenerator
                isOpen={showAIGenerator}
                onClose={() => setShowAIGenerator(false)}
                pathId={path.id}
                pathName={path.name}
                pathGradient={colorConfig.gradient}
                onAddTopics={addTopicsBatch}
            />

            {/* Timetable Editor Modal */}
            <TimetableEditor
                isOpen={showTimetableEditor}
                onClose={() => setShowTimetableEditor(false)}
                timetable={timetable}
                onSave={handleSaveTimetable}
                pathGradient={colorConfig.gradient}
            />
        </div>
    );
};

export default LearningPathDetailContent;
