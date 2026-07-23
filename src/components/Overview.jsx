/* eslint-disable react-hooks/purity */
import { useEffect, useMemo, useState } from 'react';
import { Check, CheckCircle2, Circle, Sparkles, Sunrise } from 'lucide-react';
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
import MagicBox from './MagicBox';
import NowCard from './today/NowCard';
import TodaySchedule from './today/TodaySchedule';
import { useAgentCommands } from './today/useAgentCommands';

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
  const todayStart = useMemo(() => new Date(now.getFullYear(), now.getMonth(), now.getDate()), [now]);
  const todayEnd = useMemo(() => new Date(todayStart.getFullYear(), todayStart.getMonth(), todayStart.getDate() + 1), [todayStart]);
  const todayKey = useMemo(() => toLocalDateKey(now), [now]);

  const activeTasks = useMemo(() => (tasks || []).filter(isTaskActive), [tasks]);
  const todaySchedule = useMemo(() => getScheduleItemsForDate(scheduleItems || [], now), [now, scheduleItems]);

  // One sorted list of {item, start, end} drives the Now card and the timeline.
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

  const dueTasks = useMemo(() => (
    activeTasks
      .filter((task) => task.deadline && new Date(task.deadline) < todayEnd)
      .sort((left, right) => new Date(left.deadline) - new Date(right.deadline))
      .slice(0, 6)
  ), [activeTasks, todayEnd]);

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

  const greeting = now.getHours() < 12 ? 'Morning' : now.getHours() < 18 ? 'Afternoon' : 'Evening';
  const firstName = profile?.nickname || profile?.name || user?.email?.split('@')[0] || 'there';
  const blocksLeft = entries.filter((entry) => entry.end > now).length;
  const summaryLine = [
    now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' }),
    blocksLeft ? `${blocksLeft} ${blocksLeft === 1 ? 'block' : 'blocks'} left` : null,
    dueTasks.length ? `${dueTasks.length} due` : null,
  ].filter(Boolean).join(' · ');

  const markHabit = (habit) => logHabit(habit.id, todayKey, habit.type === 'count' || habit.type === 'duration' ? habit.target || 1 : 1, true);
  const openTask = (task) => { setSelectedTask(task); setShowTaskModal(true); };
  const openSchedule = (item) => { if (item) { setSelectedScheduleItem(item); setShowScheduleModal(true); } else onNavigate('schedule'); };
  const closeSchedule = () => { setShowScheduleModal(false); setSelectedScheduleItem(null); };
  const closeTask = () => { setShowTaskModal(false); setSelectedTask(null); };

  const urgency = (task) => {
    const deadline = new Date(task.deadline);
    return deadline < todayStart ? 'Overdue' : 'Today';
  };

  return (
    <div className="h-full overflow-y-auto bg-transparent p-2 custom-scrollbar md:p-4">
      <div className="mx-auto max-w-xl space-y-3 pb-6">

        {/* Header: greeting + one factual line, ritual & brief kept small */}
        <header className="flex items-start justify-between gap-3 px-1 pt-1">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold tracking-tight text-[var(--color-ink)] sm:text-xl">{greeting}, {firstName}</h1>
            <p className="mt-0.5 text-sm font-medium text-[var(--color-muted)]">{summaryLine}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => askAgent('Summarize my day.')}
              className="rounded-full border border-[var(--color-rule)] bg-[var(--color-card)] px-3.5 py-2 text-xs font-semibold text-[var(--color-ink)] shadow-[var(--shadow-card)] transition-transform active:scale-95"
            >
              Brief
            </button>
            <button
              type="button"
              onClick={() => setShowDailyRitual(true)}
              title={ritualCompletedAt ? 'Ritual done' : 'Daily ritual'}
              aria-label={ritualCompletedAt ? 'Ritual done' : 'Start daily ritual'}
              className={`grid h-9 w-9 place-items-center rounded-full border shadow-[var(--shadow-card)] transition-transform active:scale-95 ${
                ritualCompletedAt
                  ? 'border-transparent bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                  : 'border-[var(--color-rule)] bg-[var(--color-card)] text-[var(--color-ink)]'
              }`}
            >
              {ritualCompletedAt ? <CheckCircle2 size={17} /> : <Sunrise size={17} />}
            </button>
          </div>
        </header>

        <NowCard
          current={currentEntry}
          next={nextEntry}
          now={now}
          onOpen={openSchedule}
          onPlanDay={() => askAgent('Plan my day.')}
        />

        {/* Assistant: at most two quiet one-liners, no card chrome */}
        {suggestions.map((suggestion) => (
          <div key={suggestion.id} className="flex items-center gap-2.5 rounded-2xl bg-[var(--color-accent-soft)] px-4 py-2.5">
            <Sparkles size={14} className="shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-sm leading-5 text-[var(--color-ink)]">{suggestion.message}</p>
            {suggestion.prompt && (
              <button
                type="button"
                onClick={() => askAgent(suggestion.prompt)}
                className="shrink-0 text-xs font-bold text-[var(--color-accent)] transition-transform active:scale-95"
              >
                Handle
              </button>
            )}
          </div>
        ))}

        <MagicBox />

        <TodaySchedule entries={entries} now={now} onOpen={openSchedule} />

        {/* Due today: complete with one tap on the circle */}
        {dueTasks.length > 0 && (
          <section>
            <div className="mb-1.5 flex items-baseline justify-between px-4">
              <h2 className="text-sm font-semibold text-[var(--color-muted)]">Due today</h2>
              <span className="text-xs font-medium text-[var(--color-muted)]">{dueTasks.length}</span>
            </div>
            <div className="ui-card p-2">
              {dueTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-[var(--color-paper-2)]">
                  <button
                    type="button"
                    onClick={() => completeTask(task.id)}
                    aria-label={`Complete "${task.title}"`}
                    className="group shrink-0 text-[var(--color-muted)] transition-transform active:scale-90"
                  >
                    <Circle size={20} className="group-hover:hidden" />
                    <Check size={20} className="hidden text-[var(--color-accent)] group-hover:block" />
                  </button>
                  <button type="button" onClick={() => openTask(task)} className="min-w-0 flex-1 text-left">
                    <span className="block truncate text-sm font-semibold text-[var(--color-ink)]">{task.title}</span>
                    {task.subject && <span className="block truncate text-xs text-[var(--color-muted)]">{task.subject}</span>}
                  </button>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold ${
                    urgency(task) === 'Overdue'
                      ? 'bg-[color-mix(in_oklch,var(--color-error)_12%,transparent)] text-[var(--color-error)]'
                      : 'bg-[var(--color-paper-2)] text-[var(--color-muted)]'
                  }`}>
                    {urgency(task)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Habits: one-tap pills */}
        {habitItems.length > 0 && (
          <section>
            <div className="mb-1.5 flex items-baseline justify-between px-4">
              <h2 className="text-sm font-semibold text-[var(--color-muted)]">Habits</h2>
              <span className="text-xs font-medium text-[var(--color-muted)]">{habitsDone} of {habitItems.length}</span>
            </div>
            <div className="ui-card flex flex-wrap gap-2 p-3">
              {habitItems.map((habit) => (
                <button
                  key={habit.id}
                  type="button"
                  onClick={() => !habit.completed && markHabit(habit)}
                  disabled={habit.completed}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-all active:scale-95 ${
                    habit.completed
                      ? 'bg-[var(--color-accent-soft)] text-[var(--color-accent)]'
                      : 'border border-[var(--color-rule)] bg-[var(--color-card-raised)] text-[var(--color-ink)] shadow-[var(--shadow-card)] hover:border-[var(--color-accent)]'
                  }`}
                >
                  {habit.completed && <Check size={14} aria-hidden="true" />}
                  {habit.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <DailyRitualModal isOpen={showDailyRitual} onClose={() => setShowDailyRitual(false)} profile={profile} user={user} tasks={tasks} scheduleItems={scheduleItems} habits={todaysHabits} getHabitLog={getHabitLog} logHabit={logHabit} addScheduleItem={addScheduleItem} onOpenTask={openTask} onNavigate={onNavigate} onAskAgent={(action) => { sendMessage(action); openSidebar(); }} onComplete={setRitualCompletedAt} />
        <ScheduleEventModal isOpen={showScheduleModal} onClose={closeSchedule} onSave={async (data) => { if (selectedScheduleItem?.id) await updateScheduleItem(selectedScheduleItem.id, data); else await addScheduleItem(data); closeSchedule(); }} onDelete={selectedScheduleItem?.id ? async (_id, options) => { await deleteScheduleItem(selectedScheduleItem.id, options); closeSchedule(); } : null} event={selectedScheduleItem} selectedDate={new Date()} />
        <TaskModal key={selectedTask?.id || 'new'} isOpen={showTaskModal} onClose={closeTask} onSave={(data) => { if (selectedTask?.id) updateTask(selectedTask.id, data); else addTask(data); closeTask(); }} initialData={selectedTask} mode={selectedTask ? 'edit' : 'create'} />
        <AgentConfirmationModal isOpen={agent.showAgentModal} onClose={agent.clearAgent} onConfirm={agent.execute} onClarifyResponse={(response) => { agent.clearAgent(); agent.submit(response); }} onEditPrompt={(prompt) => { agent.clearAgent(); agent.setOriginalPrompt(prompt); agent.submit(prompt); }} onNavigate={onNavigate} actionPlan={agent.agentPlan} isExecuting={agent.isExecutingActions} originalPrompt={agent.originalPrompt} />
      </div>
    </div>
  );
};

export default Overview;
