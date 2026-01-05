import React, { useState, useEffect } from 'react';
import { Moon, Sun, LogIn, LogOut, Palette, LayoutDashboard, Target, Sprout, Calendar as CalendarIcon, ScrollText, KanbanSquare, Timer, BarChart3, ListChecks } from 'lucide-react';
import TaskInput from './components/TaskInput';
import Garden from './components/Garden';
import Calendar from './components/Calendar';
import AIHelpSidebar from './components/AIHelpSidebar';
import VisionBoard from './components/VisionBoard';
import AuthModal from './components/AuthModal';
import FocusTimer from './components/FocusTimer';
import UserProfile from './components/UserProfile';
import ProjectBoards from './components/ProjectBoards';
import Overview from './components/Overview';
import StartTheDayModal from './components/StartTheDayModal';
import EndTheDayModal from './components/EndTheDayModal';
import ChatSidebar, { FloatingChatButton } from './components/ChatSidebar';
import { getPersonalizedAdvice } from './services/gemini';

// Import all context hooks
import { useAuth } from './context/AuthContext';
import { useTask } from './context/TaskContext';
import { useGame } from './context/GameContext';

import { useGoal } from './context/GoalContext';
import { ProjectProvider } from './context/ProjectContext';
import { HabitProvider } from './context/HabitContext';
import { ChatProvider } from './context/ChatContext';
import { useUserProfile } from './context/UserProfileContext';
import HabitTracker from './components/HabitTracker';
import SleepTrendsDashboard from './components/SleepTrendsDashboard';
import NotificationToast from './components/NotificationToast';
import smartNotificationService from './services/SmartNotificationService';

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    personaMessage,
    isPersonaTyping,
    earnCoins,
    buyPlot,
    cycleDisplayMode,
    triggerPersonaReaction
  } = useGame();

  const { profile } = useUserProfile();
  const { goals, dailyHighlights, addGoal, updateGoal, deleteGoal, updateHighlight, deleteHighlight } = useGoal();

  // Local UI State (not in contexts)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showStartDayModal, setShowStartDayModal] = useState(false);
  const [showEndDayModal, setShowEndDayModal] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('app-theme') || 'cozy'; // 'cozy', 'professional', 'pink', 'blue'
    } catch (e) {
      return 'cozy';
    }
  });
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard size={20} /> },
    { id: 'schedule', label: 'Schedule', icon: <CalendarIcon size={20} /> },
    { id: 'garden', label: 'Tasks', icon: <Sprout size={20} /> },
    { id: 'habits', label: 'Habits', icon: <ListChecks size={20} /> },
    { id: 'projects', label: 'Projects', icon: <KanbanSquare size={20} /> },
    { id: 'focus', label: 'Focus', icon: <Timer size={20} /> },
  ];
  const [currentFocusTask, setCurrentFocusTask] = useState(null);

  // AI Help State
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [currentAITask, setCurrentAITask] = useState(null);
  const [aiTips, setAiTips] = useState('');
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  // Start Smart Notification Service
  useEffect(() => {
    smartNotificationService.start(() => ({
      scheduleItems,
      tasks,
      habits: [] // Will be connected when HabitContext is available
    }));

    return () => smartNotificationService.stop();
  }, [scheduleItems, tasks]);

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

  // Focus Mode handler
  const handleStartFocus = (task) => {
    setCurrentFocusTask(task);
    setActiveTab('focus');
  };

  // Focus completion handler
  const handleFocusComplete = async (minutes) => {
    const reward = minutes;
    await earnCoins(reward);
    triggerPersonaReaction('complete', `Focus Session (${minutes}m)`);
  };

  return (
    <HabitProvider>
      <ProjectProvider>
        <ChatProvider>
          <div className="min-h-screen bg-gradient-to-br from-sage-50 via-bone-100 to-sage-100 dark:from-void-950 dark:via-void-900 dark:to-void-950 text-ink-900 dark:text-bone-200 transition-colors duration-500">
            {/* Persona Avatar */}


            <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
              <header className="mb-4 sm:mb-8">
                <div className="flex items-center justify-between mb-3 sm:mb-6">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex-shrink-0">
                      <span className="text-3xl sm:text-4xl drop-shadow-md">📋</span>
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-bold text-sage-600 dark:text-magma-500 drop-shadow-md dark:drop-shadow-[0_0_10px_rgba(239,68,68,0.5)] leading-tight">
                        Personal Agent
                      </h1>
                      <p className="text-xs sm:text-sm text-sage-500 dark:text-bone-200/60 italic mt-1">
                        {user ? `Welcome back, ${profile?.nickname || user.email?.split('@')[0] || 'User'}` : 'Guest Mode'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">

                    {/* Digital Clock */}
                    <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/50 dark:bg-void-800/50 backdrop-blur-md rounded-full shadow-sm border border-sage-200 dark:border-white/5 font-mono text-sage-700 dark:text-bone-200 font-bold">
                      <DigitalClock />
                    </div>

                    {/* Coins Display */}
                    <div className="flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 bg-white/50 dark:bg-void-800/50 backdrop-blur-md rounded-full shadow-sm border border-sage-200 dark:border-white/5">
                      <span className="text-base sm:text-xl">🪙</span>
                      <span className="font-bold text-sage-700 dark:text-magma-400 text-sm sm:text-base">{coins}</span>
                    </div>

                    {/* User Profile Icon */}
                    {user ? (
                      <button
                        onClick={signOut}
                        className="p-2.5 sm:p-4 rounded-full backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-sage-200 dark:border-white/5 bg-white/50 dark:bg-void-800/50 hover:bg-white/80 dark:hover:bg-void-700 group"
                        title="Sign Out"
                      >
                        <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-red-500 hover:text-red-600 transition-colors" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowAuthModal(true)}
                        className="p-2.5 sm:p-4 rounded-full backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-sage-200 dark:border-white/5 bg-white/50 dark:bg-void-800/50 hover:bg-white/80 dark:hover:bg-void-700 group"
                        title="Sign In"
                      >
                        <LogIn className="w-5 h-5 sm:w-6 sm:h-6 text-sage-600 dark:text-bone-200" />
                      </button>
                    )}

                    <UserProfile />

                    <button
                      onClick={toggleTheme}
                      className="p-2.5 sm:p-4 rounded-full bg-white/50 dark:bg-void-800/50 hover:bg-white/80 dark:hover:bg-void-700 backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-sage-200 dark:border-white/5 group"
                      title={`Current Theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)} (Click to cycle)`}
                    >
                      {theme === 'cozy' && <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-sage-600 group-hover:text-sage-800 transition-colors" />}
                      {theme === 'professional' && <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-500 group-hover:text-indigo-400 transition-colors" />}
                      {theme === 'pink' && <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500 group-hover:text-pink-400 transition-colors" />}
                      {theme === 'blue' && <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-sky-500 group-hover:text-sky-400 transition-colors" />}
                    </button>
                  </div>
                </div>
              </header>

              <nav className="flex justify-center gap-2 sm:gap-4 mb-4 sm:mb-8 flex-wrap overflow-x-auto p-2">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 sm:px-6 py-2 rounded-full font-bold transition-all border capitalize text-sm sm:text-base whitespace-nowrap ${(theme === 'professional' || theme === 'pink' || theme === 'blue')
                      ? activeTab === tab.id
                        ? 'pro-gradient-btn-active scale-105'
                        : 'pro-gradient-btn-inactive'
                      : activeTab === tab.id
                        ? 'bg-sage-100 dark:bg-magma-900/20 border-sage-500 dark:border-magma-500 text-sage-700 dark:text-magma-400 shadow-sm dark:shadow-[0_0_10px_rgba(239,68,68,0.2)] scale-105'
                        : 'bg-white/50 dark:bg-void-800/30 border-transparent text-sage-600 dark:text-bone-200 hover:bg-white/80 dark:hover:bg-void-800/50'
                      }`}
                  >
                    <div className="flex items-center gap-2">
                      {tab.icon}
                      <span>{tab.label}</span>
                    </div>
                  </button>
                ))}
              </nav>

              {/* Only show TaskInput on My Tasks tab */}
              {activeTab === 'garden' && (
                <TaskInput onAdd={addTask} existingSubjects={existingSubjects} />
              )}

              <main className="relative">
                {activeTab === 'garden' && (
                  <>
                    <div className="mb-12 text-center">
                      <h2 className="text-2xl mb-2 font-serif italic text-sage-600/60 dark:text-bone-200/60">
                        "Stop procrastinating, just do the work"
                      </h2>
                    </div>

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
                      onStartFocus={handleStartFocus}
                    />
                  </>
                )}
                {activeTab === 'overview' && (
                  <Overview
                    onNavigate={setActiveTab}
                    onStartDay={() => setShowStartDayModal(true)}
                    onEndDay={() => setShowEndDayModal(true)}
                  />
                )}

                {activeTab === 'schedule' && (
                  <Calendar
                    onAddScheduleItem={addScheduleItem}
                    onUpdateScheduleItem={updateScheduleItem}
                    onDeleteScheduleItem={deleteScheduleItem}
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

                {activeTab === 'sleep' && (
                  <SleepTrendsDashboard />
                )}

                {activeTab === 'projects' && (
                  <ProjectBoards />
                )}

                {activeTab === 'focus' && (
                  <div className="max-w-2xl mx-auto">
                    <FocusTimer
                      onComplete={handleFocusComplete}
                      initialTask={currentFocusTask}
                    />
                  </div>
                )}
              </main>
            </div>

            {/* AI Help Sidebar */}
            <AIHelpSidebar
              isOpen={showAISidebar}
              onClose={() => setShowAISidebar(false)}
              task={currentAITask}
              aiTips={aiTips}
              isLoading={isLoadingAI}
              onGenerateAdvice={handleGenerateAdvice}
            />

            <AuthModal
              isOpen={showAuthModal}
              onClose={() => setShowAuthModal(false)}
            />

            <StartTheDayModal
              isOpen={showStartDayModal}
              onClose={() => setShowStartDayModal(false)}
              tasks={tasks}
              goals={goals}
              dailyHighlights={dailyHighlights}
              scheduleItems={scheduleItems}
              onAddScheduleItem={addScheduleItem}
            />

            <EndTheDayModal
              isOpen={showEndDayModal}
              onClose={() => setShowEndDayModal(false)}
            />

            {/* Smart Notifications Toast */}
            <NotificationToast
              onAction={(action, data) => {
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

            {/* Chat Sidebar */}
            <ChatSidebar />
            <FloatingChatButton />
          </div>
        </ChatProvider>
      </ProjectProvider>
    </HabitProvider>
  );
}

export default App;
