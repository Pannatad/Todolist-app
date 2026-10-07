import React, { useState, useRef } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { SegmentedControl, Sheet } from '../ui';
import { generateTopicsFromDescription, generateTopicsFromImage } from '../services/aiClient';
import { parseYouTubePlaylist } from '../services/youtubeService';

const TABS = [
    { id: 'describe', label: 'Describe' },
    { id: 'image', label: 'Image' },
    { id: 'youtube', label: 'YouTube' },
];

const AITopicGenerator = ({ isOpen, onClose, pathId, pathName, onAddTopics }) => {
    const [activeTab, setActiveTab] = useState('describe');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Describe tab
    const [description, setDescription] = useState('');

    // Image tab
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    // YouTube tab
    const [youtubeUrl, setYoutubeUrl] = useState('');

    // Generated results
    const [generatedTopics, setGeneratedTopics] = useState([]);
    const [selectedTopics, setSelectedTopics] = useState(new Set());

    const resetState = () => {
        setDescription('');
        setImageFile(null);
        setImagePreview(null);
        setYoutubeUrl('');
        setGeneratedTopics([]);
        setSelectedTopics(new Set());
        setError(null);
        setIsLoading(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setGeneratedTopics([]);
        setSelectedTopics(new Set());
        setError(null);
    };

    // Image handling
    const handleImageChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file && file.type.startsWith('image/')) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onload = (ev) => setImagePreview(ev.target.result);
            reader.readAsDataURL(file);
        }
    };

    // Generate topics
    const handleGenerate = async () => {
        setIsLoading(true);
        setError(null);
        setGeneratedTopics([]);

        try {
            let topics = [];

            if (activeTab === 'describe') {
                if (!description.trim()) {
                    setError('Please enter a description of what you want to learn.');
                    setIsLoading(false);
                    return;
                }
                topics = await generateTopicsFromDescription(description, pathName);
            } else if (activeTab === 'image') {
                if (!imageFile) {
                    setError('Please upload an image first.');
                    setIsLoading(false);
                    return;
                }
                topics = await generateTopicsFromImage(imageFile, pathName);
            } else if (activeTab === 'youtube') {
                if (!youtubeUrl.trim()) {
                    setError('Please enter a YouTube playlist URL.');
                    setIsLoading(false);
                    return;
                }
                const result = await parseYouTubePlaylist(youtubeUrl);
                if (result.error) {
                    setError(result.error);
                    setIsLoading(false);
                    return;
                }
                // Convert video results to topic format
                topics = result.videos.map(v => ({
                    title: v.title,
                    description: '',
                    estimated_time: v.estimated_time || 0,
                    primary_video_url: v.videoUrl,
                }));
            }

            if (topics.length === 0) {
                setError('No topics were generated. Please try a different input.');
            } else {
                setGeneratedTopics(topics);
                // Select all by default
                setSelectedTopics(new Set(topics.map((_, i) => i)));
            }
        } catch (err) {
            console.error('Error generating topics:', err);
            setError(`Failed to generate topics: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Toggle topic selection
    const toggleTopic = (index) => {
        setSelectedTopics(prev => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (selectedTopics.size === generatedTopics.length) {
            setSelectedTopics(new Set());
        } else {
            setSelectedTopics(new Set(generatedTopics.map((_, i) => i)));
        }
    };

    // Add selected topics
    const handleAddSelected = () => {
        const topicsToAdd = generatedTopics
            .filter((_, i) => selectedTopics.has(i))
            .map(t => ({
                learning_path_id: pathId,
                title: t.title,
                description: t.description || '',
                estimated_time: t.estimated_time || 0,
                status: 'not_started',
                primary_video_url: t.primary_video_url || '',
            }));

        if (topicsToAdd.length > 0) {
            onAddTopics(topicsToAdd);
            handleClose();
        }
    };

    // Reverse the order of generated topics
    const handleReverse = () => {
        setGeneratedTopics(prev => [...prev].reverse());
        // Re-map selected indices after reverse
        setSelectedTopics(prev => {
            const total = generatedTopics.length;
            const newSet = new Set();
            prev.forEach(i => newSet.add(total - 1 - i));
            return newSet;
        });
    };

    const allSelected = generatedTopics.length > 0 && selectedTopics.size === generatedTopics.length;
    const canGenerate = activeTab === 'describe'
        ? Boolean(description.trim())
        : activeTab === 'image'
            ? Boolean(imageFile)
            : Boolean(youtubeUrl.trim());

    return (
        <Sheet open={isOpen} onClose={handleClose} title="Generate Topics" className="form-sheet">
            <div className="form-stack">
                <SegmentedControl
                    items={TABS}
                    value={activeTab}
                    onChange={handleTabChange}
                    ariaLabel="Source"
                    className="topic-generator__tabs"
                />

                {activeTab === 'describe' && (
                    <div className="form-group">
                        <label className="form-field form-field--stacked">
                            <span className="sr-only">What do you want to learn?</span>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="What do you want to learn?"
                                rows={4}
                            />
                        </label>
                    </div>
                )}

                {activeTab === 'image' && (
                    <div className="form-group" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                        {imagePreview && (
                            <div className="topic-generator__preview">
                                <img src={imagePreview} alt={imageFile?.name || 'Selected image'} />
                            </div>
                        )}
                        <button
                            type="button"
                            className="form-field form-option form-option--tinted"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {imagePreview ? 'Choose Another Image' : 'Choose Image'}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" hidden onChange={handleImageChange} />
                    </div>
                )}

                {activeTab === 'youtube' && (
                    <div className="form-group">
                        <label className="form-field">
                            <span className="sr-only">Playlist link</span>
                            <input
                                type="url"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="Playlist link"
                            />
                        </label>
                    </div>
                )}

                {error && <p className="form-note is-error">{error}</p>}

                {generatedTopics.length === 0 ? (
                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isLoading || !canGenerate}
                        className="ui-button ui-button--accent form-submit"
                    >
                        {isLoading ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" /> Generating…</> : 'Generate'}
                    </button>
                ) : (
                    <>
                        <div className="topic-generator__header">
                            <span>{generatedTopics.length} topics</span>
                            <button type="button" className="ui-text-button" onClick={handleReverse}>Reverse</button>
                            <button type="button" className="ui-text-button" onClick={toggleAll}>{allSelected ? 'Deselect All' : 'Select All'}</button>
                        </div>
                        <div className="form-group">
                            {generatedTopics.map((topic, index) => {
                                const isSelected = selectedTopics.has(index);
                                return (
                                    <button
                                        key={`${topic.title}-${index}`}
                                        type="button"
                                        className="form-field form-option topic-generator__row"
                                        aria-pressed={isSelected}
                                        onClick={() => toggleTopic(index)}
                                    >
                                        <span className="task-check" aria-hidden="true">
                                            <span>{isSelected && <Check size={12} strokeWidth={3.2} />}</span>
                                        </span>
                                        <span className="topic-generator__copy">
                                            <span>{topic.title}</span>
                                            {(topic.description || topic.estimated_time > 0) && (
                                                <small>{[topic.estimated_time > 0 ? `${topic.estimated_time} min` : null, topic.description].filter(Boolean).join(' · ')}</small>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={handleAddSelected}
                            disabled={selectedTopics.size === 0}
                            className="ui-button ui-button--accent form-submit"
                        >
                            Add {selectedTopics.size} {selectedTopics.size === 1 ? 'Topic' : 'Topics'}
                        </button>
                        <button type="button" className="ui-text-button topic-generator__again" onClick={() => handleTabChange(activeTab)}>
                            Start Over
                        </button>
                    </>
                )}
            </div>
        </Sheet>
    );
};

export default AITopicGenerator;
