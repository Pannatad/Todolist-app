import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { AnimatePresence, motion as Motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Mic, MicOff, Loader2, Clock, CheckCircle2, Calendar, Plus, GraduationCap, Camera, Upload, X } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';
import { parseScheduleCommand, parseScheduleImage } from '../services/aiClient';
import ScheduleEventModal from './ScheduleEventModal';
import WeeklyPlan from './WeeklyPlan';
import { useLearning } from '../context/LearningContext';
import { COLOR_OPTIONS } from './LearningPathModal';
import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences';
import { isTaskActive, isTaskCompleted } from '../utils/taskState';
import { toast } from '../ui/Toast';
import { SegmentedControl } from '../ui';
import { log } from '../utils/log.js';
import { confirmAction } from '../utils/confirm';
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
const Schedule = ({
    events,
    tasks = [],
    onAddEvent,
    onUpdateEvent,
    onDeleteEvent,
    onCompleteTask,
    onDeleteTask,
    onUpdateTask,
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('week');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraStream, setCameraStream] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [selectedDate, setSelectedDate] = useState(null);
    const scrollContainerRef = useRef(null);
    const recognitionRef = useRef(null);
    const fileInputRef = useRef(null);
    const videoRef = useRef(null);
    const { getTimetableForDay } = useLearning();
    const stopCamera = useCallback(() => {
        cameraStream?.getTracks().forEach((track) => track.stop());
        setCameraStream(null);
        setIsCameraOpen(false);
    }, [cameraStream]);
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setCameraStream(stream);
            setIsCameraOpen(true);
            setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream; }, 100);
        } catch (error) {
            console.error('Error accessing camera:', error);
            toast('Could not access camera. Check permissions.', { tone: 'error' });
        }
    };
    const handleFileChange = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setIsScanning(true);
        try {
            const parsedSchedule = await parseScheduleImage(file);
            if (!parsedSchedule?.length) throw new Error('Could not find schedule items in the image.');
            const dateKey = toLocalDateKey(new Date());
            const additions = parsedSchedule.map((item) => ({
                title: item.activity,
                difficulty: 'medium',
                subject: item.category,
                deadline: `${dateKey}T${item.startTime || '12:00'}`,
                estimatedTime: item.duration,
                status: 'growing',
            }));
            const existing = tasks.filter((task) => task.deadline && toLocalDateKey(task.deadline) === dateKey && isTaskActive(task));
            const overlaps = (candidate, item) => {
                const start = new Date(candidate.deadline).getTime();
                const end = start + (candidate.estimatedTime || 60) * 60000;
                const itemStart = new Date(item.deadline).getTime();
                return start < itemStart + (item.estimatedTime || 60) * 60000 && end > itemStart;
            };
            const hasConflict = additions.some((addition) => existing.some((item) => overlaps(addition, item)));
            let itemsToAdd = additions;
            if (hasConflict && existing.length) {
                if (confirmAction('Conflict detected with existing tasks. Click OK to replace them, or Cancel to keep only non-overlapping items.')) {
                    existing.forEach((task) => onDeleteTask?.(task.id));
                } else {
                    itemsToAdd = additions.filter((addition) => !existing.some((item) => overlaps(addition, item)));
                }
            }
            itemsToAdd.forEach((item) => onAddEvent({ ...item, startTime: item.deadline, duration: item.estimatedTime || 60 }));
            toast(`Added ${itemsToAdd.length} items to the schedule.`, { tone: 'success' });
        } catch (error) {
            console.error('Scan failed:', error);
            toast(error.message || 'Failed to scan schedule.', { tone: 'error' });
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
            handleFileChange({ target: { files: [new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })] } });
            stopCamera();
        }, 'image/jpeg');
    };
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
            if (confirmAction(`Complete task "${item.title}"?`)) {
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
            return onUpdateEvent(eventData.id, eventData);
        } else {
            return onAddEvent(eventData);
        }
    };
    const handleDeleteEvent = (eventId, options) => {
        return onDeleteEvent?.(eventId, options);
    };
    useEffect(() => {
        return () => {
            recognitionRef.current?.stop?.();
        };
    }, []);
    const handleVoiceCommand = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            toast('Voice recognition is not supported in this browser.', { tone: 'error' });
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
            log("Voice command:", transcript);
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
                    toast(`Scheduled ${parsedEvent.title} at ${new Date(parsedEvent.startTime).toLocaleTimeString()}.`, { tone: 'success' });
                } else {
                    toast('Could not understand the command. Try again.', { tone: 'error' });
                }
            } catch (error) {
                console.error("Error processing voice command:", error);
                toast('Something went wrong. Try again.', { tone: 'error' });
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
                <Motion.div
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
                </Motion.div>
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
            <Motion.div
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
                        ${isCompleted ? 'line-through text-[var(--color-muted)]' : 'text-[var(--color-ink-2)]'}`}>
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
                                <span className="text-[9px] font-medium text-[var(--color-muted)]">
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
                        className="absolute top-1.5 right-1.5 text-[var(--color-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                )}
            </Motion.div>
        );
    };
    return (
        <div className="ui-card space-y-6 p-4 sm:p-6">
            <AnimatePresence>
                {isCameraOpen && (
                    <Motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
                        <div className="w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] bg-[var(--color-card)] shadow-[var(--shadow-modal)]">
                            <div className="relative aspect-[3/4] bg-black">
                                <video ref={videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                                <button type="button" onClick={stopCamera} className="ui-icon-button absolute right-4 top-4 bg-black/50 text-white" aria-label="Close camera"><X size={20} /></button>
                            </div>
                            <div className="flex justify-center p-6"><button type="button" onClick={capturePhoto} className="ui-icon-button h-16 w-16 rounded-full border-4 border-[var(--color-accent)] bg-[var(--color-card)]" aria-label="Capture schedule"><Camera size={24} /></button></div>
                        </div>
                    </Motion.div>
                )}
            </AnimatePresence>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="flex items-center gap-2 text-[var(--text-xl)] font-bold text-[var(--color-ink)]"><Calendar size={22} className="text-[var(--color-accent)]" /> Schedule</h2>
                    <p className="mt-1 text-[var(--text-sm)] text-[var(--color-muted)]">Your weekly timetable of events and tasks</p>
                </div>
                <div className="flex items-center gap-3">
                    <SegmentedControl
                        items={[{ id: 'week', label: 'Weekly Plan' }, { id: 'schedule', label: 'Schedule' }]}
                        value={viewMode}
                        onChange={setViewMode}
                        ariaLabel="Plan view"
                    />
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isScanning} className="ui-icon-button" title="Upload Schedule Image" aria-label="Upload schedule image"><Upload size={18} /></button>
                    <button type="button" onClick={startCamera} disabled={isScanning} className="ui-icon-button" title="Scan with Camera" aria-label="Scan with camera">{isScanning ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}</button>
                    <button
                        type="button"
                        onClick={handleVoiceCommand}
                        disabled={isProcessing}
                        className="ui-icon-button"
                        title="Voice Command"
                        aria-label="Voice Command"
                    >
                        {isProcessing ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : isListening ? (
                            <MicOff size={18} />
                        ) : (
                            <Mic size={18} />
                        )}
                    </button>
                    {viewMode === 'schedule' && <div className="flex items-center gap-1 rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-card)]">
                        <button
                            type="button"
                            onClick={() => navigateWeek(-1)}
                            className="ui-icon-button"
                            aria-label="Previous week"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={() => setCurrentDate(new Date())}
                            className="min-h-11 px-3 text-xs font-semibold text-[var(--color-accent)]"
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => navigateWeek(1)}
                            className="ui-icon-button"
                            aria-label="Next week"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>}
                </div>
            </div>
            {viewMode === 'week' ? (
                <WeeklyPlan
                    tasks={tasks}
                    scheduleItems={events}
                    onCompleteTask={onCompleteTask}
                    onDeleteScheduleItem={onDeleteEvent}
                    onDeleteTask={onDeleteTask}
                    onUpdateScheduleItem={onUpdateEvent}
                    onUpdateTask={onUpdateTask}
                />
            ) : <>
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-[var(--color-ink)]">
                    {weekDates[0] && `${weekDates[0].toLocaleDateString([], { month: 'short', day: 'numeric' })} — ${weekDates[6]?.toLocaleDateString([], { month: 'short', day: 'numeric' })}`}
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] font-semibold">
                    {weekItemCount} item{weekItemCount !== 1 ? 's' : ''} this week
                </span>
            </div>
            {/* Timetable Grid */}
            <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-rule)] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="min-w-[840px]">
                        {/* Day Headers */}
                        <div className="grid gap-0" style={{ gridTemplateColumns: '54px repeat(7, 1fr)' }}>
                            <div className="border-b border-r border-[var(--color-rule)] bg-[var(--color-paper-2)]/50" /> {/* Empty corner */}
                            {weekDates.map((date, index) => {
                                const isTodayDate = isToday(date);
                                const dayItems = getCombinedItemsForDay(date);
                                return (
                                    <div
                                        key={`header-${index}`}
                                        className={`px-2 py-3 text-center border-b border-r border-[var(--color-rule)] last:border-r-0
                                            ${isTodayDate ? 'bg-[var(--color-accent-soft)]' : 'bg-[var(--color-paper-2)]/60'}`}
                                    >
                                        <div className={`text-[10px] font-bold uppercase tracking-widest mb-1
                                            ${isTodayDate ? 'text-[var(--color-accent)]' : 'text-[var(--color-muted)]'}`}>
                                            {date.toLocaleDateString([], { weekday: 'short' })}
                                        </div>
                                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold
                                            ${isTodayDate
                                                ? 'bg-[var(--color-accent)] text-[var(--color-accent-ink)] shadow-md'
                                                : 'text-[var(--color-ink-2)]'
                                            }`}>
                                            {date.getDate()}
                                        </div>
                                        {dayItems.length > 0 && (
                                            <div className="text-[10px] text-[var(--color-muted)] font-medium mt-0.5">
                                                {dayItems.length} item{dayItems.length !== 1 ? 's' : ''}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        {/* All Day Section */}
                        {hasAllDayItems && (
                            <div className="grid gap-0 border-b border-[var(--color-rule-2)]" style={{ gridTemplateColumns: '54px repeat(7, 1fr)' }}>
                                <div className="px-1 py-2 text-right pr-2 border-r border-[var(--color-rule)] bg-[var(--color-paper-2)]/50">
                                    <span className="text-[10px] font-bold text-[var(--color-muted)] uppercase tracking-wider">All Day</span>
                                </div>
                                {weekDates.map((date, colIdx) => {
                                    const items = weekData.allDayByCol[colIdx] || [];
                                    const isTodayDate = isToday(date);
                                    return (
                                        <div
                                            key={`allday-${colIdx}`}
                                            className={`border-r border-[var(--color-rule)] last:border-r-0 p-1 min-h-[36px] cursor-pointer hover:bg-[var(--color-paper-2)]/60 transition-colors
                                                ${isTodayDate ? 'bg-[var(--color-accent-soft)]/30' : ''}`}
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
                                                        <Motion.div
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
                                                        </Motion.div>
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
                                                className="text-[11px] text-[var(--color-muted)] font-medium text-right pr-2 flex items-start justify-end pt-0 border-r border-[var(--color-rule)]"
                                                style={{ gridColumn: 1, gridRow: i + 1 }}
                                            >
                                                {formatHour(hour)}
                                            </div>
                                            <div
                                                className="border-t border-[var(--color-rule)]"
                                                style={{ gridColumn: '2 / -1', gridRow: i + 1 }}
                                            />
                                        </React.Fragment>
                                    );
                                })}
                                {/* Vertical column separators */}
                                {weekDates.map((date, colIdx) => (
                                    <div
                                        key={`vsep-${colIdx}`}
                                        className="border-l border-[var(--color-rule)]/50"
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
                                                <div className="w-2 h-2 rounded-full bg-[var(--color-error)] -ml-1 shadow-sm" />
                                                <div className="flex-1 h-[2px] bg-[var(--color-error)]/60" />
                                            </div>
                                        </div>
                                    );
                                })}
                                {/* Clickable cells for each day column */}
                                {weekDates.map((date, colIdx) => (
                                    <div
                                        key={`clickzone-${colIdx}`}
                                        className="cursor-pointer hover:bg-[var(--color-accent-soft)]/30 transition-colors"
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
            </>}
        </div>
    );
};
export default Schedule;
