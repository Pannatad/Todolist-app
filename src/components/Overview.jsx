/* eslint-disable react-hooks/purity */
import { useEffect, useMemo, useState } from 'react';
import { Check, Repeat2 } from 'lucide-react';
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
import { Sparkles } from 'lucide-react';
import ScheduleEventModal from './ScheduleEventModal';
import TaskModal from './TaskModal';
import AgentConfirmationModal from './AgentConfirmationModal';
import DailyRitualModal from './DailyRitualModal';
import TodayTimeline from './today/TodayTimeline';
import { makeScheduleBriefing } from './today/ScheduleBriefing';
import { useAgentCommands } from './today/useAgentCommands';
import { Card, Chip, ListRow } from '../ui';

const urgencyFor = (task, now, start, end) => {
  const deadline = task?.deadline && new Date(task.deadline);
  if (!deadline || Number.isNaN(deadline)) return 'No date';
  if (deadline < start) return 'Overdue';
  if (deadline < end) return 'Today';
  return (deadline - now) / 3600000 <= 72 ? 'Soon' : 'Upcoming';
};

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
  const todaysHabits = useMemo(() => getHabitsForDate(now), [getHabitsForDate, now]);
  const habitItems = useMemo(() => todaysHabits.map((habit) => ({ ...habit, log: getHabitLog(habit.id, todayKey), completed: getHabitLog(habit.id, todayKey)?.completed === true })), [getHabitLog, todayKey, todaysHabits]);
  const priorityTasks = useMemo(() => activeTasks.filter((task) => task.deadline).sort((left, right) => new Date(left.deadline) - new Date(right.deadline)).filter((task) => new Date(task.deadline) < todayEnd).slice(0, 6), [activeTasks, todayEnd]);
  const commandCenterScheduleItems = useMemo(() => [...todaySchedule].sort((left, right) => new Date(left.displayTime || left.startTime || left.start_time) - new Date(right.displayTime || right.startTime || right.start_time)), [todaySchedule]);
  const briefing = useMemo(() => makeScheduleBriefing(commandCenterScheduleItems, now), [commandCenterScheduleItems, now]);
  const spotlight = useMemo(() => {
    const entries = commandCenterScheduleItems.map((item) => { const start = item.displayTime || new Date(item.startTime || item.start_time); const end = new Date(start.getTime() + (item.duration || 60) * 60000); return { item, start, end, isNow: now >= start && now < end }; }).filter((entry) => !Number.isNaN(entry.start));
    const entry = entries.find((item) => item.isNow) || entries.find((item) => item.start > now);
    if (!entry) return { meta: commandCenterScheduleItems.length ? 'Day complete' : 'Free day', title: 'Nothing scheduled right now', description: commandCenterScheduleItems.length ? 'Everything scheduled for today has passed.' : 'Your schedule is clear today.', event: null };
    const label = (value) => value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return { meta: entry.isNow ? 'Now happening' : 'Up next', title: entry.item.title, description: entry.isNow ? `Happening now until ${label(entry.end)}.` : `Next at ${label(entry.start)}.`, rangeLabel: `${label(entry.start)}-${label(entry.end)}`, event: entry.item };
  }, [commandCenterScheduleItems, now]);
  const suggestions = useMemo(() => buildAssistantSuggestions({ scheduleToday: commandCenterScheduleItems, tasks, habitItems, now }), [commandCenterScheduleItems, tasks, habitItems, now]);
  const askAgent = (prompt) => { sendMessage(prompt); openSidebar(); };
  const agent = useAgentCommands({ addScheduleItem, addTask, completeTask, dailyHighlights, deleteScheduleItem, deleteTask, deleteTemplate, getMemorySummary, getProfileSummary, getRecentInteractions, goals, habits, logHabit, logInteraction, onNavigate, profile, projects, saveTemplate, scheduleItems, scheduleTemplates, tasks, updateScheduleItem, updateTask, user });

  useEffect(() => { setNowTick(Date.now()); const timer = window.setInterval(() => setNowTick(Date.now()), 60000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { try { setRitualCompletedAt(localStorage.getItem(`daily-ritual-completed-${todayKey}`)); } catch { setRitualCompletedAt(null); } }, [todayKey]);
  useEffect(() => { if (tasks?.length || scheduleItems?.length) generatePatternInsights({ tasks, scheduleItems, habits, sleepData: [] }); }, [generatePatternInsights, habits, scheduleItems, tasks]);

  const greeting = now.getHours() < 12 ? 'Good Morning' : now.getHours() < 18 ? 'Good Afternoon' : 'Good Evening';
  const markHabit = (habit) => logHabit(habit.id, todayKey, habit.type === 'count' || habit.type === 'duration' ? habit.target || 1 : 1, true);
  const openTask = (task) => { setSelectedTask(task); setShowTaskModal(true); };
  const openSchedule = (item) => { if (item) { setSelectedScheduleItem(item); setShowScheduleModal(true); } else onNavigate('schedule'); };
  const closeSchedule = () => { setShowScheduleModal(false); setSelectedScheduleItem(null); };
  const closeTask = () => { setShowTaskModal(false); setSelectedTask(null); };

  return <div className="h-full space-y-5 overflow-y-auto bg-transparent p-2 custom-scrollbar md:p-4">
    <TodayTimeline displayName={profile?.nickname || user?.email?.split('@')[0] || 'Traveler'} todayLabel={now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} greeting={greeting} ritualCompletedAt={ritualCompletedAt} onOpenRitual={() => setShowDailyRitual(true)} spotlight={spotlight} onOpenSpotlight={() => openSchedule(spotlight.event)} onNavigate={onNavigate} todaySummary={{ eventsToday: todaySchedule.length }} briefing={briefing} items={commandCenterScheduleItems} now={now} onOpenItem={openSchedule} />
    <div className="mx-auto max-w-3xl space-y-4"><Card className="p-4"><div className="mb-2 flex items-center justify-between gap-3"><span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-muted)]"><Sparkles size={14} aria-hidden="true" className="text-[var(--color-accent)]" />Assistant</span><button type="button" onClick={() => askAgent('Summarize my day.')} className="shrink-0 rounded-full bg-[var(--color-accent)] px-3 py-1 text-xs font-semibold text-[var(--color-accent-ink)]">Brief me</button></div><div className="space-y-2">{suggestions.length === 0 ? <p className="text-sm leading-5 text-[var(--color-muted)]">Nothing needs your attention right now.</p> : suggestions.map((suggestion) => <div key={suggestion.id} className="flex items-center justify-between gap-3"><p className="min-w-0 flex-1 text-sm leading-5 text-[var(--color-ink)]">{suggestion.message}</p>{suggestion.prompt && <button type="button" onClick={() => askAgent(suggestion.prompt)} className="shrink-0 rounded-full border border-[var(--color-rule)] bg-[var(--color-card)] px-3 py-1 text-xs font-semibold text-[var(--color-ink)]">Handle it</button>}</div>)}</div></Card><Card className="p-5"><div className="mb-3 flex justify-between"><h2>Habits</h2><span className="text-sm text-[var(--color-muted)]">{habitItems.filter((habit) => habit.completed).length} of {habitItems.length} done</span></div>{habitItems.length === 0 ? <p className="text-sm text-[var(--color-muted)]">No habits today.</p> : habitItems.map((habit) => <ListRow key={habit.id} icon={habit.icon ? null : Repeat2} title={habit.name} trailing={habit.completed ? <Check size={18} aria-label="Done" /> : <button type="button" onClick={() => markHabit(habit)} className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--color-accent-ink)]">Done</button>} />)}</Card><Card className="p-5"><h2 className="mb-3">Tasks</h2>{priorityTasks.length === 0 ? <p className="text-sm text-[var(--color-muted)]">No tasks today.</p> : priorityTasks.slice(0, 5).map((task) => <ListRow key={task.id} title={task.title} subtitle={task.subject} trailing={<Chip>{urgencyFor(task, now, todayStart, todayEnd)}</Chip>} onClick={() => openTask(task)} className="cursor-pointer" />)}</Card><Card className="p-5"><div className="flex items-center justify-between gap-4"><div className="min-w-0"><h2>Daily ritual</h2><p className="mt-1 text-sm text-[var(--color-muted)]">Review your day and set the next step.</p></div><button type="button" onClick={() => setShowDailyRitual(true)} className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm font-semibold text-[var(--color-accent-ink)]">Open</button></div></Card></div>
    <DailyRitualModal isOpen={showDailyRitual} onClose={() => setShowDailyRitual(false)} profile={profile} user={user} tasks={tasks} scheduleItems={scheduleItems} habits={todaysHabits} getHabitLog={getHabitLog} logHabit={logHabit} addScheduleItem={addScheduleItem} onOpenTask={openTask} onNavigate={onNavigate} onAskAgent={(action) => { sendMessage(action); openSidebar(); }} onComplete={setRitualCompletedAt} />
    <ScheduleEventModal isOpen={showScheduleModal} onClose={closeSchedule} onSave={async (data) => { if (selectedScheduleItem?.id) await updateScheduleItem(selectedScheduleItem.id, data); else await addScheduleItem(data); closeSchedule(); }} onDelete={selectedScheduleItem?.id ? async (_id, options) => { await deleteScheduleItem(selectedScheduleItem.id, options); closeSchedule(); } : null} event={selectedScheduleItem} selectedDate={new Date()} />
    <TaskModal key={selectedTask?.id || 'new'} isOpen={showTaskModal} onClose={closeTask} onSave={(data) => { if (selectedTask?.id) updateTask(selectedTask.id, data); else addTask(data); closeTask(); }} initialData={selectedTask} mode={selectedTask ? 'edit' : 'create'} />
    <AgentConfirmationModal isOpen={agent.showAgentModal} onClose={agent.clearAgent} onConfirm={agent.execute} onClarifyResponse={(response) => { agent.clearAgent(); agent.submit(response); }} onEditPrompt={(prompt) => { agent.clearAgent(); agent.setOriginalPrompt(prompt); agent.submit(prompt); }} onNavigate={onNavigate} actionPlan={agent.agentPlan} isExecuting={agent.isExecutingActions} originalPrompt={agent.originalPrompt} />
  </div>;
};

export default Overview;
