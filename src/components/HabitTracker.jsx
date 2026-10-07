import React, { useState } from 'react';
import TodayHabits from './TodayHabits';
import WeeklyGrid from './WeeklyGrid';
import { PageHeader, SegmentedControl } from '../ui';

const HabitTracker = () => {
    const [activeView, setActiveView] = useState('today');
    // Today's list renders its add button into the navigation bar.
    const [actionsSlot, setActionsSlot] = useState(null);

    return (
        <div className="habit-screen">
            <PageHeader
                title="Habits"
                actions={activeView === 'today' ? <span ref={setActionsSlot} className="nav-bar__slot" /> : null}
            />

            <SegmentedControl
                items={[
                    { id: 'today', label: 'Today' },
                    { id: 'weekly', label: 'Week' },
                ]}
                value={activeView}
                onChange={setActiveView}
                ariaLabel="Habit view"
                className="habit-screen__segments"
            />

            <div className="habit-screen__content">
                {activeView === 'today' && <TodayHabits actionsSlot={actionsSlot} />}
                {activeView === 'weekly' && <WeeklyGrid />}
            </div>
        </div>
    );
};

export default HabitTracker;
