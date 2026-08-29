import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, GraduationCap } from 'lucide-react';
import { useTask } from '../../context/TaskContext';
import { buildUniBoardViewModel } from '../../utils/uniBoardItems';
import { toast } from '../../ui/Toast';
import Agenda from './Agenda';
import ActionPanel from './ActionPanel';
import { AGENDA_RANGE_OPTIONS } from './constants';
import DetailsSheet from './DetailsSheet';
import Links from './Links';
import MilestoneTimeline from './MilestoneTimeline';
import QuickAdd from './QuickAdd';
import { useLinks } from '../../context/LinksContext';
import './uni-board.css';

const skeletonSections = [1, 2, 3];

const UniBoard = () => {
  const context = useTask();
  const { links = [], isLoading: isLinksLoading = false } = useLinks();
  const {
    tasks = [],
    scheduleItems = [],
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem,
    isLoading = false,
    loadError = null,
    refreshData = async () => {},
  } = context;
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [selectedItem, setSelectedItem] = useState(null);
  const [actionView, setActionView] = useState('tasks');
  const [agendaRange, setAgendaRange] = useState('14');

  useEffect(() => {
    const timer = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const now = useMemo(() => new Date(nowTick), [nowTick]);
  const agendaDays = AGENDA_RANGE_OPTIONS.find((option) => option.id === agendaRange)?.days || 14;
  const viewModel = useMemo(() => buildUniBoardViewModel({
    tasks,
    scheduleItems,
    now,
    agendaDays,
    milestoneDays: 120,
  }), [agendaDays, now, scheduleItems, tasks]);
  const agendaGroups = viewModel?.agendaGroups || [];
  const outstandingTasks = viewModel?.outstandingTasks || [];
  const assessments = viewModel?.assessments || [];
  const milestones = viewModel?.milestones || [];
  const hasRecords = agendaGroups.length + outstandingTasks.length + assessments.length + milestones.length + links.length > 0;

  const handleComplete = async (item) => {
    try {
      const result = await completeTask(item.id);
      if (!result) throw new Error('This task is no longer available.');
    } catch (error) {
      toast(error?.message || 'Could not update this task.', { tone: 'error' });
    }
  };

  const handleRetry = async () => {
    try {
      await refreshData();
    } catch (error) {
      toast(error?.message || 'Could not refresh university items.', { tone: 'error' });
    }
  };

  return (
    <div className="uni-board">
      <header className="uni-board-header">
        <div className="uni-board-header__title">
          <span className="uni-board-header__icon" aria-hidden="true"><GraduationCap size={20} /></span>
          <div>
            <p className="uni-board-kicker">University workspace</p>
            <h1>Uni-board</h1>
          </div>
        </div>
        <div className="uni-board-header__actions">
          <p className="uni-board-header__date">{new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(now)}</p>
          <QuickAdd addTask={addTask} addScheduleItem={addScheduleItem} />
        </div>
      </header>

      {loadError && (
        <div className="uni-board-load-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>Some university items could not be loaded.</span>
          <button type="button" onClick={handleRetry}>Retry</button>
        </div>
      )}

      {!isLoading && !isLinksLoading && !hasRecords && (
        <p className="uni-board-full-empty">Add your first deadline, exam, or event.</p>
      )}

      <div className="uni-board-main-grid">
        <Agenda
          groups={agendaGroups}
          onSelect={setSelectedItem}
          isLoading={isLoading}
          now={now}
          range={agendaRange}
          onRangeChange={setAgendaRange}
        />
        <ActionPanel
          tasks={outstandingTasks}
          assessments={assessments}
          selectedView={actionView}
          onViewChange={setActionView}
          onSelect={setSelectedItem}
          onComplete={handleComplete}
          isLoading={isLoading}
          now={now}
        />
      </div>

      <Links />

      <MilestoneTimeline items={milestones} onSelect={setSelectedItem} now={now} />

      {isLoading && (
        <div className="uni-board-visually-hidden" aria-live="polite">
          {skeletonSections.length} university sections loading
        </div>
      )}

      <DetailsSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        updateTask={updateTask}
        deleteTask={deleteTask}
        updateScheduleItem={updateScheduleItem}
        deleteScheduleItem={deleteScheduleItem}
      />
    </div>
  );
};

export default UniBoard;
