import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react';
import { MenuButton, PageHeader, SegmentedControl, Sheet } from '../ui';
import FocusTimer from './FocusTimer';
import TaskInput from './TaskInput';
import { TaskBoardCard, TaskListRow } from './gardenTaskRows';
import GardenSidebar from './GardenSidebar';
import './tasks.css';

const formatWeekLabel = (weekDays) => {
    const first = weekDays[0];
    const last = weekDays[weekDays.length - 1];
    const firstLabel = first.toLocaleDateString([], { month: 'short', day: 'numeric' });
    const lastLabel = first.getMonth() === last.getMonth()
        ? String(last.getDate())
        : last.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `${firstLabel} – ${lastLabel}`;
};

const SORT_OPTIONS = [
    { id: 'deadline', label: 'Due Date' },
    { id: 'chunkTime', label: 'Estimate' },
    { id: 'newest', label: 'Newest' },
];

const GardenContent = ({ view }) => {
    const [completedOpen, setCompletedOpen] = useState(false);
    const weekBoardRef = useRef(null);
    const { completedTasks, existingSubjects, focusTask, handleSelectTask, moveWeek, onAddTask, onCompleteTask, onDeleteTask, onRequestAIHelp, onRestoreTask, onUpdateTask, selectedSubject, selectedTask, selectedTaskId, setFocusTask, setSelectedSubject, setSortBy, setTaskView, showCurrentWeek, showRelativeDue, sortedTasks, sortBy, taskView, tasksByDay, toggleDueMode, uniqueSubjects, unscheduledTasks, weekDays, weekStart } = view;

    useEffect(() => {
        const board = weekBoardRef.current;
        if (!board || taskView !== 'week' || board.scrollWidth <= board.clientWidth) return;
        const today = board.querySelector('.task-day-column.is-today');
        board.scrollLeft = today
            ? Math.max(0, today.offsetLeft - ((board.clientWidth - today.clientWidth) / 2))
            : 0;
    }, [taskView, weekStart]);

    const isCurrentWeek = weekDays.some((day) => day.toDateString() === new Date().toDateString());

    const filterSections = [
        {
            title: 'Category',
            items: [
                { id: 'all', label: 'All Categories', checked: selectedSubject === 'all', onSelect: () => setSelectedSubject('all') },
                ...uniqueSubjects.map((subject) => ({
                    id: subject,
                    label: subject,
                    checked: selectedSubject === subject,
                    onSelect: () => setSelectedSubject(subject),
                })),
            ],
        },
        ...(taskView === 'list' ? [{
            title: 'Sort By',
            items: SORT_OPTIONS.map((option) => ({
                id: option.id,
                label: option.label,
                checked: sortBy === option.id,
                onSelect: () => setSortBy(option.id),
            })),
        }, {
            title: 'Show Due As',
            items: [
                { id: 'date', label: 'Date', checked: !showRelativeDue, onSelect: () => showRelativeDue && toggleDueMode() },
                { id: 'relative', label: 'Time Left', checked: showRelativeDue, onSelect: () => !showRelativeDue && toggleDueMode() },
            ],
        }] : []),
    ];

    const list = <>
        <div className="ui-group task-list" aria-live="polite">
            {sortedTasks.map((task) => <TaskListRow key={task.id} task={task} isSelected={String(selectedTaskId) === String(task.id)} onComplete={onCompleteTask} onDelete={onDeleteTask} onRequestAIHelp={onRequestAIHelp} onRestore={onRestoreTask} onSelect={handleSelectTask} onStartFocus={setFocusTask} showRelativeDue={showRelativeDue} />)}
            {sortedTasks.length === 0 && <div className="task-empty"><strong>No tasks</strong><span>{selectedSubject === 'all' ? 'You’re all caught up.' : 'Nothing in this category.'}</span></div>}
        </div>
        {completedTasks.length > 0 && <div className="completed-disclosure">
            <button type="button" className="ui-text-button" onClick={() => setCompletedOpen((open) => !open)} aria-expanded={completedOpen}>
                {completedOpen ? 'Hide Completed' : `Show Completed (${completedTasks.length})`}
            </button>
            {completedOpen && <div className="ui-group task-list">{completedTasks.map((task) => <TaskListRow key={task.id} task={task} isCompleted onComplete={onCompleteTask} onDelete={onDeleteTask} onRequestAIHelp={onRequestAIHelp} onRestore={onRestoreTask} onSelect={handleSelectTask} onStartFocus={setFocusTask} showRelativeDue={showRelativeDue} />)}</div>}
        </div>}
    </>;

    const board = <>
        <div className="task-week-nav" aria-label="Week navigation">
            <h2 className="task-week-nav__range">{formatWeekLabel(weekDays)}</h2>
            <div className="task-week-nav__actions">
                {!isCurrentWeek && <button type="button" className="ui-text-button" onClick={showCurrentWeek}>Today</button>}
                <button type="button" className="ui-round-button" onClick={() => moveWeek(-1)} aria-label="Previous week"><ChevronLeft size={19} strokeWidth={2.3} aria-hidden="true" /></button>
                <button type="button" className="ui-round-button" onClick={() => moveWeek(1)} aria-label="Next week"><ChevronRight size={19} strokeWidth={2.3} aria-hidden="true" /></button>
            </div>
        </div>
        <div ref={weekBoardRef} className="task-week-board" aria-label={`Tasks for ${formatWeekLabel(weekDays)}`}>
            {weekDays.map((day) => {
                const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
                const dayTasks = tasksByDay[key] || [];
                const isToday = day.toDateString() === new Date().toDateString();
                return <section key={key} className={`task-day-column ${isToday ? 'is-today' : ''}`} aria-labelledby={`task-day-${key}`}>
                    <header className="task-day-column__header">
                        <span className="task-day-column__weekday">{day.toLocaleDateString([], { weekday: 'short' })}</span>
                        <h2 id={`task-day-${key}`} className="task-day-column__date">{day.getDate()}</h2>
                        {dayTasks.length > 0 && <span className="task-day-column__count" aria-label={`${dayTasks.length} tasks`}>{dayTasks.length}</span>}
                    </header>
                    <div className="task-day-column__tasks">
                        {dayTasks.map((task) => <TaskBoardCard key={task.id} task={task} isSelected={String(selectedTaskId) === String(task.id)} onComplete={onCompleteTask} onSelect={handleSelectTask} />)}
                        {dayTasks.length === 0 && <p className="task-day-column__empty">No tasks</p>}
                    </div>
                </section>;
            })}
        </div>
        {unscheduledTasks.length > 0 && <section className="task-unscheduled" aria-labelledby="task-unscheduled-title">
            <div className="ui-section-title">
                <h2 id="task-unscheduled-title">No Date</h2>
                <span>{unscheduledTasks.length}</span>
            </div>
            <div className="ui-group task-unscheduled__list">
                {unscheduledTasks.map((task) => <TaskBoardCard key={task.id} task={task} isSelected={String(selectedTaskId) === String(task.id)} onComplete={onCompleteTask} onSelect={handleSelectTask} />)}
            </div>
        </section>}
    </>;

    return <div className="task-workbench">
        <PageHeader
            title="Tasks"
            actions={<MenuButton icon={ListFilter} label="Filter tasks" sections={filterSections} active={selectedSubject !== 'all'} />}
        />
        <SegmentedControl
            ariaLabel="Task view"
            value={taskView}
            onChange={setTaskView}
            className="task-view-segments"
            items={[{ id: 'week', label: 'Week' }, { id: 'list', label: 'List' }]}
        />
        <TaskInput onAdd={onAddTask} existingSubjects={existingSubjects} />
        <div className="task-layout">
            <main id={taskView === 'week' ? 'task-week-view' : 'task-list-view'}>{taskView === 'week' ? board : list}</main>
        </div>
        <Sheet open={Boolean(selectedTask)} onClose={view.clearSelectedTask} title="Details">{selectedTask && <GardenSidebar view={view} />}</Sheet>
        <Sheet open={Boolean(focusTask)} onClose={() => setFocusTask(null)} title="Focus">
            {focusTask && <FocusTimer task={focusTask} onComplete={(minutes) => { const sessions = Array.isArray(focusTask.focus_sessions) ? focusTask.focus_sessions : []; onUpdateTask(focusTask.id, { focus_sessions: [...sessions, { minutes, endedAt: new Date().toISOString() }] }); setFocusTask(null); }} />}
        </Sheet>
    </div>;
};

export default GardenContent;
