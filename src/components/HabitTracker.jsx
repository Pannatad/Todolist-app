import React, { useState } from 'react';
import { CalendarDays, CheckCircle2 } from 'lucide-react';
import TodayHabits from './TodayHabits';
import WeeklyGrid from './WeeklyGrid';
import { SegmentedControl } from '../ui';

const HabitTracker = () => {
    const [activeView, setActiveView] = useState('today');

    const views = [
        { id: 'today', label: 'Today', icon: CheckCircle2 },
        { id: 'weekly', label: 'Weekly', icon: CalendarDays },
    ];

    return (
        <div className="habit-screen relative isolate mx-auto w-full max-w-6xl space-y-5 pb-24 text-left">
            <section className="habit-screen__header">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <h1 className="app-page-title">Habits</h1>
                        <p className="mt-1 max-w-xl text-sm leading-6 text-slate-600 dark:text-bone-200/70">
                            Check today’s routines or step back to review the week.
                        </p>
                    </div>

                    <SegmentedControl
                        items={views}
                        value={activeView}
                        onChange={setActiveView}
                        ariaLabel="Habit view"
                        className="habit-screen__segments"
                    />
                </div>
            </section>

            <div
                key={activeView}
                className="habit-screen__content"
            >
                {activeView === 'today' && <TodayHabits />}
                {activeView === 'weekly' && <WeeklyGrid />}
            </div>
        </div>
    );
};

export default HabitTracker;
