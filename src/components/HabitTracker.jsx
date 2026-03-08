import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, LayoutGrid, Sparkles, ListChecks } from 'lucide-react';
import TodayHabits from './TodayHabits';
import WeeklyGrid from './WeeklyGrid';

const HabitTracker = () => {
    const [activeView, setActiveView] = useState('today');

    const views = [
        { id: 'today', label: 'Today', icon: Sparkles },
        { id: 'weekly', label: 'Weekly', icon: CalendarDays },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <ListChecks size={28} className="text-teal-500" />
                    <h1 className="text-2xl font-bold text-gray-800">
                        Habit Tracker
                    </h1>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex justify-center gap-2 mb-8">
                {views.map((view) => (
                    <motion.button
                        key={view.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setActiveView(view.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all ${activeView === view.id
                            ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        <view.icon size={16} />
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
