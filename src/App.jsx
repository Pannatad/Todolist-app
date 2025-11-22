import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import useSound from 'use-sound';
import TaskInput from './components/TaskInput';
import Garden from './components/Garden';
import FocusTimer from './components/FocusTimer';
import Calendar from './components/Calendar';

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
  const [activeTab, setActiveTab] = useState('garden'); // 'garden' or 'focus'

  const [penguinMode, setPenguinMode] = useState(false);

  // Persistence
  useEffect(() => {
    localStorage.setItem('growth-tasks', JSON.stringify(tasks));
    localStorage.setItem('growth-coins', coins.toString());
    localStorage.setItem('growth-plots', unlockedPlots.toString());
  }, [tasks, coins, unlockedPlots]);

  // Theme Toggle
  const toggleSound = () => setSoundEnabled(!soundEnabled);
  const togglePenguinMode = () => setPenguinMode(!penguinMode);

  // Sound hooks (Placeholders - User needs to add files to public/sounds/)
  const [playPlant] = useSound('/sounds/plant.mp3', { volume: 0.5 });
  const [playComplete] = useSound('/sounds/water.mp3', { volume: 0.5 });
  // const [playAmbient, { stop: stopAmbient }] = useSound('/sounds/ambient.mp3', { loop: true, volume: 0.2 });

  // Task Handlers
  const addTask = ({ title, difficulty, deadline, subject }) => {
    const newTask = {
      id: Date.now(),
      title,
      difficulty,
      subject: subject || 'other', // Default to 'other'
      deadline, // ISO string or null
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

  return (
    <div className="min-h-screen bg-void-950 text-bone-100 transition-colors duration-1000 ease-in-out">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-void-800 border border-magma-500/30 rounded-full flex items-center justify-center text-magma-500 font-serif font-bold text-2xl shadow-[0_0_15px_rgba(239,68,68,0.3)]">D</div>
            <h1 className="text-4xl font-serif font-bold text-magma-500 tracking-widest drop-shadow-[0_2px_5px_rgba(239,68,68,0.5)]">Custom To-Do List</h1>
          </div>

          <div className="flex gap-3 items-center">
            <div className="bg-void-800/50 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 text-bone-200 font-bold shadow-sm border border-white/5">
              <span className="text-yellow-500 text-lg drop-shadow-md">🪙</span>
              <span>{coins}</span>
            </div>

            {/* Penguin Mode Toggle */}
            <button
              onClick={togglePenguinMode}
              className={`p-4 rounded-full backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-white/5 group ${penguinMode ? 'bg-blue-900/50 hover:bg-blue-800' : 'bg-void-800/50 hover:bg-void-700'}`}
              title="Toggle Penguin Mode"
            >
              <span className="text-xl">{penguinMode ? '🐧' : '👿'}</span>
            </button>

            <button
              onClick={toggleSound}
              className="p-4 rounded-full bg-void-800/50 hover:bg-void-700 backdrop-blur-md transition-all shadow-sm hover:scale-105 active:scale-95 border border-white/5 group"
            >
              {soundEnabled ? <Volume2 className="w-6 h-6 text-bone-200 group-hover:text-magma-400 transition-colors" /> : <VolumeX className="w-6 h-6 text-gray-500" />}
            </button>
          </div>
        </header>

        <nav className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('garden')}
            className={`px-6 py-2 rounded-full font-bold transition-all border ${activeTab === 'garden' ? 'bg-magma-900/20 border-magma-500 text-magma-400 shadow-[0_0_10px_rgba(239,68,68,0.2)] scale-105' : 'bg-void-800/30 border-transparent text-bone-200 hover:bg-void-800/50'}`}
          >
            Demon Lair
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-2 rounded-full font-bold transition-all border ${activeTab === 'calendar' ? 'bg-magma-900/20 border-magma-500 text-magma-400 shadow-[0_0_10px_rgba(239,68,68,0.2)] scale-105' : 'bg-void-800/30 border-transparent text-bone-200 hover:bg-void-800/50'}`}
          >
            Calendar
          </button>
          <button
            onClick={() => setActiveTab('focus')}
            className={`px-6 py-2 rounded-full font-bold transition-all border ${activeTab === 'focus' ? 'bg-magma-900/20 border-magma-500 text-magma-400 shadow-[0_0_10px_rgba(239,68,68,0.2)] scale-105' : 'bg-void-800/30 border-transparent text-bone-200 hover:bg-void-800/50'}`}
          >
            Focus Timer
          </button>
        </nav>

        <TaskInput onAdd={addTask} existingSubjects={existingSubjects} />

        <main>
          {activeTab === 'garden' && (
            <>
              <div className="mb-12 text-center">
                <h2 className="text-2xl mb-2 font-serif italic text-bone-200/60">
                  "Stop procrastinating, just do the work"
                </h2>
              </div>

              <Garden
                tasks={tasks}
                onCompleteTask={completeTask}
                onDeleteTask={deleteTask}
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

          {activeTab === 'focus' && (
            <FocusTimer onComplete={handleFocusComplete} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
