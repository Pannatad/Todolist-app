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
                    // The calendar shows one day on phones and the whole week on wider
                    // screens, so name the views by what they are, not their span.
                    { id: 'magic', label: 'Calendar' },
                    { id: 'week', label: 'List' }
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
