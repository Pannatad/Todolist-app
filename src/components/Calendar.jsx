import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';

const Calendar = ({ tasks, onCompleteTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);

    // Calendar Logic
    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const navigateMonth = (direction) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
        setSelectedDate(null);
    };

    // Group tasks by date
    const getTasksForDate = (day) => {
        return tasks.filter(task => {
            if (!task.deadline) return false;
            const taskDate = new Date(task.deadline);
            return taskDate.getDate() === day &&
                taskDate.getMonth() === currentDate.getMonth() &&
                taskDate.getFullYear() === currentDate.getFullYear() &&
                task.status !== 'harvested';
        });
    };

    const isToday = (day) => {
        const today = new Date();
        return day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear();
    };

    return (
        <div className="w-full max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-8 px-4">
                <h2 className="text-2xl font-serif text-magma-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.5)] flex items-center gap-2">
                    <CalendarIcon className="text-magma-400" />
                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => navigateMonth(-1)}
                        className="p-2 rounded-full bg-sage-100 dark:bg-void-800 border border-sage-200 dark:border-white/10 hover:bg-sage-200 dark:hover:bg-void-700 text-sage-600 dark:text-bone-200 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <button
                        onClick={() => navigateMonth(1)}
                        className="p-2 rounded-full bg-sage-100 dark:bg-void-800 border border-sage-200 dark:border-white/10 hover:bg-sage-200 dark:hover:bg-void-700 text-sage-600 dark:text-bone-200 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Calendar Grid - Takes up more space now */}
                <div className="lg:col-span-3 bg-white/50 dark:bg-void-900/50 backdrop-blur-sm rounded-2xl border border-sage-200 dark:border-white/5 p-6 shadow-xl">
                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 mb-4 text-center">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-xs font-bold text-sage-500 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-2 auto-rows-fr">
                        {/* Empty slots for previous month */}
                        {[...Array(firstDay)].map((_, i) => (
                            <div key={`empty-${i}`} className="min-h-[100px] bg-sage-50/50 dark:bg-void-800/20 rounded-xl" />
                        ))}

                        {/* Days */}
                        {[...Array(daysInMonth)].map((_, i) => {
                            const day = i + 1;
                            const dayTasks = getTasksForDate(day);
                            const isSelected = selectedDate === day;
                            const isTodayDate = isToday(day);
                            const displayTasks = dayTasks.slice(0, 3);
                            const remainingCount = dayTasks.length - 3;

                            return (
                                <motion.button
                                    key={day}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setSelectedDate(day)}
                                    className={`
                                        min-h-[100px] p-2 rounded-xl flex flex-col items-start justify-start relative transition-all text-left overflow-hidden
                                        ${isSelected ? 'bg-magma-500/10 dark:bg-magma-900/40 border-magma-500 ring-1 ring-magma-500' : 'bg-white/50 dark:bg-void-800/50 border-sage-100 dark:border-white/5 hover:bg-white dark:hover:bg-void-800'}
                                        ${isTodayDate ? 'ring-1 ring-sage-400' : 'border'}
                                    `}
                                >
                                    <span className={`text-sm font-bold mb-1 ${isTodayDate ? 'text-sage-600 dark:text-sage-400' : 'text-sage-700 dark:text-bone-300'}`}>
                                        {day}
                                    </span>

                                    {/* Task List in Cell */}
                                    <div className="w-full flex flex-col gap-1">
                                        {displayTasks.map((task) => {
                                            const color = getColorForSubject(task.subject);
                                            return (
                                                <div
                                                    key={task.id}
                                                    className="w-full text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium text-white shadow-sm"
                                                    style={{ backgroundColor: color.color }}
                                                    title={task.title}
                                                >
                                                    {task.title}
                                                </div>
                                            );
                                        })}
                                        {remainingCount > 0 && (
                                            <div className="text-[10px] text-sage-400 font-bold pl-1">
                                                +{remainingCount} more...
                                            </div>
                                        )}
                                    </div>
                                </motion.button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Date Details - Sidebar */}
                <div className="lg:col-span-1">
                    <AnimatePresence mode="wait">
                        {selectedDate ? (
                            <motion.div
                                key="details"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="bg-white/50 dark:bg-void-900/50 backdrop-blur-sm rounded-2xl border border-sage-200 dark:border-white/5 p-6 h-full sticky top-4"
                            >
                                <h3 className="text-xl font-serif text-sage-800 dark:text-bone-100 mb-4 border-b border-sage-200 dark:border-white/10 pb-2">
                                    {monthNames[currentDate.getMonth()]} {selectedDate}
                                </h3>

                                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    {getTasksForDate(selectedDate).length > 0 ? (
                                        getTasksForDate(selectedDate).map(task => {
                                            const color = getColorForSubject(task.subject);
                                            return (
                                                <div key={task.id} className="bg-white dark:bg-void-800 p-3 rounded-xl border border-sage-100 dark:border-white/5 flex items-start gap-3 group hover:border-magma-500/30 transition-colors">
                                                    <div
                                                        className="w-1 h-full min-h-[2rem] rounded-full"
                                                        style={{ backgroundColor: color.color }}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="text-sm font-bold text-sage-800 dark:text-bone-200 group-hover:text-magma-500 dark:group-hover:text-magma-400 transition-colors truncate">{task.title}</h4>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <span
                                                                className="text-[10px] px-1.5 py-0.5 rounded-full font-bold"
                                                                style={{ backgroundColor: color.bgColor, color: color.color }}
                                                            >
                                                                {task.subject || 'Other'}
                                                            </span>
                                                            <span className="text-[10px] text-sage-500 flex items-center gap-1">
                                                                <Clock size={10} />
                                                                {new Date(task.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center py-8 text-sage-500 italic">
                                            No tasks scheduled for this day...
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="empty"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="bg-white/30 dark:bg-void-900/30 rounded-2xl border border-sage-200 dark:border-white/5 p-6 h-full flex flex-col items-center justify-center text-center text-sage-500 sticky top-4"
                            >
                                <CalendarIcon size={48} className="mb-4 opacity-20" />
                                <p>Select a date to view full details</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default Calendar;
