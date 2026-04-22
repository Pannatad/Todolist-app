import React, { useState, useRef, useEffect } from 'react';
import { Plus, Calendar, X, Clock, Sparkles, Loader2, Tag, Camera, Upload, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseTaskInput, parseTaskImage } from '../services/aiClient';
import { getColorForSubject } from '../constants/subjects';

const TaskInput = ({ onAdd, existingSubjects = [] }) => {
    const [title, setTitle] = useState('');
    const [difficulty, setDifficulty] = useState('easy');
    const [subject, setSubject] = useState('');
    const [deadline, setDeadline] = useState('');
    const [estimatedTime, setEstimatedTime] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

    // Camera & Image State
    const [isScanning, setIsScanning] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);

    const datePickerRef = useRef(null);
    const subjectRef = useRef(null);
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);

    // Close date picker when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target)) {
                setShowDatePicker(false);
            }
            if (subjectRef.current && !subjectRef.current.contains(event.target)) {
                setShowSubjectSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Filter suggestions based on input
    const subjectSuggestions = existingSubjects
        .filter(s => s.toLowerCase().includes(subject.toLowerCase()))
        .slice(0, 5);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim()) return;

        onAdd({
            title,
            difficulty,
            deadline: deadline || null,
            subject: subject.trim() || null,
            estimatedTime: estimatedTime ? parseInt(estimatedTime) : null
        });
        setTitle('');
        setDifficulty('easy');
        setSubject('');
        setDeadline('');
        setEstimatedTime('');
        setShowDatePicker(false);
    };

    const handleAiMagic = async () => {
        console.log("🔮 handleAiMagic triggered with title:", title);
        if (!title.trim()) {
            console.warn("Title is empty, aborting");
            return;
        }

        setIsAiLoading(true);
        console.log("⏳ Loading started, calling parseTaskInput...");
        try {
            const parsed = await parseTaskInput(title);
            console.log("✅ AI Parsed:", parsed);

            // Auto-populate all fields with parsed data
            console.log("📝 Setting title to:", parsed.title);
            setTitle(parsed.title);
            console.log("🎯 Setting difficulty to:", parsed.difficulty);
            setDifficulty(parsed.difficulty);
            console.log("📚 Setting subject to:", parsed.subject || '');
            setSubject(parsed.subject || '');
            console.log("⏱️ Setting estimated time to:", parsed.estimatedTime ? String(parsed.estimatedTime) : '');
            setEstimatedTime(parsed.estimatedTime ? String(parsed.estimatedTime) : '');

            // Handle deadline - convert ISO string to datetime-local format if present
            if (parsed.deadline) {
                console.log("📅 Parsing deadline:", parsed.deadline);
                const date = new Date(parsed.deadline);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;
                console.log("📅 Setting deadline to:", formatted);
                setDeadline(formatted);
            } else {
                console.log("📅 No deadline parsed");
            }

            console.log("✅ All fields updated successfully!");

        } catch (error) {
            console.error("❌ AI Error:", error);
            console.error("Error stack:", error.stack);
        } finally {
            console.log("🏁 Setting loading to false");
            setIsAiLoading(false);
        }
    };

    // Camera & Image Handlers
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setCameraStream(stream);
            setIsCameraOpen(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
            handleFileChange({ target: { files: [file] } });
            stopCamera();
        }, 'image/jpeg');
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const parsedTasks = await parseTaskImage(file);
            console.log("📸 Parsed Tasks from Image:", parsedTasks);

            if (parsedTasks && parsedTasks.length > 0) {
                if (parsedTasks.length === 1) {
                    // Single task: Populate fields for review
                    const task = parsedTasks[0];
                    setTitle(task.title || '');
                    setDifficulty(task.difficulty || 'medium');
                    setSubject(task.subject || '');
                    setEstimatedTime(task.estimatedTime ? String(task.estimatedTime) : '');
                    if (task.deadline) {
                        setDeadline(task.deadline);
                    }
                } else {
                    // Multiple tasks: Confirm and add all
                    const confirmAdd = window.confirm(`Found ${parsedTasks.length} tasks. Add them all?`);
                    if (confirmAdd) {
                        parsedTasks.forEach(task => {
                            onAdd({
                                title: task.title,
                                difficulty: task.difficulty || 'medium',
                                deadline: task.deadline || null,
                                subject: task.subject || null,
                                estimatedTime: task.estimatedTime || null
                            });
                        });
                        alert(`Added ${parsedTasks.length} tasks!`);
                    }
                }
            } else {
                alert("Could not find any tasks in the image.");
            }
        } catch (error) {
            console.error("Scan failed:", error);
            alert("Failed to scan image.");
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDateSelect = (daysToAdd) => {
        const date = new Date();
        date.setDate(date.getDate() + daysToAdd);
        date.setHours(23, 59, 59, 999); // Set to end of day

        // Format in local time for datetime-local input (YYYY-MM-DDTHH:mm)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}T${hours}:${minutes}`;

        setDeadline(formatted);
        setShowDatePicker(false);
    };

    const getDeadlineLabel = () => {
        if (!deadline) return 'No Deadline';
        const date = new Date(deadline);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return date.toLocaleDateString(undefined, { weekday: 'short' });
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    };

    const subjectColor = getColorForSubject(subject);

    return (
        <div className="w-full max-w-md mx-auto mb-6 sm:mb-8 relative z-20 px-2 sm:px-0">
            {/* Camera Modal */}
            <AnimatePresence>
                {isCameraOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <div className="bg-white dark:bg-void-900 rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full relative">
                            <div className="relative aspect-[3/4] bg-black">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={stopCamera}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                                >
                                    <ChevronLeft className="rotate-45" size={24} />
                                </button>
                            </div>
                            <div className="p-6 flex justify-center bg-white dark:bg-void-900">
                                <button
                                    onClick={capturePhoto}
                                    className="w-16 h-16 rounded-full border-4 border-indigo-500 bg-white dark:bg-void-800 flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    <div className="w-12 h-12 rounded-full bg-indigo-500" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="glass-panel p-2 sm:p-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 relative bg-white dark:bg-void-900 shadow-lg border border-sage-100 dark:border-white/10 rounded-2xl sm:rounded-full pl-3 sm:pl-4">

                {/* Top Row - Date, Input, AI Button */}
                <div className="flex items-center gap-2 w-full">
                    {/* Date Picker Trigger */}
                    <div className="relative shrink-0" ref={datePickerRef}>
                        <button
                            type="button"
                            onClick={() => setShowDatePicker(!showDatePicker)}
                            className={`p-2 rounded-full transition-colors ${deadline ? 'text-sage-600 bg-sage-100 dark:bg-sage-900 dark:text-sage-300' : 'text-sage-400 hover:text-sage-600 hover:bg-sage-50 dark:hover:bg-void-800 dark:hover:text-sage-300'
                                }`}
                        >
                            {deadline ? <Clock size={18} /> : <Calendar size={18} />}
                        </button>

                        {/* Date Picker Popover */}
                        <AnimatePresence>
                            {showDatePicker && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full left-0 sm:left-auto sm:right-0 mt-2 w-[calc(100vw-2rem)] sm:w-72 max-w-sm bg-white dark:bg-void-900 rounded-2xl shadow-xl border border-sage-100 dark:border-white/10 p-4 z-50"
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <h3 className="text-sm font-bold text-sage-700 dark:text-sage-300">Summon By...</h3>
                                        <button
                                            type="button"
                                            onClick={() => setShowDatePicker(false)}
                                            className="text-sage-400 hover:text-sage-600 dark:hover:text-sage-300"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 mb-3">
                                        <button type="button" onClick={() => handleDateSelect(0)} className="px-3 py-2 text-xs font-medium bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 rounded-lg hover:bg-sage-100 dark:hover:bg-void-700 transition-colors">Today</button>
                                        <button type="button" onClick={() => handleDateSelect(1)} className="px-3 py-2 text-xs font-medium bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 rounded-lg hover:bg-sage-100 dark:hover:bg-void-700 transition-colors">Tomorrow</button>
                                        <button type="button" onClick={() => handleDateSelect(3)} className="px-3 py-2 text-xs font-medium bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 rounded-lg hover:bg-sage-100 dark:hover:bg-void-700 transition-colors">3 Days</button>
                                        <button type="button" onClick={() => handleDateSelect(7)} className="px-3 py-2 text-xs font-medium bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 rounded-lg hover:bg-sage-100 dark:hover:bg-void-700 transition-colors">1 Week</button>
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="datetime-local"
                                            value={deadline}
                                            onChange={(e) => setDeadline(e.target.value)}
                                            className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sm text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Summon a new task..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-ink-800 dark:text-bone-100 placeholder-sage-400 text-sm sm:text-base font-medium min-w-0"
                    />

                    {/* AI Magic Button */}
                    <button
                        type="button"
                        onClick={handleAiMagic}
                        disabled={!title.trim() || isAiLoading}
                        className={`p-2 rounded-full transition-all shrink-0 ${isAiLoading ? 'text-sage-400 bg-sage-50 dark:bg-void-800' : 'text-purple-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                            }`}
                        title="Smart Parse Task"
                    >
                        {isAiLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                    </button>

                    {/* Image Upload & Camera */}
                    <div className="flex items-center gap-1 border-l border-sage-200 dark:border-white/10 pl-2 ml-1">
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isScanning}
                            className="p-2 rounded-full text-sage-400 hover:text-sage-600 hover:bg-sage-50 dark:hover:bg-void-800 dark:hover:text-sage-300 transition-colors"
                            title="Upload Image"
                        >
                            <Upload size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={startCamera}
                            disabled={isScanning}
                            className="p-2 rounded-full text-sage-400 hover:text-sage-600 hover:bg-sage-50 dark:hover:bg-void-800 dark:hover:text-sage-300 transition-colors"
                            title="Take Photo"
                        >
                            {isScanning ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                        </button>
                    </div>
                </div>

                {/* Bottom Row - Subject, Time, Difficulty, Submit */}
                <div className="flex items-center gap-2 w-full">
                    {/* Subject Input */}
                    <div className="relative flex-1 sm:flex-initial" ref={subjectRef}>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => {
                                setSubject(e.target.value);
                                setShowSubjectSuggestions(true);
                            }}
                            onFocus={() => setShowSubjectSuggestions(true)}
                            placeholder="Subject"
                            className="text-xs sm:text-sm rounded-full px-2 sm:px-3 py-1 border-none focus:ring-2 focus:ring-sage-300 cursor-text font-medium w-full sm:w-24 transition-all"
                            style={{
                                backgroundColor: subject ? subjectColor.bgColor : '#F9FAFB',
                                color: subject ? subjectColor.color : '#6B7280'
                            }}
                        />

                        {/* Subject Suggestions */}
                        <AnimatePresence>
                            {showSubjectSuggestions && subjectSuggestions.length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute top-full right-0 mt-2 w-full sm:w-40 bg-white dark:bg-void-900 rounded-xl shadow-xl border border-sage-100 dark:border-white/10 overflow-hidden z-50"
                                >
                                    {subjectSuggestions.map((s, i) => {
                                        const color = getColorForSubject(s);
                                        return (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => {
                                                    setSubject(s);
                                                    setShowSubjectSuggestions(false);
                                                }}
                                                className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-sage-50 dark:hover:bg-void-800 transition-colors"
                                                style={{ color: color.color }}
                                            >
                                                {s}
                                            </button>
                                        );
                                    })}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Estimated Time Input */}
                    <input
                        type="number"
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                        placeholder="Est. min"
                        min="1"
                        className="w-16 sm:w-20 text-xs sm:text-sm rounded-full px-2 sm:px-3 py-1 border-none focus:ring-2 focus:ring-sage-300 bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 placeholder-sage-400 dark:placeholder-bone-200/50 font-medium transition-colors"
                    />

                    <select
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                        className="bg-sage-50 dark:bg-void-800 text-sage-700 dark:text-sage-300 text-xs sm:text-sm rounded-full px-2 sm:px-3 py-1 border-none focus:ring-0 cursor-pointer font-medium hover:bg-sage-100 dark:hover:bg-void-700 transition-colors flex-1 sm:flex-initial"
                    >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                    </select>

                    <button
                        type="submit"
                        disabled={!title.trim()}
                        className="bg-sage-500 hover:bg-sage-600 text-white p-2 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg transform hover:scale-105 shrink-0"
                    >
                        <Plus size={20} className="sm:w-6 sm:h-6" />
                    </button>
                </div>
            </form>

            {/* Deadline Label */}
            {deadline && (
                <div className="absolute -bottom-5 sm:-bottom-6 left-4 text-xs font-medium text-sage-500 flex items-center gap-1">
                    <Clock size={10} />
                    {getDeadlineLabel(deadline)}
                </div>
            )}
        </div>
    );
};

export default TaskInput;
