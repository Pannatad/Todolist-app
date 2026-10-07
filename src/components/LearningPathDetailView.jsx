import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    BookCheck,
    Check,
    Dumbbell,
    Edit3,
    GripVertical,
    Lock,
    Play,
    Star,
    Target,
    Trash2,
} from 'lucide-react';
import { RowMenu } from '../ui';
import { useLearning } from '../context/LearningContext';
import LearningPathDetailContent from './LearningPathDetailContent';
import { findVideoUrlInText, STATUS_CONFIG } from './learningPathDetailUtils';
import { confirmAction } from '../utils/confirm';

const LearningPathDetailView = ({ path, onBack }) => {
    const {
        getPathProgress,
        getPathEstimatedTime,
        getPathTotalTime,
        getTopicTotalTime,
        getResourcesByTopic,
        getTopicTimeLogs,
        addTopic,
        addTopicsBatch,
        updateTopic,
        deleteTopic,
        cycleTopicStatus,
        addResource,
        deleteResource,
        reorderTopics,
        updateLearningPath,
        toggleTopicFocus,
        toggleExerciseCompleted,
        toggleRevisionCompleted,
        topics,
        logTime,
        deleteTimeLog,
        getPrimaryVideoResource,
        syncPrimaryVideoResource,
    } = useLearning();

    const [showTopicModal, setShowTopicModal] = useState(false);
    const [editingTopic, setEditingTopic] = useState(null);
    const [showAIGenerator, setShowAIGenerator] = useState(false);
    const [showTimetableEditor, setShowTimetableEditor] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [topicFilter, setTopicFilter] = useState('all');
    const [topicQuery, setTopicQuery] = useState('');
    useEffect(() => {
        if (!feedbackMessage) return undefined;

        const timeoutId = window.setTimeout(() => {
            setFeedbackMessage('');
        }, 3200);

        return () => window.clearTimeout(timeoutId);
    }, [feedbackMessage]);

    // Computed values
    const progress = getPathProgress(path.id);
    const totalTime = getPathTotalTime(path.id);
    const plannedTime = getPathEstimatedTime(path.id);
    const pathTopics = useMemo(() =>
        topics
            .filter(t => t.learning_path_id === path.id)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
        [topics, path.id]
    );
    const completedCount = pathTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;
    const focusTopics = pathTopics.filter((topic) => topic.section === 'current_focus');

    const formatTime = (minutes) => {
        if (!minutes) return '0h';
        if (minutes < 60) return `${minutes}m`;
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return m > 0 ? `${h}h ${m}m` : `${h}h`;
    };

    const getTopicVideoUrl = useCallback((topic) => {
        if (!topic?.id) return '';

        const primaryVideoUrl = getPrimaryVideoResource(topic.id)?.url?.trim();
        if (primaryVideoUrl) return primaryVideoUrl;

        const resourceVideoUrl = getResourcesByTopic(topic.id).find((resource) =>
            resource.resource_type === 'video' &&
            typeof resource.url === 'string' &&
            resource.url.trim()
        )?.url?.trim();
        if (resourceVideoUrl) return resourceVideoUrl;

        const legacyVideoUrl = topic.primary_video_url || topic.primaryVideoUrl || topic.video_url || topic.videoUrl;
        if (typeof legacyVideoUrl === 'string' && legacyVideoUrl.trim()) return legacyVideoUrl.trim();

        return findVideoUrlInText(topic.description) || findVideoUrlInText(topic.notes);
    }, [getPrimaryVideoResource, getResourcesByTopic]);

    const handleAddTopic = () => {
        setEditingTopic(null);
        setShowTopicModal(true);
    };

    const handleEditTopic = (topic) => {
        setEditingTopic(topic);
        setShowTopicModal(true);
    };

    const handleSaveTopic = async (topicData) => {
        if (topicData.id) {
            const savedTopic = await updateTopic(topicData.id, topicData);
            await syncPrimaryVideoResource(savedTopic.id, topicData.primary_video_url);
        } else {
            await addTopic(topicData);
        }
    };

    const handleReorder = (reorderedTopics) => {
        reorderTopics(path.id, reorderedTopics.map(t => t.id));
    };

    const handleSaveTimetable = async (timetableData) => {
        await updateLearningPath(path.id, { timetable: timetableData });
    };

    const topicResources = editingTopic ? getResourcesByTopic(editingTopic.id) : [];
    const topicTimeLogs = editingTopic ? getTopicTimeLogs(editingTopic.id) : [];
    const timetable = path.timetable || [];
    const isSequentialLocked = !!path.sequential_lock;

    const handleToggleSequentialLock = async () => {
        await updateLearningPath(path.id, { sequential_lock: !isSequentialLocked });
    };

    const getBlockingTopics = (topic, index) => {
        if (topic.status === 'completed' || topic.status === 'mastered' || topic.status === 'in_progress') {
            return [];
        }

        const prerequisiteIds = topic.prerequisite_topic_ids || [];
        if (prerequisiteIds.length > 0) {
            return pathTopics.filter((candidate) =>
                prerequisiteIds.includes(candidate.id) &&
                candidate.status !== 'completed' &&
                candidate.status !== 'mastered'
            );
        }

        if (!isSequentialLocked || index === 0) return [];

        const previousTopic = pathTopics[index - 1];
        if (!previousTopic) return [];

        return previousTopic.status === 'completed' || previousTopic.status === 'mastered'
            ? []
            : [previousTopic];
    };

    const topicLibraryEntries = useMemo(() => {
        return pathTopics
            .map((topic) => {
                const topicResources = getResourcesByTopic(topic.id);
                const primaryVideoUrl = getTopicVideoUrl(topic);
                const totalLoggedTime = getTopicTotalTime(topic.id);

                return {
                    id: topic.id,
                    title: topic.title,
                    notes: topic.notes?.trim() || '',
                    resources: topicResources,
                    primaryVideoUrl,
                    totalLoggedTime,
                };
            })
            .filter((entry) =>
                entry.notes ||
                entry.resources.length > 0 ||
                entry.primaryVideoUrl ||
                entry.totalLoggedTime > 0
            );
    }, [pathTopics, getResourcesByTopic, getTopicTotalTime, getTopicVideoUrl]);

    const visibleTopics = useMemo(() => {
        const normalizedQuery = topicQuery.trim().toLowerCase();

        return pathTopics.filter((topic) => {
            if (topicFilter === 'focus' && topic.section !== 'current_focus') return false;
            if (topicFilter === 'active' && topic.status !== 'in_progress') return false;
            if (topicFilter === 'done' && topic.status !== 'completed' && topic.status !== 'mastered') return false;

            if (!normalizedQuery) return true;

            return (
                topic.title.toLowerCase().includes(normalizedQuery) ||
                topic.description?.toLowerCase().includes(normalizedQuery) ||
                topic.notes?.toLowerCase().includes(normalizedQuery)
            );
        });
    }, [pathTopics, topicFilter, topicQuery]);

    const canReorderTopics = topicFilter === 'all' && topicQuery.trim() === '';

    const handleStatusCycle = async (topicId) => {
        const result = await cycleTopicStatus(topicId);
        if (!result?.ok && result?.reason) {
            setFeedbackMessage(result.reason);
        }
    };

    const handleDeleteTopic = async (topic) => {
        const confirmed = confirmAction(`Delete "${topic.title}" and its resources/logs?`);
        if (!confirmed) return;

        await deleteTopic(topic.id);
    };

    const renderTopicRow = (topic, onGripPointerDown = null) => {
        const status = STATUS_CONFIG[topic.status] || STATUS_CONFIG.not_started;
        const resourceCount = getResourcesByTopic(topic.id).length;
        const primaryVideoUrl = getTopicVideoUrl(topic);
        const isCompleted = topic.status === 'completed';
        const actualIndex = pathTopics.findIndex((item) => item.id === topic.id);
        const blockingTopics = getBlockingTopics(topic, actualIndex);
        const isLocked = blockingTopics.length > 0;
        const isFocused = topic.section === 'current_focus';
        const meta = [
            isLocked ? `After ${blockingTopics[0].title}` : null,
            !isLocked && topic.status !== 'not_started' && !isCompleted ? status.label : null,
            isFocused ? 'Focus' : null,
            topic.estimated_time > 0 ? formatTime(topic.estimated_time) : null,
            resourceCount > 0 ? `${resourceCount} resource${resourceCount !== 1 ? 's' : ''}` : null,
            isCompleted && !topic.exercise_completed ? 'Needs exercise' : null,
            isCompleted && !topic.revision_completed ? 'Needs revision' : null,
        ].filter(Boolean).join(' · ');

        return (
            <article key={topic.id} className={`learning-topic${isLocked ? ' is-locked' : ''}`} data-status={topic.status}>
                {isLocked ? (
                    <span className="task-check learning-topic__check" aria-label={`Locked until ${blockingTopics.map((item) => item.title).join(', ')} is done`}>
                        <span><Lock size={11} strokeWidth={2.6} /></span>
                    </span>
                ) : (
                    <button
                        type="button"
                        className="task-check learning-topic__check"
                        aria-label={`${status.label}. Change status of ${topic.title}`}
                        onClick={() => handleStatusCycle(topic.id)}
                    >
                        <span>
                            {isCompleted && <Check size={12} strokeWidth={3.2} />}
                            {topic.status === 'mastered' && <Star size={11} strokeWidth={2.6} fill="currentColor" />}
                        </span>
                    </button>
                )}
                <button type="button" className="learning-topic__body" onClick={() => handleEditTopic(topic)}>
                    <span className="learning-topic__title">{topic.title}</span>
                    {meta && <span className="learning-topic__meta">{meta}</span>}
                </button>
                {onGripPointerDown ? (
                    <button
                        type="button"
                        className="learning-topic__grip"
                        onPointerDown={onGripPointerDown}
                        aria-label={`Reorder ${topic.title}`}
                    >
                        <GripVertical size={18} aria-hidden="true" />
                    </button>
                ) : (
                    <RowMenu
                        label={`Actions for ${topic.title}`}
                        items={[
                            { label: isFocused ? 'Remove from Focus' : 'Focus', icon: Target, onSelect: () => toggleTopicFocus(topic.id) },
                            ...(isCompleted ? [
                                { label: topic.exercise_completed ? 'Exercise Not Done' : 'Exercise Done', icon: Dumbbell, onSelect: () => toggleExerciseCompleted(topic.id) },
                                { label: topic.revision_completed ? 'Revision Not Done' : 'Revision Done', icon: BookCheck, onSelect: () => toggleRevisionCompleted(topic.id) },
                            ] : []),
                            ...(primaryVideoUrl ? [{ label: 'Open Video', icon: Play, onSelect: () => window.open(primaryVideoUrl, '_blank', 'noopener,noreferrer') }] : []),
                            { label: 'Edit', icon: Edit3, onSelect: () => handleEditTopic(topic) },
                            { label: 'Delete', icon: Trash2, destructive: true, onSelect: () => handleDeleteTopic(topic) },
                        ]}
                    />
                )}
            </article>
        );
    };

    return (
        <div className="learning-detail">
            <LearningPathDetailContent
                view={{
                addResource, addTopicsBatch, canReorderTopics, completedCount,
                deleteResource, deleteTimeLog, deleteTopic, editingTopic, feedbackMessage,
                focusTopics, formatTime, getTopicVideoUrl, handleAddTopic, handleEditTopic, handleReorder,
                handleSaveTimetable, handleSaveTopic, handleToggleSequentialLock, isSequentialLocked, onBack,
                logTime, path, pathTopics, plannedTime, progress, renderTopicRow, reorderTopics, setEditingTopic,
                setShowAIGenerator, setShowTimetableEditor, setShowTopicModal, setTopicFilter,
                setTopicQuery, showAIGenerator, showTimetableEditor, showTopicModal, timetable,
                topicFilter, topicLibraryEntries, topicQuery, topicResources, topicTimeLogs, totalTime, visibleTopics,
                }}
            />
        </div>
    );
};

export default LearningPathDetailView;
