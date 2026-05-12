import React, { Suspense, lazy, useState, useEffect } from 'react';
import { LogIn, LogOut, Palette, LayoutDashboard, Sprout, Calendar as CalendarIcon, ScrollText, KanbanSquare, ListChecks, GraduationCap, ClipboardList, Coins } from 'lucide-react';
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';
import { getPersonalizedAdvice } from './services/aiClient';

// Import all context hooks
import { useAuth } from './context/AuthContext';
import { useTask } from './context/TaskContext';
import { useGame } from './context/GameContext';

import { useGoal } from './context/GoalContext';
import { ProjectProvider } from './context/ProjectContext';
import { HabitProvider } from './context/HabitContext';
import { ChatProvider } from './context/ChatContext';
import { useHabit } from './context/HabitContext';
import { useUserProfile } from './context/UserProfileContext';
import smartNotificationService from './services/SmartNotificationService';
import { IdeaBoardProvider } from './context/IdeaBoardContext';
const TaskInput = lazy(() => import('./components/TaskInput'));
const Garden = lazy(() => import('./components/Garden'));
const Calendar = lazy(() => import('./components/Calendar'));
const AIHelpSidebar = lazy(() => import('./components/AIHelpSidebar'));
const VisionBoard = lazy(() => import('./components/VisionBoard'));
const ProjectBoards = lazy(() => import('./components/ProjectBoards'));
const Overview = lazy(() => import('./components/Overview'));
const HabitTracker = lazy(() => import('./components/HabitTracker'));
const LearningTracker = lazy(() => import('./components/LearningTracker'));
const SleepTrendsDashboard = lazy(() => import('./components/SleepTrendsDashboard'));
const NotificationToast = lazy(() => import('./components/NotificationToast'));
const IdeasBoard = lazy(() => import('./components/IdeasBoard'));
const ChatSidebar = lazy(() => import('./components/ChatSidebar'));
const FloatingChatButton = lazy(() => import('./components/ChatSidebar').then((module) => ({ default: module.FloatingChatButton })));

const TabFallback = () => (
  <div className="flex items-center justify-center py-16 text-sage-500 dark:text-bone-200/70">
    Loading...
  </div>
);

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const SmartNotificationBridge = ({ scheduleItems, tasks }) => {
  const { habits } = useHabit();

  useEffect(() => {
    smartNotificationService.start(() => ({
      scheduleItems,
      tasks,
      habits,
    }));

    return () => smartNotificationService.stop();
  }, [habits, scheduleItems, tasks]);

  return null;
};

