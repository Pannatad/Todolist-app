import { useEffect, useState } from 'react';
import { Sheet } from '../ui';
import FocusTimer from './FocusTimer';
import { TaskListRow } from './gardenTaskRows';
import GardenSidebar from './GardenSidebar';

const useDesktopDetail = () => {
    const [isDesktop, setIsDesktop] = useState(() => (
        typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
    ));

    useEffect(() => {
        const query = window.matchMedia('(min-width: 1024px)');
        const update = (event) => setIsDesktop(event.matches);
        query.addEventListener('change', update);
        return () => query.removeEventListener('change', update);
    }, []);

    return isDesktop;
};

const GardenContent = ({ view }) => {
    const [completedOpen, setCompletedOpen] = useState(false);
    const isDesktopDetail = useDesktopDetail();
    const { activeTasks, completedTasks, focusTask, handleSelectTask, onCompleteTask, onDeleteTask, onRequestAIHelp, onRestoreTask, onUpdateTask, selectedSubject, selectedTask, selectedTaskId, setFocusTask, setSelectedSubject, setSortBy, showRelativeDue, sortedTasks, sortBy, toggleDueMode, uniqueSubjects } = view;
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

    return <div className="task-workbench">
        <header className="task-toolbar">
            <div><h1>Tasks</h1><span>{activeTasks.length} active</span></div>
            <div className="task-toolbar-controls">
                <label><span className="sr-only">Sort tasks</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="deadline">Due date</option><option value="chunkTime">Estimate</option><option value="newest">Newest</option></select></label>
                <label><span className="sr-only">Filter category</span><select value={selectedSubject} onChange={(event) => setSelectedSubject(event.target.value)}><option value="all">All categories</option>{uniqueSubjects.map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label>
            </div>
        </header>
        <div className={`task-layout ${selectedTask ? 'has-selection' : ''}`}>
            <main>{list}</main>
            {selectedTask && isDesktopDetail && <aside className="task-detail-desktop"><GardenSidebar view={view} /></aside>}
        </div>
        {!isDesktopDetail && <Sheet open={Boolean(selectedTask)} onClose={view.clearSelectedTask} title="Task details">{selectedTask && <GardenSidebar view={view} />}</Sheet>}
        <Sheet open={Boolean(focusTask)} onClose={() => setFocusTask(null)} title="Focus" description="Stay with one task.">
            {focusTask && <FocusTimer task={focusTask} onComplete={(minutes) => { const sessions = Array.isArray(focusTask.focus_sessions) ? focusTask.focus_sessions : []; onUpdateTask(focusTask.id, { focus_sessions: [...sessions, { minutes, endedAt: new Date().toISOString() }] }); setFocusTask(null); }} />}
        </Sheet>
    </div>;
};

export default GardenContent;
