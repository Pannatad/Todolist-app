import {
    BookMarked,
    File,
    FileText,
    GraduationCap,
    Link as LinkIcon,
    StickyNote,
    Video,
    X,
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
        <>
            <p className="form-section-label">Resources</p>
            <div className="form-group">
                {resources.map((resource) => {
                    const isFile = resource.resource_type === 'file';
                    const TypeIcon = RESOURCE_TYPE_OPTIONS.find((option) => option.value === resource.resource_type)?.icon || LinkIcon;
                    const detail = isFile ? formatFileSize(resource.file_size) : '';
                    const canOpen = (isFile && resource.file_path) || resource.url;
                    return (
                        <div key={resource.id} className="form-field topic-resource">
                            <TypeIcon size={17} className="topic-resource__icon" aria-hidden="true" />
                            <button
                                type="button"
                                className="topic-resource__title"
                                disabled={!canOpen}
                                onClick={() => {
                                    if (isFile) handleDownloadFile(resource);
                                    else window.open(resource.url, '_blank', 'noopener,noreferrer');
                                }}
                            >
                                {resource.title}
                            </button>
                            {detail && <span className="form-option__detail">{detail}</span>}
                            <button
                                type="button"
                                onClick={() => (isFile ? handleDeleteFileResource(resource) : onDeleteResource(resource.id))}
                                className="form-remove"
                                aria-label={`Remove ${resource.title}`}
                            >
                                <X size={13} strokeWidth={2.6} />
                            </button>
                        </div>
                    );
                })}

                {showResourceForm ? (
                    <>
                        <div className="form-chips">
                            {RESOURCE_TYPE_OPTIONS.filter((option) => option.value !== 'file').map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setResourceType(option.value)}
                                    className={`form-chip${resourceType === option.value ? ' is-selected' : ''}`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <label className="form-field">
                            <span className="sr-only">Resource title</span>
                            <input
                                type="text"
                                value={resourceTitle}
                                onChange={(e) => setResourceTitle(e.target.value)}
                                placeholder="Title"
                                autoFocus
                            />
                        </label>
                        <label className="form-field">
                            <span className="sr-only">Resource link</span>
                            <input
                                type="url"
                                value={resourceUrl}
                                onChange={(e) => setResourceUrl(e.target.value)}
                                placeholder="Link (optional)"
                            />
                        </label>
                        <div className="form-field topic-resource__actions">
                            <button type="button" className="ui-text-button" onClick={() => setShowResourceForm(false)}>Cancel</button>
                            <button type="button" className="ui-text-button" disabled={!resourceTitle.trim()} onClick={handleAddResource}>Add</button>
                        </div>
                    </>
                ) : (
                    <>
                        <button type="button" className="form-field form-option form-option--tinted" onClick={() => setShowResourceForm(true)}>
                            Add Link
                        </button>
                        <button
                            type="button"
                            className="form-field form-option form-option--tinted"
                            disabled={isUploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {isUploading ? 'Uploading…' : 'Upload File'}
                        </button>
                    </>
                )}
                <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    onChange={handleFileUpload}
                    accept=".pdf,.doc,.docx,.pptx,.ppt,.txt,.md,.jpg,.jpeg,.png,.mp4,.mp3,.zip"
                />
            </div>

            <p className="form-section-label">Study Log</p>
            <div className="form-group">
                <div className="form-field topic-log__entry">
                    <input
                        type="number"
                        min="1"
                        value={logMinutes}
                        onChange={(e) => setLogMinutes(e.target.value)}
                        placeholder="Min"
                        aria-label="Minutes studied"
                        className="topic-log__minutes"
                    />
                    <input
                        type="text"
                        value={logNotes}
                        onChange={(e) => setLogNotes(e.target.value)}
                        placeholder="Note"
                        aria-label="Session note"
                    />
                    <button type="button" className="ui-text-button" disabled={!(parseInt(logMinutes, 10) > 0)} onClick={handleLogTime}>Log</button>
                </div>
                {timeLogs.map((log) => (
                    <div key={log.id} className="form-field topic-log">
                        <span className="topic-log__copy">
                            <span>{formatDuration(log.duration_minutes)}{log.notes ? ` · ${log.notes}` : ''}</span>
                            <small>{formatLogDate(log.logged_at)}</small>
                        </span>
                        <button
                            type="button"
                            onClick={() => onDeleteTimeLog(log.id)}
                            className="form-remove"
                            aria-label="Delete study session"
                        >
                            <X size={13} strokeWidth={2.6} />
                        </button>
                    </div>
                ))}
            </div>
        </>
    );
};

export default TopicResourcesPanel;

