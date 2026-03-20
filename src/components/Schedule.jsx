import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Mic, MicOff, Loader2, Clock, CheckCircle2, Calendar, Plus, GraduationCap } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';
import { parseScheduleCommand } from '../services/gemini';
import ScheduleEventModal from './ScheduleEventModal';
import { useLearning } from '../context/LearningContext';

const Schedule = ({ events, tasks = [], onAddEvent, onUpdateEvent, onDeleteEvent, onCompleteTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [weekDates, setWeekDates] = useState([]);
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);

    const { getTimetableForDay } = useLearning();

    // Generate the 7 days of the current week (Sunday to Saturday)
    useEffect(() => {
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
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

    // Gather events + tasks for a day (no habits)
    const getCombinedItemsForDay = (date) => {
        const dateStr = date.toISOString().split('T')[0];

        // Events
        const dayEvents = events.filter(event => {
            if ((!event.deadline && !event.startTime && !event.start_time)) return false;
            const eventDate = new Date(event.deadline || event.startTime || event.start_time);
            return eventDate.getDate() === date.getDate() &&
                eventDate.getMonth() === date.getMonth() &&
                eventDate.getFullYear() === date.getFullYear();
        }).map(e => ({
            ...e,
            _type: 'event',
            _sortTime: e.startTime || e.start_time || e.deadline ? new Date(e.startTime || e.start_time || e.deadline).getTime() : null,
            _hasTime: !!(e.startTime || e.start_time)
        }));

        // Tasks (with deadline, not harvested)
        const dayTasks = tasks.filter(task => {
            if (!task.deadline || task.status === 'harvested') return false;
            const taskDate = new Date(task.deadline);
            return taskDate.getDate() === date.getDate() &&
                taskDate.getMonth() === date.getMonth() &&
                taskDate.getFullYear() === date.getFullYear();
        }).map(t => {
            const tDate = new Date(t.deadline);
            const hasTime = tDate.getHours() !== 0 || tDate.getMinutes() !== 0;
            return {
                ...t,
                _type: 'task',
                _sortTime: tDate.getTime(),
                _hasTime: hasTime
            };
        });

        const allItems = [...dayEvents, ...dayTasks];

        // Timetable learning entries (recurring)
        const dayOfWeek = date.getDay();
        const timetableEntries = getTimetableForDay(dayOfWeek, date);
        timetableEntries.forEach((slot, idx) => {
            const [startH, startM] = (slot.start || '09:00').split(':').map(Number);
            const startDate = new Date(date);
            startDate.setHours(startH, startM, 0, 0);

            // Calculate duration from start/end
            const [endH, endM] = (slot.end || '10:00').split(':').map(Number);
            const durationMins = (endH * 60 + endM) - (startH * 60 + startM);

            allItems.push({
                id: `timetable-${slot.pathId}-${dayOfWeek}-${idx}`,
                title: `📖 ${slot.pathName}`,
                _type: 'timetable',
                _sortTime: startDate.getTime(),
                _hasTime: true,
                startTime: startDate.toISOString(),
                duration: durationMins > 0 ? durationMins : 60,
                category: 'Study',
                subject: 'Study',
                color: null,
                _pathColor: slot.pathColor,
                _pathIcon: slot.pathIcon,
            });
        });

        // Sort: no-time first, then chronological
        allItems.sort((a, b) => {
            if (!a._hasTime && b._hasTime) return -1;
            if (a._hasTime && !b._hasTime) return 1;
            return (a._sortTime || 0) - (b._sortTime || 0);
        });

        return allItems;
    };

    const handleColumnClick = (date) => {
        const clickedDate = new Date(date);
        clickedDate.setHours(12, 0, 0, 0);
        setSelectedDate(clickedDate);
        setSelectedEvent(null);
        setShowEventModal(true);
    };

    const handleItemClick = (item, e) => {
        e.stopPropagation();
        if (item._type === 'timetable') {
            return; // Timetable items are read-only in the schedule
        }
        if (item._type === 'task') {
            if (window.confirm(`Complete task "${item.title}"?`)) {
                if (onCompleteTask) onCompleteTask(item.id);
            }
        } else {
            setSelectedEvent(item);
            setSelectedDate(null);
            setShowEventModal(true);
        }
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

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

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

    const formatTime = (timestamp) => {
        const d = new Date(timestamp);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDuration = (mins) => {
        if (!mins) return '';
        if (mins >= 60) {
            const h = Math.floor(mins / 60);
            const m = mins % 60;
            return m > 0 ? `${h}h ${m}m` : `${h}h`;
        }
        return `${mins}m`;
    };

    // Count items across the week for header stats
    const weekItemCount = weekDates.reduce((sum, d) => sum + getCombinedItemsForDay(d).length, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-xl">
                            <Calendar className="text-indigo-600" size={24} />
                        </div>
                        Schedule
                    </h2>
                    <p className="text-sm text-gray-500 mt-1 ml-14">
                        Your weekly overview of events and tasks
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Voice Command */}
                    <button
                        onClick={handleVoiceCommand}
                        disabled={isProcessing}
                        className={`p-2.5 rounded-xl border transition-all shadow-sm ${isListening
                            ? 'bg-red-50 border-red-200 text-red-500 animate-pulse'
                            : isProcessing
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-400'
                                : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-indigo-600'
                            }`}
                        title="Voice Command"
                    >
                        {isProcessing ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : isListening ? (
                            <MicOff size={18} />
                        ) : (
                            <Mic size={18} />
                        )}
                    </button>

                    {/* Week Navigation */}
                    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl shadow-sm">
                        <button
                            onClick={() => navigateWeek(-1)}
                            className="p-2 hover:bg-gray-50 rounded-l-xl transition-colors text-gray-500 hover:text-gray-700"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => setCurrentDate(new Date())}
                            className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                            Today
                        </button>
                        <button
                            onClick={() => navigateWeek(1)}
                            className="p-2 hover:bg-gray-50 rounded-r-xl transition-colors text-gray-500 hover:text-gray-700"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Week Range Label */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">
                    {weekDates[0] && `${weekDates[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} — ${weekDates[6]?.toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-semibold">
                    {weekItemCount} item{weekItemCount !== 1 ? 's' : ''} this week
                </span>
            </div>

            {/* Weekly Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="grid grid-cols-7 min-w-[840px]">

                        {/* Day Headers */}
                        {weekDates.map((date, index) => {
                            const isTodayDate = isToday(date);
                            return (
                                <div
                                    key={`header-${index}`}
                                    className={`px-2 py-3 text-center border-b border-r border-gray-100 last:border-r-0
                                        ${isTodayDate ? 'bg-indigo-50' : 'bg-gray-50/50'}`}
                                >
                                    <div className={`text-[10px] font-bold uppercase tracking-widest mb-1
                                        ${isTodayDate ? 'text-indigo-500' : 'text-gray-400'}`}>
                                        {date.toLocaleDateString([], { weekday: 'short' })}
                                    </div>
                                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                                        ${isTodayDate
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30'
                                            : 'text-gray-700'
                                        }`}>
                                        {date.getDate()}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Day Columns — Items */}
                        {weekDates.map((date, index) => {
                            const isTodayDate = isToday(date);
                            const items = getCombinedItemsForDay(date);

                            return (
                                <div
                                    key={`col-${index}`}
                                    className={`min-h-[320px] border-r border-gray-100 last:border-r-0 p-1.5 cursor-pointer hover:bg-gray-50/50 transition-colors
                                        ${isTodayDate ? 'bg-indigo-50/30' : ''}`}
                                    onClick={() => handleColumnClick(date)}
                                >
                                    <div className="space-y-1.5">
                                        <AnimatePresence>
                                            {items.map(item => {
                                                const isTask = item._type === 'task';
                                                const isCompleted = isTask && (item.status === 'completed' || item.status === 'harvested');

                                                // Get color
                                                const colorInfo = item.color
                                                    ? { color: item.color, bgColor: `${item.color}18` }
                                                    : getColorForSubject(item.subject || item.category);

                                                const timeString = item._hasTime && item._sortTime ? formatTime(item._sortTime) : '';
                                                const duration = item.estimatedTime || item.duration || null;

                                                return (
                                                    <motion.div
                                                        key={item.id}
                                                        initial={{ opacity: 0, y: 6 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, scale: 0.95 }}
                                                        onClick={(e) => handleItemClick(item, e)}
                                                        className={`group relative rounded-xl p-2.5 cursor-pointer transition-all duration-200
                                                            hover:shadow-md hover:scale-[1.02]
                                                            ${isCompleted ? 'opacity-50' : ''}`}
                                                        style={{
                                                            backgroundColor: colorInfo.bgColor,
                                                            borderLeft: `3px solid ${colorInfo.color}`,
                                                        }}
                                                        title={isTask ? "Click to Complete Task" : "Edit Event"}
                                                    >
                                                        {/* Title */}
                                                        <h4 className={`text-xs font-bold leading-tight line-clamp-2 mb-1
                                                            ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                            {item.title}
                                                        </h4>

                                                        {/* Time & Duration */}
                                                        {(timeString || duration) && (
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {timeString && (
                                                                    <span className="text-[10px] font-semibold flex items-center gap-0.5"
                                                                        style={{ color: colorInfo.color }}>
                                                                        <Clock size={9} />
                                                                        {timeString}
                                                                    </span>
                                                                )}
                                                                {duration && (
                                                                    <span className="text-[10px] font-medium text-gray-400">
                                                                        {formatDuration(duration)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Category / Type Badge */}
                                                        {(item.subject || item.category || isTask) && (
                                                            <div className="mt-1.5">
                                                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide"
                                                                    style={{
                                                                        backgroundColor: `${colorInfo.color}15`,
                                                                        color: colorInfo.color,
                                                                    }}>
                                                                    {isTask ? 'Task' : (item.subject || item.category)}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Completed check overlay for tasks */}
                                                        {isTask && !isCompleted && (
                                                            <CheckCircle2
                                                                size={12}
                                                                className="absolute top-2 right-2 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            />
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>

                                        {/* Empty state — subtle add hint */}
                                        {items.length === 0 && (
                                            <div className="flex flex-col items-center justify-center h-16 opacity-0 hover:opacity-100 transition-opacity">
                                                <Plus size={14} className="text-gray-300" />
                                            </div>
                                        )}
                                    </div>
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
