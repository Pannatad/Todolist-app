import React, { useState, useEffect } from 'react';
import { Moon, Sun, LogIn, LogOut, User } from 'lucide-react';
import useSound from 'use-sound';
import TaskInput from './components/TaskInput';
import Garden from './components/Garden';
import Calendar from './components/Calendar';
import AIHelpSidebar from './components/AIHelpSidebar';
import VisionBoard from './components/VisionBoard';
import DailyLog from './components/DailyLog';
import AuthModal from './components/AuthModal';
import PersonaAvatar from './components/PersonaAvatar';
import FocusTimer from './components/FocusTimer';
import UserProfile from './components/UserProfile';
import { suggestDifficulty, getPersonalizedAdvice, getPersonaReaction } from './services/gemini';
import { useAuth } from './context/AuthContext';
import { supabase } from './services/supabase';

// Sound assets
// For now I will just set up the structure.

function App() {
  // Auth State
  const { user, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // State
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('growth-tasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse tasks:", e);
      return [];
    }
  });

  const [coins, setCoins] = useState(() => {
    try {
      const saved = localStorage.getItem('growth-coins');
      const parsed = saved ? parseInt(saved) : 0;
      return isNaN(parsed) ? 0 : parsed;
    } catch (e) {
      console.error("Failed to parse coins:", e);
      return 0;
    }
  });

  const [unlockedPlots, setUnlockedPlots] = useState(() => {
    try {
      const saved = localStorage.getItem('growth-plots');
      const parsed = saved ? parseInt(saved) : 12;
      return isNaN(parsed) ? 12 : parsed;
    } catch (e) {
      console.error("Failed to parse unlockedPlots:", e);
      return 12;
    }
  });
  const soundEnabled = true; // Always enabled, no toggle needed
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('dark-mode');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState('garden'); // 'garden', 'calendar', 'focus', 'vision'
  const [currentFocusTask, setCurrentFocusTask] = useState(null);

  const [displayMode, setDisplayMode] = useState('minimal'); // 'demon', 'penguin', 'minimal'

  // Persona State
  const [personaMessage, setPersonaMessage] = useState('');
  const [isPersonaTyping, setIsPersonaTyping] = useState(false);

  // Goals State
  const [goals, setGoals] = useState(() => {
    try {
      const saved = localStorage.getItem('vision-goals');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse goals:", e);
      return [];
    }
  });

  // Daily Highlights State
  const [dailyHighlights, setDailyHighlights] = useState(() => {
    try {
      const saved = localStorage.getItem('daily-highlights');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("Failed to parse daily highlights:", e);
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('daily-highlights', JSON.stringify(dailyHighlights));
  }, [dailyHighlights]);

  // Daily Log State
  const [activityLogs, setActivityLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('daily-logs');
      if (saved) return JSON.parse(saved);

      // Mock data for guest
      const today = new Date();
      const mockLogs = [
        {
          id: 1,
          activity: "Morning Run",
          duration: 30,
          category: "Health",
          timestamp: new Date(today.setHours(7, 30, 0, 0)).toISOString()
        },
        {
          id: 2,
          activity: "Linear Algebra Review",
          duration: 90,
          category: "Study",
          timestamp: new Date(today.setHours(9, 0, 0, 0)).toISOString()
        },
        {
          id: 3,
          activity: "React Project",
          duration: 120,
          category: "Coding",
          timestamp: new Date(today.setHours(14, 0, 0, 0)).toISOString()
        }
      ];
      return mockLogs;
    } catch (e) {
      console.error("Failed to parse activity logs:", e);
      return [];
    }
  });

  // --- Data Persistence & Sync ---

  // Load data from Supabase when user logs in
  useEffect(() => {
    if (user) {
      loadUserData();
    } else {
      // Revert to local storage if user logs out (or stays logged out)
      // We already loaded initial state from LS, but if we just logged out, we might want to reload LS data
      loadLocalData();
    }
  }, [user]);

  const loadLocalData = () => {
    try {
      const t = localStorage.getItem('growth-tasks');
      if (t) setTasks(JSON.parse(t));

      const c = localStorage.getItem('growth-coins');
      if (c) setCoins(parseInt(c) || 0);

      const p = localStorage.getItem('growth-plots');
      if (p) setUnlockedPlots(parseInt(p) || 12);

      const g = localStorage.getItem('vision-goals');
      if (g) setGoals(JSON.parse(g));

      const l = localStorage.getItem('daily-logs');
      if (l) setActivityLogs(JSON.parse(l));
    } catch (e) {
      console.error("Error loading local data", e);
    }
  };

  const loadUserData = async () => {
    setIsLoadingData(true);
    try {
      // 1. Profile (Coins, Plots)
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profile) {
        setCoins(profile.coins);
        setUnlockedPlots(profile.unlocked_plots);
        setDisplayMode(profile.display_mode || 'minimal');
      }

      // 2. Tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: true });
      if (tasksData) setTasks(tasksData);

      // 3. Goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: true });
      if (goalsData) setGoals(goalsData);

      // 4. Logs
      const { data: logsData } = await supabase
        .from('activity_logs')
        .select('*')
        .order('timestamp', { ascending: false });
      if (logsData) setActivityLogs(logsData);

      // 5. Daily Highlights (Vision Board)
      const { data: highlightsData } = await supabase
        .from('daily_highlights')
        .select('*');

      if (highlightsData) {
        const highlightsMap = {};
        highlightsData.forEach(h => {
          highlightsMap[h.key] = { text: h.text, completed: h.completed };
        });
        setDailyHighlights(highlightsMap);
      }

    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Save to LocalStorage (Guest Mode Only)
  useEffect(() => {
    if (!user) {
      localStorage.setItem('growth-tasks', JSON.stringify(tasks));
      localStorage.setItem('growth-coins', coins.toString());
      localStorage.setItem('growth-plots', unlockedPlots.toString());
      localStorage.setItem('vision-goals', JSON.stringify(goals));
      localStorage.setItem('daily-logs', JSON.stringify(activityLogs));
    }
  }, [tasks, coins, unlockedPlots, goals, activityLogs, user]);

  // Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dark-mode', isDarkMode.toString());
  }, [isDarkMode]);

  // Theme Toggle
  const cycleDisplayMode = async () => {
    const modes = ['demon', 'penguin', 'minimal'];
    const currentIndex = modes.indexOf(displayMode);
    const newMode = modes[(currentIndex + 1) % modes.length];
    setDisplayMode(newMode);
    if (user) {
      await supabase.from('profiles').update({ display_mode: newMode }).eq('id', user.id);
    }
  };
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Sound hooks
  const [playPlant] = useSound('/sounds/plant.mp3', { volume: 0.5 });
  const [playComplete] = useSound('/sounds/water.mp3', { volume: 0.5 });

  // --- Helper for Persona Reaction ---
  const triggerPersonaReaction = async (action, taskTitle) => {
    setIsPersonaTyping(true);
    setPersonaMessage(''); // Clear previous

    // Slight delay to feel natural
    setTimeout(async () => {
      const reaction = await getPersonaReaction(action, taskTitle, displayMode === 'penguin' ? 'penguin' : 'demon');
      setPersonaMessage(reaction);
      setIsPersonaTyping(false);

      // Text-to-Speech removed as per user request
      // if (soundEnabled) {
      //   const utterance = new SpeechSynthesisUtterance(reaction);
      //   ...
      //   window.speechSynthesis.speak(utterance);
      // }

      // Auto-hide after 8 seconds
      setTimeout(() => {
        setPersonaMessage('');
      }, 8000);
    }, 500);
  };

  // --- Task Handlers ---

  const addTask = async ({ title, difficulty, deadline, subject, estimatedTime }) => {
    const newTask = {
      id: user ? undefined : Date.now(), // Let Supabase generate UUID if logged in, else timestamp
      title,
      description: null,
      difficulty,
      subject: subject || 'other',
      deadline,
      estimated_time: estimatedTime, // Note: snake_case for DB
      estimatedTime: estimatedTime, // camelCase for local app (legacy)
      status: 'growing',  // Auto-summon entities on task creation
      created_at: new Date().toISOString(),
      user_id: user?.id
    };

    // Optimistic Update
    const tempId = Date.now();
    setTasks(prev => [...prev, { ...newTask, id: user ? tempId : newTask.id }]);
    if (soundEnabled) playPlant();

    // Trigger Persona Reaction
    triggerPersonaReaction('add', title);

    if (user) {
      // Remove local-only fields before sending to DB
      const { id, estimatedTime, ...dbTask } = newTask;
      const { data, error } = await supabase.from('tasks').insert([dbTask]).select().single();

      if (data) {
        // Replace temp ID with real ID
        setTasks(prev => prev.map(t => t.id === tempId ? { ...t, ...data, estimatedTime: data.estimated_time } : t));
      } else if (error) {
        console.error("Error adding task:", error);
        // Revert optimistic update? Or just show error?
      }
    }
  };

  const completeTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    let newStatus;
    let reward = 0;

    // State transitions: seed → growing → harvested
    if (task.status === 'seed') {
      newStatus = 'growing';
      if (soundEnabled) playComplete();
    } else if (task.status === 'growing') {
      newStatus = 'harvested';

      // Calculate Reward
      switch (task.difficulty) {
        case 'hard': reward = 30; break;
        case 'medium': reward = 20; break;
        case 'easy': default: reward = 10; break;
      }

      // Deadline Bonus/Penalty
      if (task.deadline) {
        const now = new Date();
        const deadlineDate = new Date(task.deadline);
        if (now <= deadlineDate) {
          reward += 10;
        } else {
          reward = Math.max(0, reward - 5);
        }
      }

      setCoins(prev => {
        const newCoins = prev + reward;
        if (user) {
          supabase.from('profiles').update({ coins: newCoins }).eq('id', user.id).then();
        }
        return newCoins;
      });
      if (soundEnabled) playComplete();

      // Trigger Persona Reaction
      triggerPersonaReaction('complete', task.title);
    }

    const updates = { status: newStatus, completed_at: new Date().toISOString() };

    setTasks(tasks.map(t =>
      t.id === id ? { ...t, ...updates, completedAt: updates.completed_at } : t
    ));

    if (user) {
      await supabase.from('tasks').update(updates).eq('id', id);
    }
  };

  const restoreTask = async (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task || task.status !== 'harvested') return;

    // Restore task to growing status
    const updates = { status: 'growing', completed_at: null };

    setTasks(tasks.map(t =>
      t.id === id ? { ...t, ...updates, completedAt: null } : t
    ));

    if (user) {
      await supabase.from('tasks').update(updates).eq('id', id);
    }

    // Optional: Play sound
    if (soundEnabled) playPlant();
  };

  const deleteTask = async (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    if (user) {
      await supabase.from('tasks').delete().eq('id', id);
    }
  };

  const updateTask = async (id, updates) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
    if (user) {
      // Map camelCase to snake_case if needed
      const dbUpdates = { ...updates };
      if (dbUpdates.estimatedTime) {
        dbUpdates.estimated_time = dbUpdates.estimatedTime;
        delete dbUpdates.estimatedTime;
      }
      await supabase.from('tasks').update(dbUpdates).eq('id', id);
    }
  };

  // --- AI Help Logic ---
  const [showAISidebar, setShowAISidebar] = useState(false);
  const [currentAITask, setCurrentAITask] = useState(null);
  const [aiTips, setAiTips] = useState(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const handleRequestAIHelp = (task) => {
    setCurrentAITask(task);
    setAiTips(null);
    setShowAISidebar(true);
  };

  const handleGenerateAdvice = async (file, instructions) => {
    if (!currentAITask) return;

    setIsLoadingAI(true);
    setAiTips(null);

    try {
      const advice = await getPersonalizedAdvice(
        currentAITask.title,
        currentAITask.subject,
        instructions,
        file
      );
      setAiTips(advice);
    } catch (error) {
      console.error("Failed to get advice:", error);
      setAiTips({
        analysis: "I couldn't summon the wisdom this time. Try again later.",
        steps: []
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const handleStartFocus = (task) => {
    setCurrentFocusTask(task);
    setActiveTab('focus');
  };

  const buyPlot = async () => {
    const cost = 50;
    if (coins >= cost) {
      setCoins(prev => {
        const newCoins = prev - cost;
        if (user) supabase.from('profiles').update({ coins: newCoins }).eq('id', user.id).then();
        return newCoins;
      });
      setUnlockedPlots(prev => {
        const newPlots = prev + 1;
        if (user) supabase.from('profiles').update({ unlocked_plots: newPlots }).eq('id', user.id).then();
        return newPlots;
      });
    }
  };



  // Extract unique subjects
  const existingSubjects = [...new Set(tasks.map(t => t.subject).filter(Boolean))];

  // --- Goal Handlers ---
  const addGoal = async (goalData) => {
    const newGoal = {
      ...goalData,
      id: user ? undefined : Date.now(),
      user_id: user?.id,
      color_theme: goalData.colorTheme, // Map to DB column
      created_at: new Date().toISOString()
    };

    const tempId = Date.now();
    setGoals(prev => [...prev, { ...newGoal, id: user ? tempId : newGoal.id }]);

    if (user) {
      const { id, colorTheme, ...dbGoal } = newGoal;
      const { data, error } = await supabase.from('goals').insert([dbGoal]).select().single();
      if (data) {
        setGoals(prev => prev.map(g => g.id === tempId ? { ...g, ...data, colorTheme: data.color_theme } : g));
      }
    }
  };

  const updateGoal = async (id, updates) => {
    setGoals(goals.map(g => g.id === id ? { ...g, ...updates } : g));
    if (user) {
      const dbUpdates = { ...updates };
      if (dbUpdates.colorTheme) {
        dbUpdates.color_theme = dbUpdates.colorTheme;
        delete dbUpdates.colorTheme;
      }
      await supabase.from('goals').update(dbUpdates).eq('id', id);
    }
  };

  const deleteGoal = async (id) => {
    setGoals(goals.filter(g => g.id !== id));
    if (user) {
      await supabase.from('goals').delete().eq('id', id);
    }
  };

  // --- Activity Log Handlers ---
  const addActivityLog = async (logData) => {
    const newLog = {
      ...logData,
      id: user ? undefined : Date.now(),
      user_id: user?.id
    };

    const tempId = Date.now();
    setActivityLogs(prev => [...prev, { ...newLog, id: user ? tempId : newLog.id }]);

    if (user) {
      const { id, ...dbLog } = newLog;
      const { data, error } = await supabase.from('activity_logs').insert([dbLog]).select().single();
      if (data) {
        setActivityLogs(prev => prev.map(l => l.id === tempId ? { ...l, ...data } : l));
      }
    }
  };

  const deleteActivityLog = async (id) => {
    setActivityLogs(activityLogs.filter(log => log.id !== id));
    if (user) {
      await supabase.from('activity_logs').delete().eq('id', id);
    }
  };

  // --- Daily Highlight Handler ---
  const handleUpdateHighlight = async (key, text, completed = false) => {
    // Optimistic Update
    setDailyHighlights(prev => ({
      ...prev,
      [key]: { text, completed }
    }));

    if (user) {
      const { error } = await supabase
        .from('daily_highlights')
        .upsert({
          user_id: user.id,
          key,
          text,
          completed,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, key' });

      if (error) console.error("Error syncing highlight:", error);
    }
  };

  return (
    <div className={`min-h-screen bg-cream-50 dark:bg-void-950 text-ink-800 dark:text-bone-100 transition-colors duration-1000 ease-in-out mode-${displayMode}`}>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {/* Persona Avatar */}
            <PersonaAvatar
              mode={displayMode === 'penguin' ? 'penguin' : 'demon'}
              message={personaMessage}
              isTyping={isPersonaTyping}
            />

            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-4xl font-serif font-bold text-sage-600 dark:text-magma-500 tracking-widest drop-shadow-sm dark:drop-shadow-[0_2px_5px_rgba(239,68,68,0.5)] truncate">All in One Personal Assistance</h1>
              <p className="text-xs text-sage-500 dark:text-bone-200/50 mt-1">Developed by Mxllow</p>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 items-center flex-wrap w-full sm:w-auto justify-end">
            {/* Auth Button */}
            <button
              onClick={() => user ? signOut() : setShowAuthModal(true)}
              className={`px-3 sm:px-4 py-2 rounded-full backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-sage-200 dark:border-white/5 flex items-center gap-2 font-bold text-sm ${user ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-sage-100 dark:bg-sage-900/30 text-sage-700 dark:text-sage-300'}`}
              title={user ? 'Sign Out' : 'Login'}
            >
              {user ? (
                <>
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Login</span>
                </>
              )}
            </button>

            <div className="bg-white/50 dark:bg-void-800/50 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-full flex items-center gap-1.5 sm:gap-2 text-sage-800 dark:text-bone-200 font-bold shadow-sm border border-sage-200 dark:border-white/5 text-sm">
              <span className="text-yellow-500 text-base sm:text-lg drop-shadow-md">🪙</span>
              <span>{coins}</span>
            </div>

            {/* Display Mode Toggle */}
            <button
              onClick={cycleDisplayMode}
              className="p-2.5 sm:p-4 rounded-full backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-sage-200 dark:border-white/5 bg-white/50 dark:bg-void-800/50 hover:bg-white/80 dark:hover:bg-void-700 group"
              title={`Mode: ${displayMode === 'demon' ? 'Demon' : displayMode === 'penguin' ? 'Penguin' : 'Minimal'} (Click to cycle)`}
            >
              <span className="text-lg sm:text-xl">
                {displayMode === 'demon' && '👿'}
                {displayMode === 'penguin' && '🐧'}
                {displayMode === 'minimal' && '📋'}
              </span>
            </button>

            {/* User Profile Icon */}
            <UserProfile />

            <button
              onClick={toggleDarkMode}
              className="p-2.5 sm:p-4 rounded-full bg-white/50 dark:bg-void-800/50 hover:bg-white/80 dark:hover:bg-void-700 backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-sage-200 dark:border-white/5 group"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 group-hover:text-amber-300 transition-colors" /> : <Moon className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 group-hover:text-indigo-300 transition-colors" />}
            </button>
          </div>
        </header>

        <nav className="flex justify-center gap-2 sm:gap-4 mb-4 sm:mb-8 flex-wrap overflow-x-auto p-2">
          {['garden', 'focus', 'calendar', 'dailylog', 'vision'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 sm:px-6 py-2 rounded-full font-bold transition-all border capitalize text-sm sm:text-base whitespace-nowrap ${activeTab === tab ? 'bg-sage-100 dark:bg-magma-900/20 border-sage-500 dark:border-magma-500 text-sage-700 dark:text-magma-400 shadow-sm dark:shadow-[0_0_10px_rgba(239,68,68,0.2)] scale-105' : 'bg-white/50 dark:bg-void-800/30 border-transparent text-sage-600 dark:text-bone-200 hover:bg-white/80 dark:hover:bg-void-800/50'}`}
            >
              {tab === 'dailylog' ? 'Daily Log' : tab === 'vision' ? 'Vision Board' : tab === 'garden' ? 'My Tasks' : tab === 'focus' ? 'Focus Mode' : tab}
            </button>
          ))}
        </nav>

        {/* Only show TaskInput on My Tasks tab */}
        {activeTab === 'garden' && (
          <TaskInput onAdd={addTask} existingSubjects={existingSubjects} />
        )}

        <main className="relative">
          {isLoadingData && (
            <div className="absolute inset-0 bg-white/50 dark:bg-void-950/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
              <div className="animate-spin text-4xl">⏳</div>
            </div>
          )}

          {activeTab === 'garden' && (
            <>
              <div className="mb-12 text-center">
                <h2 className="text-2xl mb-2 font-serif italic text-sage-600/60 dark:text-bone-200/60">
                  "Stop procrastinating, just do the work"
                </h2>
              </div>

              <Garden
                tasks={tasks}
                onCompleteTask={completeTask}
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

          {activeTab === 'calendar' && (
            <Calendar tasks={tasks} onCompleteTask={completeTask} onAddTask={addTask} />
          )}

          {activeTab === 'vision' && (
            <VisionBoard
              goals={goals}
              onAddGoal={addGoal}
              onUpdateGoal={updateGoal}
              onDeleteGoal={deleteGoal}
              dailyHighlights={dailyHighlights}
              onUpdateHighlight={handleUpdateHighlight}
            />
          )}

          {activeTab === 'dailylog' && (
            <DailyLog
              logs={activityLogs}
              onAddLog={addActivityLog}
              onDeleteLog={deleteActivityLog}
              tasks={tasks}
            />
          )}

          {activeTab === 'focus' && (
            <div className="max-w-2xl mx-auto">
              <FocusTimer onComplete={(minutes) => {
                const reward = minutes;
                setCoins(prev => {
                  const newCoins = prev + reward;
                  if (user) supabase.from('profiles').update({ coins: newCoins }).eq('id', user.id).then();
                  return newCoins;
                });
                if (soundEnabled) playComplete();
                triggerPersonaReaction('complete', `Focus Session (${minutes}m)`);
              }}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}

export default App;
