/* eslint-disable react-hooks/purity */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, MessageCircle, Sunrise } from 'lucide-react';
import { useTask } from '../context/TaskContext';
import { useGoal } from '../context/GoalContext';
import { useAuth } from '../context/AuthContext';
import { useUserProfile } from '../context/UserProfileContext';
import { useAgentMemory } from '../context/AgentMemoryContext';
import { useProject } from '../context/ProjectContext';
import { useHabit } from '../context/HabitContext';
import { useChatContext } from '../context/ChatContext';
import { useScheduleTemplates } from '../context/ScheduleTemplateContext';
import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences';
import { isTaskActive } from '../utils/taskState';
import { buildAssistantSuggestions } from '../services/assistantSuggestions';
import ScheduleEventModal from './ScheduleEventModal';
import TaskModal from './TaskModal';
import AgentConfirmationModal from './AgentConfirmationModal';
import DailyRitualModal from './DailyRitualModal';
import NowCard from './today/NowCard';
import TodaySchedule from './today/TodaySchedule';
import TodayDueTasks from './today/TodayDueTasks';
import TodayHabitsSummary from './today/TodayHabitsSummary';
import { useAgentCommands } from './today/useAgentCommands';
import { getCurrentTimeValue } from './habitValueUtils';
import { BarButton, PageHeader } from '../ui';
import './today/today.css';

