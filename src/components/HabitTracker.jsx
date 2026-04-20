import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Leaf, Sprout } from 'lucide-react';
import TodayHabits from './TodayHabits';
import WeeklyGrid from './WeeklyGrid';

const HabitTracker = () => {
    const [activeView, setActiveView] = useState('today');

    const views = [
        { id: 'today', label: 'Today', icon: Sprout },
        { id: 'weekly', label: 'Weekly', icon: CalendarDays },
    ];

    return (
        <div className="mx-auto w-full max-w-6xl space-y-4">
            <section className="rounded-[24px] border border-slate-200/80 bg-white/88 px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.05)] backdrop-blur-sm sm:px-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-emerald-700">
                            <Leaf size={14} />
                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em]">Habits</span>
                        </div>
                        <h1 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">Simple habit tracking</h1>
                        <p className="mt-1 text-sm text-slate-500">Smaller, calmer, and easier to scan.</p>
                    </div>

                    <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                        {views.map((view) => (
                            <motion.button
                                key={view.id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setActiveView(view.id)}
                                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                                    activeView === view.id
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800'
                                }`}
                            >
                                <view.icon size={15} />
                                {view.label}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </section>

            <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
            >
                {activeView === 'today' && <TodayHabits />}
                {activeView === 'weekly' && <WeeklyGrid />}
            </motion.div>
        </div>
    );
};

export default HabitTracker;