function App() {
  // Context hooks
  const { user, signOut } = useAuth();
  const {
    tasks,
    scheduleItems,
    addTask,
    updateTask,
    deleteTask,
    completeTask,
    restoreTask,
    addScheduleItem,
    updateScheduleItem,
    deleteScheduleItem
  } = useTask();

  const {
    coins,
    unlockedPlots,
    displayMode,
    earnCoins,
    buyPlot,
    triggerPersonaReaction
  } = useGame();

  const { profile } = useUserProfile();
  const { goals, dailyHighlights, addGoal, updateGoal, deleteGoal, updateHighlight, deleteHighlight } = useGoal();

  // Local UI State (not in contexts)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('app-theme') || 'cozy'; // 'cozy', 'professional', 'pink', 'blue'
    } catch {
      return 'cozy';
    }
  });
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'schedule', label: 'Schedule', icon: <CalendarIcon size={20} /> },
    { id: 'garden', label: 'Tasks', icon: <Sprout size={20} /> },
    { id: 'habits', label: 'Habits', icon: <ListChecks size={20} /> },
    { id: 'ideas', label: 'Ideas', icon: <ScrollText size={20} /> },
    { id: 'learning', label: 'Learning', icon: <GraduationCap size={20} /> },
    { id: 'projects', label: 'Projects', icon: <KanbanSquare size={20} /> },
  ];

  // AI Help State
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [currentAITask, setCurrentAITask] = useState(null);
  const [aiTips, setAiTips] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Theme effect
  useEffect(() => {
    const root = document.documentElement;
    // Reset classes
    root.classList.remove('dark', 'theme-professional', 'theme-pink', 'theme-blue');

    if (theme === 'professional') {
      root.classList.add('theme-professional');
    } else if (theme === 'pink') {
      root.classList.add('theme-pink');
    } else if (theme === 'blue') {
      root.classList.add('theme-blue');
    } else {
      // Cozy is default
    }

    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => {
      if (prev === 'cozy') return 'professional';
      if (prev === 'professional') return 'pink';
      if (prev === 'pink') return 'blue';
      return 'cozy';
    });
  };

  // Get unique subjects from tasks
  const existingSubjects = [...new Set(tasks.map(t => t.subject).filter(Boolean))];

  // Task handlers with coin rewards
  const handleCompleteTask = async (id) => {
    const result = await completeTask(id);
    if (result && result.reward > 0) {
      await earnCoins(result.reward);
      triggerPersonaReaction('complete', result.task.title);
    }
  };

  // AI Help handlers
  const handleRequestAIHelp = (task) => {
    setCurrentAITask(task);
    setShowAISidebar(true);
    setAiTips('');
  };

  const handleGenerateAdvice = async () => {
    if (!currentAITask) return;
    setIsLoadingAI(true);
    try {
      const advice = await getPersonalizedAdvice(currentAITask);
      setAiTips(advice);
    } catch (error) {
      console.error('Error generating advice:', error);
      setAiTips('Unable to generate advice at this time.');
    } finally {
      setIsLoadingAI(false);
    }
  };

  return (
    <HabitProvider>
      <IdeaBoardProvider>
        <ProjectProvider>
          <ChatProvider>
            <SmartNotificationBridge scheduleItems={scheduleItems} tasks={tasks} />
            <div className="min-h-screen bg-cream-50 text-ink-900 transition-colors duration-300 dark:bg-void-950 dark:text-bone-200">
            {/* Persona Avatar */}


            <div className="mx-auto max-w-7xl px-3 py-3 sm:px-5 sm:py-5">
              <header className="mb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-sage-200 bg-white text-sage-700 shadow-sm dark:border-white/10 dark:bg-void-800 dark:text-bone-200">
                      <ClipboardList size={21} />
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-xl font-bold leading-tight text-sage-700 dark:text-bone-100 sm:text-2xl">
                        Personal Agent
                      </h1>
                      <p className="mt-0.5 truncate text-xs text-sage-600/75 dark:text-bone-200/60 sm:text-sm">
                        {user ? `Welcome back, ${profile?.nickname || user.email?.split('@')[0] || 'User'}` : 'Guest Mode'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">

                    {/* Digital Clock */}
                    <div className="hidden items-center gap-2 rounded-xl border border-sage-200 bg-white px-3 py-2 font-mono text-sm font-semibold text-sage-700 shadow-sm dark:border-white/10 dark:bg-void-800 dark:text-bone-200 md:flex">
                      <DigitalClock />
                    </div>

                    {/* Coins Display */}
                    <div className="flex items-center gap-1.5 rounded-xl border border-sage-200 bg-white px-2.5 py-2 text-sage-700 shadow-sm dark:border-white/10 dark:bg-void-800 dark:text-bone-200 sm:px-3">
                      <Coins className="h-4 w-4" />
                      <span className="text-sm font-bold">{coins}</span>
                    </div>

                    {/* User Profile Icon */}
                    {user ? (
                      <button
                        onClick={signOut}
                        className="rounded-xl border border-sage-200 bg-white p-2 text-sage-700 shadow-sm transition-colors hover:bg-sage-50 active:scale-95 dark:border-white/10 dark:bg-void-800 dark:text-bone-200 dark:hover:bg-void-700"
                        title="Sign Out"
                      >
                        <LogOut className="h-5 w-5 text-red-500" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="rounded-xl border border-sage-200 bg-white p-2 text-sage-700 shadow-sm transition-colors hover:bg-sage-50 active:scale-95 dark:border-white/10 dark:bg-void-800 dark:text-bone-200 dark:hover:bg-void-700"
                        title="Sign In"
                      >
                        <LogIn className="h-5 w-5" />
                      </button>
                    )}

                    <UserProfile />

                    <button
                      onClick={toggleTheme}
                      className="rounded-xl border border-sage-200 bg-white p-2 shadow-sm transition-colors hover:bg-sage-50 active:scale-95 dark:border-white/10 dark:bg-void-800 dark:hover:bg-void-700 group"
                      title={`Current Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to cycle)`}
                    >
                      {theme === 'cozy' && <Palette className="h-5 w-5 text-sage-600 transition-colors group-hover:text-sage-800" />}
                      {theme === 'professional' && <Palette className="h-5 w-5 text-indigo-500 transition-colors group-hover:text-indigo-400" />}
                      {theme === 'pink' && <Palette className="h-5 w-5 text-pink-500 transition-colors group-hover:text-pink-400" />}
                      {theme === 'blue' && <Palette className="h-5 w-5 text-sky-500 transition-colors group-hover:text-sky-400" />}
                    </button>
                  </div>
                </div>
              </header>

              <nav className="mb-5 flex gap-1.5 overflow-x-auto border-b border-sage-200/80 pb-2 dark:border-white/10">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold capitalize transition-colors sm:px-3.5 ${(theme === 'professional' || theme === 'pink' || theme === 'blue')
                      ? activeTab === tab.id
                        ? 'pro-gradient-btn-active'
                        : 'pro-gradient-btn-inactive'
                      : activeTab === tab.id
                        ? 'border-sage-500 bg-sage-100 text-sage-800 shadow-sm dark:border-white/20 dark:bg-void-800 dark:text-bone-100'
                        : 'border-transparent bg-white/60 text-sage-700 hover:border-sage-200 hover:bg-white dark:bg-void-800/40 dark:text-bone-200 dark:hover:bg-void-800'
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {tab.icon}
                      <span>{tab.label}</span>
                    </div>
                  </button>
                ))}
              </nav>

              {/* Only show TaskInput on My Tasks tab */}
              {activeTab === 'garden' && (
                <Suspense fallback={<TabFallback />}>
                  <TaskInput onAdd={addTask} existingSubjects={existingSubjects} />
                </Suspense>
              )}

              <main className="relative">
                <Suspense fallback={<TabFallback />}>
                  {activeTab === 'garden' && (
                    <>
                      <Garden
                        tasks={tasks}
                        onCompleteTask={handleCompleteTask}
                        onDeleteTask={deleteTask}
                        onUpdateTask={updateTask}
                        onRestoreTask={restoreTask}
                        onRequestAIHelp={handleRequestAIHelp}
                        existingSubjects={existingSubjects}
                        unlockedPlots={unlockedPlots}
                        onBuyPlot={buyPlot}
                        displayMode={displayMode}
                      />
                    </>
                  )}
                  {activeTab === 'overview' && (
                    <Overview
                      onNavigate={setActiveTab}
                    />
                  )}

                  {activeTab === 'schedule' && (
                    <Calendar
                      onAddScheduleItem={addScheduleItem}
                      onUpdateScheduleItem={updateScheduleItem}
                      onDeleteScheduleItem={deleteScheduleItem}
                      onDeleteTask={deleteTask}
                      onUpdateTask={updateTask}
                      tasks={tasks}
                      scheduleItems={scheduleItems}
                      onCompleteTask={handleCompleteTask}
                    />
                  )}

                  {activeTab === 'vision' && (
                    <VisionBoard
                      goals={goals}
                      onAddGoal={addGoal}
                      onUpdateGoal={updateGoal}
                      onDeleteGoal={deleteGoal}
                      dailyHighlights={dailyHighlights}
                      onUpdateHighlight={updateHighlight}
                      onDeleteHighlight={deleteHighlight}
                    />
                  )}

                  {activeTab === 'habits' && (
                    <HabitTracker />
                  )}

                  {activeTab === 'ideas' && (
                    <IdeasBoard />
                  )}

                  {activeTab === 'learning' && (
                    <LearningTracker />
                  )}

                  {activeTab === 'sleep' && (
                    <SleepTrendsDashboard />
                  )}

                  {activeTab === 'projects' && (
                    <ProjectBoards />
                  )}
                </Suspense>

              </main>
            </div>

            {/* AI Help Sidebar */}
            <Suspense fallback={null}>
              <AIHelpSidebar
                isOpen={showAISidebar}
                onClose={() => setShowAISidebar(false)}
                task={currentAITask}
                aiTips={aiTips}
                isLoading={isLoadingAI}
                onGenerateAdvice={handleGenerateAdvice}
              />
            </Suspense>

            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
            />

            {/* Smart Notifications Toast */}
            <Suspense fallback={null}>
              <NotificationToast
                onAction={(action) => {
                  // Handle notification actions
                  if (action === 'View Schedule' || action === 'Go to Schedule') {
                    setActiveTab('schedule');
                  } else if (action === 'Go to Habits') {
                    setActiveTab('habits');
                  } else if (action === 'View tasks') {
                    setActiveTab('garden');
                  }
                }}
              />
            </Suspense>

            {/* Chat Sidebar */}
            <Suspense fallback={null}>
              <ChatSidebar />
              <FloatingChatButton />
            </Suspense>
            </div>
          </ChatProvider>
        </ProjectProvider>
      </IdeaBoardProvider>
    </HabitProvider>
  );
}

export default App;