const Overview = ({ onNavigate }) => {
  const { tasks, addTask, updateTask, deleteTask, completeTask, scheduleItems, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useTask();
  const { dailyHighlights, goals } = useGoal();
  const { user } = useAuth();
  const { profile, getProfileSummary } = useUserProfile();
  const { logInteraction, getMemorySummary, getRecentInteractions, generatePatternInsights } = useAgentMemory();
  const { projects } = useProject();
  const { habits, logHabit, getHabitsForDate, getHabitLog } = useHabit();
  const { sendMessage, openSidebar } = useChatContext();
  const { templates: scheduleTemplates, saveTemplate, deleteTemplate } = useScheduleTemplates();

  const [nowTick, setNowTick] = useState(Date.now());
  const [selectedScheduleItem, setSelectedScheduleItem] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showDailyRitual, setShowDailyRitual] = useState(false);
  const [ritualCompletedAt, setRitualCompletedAt] = useState(null);

  const now = useMemo(() => new Date(nowTick), [nowTick]);
  const todayKey = useMemo(() => toLocalDateKey(now), [now]);

  const activeTasks = useMemo(() => (tasks || []).filter(isTaskActive), [tasks]);
  const todaySchedule = useMemo(() => getScheduleItemsForDate(scheduleItems || [], now), [now, scheduleItems]);

  // One sorted list of {item, start, end} drives the hero and the thread.
  const entries = useMemo(() => (
    todaySchedule
      .map((item) => {
        const start = item.displayTime ? new Date(item.displayTime) : new Date(item.startTime || item.start_time);
        return { item, start, end: new Date(start.getTime() + (item.duration || 60) * 60000) };
      })
      .filter((entry) => !Number.isNaN(entry.start.getTime()))
      .sort((left, right) => left.start - right.start)
  ), [todaySchedule]);
  const currentEntry = useMemo(() => entries.find((entry) => now >= entry.start && now < entry.end) || null, [entries, now]);
  const nextEntry = useMemo(() => entries.find((entry) => entry.start > now) || null, [entries, now]);

  const todaysHabits = useMemo(() => getHabitsForDate(now), [getHabitsForDate, now]);
  const habitItems = useMemo(() => todaysHabits.map((habit) => ({
    ...habit,
    completed: getHabitLog(habit.id, todayKey)?.completed === true,
  })), [getHabitLog, todayKey, todaysHabits]);
  const habitsDone = habitItems.filter((habit) => habit.completed).length;

  const tasksDueToday = useMemo(() => (
    activeTasks
      .filter((task) => {
        const deadline = task.deadline ? new Date(task.deadline) : null;
        return deadline && !Number.isNaN(deadline.getTime()) && toLocalDateKey(deadline) === todayKey;
      })
      .sort((left, right) => new Date(left.deadline) - new Date(right.deadline))
  ), [activeTasks, todayKey]);

  const suggestions = useMemo(
    () => buildAssistantSuggestions({ scheduleToday: todaySchedule, tasks, habitItems, now }),
    [todaySchedule, tasks, habitItems, now]
  );

  const askAgent = (prompt) => { sendMessage(prompt); openSidebar(); };
  const agent = useAgentCommands({ addScheduleItem, addTask, completeTask, dailyHighlights, deleteScheduleItem, deleteTask, deleteTemplate, getMemorySummary, getProfileSummary, getRecentInteractions, goals, habits, logHabit, logInteraction, onNavigate, profile, projects, saveTemplate, scheduleItems, scheduleTemplates, tasks, updateScheduleItem, updateTask, user });

  useEffect(() => {
    setNowTick(Date.now());
    const timer = window.setInterval(() => setNowTick(Date.now()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    try { setRitualCompletedAt(localStorage.getItem(`daily-ritual-completed-${todayKey}`)); } catch { setRitualCompletedAt(null); }
  }, [todayKey]);
  useEffect(() => {
    if (tasks?.length || scheduleItems?.length) generatePatternInsights({ tasks, scheduleItems, habits, sleepData: [] });
  }, [generatePatternInsights, habits, scheduleItems, tasks]);

  const markHabit = (habit) => logHabit(
    habit.id,
    todayKey,
    habit.type === 'time' ? getCurrentTimeValue() : habit.type === 'score' ? 3 : habit.type === 'count' || habit.type === 'duration' ? habit.target || 1 : 1,
    true,
  );
  const openTask = (task) => { setSelectedTask(task); setShowTaskModal(true); };
  const openSchedule = (item) => { if (item) { setSelectedScheduleItem(item); setShowScheduleModal(true); } else onNavigate('schedule'); };
  const closeSchedule = () => { setShowScheduleModal(false); };
  // Keep the task until the next open so the sheet can animate out with its content.
  const closeTask = () => { setShowTaskModal(false); };

  const secretary = suggestions.find((suggestion) => suggestion.prompt)
    || { id: 'brief', message: 'Brief me on today', prompt: 'Summarize my day.' };
  const dateLabel = now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="today-page">
      <PageHeader
        eyebrow={dateLabel}
        title="Today"
        actions={(
          <BarButton
            icon={ritualCompletedAt ? CheckCircle2 : Sunrise}
            label={ritualCompletedAt ? 'Daily ritual done' : 'Start daily ritual'}
            className={ritualCompletedAt ? 'is-active' : ''}
            onClick={() => setShowDailyRitual(true)}
          />
        )}
      />

      <NowCard
        current={currentEntry}
        next={nextEntry}
        now={now}
        onOpen={openSchedule}
        onPlanDay={() => askAgent('Plan my day.')}
      />

      <button type="button" className="today-secretary" onClick={() => askAgent(secretary.prompt)}>
        <span className="today-secretary__icon" aria-hidden="true"><MessageCircle size={17} strokeWidth={2.2} /></span>
        <span className="today-secretary__text">{secretary.message}</span>
        <ChevronRight size={18} className="today-secretary__chevron" aria-hidden="true" />
      </button>

      <TodaySchedule entries={entries} now={now} onOpen={openSchedule} />

      <TodayDueTasks tasks={tasksDueToday} onCompleteTask={completeTask} onOpenTask={openTask} />

      {habitItems.length > 0 && (
        <TodayHabitsSummary habits={habitItems} completedCount={habitsDone} onComplete={markHabit} />
      )}

      <DailyRitualModal isOpen={showDailyRitual} onClose={() => setShowDailyRitual(false)} profile={profile} tasks={tasks} scheduleItems={scheduleItems} habits={todaysHabits} getHabitLog={getHabitLog} logHabit={logHabit} addScheduleItem={addScheduleItem} onOpenTask={openTask} onNavigate={onNavigate} onAskAgent={(action) => { sendMessage(action); openSidebar(); }} onComplete={setRitualCompletedAt} />
      <ScheduleEventModal isOpen={showScheduleModal} onClose={closeSchedule} onSave={async (data) => { if (selectedScheduleItem?.id) await updateScheduleItem(selectedScheduleItem.id, data); else await addScheduleItem(data); closeSchedule(); }} onDelete={selectedScheduleItem?.id ? async (_id, options) => { await deleteScheduleItem(selectedScheduleItem.id, options); closeSchedule(); } : null} event={selectedScheduleItem} selectedDate={new Date()} />
      <TaskModal key={selectedTask?.id || 'new'} isOpen={showTaskModal} onClose={closeTask} onSave={(data) => { if (selectedTask?.id) updateTask(selectedTask.id, data); else addTask(data); closeTask(); }} initialData={selectedTask} mode={selectedTask ? 'edit' : 'create'} />
      <AgentConfirmationModal isOpen={agent.showAgentModal} onClose={agent.clearAgent} onConfirm={agent.execute} onClarifyResponse={(response) => { agent.clearAgent(); agent.submit(response); }} onEditPrompt={(prompt) => { agent.clearAgent(); agent.setOriginalPrompt(prompt); agent.submit(prompt); }} onNavigate={onNavigate} actionPlan={agent.agentPlan} isExecuting={agent.isExecutingActions} originalPrompt={agent.originalPrompt} />
    </div>
  );
};

export default Overview;
