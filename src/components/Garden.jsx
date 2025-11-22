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

    return (
        <div className="w-full">
            <div className="mb-12">
                <div className="flex justify-between items-end mb-6 px-2">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-serif text-magma-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">Task Playground</h2>

                        <div className="relative z-20" ref={sortRef}>
                            <button
                                onClick={() => setShowSort(!showSort)}
                                className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${showSort ? 'bg-void-800 border-magma-500/50 text-magma-400' : 'bg-void-800/50 border-white/10 text-bone-200 hover:bg-void-800'}`}
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
                                        className="absolute top-full left-0 mt-2 w-32 bg-void-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-30"
                                    >
                                        <button onClick={() => { setSortBy('deadline'); setShowSort(false); }} className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/5 ${sortBy === 'deadline' ? 'text-magma-400' : 'text-bone-200'}`}>
                                            Due Date
                                        </button>
                                        <button onClick={() => { setSortBy('difficulty'); setShowSort(false); }} className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/5 ${sortBy === 'difficulty' ? 'text-magma-400' : 'text-bone-200'}`}>
                                            Difficulty
                                        </button>
                                        <button onClick={() => { setSortBy('newest'); setShowSort(false); }} className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-white/5 ${sortBy === 'newest' ? 'text-magma-400' : 'text-bone-200'}`}>
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
                        className="text-xs font-bold px-3 py-1 rounded-full bg-void-800 border border-magma-500/30 text-magma-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-void-700 hover:text-magma-300 transition-colors"
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

                <div className="relative flex justify-center overflow-visible py-8">
                    <motion.div
                        layout
                        className="grid grid-cols-3 sm:grid-cols-4 gap-8"
                    >
                        {sortedTasks.map(task => (
                            <div key={task.id} className="relative group">
                                <Plant task={task} onComplete={onCompleteTask} onDelete={onDeleteTask} onUpdate={onUpdateTask} onRequestAIHelp={onRequestAIHelp} existingSubjects={existingSubjects} penguinMode={penguinMode} />
                            </div>
                        ))}

                        {[...Array(emptySlots)].map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="w-32 h-32 rounded-2xl bg-white/50 border-2 border-dashed border-sage-300 flex items-center justify-center transition-colors hover:bg-white/80 shadow-sm"
                            >
                                <div className="text-sage-400 text-sm font-medium">Empty</div>
                            </div>
                        ))}

                        <div
                            onClick={onBuyPlot}
                            className={`w-32 h-32 rounded-2xl bg-white/50 border-2 border-dashed border-sage-300 flex flex-col items-center justify-center cursor-pointer hover:bg-white/80 transition-colors group shadow-sm ${coins < 50 ? 'opacity-50' : ''}`}
                        >
                            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform grayscale opacity-50">🔒</span>
                            <span className="text-sm text-sage-400">50 🪙</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            {completedTasks.length > 0 && (
                <div className="border-t border-white/10 pt-8">
                    <h2 className="text-2xl font-serif text-bone-200/50 mb-6 pl-2">Banished Souls</h2>
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4 opacity-60 hover:opacity-100 transition-opacity">
                        {completedTasks.map(task => (
                            <Plant key={`harvested-${task.id}`} task={task} onComplete={() => { }} onDelete={onDeleteTask} onUpdate={onUpdateTask} onRequestAIHelp={onRequestAIHelp} existingSubjects={existingSubjects} penguinMode={penguinMode} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Garden;
