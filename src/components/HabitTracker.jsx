import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, LayoutGrid, Sparkles } from 'lucide-react';
import TodayHabits from './TodayHabits';
import WeeklyGrid from './WeeklyGrid';

const HabitTracker = () => {
    const [activeView, setActiveView] = useState('today');

    const views = [
        { id: 'today', label: 'Today', icon: Sparkles },
        { id: 'weekly', label: 'Weekly', icon: LayoutGrid },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 bg-clip-text text-transparent mb-2">
                    Habit Tracker
                </h1>
                <p className="text-sage-500 dark:text-white/50">Build better habits, one day at a time</p>
            </div>

            {/* Sub-tabs */}
            <div className="flex justify-center gap-2 mb-8">
                {views.map((view) => (
                    <motion.button
                        key={view.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveView(view.id)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${activeView === view.id
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                                : 'bg-sage-100 dark:bg-white/10 text-sage-600 dark:text-white/60 hover:bg-sage-200 dark:hover:bg-white/20 hover:text-sage-800 dark:hover:text-white/80'
                            }`}
                    >
                        <view.icon size={18} />
                        {view.label}
                    </motion.button>
                ))}
            </div>

            {/* Content */}
            <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
            >
                {activeView === 'today' && <TodayHabits />}
                {activeView === 'weekly' && <WeeklyGrid />}
            </motion.div>
        </div>
    );
};

export default HabitTracker;
