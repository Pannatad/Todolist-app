import React, { Suspense, lazy, useState, useEffect, useRef } from 'react';
import {
  CalendarDays,
  ClipboardList,
  FolderKanban,
  GraduationCap,
  ListTodo,
  LogIn,
  LogOut,
  Moon,
  Repeat2,
  Sun,
  SunMedium,
} from 'lucide-react';
import AuthModal from './components/AuthModal';
import UserProfile from './components/UserProfile';

// Import all context hooks
import { useAuth } from './context/AuthContext';
import { useTask } from './context/TaskContext';
import { ProjectProvider } from './context/ProjectContext';
import { HabitProvider } from './context/HabitContext';
import { ChatProvider, useChatContext } from './context/ChatContext';
import { useHabit } from './context/HabitContext';
import { useUserProfile } from './context/UserProfileContext';
import smartNotificationService from './services/SmartNotificationService';
import { IdeaBoardProvider } from './context/IdeaBoardContext';
import { SegmentedControl, ToastProvider } from './ui';
const TaskInput = lazy(() => import('./components/TaskInput'));
const Garden = lazy(() => import('./components/Garden'));
const Schedule = lazy(() => import('./components/Schedule'));
const ProjectBoards = lazy(() => import('./components/ProjectBoards'));
const LearningTracker = lazy(() => import('./components/LearningTracker'));
const Overview = lazy(() => import('./components/Overview'));
const HabitTracker = lazy(() => import('./components/HabitTracker'));
const NotificationToast = lazy(() => import('./components/NotificationToast'));
const ChatSidebar = lazy(() => import('./components/ChatSidebar'));
const FloatingChatButton = lazy(() => import('./components/ChatSidebar').then((module) => ({ default: module.FloatingChatButton })));

const TAB_ALIASES = {
  overview: 'today',
  schedule: 'plan',
  garden: 'tasks',
  focus: 'tasks',
  ideas: 'projects',
  vision: 'today',
  sleep: 'habits',
};

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

const SmartNotificationBridge = () => {
  const { habits } = useHabit();
  const { scheduleItems, tasks } = useTask();
  const latestData = useRef({ scheduleItems, tasks, habits });

  useEffect(() => {
    latestData.current = { scheduleItems, tasks, habits };
  }, [scheduleItems, tasks, habits]);

  useEffect(() => {
    smartNotificationService.start(() => latestData.current);

    return () => smartNotificationService.stop();
  }, []);

  return null;
};

