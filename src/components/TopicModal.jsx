import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Sheet } from '../ui';
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



    return (
        <Sheet open={isOpen} onClose={onClose} title={topic ? 'Edit Topic' : 'New Topic'} className="form-sheet">
            <form onSubmit={handleSubmit} className="form-stack">
                <div className="form-group">
                    <label className="form-field">
                        <span className="sr-only">Title</span>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Title"
                            autoFocus={!topic}
                        />
                    </label>
                    <label className="form-field form-field--stacked">
                        <span className="sr-only">Description</span>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Description"
                            rows={2}
                        />
                    </label>
                </div>

                <div className="form-group">
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Duration</span>
                        <input
                            type="number"
                            min="0"
                            max="999"
                            value={estimatedTime}
                            onChange={(e) => setEstimatedTime(e.target.value)}
                        />
                        <span className="form-field__suffix">min</span>
                    </label>
                    <label className="form-field form-field--value">
                        <span className="form-field__label">Video</span>
                        <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="Link"
                        />
                    </label>
                </div>

                {availablePrerequisites.length > 0 && (
                    <>
                        <p className="form-section-label">Unlocks After</p>
                        <div className="form-group">
                            {availablePrerequisites.map((prerequisite) => {
                                const isSelected = selectedPrerequisites.includes(prerequisite.id);
                                return (
                                    <button
                                        key={prerequisite.id}
                                        type="button"
                                        onClick={() => togglePrerequisite(prerequisite.id)}
                                        className="form-field form-option"
                                        aria-pressed={isSelected}
                                    >
                                        <span className="form-goal">{prerequisite.title}</span>
                                        {isSelected && <Check size={17} strokeWidth={2.6} className="form-option__check" />}
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}

                {topic?.status === 'completed' && (
                    <>
                        <p className="form-section-label">Mastery</p>
                        <div className="form-group">
                            <div className="form-field">
                                <span className="form-goal">Exercise</span>
                                <span className="form-option__detail">{topic.exercise_completed ? 'Done' : 'To Do'}</span>
                            </div>
                            <div className="form-field">
                                <span className="form-goal">Revision</span>
                                <span className="form-option__detail">{topic.revision_completed ? 'Done' : 'To Do'}</span>
                            </div>
                        </div>
                    </>
                )}

                <div className="form-group">
                    <label className="form-field form-field--stacked">
                        <span className="sr-only">Notes</span>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Notes"
                            rows={4}
                        />
                    </label>
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

                <button type="submit" disabled={!title.trim()} className="ui-button ui-button--accent form-submit">
                    {topic ? 'Save' : 'Add Topic'}
                </button>

                {topic && onDelete && (
                    <div className="form-group">
                        <button
                            type="button"
                            onClick={() => {
                                if (confirmAction('Delete this topic?')) {
                                    onDelete(topic.id);
                                    onClose();
                                }
                            }}
                            className="form-field form-option form-option--destructive"
                        >
                            Delete Topic
                        </button>
                    </div>
                )}
            </form>
        </Sheet>
    );
};

export default TopicModal;
