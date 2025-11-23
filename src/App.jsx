import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Moon, Sun } from 'lucide-react';
import useSound from 'use-sound';
import TaskInput from './components/TaskInput';
import Garden from './components/Garden';
import FocusTimer from './components/FocusTimer';
import Calendar from './components/Calendar';
import AIHelpSidebar from './components/AIHelpSidebar';
import VisionBoard from './components/VisionBoard';
import DailyLog from './components/DailyLog';
import { suggestDifficulty, getPersonalizedAdvice } from './services/gemini';

// Sound assets (using placeholders or online URLs for now if local not available, 
// but for this task I'll assume we might need to add them or just use silence/log if missing. 
// Actually, I should try to use some free sounds if possible, or just setup the hook structure.)
// For now I will just set up the structure.

function App() {
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('dark-mode');
      return saved === 'true';
    } catch (e) {
      return false;
    }
  });
  const [activeTab, setActiveTab] = useState('garden'); // 'garden', 'calendar', 'focus', 'vision'

  const [penguinMode, setPenguinMode] = useState(false);

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

  // Daily Log State with Mock Data
  const [activityLogs, setActivityLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('daily-logs');
      if (saved) return JSON.parse(saved);

      // Mock data
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

  // Persistence
  useEffect(() => {
    localStorage.setItem('growth-tasks', JSON.stringify(tasks));
    localStorage.setItem('growth-coins', coins.toString());
    localStorage.setItem('growth-plots', unlockedPlots.toString());
    localStorage.setItem('vision-goals', JSON.stringify(goals));
    localStorage.setItem('daily-logs', JSON.stringify(activityLogs));
  }, [tasks, coins, unlockedPlots, goals, activityLogs]);

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
  const toggleSound = () => setSoundEnabled(!soundEnabled);
  const togglePenguinMode = () => setPenguinMode(!penguinMode);
  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Sound hooks (Placeholders - User needs to add files to public/sounds/)
  const [playPlant] = useSound('/sounds/plant.mp3', { volume: 0.5 });
  const [playComplete] = useSound('/sounds/water.mp3', { volume: 0.5 });
  // const [playAmbient, { stop: stopAmbient }] = useSound('/sounds/ambient.mp3', { loop: true, volume: 0.2 });

  // Task Handlers
  const addTask = ({ title, difficulty, deadline, subject, estimatedTime }) => {
    const newTask = {
      id: Date.now(),
      title,
      difficulty,
      subject: subject || 'other', // Default to 'other'
      deadline, // ISO string or null
      estimatedTime, // in minutes or null
      status: 'seed',
      createdAt: new Date().toISOString(),
    };
    setTasks([...tasks, newTask]);
    if (soundEnabled) playPlant();
  };

  const completeTask = (id) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    let newStatus;
    let reward = 0;

    // State transitions: seed → growing → harvested
    if (task.status === 'seed') {
      // First click: seed becomes growing (show flower)
      newStatus = 'growing';
      if (soundEnabled) playComplete();
    } else if (task.status === 'growing') {
      // Second click: growing becomes harvested (move to harvest section)
      newStatus = 'harvested';

      // Calculate Reward only on harvest
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
          reward += 10; // Bonus for on-time
        } else {
          reward = Math.max(0, reward - 5); // Penalty for late
        }
      }

      setCoins(prev => prev + reward);
      if (soundEnabled) playComplete();
    }

    setTasks(tasks.map(t =>
      t.id === id ? { ...t, status: newStatus, completedAt: new Date().toISOString() } : t
    ));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
    // Optional: Play a sound or show a notification
  };

  const updateTask = (id, updates) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
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

  const buyPlot = () => {
    const cost = 50; // Cost per plot
    if (coins >= cost) {
      setCoins(prev => prev - cost);
      setUnlockedPlots(prev => prev + 1);
    }
  };

  const handleFocusComplete = (minutes) => {
    const reward = minutes; // 1 coin per minute
    setCoins(prev => prev + reward);
    if (soundEnabled) playComplete();
  };

  // Extract unique subjects from existing tasks
  const existingSubjects = [...new Set(tasks.map(t => t.subject).filter(Boolean))];

  // Goal Handlers
  const addGoal = (goalData) => {
    setGoals([...goals, goalData]);
  };

  const updateGoal = (id, updates) => {
    setGoals(goals.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const deleteGoal = (id) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  // Activity Log Handlers
  const addActivityLog = (logData) => {
    setActivityLogs([...activityLogs, logData]);
  };

  const deleteActivityLog = (id) => {
    setActivityLogs(activityLogs.filter(log => log.id !== id));
  };

  return (
    <div className="min-h-screen bg-cream-50 dark:bg-void-950 text-ink-800 dark:text-bone-100 transition-colors duration-1000 ease-in-out">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-sage-100 dark:bg-void-800 border border-sage-300 dark:border-magma-500/30 rounded-full flex items-center justify-center text-sage-600 dark:text-magma-500 font-serif font-bold text-2xl shadow-sm dark:shadow-[0_0_15px_rgba(239,68,68,0.3)]">D</div>
            <div>
              <h1 className="text-4xl font-serif font-bold text-sage-600 dark:text-magma-500 tracking-widest drop-shadow-sm dark:drop-shadow-[0_2px_5px_rgba(239,68,68,0.5)]">All in One Personal Assistance</h1>
              <p className="text-xs text-sage-500 dark:text-bone-200/50 mt-1">Developed by Mxllow</p>
            </div>
          </div>

          <div className="flex gap-3 items-center">
            <div className="bg-white/50 dark:bg-void-800/50 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-sage-800 dark:text-bone-200 font-bold shadow-sm border border-sage-200 dark:border-white/5">
              <span className="text-yellow-500 text-lg drop-shadow-md">🪙</span>
              <span>{coins}</span>
            </div>

            {/* Penguin Mode Toggle */}
            <button
              onClick={togglePenguinMode}
              className={`p-4 rounded-full backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-sage-200 dark:border-white/5 group ${penguinMode ? 'bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 dark:hover:bg-blue-800' : 'bg-white/50 dark:bg-void-800/50 hover:bg-white/80 dark:hover:bg-void-700'}`}
              title="Toggle Penguin Mode"
            >
              <span className="text-xl">{penguinMode ? '🐧' : '👿'}</span>
            </button>

            <button
              onClick={toggleSound}
              className="p-4 rounded-full bg-white/50 dark:bg-void-800/50 hover:bg-white/80 dark:hover:bg-void-700 backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-sage-200 dark:border-white/5 group"
            >
              {soundEnabled ? <Volume2 className="w-6 h-6 text-sage-600 dark:text-bone-200 group-hover:text-sage-800 dark:group-hover:text-magma-400 transition-colors" /> : <VolumeX className="w-6 h-6 text-gray-500" />}
            </button>

            <button
              onClick={toggleDarkMode}
              className="p-4 rounded-full bg-white/50 dark:bg-void-800/50 hover:bg-white/80 dark:hover:bg-void-700 backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-sage-200 dark:border-white/5 group"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {isDarkMode ? <Sun className="w-6 h-6 text-amber-400 group-hover:text-amber-300 transition-colors" /> : <Moon className="w-6 h-6 text-indigo-400 group-hover:text-indigo-300 transition-colors" />}
            </button>
          </div>
        </header>

        <nav className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('garden')}
            className={`px-6 py-2 rounded-full font-bold transition-all border ${activeTab === 'garden' ? 'bg-sage-100 dark:bg-magma-900/20 border-sage-500 dark:border-magma-500 text-sage-700 dark:text-magma-400 shadow-sm dark:shadow-[0_0_10px_rgba(239,68,68,0.2)] scale-105' : 'bg-white/50 dark:bg-void-800/30 border-transparent text-sage-600 dark:text-bone-200 hover:bg-white/80 dark:hover:bg-void-800/50'}`}
          >
            My Tasks
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-2 rounded-full font-bold transition-all border ${activeTab === 'calendar' ? 'bg-sage-100 dark:bg-magma-900/20 border-sage-500 dark:border-magma-500 text-sage-700 dark:text-magma-400 shadow-sm dark:shadow-[0_0_10px_rgba(239,68,68,0.2)] scale-105' : 'bg-white/50 dark:bg-void-800/30 border-transparent text-sage-600 dark:text-bone-200 hover:bg-white/80 dark:hover:bg-void-800/50'}`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('dailylog')}
            className={`px-6 py-2 rounded-full font-bold transition-all border ${activeTab === 'dailylog' ? 'bg-sage-100 dark:bg-magma-900/20 border-sage-500 dark:border-magma-500 text-sage-700 dark:text-magma-400 shadow-sm dark:shadow-[0_0_10px_rgba(239,68,68,0.2)] scale-105' : 'bg-white/50 dark:bg-void-800/30 border-transparent text-sage-600 dark:text-bone-200 hover:bg-white/80 dark:hover:bg-void-800/50'}`}
          >
            Daily Log
          </button>
          <button
            onClick={() => setActiveTab('vision')}
            className={`px-6 py-2 rounded-full font-bold transition-all border ${activeTab === 'vision' ? 'bg-sage-100 dark:bg-magma-900/20 border-sage-500 dark:border-magma-500 text-sage-700 dark:text-magma-400 shadow-sm dark:shadow-[0_0_10px_rgba(239,68,68,0.2)] scale-105' : 'bg-white/50 dark:bg-void-800/30 border-transparent text-sage-600 dark:text-bone-200 hover:bg-white/80 dark:hover:bg-void-800/50'}`}
          >
            Vision Board
          </button>
          <button
            onClick={() => setActiveTab('focus')}
            className={`px-6 py-2 rounded-full font-bold transition-all border ${activeTab === 'focus' ? 'bg-sage-100 dark:bg-magma-900/20 border-sage-500 dark:border-magma-500 text-sage-700 dark:text-magma-400 shadow-sm dark:shadow-[0_0_10px_rgba(239,68,68,0.2)] scale-105' : 'bg-white/50 dark:bg-void-800/30 border-transparent text-sage-600 dark:text-bone-200 hover:bg-white/80 dark:hover:bg-void-800/50'}`}
          >
            Focus Timer
          </button>
        </nav>

        {/* Only show TaskInput on My Tasks tab */}
        {activeTab === 'garden' && (
          <TaskInput onAdd={addTask} existingSubjects={existingSubjects} />
        )}

        <main>
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
                onRequestAIHelp={handleRequestAIHelp}
                existingSubjects={existingSubjects}
                unlockedPlots={unlockedPlots}
                coins={coins}
                onBuyPlot={buyPlot}
                penguinMode={penguinMode}
              />
            </>
          )}

          {activeTab === 'calendar' && (
            <Calendar tasks={tasks} onCompleteTask={completeTask} />
          )}

          {activeTab === 'vision' && (
            <VisionBoard
              goals={goals}
              onAddGoal={addGoal}
              onUpdateGoal={updateGoal}
              onDeleteGoal={deleteGoal}
            />
          )}

          {activeTab === 'dailylog' && (
            <DailyLog
              logs={activityLogs}
              onAddLog={addActivityLog}
              onDeleteLog={deleteActivityLog}
            />
          )}

          {activeTab === 'focus' && (
            <FocusTimer onComplete={handleFocusComplete} />
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
    </div>
  );
}

export default App;
