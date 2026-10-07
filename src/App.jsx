import React, {
  Activity,
  Suspense,
  lazy,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import AuthModal from './components/AuthModal';
import ProfileSettings from './components/ProfileSettings';

// Import all context hooks
import { useAuth } from './context/AuthContext';
import { useTask } from './context/TaskContext';
import { ProjectProvider } from './context/ProjectContext';
import { HabitProvider } from './context/HabitContext';
import { ChatProvider, useChatContext } from './context/ChatContext';
import { ScheduleTemplateProvider } from './context/ScheduleTemplateContext';
import { useHabit } from './context/HabitContext';
import { useUserProfile } from './context/UserProfileContext';
import smartNotificationService from './services/SmartNotificationService';
import { IdeaBoardProvider } from './context/IdeaBoardContext';
import { ShellContext, ToastProvider } from './ui';
import TabBar from './shell/TabBar';
import Sidebar from './shell/Sidebar';
import { AccountSheet, MoreSheet } from './shell/ShellSheets';
import { PRIMARY_TAB_IDS, TABS, resolveTab } from './shell/tabs';

const lazyTab = (factory) => {
  const Component = lazy(factory);
  Component.preload = factory;
  return Component;
};

const Overview = lazyTab(() => import('./components/Overview'));
const Schedule = lazyTab(() => import('./components/Schedule'));
const Garden = lazyTab(() => import('./components/Garden'));
const UniBoard = lazyTab(() => import('./components/uni-board/UniBoard'));
const HabitTracker = lazyTab(() => import('./components/HabitTracker'));
const LearningTracker = lazyTab(() => import('./components/LearningTracker'));
const ProjectBoards = lazyTab(() => import('./components/ProjectBoards'));
const NotificationToast = lazyTab(() => import('./components/NotificationToast'));
const ChatSidebar = lazyTab(() => import('./components/ChatSidebar'));

const PRELOADED_SCREENS = [Schedule, Garden, UniBoard, HabitTracker, LearningTracker, ProjectBoards, ChatSidebar];
const THEME_SURFACES = { light: '#f2f2f7', dark: '#000000' };

const whenIdle = (callback) => {
  if ('requestIdleCallback' in window) {
    const handle = window.requestIdleCallback(callback, { timeout: 2000 });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(callback, 600);
  return () => window.clearTimeout(handle);
};

const initialsOf = (name = '') => name
  .trim()
  .split(/\s+/)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() || '')
  .join('');

const readAppearance = () => {
  try {
    const saved = localStorage.getItem('app-color-mode');
    return saved === 'light' || saved === 'dark' ? saved : 'system';
  } catch {
    return 'system';
  }
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

const AgentLauncher = ({ children }) => {
  const { openSidebar } = useChatContext();
  return children(openSidebar);
};

function App() {
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

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [appearance, setAppearance] = useState(readAppearance);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);

  // The tab bar responds instantly; the page swap runs as a transition so the
  // current page stays on screen (never a loading flash) until the next is ready.
  const [selectedTab, setSelectedTab] = useState('today');
  const [activeTab, setActiveTab] = useState('today');
  const [mountedTabs, setMountedTabs] = useState(() => new Set(['today']));
  const selectedTabRef = useRef('today');
  const scrollPositions = useRef({});

  const theme = appearance === 'system' ? (systemDark ? 'dark' : 'light') : appearance;

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return undefined;
    const onChange = (event) => setSystemDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-professional', 'theme-pink', 'theme-blue');
    root.classList.toggle('dark', theme === 'dark');
    root.dataset.colorMode = theme;
    try {
      if (appearance === 'system') localStorage.removeItem('app-color-mode');
      else localStorage.setItem('app-color-mode', appearance);
    } catch {
      // Appearance still applies for this session.
    }
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.removeAttribute('media');
      meta.setAttribute('content', THEME_SURFACES[theme]);
    });
  }, [appearance, theme]);

  // Load every screen in the background, then pre-render the primary tabs
  // offscreen so the first visit to each is as instant as the second.
  useEffect(() => whenIdle(() => {
    PRELOADED_SCREENS.forEach((screen) => screen.preload().catch(() => {}));
    startTransition(() => {
      setMountedTabs((current) => new Set([...current, ...PRIMARY_TAB_IDS]));
    });
  }), []);

  useLayoutEffect(() => {
    window.scrollTo(0, scrollPositions.current[activeTab] || 0);
  }, [activeTab]);

  const navigateTo = useCallback((tabId) => {
    const nextTab = resolveTab(tabId);
    if (!nextTab) return;

    if (nextTab === selectedTabRef.current) {
      // Re-selecting the current tab scrolls it back to the top, like iOS.
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    scrollPositions.current[selectedTabRef.current] = window.scrollY;
    selectedTabRef.current = nextTab;
    setSelectedTab(nextTab);
    startTransition(() => {
      setMountedTabs((current) => (current.has(nextTab) ? current : new Set([...current, nextTab])));
      setActiveTab(nextTab);
    });
  }, []);

  const handleCompleteTask = useCallback(async (id) => {
    await completeTask(id);
  }, [completeTask]);

  const handleRequestAIHelp = useCallback((task) => {
    window.dispatchEvent(new CustomEvent('personal-agent:task-help', { detail: task }));
  }, []);

  const existingSubjects = useMemo(
    () => [...new Set(tasks.map((task) => task.subject).filter(Boolean))],
    [tasks],
  );

  const displayName = profile?.nickname || profile?.name || (user ? user.email?.split('@')[0] : '');
  const account = useMemo(() => ({
    initials: initialsOf(displayName),
    name: displayName || (user ? 'Your account' : 'Guest'),
    detail: user ? user.email : 'Sign in to sync your data',
    label: 'Account',
  }), [displayName, user]);

  const shellValue = useMemo(() => ({
    openAccount: () => setShowAccount(true),
    account,
    navigate: navigateTo,
  }), [account, navigateTo]);

  const renderTab = (tabId) => {
    switch (tabId) {
      case 'today':
        return <Overview onNavigate={navigateTo} />;
      case 'plan':
        return (
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
        );
      case 'tasks':
        return (
          <Garden
            tasks={tasks}
            onAddTask={addTask}
            onCompleteTask={handleCompleteTask}
            onDeleteTask={deleteTask}
            onUpdateTask={updateTask}
            onRestoreTask={restoreTask}
            onRequestAIHelp={handleRequestAIHelp}
            existingSubjects={existingSubjects}
          />
        );
      case 'uni-board':
        return <UniBoard />;
      case 'habits':
        return <HabitTracker />;
      case 'learning':
        return <LearningTracker />;
      case 'projects':
        return <ProjectBoards />;
      default:
        return null;
    }
  };

  return (
    <ToastProvider>
      <HabitProvider>
        <IdeaBoardProvider>
          <ProjectProvider>
            <ScheduleTemplateProvider>
              <ChatProvider>
                <ShellContext.Provider value={shellValue}>
                  <SmartNotificationBridge />
                  <UnifiedChatBridge />

                  <AgentLauncher>
                    {(openAgent) => (
                      <div className="app-shell">
                        <Sidebar
                          selectedTab={selectedTab}
                          onSelect={navigateTo}
                          onAgent={openAgent}
                          onAccount={() => setShowAccount(true)}
                          account={account}
                        />

                        <main className="app-workspace" aria-label={`${TABS.find((tab) => tab.id === selectedTab)?.label || 'Active'} page`}>
                          <Suspense fallback={<div className="tab-page tab-page--placeholder" />}>
                            {TABS.filter((tab) => mountedTabs.has(tab.id)).map((tab) => (
                              <Activity key={tab.id} mode={tab.id === activeTab ? 'visible' : 'hidden'}>
                                <section className={`tab-page tab-page--${tab.id}`} aria-label={tab.label}>
                                  {renderTab(tab.id)}
                                </section>
                              </Activity>
                            ))}
                          </Suspense>
                        </main>

                        <TabBar
                          selectedTab={selectedTab}
                          onSelect={navigateTo}
                          onMore={() => setShowMoreSheet(true)}
                          moreOpen={showMoreSheet}
                          onAgent={openAgent}
                        />
                      </div>
                    )}
                  </AgentLauncher>

                  <MoreSheet
                    open={showMoreSheet}
                    onClose={() => setShowMoreSheet(false)}
                    selectedTab={selectedTab}
                    onSelect={(tabId) => {
                      setShowMoreSheet(false);
                      navigateTo(tabId);
                    }}
                  />

                  <AccountSheet
                    open={showAccount}
                    onClose={() => setShowAccount(false)}
                    account={account}
                    signedIn={Boolean(user)}
                    appearance={appearance}
                    onAppearanceChange={setAppearance}
                    onOpenProfile={() => {
                      setShowAccount(false);
                      setShowProfile(true);
                    }}
                    onSignIn={() => {
                      setShowAccount(false);
                      setShowAuthModal(true);
                    }}
                    onSignOut={() => {
                      setShowAccount(false);
                      signOut();
                    }}
                  />

                  <ProfileSettings isOpen={showProfile} onClose={() => setShowProfile(false)} />
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
                  </Suspense>
                </ShellContext.Provider>
              </ChatProvider>
            </ScheduleTemplateProvider>
          </ProjectProvider>
        </IdeaBoardProvider>
      </HabitProvider>
    </ToastProvider>
  );
}

export default App;
