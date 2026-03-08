import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Clock, BookOpen, Link as LinkIcon, Plus, Trash2, ExternalLink, FileText, Video, BookMarked, GraduationCap, StickyNote } from 'lucide-react';





const RESOURCE_TYPE_OPTIONS = [
    { value: 'link', label: 'Link', icon: LinkIcon },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'article', label: 'Article', icon: FileText },
    { value: 'course', label: 'Course', icon: GraduationCap },
    { value: 'book', label: 'Book', icon: BookMarked },
    { value: 'note', label: 'Note', icon: StickyNote },
];

const TopicModal = ({ isOpen, onClose, onSave, onDelete, topic = null, pathId, resources = [], onAddResource, onDeleteResource }) => {
    const [title, setTitle] = useState(topic?.title || '');
    const [description, setDescription] = useState(topic?.description || '');


    const [estimatedTime, setEstimatedTime] = useState(topic?.estimated_time || 0);
    const [notes, setNotes] = useState(topic?.notes || '');

    // Resource form state
    const [showResourceForm, setShowResourceForm] = useState(false);
    const [resourceTitle, setResourceTitle] = useState('');
    const [resourceUrl, setResourceUrl] = useState('');
    const [resourceType, setResourceType] = useState('link');

    // Reset form when topic prop changes
    React.useEffect(() => {
        if (isOpen) {
            setTitle(topic?.title || '');
            setDescription(topic?.description || '');


            setEstimatedTime(topic?.estimated_time || 0);
            setNotes(topic?.notes || '');
            setShowResourceForm(false);
            setResourceTitle('');
            setResourceUrl('');
            setResourceType('link');
        }
    }, [topic, isOpen]);

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
            status: topic?.status || 'not_started',
        });

        onClose();
    };

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

                        {/* Resources Section (only for existing topics) */}
                        {topic && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                        <LinkIcon size={14} />
                                        Resources ({resources.length})
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setShowResourceForm(!showResourceForm)}
                                        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors flex items-center gap-1"
                                    >
                                        <Plus size={12} /> Add
                                    </button>
                                </div>

                                {/* Resource List */}
                                {resources.length > 0 && (
                                    <div className="space-y-2">
                                        {resources.map((resource) => {
                                            const TypeIcon = RESOURCE_TYPE_OPTIONS.find(r => r.value === resource.resource_type)?.icon || LinkIcon;
                                            return (
                                                <div
                                                    key={resource.id}
                                                    className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group"
                                                >
                                                    <TypeIcon size={16} className="text-white/40 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm text-white/80 truncate">{resource.title}</p>
                                                        {resource.url && (
                                                            <a
                                                                href={resource.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-blue-400 hover:text-blue-300 truncate block"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                {resource.url}
                                                            </a>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {resource.url && (
                                                            <a
                                                                href={resource.url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-blue-400 transition-colors"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                <ExternalLink size={14} />
                                                            </a>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => onDeleteResource(resource.id)}
                                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Add Resource Form */}
                                <AnimatePresence>
                                    {showResourceForm && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="space-y-3 p-4 bg-white/5 rounded-xl border border-white/10"
                                        >
                                            <div className="flex gap-2 flex-wrap">
                                                {RESOURCE_TYPE_OPTIONS.map((type) => (
                                                    <button
                                                        key={type.value}
                                                        type="button"
                                                        onClick={() => setResourceType(type.value)}
                                                        className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors ${resourceType === type.value
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-white/5 text-white/40 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <type.icon size={12} />
                                                        {type.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <input
                                                type="text"
                                                value={resourceTitle}
                                                onChange={(e) => setResourceTitle(e.target.value)}
                                                placeholder="Resource title"
                                                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                            />
                                            <input
                                                type="url"
                                                value={resourceUrl}
                                                onChange={(e) => setResourceUrl(e.target.value)}
                                                placeholder="https://... (optional)"
                                                className="w-full bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setShowResourceForm(false)}
                                                    className="flex-1 py-2 text-sm rounded-lg text-white/50 bg-white/5 hover:bg-white/10 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={handleAddResource}
                                                    className="flex-1 py-2 text-sm rounded-lg text-white bg-purple-600 hover:bg-purple-500 transition-colors flex items-center justify-center gap-1"
                                                >
                                                    <Plus size={14} /> Add Resource
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-4">
                            {topic && onDelete && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (window.confirm('Delete this topic?')) {
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
