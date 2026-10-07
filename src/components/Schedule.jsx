import { useState } from 'react';
import { PageHeader, SegmentedControl } from '../ui';
import WeeklyPlan from './WeeklyPlan';
import MagicSchedule from './magic/MagicSchedule';

const Schedule = ({
    events = [],
    tasks = [],
    onAddEvent,
    onUpdateEvent,
    onDeleteEvent,
    onCompleteTask,
    onDeleteTask,
    onUpdateTask
}) => {
    const [viewMode, setViewMode] = useState('magic');
    // The day view renders its add/undo buttons into the navigation bar.
    const [actionsSlot, setActionsSlot] = useState(null);

    return (
        <div className="plan-page">
            <PageHeader
                title="Plan"
                actions={viewMode === 'magic' ? <span ref={setActionsSlot} className="nav-bar__slot" /> : null}
            />

            <SegmentedControl
                items={[
                    { id: 'magic', label: 'Day' },
                    { id: 'week', label: 'Week' }
                ]}
                value={viewMode}
                onChange={setViewMode}
                ariaLabel="Plan view"
                className="plan-page__segments"
            />

            {viewMode === 'week' ? (
                <WeeklyPlan
                    tasks={tasks}
                    scheduleItems={events}
                    onCompleteTask={onCompleteTask}
                    onDeleteScheduleItem={onDeleteEvent}
                    onDeleteTask={onDeleteTask}
                    onUpdateScheduleItem={onUpdateEvent}
                    onUpdateTask={onUpdateTask}
                />
            ) : (
                <MagicSchedule
                    events={events}
                    tasks={tasks}
                    onAddEvent={onAddEvent}
                    onUpdateEvent={onUpdateEvent}
                    onDeleteEvent={onDeleteEvent}
                    actionsSlot={actionsSlot}
                />
            )}
        </div>
    );
};

export default Schedule;
