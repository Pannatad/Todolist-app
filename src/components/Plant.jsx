import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Ghost, Skull, Flame, X, Edit2, Sparkles, Play, Loader2 } from 'lucide-react';
import Penguin from './Penguin';
import { getColorForSubject } from '../constants/subjects';
import { parseTaskInput } from '../services/gemini';

const Plant = ({ task, onComplete, onDelete, onUpdate, onRequestAIHelp, existingSubjects = [], displayMode, onStartFocus }) => {
    const { status, difficulty, title, deadline, subject, description } = task;
    const [timeLeft, setTimeLeft] = React.useState('');
    const [showEditModal, setShowEditModal] = React.useState(false);
    const [isAnalyzing, setIsAnalyzing] = React.useState(false);
    const [editForm, setEditForm] = React.useState({
        title: title,
        description: description || '',
        difficulty: difficulty,
        subject: subject || '',
        deadline: deadline || '',
        estimatedTime: task.estimatedTime || task.estimated_time || 0
    });
    const subjectColor = getColorForSubject(subject);

    // Helper to calculate time left
    const calculateTimeLeft = () => {
        if (!deadline) return '';
        const now = new Date();
        const end = new Date(deadline);
        const diff = end - now;

        if (diff <= 0) return 'Expired';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        let timeString = '';
        if (days > 0) timeString += `${days}d `;
        if (hours > 0 || days > 0) timeString += `${hours}h `;
        timeString += `${minutes}m`;

        return timeString;
    };

    // AI Analysis Handler
    const handleAnalyzeTask = async () => {
        setIsAnalyzing(true);
        try {
            // Analyze the task title to get suggestions
            const analysis = await parseTaskInput(editForm.title);

            if (analysis) {
                setEditForm(prev => ({
                    ...prev,
                    title: analysis.title || prev.title,
                    difficulty: analysis.difficulty || prev.difficulty,
                    subject: analysis.subject || prev.subject,
                    deadline: analysis.deadline || prev.deadline,
                    estimatedTime: analysis.estimatedTime || prev.estimatedTime
                    // Description is preserved
                }));
            }
        } catch (error) {
            console.error('Error analyzing task:', error);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Helper to get urgency level based on time left
    const getUrgencyLevel = () => {
        if (!deadline) return 1;
        const now = new Date();
        const end = new Date(deadline);
        const diff = end - now;
        const hoursLeft = diff / (1000 * 60 * 60);
        const daysLeft = hoursLeft / 24;

        if (daysLeft > 7) return 1; // > 1 week
        if (daysLeft > 3) return 2; // > 3 days
        if (daysLeft > 1) return 3; // > 1 day
        if (hoursLeft > 6) return 4; // > 6 hours
        return 5; // < 6 hours
    };

    React.useEffect(() => {
        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, [deadline]);

    // Visual mapping based on status and difficulty
    const getTaskVisual = () => {
        const level = getUrgencyLevel();

        // Base classes for all task visuals
        const baseClasses = "drop-shadow-md transition-all duration-500";

        // Color mapping based on difficulty
        let colorClasses = "";
        switch (difficulty) {
            case 'hard':
                colorClasses = "text-red-500 fill-red-100";
                break;
            case 'medium':
                colorClasses = "text-yellow-500 fill-yellow-100";
                break;
            case 'easy':
            default:
                colorClasses = "text-emerald-500 fill-emerald-100";
                break;
        }

        // Size and Animation based on Level (Time Left)
        let sizeClasses = "w-10 h-10"; // Default
        let animationProps = {};

        if (status === 'growing' || status === 'harvested') {
            switch (level) {
                case 5: // Critical (< 6 hours)
                    sizeClasses = "w-20 h-20";
                    animationProps = {
                        scale: [1.2, 1.3, 1.2],
                        rotate: [-3, 3, -3],
                        transition: { duration: 0.2, repeat: Infinity, repeatType: "reverse" }
                    };
                    break;
                case 4: // Urgent (> 6 hours)
                    sizeClasses = "w-16 h-16";
                    animationProps = {
                        scale: [1.1, 1.15, 1.1],
                        transition: { duration: 1, repeat: Infinity, repeatType: "reverse" }
                    };
                    break;
                case 3: // Normal (> 1 day)
                    sizeClasses = "w-14 h-14";
                    animationProps = {
                        y: [0, -3, 0],
                        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    };
                    break;
                case 2: // Chill (> 3 days)
                    sizeClasses = "w-12 h-12";
                    animationProps = {
                        y: [0, -2, 0],
                        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                    };
                    break;
                case 1: // Safe (> 1 week)
                default:
                    sizeClasses = "w-10 h-10";
                    animationProps = {
                        y: [0, -1, 0],
                        transition: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                    };
                    break;
            }
        } else if (status === 'seed') {
            // Seed state
            return <Ghost className={`w-8 h-8 ${colorClasses} ${baseClasses} opacity-60`} />;
        }

        // Face Logic (Eyes + Mouth)
        const getFace = () => {
            const eyeColor = level >= 4 ? "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" : "bg-gray-800 dark:bg-gray-900";
            const mouthColor = level >= 4 ? "bg-red-900/50" : "border-gray-800 dark:border-gray-900";

            // Blinking animation
            const blinkAnimation = {
                scaleY: [1, 0.1, 1],
                transition: { duration: 3, repeat: Infinity, repeatDelay: Math.random() * 2 + 1 }
            };

            // Scarier face for high levels
            if (level >= 4) {
                return (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        {/* Angry Eyes - Closer together */}
                        <motion.div
                            className={`absolute top-[30%] left-[38%] w-[12%] h-[15%] ${eyeColor} rounded-full`}
                            style={{ borderRadius: '40% 60% 40% 60% / 60% 40% 60% 40%', rotate: '15deg' }}
                        />
                        <motion.div
                            className={`absolute top-[30%] right-[38%] w-[12%] h-[15%] ${eyeColor} rounded-full`}
                            style={{ borderRadius: '60% 40% 60% 40% / 40% 60% 40% 60%', rotate: '-15deg' }}
                        />

                        {/* Open/Scary Mouth */}
                        <motion.div
                            initial={{ height: "5%" }}
                            animate={{ height: ["5%", "15%", "5%"] }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                            className={`absolute top-[55%] left-1/2 -translate-x-1/2 w-[25%] bg-black rounded-full opacity-80`}
                        />
                    </div>
                );
            }

            // Cute/Normal Face
            return (
                <div className="absolute inset-0 z-20 pointer-events-none">
                    {/* Cute Eyes - Closer together */}
                    <motion.div
                        animate={blinkAnimation}
                        className={`absolute top-[35%] left-[38%] w-[10%] h-[10%] ${eyeColor} rounded-full`}
                    />
                    <motion.div
                        animate={blinkAnimation}
                        className={`absolute top-[35%] right-[38%] w-[10%] h-[10%] ${eyeColor} rounded-full`}
                    />

                    {/* Small Smile */}
                    <div
                        className={`absolute top-[45%] left-1/2 -translate-x-1/2 w-[20%] h-[10%] border-b-2 ${mouthColor} rounded-full opacity-60`}
                    />
                </div>
            );
        };

        return (
            <motion.div
                animate={status === 'growing' ? animationProps : {}}
                className={`relative flex items-center justify-center ${sizeClasses}`}
            >
                <Ghost className={`w-full h-full ${colorClasses} ${baseClasses}`} />
                {status !== 'seed' && getFace()}
            </motion.div>
        );
    };

    // Minimal Mode Rendering
    const getMinimalContent = () => {
        const difficultyColors = {
            easy: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700',
            medium: 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700',
            hard: 'bg-rose-50 dark:bg-rose-900/20 border-rose-300 dark:border-rose-700'
        };

        const difficultyTextColors = {
            easy: 'text-emerald-700 dark:text-emerald-300',
            medium: 'text-amber-700 dark:text-amber-300',
            hard: 'text-rose-700 dark:text-rose-300'
        };

        return (
            <motion.div
                layout
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`relative p-4 rounded-2xl border-2 shadow-sm hover:shadow-md transition-all w-full aspect-square flex flex-col ${difficultyColors[difficulty]} ${status === 'harvested' ? 'opacity-50' : ''} group`}
                onClick={() => onComplete(task.id)}
            >
                {/* Delete Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                    }}
                    className="absolute top-2 right-2 p-1 bg-white/80 dark:bg-black/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 rounded-full opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-all transform hover:scale-110 z-50"
                    title="Delete Task"
                >
                    <X size={14} strokeWidth={2.5} />
                </button>

                {/* Edit Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setEditForm({
                            title: task.title || '',
                            description: task.description || '',
                            difficulty: task.difficulty,
                            subject: task.subject || '',
                            deadline: task.deadline || '',
                            estimatedTime: task.estimatedTime || task.estimated_time || 0
                        });
                        setShowEditModal(true);
                    }}
                    className="absolute top-2 right-10 p-1 bg-white/80 dark:bg-black/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-500 rounded-full opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-all transform hover:scale-110 z-50"
                    title="Edit Task"
                >
                    <Edit2 size={14} strokeWidth={2.5} />
                </button>

                {/* Focus Button */}
                {onStartFocus && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStartFocus(task);
                        }}
                        className="absolute top-2 right-20 p-1 bg-white/80 dark:bg-black/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600 rounded-full opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-all transform hover:scale-110 z-50"
                        title="Start Focus Session"
                    >
                        <Play size={14} strokeWidth={2.5} fill="currentColor" />
                    </button>
                )}

                {/* Task Title */}
                <h3 className={`font-bold text-sm mb-2 line-clamp-2 pr-24 ${difficultyTextColors[difficulty]} ${status === 'harvested' ? 'line-through' : ''}`}>
                    {title || "Untitled Task"}
                </h3>

                {/* Subject Badge */}
                {subject && (
                    <div className="flex items-center gap-2 mb-2">
                        <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{
                                backgroundColor: subjectColor.bgColor,
                                color: subjectColor.color
                            }}
                        >
                            {subject}
                        </span>
                    </div>
                )}

                {/* Due Date & Estimate Time */}
                <div className="flex flex-wrap gap-2 text-xs mt-auto">
                    {deadline && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-white/50 dark:bg-black/20 border ${difficultyTextColors[difficulty]}`}>
                            <span className="font-medium">📅</span>
                            <span className="font-medium">{timeLeft || calculateTimeLeft()}</span>
                        </div>
                    )}
                    {task.estimatedTime && (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-full bg-white/50 dark:bg-black/20 border ${difficultyTextColors[difficulty]}`}>
                            <span className="font-medium">⏱</span>
                            <span className="font-medium">
                                {Math.floor(task.estimatedTime / 60) > 0 && `${Math.floor(task.estimatedTime / 60)}h `}
                                {task.estimatedTime % 60}m
                            </span>
                        </div>
                    )}
                </div>
            </motion.div>
        );
    };

    // Demon/Penguin Mode Rendering
    const getStandardContent = () => (
        <motion.div
            layout
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex flex-col items-center justify-end relative w-32 min-h-40 h-auto cursor-pointer group pb-2"
            onClick={() => onComplete(task.id)}
        >
            {/* Plant Visual Container */}
            <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Base/Soil */}
                <div className={`absolute bottom-0 w-24 h-24 rounded-full ${status === 'harvested' ? 'bg-purple-900/30' : 'bg-gray-200 dark:bg-gray-800'} shadow-inner transition-colors duration-300`}>
                </div>

                {/* Icon (Demon or Penguin) */}
                <div className="relative z-10 mb-2 flex items-center justify-center h-full w-full">
                    {displayMode === 'penguin' ? (
                        <Penguin stage={status} level={getUrgencyLevel()} difficulty={difficulty} />
                    ) : (
                        getTaskVisual()
                    )}

                    {/* Hover effect for interaction */}
                    {status === 'seed' && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-50">
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-300">Summon!</span>
                        </div>
                    )}
                    {status === 'growing' && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-50">
                            <span className="text-xs font-bold text-red-600 dark:text-red-300">Banish!</span>
                        </div>
                    )}
                </div>

                {/* Delete Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                    }}
                    className="absolute top-2 right-2 p-1 bg-white/80 dark:bg-black/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-500 rounded-full opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-all transform hover:scale-110 z-50"
                    title="Delete Task"
                >
                    <X size={14} strokeWidth={2.5} />
                </button>

                {/* Edit Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setEditForm({
                            title: task.title || '',
                            description: task.description || '',
                            difficulty: task.difficulty,
                            subject: task.subject || '',
                            deadline: task.deadline || '',
                            estimatedTime: task.estimatedTime || task.estimated_time || 0
                        });
                        setShowEditModal(true);
                    }}
                    className="absolute top-2 right-10 p-1 bg-white/80 dark:bg-black/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-500 rounded-full opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-all transform hover:scale-110 z-50"
                    title="Edit Task"
                >
                    <Edit2 size={14} strokeWidth={2.5} />
                </button>

                {/* Focus Button */}
                {onStartFocus && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onStartFocus(task);
                        }}
                        className="absolute top-2 right-20 p-1 bg-white/80 dark:bg-black/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600 rounded-full opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 transition-all transform hover:scale-110 z-50"
                        title="Start Focus Session"
                    >
                        <Play size={14} strokeWidth={2.5} fill="currentColor" />
                    </button>
                )}

                {/* AI Help Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRequestAIHelp(task);
                    }}
                    className="absolute top-0 right-24 p-1.5 bg-purple-500 hover:bg-purple-600 text-white rounded-full shadow-lg hover:scale-110 transition-all z-50 opacity-100 md:opacity-100"
                    title="Get AI Help"
                >
                    <Sparkles size={12} strokeWidth={3} />
                </button>
            </div>

            {/* Task Label */}
            <div className="mt-2 max-w-full px-1 flex flex-col items-center w-full gap-1">
                <p className="text-base font-bold text-center text-sage-700 dark:text-sage-200 break-words w-full leading-tight drop-shadow-sm">
                    {title || "Untitled Task"}
                </p>
                {/* Subject Badge */}
                {subject && (
                    <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                            backgroundColor: subjectColor.bgColor,
                            color: subjectColor.color
                        }}
                    >
                        {subject}
                    </span>
                )}
                {status !== 'harvested' && (
                    <>
                        <p className="text-xs font-bold text-center text-sage-500 dark:text-sage-400 w-full leading-tight">
                            {timeLeft || "No Due Date"}
                        </p>
                        {task.estimatedTime && (
                            <p className="text-xs font-medium text-center w-full leading-tight" style={{ color: subjectColor.color }}>
                                ⏱ {(() => {
                                    const minutes = task.estimatedTime;
                                    const hours = Math.floor(minutes / 60);
                                    const mins = minutes % 60;
                                    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
                                    if (hours > 0) return `${hours}h`;
                                    return `${mins}m`;
                                })()}
                            </p>
                        )}
                    </>
                )}
            </div>
        </motion.div>
    );

    return (
        <>
            {displayMode === 'minimal' ? getMinimalContent() : getStandardContent()}

            {/* Shared Edit Modal */}
            <AnimatePresence>
                {showEditModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowEditModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-void-900 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl border border-white/10"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-sage-800 dark:text-bone-200">Edit Task</h3>
                                <button
                                    onClick={handleAnalyzeTask}
                                    disabled={isAnalyzing}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isAnalyzing ? 'bg-sage-100 text-sage-400' : 'bg-purple-100 text-purple-600 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300'}`}
                                >
                                    {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                                    {isAnalyzing ? 'Analyzing...' : 'Auto-Analyze'}
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* Task Title (Editable) */}
                                <div>
                                    <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">Task</label>
                                    <input
                                        type="text"
                                        value={editForm.title}
                                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                        className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400 font-medium"
                                        placeholder="Task Name"
                                    />
                                </div>

                                {/* Description (Editable) */}
                                <div>
                                    <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">Description</label>
                                    <textarea
                                        value={editForm.description}
                                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                        className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400 font-medium resize-none"
                                        placeholder="Add a description..."
                                        rows={3}
                                    />
                                </div>

                                {/* Difficulty */}
                                <div>
                                    <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">Difficulty</label>
                                    <select
                                        value={editForm.difficulty}
                                        onChange={(e) => setEditForm({ ...editForm, difficulty: e.target.value })}
                                        className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400"
                                    >
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">Subject</label>
                                    <input
                                        type="text"
                                        value={editForm.subject}
                                        onChange={(e) => setEditForm({ ...editForm, subject: e.target.value })}
                                        placeholder="Enter subject"
                                        className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400"
                                    />
                                </div>

                                {/* Deadline */}
                                <div>
                                    <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">Deadline</label>
                                    <input
                                        type="datetime-local"
                                        value={editForm.deadline}
                                        onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                                        className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400"
                                    />
                                </div>

                                {/* Estimated Time */}
                                <div>
                                    <label className="block text-sm font-bold text-sage-600 dark:text-sage-400 mb-1">Estimated Time (minutes)</label>
                                    <input
                                        type="number"
                                        value={editForm.estimatedTime}
                                        onChange={(e) => setEditForm({ ...editForm, estimatedTime: parseInt(e.target.value) || 0 })}
                                        placeholder="e.g. 30"
                                        className="w-full px-3 py-2 bg-sage-50 dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg text-sage-800 dark:text-bone-200 focus:outline-none focus:ring-2 focus:ring-sage-400"
                                    />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-4 py-2 bg-sage-200 dark:bg-void-800 text-sage-700 dark:text-bone-300 rounded-lg font-bold hover:bg-sage-300 dark:hover:bg-void-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (!editForm.title.trim()) {
                                            alert("Task name cannot be empty!");
                                            return;
                                        }
                                        onUpdate(task.id, {
                                            title: editForm.title,
                                            description: editForm.description || null,
                                            difficulty: editForm.difficulty,
                                            subject: editForm.subject || null,
                                            deadline: editForm.deadline || null,
                                            estimatedTime: editForm.estimatedTime || 0
                                        });
                                        setShowEditModal(false);
                                    }}
                                    className={`flex-1 px-4 py-2 rounded-lg font-bold transition-colors ${!editForm.title.trim() ? 'bg-gray-300 cursor-not-allowed text-gray-500' : 'bg-sage-500 hover:bg-sage-600 text-white'}`}
                                    disabled={!editForm.title.trim()}
                                >
                                    Save Changes
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Plant;
