import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';

const Schedule = ({ events, onAddEvent, onUpdateEvent, onDeleteEvent }) => {
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

    // Visual Configuration
    const START_HOUR = 0; // 0 AM (Midnight)
    const END_HOUR = 24; // 12 AM (Midnight next day)
    const PIXELS_PER_HOUR = 72; // Reverted to original height
    const PIXELS_PER_MINUTE = PIXELS_PER_HOUR / 60;

    // Helper to check if an event falls in a specific day
    const getEventsForDay = (date) => {
        return events.filter(event => {
            if ((!event.deadline && !event.startTime && !event.start_time)) return false;
            const eventDate = new Date(event.deadline || event.startTime || event.start_time);
            return eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear();
        });
    };

    const handleTimeClick = (date, hour, minute) => {
        const deadline = new Date(date);
        deadline.setHours(hour);
        deadline.setMinutes(minute);
        deadline.setSeconds(0);

        const title = prompt(`Schedule event for ${date.toLocaleDateString()} at ${hour}:${minute.toString().padStart(2, '0')}?`);
        if (title) {
            onAddEvent({
                title,
                startTime: deadline.toISOString(),
                category: 'other',
                duration: 60
            });
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-white/50 dark:bg-void-900/50 backdrop-blur-sm rounded-2xl border border-sage-200 dark:border-white/5 shadow-xl overflow-hidden">
            {/* Header / Navigation */}
            <div className="flex justify-between items-center p-4 border-b border-sage-200 dark:border-white/10 flex-none">
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
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="min-w-[1600px] relative">

                    {/* Header Row (Days) */}
                    <div className="flex border-b border-sage-200 dark:border-white/10 sticky top-0 bg-white/95 dark:bg-void-900/95 z-20 backdrop-blur-sm">
                        <div className="w-16 flex-none p-4 text-center text-xs font-bold text-sage-400 border-r border-sage-100 dark:border-white/5 sticky left-0 z-30 bg-white/95 dark:bg-void-900/95">
                            Time
                        </div>
                        {weekDates.map((date, index) => (
                            <div
                                key={index}
                                className={`flex-1 p-4 text-center border-r border-sage-100 dark:border-white/5 ${isToday(date) ? 'bg-sage-50 dark:bg-sage-900/20' : ''}`}
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

                    {/* Main Grid Area */}
                    <div className="flex relative" style={{ height: (END_HOUR - START_HOUR) * PIXELS_PER_HOUR }}>

                        {/* Time Labels Column */}
                        <div className="w-16 flex-none border-r border-sage-100 dark:border-white/5 bg-white/95 dark:bg-void-900/95 z-30 sticky left-0">
                            {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => {
                                const hour = START_HOUR + i;
                                return (
                                    <div
                                        key={hour}
                                        className="relative border-b border-sage-100 dark:border-white/5 w-full"
                                        style={{ height: PIXELS_PER_HOUR }}
                                    >
                                        <span className="absolute -top-2.5 right-2 text-xs font-medium text-sage-400 bg-white/50 dark:bg-void-900/50 px-1">
                                            {hour > 24 ? `${hour - 24}:00` : `${hour}:00`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Day Columns */}
                        {weekDates.map((date, dayIndex) => {
                            const dayEvents = getEventsForDay(date);

                            return (
                                <div
                                    key={dayIndex}
                                    className={`flex-1 relative border-r border-sage-100 dark:border-white/5 ${isToday(date) ? 'bg-sage-50/30 dark:bg-sage-900/10' : ''}`}
                                >
                                    {/* Hour Grid Lines */}
                                    {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="border-b border-sage-100 dark:border-white/5 w-full hover:bg-sage-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                            style={{ height: PIXELS_PER_HOUR }}
                                            onClick={() => handleTimeClick(date, START_HOUR + i, 0)}
                                        />
                                    ))}

                                    {/* Events */}
                                    {dayEvents.map(event => {
                                        const eventDate = new Date(event.deadline || event.startTime || event.start_time);
                                        const hour = eventDate.getHours();
                                        const minute = eventDate.getMinutes();

                                        if (hour < START_HOUR || hour >= END_HOUR) return null;

                                        const top = ((hour - START_HOUR) * 60 + minute) * PIXELS_PER_MINUTE;
                                        const duration = event.estimatedTime || event.duration || 60;
                                        const height = duration * PIXELS_PER_MINUTE;
                                        const color = getColorForSubject(event.subject || event.category);

                                        return (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className="absolute left-1 right-1 rounded-lg p-2 shadow-sm overflow-hidden cursor-pointer hover:brightness-110 transition-all z-10 border-l-4"
                                                style={{
                                                    top: `${top}px`,
                                                    height: `${Math.max(height, 20)}px`, // Min height for visibility
                                                    backgroundColor: color.bgColor,
                                                    borderColor: color.color
                                                }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    // Simple interaction for now: Prompt for action
                                                    const action = window.prompt(
                                                        `Event: ${event.title}\nTime: ${hour}:${minute.toString().padStart(2, '0')}\nDuration: ${duration}m\n\nType 'delete' to remove, or type a new title to rename:`
                                                    );

                                                    if (action) {
                                                        if (action.toLowerCase() === 'delete') {
                                                            if (window.confirm(`Are you sure you want to delete "${event.title}"?`)) {
                                                                onDeleteEvent(event.id);
                                                            }
                                                        } else {
                                                            onUpdateEvent(event.id, { title: action });
                                                        }
                                                    }
                                                }}
                                            >
                                                <div className="text-xs font-bold truncate" style={{ color: color.color }}>
                                                    {event.title}
                                                </div>
                                                {height > 30 && (
                                                    <div className="text-[10px] opacity-80 truncate" style={{ color: color.color }}>
                                                        {duration}m
                                                    </div>
                                                )}
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Schedule;
