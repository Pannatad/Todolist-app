import { useState } from 'react';
import { routeAgentCommand } from '../../services/aiClient';
import { cacheResponse, canHandleLocally, generateCacheKey, generateLocalResponse, getCachedResponse } from '../../services/localAgentHandler';
import { isTaskActive } from '../../utils/taskState';
import { toLocalDateKey, getScheduleItemsForDate } from '../../utils/scheduleOccurrences';
import { log } from '../../utils/log';

export const useAgentCommands = ({ addScheduleItem, addTask, completeTask, dailyHighlights, deleteScheduleItem, deleteTask, getMemorySummary, getProfileSummary, getRecentInteractions, goals, habits, logHabit, logInteraction, onNavigate, profile, projects, scheduleItems, tasks, updateScheduleItem, updateTask, user }) => {
  const [agentPlan, setAgentPlan] = useState(null);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [isExecutingActions, setIsExecutingActions] = useState(false);
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [clarifyConversation, setClarifyConversation] = useState([]);
  const clearAgent = () => { setShowAgentModal(false); setAgentPlan(null); setClarifyConversation([]); setOriginalPrompt(''); };
  const submit = async (input) => {
    if (!originalPrompt) setOriginalPrompt(input);
    try {
      const context = {
        userProfile: { name: profile.nickname || profile.name || user?.email?.split('@')[0] || 'User', role: profile.role, workingHours: profile.workingHours, focusStyle: profile.focusStyle, goals: profile.goals, summary: getProfileSummary() },
        recentTasks: tasks?.filter(isTaskActive).slice(0, 15) || [],
        tasksDueToday: tasks?.filter((task) => isTaskActive(task) && task.deadline && new Date(task.deadline).toDateString() === new Date().toDateString()).map((task) => ({ title: task.title, deadline: task.deadline, difficulty: task.difficulty })) || [],
        recentSchedule: getScheduleItemsForDate(scheduleItems || [], new Date()), projects: projects?.map((project) => ({ id: project.id, title: project.title, status: project.status, progress: project.progress, category: project.category, phases: project.phases?.map((phase) => ({ name: phase.name, deadline: phase.deadline })), taskCount: project.tasks?.length || 0, tasksInProgress: project.tasks?.filter((task) => task.columnId === 'c-2')?.length || 0, tasksDone: project.tasks?.filter((task) => task.columnId === 'c-4')?.length || 0 })) || [],
        habits: habits?.map((habit) => ({ id: habit.id, name: habit.name, frequency: habit.frequency, streak: habit.streak || 0, completedToday: habit.completedToday === true })) || [], visionGoals: Array.isArray(goals) ? goals.slice(0, 10) : [], dailyHighlights: Array.isArray(dailyHighlights) ? dailyHighlights.slice(0, 5) : [], memorySummary: getMemorySummary(profile), recentInteractions: getRecentInteractions(5), conversationHistory: clarifyConversation.length ? clarifyConversation.map((item) => `User: ${item.input}\nAgent: ${item.response}`).join('\n') : null,
      };
      const localType = canHandleLocally(input);
      let plan = localType ? generateLocalResponse(localType, context) : getCachedResponse(generateCacheKey(input));
      if (!plan) { plan = await routeAgentCommand(input, context); cacheResponse(generateCacheKey(input), plan); }
      const clarify = plan.actions?.find((action) => action.type === 'clarify');
      if (clarify) setClarifyConversation((value) => [...value, { input, response: clarify.params.question }]); else setClarifyConversation([]);
      setAgentPlan(plan); setShowAgentModal(true);
    } catch (error) { console.error('Error processing Magic Box input:', error); }
  };
  const execute = async (editedPlan = null) => {
    const plan = editedPlan || agentPlan; if (!plan?.actions) return; setIsExecutingActions(true);
    try {
      for (const action of plan.actions) {
        const { params = {}, type } = action; if (type === 'clarify') continue;
        if (type === 'add_task') await addTask({ title: params.title, difficulty: params.difficulty || 'easy', deadline: params.deadline, subject: params.subject, estimatedTime: params.estimatedTime });
        if (type === 'edit_task' && params.taskId && params.updates) await updateTask(params.taskId, params.updates);
        if (type === 'delete_task' && params.taskId) await deleteTask(params.taskId);
        if (type === 'complete_task' && params.taskId) await completeTask(params.taskId);
        if (type === 'add_schedule') await addScheduleItem({ title: params.title, startTime: params.startTime, duration: params.duration || 60, category: params.category || 'Other' });
        if (type === 'edit_schedule' && params.eventId && params.updates) await updateScheduleItem(params.eventId, params.updates);
        if (type === 'delete_schedule' && params.eventId) await deleteScheduleItem(params.eventId);
        if (type === 'complete_habit' && params.habitId) await logHabit(params.habitId, toLocalDateKey(new Date()), 1, true);
        if (type === 'navigate' && params.tabName) onNavigate?.(params.tabName);
        if (type === 'set_goal' || type === 'analyze') log('Agent action:', params);
      }
      logInteraction({ input: plan.summary || 'Agent command', actions: plan.actions, outcome: 'success' });
    } catch (error) { console.error('Error executing agent actions:', error); }
    finally { setIsExecutingActions(false); clearAgent(); }
  };
  return { agentPlan, clarifyConversation, clearAgent, execute, isExecutingActions, originalPrompt, setOriginalPrompt, showAgentModal, submit };
};
