import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';

const Schedule = ({ tasks, onAddTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [weekDates, setWeekDates] = useState([]);

    // Generate the 7 days of the current week
    useEffect(() => {
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay(); // 0 (Sun) to 6 (Sat)
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to start on Monday (or Sunday if preferred)
        // Let's start on Sunday for consistency with Calendar
        const firstDay = new Date(currentDate);
        firstDay.setDate(currentDate.getDate() - day);

        const dates = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(firstDay);
            date.setDate(firstDay.getDate() + i);
            dates.push(date);
        }
        setWeekDates(dates);
    }, [currentDate]);

    const navigateWeek = (direction) => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + (direction * 7));
        setCurrentDate(newDate);
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
    };

    // Time slots (e.g., 6 AM to 11 PM)
    const timeSlots = Array.from({ length: 18 }, (_, i) => i + 6); // 6 to 23

    // Helper to check if a task falls in a specific time slot
    const getTaskForSlot = (date, hour) => {
        return tasks.find(task => {
            if (!task.deadline || task.status === 'harvested') return false;
            const taskDate = new Date(task.deadline);
            return taskDate.getDate() === date.getDate() &&
                taskDate.getMonth() === date.getMonth() &&
                taskDate.getFullYear() === date.getFullYear() &&
                taskDate.getHours() === hour;
        });
    };

    // Handle adding a task at a specific time
    const handleSlotClick = (date, hour) => {
        // Create a default deadline date object
        const deadline = new Date(date);
        deadline.setHours(hour);
        deadline.setMinutes(0);
        deadline.setSeconds(0);

        // Format for datetime-local input (YYYY-MM-DDTHH:mm)
        // Note: We'll pass this to a prompt or modal. 
        // For now, let's use a simple prompt to get the title, 
        // but ideally we should open the TaskInput with pre-filled data.
        // Since TaskInput is in App.jsx, we might need a better way.
        // For this iteration, we'll use a simple prompt to demonstrate functionality.

        const title = prompt(`Schedule task for ${date.toLocaleDateString()} at ${hour}:00?`);
        if (title) {
            onAddTask({
                title,
                difficulty: 'medium', // Default
                deadline: deadline.toISOString(),
                subject: 'other',
                estimatedTime: 60 // Default 1 hour
            });
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-white/50 dark:bg-void-900/50 backdrop-blur-sm rounded-2xl border border-sage-200 dark:border-white/5 shadow-xl overflow-hidden">
            {/* Header / Navigation */}
            <div className="flex justify-between items-center p-4 border-b border-sage-200 dark:border-white/10">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-serif font-bold text-sage-800 dark:text-bone-100">
                        {weekDates[0] && `${weekDates[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                    </h2>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="text-xs px-3 py-1 rounded-full bg-sage-100 dark:bg-void-800 text-sage-600 dark:text-bone-300 hover:bg-sage-200 dark:hover:bg-void-700 transition-colors"
                    >
                        Today
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Schedule Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="min-w-[800px]"> {/* Ensure horizontal scroll on small screens */}

                    {/* Days Header */}
                    <div className="grid grid-cols-8 border-b border-sage-200 dark:border-white/10 sticky top-0 bg-white/95 dark:bg-void-900/95 z-10 backdrop-blur-sm">
                        <div className="p-4 text-center text-xs font-bold text-sage-400 border-r border-sage-100 dark:border-white/5">
                            Time
                        </div>
                        {weekDates.map((date, index) => (
                            <div
                                key={index}
                                className={`p-4 text-center border-r border-sage-100 dark:border-white/5 ${isToday(date) ? 'bg-sage-50 dark:bg-sage-900/20' : ''}`}
                            >
                                <div className={`text-xs font-bold uppercase mb-1 ${isToday(date) ? 'text-sage-600 dark:text-sage-400' : 'text-sage-400'}`}>
                                    {date.toLocaleDateString([], { weekday: 'short' })}
                                </div>
                                <div className={`text-lg font-bold ${isToday(date) ? 'text-sage-800 dark:text-bone-100' : 'text-sage-600 dark:text-bone-300'}`}>
                                    {date.getDate()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Time Slots */}
                    {timeSlots.map(hour => (
                        <div key={hour} className="grid grid-cols-8 border-b border-sage-100 dark:border-white/5 min-h-[80px]">
                            {/* Time Label */}
                            <div className="p-2 text-right text-xs font-medium text-sage-400 border-r border-sage-100 dark:border-white/5 relative">
                                <span className="absolute -top-2.5 right-2 bg-white/50 dark:bg-void-900/50 px-1">
                                    {hour}:00
                                </span>
                            </div>

                            {/* Days Columns */}
                            {weekDates.map((date, index) => {
                                const task = getTaskForSlot(date, hour);
                                return (
                                    <div
                                        key={`${index}-${hour}`}
                                        className={`
                                            relative border-r border-sage-100 dark:border-white/5 group transition-colors
                                            hover:bg-sage-50/50 dark:hover:bg-white/5 cursor-pointer
                                            ${isToday(date) ? 'bg-sage-50/30 dark:bg-sage-900/10' : ''}
                                        `}
                                        onClick={() => !task && handleSlotClick(date, hour)}
                                    >
                                        {/* Add Button on Hover (Empty Slot) */}
                                        {!task && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Plus size={20} className="text-sage-400" />
                                            </div>
                                        )}

                                        {/* Task Block */}
                                        {task && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="absolute inset-1 rounded-lg p-2 shadow-sm overflow-hidden cursor-pointer hover:brightness-110 transition-all z-10"
                                                style={{
                                                    backgroundColor: getColorForSubject(task.subject).bgColor,
                                                    borderLeft: `4px solid ${getColorForSubject(task.subject).color}`
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Ideally open edit modal
                                                    alert(`Task: ${task.title}\nDue: ${new Date(task.deadline).toLocaleString()}`);
                                                }}
                                            >
                                                <div className="text-xs font-bold truncate" style={{ color: getColorForSubject(task.subject).color }}>
                                                    {task.title}
                                                </div>
                                                <div className="text-[10px] opacity-80 truncate" style={{ color: getColorForSubject(task.subject).color }}>
                                                    {task.estimatedTime ? `${task.estimatedTime}m` : '1h'}
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Schedule;
