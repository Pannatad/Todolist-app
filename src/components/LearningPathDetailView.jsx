import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { ArrowLeft, Plus, Clock, BookOpen, Target, TrendingUp, Flame, Check, Star, Zap, ChevronRight, GripVertical, Sparkles, ArrowUpDown, Play } from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import TopicModal from './TopicModal';
import AITopicGenerator from './AITopicGenerator';
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
        textClass: 'text-gray-400 line-through',
    },
    mastered: {
        label: 'Mastered',
        dot: 'bg-yellow-50 border border-yellow-300 hover:bg-yellow-100 shadow-[0_0_10px_rgba(234,179,8,0.15)]',
        dotInner: <Star size={18} className="text-yellow-500 fill-yellow-400" />,
        textClass: 'text-gray-400 line-through',
        rowHighlight: 'ring-1 ring-yellow-300/50 border-yellow-200',
    },
};

const LearningPathDetailView = ({ path, onBack }) => {
    const {
        getTopicsByPath,
        getPathProgress,
        getPathTotalTime,
        getResourcesByTopic,
        addTopic,
        addTopicsBatch,
        updateTopic,
        deleteTopic,
        cycleTopicStatus,
        addResource,
        deleteResource,
        reorderTopics,
        topics,
    } = useLearning();

    const [showTopicModal, setShowTopicModal] = useState(false);
    const [editingTopic, setEditingTopic] = useState(null);
    const [showAIGenerator, setShowAIGenerator] = useState(false);

    // Computed values
    const progress = getPathProgress(path.id);
    const totalTime = getPathTotalTime(path.id);
    const pathTopics = useMemo(() =>
        topics
            .filter(t => t.learning_path_id === path.id)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
        [topics, path.id]
    );
    const completedCount = pathTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;
    const inProgressCount = pathTopics.filter(t => t.status === 'in_progress').length;

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
            await updateTopic(topicData.id, topicData);
        } else {
            await addTopic(topicData);
        }
    };

    const handleReorder = (reorderedTopics) => {
        reorderTopics(path.id, reorderedTopics.map(t => t.id));
    };

    const topicResources = editingTopic ? getResourcesByTopic(editingTopic.id) : [];

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
                                <p className="text-2xl font-bold text-white">{formatTime(pathTopics.reduce((sum, t) => sum + (t.estimated_time || 0), 0))}</p>
                                <p className="text-xs text-white/50">Total Duration</p>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center">
                                <Flame size={20} className="text-white/60 mx-auto mb-1" />
                                <p className="text-2xl font-bold text-white">{formatTime(pathTopics.filter(t => t.status === 'completed' || t.status === 'mastered').reduce((sum, t) => sum + (t.estimated_time || 0), 0))}</p>
                                <p className="text-xs text-white/50">Learned</p>
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
                        <button
                            onClick={() => setShowAIGenerator(true)}
                            className="text-xs px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1
                                bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:shadow-md hover:scale-105 active:scale-95"
                        >
                            <Sparkles size={12} /> AI Generate
                        </button>
                        <button
                            onClick={handleAddTopic}
                            className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-colors flex items-center gap-1
                                bg-gradient-to-r ${colorConfig.gradient} text-white hover:shadow-md hover:scale-105 active:scale-95`}
                        >
                            <Plus size={12} /> Add Topic
                        </button>
                    </div>
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
                ) : (
                    <Reorder.Group
                        axis="y"
                        values={pathTopics}
                        onReorder={handleReorder}
                        className="divide-y divide-gray-50"
                    >
                        <AnimatePresence>
                            {pathTopics.map((topic, index) => {
                                const status = STATUS_CONFIG[topic.status] || STATUS_CONFIG.not_started;
                                const resourceCount = getResourcesByTopic(topic.id).length;
                                const isCompleted = topic.status === 'completed' || topic.status === 'mastered';

                                return (
                                    <Reorder.Item
                                        key={topic.id}
                                        value={topic}
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        transition={{ delay: index * 0.03 }}
                                        className={`group flex items-center gap-3 px-5 py-3.5 cursor-grab active:cursor-grabbing
                                            hover:bg-gray-50/80 transition-colors
                                            ${isCompleted ? 'opacity-60' : ''}
                                            ${status.rowHighlight || ''}`}
                                    >
                                        {/* Drag Handle */}
                                        <GripVertical
                                            size={14}
                                            className="text-gray-200 group-hover:text-gray-400 transition-colors flex-shrink-0 cursor-grab"
                                        />

                                        {/* Order Number */}
                                        <span className="text-xs text-gray-300 font-mono w-5 text-right flex-shrink-0">
                                            {index + 1}
                                        </span>

                                        {/* Status Indicator */}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); cycleTopicStatus(topic.id); }}
                                            className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${status.dot}`}
                                            title={`${status.label} — click to change`}
                                        >
                                            {status.dotInner}
                                        </button>

                                        {/* Content */}
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

                                        {/* Play Button (YouTube links) */}
                                        {topic.description && topic.description.includes('youtube.com/watch') && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); window.open(topic.description, '_blank'); }}
                                                className="flex-shrink-0 w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-all hover:scale-110 active:scale-95"
                                                title="Watch on YouTube"
                                            >
                                                <Play size={14} className="text-red-500 fill-red-500" />
                                            </button>
                                        )}

                                        {/* Chevron */}
                                        <ChevronRight
                                            size={14}
                                            className="text-gray-200 group-hover:text-gray-400 transition-colors flex-shrink-0 cursor-pointer"
                                            onClick={() => handleEditTopic(topic)}
                                        />
                                    </Reorder.Item>
                                );
                            })}
                        </AnimatePresence>
                    </Reorder.Group>
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

            {/* Topic Modal */}
            <TopicModal
                isOpen={showTopicModal}
                onClose={() => { setShowTopicModal(false); setEditingTopic(null); }}
                onSave={handleSaveTopic}
                onDelete={deleteTopic}
                topic={editingTopic}
                pathId={path.id}
                resources={topicResources}
                onAddResource={addResource}
                onDeleteResource={deleteResource}
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
        </div>
    );
};

export default LearningPathDetailView;
