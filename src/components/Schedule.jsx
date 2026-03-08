import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Plus, Mic, MicOff, Loader2 } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';
import { parseScheduleCommand } from '../services/gemini';
import ScheduleEventModal from './ScheduleEventModal';
import { useHabit } from '../context/HabitContext';

const Schedule = ({ events, onAddEvent, onUpdateEvent, onDeleteEvent }) => {
    const { habits, getHabitsForDate, getHabitLog } = useHabit();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [weekDates, setWeekDates] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);

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

    // Get habits with reminder_time scheduled for a given day, formatted as pseudo-events
    const getHabitBlocksForDay = (date) => {
        const dayHabits = getHabitsForDate(date);
        const dateStr = date.toISOString().split('T')[0];
        return dayHabits
            .filter(h => h.reminder_time) // Only habits with a specific time
            .map(h => {
                const [hours, minutes] = h.reminder_time.split(':').map(Number);
                const start = new Date(date);
                start.setHours(hours, minutes, 0, 0);
                const log = getHabitLog(h.id, dateStr);
                return {
                    id: `habit_${h.id}`,
                    title: `${h.icon || '✨'} ${h.name}`,
                    startTime: start.toISOString(),
                    duration: 30, // default 30min block
                    isHabit: true,
                    completed: log?.completed || false,
                    habitColor: '#14B8A6', // teal
                };
            });
    };

    const handleTimeClick = (date, hour, minute) => {
        const clickedDate = new Date(date);
        clickedDate.setHours(hour);
        clickedDate.setMinutes(minute);
        clickedDate.setSeconds(0);

        setSelectedDate(clickedDate);
        setSelectedEvent(null);
        setShowEventModal(true);
    };

    const handleEventClick = (event, e) => {
        e.stopPropagation();
        setSelectedEvent(event);
        setSelectedDate(null);
        setShowEventModal(true);
    };

    const handleSaveEvent = (eventData) => {
        if (eventData.id) {
            onUpdateEvent(eventData.id, eventData);
        } else {
            onAddEvent(eventData);
        }
    };

    const handleVoiceCommand = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
            return;
        }

        if (isListening) {
            setIsListening(false);
            return;
        }

        const recognition = new window.webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.onstart = () => {
            setIsListening(true);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onresult = async (event) => {
            const transcript = event.results[0][0].transcript;
            console.log("Voice command:", transcript);

            setIsProcessing(true);
            try {
                const parsedEvent = await parseScheduleCommand(transcript);
                if (parsedEvent) {
                    onAddEvent({
                        title: parsedEvent.title,
                        startTime: parsedEvent.startTime,
                        category: parsedEvent.category || 'Other',
                        duration: parsedEvent.duration || 60
                    });
                    alert(`Scheduled: ${parsedEvent.title} at ${new Date(parsedEvent.startTime).toLocaleTimeString()}`);
                } else {
                    alert("Could not understand the command. Please try again.");
                }
            } catch (error) {
                console.error("Error processing voice command:", error);
                alert("Something went wrong. Please try again.");
            } finally {
                setIsProcessing(false);
            }
        };

        recognition.start();
    };

    return (
        <div className="w-full h-full flex flex-col bg-gradient-to-br from-indigo-900/90 via-purple-900/90 to-violet-900/90 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
            {/* Header / Navigation */}
            <div className="flex justify-between items-center p-4 border-b border-white/10 flex-none bg-white/5">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-serif font-bold text-white">
                        {weekDates[0] && `${weekDates[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} - ${weekDates[6].toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                    </h2>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/80 hover:bg-white/20 transition-colors border border-white/20"
                    >
                        Today
                    </button>
                </div>
                <div className="flex gap-2 items-center">
                    <button
                        onClick={handleVoiceCommand}
                        disabled={isProcessing}
                        className={`p-2 rounded-full transition-all ${isListening
                            ? 'bg-red-500 text-white animate-pulse'
                            : isProcessing
                                ? 'bg-indigo-400/30 text-indigo-200'
                                : 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-400 hover:to-indigo-400 shadow-lg'
                            }`}
                        title="Voice Command"
                    >
                        {isProcessing ? (
                            <Loader2 size={20} className="animate-spin" />
                        ) : isListening ? (
                            <MicOff size={20} />
                        ) : (
                            <Mic size={20} />
                        )}
                    </button>
                    <div className="w-px h-6 bg-white/20 mx-2" />
                    <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white">
                        <ChevronLeft size={20} />
                    </button>
                    <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Schedule Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar relative">
                <div className="min-w-[1600px] relative">

                    {/* Header Row (Days) */}
                    <div className="flex border-b border-white/10 sticky top-0 bg-indigo-900/95 z-20 backdrop-blur-sm">
                        <div className="w-16 flex-none p-4 text-center text-xs font-bold text-white/50 border-r border-white/10 sticky left-0 z-30 bg-indigo-900/95">
                            Time
                        </div>
                        {weekDates.map((date, index) => (
                            <div
                                key={index}
                                className={`flex-1 p-4 text-center border-r border-white/10 ${isToday(date) ? 'bg-purple-500/20' : ''}`}
                            >
                                <div className={`text-xs font-bold uppercase mb-1 ${isToday(date) ? 'text-purple-300' : 'text-white/50'}`}>
                                    {date.toLocaleDateString([], { weekday: 'short' })}
                                </div>
                                <div className={`text-lg font-bold ${isToday(date) ? 'text-white' : 'text-white/80'}`}>
                                    {date.getDate()}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Main Grid Area */}
                    <div className="flex relative" style={{ height: (END_HOUR - START_HOUR) * PIXELS_PER_HOUR }}>

                        {/* Time Labels Column */}
                        <div className="w-16 flex-none border-r border-white/10 bg-indigo-900/95 z-30 sticky left-0">
                            {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => {
                                const hour = START_HOUR + i;
                                return (
                                    <div
                                        key={hour}
                                        className="relative border-b border-white/5 w-full"
                                        style={{ height: PIXELS_PER_HOUR }}
                                    >
                                        <span className="absolute -top-2.5 right-2 text-xs font-medium text-white/40 bg-indigo-900/80 px-1">
                                            {hour > 24 ? `${hour - 24}:00` : `${hour}:00`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Day Columns */}
                        {weekDates.map((date, dayIndex) => {
                            const dayEvents = [...getEventsForDay(date), ...getHabitBlocksForDay(date)];

                            return (
                                <div
                                    key={dayIndex}
                                    className={`flex-1 relative border-r border-white/5 ${isToday(date) ? 'bg-purple-500/10' : ''}`}
                                >
                                    {/* Hour Grid Lines */}
                                    {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="border-b border-white/5 w-full hover:bg-white/5 transition-colors cursor-pointer"
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
                                        const eventColor = event.color || getColorForSubject(event.subject || event.category).color;
                                        const bgColor = event.color ? `${event.color}40` : getColorForSubject(event.subject || event.category).bgColor;

                                        const isHabit = event.isHabit;
                                        const finalColor = isHabit ? event.habitColor : eventColor;
                                        const finalBg = isHabit ? 'rgba(20, 184, 166, 0.15)' : bgColor;

                                        return (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                className={`absolute left-1 right-1 rounded-lg p-2 shadow-lg overflow-hidden cursor-pointer hover:brightness-110 transition-all z-10 backdrop-blur-sm ${isHabit ? 'border-l-4 border-dashed' : 'border-l-4'}`}
                                                style={{
                                                    top: `${top}px`,
                                                    height: `${Math.max(height, 20)}px`,
                                                    backgroundColor: finalBg,
                                                    borderColor: finalColor,
                                                    opacity: isHabit && event.completed ? 0.5 : 1,
                                                }}
                                                onClick={(e) => {
                                                    if (isHabit) {
                                                        e.stopPropagation();
                                                        // Habits are view-only on the schedule
                                                    } else {
                                                        handleEventClick(event, e);
                                                    }
                                                }}
                                            >
                                                <div className={`text-xs font-bold truncate ${isHabit && event.completed ? 'line-through' : ''}`} style={{ color: finalColor }}>
                                                    {event.title}
                                                </div>
                                                {height > 30 && (
                                                    <div className="text-[10px] opacity-80 truncate" style={{ color: finalColor }}>
                                                        {isHabit ? (event.completed ? '✅ Done' : '○ Habit') : `${duration}m`}
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

            {/* Schedule Event Modal */}
            <ScheduleEventModal
                isOpen={showEventModal}
                onClose={() => {
                    setShowEventModal(false);
                    setSelectedEvent(null);
                    setSelectedDate(null);
                }}
                onSave={handleSaveEvent}
                onDelete={onDeleteEvent}
                event={selectedEvent}
                selectedDate={selectedDate}
            />
        </div>
    );
};

export default Schedule;