const UnifiedChatBridge = () => {
  const { openSidebar, sendMessage } = useChatContext();

  useEffect(() => {
    const handleTaskHelp = (event) => {
      const task = event.detail;
      if (!task) return;
      openSidebar();
      sendMessage(`Help me break down the task “${task.title}”. Give me a short next-step plan based on its current details.`);
    };

    window.addEventListener('personal-agent:task-help', handleTaskHelp);
    return () => window.removeEventListener('personal-agent:task-help', handleTaskHelp);
  }, [openSidebar, sendMessage]);

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

  const { profile } = useUserProfile();

  // Local UI State (not in contexts)
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('app-color-mode');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });
  const [activeTab, setActiveTab] = useState('today');

  const tabs = [
    { id: 'today', label: 'Today', icon: SunMedium, controls: 'app-active-workspace' },
    { id: 'plan', label: 'Plan', icon: CalendarDays, controls: 'app-active-workspace' },
    { id: 'tasks', label: 'Tasks', icon: ListTodo, controls: 'app-active-workspace' },
    { id: 'habits', label: 'Habits', icon: Repeat2, controls: 'app-active-workspace' },
    { id: 'learning', label: 'Learning', icon: GraduationCap, controls: 'app-active-workspace' },
    { id: 'projects', label: 'Projects', icon: FolderKanban, controls: 'app-active-workspace' },
  ];

  // Theme effect
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'theme-professional', 'theme-pink', 'theme-blue');
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.colorMode = theme;
    localStorage.setItem('app-color-mode', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => current === 'dark' ? 'light' : 'dark');
  };

  // Get unique subjects from tasks
  const existingSubjects = [...new Set(tasks.map(t => t.subject).filter(Boolean))];

  const handleCompleteTask = async (id) => {
    await completeTask(id);
  };

  const handleRequestAIHelp = (task) => {
    window.dispatchEvent(new CustomEvent('personal-agent:task-help', { detail: task }));
  };

  const navigateTo = (tabId) => {
    const nextTab = TAB_ALIASES[tabId] || tabId;
    if (tabs.some((tab) => tab.id === nextTab)) setActiveTab(nextTab);
  };

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  return (
    <ToastProvider>
      <HabitProvider>
        <IdeaBoardProvider>
          <ProjectProvider>
            <ChatProvider>
              <SmartNotificationBridge />
              <UnifiedChatBridge />

              <div className="app-shell">
                <div className="app-shell__frame">
                  <header className="app-header">
                    <div className="app-brand">
                      <span className="app-brand__mark" aria-hidden="true">
                        <ClipboardList size={21} />
                      </span>
                      <div className="app-brand__copy">
                        <h1>Personal Agent</h1>
                        <p>
                          <span>{todayLabel}</span>
                          <span aria-hidden="true">·</span>
                          <span>{user ? profile?.nickname || user.email?.split('@')[0] || 'Your day' : 'Guest mode'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="app-header__actions">
                      <div className="app-clock" aria-label="Current time">
                        <DigitalClock />
                      </div>

                      {user ? (
                        <button type="button" onClick={signOut} className="ui-icon-button" title="Sign out" aria-label="Sign out">
                          <LogOut size={19} aria-hidden="true" />
                        </button>
                      ) : (
                        <button type="button" onClick={() => setShowAuthModal(true)} className="ui-icon-button" title="Sign in" aria-label="Sign in">
                          <LogIn size={19} aria-hidden="true" />
                        </button>
                      )}

                      <div className="app-profile-control">
                        <UserProfile />
                      </div>

                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="ui-icon-button"
                        title={`Use ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        aria-label={`Use ${theme === 'dark' ? 'light' : 'dark'} mode`}
                      >
                        {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
                      </button>
                    </div>
                  </header>

                  <nav className="app-primary-nav" aria-label="Primary navigation">
                    <SegmentedControl
                      items={tabs}
                      value={activeTab}
                      onChange={navigateTo}
                      ariaLabel="Primary navigation"
                      className="app-primary-nav__control"
                    />
                  </nav>

                  {activeTab === 'tasks' && (
                    <div className="app-task-composer">
                      <Suspense fallback={<TabFallback />}>
                        <TaskInput onAdd={addTask} existingSubjects={existingSubjects} />
                      </Suspense>
                    </div>
                  )}

                  <main
                    id="app-active-workspace"
                    className={`app-workspace app-workspace--${activeTab}`}
                    role="tabpanel"
                    aria-label={`${tabs.find((tab) => tab.id === activeTab)?.label || 'Active'} workspace`}
                  >
                    <div key={activeTab} className={`workspace-view workspace-view--${activeTab}`}>
                      <Suspense fallback={<TabFallback />}>
                        {activeTab === 'today' && <Overview onNavigate={navigateTo} />}

                        {activeTab === 'plan' && (
                          <Schedule
                            onAddEvent={addScheduleItem}
                            onUpdateEvent={updateScheduleItem}
                            onDeleteEvent={deleteScheduleItem}
                            onDeleteTask={deleteTask}
                            onUpdateTask={updateTask}
                            tasks={tasks}
                            events={scheduleItems}
                            onCompleteTask={handleCompleteTask}
                          />
                        )}

                        {activeTab === 'tasks' && (
                          <Garden
                            tasks={tasks}
                            onCompleteTask={handleCompleteTask}
                            onDeleteTask={deleteTask}
                            onUpdateTask={updateTask}
                            onRestoreTask={restoreTask}
                            onRequestAIHelp={handleRequestAIHelp}
                            existingSubjects={existingSubjects}
                          />
                        )}

                        {activeTab === 'habits' && <HabitTracker />}
                        {activeTab === 'learning' && <LearningTracker />}
                        {activeTab === 'projects' && <ProjectBoards />}
                      </Suspense>
                    </div>
                  </main>
                </div>

                <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

                <Suspense fallback={null}>
                  <NotificationToast
                    onAction={(action) => {
                      if (action === 'View Schedule' || action === 'Go to Schedule') navigateTo('plan');
                      if (action === 'Go to Habits') navigateTo('habits');
                      if (action === 'View tasks') navigateTo('tasks');
                    }}
                  />
                  <ChatSidebar />
                  <FloatingChatButton />
                </Suspense>
              </div>
            </ChatProvider>
          </ProjectProvider>
        </IdeaBoardProvider>
      </HabitProvider>
    </ToastProvider>
  );
}

export default App;
