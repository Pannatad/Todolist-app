import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpDown, ChevronDown } from 'lucide-react';
import Plant from './Plant';
import { getColorForSubject } from '../constants/subjects';

const Garden = ({ tasks, onCompleteTask, onDeleteTask, onUpdateTask, onRequestAIHelp, existingSubjects = [], unlockedPlots = 12, coins = 0, onBuyPlot, penguinMode }) => {
    const [sortBy, setSortBy] = useState('deadline');
    const [showSort, setShowSort] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('all');
    const sortRef = useRef(null);

    // Filter tasks by subject
    const filteredTasks = selectedSubject === 'all'
        ? tasks
        : tasks.filter(task => task.subject === selectedSubject);

    const activeTasks = filteredTasks.filter(t => t.status !== 'harvested');
    const completedTasks = filteredTasks.filter(t => t.status === 'harvested');

    // Close sort menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (sortRef.current && !sortRef.current.contains(event.target)) {
                setShowSort(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sorting Logic
    const sortedTasks = [...activeTasks].sort((a, b) => {
        if (sortBy === 'deadline') {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        }
        if (sortBy === 'difficulty') {
            const diffOrder = { hard: 3, medium: 2, easy: 1 };
            return diffOrder[b.difficulty] - diffOrder[a.difficulty];
        }
        return b.id - a.id;
    });

    const totalSlots = Number.isFinite(unlockedPlots) ? unlockedPlots : 12;
    const emptySlots = Math.max(0, totalSlots - sortedTasks.length);

    // Get unique subjects
    const uniqueSubjects = [...new Set(tasks.map(t => t.subject).filter(Boolean))];
    const subjectCounts = uniqueSubjects.map(subject => ({
        name: subject,
        color: getColorForSubject(subject),
        count: tasks.filter(t => t.subject === subject && t.status !== 'harvested').length
    }));
    const allCount = tasks.filter(t => t.status !== 'harvested').length;

    // Today's Tasks Logic
    const todayTasks = tasks.filter(task => {
        if (!task.deadline || task.status === 'harvested') return false;
        const date = new Date(task.deadline);
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

    return (
        <div className="w-full flex flex-col lg:flex-row gap-8 lg:gap-16">
            {/* Main Garden Area */}
            <div className="flex-1">
                <div className="mb-6 sm:mb-12">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 sm:mb-6 px-2 gap-3">
                        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                            <h2 className="text-xl sm:text-2xl font-serif text-sage-600 dark:text-magma-500 drop-shadow-sm dark:drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">Task Playground</h2>

                            <div className="relative z-20" ref={sortRef}>
                                <button
                                    onClick={() => setShowSort(!showSort)}
                                    className={`flex items-center gap-1 text-xs font-bold px-2 sm:px-3 py-1.5 rounded-full border transition-all ${showSort ? 'bg-sage-100 dark:bg-void-800 border-sage-500 dark:border-magma-500/50 text-sage-700 dark:text-magma-400' : 'bg-white/50 dark:bg-void-800/50 border-sage-200 dark:border-white/10 text-sage-600 dark:text-bone-200 hover:bg-white/80 dark:hover:bg-void-800'}`}
                                >
                                    <ArrowUpDown size={12} />
                                    <span className="capitalize">{sortBy === 'deadline' ? 'Due Date' : sortBy}</span>
                                    <ChevronDown size={12} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
                                </button>

                                <AnimatePresence>
                                    {showSort && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                            className="absolute top-full left-0 mt-2 w-32 bg-white dark:bg-void-900 border border-sage-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden z-30"
                                        >
                                            <button onClick={() => { setSortBy('deadline'); setShowSort(false); }} className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-sage-50 dark:hover:bg-white/5 ${sortBy === 'deadline' ? 'text-sage-600 dark:text-magma-400' : 'text-sage-500 dark:text-bone-200'}`}>
                                                Due Date
                                            </button>
                                            <button onClick={() => { setSortBy('difficulty'); setShowSort(false); }} className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-sage-50 dark:hover:bg-white/5 ${sortBy === 'difficulty' ? 'text-sage-600 dark:text-magma-400' : 'text-sage-500 dark:text-bone-200'}`}>
                                                Difficulty
                                            </button>
                                            <button onClick={() => { setSortBy('newest'); setShowSort(false); }} className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-sage-50 dark:hover:bg-white/5 ${sortBy === 'newest' ? 'text-sage-600 dark:text-magma-400' : 'text-sage-500 dark:text-bone-200'}`}>
                                                Newest
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <button
                            onClick={onBuyPlot}
                            disabled={coins < 50}
                            className="text-xs font-bold px-2 sm:px-3 py-1 rounded-full bg-white/50 dark:bg-void-800 border border-sage-300 dark:border-magma-500/30 text-sage-600 dark:text-magma-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/80 dark:hover:bg-void-700 hover:text-sage-800 dark:hover:text-magma-300 transition-colors whitespace-nowrap"
                        >
                            Expand Lair (50 🪙)
                        </button>
                    </div>

                    {/* Subject Filter Pills */}
                    {uniqueSubjects.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4 px-2">
                            <button
                                onClick={() => setSelectedSubject('all')}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedSubject === 'all'
                                    ? 'bg-sage-600 text-white shadow-md'
                                    : 'bg-sage-100 text-sage-600 hover:bg-sage-200'
                                    }`}
                            >
                                All ({allCount})
                            </button>
                            {subjectCounts.map(subject => subject.count > 0 && (
                                <button
                                    key={subject.name}
                                    onClick={() => setSelectedSubject(subject.name)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${selectedSubject === subject.name
                                        ? 'shadow-md'
                                        : 'hover:opacity-80'
                                        }`}
                                    style={{
                                        backgroundColor: selectedSubject === subject.name ? subject.color.color : subject.color.bgColor,
                                        color: selectedSubject === subject.name ? 'white' : subject.color.color
                                    }}
                                >
                                    {subject.name} ({subject.count})
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="relative flex justify-center overflow-visible py-4 sm:py-8">
                        <motion.div
                            layout
                            className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-10"
                        >
                            {sortedTasks.map(task => (
                                <div key={task.id} className="relative group flex justify-center">
                                    <Plant task={task} onComplete={onCompleteTask} onDelete={onDeleteTask} onUpdate={onUpdateTask} onRequestAIHelp={onRequestAIHelp} existingSubjects={existingSubjects} penguinMode={penguinMode} />
                                </div>
                            ))}

                            {[...Array(emptySlots)].map((_, i) => (
                                <div
                                    key={`empty-${i}`}
                                    className="w-full aspect-square rounded-2xl bg-white/50 dark:bg-void-900/50 border-2 border-dashed border-sage-300 dark:border-white/10 flex items-center justify-center transition-colors hover:bg-white/80 dark:hover:bg-void-800 shadow-sm"
                                >
                                    <div className="text-sage-400 text-xs sm:text-sm font-medium">Empty</div>
                                </div>
                            ))}

                            <div
                                onClick={onBuyPlot}
                                className={`w-full aspect-square rounded-2xl bg-white/50 dark:bg-void-900/50 border-2 border-dashed border-sage-300 dark:border-white/10 flex flex-col items-center justify-center cursor-pointer hover:bg-white/80 dark:hover:bg-void-800 transition-colors group shadow-sm ${coins < 50 ? 'opacity-50' : ''}`}
                            >
                                <span className="text-2xl sm:text-3xl mb-1 sm:mb-2 group-hover:scale-110 transition-transform grayscale opacity-50">🔒</span>
                                <span className="text-xs sm:text-sm text-sage-400">50 🪙</span>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {completedTasks.length > 0 && (
                    <div className="border-t border-sage-200 dark:border-white/10 pt-6 sm:pt-8">
                        <h2 className="text-xl sm:text-2xl font-serif text-sage-400 dark:text-bone-200/50 mb-4 sm:mb-6 pl-2">Banished Souls</h2>
                        <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 gap-3 sm:gap-4 opacity-60 hover:opacity-100 transition-opacity">
                            {completedTasks.map(task => (
                                <Plant key={`harvested-${task.id}`} task={task} onComplete={() => { }} onDelete={onDeleteTask} onUpdate={onUpdateTask} onRequestAIHelp={onRequestAIHelp} existingSubjects={existingSubjects} penguinMode={penguinMode} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Daily Schedule Sidebar */}
            <div className="w-full lg:w-80 shrink-0 order-first lg:order-last">
                <div className="lg:sticky lg:top-8">
                    <h3 className="text-lg sm:text-xl font-serif font-bold text-sage-600 dark:text-magma-500 mb-3 sm:mb-4 flex items-center gap-2">
                        <span className="text-xl sm:text-2xl">📅</span> Today's Schedule
                    </h3>

                    <div className="space-y-3">
                        {todayTasks.length === 0 ? (
                            <div className="p-4 sm:p-6 text-center border-2 border-dashed border-sage-200 dark:border-white/10 rounded-xl text-sage-400 dark:text-bone-200/50 italic text-sm sm:text-base">
                                No tasks scheduled for today.
                                <br />
                                <span className="text-sm">Enjoy your freedom!</span>
                            </div>
                        ) : (
                            todayTasks.map(task => {
                                const subjectColor = getColorForSubject(task.subject);
                                const time = new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                                // Format estimated time
                                const formatEstimatedTime = (minutes) => {
                                    if (!minutes) return null;
                                    const hours = Math.floor(minutes / 60);
                                    const mins = minutes % 60;
                                    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
                                    if (hours > 0) return `${hours}h`;
                                    return `${mins}m`;
                                };

                                return (
                                    <div
                                        key={task.id}
                                        className="p-3 rounded-xl border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
                                        style={{
                                            backgroundColor: subjectColor.bgColor,
                                            borderLeftColor: subjectColor.color
                                        }}
                                        onClick={() => onUpdateTask(task.id, { status: 'growing' })}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span
                                                className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/50 dark:bg-black/20"
                                                style={{ color: subjectColor.color }}
                                            >
                                                {task.subject}
                                            </span>
                                            <span className="text-xs font-medium opacity-70" style={{ color: subjectColor.color }}>
                                                {time}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-sm mb-1 text-ink-800 dark:text-ink-800 line-clamp-2">
                                            {task.title}
                                        </h4>
                                        <div className="flex items-center gap-2 text-xs opacity-80 text-ink-500">
                                            <span className="capitalize">{task.difficulty}</span>
                                            {task.status === 'growing' && <span>🌱 In Progress</span>}
                                            {task.estimatedTime && (
                                                <span className="ml-auto font-medium" style={{ color: subjectColor.color }}>
                                                    ⏱ {formatEstimatedTime(task.estimatedTime)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Garden;
