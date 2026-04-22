import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ArrowLeft, Plus, Clock, BookOpen, Target, TrendingUp, Flame, Check, Star, Zap, ChevronRight, GripVertical, Sparkles, ArrowUpDown, Play, Calendar, Lock, Unlock, Dumbbell, BookCheck, Search } from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import TopicModal from './TopicModal';
import AITopicGenerator from './AITopicGenerator';
import TimetableEditor from './TimetableEditor';
import { COLOR_OPTIONS } from './LearningPathModal';

const STATUS_CONFIG = {
    not_started: {
        label: 'Not Started',
        dot: 'bg-gray-50 border-2 border-dashed border-gray-300 hover:border-gray-400',
        dotInner: <div className="w-3 h-3 rounded-full bg-gray-300" />,
        textClass: 'text-gray-800',
    },
    in_progress: {
        label: 'In Progress',
        dot: 'bg-amber-50 border border-amber-300 hover:bg-amber-100',
        dotInner: <Zap size={18} className="text-amber-500" />,
        textClass: 'text-gray-800',
        rowHighlight: 'border-l-4 border-l-amber-400 bg-amber-50/30',
    },
    completed: {
        label: 'Completed',
        dot: 'bg-emerald-50 border border-emerald-300 hover:bg-emerald-100',
        dotInner: <Check size={18} className="text-emerald-500" strokeWidth={3} />,
        textClass: 'text-gray-800',
        rowHighlight: 'border-l-4 border-l-emerald-400 bg-emerald-50/20',
    },
    mastered: {
        label: 'Mastered',
        dot: 'bg-yellow-50 border border-yellow-300 hover:bg-yellow-100 shadow-[0_0_10px_rgba(234,179,8,0.15)]',
        dotInner: <Star size={18} className="text-yellow-500 fill-yellow-400" />,
        textClass: 'text-gray-400 line-through',
        rowHighlight: 'ring-1 ring-yellow-300/50 border-yellow-200',
    },
};

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TOPIC_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'focus', label: 'Focus' },
    { id: 'active', label: 'Active' },
    { id: 'done', label: 'Done' },
];

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
                const primaryVideoResource = getPrimaryVideoResource(topic.id);
                const totalLoggedTime = getTopicTotalTime(topic.id);

                return {
                    id: topic.id,
                    title: topic.title,
                    notes: topic.notes?.trim() || '',
                    resources: topicResources,
                    primaryVideoUrl: primaryVideoResource?.url || '',
                    totalLoggedTime,
                };
            })
            .filter((entry) =>
                entry.notes ||
                entry.resources.length > 0 ||
                entry.primaryVideoUrl ||
                entry.totalLoggedTime > 0
            );
    }, [pathTopics, getPrimaryVideoResource, getResourcesByTopic, getTopicTotalTime]);

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

    const formatLogDate = (value) => {
        return new Date(value).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
        });
    };

    const renderTopicRow = (topic, index) => {
        const status = STATUS_CONFIG[topic.status] || STATUS_CONFIG.not_started;
        const topicResourceList = getResourcesByTopic(topic.id);
        const primaryVideoResource = getPrimaryVideoResource(topic.id);
        const resourceCount = topicResourceList.length;
        const isCompleted = topic.status === 'completed';
        const isMastered = topic.status === 'mastered';
        const actualIndex = pathTopics.findIndex((item) => item.id === topic.id);
        const isLocked = isTopicLocked(topic, actualIndex);
        const blockingTopics = getBlockingTopics(topic, actualIndex);
        const isFocused = topic.section === 'current_focus';

        return (
            <motion.div
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

                    {primaryVideoResource?.url && (
                        <button
                            onClick={(e) => { e.stopPropagation(); window.open(primaryVideoResource.url, '_blank'); }}
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

                    <ChevronRight
                        size={14}
                        className="text-gray-200 group-hover:text-gray-400 transition-colors flex-shrink-0 cursor-pointer"
                        onClick={() => handleEditTopic(topic)}
                    />
                </div>
            </motion.div>
        );
    };

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
                                <motion.div
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
                                    <motion.div
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
                                    </motion.div>
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
                primaryVideoUrl={editingTopic ? getPrimaryVideoResource(editingTopic.id)?.url || '' : ''}
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

export default LearningPathDetailView;
