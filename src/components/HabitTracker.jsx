import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarDays, Leaf, Sprout } from 'lucide-react';
import TodayHabits from './TodayHabits';
import WeeklyGrid from './WeeklyGrid';

const inkBorder = 'border-2 border-slate-800 dark:border-bone-200/70';
const popShadow = 'shadow-[4px_4px_0_#1E293B] dark:shadow-[4px_4px_0_rgba(255,255,255,0.24)]';
const softPopShadow = 'shadow-[6px_6px_0_#E2E8F0] dark:shadow-[6px_6px_0_rgba(255,255,255,0.10)]';
const popMotion = 'transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]';

const HabitTracker = () => {
    const [activeView, setActiveView] = useState('today');

    const views = [
        { id: 'today', label: 'Today', icon: Sprout },
        { id: 'weekly', label: 'Weekly', icon: CalendarDays },
    ];

    return (
        <div className="relative isolate mx-auto w-full max-w-6xl space-y-5 pb-24 text-left">
            <div className="pointer-events-none absolute -right-6 top-10 hidden h-20 w-20 rotate-12 rounded-[26px] bg-amber-300/70 lg:block" />
            <div className="pointer-events-none absolute -left-5 top-36 hidden h-14 w-14 rounded-full bg-rose-300/70 lg:block" />

            <section className={`relative isolate overflow-hidden rounded-[30px] bg-[#fffdf5] px-4 py-4 ${inkBorder} ${popShadow} dark:bg-void-900 sm:px-5`}>
                <div className="absolute inset-0 -z-10 opacity-60 [background-image:radial-gradient(#CBD5E1_1.2px,transparent_1.2px)] [background-size:18px_18px]" />
                <div className="absolute right-8 top-5 h-8 w-8 rounded-full bg-emerald-300/80" />
                <div className="absolute bottom-4 right-24 hidden h-7 w-12 rounded-full bg-violet-300/80 sm:block" />

                <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="inline-flex rotate-[-1deg] items-center gap-2 rounded-full border-2 border-slate-800 bg-emerald-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 dark:border-bone-200/70">
                            <Leaf size={14} strokeWidth={2.7} />
                            Habits
                        </div>
                        <h1 className="mt-3 text-2xl font-black leading-tight text-slate-950 dark:text-bone-100 sm:text-3xl">Habit stamp board</h1>
                        <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-slate-600 dark:text-bone-200/70">
                            Same tracking flow, dressed like a little sticker desk.
                        </p>
                    </div>

                    <div className={`inline-flex rounded-full bg-white p-1.5 ${inkBorder} ${softPopShadow} dark:bg-void-800`}>
                        {views.map((view) => (
                            <motion.button
                                key={view.id}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setActiveView(view.id)}
                                className={`flex min-h-11 items-center gap-2 rounded-full px-4 py-2 text-sm font-black ${popMotion} ${
                                    activeView === view.id
                                        ? 'bg-violet-500 text-white shadow-[3px_3px_0_#1E293B]'
                                        : 'text-slate-500 hover:bg-amber-200 hover:text-slate-900'
                                }`}
                            >
                                <view.icon size={15} strokeWidth={2.7} />
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
