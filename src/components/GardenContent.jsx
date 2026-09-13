import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Columns3, List } from 'lucide-react';
import { SegmentedControl, Sheet } from '../ui';
import FocusTimer from './FocusTimer';
import { TaskBoardCard, TaskListRow } from './gardenTaskRows';
import GardenSidebar from './GardenSidebar';

const formatWeekLabel = (weekDays) => {
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    const sameMonth = first.getMonth() === last.getMonth();
    const firstLabel = first.toLocaleDateString([], sameMonth
        ? { month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric' });
    const lastLabel = last.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${firstLabel}–${lastLabel}`;
};

const GardenContent = ({ view }) => {
    const [completedOpen, setCompletedOpen] = useState(false);
    const weekBoardRef = useRef(null);
    const { activeTasks, completedTasks, focusTask, handleSelectTask, moveWeek, onCompleteTask, onDeleteTask, onRequestAIHelp, onRestoreTask, onUpdateTask, selectedSubject, selectedTask, selectedTaskId, setFocusTask, setSelectedSubject, setSortBy, setTaskView, showCurrentWeek, showRelativeDue, sortedTasks, sortBy, taskView, tasksByDay, toggleDueMode, uniqueSubjects, unscheduledTasks, weekDays, weekStart, weekTaskCount } = view;

    useEffect(() => {
        const board = weekBoardRef.current;
        if (!board || taskView !== 'week' || !window.matchMedia('(max-width: 1100px)').matches) return;
        const today = board.querySelector('.task-day-column.is-today');
        board.scrollLeft = today
            ? Math.max(0, today.offsetLeft - ((board.clientWidth - today.clientWidth) / 2))
            : 0;
    }, [taskView, weekStart]);
    const list = <>
        <div className="task-list" aria-live="polite">
            {sortedTasks.map((task) => <TaskListRow key={task.id} task={task} isSelected={String(selectedTaskId) === String(task.id)} onComplete={onCompleteTask} onDelete={onDeleteTask} onRequestAIHelp={onRequestAIHelp} onRestore={onRestoreTask} onSelect={handleSelectTask} onStartFocus={setFocusTask} onToggleDueMode={toggleDueMode} showRelativeDue={showRelativeDue} />)}
            {sortedTasks.length === 0 && <div className="task-empty"><strong>No active tasks</strong><span>Add a task above or choose another category.</span></div>}
        </div>
        {completedTasks.length > 0 && <div className="completed-disclosure">
            <button type="button" onClick={() => setCompletedOpen((open) => !open)} aria-expanded={completedOpen}>Completed ({completedTasks.length})</button>
            {completedOpen && <div className="task-list">{completedTasks.map((task) => <TaskListRow key={task.id} task={task} isCompleted onComplete={onCompleteTask} onDelete={onDeleteTask} onRequestAIHelp={onRequestAIHelp} onRestore={onRestoreTask} onSelect={handleSelectTask} onStartFocus={setFocusTask} onToggleDueMode={toggleDueMode} showRelativeDue={showRelativeDue} />)}</div>}
        </div>}
    </>;

    const board = <>
        <div className="task-week-nav" aria-label="Week navigation">
            <div className="task-week-nav__range">
                <CalendarDays size={17} aria-hidden="true" />
                <span>{formatWeekLabel(weekDays)}</span>
                <span className="task-week-nav__count">{weekTaskCount} scheduled</span>
            </div>
            <div className="task-week-nav__actions">
                <button type="button" onClick={() => moveWeek(-1)} aria-label="Previous week"><ChevronLeft size={18} aria-hidden="true" /></button>
                <button type="button" onClick={showCurrentWeek}>Today</button>
                <button type="button" onClick={() => moveWeek(1)} aria-label="Next week"><ChevronRight size={18} aria-hidden="true" /></button>
            </div>
        </div>
        <div ref={weekBoardRef} className="task-week-board" aria-label={`Tasks for ${formatWeekLabel(weekDays)}`}>
            {weekDays.map((day) => {
                const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                const dayTasks = tasksByDay[key] || [];
                const isToday = day.toDateString() === new Date().toDateString();
                return <section key={key} className={`task-day-column ${isToday ? 'is-today' : ''}`} aria-labelledby={`task-day-${key}`}>
                    <header className="task-day-column__header">
                        <div>
                            <span>{isToday ? 'Today' : day.toLocaleDateString([], { weekday: 'short' })}</span>
                            <h2 id={`task-day-${key}`}>{day.getDate()}</h2>
                        </div>
                        <span className="task-day-column__count" aria-label={`${dayTasks.length} tasks`}>{dayTasks.length}</span>
                    </header>
                    <div className="task-day-column__tasks">
                        {dayTasks.map((task) => <TaskBoardCard key={task.id} task={task} isSelected={String(selectedTaskId) === String(task.id)} onComplete={onCompleteTask} onSelect={handleSelectTask} />)}
                        {dayTasks.length === 0 && <p className="task-day-column__empty">No tasks</p>}
                    </div>
                </section>;
            })}
        </div>
        {unscheduledTasks.length > 0 && <section className="task-unscheduled" aria-labelledby="task-unscheduled-title">
            <header>
                <div><h2 id="task-unscheduled-title">No date</h2><p>Tasks waiting to be placed.</p></div>
                <span>{unscheduledTasks.length}</span>
            </header>
            <div className="task-unscheduled__list">
                {unscheduledTasks.map((task) => <TaskBoardCard key={task.id} task={task} isSelected={String(selectedTaskId) === String(task.id)} onComplete={onCompleteTask} onSelect={handleSelectTask} />)}
            </div>
        </section>}
    </>;

    return <div className="task-workbench">
        <header className="task-toolbar">
            <div className="task-toolbar__title"><h1>Tasks</h1><span>{activeTasks.length} active</span></div>
            <div className="task-toolbar-controls">
                <SegmentedControl ariaLabel="Task view" value={taskView} onChange={setTaskView} items={[{ id: 'week', label: 'Week', icon: Columns3 }, { id: 'list', label: 'List', icon: List }]} />
                {taskView === 'list' && <label><span className="sr-only">Sort tasks</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="deadline">Due date</option><option value="chunkTime">Estimate</option><option value="newest">Newest</option></select></label>}
                <label><span className="sr-only">Filter category</span><select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}><option value="all">All categories</option>{uniqueSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
            </div>
        </header>
        <div className="task-layout">
            <main id={taskView === 'week' ? 'task-week-view' : 'task-list-view'}>{taskView === 'week' ? board : list}</main>
        </div>
        <Sheet open={Boolean(selectedTask)} onClose={view.clearSelectedTask} title="Task details" description="Edit the task or break it into smaller steps.">{selectedTask && <GardenSidebar view={view} />}</Sheet>
        <Sheet open={Boolean(focusTask)} onClose={() => setFocusTask(null)} title="Focus" description="Stay with one task.">
            {focusTask && <FocusTimer task={focusTask} onComplete={(minutes) => { const sessions = Array.isArray(focusTask.focus_sessions) ? focusTask.focus_sessions : []; onUpdateTask(focusTask.id, { focus_sessions: [...sessions, { minutes, endedAt: new Date().toISOString() }] }); setFocusTask(null); }} />}
        </Sheet>
    </div>;
};

export default GardenContent;
