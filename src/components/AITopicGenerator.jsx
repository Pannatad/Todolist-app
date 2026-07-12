import React, { useState, useRef } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Image, Youtube, Loader2, Check, Upload, AlertCircle, Wand2, ArrowUpDown, Clock } from 'lucide-react';
import { generateTopicsFromDescription, generateTopicsFromImage } from '../services/aiClient';
import { parseYouTubePlaylist } from '../services/youtubeService';

const TABS = [
    { id: 'describe', label: 'Describe', icon: Wand2, emoji: '✨' },
    { id: 'image', label: 'Image', icon: Image, emoji: '📷' },
    { id: 'youtube', label: 'YouTube', icon: Youtube, emoji: '🎬' },
];

const AITopicGenerator = ({ isOpen, onClose, pathId, pathName, pathGradient, onAddTopics }) => {
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



    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <Motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                onClick={handleClose}
            >
                <Motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`bg-gradient-to-r ${pathGradient || 'from-purple-500 to-indigo-600'} p-5 relative overflow-hidden flex-shrink-0`}>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-3">
                                <Sparkles className="text-white/80" size={22} />
                                <h2 className="text-lg font-bold text-white">AI Topic Generator</h2>
                            </div>
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-full hover:bg-white/20 text-white/80 hover:text-white transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-2 mt-4 relative z-10">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all
                                        ${activeTab === tab.id
                                            ? 'bg-white/25 text-white shadow-lg'
                                            : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                                        }`}
                                >
                                    <span>{tab.emoji}</span>
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Content */}
                    <div className="p-5 space-y-4 overflow-y-auto flex-1">
                        {/* Input Section */}
                        {generatedTopics.length === 0 && (
                            <>
                                {activeTab === 'describe' && (
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-white/70">
                                            Describe what you want to learn
                                        </label>
                                        <textarea
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="e.g., I want to learn React.js from scratch, covering components, hooks, state management, and building a full-stack app..."
                                            rows={4}
                                            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none text-sm"
                                            autoFocus
                                        />
                                        <p className="text-xs text-white/30">
                                            💡 Be specific! The more detail you give, the better the topics will be.
                                        </p>
                                    </div>
                                )}

                                {activeTab === 'image' && (
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-white/70">
                                            Upload a course outline, syllabus, or roadmap image
                                        </label>
                                        <div
                                            onDrop={handleDrop}
                                            onDragOver={(e) => e.preventDefault()}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all
                                                ${imagePreview
                                                    ? 'border-purple-500/50 bg-purple-500/5'
                                                    : 'border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10'
                                                }`}
                                        >
                                            {imagePreview ? (
                                                <div className="space-y-3">
                                                    <img
                                                        src={imagePreview}
                                                        alt="Preview"
                                                        className="max-h-40 mx-auto rounded-lg object-contain"
                                                    />
                                                    <p className="text-xs text-white/50">{imageFile?.name}</p>
                                                    <p className="text-xs text-purple-400">Click to change</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <Upload size={32} className="text-white/30 mx-auto" />
                                                    <p className="text-sm text-white/50">
                                                        Drop an image here or click to upload
                                                    </p>
                                                    <p className="text-xs text-white/30">
                                                        Supports: PNG, JPG, WEBP
                                                    </p>
                                                </div>
                                            )}
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'youtube' && (
                                    <div className="space-y-3">
                                        <label className="text-sm font-medium text-white/70">
                                            YouTube Playlist URL
                                        </label>
                                        <input
                                            type="url"
                                            value={youtubeUrl}
                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                            placeholder="https://www.youtube.com/playlist?list=PL..."
                                            className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 text-sm"
                                            autoFocus
                                        />
                                        <p className="text-xs text-white/30">
                                            📺 Paste a public YouTube playlist URL. Each video becomes a topic.
                                        </p>
                                    </div>
                                )}

                                {/* Error */}
                                {error && (
                                    <Motion.div
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl"
                                    >
                                        <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
                                        <p className="text-xs text-red-300">{error}</p>
                                    </Motion.div>
                                )}

                                {/* Generate Button */}
                                <button
                                    onClick={handleGenerate}
                                    disabled={isLoading}
                                    className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2
                                        ${isLoading
                                            ? 'bg-white/10 cursor-not-allowed'
                                            : `bg-gradient-to-r ${pathGradient || 'from-purple-500 to-indigo-600'} hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`
                                        }`}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin" />
                                            {activeTab === 'youtube' ? 'Importing...' : 'Generating...'}
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} />
                                            {activeTab === 'youtube' ? 'Import Playlist' : 'Generate Topics'}
                                        </>
                                    )}
                                </button>
                            </>
                        )}

                        {/* Results Section */}
                        {generatedTopics.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-white/70">
                                        {generatedTopics.length} topics generated
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleReverse}
                                            className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors flex items-center gap-1"
                                            title="Reverse order"
                                        >
                                            <ArrowUpDown size={12} /> Reverse
                                        </button>
                                        <button
                                            onClick={toggleAll}
                                            className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                                        >
                                            {selectedTopics.size === generatedTopics.length ? 'Deselect All' : 'Select All'}
                                        </button>
                                        <button
                                            onClick={() => { setGeneratedTopics([]); setSelectedTopics(new Set()); setError(null); }}
                                            className="text-xs px-3 py-1 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition-colors"
                                        >
                                            ← Back
                                        </button>
                                    </div>
                                </div>

                                {/* Topic List */}
                                <div className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
                                    {generatedTopics.map((topic, index) => {
                                        const isSelected = selectedTopics.has(index);
                                        return (
                                            <Motion.button
                                                key={index}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.03 }}
                                                onClick={() => toggleTopic(index)}
                                                className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all
                                                    ${isSelected
                                                        ? 'bg-white/15 border border-white/20'
                                                        : 'bg-white/5 border border-transparent hover:bg-white/10'
                                                    }`}
                                            >
                                                {/* Checkbox */}
                                                <div className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center mt-0.5 transition-all
                                                    ${isSelected
                                                        ? 'bg-purple-500 border-purple-500'
                                                        : 'border-white/30 bg-transparent'
                                                    }`}
                                                >
                                                    {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-white/30 font-mono">{index + 1}.</span>
                                                        <h4 className="text-sm font-semibold text-white truncate">{topic.title}</h4>
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {topic.description && (
                                                            <p className="text-xs text-white/40 line-clamp-1 truncate">{topic.description}</p>
                                                        )}
                                                        {topic.estimated_time > 0 && (
                                                            <span className="text-[10px] text-blue-300 bg-blue-500/20 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium whitespace-nowrap flex-shrink-0">
                                                                <Clock size={10} />
                                                                {topic.estimated_time}m
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Motion.button>
                                        );
                                    })}
                                </div>

                                {/* Add Selected Button */}
                                <button
                                    onClick={handleAddSelected}
                                    disabled={selectedTopics.size === 0}
                                    className={`w-full py-3 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2
                                        ${selectedTopics.size === 0
                                            ? 'bg-white/10 cursor-not-allowed text-white/30'
                                            : `bg-gradient-to-r ${pathGradient || 'from-purple-500 to-indigo-600'} hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]`
                                        }`}
                                >
                                    <Check size={16} />
                                    Add {selectedTopics.size} Topic{selectedTopics.size !== 1 ? 's' : ''}
                                </button>
                            </div>
                        )}
                    </div>
                </Motion.div>
            </Motion.div>
        </AnimatePresence>
    );
};

export default AITopicGenerator;
