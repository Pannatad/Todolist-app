import { AnimatePresence, motion as Motion } from 'framer-motion';
import { ArrowUpDown, ChevronDown, Target } from 'lucide-react';
import { Sheet } from '../ui';
import FocusTimer from './FocusTimer';
import { TaskListRow } from './gardenTaskRows';
import GardenSidebar from './GardenSidebar';

const GardenContent = ({ view }) => {
    const {
        allCount, chunkedCount, completedTasks, focusTask, handleSelectTask, onCompleteTask, onDeleteTask,
        onRequestAIHelp, onRestoreTask, onUpdateTask, overdueCount, selectedSubject, selectedTaskId,
        setFocusTask, setSelectedSubject, setShowSort, setSortBy, showSort, sortBy, sortRef, sortedTasks,
        subjectCounts, todayTasks, uniqueSubjects,
    } = view;

    return (
        <div className="w-full">
            <Motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 mx-2 overflow-hidden rounded-[1.75rem] border border-sage-100 bg-white/80 shadow-sm backdrop-blur dark:border-white/10 dark:bg-void-900/70"
            >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                        <div className="app-eyebrow flex items-center gap-2"><Target size={15} />Tasks</div>
                        <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
                            <span className="text-3xl font-bold leading-none text-sage-950 dark:text-bone-100">{allCount}</span>
                            <span className="pb-1 text-sm font-bold text-sage-500 dark:text-bone-200/60">active</span>
                        </div>
                    </div>
                    <div className="grid min-w-0 grid-cols-3 gap-2 sm:w-[23rem]">
                        <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] px-3 py-2"><div className="app-eyebrow text-[var(--color-muted)]">Today</div><div className="text-xl font-bold text-[var(--color-ink)]">{todayTasks.length}</div></div>
                        <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] px-3 py-2"><div className="app-eyebrow text-[var(--color-muted)]">Chunked</div><div className="text-xl font-bold text-[var(--color-ink)]">{chunkedCount}</div></div>
                        <div className="rounded-2xl border border-[var(--color-rule)] bg-[var(--color-card)] px-3 py-2"><div className="app-eyebrow text-[var(--color-muted)]">Late</div><div className="text-xl font-bold text-[var(--color-error)]">{overdueCount}</div></div>
                    </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-sage-500 via-amber-400 to-sky-500" />
            </Motion.div>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
                <div className="min-w-0 flex-1">
                    <div className="mb-6 px-2">
                        <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                                <h2 className="app-section-title">All tasks</h2>
                                <div className="relative z-20" ref={sortRef}>
                                    <button
                                        onClick={() => setShowSort(!showSort)}
                                        className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all ${showSort ? 'bg-sage-600 border-sage-600 text-white shadow-md' : 'bg-white border-sage-200 text-sage-700 hover:border-sage-300 hover:bg-sage-50 dark:bg-void-800 dark:border-white/10 dark:text-bone-200'}`}
                                    >
                                        <ArrowUpDown size={12} />
                                        <span className="capitalize">{sortBy === 'deadline' ? 'Due Date' : sortBy === 'chunkTime' ? 'Chunk Time' : sortBy}</span>
                                        <ChevronDown size={12} className={`transition-transform ${showSort ? 'rotate-180' : ''}`} />
                                    </button>
                                    <AnimatePresence>
                                        {showSort && (
                                            <Motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} className="absolute top-full left-0 mt-2 w-36 overflow-hidden rounded-2xl border border-sage-100 bg-white shadow-2xl z-30 dark:border-white/10 dark:bg-void-900">
                                                {[['deadline', 'Due Date'], ['difficulty', 'Difficulty'], ['newest', 'Newest'], ['chunkTime', 'Chunk Time']].map(([value, label]) => (
                                                    <button key={value} onClick={() => { setSortBy(value); setShowSort(false); }} className={`w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-sage-50 dark:hover:bg-void-800 ${sortBy === value ? 'text-sage-700' : 'text-slate-500 dark:text-bone-300'}`}>{label}</button>
                                                ))}
                                            </Motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                            <span className="rounded-full bg-sage-50 px-3 py-1.5 text-xs font-bold text-sage-600 dark:bg-void-800 dark:text-bone-200">{sortedTasks.length} shown</span>
                        </div>
                        {uniqueSubjects.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-4 px-1">
                                <button onClick={() => setSelectedSubject('all')} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedSubject === 'all' ? 'bg-sage-600 text-white shadow-md shadow-sage-600/20' : 'bg-white text-sage-600 ring-1 ring-sage-100 hover:bg-sage-50'}`}>All ({allCount})</button>
                                {subjectCounts.map((subject) => subject.count > 0 && (
                                    <button key={subject.name} onClick={() => setSelectedSubject(subject.name)} className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${selectedSubject === subject.name ? 'shadow-md scale-[1.02]' : 'hover:opacity-80 ring-1 ring-white/60'}`} style={{ backgroundColor: selectedSubject === subject.name ? subject.color.color : subject.color.bgColor, color: selectedSubject === subject.name ? 'white' : subject.color.color }}>
                                        {subject.name} ({subject.count})
                                    </button>
                                ))}
                            </div>
                        )}
                        <Motion.div layout className="relative">
                            <AnimatePresence mode="popLayout">
                                {sortedTasks.map((task) => <TaskListRow key={task.id} task={task} isSelected={String(selectedTaskId) === String(task.id)} onComplete={onCompleteTask} onDelete={onDeleteTask} onRequestAIHelp={onRequestAIHelp} onRestore={onRestoreTask} onSelect={handleSelectTask} onStartFocus={setFocusTask} />)}
                            </AnimatePresence>
                            {sortedTasks.length === 0 && <div className="rounded-2xl border border-dashed border-sage-200 bg-white/70 p-8 text-center text-sm font-medium text-sage-500 dark:border-white/10 dark:bg-void-900/60 dark:text-bone-200/60">No tasks.</div>}
                        </Motion.div>
                    </div>
                    {completedTasks.length > 0 && (
                        <div className="rounded-3xl border border-sage-100 bg-white/50 p-3 shadow-sm dark:border-white/10 dark:bg-void-900/40 sm:p-4">
                            <h2 className="app-section-title mb-4 pl-1">Completed</h2>
                            <div className="space-y-3 opacity-75 hover:opacity-100 transition-opacity">
                                {completedTasks.map((task) => <TaskListRow key={`completed-${task.id}`} task={task} isCompleted onComplete={onCompleteTask} onDelete={onDeleteTask} onRequestAIHelp={onRequestAIHelp} onRestore={onRestoreTask} onSelect={handleSelectTask} onStartFocus={setFocusTask} />)}
                            </div>
                        </div>
                    )}
                </div>
                <GardenSidebar view={view} />
            </div>
            <Sheet open={Boolean(focusTask)} onClose={() => setFocusTask(null)} title="Focus" description="Stay with one task.">
                {focusTask && <FocusTimer task={focusTask} onComplete={(minutes) => {
                    const focusSessions = Array.isArray(focusTask.focus_sessions) ? focusTask.focus_sessions : [];
                    onUpdateTask(focusTask.id, { focus_sessions: [...focusSessions, { minutes, endedAt: new Date().toISOString() }] });
                    setFocusTask(null);
                }} />}
            </Sheet>
        </div>
    );
};

export default GardenContent;
