import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { SegmentedControl } from '../ui';
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

    return (
        <div className="ui-card min-w-0 p-3 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                    <span className="app-eyebrow">Plan</span>
                    <h1 className="app-page-title">Your time, shaped clearly</h1>
                </div>
                <SegmentedControl
                    items={[
                        { id: 'week', label: 'Weekly Plan', icon: CalendarDays },
                        { id: 'magic', label: 'Magic Schedule', icon: CalendarDays }
                    ]}
                    value={viewMode}
                    onChange={setViewMode}
                    ariaLabel="Plan view"
                />
            </div>

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
                />
            )}
        </div>
    );
};

export default Schedule;
