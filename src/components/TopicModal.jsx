import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { BookCheck, BookOpen, Check, Clock, Dumbbell, Sparkles, Trash2, X } from 'lucide-react';
import { useLearning } from '../context/LearningContext';
import { confirmAction } from '../utils/confirm';
import TopicResourcesPanel from './TopicResourcesPanel';

const TopicModal = ({
    isOpen,
    onClose,
    onSave,
    onDelete,
    topic = null,
    pathId,
    resources = [],
    timeLogs = [],
    onAddResource,
    onDeleteResource,
    onLogTime,
    onDeleteTimeLog,
    availablePrerequisites = [],
    primaryVideoUrl = '',
}) => {
    const { uploadMaterial, deleteMaterial, getMaterialSignedUrl } = useLearning();

    const [title, setTitle] = useState(topic?.title || '');
    const [description, setDescription] = useState(topic?.description || '');
    const [estimatedTime, setEstimatedTime] = useState(topic?.estimated_time || 0);
    const [notes, setNotes] = useState(topic?.notes || '');
    const [videoUrl, setVideoUrl] = useState(primaryVideoUrl || '');
    const [selectedPrerequisites, setSelectedPrerequisites] = useState(topic?.prerequisite_topic_ids || []);

    // Resource form state
    const [showResourceForm, setShowResourceForm] = useState(false);
    const [resourceTitle, setResourceTitle] = useState('');
    const [resourceUrl, setResourceUrl] = useState('');
    const [resourceType, setResourceType] = useState('link');
    const [isUploading, setIsUploading] = useState(false);
    const [logMinutes, setLogMinutes] = useState('');
    const [logNotes, setLogNotes] = useState('');

    const fileInputRef = React.useRef(null);

    // Reset form when topic prop changes
    React.useEffect(() => {
        if (isOpen) {
            setTitle(topic?.title || '');
            setDescription(topic?.description || '');
            setEstimatedTime(topic?.estimated_time || 0);
            setNotes(topic?.notes || '');
            setVideoUrl(primaryVideoUrl || '');
            setSelectedPrerequisites(topic?.prerequisite_topic_ids || []);
            setShowResourceForm(false);
            setResourceTitle('');
            setResourceUrl('');
            setResourceType('link');
            setLogMinutes('');
            setLogNotes('');
        }
    }, [topic, isOpen, primaryVideoUrl]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        onSave({
            id: topic?.id,
            learning_path_id: pathId,
            title: title.trim(),
            description: description.trim(),
            estimated_time: parseInt(estimatedTime) || 0,
            notes: notes.trim(),
            prerequisite_topic_ids: selectedPrerequisites,
            primary_video_url: videoUrl.trim(),
            status: topic?.status || 'not_started',
        });

        onClose();
    };

    const togglePrerequisite = (topicId) => {
        setSelectedPrerequisites((prev) => (
            prev.includes(topicId)
                ? prev.filter((id) => id !== topicId)
                : [...prev, topicId]
        ));
    };

    const handleLogTime = async () => {
        const duration = parseInt(logMinutes, 10);
        if (!topic?.id || !duration || duration <= 0) return;

        await onLogTime(topic.id, duration, logNotes.trim());
        setLogMinutes('');
        setLogNotes('');
    };

    const formatLogDate = (value) => new Date(value).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });

    const handleAddResource = () => {
        if (!resourceTitle.trim()) return;

        onAddResource({
            topic_id: topic?.id,
            title: resourceTitle.trim(),
            url: resourceUrl.trim(),
            resource_type: resourceType,
        });

        setResourceTitle('');
        setResourceUrl('');
        setResourceType('link');
        setShowResourceForm(false);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !topic?.id) return;

        setIsUploading(true);
        try {
            const result = await uploadMaterial(topic.id, file);
            if (result) {
                onAddResource({
                    topic_id: topic.id,
                    title: file.name,
                    url: '',
                    resource_type: 'file',
                    file_path: result.file_path,
                    file_size: result.file_size,
                    file_type: result.file_type,
                });
            }
        } catch (err) {
            console.error('File upload failed:', err);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDownloadFile = async (resource) => {
        if (!resource.file_path) return;
        const url = await getMaterialSignedUrl(resource.file_path);
        if (url) {
            window.open(url, '_blank');
        }
    };

    const handleDeleteFileResource = async (resource) => {
        if (resource.file_path) {
            await deleteMaterial(resource.file_path);
        }
        onDeleteResource(resource.id);
    };



    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`bg-gradient-to-r from-purple-500 to-indigo-600 p-6 relative overflow-hidden flex-shrink-0`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <BookOpen className="text-white/80" size={24} />
                                <h2 className="text-xl font-bold text-white">
                                    {topic ? 'Edit Topic' : 'Add New Topic'}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Form - Scrollable */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Topic Title</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g., Neural Networks, React Hooks, Verb Conjugation"
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                autoFocus
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Brief overview of what this topic covers..."
                                rows={2}
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                            />
                        </div>

                        {/* Estimated Time */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                <Clock size={14} />
                                Estimated Time
                            </label>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    min="0"
                                    max="999"
                                    value={estimatedTime}
                                    onChange={(e) => setEstimatedTime(e.target.value)}
                                    className="w-24 bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                />
                                <span className="text-white/50 text-sm">minutes</span>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                <Video size={14} />
                                Main Video Link
                            </label>
                            <input
                                type="url"
                                value={videoUrl}
                                onChange={(e) => setVideoUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                            <p className="text-xs text-white/35">
                                Useful for courses that keep publishing new lectures after you imported the playlist.
                            </p>
                        </div>

                        {availablePrerequisites.length > 0 && (
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-white/70">Prerequisites</label>
                                <div className="max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-2 space-y-2">
                                    {availablePrerequisites.map((prerequisite) => {
                                        const isSelected = selectedPrerequisites.includes(prerequisite.id);
                                        return (
                                            <button
                                                key={prerequisite.id}
                                                type="button"
                                                onClick={() => togglePrerequisite(prerequisite.id)}
                                                className={`w-full flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                                                    isSelected
                                                        ? 'bg-purple-500/20 text-white border border-purple-400/40'
                                                        : 'bg-white/5 text-white/70 border border-transparent hover:bg-white/10'
                                                }`}
                                            >
                                                <span className="truncate text-sm">{prerequisite.title}</span>
                                                {isSelected && <Check size={14} className="flex-shrink-0" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="text-xs text-white/35">
                                    If you pick prerequisites, this topic unlocks only after those topics are completed.
                                </p>
                            </div>
                        )}



                        {/* Exercise & Revision Status (when completed) */}
                        {topic && topic.status === 'completed' && (
                            <div className="space-y-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                                <label className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                                    🎯 Complete these to achieve Mastery
                                </label>
                                <div className="flex gap-3">
                                    <div className={`flex-1 flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                                        topic.exercise_completed
                                            ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                                            : 'bg-white/5 border-white/10 text-white/50'
                                    }`}>
                                        <Dumbbell size={16} />
                                        <span className="text-sm font-medium">Exercise</span>
                                        {topic.exercise_completed && <Check size={14} className="ml-auto" strokeWidth={3} />}
                                    </div>
                                    <div className={`flex-1 flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                                        topic.revision_completed
                                            ? 'bg-emerald-500/20 border-emerald-400/30 text-emerald-300'
                                            : 'bg-white/5 border-white/10 text-white/50'
                                    }`}>
                                        <BookCheck size={16} />
                                        <span className="text-sm font-medium">Revision</span>
                                        {topic.revision_completed && <Check size={14} className="ml-auto" strokeWidth={3} />}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Notes */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-white/70">Learning Notes</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Key insights, takeaways, important concepts..."
                                rows={4}
                                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-mono text-sm"
                            />
                        </div>

                        <TopicResourcesPanel
                            fileInputRef={fileInputRef}
                            formatLogDate={formatLogDate}
                            handleAddResource={handleAddResource}
                            handleDeleteFileResource={handleDeleteFileResource}
                            handleDownloadFile={handleDownloadFile}
                            handleFileUpload={handleFileUpload}
                            handleLogTime={handleLogTime}
                            isUploading={isUploading}
                            logMinutes={logMinutes}
                            logNotes={logNotes}
                            onDeleteResource={onDeleteResource}
                            onDeleteTimeLog={onDeleteTimeLog}
                            resourceTitle={resourceTitle}
                            resourceType={resourceType}
                            resourceUrl={resourceUrl}
                            resources={resources}
                            setLogMinutes={setLogMinutes}
                            setLogNotes={setLogNotes}
                            setResourceTitle={setResourceTitle}
                            setResourceType={setResourceType}
                            setResourceUrl={setResourceUrl}
                            setShowResourceForm={setShowResourceForm}
                            showResourceForm={showResourceForm}
                            timeLogs={timeLogs}
                            topic={topic}
                        />

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            {topic && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (confirmAction('Delete this topic?')) {
                                            onDelete(topic.id);
                                            onClose();
                                        }
                                    }}
                                    className="px-4 py-3 rounded-xl font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 py-3 rounded-xl font-bold text-white/60 bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={`flex-1 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-500 to-indigo-600 hover:shadow-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-2`}
                            >
                                <Sparkles size={18} />
                                {topic ? 'Update' : 'Create'}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default TopicModal;
