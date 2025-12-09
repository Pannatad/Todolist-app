import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Moon, Star, Cloud, Sparkles, ChevronRight, ChevronLeft,
    CheckCircle2, Circle, Trophy, BookOpen, AlertCircle,
    Target, Plus, X, ListTodo, Check
} from 'lucide-react';
import { useTask } from '../context/TaskContext';

const MOOD_OPTIONS = [
    { emoji: '😔', label: 'Rough', value: 1, color: 'from-slate-700 to-slate-500' },
    { emoji: '😐', label: 'Okay', value: 2, color: 'from-blue-700 to-blue-500' },
    { emoji: '🙂', label: 'Good', value: 3, color: 'from-indigo-600 to-indigo-400' },
    { emoji: '😊', label: 'Great', value: 4, color: 'from-purple-600 to-purple-400' },
    { emoji: '🌟', label: 'Amazing', value: 5, color: 'from-amber-500 to-yellow-400' },
];

const DEFAULT_HABITS = [
    { id: 'water', label: 'Drank Water', icon: '💧' },
    { id: 'meditate', label: 'Meditated', icon: '🧘' },
    { id: 'exercise', label: 'Exercised', icon: '🏃' },
    { id: 'read', label: 'Read 30m', icon: '📚' },
    { id: 'journal', label: 'Journaled', icon: '📝' },
    { id: 'screen-free', label: 'No Screens', icon: '📵' },
];

