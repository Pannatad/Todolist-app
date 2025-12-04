import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Zap, Clock, Calendar, CheckCircle2, AlertCircle, ChevronRight, Plus, Coins, Flame, Brain, CheckSquare, Check } from 'lucide-react';
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

    return (
        <div className="h-full flex flex-col p-4 md:p-6 overflow-y-auto space-y-8 custom-scrollbar">
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

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: Today's Plan (Purple Gradient) */}
                <div className="lg:col-span-1 flex flex-col h-full">
                    <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-[2rem] p-6 shadow-xl h-full flex flex-col relative overflow-hidden">
                        {/* Decorative Background Elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>

                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <Calendar className="text-white/90" size={24} />
                            <h2 className="text-2xl font-bold text-white">Today's Plan</h2>
                        </div>

                        <div className="flex-1 relative z-10 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                            {/* Timeline Line */}
                            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-white/20 rounded-full"></div>

                            {tasks && tasks.filter(t => {
                                if (!t.deadline) return true; // Show anytime tasks too? Or filter logic from stats?
                                const today = new Date().toISOString().split('T')[0];
                                return t.deadline.startsWith(today);
                            }).sort((a, b) => {
                                if (!a.deadline) return 1;
                                if (!b.deadline) return -1;
                                return new Date(a.deadline) - new Date(b.deadline);
                            }).map((task, i) => (
                                <div key={task.id} className="relative pl-10 group">
                                    {/* Timeline Dot */}
                                    <div className={`absolute left-[11px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-indigo-500 z-10 ${task.status === 'harvested' ? 'bg-green-400' : 'bg-white'
                                        }`}></div>

                                    <div className={`p-4 rounded-xl shadow-sm transition-all hover:scale-[1.02] ${task.status === 'harvested'
                                            ? 'bg-white/10 text-white/60'
                                            : 'bg-cyan-50 text-cyan-900'
                                        }`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className={`font-bold text-lg leading-tight ${task.status === 'harvested' ? 'line-through' : ''}`}>
                                                    {task.title}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1 opacity-80">
                                                    {task.status === 'harvested' ? (
                                                        <span className="flex items-center gap-1 text-xs font-bold text-green-300">
                                                            <CheckCircle2 size={12} /> Done
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-xs font-bold">
                                                            <Clock size={12} />
                                                            {task.deadline
                                                                ? new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                                                : 'Anytime'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {task.status !== 'harvested' && (
                                                <div className="bg-green-500 text-white p-1 rounded-full shadow-sm">
                                                    <Check size={14} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {(!tasks || tasks.filter(t => t.deadline && t.deadline.startsWith(new Date().toISOString().split('T')[0])).length === 0) && (
                                <div className="pl-10 text-white/60 italic text-sm py-4">
                                    No tasks scheduled for today.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* MIDDLE/RIGHT COLUMN: Vision Board + Widgets */}
                <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Vision Board Card (Purple/Pink Gradient) */}
                    <div className="bg-gradient-to-br from-fuchsia-600 to-purple-700 rounded-[2rem] p-6 shadow-xl relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>

                        <div className="flex items-center gap-3 mb-6 relative z-10">
                            <Target className="text-white/90" size={24} />
                            <h2 className="text-2xl font-bold text-white">Vision Board (Today)</h2>
                        </div>

                        <div className="space-y-3 relative z-10 flex-1">
                            {[0, 1, 2].map((index) => {
                                const todayKey = new Date().toISOString().split('T')[0];
                                const uniqueKey = `${todayKey}_${index}`;
                                const rawData = dailyHighlights?.[uniqueKey];
                                const highlight = typeof rawData === 'string'
                                    ? { text: rawData, completed: false }
                                    : rawData;

                                if (!highlight) return (
                                    <div key={index} className="p-4 rounded-xl bg-white/10 border border-white/5 text-white/40 text-sm italic flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-white/20"></div>
                                        Empty Goal Slot
                                    </div>
                                );

                                return (
                                    <div key={index} className={`p-4 rounded-xl shadow-sm flex items-center gap-3 transition-all hover:scale-[1.02] ${highlight.completed
                                            ? 'bg-white/10 text-white/60'
                                            : 'bg-purple-50 text-purple-900'
                                        }`}>
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${highlight.completed ? 'bg-green-500 text-white' : 'bg-fuchsia-500'
                                            }`}>
                                            {highlight.completed && <Check size={12} strokeWidth={3} />}
                                        </div>
                                        <span className={`font-bold text-sm ${highlight.completed ? 'line-through' : ''}`}>
                                            {highlight.text}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <button onClick={() => onNavigate('vision')} className="mt-4 text-white/80 hover:text-white text-sm font-medium flex items-center gap-1 transition-colors">
                            Manage Goals <ChevronRight size={14} />
                        </button>
                    </div>

                    {/* Quick Capture Widget */}
                    <div className="bg-white dark:bg-void-900 border border-sage-100 dark:border-white/10 p-6 rounded-[2rem] shadow-sm flex flex-col">
                        <h3 className="font-bold text-sage-700 dark:text-bone-200 mb-4 flex items-center gap-2">
                            <Brain size={18} className="text-pink-500" /> Quick Capture
                        </h3>
                        <form onSubmit={handleQuickCapture} className="flex flex-col gap-3 flex-1">
                            <textarea
                                value={quickCaptureText}
                                onChange={(e) => setQuickCaptureText(e.target.value)}
                                placeholder="What's on your mind?"
                                className="w-full bg-sage-50 dark:bg-black/20 border-none rounded-xl p-4 text-sm focus:ring-2 focus:ring-purple-500 resize-none flex-1 min-h-[100px] text-sage-800 dark:text-bone-100"
                            />
                            <button type="submit" className="bg-sage-800 dark:bg-bone-200 text-white dark:text-black py-3 rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                <Plus size={16} /> Add Task
                            </button>
                        </form>
                    </div>

                    {/* Avatar / Motivation Widget */}
                    <div className="md:col-span-2 bg-gradient-to-r from-sky-100 to-blue-50 dark:from-void-800 dark:to-void-900 border border-sage-100 dark:border-white/10 p-6 rounded-[2rem] shadow-sm flex items-center gap-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none"></div>

                        <div className="shrink-0 transform scale-110">
                            <Penguin stage="growing" level={3} difficulty="medium" />
                        </div>

                        <div className="relative z-10">
                            <h3 className="font-bold text-lg text-sage-800 dark:text-bone-100 mb-1">
                                Keep going, {user?.email?.split('@')[0] || 'Friend'}!
                            </h3>
                            <p className="text-sage-600 dark:text-bone-300 text-sm italic">
                                "Small steps every day lead to big results. You've completed {stats.taskProgress}% of today's tasks."
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Overview;
