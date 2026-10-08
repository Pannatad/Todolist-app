import { useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTask } from '../../context/TaskContext';
import { buildWeeklySummary } from '../../utils/weeklySummary';
import { toast } from '../../ui/Toast';
import { weekLabel } from './weeklyFormat';
import WeekTasks from './WeekTasks';
import WeekSchedule from './WeekSchedule';
import WeekMilestones from './WeekMilestones';
import WeekTaskSheet from './WeekTaskSheet';

const SectionSkeleton = ({ title, className }) => (
  <section className={className} aria-label={`Loading ${title}`} aria-busy="true">
    <div className="week-section-heading"><h2>{title}</h2></div>
    <div className="week-skeleton" aria-hidden="true"><span /><span /><span /></div>
  </section>
);

const LoadFailure = ({ title, className, onRetry }) => (
  <section className={className} aria-label={title}>
    <div className="week-section-heading"><h2>{title}</h2></div>
    <div className="week-load-error" role="alert"><AlertCircle size={18} aria-hidden="true" /><p>Could not load this section.</p><button type="button" className="week-text-button" onClick={onRetry}>Retry</button></div>
  </section>
);

const WeeklySummary = ({ now, onOpenSchedule }) => {
  const { tasks, scheduleItems, isLoading, loadError, refreshData, updateTask, deleteTask } = useTask();
  const model = useMemo(() => buildWeeklySummary({ tasks, scheduleItems, now }), [tasks, scheduleItems, now]);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [pendingIds, setPendingIds] = useState(new Set());
  const selectedTask = tasks.find((task) => task.id === selectedTaskId);
  const taskFailure = Boolean(loadError && (!loadError.sources || loadError.sources.tasks));
  const scheduleFailure = Boolean(loadError && (!loadError.sources || loadError.sources.schedule));
  const complete = async (task) => {
    if (pendingIds.has(task.id)) return;
    setPendingIds((current) => new Set(current).add(task.id));
    try {
      // The summary's checkbox finishes seeds as well as tasks already in progress.
      const result = await updateTask(task.id, { completed: true, completedAt: new Date().toISOString() });
      if (!result) throw new Error('This task could not be completed.');
    } catch (failure) { toast(failure.message || 'Could not complete this task.', { tone: 'error' }); }
    finally {
      setPendingIds((current) => { const next = new Set(current); next.delete(task.id); return next; });
    }
  };
  const retry = async () => {
    try { await refreshData(); }
    catch (failure) { toast(failure.message || 'Could not refresh your week.', { tone: 'error' }); }
  };
  const openTask = (task) => setSelectedTaskId(task.id);
  const openMilestone = (entry) => entry.source === 'task' ? openTask(entry.record) : onOpenSchedule(entry.record);
  const totals = !isLoading ? [
    !taskFailure && `${model.unfinishedTaskCount} ${model.unfinishedTaskCount === 1 ? 'task' : 'tasks'} due`,
    !scheduleFailure && `${model.commitmentCount} ${model.commitmentCount === 1 ? 'commitment' : 'commitments'}`,
  ].filter(Boolean).join(' · ') : '';

  return (
    <div className="weekly-summary">
      <header className="week-header"><h1>This week</h1><p className="week-range">{weekLabel(model.weekStart, model.weekEnd)}</p>{totals && <p className="week-totals">{totals}</p>}</header>
      <div className="week-content" key={model.weekStart.toISOString()}>
        {isLoading ? <SectionSkeleton title="Tasks due this week" className="week-tasks" /> : taskFailure ? <LoadFailure title="Tasks due this week" className="week-tasks" onRetry={retry} /> : <WeekTasks groups={model.taskGroups} total={model.taskCount} onOpen={openTask} onComplete={complete} pendingIds={pendingIds} />}
        {isLoading ? <SectionSkeleton title="Upcoming milestones" className="week-milestones" /> : taskFailure || scheduleFailure ? <LoadFailure title="Upcoming milestones" className="week-milestones" onRetry={retry} /> : <WeekMilestones items={model.milestones} onOpen={openMilestone} />}
        {isLoading ? <SectionSkeleton title="Fixed schedule" className="week-schedule" /> : scheduleFailure ? <LoadFailure title="Fixed schedule" className="week-schedule" onRetry={retry} /> : <WeekSchedule days={model.days} onOpen={onOpenSchedule} />}
      </div>
      {selectedTask && <WeekTaskSheet key={selectedTask.id} task={selectedTask} onClose={() => setSelectedTaskId(null)} onSave={updateTask} onDelete={deleteTask} />}
    </div>
  );
};

export default WeeklySummary;
