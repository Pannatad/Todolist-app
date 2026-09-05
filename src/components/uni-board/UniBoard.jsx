import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CalendarDays, GraduationCap, LayoutDashboard } from 'lucide-react';
import { useTask } from '../../context/TaskContext';
import { buildUniBoardViewModel } from '../../utils/uniBoardItems';
import { toast } from '../../ui/Toast';
import { SegmentedControl } from '../../ui';
import MagicSchedule from '../magic/MagicSchedule';
import Agenda from './Agenda';
import ActionPanel from './ActionPanel';
import ClassScheduleSheet from './ClassScheduleSheet';
import { AGENDA_RANGE_OPTIONS } from './constants';
import DetailsSheet from './DetailsSheet';
import Links from './Links';
import MilestoneTimeline from './MilestoneTimeline';
import QuickAdd from './QuickAdd';
import { useLinks } from '../../context/LinksContext';
import { isUniversityScheduleItem, withUniversityScheduleDefaults } from './classSchedule';
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
  const [view, setView] = useState('overview');
  const [classSheetOpen, setClassSheetOpen] = useState(false);

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
  const classScheduleItems = useMemo(
    () => scheduleItems.filter(isUniversityScheduleItem),
    [scheduleItems],
  );

  const addClassScheduleItem = (item) => addScheduleItem(withUniversityScheduleDefaults(item));

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
          {view === 'overview' ? (
            <QuickAdd addTask={addTask} addScheduleItem={addScheduleItem} />
          ) : (
            <button type="button" className="uni-board-add-trigger" onClick={() => setClassSheetOpen(true)}>
              <CalendarDays size={17} aria-hidden="true" />
              <span>Manage classes</span>
            </button>
          )}
        </div>
      </header>

      <SegmentedControl
        className="uni-board-view-tabs"
        items={[
          { id: 'overview', label: 'Overview', icon: LayoutDashboard, controls: 'uni-board-overview' },
          { id: 'class-schedule', label: 'Class schedule', icon: CalendarDays, controls: 'uni-board-class-schedule' },
        ]}
        value={view}
        onChange={setView}
        ariaLabel="University view"
      />

      {loadError && (
        <div className="uni-board-load-error" role="alert">
          <AlertCircle size={18} aria-hidden="true" />
          <span>Some university items could not be loaded.</span>
          <button type="button" onClick={handleRetry}>Retry</button>
        </div>
      )}

      {view === 'overview' && !isLoading && !isLinksLoading && !hasRecords && (
        <p className="uni-board-full-empty">Add your first deadline, exam, or event.</p>
      )}

      {view === 'overview' ? (
        <div id="uni-board-overview" role="tabpanel" aria-label="University overview">
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
        </div>
      ) : (
        <section id="uni-board-class-schedule" className="uni-board-class-schedule" role="tabpanel" aria-label="Class schedule">
          <MagicSchedule
            events={classScheduleItems}
            tasks={[]}
            onAddEvent={addClassScheduleItem}
            onUpdateEvent={updateScheduleItem}
            onDeleteEvent={deleteScheduleItem}
            eyebrow="Class schedule"
            description="Add your real classes, repeat them each week, and see where your time goes."
          />
        </section>
      )}

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

      <ClassScheduleSheet
        open={classSheetOpen}
        onClose={() => setClassSheetOpen(false)}
        items={classScheduleItems}
        onAdd={addClassScheduleItem}
        onUpdate={updateScheduleItem}
        onDelete={deleteScheduleItem}
      />
    </div>
  );
};

export default UniBoard;
