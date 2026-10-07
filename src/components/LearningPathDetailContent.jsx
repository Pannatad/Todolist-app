import { useState } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import {
    ArrowUpDown,
    Calendar,
    ChevronRight,
    GripVertical,
    Lock,
    Plus,
    Search,
    Sparkles,
    Unlock,
} from 'lucide-react';
import { PageHeader, RowMenu, SegmentedControl } from '../ui';
import AITopicGenerator from './AITopicGenerator';
import { DAYS_SHORT, TOPIC_FILTERS } from './learningPathDetailUtils';
import TimetableEditor from './TimetableEditor';
import TopicModal from './TopicModal';

const TopicReorderItem = ({ topic, renderTopicRow }) => {
    const dragControls = useDragControls();
    return (
        <Reorder.Item as="div" value={topic} dragListener={false} dragControls={dragControls} className="learning-topic-item">
            {renderTopicRow(topic, (event) => dragControls.start(event))}
        </Reorder.Item>
    );
};

const LearningPathDetailContent = ({ view }) => {
    const {
        addResource,
        addTopicsBatch,
        canReorderTopics,
        completedCount,
        deleteResource,
        deleteTimeLog,
        deleteTopic,
        editingTopic,
        feedbackMessage,
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
        setShowAIGenerator,
        setShowTimetableEditor,
        setShowTopicModal,
        setTopicFilter,
        setTopicQuery,
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
    const [isReordering, setIsReordering] = useState(false);
    const reordering = isReordering && canReorderTopics && pathTopics.length > 1;

    return (
        <div className="learning-detail-content push-enter">
            <PageHeader
                title={path.name}
                subtitle={path.description || undefined}
                onBack={onBack}
                backLabel="Learning"
                showAccount={false}
                actions={(
                    <RowMenu
                        variant="bar"
                        icon={Plus}
                        label="Add topic"
                        items={[
                            { label: 'New Topic', icon: Plus, onSelect: handleAddTopic },
                            { label: 'Generate with the Agent', icon: Sparkles, onSelect: () => setShowAIGenerator(true) },
                        ]}
                    />
                )}
            />

            <dl className="learning-summary__stats learning-stats">
                <div><dt>Progress</dt><dd>{progress}%</dd></div>
                <div><dt>Topics</dt><dd>{completedCount}/{pathTopics.length}</dd></div>
                <div><dt>Planned</dt><dd>{formatTime(plannedTime)}</dd></div>
                <div><dt>Studied</dt><dd>{formatTime(totalTime)}</dd></div>
            </dl>

            {(timetable.length > 0 || focusTopics.length > 0) && (
                <div className="ui-group learning-detail__summary">
                    {timetable.length > 0 && (
                        <button type="button" className="ui-list-row" onClick={() => setShowTimetableEditor(true)}>
                            <span className="ui-list-row__copy">
                                <span className="ui-list-row__title">Timetable</span>
                                <span className="ui-list-row__subtitle">{timetable.map((slot) => `${DAYS_SHORT[slot.day]} ${slot.start}–${slot.end}`).join(' · ')}</span>
                            </span>
                            <ChevronRight size={18} className="shell-chevron" aria-hidden="true" />
                        </button>
                    )}
                    {focusTopics.map((topic) => (
                        <button key={topic.id} type="button" className="ui-list-row" onClick={() => handleEditTopic(topic)}>
                            <span className="ui-list-row__copy">
                                <span className="ui-list-row__subtitle">Focus</span>
                                <span className="ui-list-row__title">{topic.title}</span>
                            </span>
                            <ChevronRight size={18} className="shell-chevron" aria-hidden="true" />
                        </button>
                    ))}
                </div>
            )}

            <div className="ui-section-title learning-detail__topics-title">
                <h2>Topics</h2>
                <span>{pathTopics.length || ''}</span>
                {reordering ? (
                    <button type="button" className="ui-text-button" onClick={() => setIsReordering(false)}>Done</button>
                ) : (
                <RowMenu
                    label="Topic options"
                    items={[
                        { label: isSequentialLocked ? 'Unlock Order' : 'Lock Order', icon: isSequentialLocked ? Unlock : Lock, onSelect: handleToggleSequentialLock },
                        { label: timetable.length > 0 ? 'Edit Timetable' : 'Set Timetable', icon: Calendar, onSelect: () => setShowTimetableEditor(true) },
                        ...(pathTopics.length > 1 ? [
                            { label: 'Reorder', icon: GripVertical, onSelect: () => { setTopicFilter('all'); setTopicQuery(''); setIsReordering(true); } },
                            { label: 'Reverse Order', icon: ArrowUpDown, onSelect: () => reorderTopics(path.id, [...pathTopics].reverse().map((topic) => topic.id)) },
                        ] : []),
                    ]}
                />
                )}
            </div>

            {feedbackMessage && <p className="form-note is-error learning-detail__feedback">{feedbackMessage}</p>}

            {pathTopics.length > 0 && !reordering && (
                <>
                    <SegmentedControl
                        items={TOPIC_FILTERS.map((filter) => ({ id: filter.id, label: filter.label }))}
                        value={topicFilter}
                        onChange={setTopicFilter}
                        ariaLabel="Topic filter"
                        className="learning-detail__filters"
                    />
                    <div className="learning-search learning-detail__search">
                        <div>
                            <Search size={16} className="learning-search__icon" aria-hidden="true" />
                            <input
                                type="search"
                                value={topicQuery}
                                onChange={(e) => setTopicQuery(e.target.value)}
                                placeholder="Search"
                                aria-label="Search topics"
                                className="learning-input w-full outline-none"
                            />
                        </div>
                    </div>
                </>
            )}

            <div className="ui-group learning-topics">
                {pathTopics.length === 0 ? (
                    <div className="learning-detail__empty">
                        <h3>No topics yet</h3>
                        <button type="button" onClick={handleAddTopic} className="ui-button ui-button--accent">New Topic</button>
                    </div>
                ) : visibleTopics.length === 0 ? (
                    <p className="learning-detail__empty-text">No topics match.</p>
                ) : reordering ? (
                    <Reorder.Group as="div" axis="y" values={visibleTopics} onReorder={handleReorder}>
                        {visibleTopics.map((topic) => (
                            <TopicReorderItem key={topic.id} topic={topic} renderTopicRow={renderTopicRow} />
                        ))}
                    </Reorder.Group>
                ) : (
                    visibleTopics.map((topic) => renderTopicRow(topic))
                )}

                {pathTopics.length > 0 && !reordering && (
                    <button type="button" onClick={handleAddTopic} className="project-worktree__add learning-detail__add">
                        <span aria-hidden="true"><Plus size={14} strokeWidth={2.8} /></span>
                        New Topic
                    </button>
                )}
            </div>

            {topicLibraryEntries.length > 0 && (
                <>
                    <div className="ui-section-title">
                        <h2>Notes &amp; Materials</h2>
                        <span>{topicLibraryEntries.length}</span>
                    </div>
                    <div className="ui-group">
                        {topicLibraryEntries.map((entry) => (
                            <button
                                key={entry.id}
                                type="button"
                                className="ui-list-row"
                                onClick={() => {
                                    const selectedTopic = pathTopics.find((topic) => topic.id === entry.id);
                                    if (selectedTopic) handleEditTopic(selectedTopic);
                                }}
                            >
                                <span className="ui-list-row__copy">
                                    <span className="ui-list-row__title">{entry.title}</span>
                                    <span className="ui-list-row__subtitle">
                                        {[
                                            entry.primaryVideoUrl ? 'Video' : null,
                                            entry.resources.length ? `${entry.resources.length} resource${entry.resources.length !== 1 ? 's' : ''}` : null,
                                            entry.totalLoggedTime > 0 ? `${formatTime(entry.totalLoggedTime)} studied` : null,
                                            entry.notes || null,
                                        ].filter(Boolean).join(' · ')}
                                    </span>
                                </span>
                                <ChevronRight size={18} className="shell-chevron" aria-hidden="true" />
                            </button>
                        ))}
                    </div>
                </>
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
                onAddTopics={addTopicsBatch}
            />

            {/* Timetable Editor Modal */}
            <TimetableEditor
                isOpen={showTimetableEditor}
                onClose={() => setShowTimetableEditor(false)}
                timetable={timetable}
                onSave={handleSaveTimetable}
            />
        </div>
    );
};

export default LearningPathDetailContent;
