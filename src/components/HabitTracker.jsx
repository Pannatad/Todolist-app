import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Leaf, Sparkles } from 'lucide-react';
import TodayHabits from './TodayHabits';
import WeeklyGrid from './WeeklyGrid';

const HabitTracker = () => {
    const [activeView, setActiveView] = useState('today');

    const views = [
        { id: 'today', label: 'Garden', icon: Sparkles, description: 'Daily care and seed pots' },
        { id: 'weekly', label: 'Ledger', icon: CalendarDays, description: 'Weekly habit history' },
    ];

    return (
        <div className="mx-auto w-full max-w-6xl space-y-6">
            <section className="relative overflow-hidden rounded-[40px] border border-emerald-100 bg-gradient-to-br from-emerald-300 via-teal-50 to-amber-100 p-6 shadow-[0_30px_70px_rgba(16,185,129,0.14)]">
                <div className="absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/45 blur-3xl" />
                <div className="absolute left-10 top-10 h-16 w-24 rounded-full bg-white/35 blur-2xl" />
                <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-emerald-400/25 to-transparent" />

                <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-2 text-emerald-700">
                            <Leaf size={18} />
                            <span className="text-xs font-semibold uppercase tracking-[0.24em]">Habits</span>
                        </div>
                        <h1 className="mt-2 font-serif text-4xl text-slate-800">Grow habits like a patient garden.</h1>
                        <p className="mt-2 text-sm text-slate-600">
                            Seeds appear in labeled pots day by day, recover when you return to them, and visibly decay when neglected too long.
                        </p>
                    </div>

                    <div className="rounded-[28px] border border-white/60 bg-white/40 p-2 backdrop-blur-sm">
                        <div className="flex flex-wrap gap-2">
                            {views.map((view) => (
                                <motion.button
                                    key={view.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setActiveView(view.id)}
                                    className={`min-w-[160px] rounded-[22px] px-4 py-3 text-left transition-all ${activeView === view.id
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                                        : 'bg-white/70 text-slate-600 hover:bg-white'
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <view.icon size={16} />
                                        <span className="font-semibold">{view.label}</span>
                                    </div>
                                    <div className={`mt-1 text-xs ${activeView === view.id ? 'text-white/80' : 'text-slate-400'}`}>
                                        {view.description}
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22 }}
            >
                {activeView === 'today' && <TodayHabits />}
                {activeView === 'weekly' && <WeeklyGrid />}
            </motion.div>
        </div>
    );
};

export default HabitTracker;
