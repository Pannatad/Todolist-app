import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, Clock, Calendar, CheckCircle2, AlertCircle, ChevronRight, Plus, Coins, Flame, Brain, CheckSquare } from 'lucide-react';
import { useTask } from '../context/TaskContext';
import { useGoal } from '../context/GoalContext';
import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useLog } from '../context/LogContext';
import Penguin from './Penguin';

const Overview = ({ onNavigate }) => {
    const { tasks, addTask } = useTask();
    const { dailyHighlights, goals } = useGoal();
    const { user } = useAuth();
    const { coins } = useGame();
    const { activityLogs, addActivityLog } = useLog();

    const [greeting, setGreeting] = useState('');
    const [quickCaptureText, setQuickCaptureText] = useState('');
    const [stats, setStats] = useState({
        taskProgress: 0,
        urgentCount: 0,
        nextTask: null,
        focusMinutes: 0,
        tasksLeft: 0
    });

    // Time-based greeting
    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Good Morning');
        else if (hour < 18) setGreeting('Good Afternoon');
        else setGreeting('Good Evening');
    }, []);

    // Calculate Stats
    useEffect(() => {
        if (!tasks) return;

        const today = new Date().toISOString().split('T')[0];
        const todaysTasks = tasks.filter(t => {
            if (!t.deadline) return false;
            return t.deadline.startsWith(today);
        });

        const completed = todaysTasks.filter(t => t.status === 'harvested').length;
        const total = todaysTasks.length;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
        const left = total - completed;

        const urgent = tasks.filter(t => {
            if (!t.deadline || t.status === 'harvested') return false;
            const now = new Date();
            const due = new Date(t.deadline);
            const diff = due - now;
            return diff > 0 && diff < 1000 * 60 * 60 * 24; // Due within 24h
        }).length;

        // Find next upcoming task
        const next = tasks
            .filter(t => {
                if (t.status === 'harvested' || !t.deadline) return false;
                return new Date(t.deadline) > new Date(); // Only future tasks
            })
            .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

        setStats({
            taskProgress: progress,
            urgentCount: urgent,
            nextTask: next,
            focusMinutes: 0, // Placeholder until FocusContext is integrated if needed
            tasksLeft: left
        });
    }, [tasks]);

    const handleQuickCapture = (e) => {
        e.preventDefault();
        if (!quickCaptureText.trim()) return;

        addTask({
            title: quickCaptureText,
            difficulty: 'medium',
            deadline: new Date().toISOString(), // Due today
            subject: 'Quick Capture'
        });
        setQuickCaptureText('');
    };

    // Get today's highlight
    const todayKey = new Date().toISOString().split('T')[0];
    const dailyHighlight = dailyHighlights[`${todayKey}_0`];

    return (
        <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto space-y-6 custom-scrollbar">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-sage-800 dark:text-bone-100">
                        {greeting}, {user?.email?.split('@')[0] || 'Traveler'}
                    </h1>
                    <p className="text-sage-500 dark:text-bone-400 mt-1 flex items-center gap-2">
                        <Flame size={16} className="text-orange-500" />
                        Your productivity engine is online.
                    </p>
                </div>

                {/* Quick Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full md:w-auto">
                    <div className="bg-white dark:bg-void-800 p-3 rounded-2xl border border-sage-100 dark:border-white/10 shadow-sm flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-sage-800 dark:text-bone-100">{stats.tasksLeft}</span>
                        <span className="text-xs text-sage-500 uppercase font-bold">Tasks Left</span>
                    </div>
                    <div className="bg-white dark:bg-void-800 p-3 rounded-2xl border border-sage-100 dark:border-white/10 shadow-sm flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-purple-600">{stats.taskProgress}%</span>
                        <span className="text-xs text-sage-500 uppercase font-bold">Done</span>
                    </div>
                    <div className="bg-white dark:bg-void-800 p-3 rounded-2xl border border-sage-100 dark:border-white/10 shadow-sm flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-yellow-500 flex items-center gap-1">
                            {coins} <span className="text-xs">🪙</span>
                        </span>
                        <span className="text-xs text-sage-500 uppercase font-bold">Wealth</span>
                    </div>
                    <div className="bg-white dark:bg-void-800 p-3 rounded-2xl border border-sage-100 dark:border-white/10 shadow-sm flex flex-col items-center min-w-[100px]">
                        <span className="text-2xl font-bold text-blue-500">0</span>
                        <span className="text-xs text-sage-500 uppercase font-bold">Focus (m)</span>
                    </div>
                </div>
            </div>

            {/* Bento Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                {/* HERO SECTION (Left - 8 cols) */}
                <div className="md:col-span-8 flex flex-col gap-6">

                    {/* Next Up / Focus Card (The "Beautiful" one) */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden group min-h-[240px] flex flex-col justify-between"
                    >
                        <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-30 transition-opacity duration-500">
                            <Clock size={120} />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 text-purple-200 font-bold tracking-wider text-sm mb-4">
                                <Clock size={16} /> NEXT UP
                            </div>
                            {stats.nextTask ? (
                                <>
                                    <h2 className="text-3xl md:text-4xl font-bold mb-2 leading-tight max-w-lg text-white">
                                        {stats.nextTask.title}
                                    </h2>
                                    <div className="flex items-center gap-2 text-purple-100 text-lg font-medium">
                                        <Calendar size={20} />
                                        {new Date(stats.nextTask.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </>
                            ) : (
                                <h2 className="text-3xl font-bold mb-2 text-white">No upcoming tasks</h2>
                            )}
                        </div>

                        <button
                            onClick={() => stats.nextTask ? onNavigate('garden') : onNavigate('garden')}
                            className="mt-6 w-full bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 text-white py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 group-hover:scale-[1.02]"
                        >
                            {stats.nextTask ? 'Start Task' : 'Add New Task'} <ChevronRight size={20} />
                        </button>
                    </motion.div>

                    {/* Quick Capture & Vision Board Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Quick Capture */}
                        <div className="bg-white dark:bg-void-900 border border-sage-100 dark:border-white/10 p-6 rounded-3xl shadow-sm">
                            <h3 className="font-bold text-sage-700 dark:text-bone-200 mb-4 flex items-center gap-2">
                                <Brain size={18} className="text-pink-500" /> Quick Capture
                            </h3>
                            <form onSubmit={handleQuickCapture} className="flex flex-col gap-3">
                                <textarea
                                    value={quickCaptureText}
                                    onChange={(e) => setQuickCaptureText(e.target.value)}
                                    placeholder="What's on your mind? (e.g., 'Buy milk', 'Call Mom')"
                                    className="w-full bg-sage-50 dark:bg-black/20 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-purple-500 resize-none h-24 text-sage-800 dark:text-bone-100"
                                />
                                <button type="submit" className="bg-sage-800 dark:bg-bone-200 text-white dark:text-black py-2 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity">
                                    Add to Tasks
                                </button>
                            </form>
                        </div>

                        {/* Vision Board Goals Mini-List */}
                        <div className="bg-white dark:bg-void-900 border border-sage-100 dark:border-white/10 p-6 rounded-3xl shadow-sm flex flex-col">
                            <h3 className="font-bold text-sage-700 dark:text-bone-200 mb-4 flex items-center gap-2">
                                <Target size={18} className="text-purple-500" /> Vision Board (Today)
                            </h3>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[140px]">
                                {[0, 1, 2].map((index) => {
                                    const todayKey = new Date().toISOString().split('T')[0];
                                    const uniqueKey = `${todayKey}_${index}`;
                                    const rawData = dailyHighlights?.[uniqueKey];
                                    const highlight = typeof rawData === 'string'
                                        ? { text: rawData, completed: false }
                                        : rawData;

                                    if (!highlight) return (
                                        <div key={index} className="flex items-center gap-3 p-2 rounded-lg border border-dashed border-sage-200 dark:border-white/10 text-sage-400 dark:text-bone-500 text-xs italic">
                                            <div className="w-2 h-2 rounded-full bg-sage-200 dark:bg-white/10"></div>
                                            Empty Slot
                                        </div>
                                    );

                                    return (
                                        <div key={index} className="flex items-start gap-3 p-2 hover:bg-sage-50 dark:hover:bg-white/5 rounded-lg transition-colors group">
                                            <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${highlight.completed ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                                            <div>
                                                <p className={`text-sm font-bold leading-tight ${highlight.completed ? 'line-through text-sage-400' : 'text-sage-700 dark:text-bone-200'}`}>
                                                    {highlight.text}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                                <button onClick={() => onNavigate('vision')} className="text-xs text-purple-500 font-bold mt-2 hover:underline w-full text-center">
                                    Edit Vision Board →
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SIDEBAR (Right - 4 cols) */}
                <div className="md:col-span-4 flex flex-col gap-6">

                    {/* Avatar Card */}
                    <div className="bg-gradient-to-b from-blue-50 to-white dark:from-void-800 dark:to-void-900 border border-sage-100 dark:border-white/10 p-6 rounded-3xl shadow-sm flex flex-col items-center text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-20 bg-blue-500/10"></div>
                        <div className="relative z-10 mt-4 transform scale-125">
                            <Penguin stage="growing" level={3} difficulty="medium" />
                        </div>
                        <div className="mt-6 relative z-10">
                            <p className="text-sm font-bold text-sage-600 dark:text-bone-200 italic">
                                "One step at a time! You're doing great."
                            </p>
                        </div>
                    </div>

                    {/* Timeline Strip */}
                    <div className="bg-white dark:bg-void-900 border border-sage-100 dark:border-white/10 p-6 rounded-3xl shadow-sm flex-1 flex flex-col min-h-[300px]">
                        <h3 className="font-bold text-sage-700 dark:text-bone-200 mb-4 flex items-center gap-2">
                            <Calendar size={18} className="text-blue-500" /> Today's Plan
                        </h3>
                        <div className="flex-1 relative">
                            {/* Vertical Line */}
                            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-sage-100 dark:bg-white/10"></div>

                            <div className="space-y-6 relative z-10 pl-8">
                                {tasks && tasks.slice(0, 5).map((task, i) => (
                                    <div key={task.id} className="relative">
                                        <div className={`absolute -left-[29px] top-1 w-3 h-3 rounded-full border-2 border-white dark:border-void-900 ${task.status === 'harvested' ? 'bg-green-400' : 'bg-purple-500'}`}></div>
                                        <p className="text-xs font-bold text-sage-400 dark:text-bone-500 mb-1">
                                            {task.deadline ? new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Anytime'}
                                        </p>
                                        <div className="bg-sage-50 dark:bg-black/20 p-3 rounded-xl border border-transparent hover:border-purple-200 dark:hover:border-purple-900/30 transition-colors">
                                            <p className={`text-sm font-bold ${task.status === 'harvested' ? 'line-through text-sage-400' : 'text-sage-700 dark:text-bone-200'}`}>
                                                {task.title}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {(!tasks || tasks.length === 0) && (
                                    <p className="text-sm text-sage-400 italic">No tasks scheduled.</p>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Overview;
