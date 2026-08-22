import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion as Motion } from 'framer-motion';
import {
    BookCheck,
    BookOpen,
    Check,
    ChevronRight,
    Clock,
    Dumbbell,
    GripVertical,
    Lock,
    Play,
    Star,
    Target,
    Trash2,
    Zap,
} from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import { COLOR_OPTIONS } from './LearningPathModal';
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
    const [showAddMenu, setShowAddMenu] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [topicFilter, setTopicFilter] = useState('all');
    const [topicQuery, setTopicQuery] = useState('');
    const addMenuRef = useRef(null);

    // Close add menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (addMenuRef.current && !addMenuRef.current.contains(event.target)) {
                setShowAddMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
    const filterCounts = useMemo(() => ({
        all: pathTopics.length,
        focus: pathTopics.filter((topic) => topic.section === 'current_focus').length,
        active: pathTopics.filter((topic) => topic.status === 'in_progress').length,
        done: pathTopics.filter((topic) => topic.status === 'completed' || topic.status === 'mastered').length,
    }), [pathTopics]);

    const colorConfig = COLOR_OPTIONS.find(c => c.name === path.color) || COLOR_OPTIONS[0];

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

    const isTopicLocked = (topic, index) => getBlockingTopics(topic, index).length > 0;

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

    const renderTopicRow = (topic, index) => {
        const status = STATUS_CONFIG[topic.status] || STATUS_CONFIG.not_started;
        const topicResourceList = getResourcesByTopic(topic.id);
        const primaryVideoUrl = getTopicVideoUrl(topic);
        const resourceCount = topicResourceList.length;
        const isCompleted = topic.status === 'completed';
        const isMastered = topic.status === 'mastered';
        const actualIndex = pathTopics.findIndex((item) => item.id === topic.id);
        const isLocked = isTopicLocked(topic, actualIndex);
        const blockingTopics = getBlockingTopics(topic, actualIndex);
        const isFocused = topic.section === 'current_focus';

        return (
            <Motion.div
                key={topic.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: index * 0.03 }}
            >
                <div
                    className={`group flex items-center gap-3 px-5 py-3.5 ${
                        canReorderTopics ? 'cursor-grab active:cursor-grabbing' : ''
                    } hover:bg-gray-50/80 transition-colors
                        ${isMastered ? 'opacity-60' : ''}
                        ${isLocked ? 'opacity-50' : ''}
                        ${status.rowHighlight || ''}`}
                >
                    {canReorderTopics ? (
                        <GripVertical
                            size={14}
                            className="text-gray-200 group-hover:text-gray-400 transition-colors flex-shrink-0 cursor-grab"
                        />
                    ) : (
                        <div className="w-[14px] flex-shrink-0" />
                    )}

                    <span className="text-xs text-gray-300 font-mono w-5 text-right flex-shrink-0">
                        {actualIndex + 1}
                    </span>

                    {isLocked ? (
                        <div
                            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 border border-gray-200"
                            title={`Topic locked — complete ${blockingTopics.map((item) => item.title).join(', ')} first`}
                        >
                            <Lock size={16} className="text-gray-400" />
                        </div>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleStatusCycle(topic.id); }}
                            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${status.dot}`}
                            title={`${status.label} — click to change`}
                        >
                            {status.dotInner}
                        </button>
                    )}

                    <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => handleEditTopic(topic)}
                    >
                        <h4 className={`font-semibold text-sm truncate ${status.textClass}`}>
                            {topic.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                            {topic.description && (
                                <span className="text-xs text-gray-400 truncate">{topic.description}</span>
                            )}
                            {topic.estimated_time > 0 && (
                                <span className="text-xs text-blue-500/80 flex items-center gap-1 font-medium flex-shrink-0 bg-blue-50 px-1.5 py-0.5 rounded-md">
                                    <Clock size={10} />
                                    {formatTime(topic.estimated_time)}
                                </span>
                            )}
                            {resourceCount > 0 && (
                                <span className="text-xs text-gray-300 flex items-center gap-1 flex-shrink-0">
                                    <BookOpen size={10} />
                                    {resourceCount}
                                </span>
                            )}
                        </div>
                    </div>

                    {isCompleted && (
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleExerciseCompleted(topic.id); }}
                                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all
                                    ${topic.exercise_completed
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                        : 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 animate-pulse'
                                    }`}
                                title={topic.exercise_completed ? 'Exercise done ✓' : 'Mark exercise as done'}
                            >
                                <Dumbbell size={12} />
                                {topic.exercise_completed ? <Check size={10} strokeWidth={3} /> : 'Exercise'}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleRevisionCompleted(topic.id); }}
                                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all
                                    ${topic.revision_completed
                                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                        : 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 animate-pulse'
                                    }`}
                                title={topic.revision_completed ? 'Revision done ✓' : 'Mark revision as done'}
                            >
                                <BookCheck size={12} />
                                {topic.revision_completed ? <Check size={10} strokeWidth={3} /> : 'Revise'}
                            </button>
                        </div>
                    )}

                    {primaryVideoUrl && (
                        <button
                            onClick={(e) => { e.stopPropagation(); window.open(primaryVideoUrl, '_blank'); }}
                            className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                            title="Open linked video"
                        >
                            <Play size={14} className="text-red-500 fill-red-500" />
                        </button>
                    )}

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleTopicFocus(topic.id);
                        }}
                        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
                            isFocused
                                ? 'bg-rose-100 text-rose-600'
                                : 'bg-gray-100 text-gray-400 hover:bg-rose-50 hover:text-rose-500'
                        }`}
                        title={isFocused ? 'Remove from current focus' : 'Mark as current focus'}
                    >
                        <Target size={14} />
                    </button>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTopic(topic);
                        }}
                        className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-all hover:scale-110 active:scale-95 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                        title="Delete topic"
                    >
                        <Trash2 size={14} />
                    </button>

                    <ChevronRight
                        size={14}
                        className="text-gray-200 group-hover:text-gray-400 transition-colors flex-shrink-0 cursor-pointer"
                        onClick={() => handleEditTopic(topic)}
                    />
                </div>
            </Motion.div>
        );
    };

    return (
        <div className="learning-detail">
            <LearningPathDetailContent
                view={{
                addMenuRef, addResource, addTopicsBatch, canReorderTopics, colorConfig, completedCount,
                deleteResource, deleteTimeLog, deleteTopic, editingTopic, feedbackMessage, filterCounts,
                focusTopics, formatTime, getTopicVideoUrl, handleAddTopic, handleEditTopic, handleReorder,
                handleSaveTimetable, handleSaveTopic, handleToggleSequentialLock, isSequentialLocked, onBack,
                logTime, path, pathTopics, plannedTime, progress, renderTopicRow, reorderTopics, setEditingTopic,
                setShowAddMenu, setShowAIGenerator, setShowTimetableEditor, setShowTopicModal, setTopicFilter,
                setTopicQuery, showAddMenu, showAIGenerator, showTimetableEditor, showTopicModal, timetable,
                topicFilter, topicLibraryEntries, topicQuery, topicResources, topicTimeLogs, totalTime, visibleTopics,
                }}
            />
        </div>
    );
};

export default LearningPathDetailView;
