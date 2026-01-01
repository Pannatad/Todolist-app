import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { useTask } from '../context/TaskContext';

export const TaskCalendar = () => {
    const { tasks } = useTask();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDifficulties, setSelectedDifficulties] = useState([]);
    const [showFilter, setShowFilter] = useState(false);

    // Get all tasks with deadlines
    const tasksWithDeadlines = useMemo(() => {
        return tasks.filter(t => t.deadline && !t.completed && !t.archived);
    }, [tasks]);

    // Navigate months
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    // Get calendar data
    const { monthName, year, daysInMonth, firstDayOfMonth } = useMemo(() => {
        const monthName = currentDate.toLocaleString('default', { month: 'long' });
        const year = currentDate.getFullYear();
        const daysInMonth = new Date(year, currentDate.getMonth() + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, currentDate.getMonth(), 1).getDay();

        return { monthName, year, daysInMonth, firstDayOfMonth };
    }, [currentDate]);

    // Difficulty color mapping - matches task difficulty badges
    const difficultyColors = {
        easy: 'from-cyan-400/40 to-teal-400/30',
        medium: 'from-emerald-400/40 to-green-400/30',
        hard: 'from-red-400/40 to-rose-400/30',
    };

    const getDifficultyColor = (difficulty) => {
        return difficultyColors[difficulty?.toLowerCase()] || 'from-indigo-400/40 to-purple-400/30';
    };

    // Get task deadlines for the current month
    const taskDeadlines = useMemo(() => {
        const deadlines = new Map();

        const filteredTasks = selectedDifficulties.length > 0
            ? tasksWithDeadlines.filter(t => selectedDifficulties.includes(t.difficulty))
            : tasksWithDeadlines;

        filteredTasks.forEach(task => {
            if (!task.deadline) return;

            const deadlineDate = new Date(task.deadline);
            if (deadlineDate.getMonth() === currentDate.getMonth() &&
                deadlineDate.getFullYear() === currentDate.getFullYear()) {

                const day = deadlineDate.getDate();
                if (!deadlines.has(day)) {
                    deadlines.set(day, []);
                }

                deadlines.get(day).push({
                    title: task.title,
                    taskId: task.id,
                    difficulty: task.difficulty || 'medium',
                    subject: task.subject,
                    color: getDifficultyColor(task.difficulty)
                });
            }
        });

        return deadlines;
    }, [currentDate, tasksWithDeadlines, selectedDifficulties]);

    // Toggle difficulty filter
    const toggleDifficultyFilter = (difficulty) => {
        setSelectedDifficulties(prev => {
            if (prev.includes(difficulty)) {
                return prev.filter(d => d !== difficulty);
            } else {
                return [...prev, difficulty];
            }
        });
    };

    // Generate calendar grid
    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push(<div key={`empty-${i}`} className="min-h-24" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const dayTasks = taskDeadlines.get(day) || [];
        const isToday = new Date().getDate() === day &&
            new Date().getMonth() === currentDate.getMonth() &&
            new Date().getFullYear() === currentDate.getFullYear();

        calendarDays.push(
            <div
                key={day}
                className={`min-h-24 p-2 bg-white/20 backdrop-blur-xl rounded-xl border transition-all ${isToday ? 'border-white/60 ring-2 ring-white/40' : 'border-white/30'
                    } hover:bg-white/30`}
            >
                <div className={`text-sm font-bold mb-1 ${isToday ? 'text-white' : 'text-white/90'}`}>
                    {day}
                </div>
                <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((task, idx) => (
                        <div
                            key={idx}
                            className={`text-[10px] px-2 py-1 rounded-lg bg-gradient-to-r ${task.color} backdrop-blur-md border border-white/30 text-white font-medium truncate`}
                            title={`${task.title}${task.subject ? ` - ${task.subject}` : ''}`}
                        >
                            {task.title}
                        </div>
                    ))}
                    {dayTasks.length > 3 && (
                        <div className="text-[9px] text-white/70 text-center">
                            +{dayTasks.length - 3} more
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col p-4 md:p-8 overflow-y-auto custom-scrollbar bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 rounded-2xl">
            {/* Header */}
            <div className="relative z-10 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <CalendarIcon className="w-8 h-8 text-white" />
                        <h1 className="text-3xl font-bold text-white">Task Calendar</h1>
                    </div>

                    <button
                        onClick={() => setShowFilter(!showFilter)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all"
                    >
                        <Filter className="w-4 h-4" />
                        Filter Difficulty
                    </button>
                </div>

                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={goToPreviousMonth}
                        className="p-2 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    <h2 className="text-2xl font-bold text-white">
                        {monthName} {year}
                    </h2>

                    <button
                        onClick={goToNextMonth}
                        className="p-2 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Difficulty Filter */}
                {showFilter && (
                    <div className="mt-4 p-4 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30">
                        <p className="text-white font-medium mb-2">Select Difficulty:</p>
                        <div className="flex flex-wrap gap-2">
                            {['easy', 'medium', 'hard'].map(difficulty => (
                                <button
                                    key={difficulty}
                                    onClick={() => toggleDifficultyFilter(difficulty)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border capitalize ${selectedDifficulties.includes(difficulty) || selectedDifficulties.length === 0
                                        ? 'bg-white/40 border-white/50 text-white'
                                        : 'bg-white/10 border-white/20 text-white/60'
                                        }`}
                                >
                                    {difficulty}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Calendar Grid */}
            <div className="flex-1 relative z-10">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-white font-bold text-sm py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                    {calendarDays}
                </div>
            </div>

            {/* Legend */}
            {tasksWithDeadlines.length > 0 && (
                <div className="mt-6 p-4 bg-white/20 backdrop-blur-xl rounded-xl border border-white/30 relative z-10">
                    <p className="text-white font-bold mb-2 text-sm">Difficulty Levels:</p>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(difficultyColors).map(([difficulty, gradient]) => (
                            <div key={difficulty} className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${gradient}`} />
                                <span className="text-white text-xs capitalize">{difficulty}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
