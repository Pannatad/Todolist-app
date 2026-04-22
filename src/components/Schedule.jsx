import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Mic, MicOff, Loader2, Clock, CheckCircle2, Calendar, Plus, GraduationCap } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';
import { parseScheduleCommand } from '../services/aiClient';
import ScheduleEventModal from './ScheduleEventModal';
import { useLearning } from '../context/LearningContext';
import { COLOR_OPTIONS } from './LearningPathModal';
import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences';
import { isTaskActive, isTaskCompleted } from '../utils/taskState';

const CELL_HEIGHT = 56; // px per hour row

const formatHour = (h) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
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

const formatTime = (timestamp) => {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const Schedule = ({ events, tasks = [], onAddEvent, onUpdateEvent, onDeleteEvent, onCompleteTask }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const scrollContainerRef = useRef(null);
    const recognitionRef = useRef(null);

    const { getTimetableForDay } = useLearning();

    const weekDates = useMemo(() => {
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
        return dates;
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

    // Gather ALL items for a day (events, tasks, timetable entries)
    const getCombinedItemsForDay = useCallback((date) => {
        const dateStr = toLocalDateKey(date);
        const dayEvents = getScheduleItemsForDate(events, date).map((event) => ({
            ...event,
            _type: 'event',
            _sortTime: event.displayTime?.getTime() || 0,
            _hasTime: !!(event.startTime || event.start_time),
            _occurrenceDate: event._occurrenceDate || dateStr,
            _isRecurrence: event.isRecurring
        }));

        // Tasks (with deadline, not harvested)
        const dayTasks = tasks.filter(task => {
            if (!task.deadline || !isTaskActive(task)) return false;
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
                _start: slot.start,
                _end: slot.end,
            });
        });

        return allItems;
    }, [events, getTimetableForDay, tasks]);

    // Split items into timed and all-day
    const weekData = useMemo(() => {
        if (weekDates.length === 0) return { allDayByCol: {}, timedByCol: {} };

        const allDayByCol = {};
        const timedByCol = {};

        weekDates.forEach((date, colIdx) => {
            const items = getCombinedItemsForDay(date);
            allDayByCol[colIdx] = items.filter(i => !i._hasTime);
            timedByCol[colIdx] = items.filter(i => i._hasTime).sort((a, b) => (a._sortTime || 0) - (b._sortTime || 0));
        });

        return { allDayByCol, timedByCol };
    }, [getCombinedItemsForDay, weekDates]);

    // Always show full 24 hours
    const startHour = 0;
    const endHour = 24;
    const totalHours = 24;

    // Find the earliest item hour for auto-scrolling
    const earliestHour = useMemo(() => {
        const allTimed = Object.values(weekData.timedByCol).flat();
        if (allTimed.length === 0) return 8; // default scroll to 8 AM
        let minH = 24;
        allTimed.forEach(item => {
            const d = new Date(item._sortTime);
            minH = Math.min(minH, d.getHours());
        });
        return Math.max(0, minH - 1);
    }, [weekData.timedByCol]);

    // Auto-scroll to earliest item or current hour on mount / week change
    useEffect(() => {
        if (scrollContainerRef.current) {
            const scrollTarget = earliestHour * CELL_HEIGHT;
            scrollContainerRef.current.scrollTop = scrollTarget;
        }
    }, [earliestHour, weekDates]);

    // Check if there are any all-day items
    const hasAllDayItems = useMemo(() => {
        return Object.values(weekData.allDayByCol).some(items => items.length > 0);
    }, [weekData.allDayByCol]);

    const handleColumnClick = (date) => {
        const clickedDate = new Date(date);
        clickedDate.setHours(12, 0, 0, 0);
        setSelectedDate(clickedDate);
        setSelectedEvent(null);
        setShowEventModal(true);
    };

    const handleGridCellClick = useCallback((date, hour) => {
        const clickedDate = new Date(date);
        clickedDate.setHours(hour, 0, 0, 0);
        setSelectedDate(clickedDate);
        setSelectedEvent(null);
        setShowEventModal(true);
    }, []);

    const handleItemClick = (item, e) => {
        e.stopPropagation();
        if (item._type === 'timetable') {
            return; // Timetable items are read-only
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

    const handleDeleteEvent = (eventId, options) => {
        onDeleteEvent?.(eventId, options);
    };

    useEffect(() => {
        return () => {
            recognitionRef.current?.stop?.();
        };
    }, []);

    const handleVoiceCommand = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Voice recognition is not supported in this browser. Please use Chrome or Edge.");
            return;
        }

        if (isListening) {
            recognitionRef.current?.stop?.();
            setIsListening(false);
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;
        recognitionRef.current = recognition;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => {
            setIsListening(false);
            recognitionRef.current = null;
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

    const weekItemCount = useMemo(() => (
        Object.values(weekData.allDayByCol).reduce((sum, items) => sum + items.length, 0) +
        Object.values(weekData.timedByCol).reduce((sum, items) => sum + items.length, 0)
    ), [weekData.allDayByCol, weekData.timedByCol]);

    // Helper to get block style for a timed item
    const getBlockStyle = (item) => {
        const d = new Date(item._sortTime);
        const sh = d.getHours();
        const sm = d.getMinutes();
        const dur = item.duration || item.estimatedTime || 60;
        const startOffset = (sh - startHour) + sm / 60;
        const blockHeight = (dur / 60) * CELL_HEIGHT;

        return {
            marginTop: startOffset * CELL_HEIGHT,
            height: Math.max(blockHeight, 24),
        };
    };

    // Render a single item block (timed)
    const renderTimedBlock = (item, colIdx, idx) => {
        const isTimetable = item._type === 'timetable';
        const isTask = item._type === 'task';
        const isCompleted = isTask && isTaskCompleted(item);

        const style = getBlockStyle(item);
        const dur = item.duration || item.estimatedTime || 60;

        if (isTimetable) {
            // Use gradient like TimetableSummary
            const colorConfig = COLOR_OPTIONS.find(c => c.name === item._pathColor) || COLOR_OPTIONS[0];
            return (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: colIdx * 0.02 + idx * 0.03 }}
                    onClick={(e) => handleItemClick(item, e)}
                    className={`bg-gradient-to-br ${colorConfig.gradient} rounded-xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-all cursor-default overflow-hidden group left-0.5 right-0.5`}
                    style={{
                        position: 'absolute',
                        top: style.marginTop,
                        height: style.height,
                        left: 2,
                        right: 2,
                    }}
                    title={`${item.title}\n${item._start || ''} – ${item._end || ''} (${formatDuration(dur)})`}
                >
                    <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full blur-lg -mr-4 -mt-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="p-1.5 h-full flex flex-col justify-center" style={{ position: 'relative', zIndex: 10 }}>
                        <div className="text-xs font-bold text-white truncate leading-tight">
                            {item._pathIcon} {item.title.replace('📖 ', '')}
                        </div>
                        {style.height >= 44 && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <Clock size={9} className="text-white/60 flex-shrink-0" />
                                <span className="text-[10px] text-white/70 truncate">
                                    {item._start} – {item._end}
                                </span>
                            </div>
                        )}
                    </div>
                </motion.div>
            );
        }

        // Event or Task — solid color block
        const colorInfo = item.color
            ? { color: item.color, bgColor: `${item.color}18` }
            : getColorForSubject(item.subject || item.category);

        const timeString = item._sortTime ? formatTime(item._sortTime) : '';
        const isCompactBlock = style.height < 72;
        const showTimeRow = style.height >= 38 && (timeString || dur);
        const showCategoryTag = style.height >= 68 && (item.subject || item.category || isTask);

        return (
            <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: colIdx * 0.02 + idx * 0.03 }}
                onClick={(e) => handleItemClick(item, e)}
                className={`rounded-xl shadow-sm hover:shadow-md hover:scale-[1.02] transition-all cursor-pointer overflow-hidden group
                    ${isCompleted ? 'opacity-50' : ''}`}
                style={{
                    position: 'absolute',
                    top: style.marginTop,
                    height: style.height,
                    left: 2,
                    right: 2,
                    backgroundColor: colorInfo.bgColor,
                    borderLeft: `3px solid ${colorInfo.color}`,
                }}
                title={isTask ? "Click to Complete Task" : "Edit Event"}
            >
                <div className={`p-1.5 h-full flex flex-col overflow-hidden ${isCompactBlock ? 'justify-start' : 'justify-center'}`}>
                    <h4 className={`font-bold leading-tight truncate
                        ${isCompactBlock ? 'text-[10px]' : 'text-[11px]'}
                        ${isCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                        {item.title}
                    </h4>
                    {showTimeRow && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {timeString && (
                                <span className="text-[9px] font-semibold flex items-center gap-0.5"
                                    style={{ color: colorInfo.color }}>
                                    <Clock size={8} />
                                    {timeString}
                                </span>
                            )}
                            {dur && (
                                <span className="text-[9px] font-medium text-gray-400">
                                    {formatDuration(dur)}
                                </span>
                            )}
                        </div>
                    )}
                    {showCategoryTag && (
                        <div className="mt-0.5">
                            <span className="text-[8px] font-bold px-1 py-0.5 rounded-md uppercase tracking-wide"
                                style={{
                                    backgroundColor: `${colorInfo.color}15`,
                                    color: colorInfo.color,
                                }}>
                                {isTask ? 'Task' : (item.subject || item.category)}
                            </span>
                        </div>
                    )}
                </div>

                {isTask && !isCompleted && (
                    <CheckCircle2
                        size={11}
                        className="absolute top-1.5 right-1.5 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                )}
            </motion.div>
        );
    };

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
                        Your weekly timetable of events and tasks
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

            {/* Timetable Grid */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[840px]">

                        {/* Day Headers */}
                        <div className="grid gap-0" style={{ gridTemplateColumns: '54px repeat(7, 1fr)' }}>
                            <div className="border-b border-r border-gray-100 bg-gray-50/30" /> {/* Empty corner */}
                            {weekDates.map((date, index) => {
                                const isTodayDate = isToday(date);
                                const dayItems = getCombinedItemsForDay(date);
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
                                        {dayItems.length > 0 && (
                                            <div className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                {dayItems.length} item{dayItems.length !== 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* All Day Section */}
                        {hasAllDayItems && (
                            <div className="grid gap-0 border-b border-gray-200" style={{ gridTemplateColumns: '54px repeat(7, 1fr)' }}>
                                <div className="px-1 py-2 text-right pr-2 border-r border-gray-100 bg-gray-50/30">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">All Day</span>
                                </div>
                                {weekDates.map((date, colIdx) => {
                                    const items = weekData.allDayByCol[colIdx] || [];
                                    const isTodayDate = isToday(date);
                                    return (
                                        <div
                                            key={`allday-${colIdx}`}
                                            className={`border-r border-gray-100 last:border-r-0 p-1 min-h-[36px] cursor-pointer hover:bg-gray-50/50 transition-colors
                                                ${isTodayDate ? 'bg-indigo-50/20' : ''}`}
                                            onClick={() => handleColumnClick(date)}
                                        >
                                            <div className="space-y-1">
                                                {items.map(item => {
                                                    const isTask = item._type === 'task';
                                                    const isCompleted = isTask && isTaskCompleted(item);
                                                    const colorInfo = item.color
                                                        ? { color: item.color, bgColor: `${item.color}18` }
                                                        : getColorForSubject(item.subject || item.category);
                                                    return (
                                                        <motion.div
                                                            key={item.id}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            onClick={(e) => handleItemClick(item, e)}
                                                            className={`rounded-lg px-2 py-1 text-[10px] font-bold truncate cursor-pointer hover:shadow-sm transition-all
                                                                ${isCompleted ? 'opacity-50 line-through' : ''}`}
                                                            style={{
                                                                backgroundColor: colorInfo.bgColor,
                                                                borderLeft: `2px solid ${colorInfo.color}`,
                                                                color: isCompleted ? '#9ca3af' : '#374151'
                                                            }}
                                                            title={isTask ? "Click to Complete Task" : "Edit Event"}
                                                        >
                                                            {item.title}
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* Time Axis Grid */}
                        <div className="p-0 overflow-y-auto" style={{ maxHeight: '600px' }} ref={scrollContainerRef}>
                            <div
                                className="grid gap-0 relative"
                                style={{
                                    gridTemplateColumns: '54px repeat(7, 1fr)',
                                    gridTemplateRows: `repeat(${totalHours}, ${CELL_HEIGHT}px)`,
                                }}
                            >
                                {/* Hour Labels + Horizontal lines */}
                                {Array.from({ length: totalHours }, (_, i) => {
                                    const hour = startHour + i;
                                    return (
                                        <React.Fragment key={`hour-${hour}`}>
                                            <div
                                                className="text-[11px] text-gray-300 font-medium text-right pr-2 flex items-start justify-end pt-0 border-r border-gray-100"
                                                style={{ gridColumn: 1, gridRow: i + 1 }}
                                            >
                                                {formatHour(hour)}
                                            </div>
                                            <div
                                                className="border-t border-gray-100"
                                                style={{ gridColumn: '2 / -1', gridRow: i + 1 }}
                                            />
                                        </React.Fragment>
                                    );
                                })}

                                {/* Vertical column separators */}
                                {weekDates.map((date, colIdx) => (
                                    <div
                                        key={`vsep-${colIdx}`}
                                        className="border-l border-gray-50"
                                        style={{
                                            gridColumn: colIdx + 2,
                                            gridRow: `1 / ${totalHours + 1}`,
                                        }}
                                    />
                                ))}

                                {/* Current time indicator */}
                                {weekDates.map((date, colIdx) => {
                                    if (!isToday(date)) return null;
                                    const now = new Date();
                                    const nowMinutes = now.getHours() * 60 + now.getMinutes();
                                    const startMinutes = startHour * 60;
                                    const endMinutes = endHour * 60;
                                    if (nowMinutes < startMinutes || nowMinutes > endMinutes) return null;
                                    const topOffset = ((nowMinutes - startMinutes) / 60) * CELL_HEIGHT;
                                    return (
                                        <div
                                            key={`now-${colIdx}`}
                                            className="pointer-events-none z-20"
                                            style={{
                                                gridColumn: colIdx + 2,
                                                gridRow: `1 / ${totalHours + 1}`,
                                                position: 'relative',
                                            }}
                                        >
                                            <div
                                                className="absolute left-0 right-0 flex items-center"
                                                style={{ top: topOffset }}
                                            >
                                                <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-sm" />
                                                <div className="flex-1 h-[2px] bg-red-500/60" />
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Clickable cells for each day column */}
                                {weekDates.map((date, colIdx) => (
                                    <div
                                        key={`clickzone-${colIdx}`}
                                        className="cursor-pointer hover:bg-indigo-50/20 transition-colors"
                                        style={{
                                            gridColumn: colIdx + 2,
                                            gridRow: `1 / ${totalHours + 1}`,
                                            position: 'relative',
                                        }}
                                        onClick={(event) => {
                                            if (event.target !== event.currentTarget) {
                                                return;
                                            }

                                            const rect = event.currentTarget.getBoundingClientRect();
                                            const offsetY = event.clientY - rect.top;
                                            const clickedHour = Math.max(
                                                startHour,
                                                Math.min(endHour - 1, Math.floor(offsetY / CELL_HEIGHT))
                                            );
                                            handleGridCellClick(date, clickedHour);
                                        }}
                                    >
                                        {/* Timed item blocks */}
                                        {(weekData.timedByCol[colIdx] || []).map((item, idx) =>
                                            renderTimedBlock(item, colIdx, idx)
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
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
                onDelete={handleDeleteEvent}
                event={selectedEvent}
                selectedDate={selectedDate}
            />
        </div>
    );
};

export default Schedule;