const EndTheDayModal = ({ isOpen, onClose, onSaveRecap }) => {
    const [currentPhase, setCurrentPhase] = useState(1);
    const [mood, setMood] = useState(null);
    const [recapData, setRecapData] = useState({
        achievements: '',
        memorableMoments: '',
        lessonsLearned: ''
    });
    const [completedHabits, setCompletedHabits] = useState([]);
    const [tomorrowGoals, setTomorrowGoals] = useState([
        { title: '', priority: 'High' },
        { title: '', priority: 'Medium' },
        { title: '', priority: 'Low' }
    ]);
    const [quickTasks, setQuickTasks] = useState([]);
    const [newTaskInput, setNewTaskInput] = useState('');

    const { addTask } = useTask();

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setCurrentPhase(1);
            setMood(null);
            setRecapData({ achievements: '', memorableMoments: '', lessonsLearned: '' });
            setCompletedHabits([]);
            setTomorrowGoals([
                { title: '', priority: 'High' },
                { title: '', priority: 'Medium' },
                { title: '', priority: 'Low' }
            ]);
            setQuickTasks([]);
        }
    }, [isOpen]);

    const handleNext = () => {
        if (currentPhase < 4) {
            setCurrentPhase(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentPhase > 1) {
            setCurrentPhase(prev => prev - 1);
        }
    };

    const toggleHabit = (habitId) => {
        setCompletedHabits(prev =>
            prev.includes(habitId)
                ? prev.filter(id => id !== habitId)
                : [...prev, habitId]
        );
    };

    const updateGoal = (index, field, value) => {
        const newGoals = [...tomorrowGoals];
        newGoals[index] = { ...newGoals[index], [field]: value };
        setTomorrowGoals(newGoals);
    };

    const addQuickTask = (e) => {
        e.preventDefault();
        if (!newTaskInput.trim()) return;
        setQuickTasks(prev => [...prev, { title: newTaskInput, id: Date.now() }]);
        setNewTaskInput('');
    };

    const removeQuickTask = (id) => {
        setQuickTasks(prev => prev.filter(t => t.id !== id));
    };

    const handleFinish = async () => {
        // Save goals as tasks for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Add goals
        for (const goal of tomorrowGoals) {
            if (goal.title.trim()) {
                await addTask({
                    title: goal.title,
                    description: `Priority: ${goal.priority}`,
                    difficulty: goal.priority === 'High' ? 'hard' : goal.priority === 'Medium' ? 'medium' : 'easy',
                    deadline: tomorrowStr,
                    subject: 'General'
                });
            }
        }

        // Add quick tasks
        for (const task of quickTasks) {
            await addTask({
                title: task.title,
                difficulty: 'medium',
                deadline: tomorrowStr,
                subject: 'General'
            });
        }

        // Save recap data (could extend this to save to specific table)
        console.log('Night Recap:', {
            mood,
            ...recapData,
            completedHabits,
            tomorrowGoals
        });

        if (onSaveRecap) {
            onSaveRecap({
                mood,
                ...recapData,
                completedHabits,
                goals: tomorrowGoals.filter(g => g.title)
            });
        }

        onClose();
    };

    if (!isOpen) return null;

    // --- PHASE COMPONENTS ---

    const Phase1 = () => (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-col items-center justify-center h-full px-8 py-8 overflow-y-auto"
        >
            <motion.div
                className="mb-6 relative"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                <Moon className="w-20 h-20 text-blue-200 drop-shadow-[0_0_15px_rgba(191,219,254,0.5)]" />
            </motion.div>

            <h2 className="text-3xl font-serif font-bold text-blue-100 mb-2 text-center">
                Evening Reflection 🌙
            </h2>
            <p className="text-blue-200/60 text-lg mb-8">How was your day properly?</p>

            {/* Mood Selector */}
            <div className="flex gap-3 mb-8">
                {MOOD_OPTIONS.map((option) => (
                    <motion.button
                        key={option.value}
                        whileHover={{ scale: 1.1, y: -5 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setMood(option.value)}
                        className={`flex flex-col items-center p-3 rounded-2xl transition-all w-20 ${mood === option.value
                            ? `bg-gradient-to-br ${option.color} shadow-lg shadow-white/10 ring-2 ring-white/30`
                            : 'bg-white/5 hover:bg-white/10'
                            }`}
                    >
                        <span className="text-3xl mb-1">{option.emoji}</span>
                        <span className="text-xs font-medium text-white/90">{option.label}</span>
                    </motion.button>
                ))}
            </div>

            {/* Reflection Inputs */}
            <div className="w-full max-w-2xl space-y-4 relative z-20">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <label className="flex items-center gap-2 text-amber-200/90 font-medium mb-2">
                        <Trophy className="w-4 h-4" /> Achievements
                    </label>
                    <textarea
                        value={recapData.achievements}
                        onChange={(e) => setRecapData(prev => ({ ...prev, achievements: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="What did you accomplish today?"
                        className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none h-20"
                    />
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <label className="flex items-center gap-2 text-purple-200/90 font-medium mb-2">
                        <Sparkles className="w-4 h-4" /> Memorable Moments
                    </label>
                    <textarea
                        value={recapData.memorableMoments}
                        onChange={(e) => setRecapData(prev => ({ ...prev, memorableMoments: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="What made you smile today?"
                        className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none h-20"
                    />
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                    <label className="flex items-center gap-2 text-rose-200/90 font-medium mb-2">
                        <BookOpen className="w-4 h-4" /> Lessons & Adjustments
                    </label>
                    <textarea
                        value={recapData.lessonsLearned}
                        onChange={(e) => setRecapData(prev => ({ ...prev, lessonsLearned: e.target.value }))}
                        onClick={(e) => e.stopPropagation()}
                        placeholder="What would you do differently?"
                        className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50 resize-none h-20"
                    />
                </div>
            </div>
        </motion.div>
    );

    const Phase2 = () => {
        const progress = Math.round((completedHabits.length / DEFAULT_HABITS.length) * 100);

        return (
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="flex flex-col items-center h-full px-8 py-8"
            >
                <h2 className="text-3xl font-serif font-bold text-white mb-2 text-center">Today's Habits 📋</h2>
                <p className="text-white/60 mb-8">What did you stick to today?</p>

                {/* Circular Progress */}
                <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="64" cy="64" r="58"
                            stroke="currentColor" strokeWidth="8"
                            fill="transparent"
                            className="text-white/10"
                        />
                        <circle
                            cx="64" cy="64" r="58"
                            stroke="currentColor" strokeWidth="8"
                            fill="transparent"
                            strokeDasharray={364}
                            strokeDashoffset={364 - (364 * progress) / 100}
                            strokeLinecap="round"
                            className="text-green-400 transition-all duration-1000 ease-out"
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-bold text-white">{progress}%</span>
                    </div>
                </div>

                {/* Habit Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                    {DEFAULT_HABITS.map((habit) => {
                        const isCompleted = completedHabits.includes(habit.id);
                        return (
                            <motion.button
                                key={habit.id}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => toggleHabit(habit.id)}
                                className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${isCompleted
                                    ? 'bg-green-500/20 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                                    }`}
                            >
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isCompleted ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50'
                                    }`}>
                                    {isCompleted ? <Check size={20} /> : habit.icon}
                                </div>
                                <span className={`font-medium ${isCompleted ? 'text-green-200' : 'text-white/60'}`}>
                                    {habit.label}
                                </span>
                            </motion.button>
                        );
                    })}
                </div>
            </motion.div>
        );
    };

    const Phase3 = () => (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-col items-center h-full px-8 py-8 overflow-y-auto"
        >
            <h2 className="text-3xl font-serif font-bold text-white mb-2 text-center">Plan Tomorrow 🌅</h2>
            <p className="text-white/60 mb-8">Set yourself up for success</p>

            <div className="w-full max-w-2xl space-y-8">
                {/* Top Priorities */}
                <div className="space-y-4">
                    <h3 className="text-white/80 font-bold flex items-center gap-2">
                        <Target className="w-5 h-5 text-rose-400" />
                        Top 3 Priorities
                    </h3>
                    {tomorrowGoals.map((goal, idx) => (
                        <div key={idx} className="flex gap-2">
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-3 text-white/30 font-serif font-bold">{idx + 1}.</span>
                                <input
                                    type="text"
                                    value={goal.title}
                                    onChange={(e) => updateGoal(idx, 'title', e.target.value)}
                                    placeholder={`Priority #${idx + 1}`}
                                    className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                />
                            </div>
                            <select
                                value={goal.priority}
                                onChange={(e) => updateGoal(idx, 'priority', e.target.value)}
                                className="bg-white/5 border border-white/10 text-white rounded-xl px-3 focus:outline-none"
                            >
                                <option className="bg-slate-900">High</option>
                                <option className="bg-slate-900">Medium</option>
                                <option className="bg-slate-900">Low</option>
                            </select>
                        </div>
                    ))}
                </div>

                {/* Quick Add Section */}
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                    <h3 className="text-white/80 font-bold flex items-center gap-2 mb-4">
                        <ListTodo className="w-5 h-5 text-indigo-400" />
                        Quick Add Tasks
                    </h3>

                    <form onSubmit={addQuickTask} className="flex gap-2 mb-4">
                        <input
                            type="text"
                            value={newTaskInput}
                            onChange={(e) => setNewTaskInput(e.target.value)}
                            placeholder="Add a task for tomorrow..."
                            className="flex-1 px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                        />
                        <button
                            type="submit"
                            className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-colors"
                        >
                            <Plus size={20} />
                        </button>
                    </form>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                        {quickTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 group">
                                <span className="text-white/80 text-sm">{task.title}</span>
                                <button
                                    onClick={() => removeQuickTask(task.id)}
                                    className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                        {quickTasks.length === 0 && (
                            <p className="text-white/30 text-sm italic text-center py-2">No extra tasks added yet</p>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );

    const Phase4 = () => (
        <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex flex-col items-center justify-center h-full px-8 py-12"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
                className="mb-12 relative"
            >
                <div className="absolute inset-0 bg-indigo-500/20 blur-[50px] rounded-full" />
                <Star className="w-24 h-24 text-indigo-200 fill-indigo-200/50" />
            </motion.div>

            <blockquote className="text-center max-w-xl mb-12">
                <p className="text-2xl md:text-3xl font-serif text-white/90 leading-relaxed mb-6 font-medium italic">
                    "Rest is not idleness, and to lie sometimes on the grass under trees on a summer's day, is by no means a waste of time."
                </p>
                <footer className="text-white/50 text-sm tracking-widest uppercase">— John Lubbock</footer>
            </blockquote>

            <div className="grid grid-cols-3 gap-8 mb-12 w-full max-w-lg">
                <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                        {completedHabits.length}
                    </div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">Habits</div>
                </div>
                <div className="text-center border-l border-r border-white/10">
                    <div className="text-3xl font-bold text-white mb-1">
                        {tomorrowGoals.filter(g => g.title).length + quickTasks.length}
                    </div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">Planned</div>
                </div>
                <div className="text-center">
                    <div className="text-3xl font-bold text-white mb-1">
                        {mood ? MOOD_OPTIONS.find(m => m.value === mood)?.emoji : '-'}
                    </div>
                    <div className="text-xs text-white/40 uppercase tracking-wider">Mood</div>
                </div>
            </div>

            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleFinish}
                className="px-12 py-4 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-lg shadow-lg shadow-indigo-500/30 flex items-center gap-2"
            >
                End Your Day <Moon size={20} fill="currentColor" />
            </motion.button>
        </motion.div>
    );

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                >
                    {/* Background Backdrop */}
                    <motion.div
                        className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-purple-950"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                    >
                        {/* Stars */}
                        {[...Array(30)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute bg-white rounded-full animate-pulse"
                                style={{
                                    width: Math.random() * 3 + 'px',
                                    height: Math.random() * 3 + 'px',
                                    top: Math.random() * 100 + '%',
                                    left: Math.random() * 100 + '%',
                                    animationDuration: Math.random() * 3 + 2 + 's',
                                    opacity: Math.random() * 0.7
                                }}
                            />
                        ))}
                    </motion.div>

                    {/* Navbar */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors z-50"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Main Content Area */}
                    <div className="relative w-full h-full max-w-6xl max-h-[90vh] mx-auto flex flex-col z-10">
                        <div className="flex-1 overflow-hidden relative">
                            <AnimatePresence mode="wait">
                                {currentPhase === 1 && (
                                    <motion.div
                                        key="phase1"
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        className="flex flex-col items-center justify-center h-full px-8 py-8 overflow-y-auto"
                                    >
                                        <motion.div
                                            className="mb-6 relative"
                                            animate={{ y: [0, -10, 0] }}
                                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        >
                                            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
                                            <Moon className="w-20 h-20 text-blue-200 drop-shadow-[0_0_15px_rgba(191,219,254,0.5)]" />
                                        </motion.div>

                                        <h2 className="text-3xl font-serif font-bold text-blue-100 mb-2 text-center">
                                            Evening Reflection 🌙
                                        </h2>
                                        <p className="text-blue-200/60 text-lg mb-8">How was your day?</p>

                                        {/* Mood Selector */}
                                        <div className="flex gap-3 mb-8">
                                            {MOOD_OPTIONS.map((option) => (
                                                <motion.button
                                                    key={option.value}
                                                    whileHover={{ scale: 1.1, y: -5 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    onClick={() => setMood(option.value)}
                                                    className={`flex flex-col items-center p-3 rounded-2xl transition-all w-20 ${mood === option.value
                                                        ? `bg-gradient-to-br ${option.color} shadow-lg shadow-white/10 ring-2 ring-white/30`
                                                        : 'bg-white/5 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <span className="text-3xl mb-1">{option.emoji}</span>
                                                    <span className="text-xs font-medium text-white/90">{option.label}</span>
                                                </motion.button>
                                            ))}
                                        </div>

                                        {/* Reflection Inputs */}
                                        <div className="w-full max-w-2xl space-y-4 relative z-20">
                                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                <label className="flex items-center gap-2 text-amber-200/90 font-medium mb-2">
                                                    <Trophy className="w-4 h-4" /> Achievements
                                                </label>
                                                <textarea
                                                    value={recapData.achievements}
                                                    onChange={(e) => setRecapData(prev => ({ ...prev, achievements: e.target.value }))}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder="What did you accomplish today?"
                                                    className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 resize-none h-20"
                                                />
                                            </div>

                                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                <label className="flex items-center gap-2 text-purple-200/90 font-medium mb-2">
                                                    <Sparkles className="w-4 h-4" /> Memorable Moments
                                                </label>
                                                <textarea
                                                    value={recapData.memorableMoments}
                                                    onChange={(e) => setRecapData(prev => ({ ...prev, memorableMoments: e.target.value }))}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder="What made you smile today?"
                                                    className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50 resize-none h-20"
                                                />
                                            </div>

                                            <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                                                <label className="flex items-center gap-2 text-rose-200/90 font-medium mb-2">
                                                    <BookOpen className="w-4 h-4" /> Lessons & Adjustments
                                                </label>
                                                <textarea
                                                    value={recapData.lessonsLearned}
                                                    onChange={(e) => setRecapData(prev => ({ ...prev, lessonsLearned: e.target.value }))}
                                                    onClick={(e) => e.stopPropagation()}
                                                    placeholder="What would you do differently?"
                                                    className="w-full bg-black/20 rounded-lg p-3 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-1 focus:ring-rose-500/50 resize-none h-20"
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                {currentPhase === 2 && (
                                    <motion.div
                                        key="phase2"
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        className="flex flex-col items-center h-full px-8 py-8"
                                    >
                                        <h2 className="text-3xl font-serif font-bold text-white mb-2 text-center">Today's Habits 📋</h2>
                                        <p className="text-white/60 mb-8">What did you stick to today?</p>

                                        {/* Circular Progress */}
                                        <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle
                                                    cx="64" cy="64" r="58"
                                                    stroke="currentColor" strokeWidth="8"
                                                    fill="transparent"
                                                    className="text-white/10"
                                                />
                                                <circle
                                                    cx="64" cy="64" r="58"
                                                    stroke="currentColor" strokeWidth="8"
                                                    fill="transparent"
                                                    strokeDasharray={364}
                                                    strokeDashoffset={364 - (364 * Math.round((completedHabits.length / DEFAULT_HABITS.length) * 100)) / 100}
                                                    strokeLinecap="round"
                                                    className="text-green-400 transition-all duration-1000 ease-out"
                                                />
                                            </svg>
                                            <div className="absolute flex flex-col items-center">
                                                <span className="text-2xl font-bold text-white">{Math.round((completedHabits.length / DEFAULT_HABITS.length) * 100)}%</span>
                                            </div>
                                        </div>

                                        {/* Habit Grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 w-full max-w-2xl">
                                            {DEFAULT_HABITS.map((habit) => {
                                                const isCompleted = completedHabits.includes(habit.id);
                                                return (
                                                    <motion.button
                                                        key={habit.id}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        onClick={() => toggleHabit(habit.id)}
                                                        className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${isCompleted
                                                            ? 'bg-green-500/20 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]'
                                                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                                                            }`}
                                                    >
                                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isCompleted ? 'bg-green-500 text-white' : 'bg-white/10 text-white/50'
                                                            }`}>
                                                            {isCompleted ? <Check size={20} /> : habit.icon}
                                                        </div>
                                                        <span className={`font-medium ${isCompleted ? 'text-green-200' : 'text-white/60'}`}>
                                                            {habit.label}
                                                        </span>
                                                    </motion.button>
                                                );
                                            })}
                                        </div>
                                    </motion.div>
                                )}
                                {currentPhase === 3 && (
                                    <motion.div
                                        key="phase3"
                                        initial={{ opacity: 0, x: 50 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -50 }}
                                        className="flex flex-col items-center h-full px-8 py-8 overflow-y-auto"
                                    >
                                        <h2 className="text-3xl font-serif font-bold text-white mb-2 text-center">Plan Tomorrow 🌅</h2>
                                        <p className="text-white/60 mb-8">Set yourself up for success</p>

                                        <div className="w-full max-w-2xl space-y-8">
                                            {/* Top Priorities */}
                                            <div className="space-y-4">
                                                <h3 className="text-white/80 font-bold flex items-center gap-2">
                                                    <Target className="w-5 h-5 text-rose-400" />
                                                    Top 3 Priorities
                                                </h3>
                                                {tomorrowGoals.map((goal, idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <div className="flex-1 relative">
                                                            <span className="absolute left-3 top-3 text-white/30 font-serif font-bold">{idx + 1}.</span>
                                                            <input
                                                                type="text"
                                                                value={goal.title}
                                                                onChange={(e) => updateGoal(idx, 'title', e.target.value)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                placeholder={`Priority #${idx + 1}`}
                                                                className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                                            />
                                                        </div>
                                                        <select
                                                            value={goal.priority}
                                                            onChange={(e) => updateGoal(idx, 'priority', e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="bg-white/5 border border-white/10 text-white rounded-xl px-3 focus:outline-none"
                                                        >
                                                            <option className="bg-slate-900">High</option>
                                                            <option className="bg-slate-900">Medium</option>
                                                            <option className="bg-slate-900">Low</option>
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* Quick Add Section */}
                                            <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                                <h3 className="text-white/80 font-bold flex items-center gap-2 mb-4">
                                                    <ListTodo className="w-5 h-5 text-indigo-400" />
                                                    Quick Add Tasks
                                                </h3>

                                                <form onSubmit={addQuickTask} className="flex gap-2 mb-4">
                                                    <input
                                                        type="text"
                                                        value={newTaskInput}
                                                        onChange={(e) => setNewTaskInput(e.target.value)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        placeholder="Add a task for tomorrow..."
                                                        className="flex-1 px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:border-indigo-500"
                                                    />
                                                    <button
                                                        type="submit"
                                                        className="p-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-500 transition-colors"
                                                    >
                                                        <Plus size={20} />
                                                    </button>
                                                </form>

                                                <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                                                    {quickTasks.map(task => (
                                                        <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-white/5 group">
                                                            <span className="text-white/80 text-sm">{task.title}</span>
                                                            <button
                                                                onClick={() => removeQuickTask(task.id)}
                                                                className="text-white/20 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {quickTasks.length === 0 && (
                                                        <p className="text-white/30 text-sm italic text-center py-2">No extra tasks added yet</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                                {currentPhase === 4 && <Phase4 key="phase4" />}
                            </AnimatePresence>
                        </div>

                        {/* Navigation Footer */}
                        <div className="flex items-center justify-between px-8 py-6 border-t border-white/5 bg-black/20 backdrop-blur-md m-4 rounded-2xl">
                            {/* Progress Dots */}
                            <div className="flex gap-2">
                                {[1, 2, 3, 4].map(phase => (
                                    <div
                                        key={phase}
                                        className={`w-2.5 h-2.5 rounded-full transition-all ${phase === currentPhase ? 'bg-white scale-125' :
                                            phase < currentPhase ? 'bg-indigo-400' : 'bg-white/10'
                                            }`}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-4">
                                {currentPhase > 1 && (
                                    <button
                                        onClick={handleBack}
                                        className="px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white font-medium flex items-center gap-2 transition-colors"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Back
                                    </button>
                                )}
                                {currentPhase < 4 && (
                                    <button
                                        onClick={handleNext}
                                        className="px-6 py-2 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-medium flex items-center gap-2 transition-colors shadow-lg shadow-indigo-500/20"
                                    >
                                        Continue <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default EndTheDayModal;
