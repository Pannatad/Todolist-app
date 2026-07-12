import { AnimatePresence, motion } from 'framer-motion';
import {
    BookMarked,
    Download,
    ExternalLink,
    File,
    FileText,
    GraduationCap,
    Link as LinkIcon,
    Plus,
    StickyNote,
    Trash2,
    Upload,
    Video,
} from 'lucide-react';

const RESOURCE_TYPE_OPTIONS = [
    { value: 'link', label: 'Link', icon: LinkIcon },
    { value: 'video', label: 'Video', icon: Video },
    { value: 'article', label: 'Article', icon: FileText },
    { value: 'course', label: 'Course', icon: GraduationCap },
    { value: 'book', label: 'Book', icon: BookMarked },
    { value: 'note', label: 'Note', icon: StickyNote },
    { value: 'file', label: 'File', icon: File },
];

const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
};

const TopicResourcesPanel = ({
    fileInputRef,
    formatLogDate,
    handleAddResource,
    handleDeleteFileResource,
    handleDownloadFile,
    handleFileUpload,
    handleLogTime,
    isUploading,
    logMinutes,
    logNotes,
    onDeleteResource,
    onDeleteTimeLog,
    resourceTitle,
    resourceType,
    resourceUrl,
    resources,
    setLogMinutes,
    setLogNotes,
    setResourceTitle,
    setResourceType,
    setResourceUrl,
    setShowResourceForm,
    showResourceForm,
    timeLogs,
    topic,
}) => {
    if (!topic) return null;

    return (
                            <div className="space-y-5">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                                            <LinkIcon size={14} />
                                            Resources ({resources.length})
                                        </label>
                                        <div className="flex gap-2">
                                            {/* File Upload Button */}
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                onChange={handleFileUpload}
                                                accept=".pdf,.doc,.docx,.pptx,.ppt,.txt,.md,.jpg,.jpeg,.png,.mp4,.mp3,.zip"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={isUploading}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 hover:text-blue-300 transition-colors flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {isUploading ? (
                                                    <span className="animate-spin">⏳</span>
                                                ) : (
                                                    <Upload size={12} />
                                                )}
                                                {isUploading ? 'Uploading...' : 'Upload'}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setShowResourceForm(!showResourceForm)}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors flex items-center gap-1"
                                            >
                                                <Plus size={12} /> Add
                                            </button>
                                        </div>
                                    </div>

                                    {/* Resource List */}
                                    {resources.length > 0 && (
                                        <div className="space-y-2">
                                            {resources.map((resource) => {
                                                const isFile = resource.resource_type === 'file';
                                                const TypeIcon = RESOURCE_TYPE_OPTIONS.find(r => r.value === resource.resource_type)?.icon || LinkIcon;
                                                return (
                                                    <div
                                                        key={resource.id}
                                                        className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 group"
                                                    >
                                                        <TypeIcon size={16} className={`flex-shrink-0 ${isFile ? 'text-blue-400' : 'text-white/40'}`} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-white/80 truncate">{resource.title}</p>
                                                            {isFile && resource.file_size ? (
                                                                <span className="text-xs text-blue-400/60">{formatFileSize(resource.file_size)}</span>
                                                            ) : resource.url ? (
                                                                <a
                                                                    href={resource.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-xs text-blue-400 hover:text-blue-300 truncate block"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    {resource.url}
                                                                </a>
                                                            ) : null}
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            {isFile && resource.file_path ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDownloadFile(resource)}
                                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-blue-400 transition-colors"
                                                                    title="Download file"
                                                                >
                                                                    <Download size={14} />
                                                                </button>
                                                            ) : resource.url ? (
                                                                <a
                                                                    href={resource.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-blue-400 transition-colors"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                >
                                                                    <ExternalLink size={14} />
                                                                </a>
                                                            ) : null}
                                                            <button
                                                                type="button"
                                                                onClick={() => isFile ? handleDeleteFileResource(resource) : onDeleteResource(resource.id)}
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
                                                    {RESOURCE_TYPE_OPTIONS.filter(t => t.value !== 'file').map((type) => (
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

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-white/70">Study Log</label>
                                        <span className="text-xs text-white/35">{timeLogs.length} session{timeLogs.length !== 1 ? 's' : ''}</span>
                                    </div>

                                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                                        <div className="flex gap-3">
                                            <input
                                                type="number"
                                                min="1"
                                                value={logMinutes}
                                                onChange={(e) => setLogMinutes(e.target.value)}
                                                placeholder="Minutes"
                                                className="w-28 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                            />
                                            <input
                                                type="text"
                                                value={logNotes}
                                                onChange={(e) => setLogNotes(e.target.value)}
                                                placeholder="Optional session note"
                                                className="flex-1 bg-white/10 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleLogTime}
                                                className="px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors text-sm font-medium"
                                            >
                                                Log
                                            </button>
                                        </div>

                                        {timeLogs.length > 0 && (
                                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                                {timeLogs.map((log) => (
                                                    <div
                                                        key={log.id}
                                                        className="flex items-start justify-between gap-3 rounded-lg bg-white/5 px-3 py-2"
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-white/80">{formatDuration(log.duration_minutes)}</p>
                                                            {log.notes && (
                                                                <p className="text-xs text-white/45 mt-0.5 break-words">{log.notes}</p>
                                                            )}
                                                            <p className="text-[11px] text-white/30 mt-1">{formatLogDate(log.logged_at)}</p>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => onDeleteTimeLog(log.id)}
                                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/35 hover:text-red-300 transition-colors"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
    );
};

export default TopicResourcesPanel;

