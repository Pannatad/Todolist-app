import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, LayoutGrid, List, Camera, Loader2, Upload } from 'lucide-react';
import { getColorForSubject } from '../constants/subjects';
import Schedule from './Schedule';
import { parseScheduleImage } from '../services/gemini';

const Calendar = ({ tasks, onCompleteTask, scheduleItems, onAddScheduleItem, onUpdateScheduleItem, onDeleteScheduleItem }) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [viewMode, setViewMode] = useState('month'); // 'month' or 'schedule'
    const [isScanning, setIsScanning] = useState(false);
    const fileInputRef = React.useRef(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const videoRef = React.useRef(null);
    const [cameraStream, setCameraStream] = useState(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            setCameraStream(stream);
            setIsCameraOpen(true);
            // Wait a bit for the modal to render
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error("Error accessing camera:", err);
            alert("Could not access camera. Please check permissions.");
        }
    };

    const stopCamera = () => {
        if (cameraStream) {
            cameraStream.getTracks().forEach(track => track.stop());
            setCameraStream(null);
        }
        setIsCameraOpen(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
            handleFileChange({ target: { files: [file] } });
            stopCamera();
        }, 'image/jpeg');
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const parsedSchedule = await parseScheduleImage(file);
            if (parsedSchedule && parsedSchedule.length > 0) {
                // 1. Prepare new tasks
                const newTasks = parsedSchedule.map(item => {
                    // Default to today if no date context (future improvement: ask for date)
                    const dateStr = new Date().toISOString().split('T')[0];
                    return {
                        title: item.activity,
                        difficulty: 'medium',
                        subject: item.category,
                        deadline: dateStr + 'T' + (item.startTime || '12:00'),
                        estimatedTime: item.duration,
                        status: 'todo' // Ensure it's active
                    };
                });

                // 2. Check for conflicts
                // Get tasks for the relevant day(s) - currently assuming "today" for simplicity of the prototype
                // In a real app, we'd parse the date from the image or ask the user.
                const todayStr = new Date().toISOString().split('T')[0];
                const existingTasks = tasks.filter(t => t.deadline && t.deadline.startsWith(todayStr) && t.status !== 'harvested');

                let hasConflict = false;
                for (const newTask of newTasks) {
                    const newStart = new Date(newTask.deadline).getTime();
                    const newEnd = newStart + (newTask.estimatedTime * 60000);

                    for (const existing of existingTasks) {
                        const exStart = new Date(existing.deadline).getTime();
                        const exEnd = exStart + ((existing.estimatedTime || 60) * 60000);

                        // Check overlap
                        if (newStart < exEnd && newEnd > exStart) {
                            hasConflict = true;
                            break;
                        }
                    }
                    if (hasConflict) break;
                }

                // 3. Resolve Conflicts
                let tasksToAdd = newTasks;
                if (hasConflict && existingTasks.length > 0) {
                    const userChoice = window.confirm(
                        "Conflict detected with existing tasks!\n\n" +
                        "Click OK to REPLACE existing tasks for today.\n" +
                        "Click Cancel to MERGE (keep existing, add only non-overlapping new tasks)."
                    );

                    if (userChoice) {
                        // REPLACE: Delete all existing tasks for today
                        existingTasks.forEach(t => onCompleteTask(t.id)); // Using onComplete as delete for now, or we need a real delete prop
                    } else {
                        // MERGE: Filter out overlapping new tasks
                        tasksToAdd = newTasks.filter(newTask => {
                            const newStart = new Date(newTask.deadline).getTime();
                            const newEnd = newStart + (newTask.estimatedTime * 60000);

                            const isOverlapping = existingTasks.some(existing => {
                                const exStart = new Date(existing.deadline).getTime();
                                const exEnd = exStart + ((existing.estimatedTime || 60) * 60000);
                                return newStart < exEnd && newEnd > exStart;
                            });
                            return !isOverlapping;
                        });
                    }
                }

                // 4. Add Schedule Items
                let addedCount = 0;
                tasksToAdd.forEach(item => {
                    onAddScheduleItem({
                        ...item,
                        startTime: item.deadline.split('T')[1] || '12:00', // Extract time
                        duration: item.estimatedTime || 60
                    });
                    addedCount++;
                });

                alert(`Successfully added ${addedCount} items to schedule!`);

            } else {
                alert("Could not find any schedule items in the image.");
            }
        } catch (error) {
            console.error("Scan failed:", error);
            alert("Failed to scan schedule.");
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

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

    // Group events (tasks + schedule items) by date
    const getEventsForDate = (day) => {
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateStr = targetDate.toISOString().split('T')[0];

        const dayTasks = tasks.filter(task => {
            if (!task.deadline) return false;
            const taskDate = new Date(task.deadline);
            return taskDate.getDate() === day &&
                taskDate.getMonth() === currentDate.getMonth() &&
                taskDate.getFullYear() === currentDate.getFullYear() &&
                task.status !== 'harvested';
        }).map(t => ({ ...t, type: 'task' }));

        const daySchedule = scheduleItems.filter(item => {
            if (!item.start_time && !item.startTime) return false;
            const itemDate = new Date(item.start_time || item.startTime);
            return itemDate.getDate() === day &&
                itemDate.getMonth() === currentDate.getMonth() &&
                itemDate.getFullYear() === currentDate.getFullYear();
        }).map(i => ({
            ...i,
            deadline: i.start_time || i.startTime, // Normalize for display
            type: 'schedule'
        }));

        return [...dayTasks, ...daySchedule];
    };

    const isToday = (day) => {
        const today = new Date();
        return day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear();
    };

    return (
        <div className="w-full max-w-6xl mx-auto min-h-[850px] h-[calc(100vh-4rem)] flex flex-col relative overflow-hidden bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 rounded-2xl p-6">

            {/* Camera Modal */}
            <AnimatePresence>
                {isCameraOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                    >
                        <div className="bg-gradient-to-br from-indigo-900/95 to-purple-900/95 backdrop-blur-xl rounded-2xl overflow-hidden shadow-2xl max-w-lg w-full relative border border-white/20">
                            <div className="relative aspect-[3/4] bg-black">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <button
                                    onClick={stopCamera}
                                    className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors backdrop-blur-sm"
                                >
                                    <ChevronLeft className="rotate-45" size={24} />
                                </button>
                            </div>
                            <div className="p-6 flex justify-center">
                                <button
                                    onClick={capturePhoto}
                                    className="w-16 h-16 rounded-full border-4 border-purple-500 bg-white/10 backdrop-blur-sm flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                                >
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header & Tabs */}
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex bg-white/20 backdrop-blur-md p-1 rounded-full border border-white/30">
                    <button
                        onClick={() => setViewMode('month')}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'month' ? 'bg-white/40 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/20'}`}
                    >
                        <CalendarIcon size={14} />
                        Tasks Calendar
                    </button>
                    <button
                        onClick={() => setViewMode('schedule')}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'schedule' ? 'bg-white/40 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/20'}`}
                    >
                        <LayoutGrid size={14} />
                        Schedule
                    </button>
                </div>

                {/* Scan Buttons */}
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />

                    {/* Upload File Button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isScanning}
                        className="px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-bold flex items-center gap-2 hover:bg-white/30 transition-colors disabled:opacity-50"
                        title="Upload Schedule Image"
                    >
                        <Upload size={16} />
                        <span className="hidden sm:inline">Upload</span>
                    </button>

                    {/* Camera Button */}
                    <button
                        onClick={startCamera}
                        disabled={isScanning}
                        className="px-3 py-1.5 rounded-full bg-white/30 backdrop-blur-md border border-white/40 text-white text-sm font-bold flex items-center gap-2 hover:bg-white/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Scan with Camera"
                    >
                        {isScanning ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                        <span className="hidden sm:inline">{isScanning ? 'Scanning...' : 'Camera'}</span>
                    </button>
                </div>

                {viewMode === 'month' && (
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl sm:text-2xl font-serif text-white flex items-center gap-2 drop-shadow-lg">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => navigateMonth(-1)}
                                className="p-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 text-white transition-colors"
                            >
                                <ChevronLeft size={20} />
                            </button>
                            <button
                                onClick={() => navigateMonth(1)}
                                className="p-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 hover:bg-white/30 text-white transition-colors"
                            >
                                <ChevronRight size={20} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="relative z-10 flex-1 min-h-0">
                {viewMode === 'schedule' ? (
                    <Schedule
                        events={scheduleItems}
                        onAddEvent={onAddScheduleItem}
                        onUpdateEvent={onUpdateScheduleItem}
                        onDeleteEvent={onDeleteScheduleItem}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full overflow-y-auto">
                        {/* Calendar Grid */}
                        <div className="lg:col-span-3 bg-white/20 backdrop-blur-2xl rounded-2xl border border-white/30 p-6 shadow-xl h-fit">
                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 mb-4 text-center">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                    <div key={day} className="text-sm font-bold text-white uppercase tracking-wider py-2">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 gap-2 auto-rows-fr">
                                {/* Empty slots for previous month */}
                                {[...Array(firstDay)].map((_, i) => (
                                    <div key={`empty-${i}`} className="min-h-24" />
                                ))}

                                {/* Days */}
                                {[...Array(daysInMonth)].map((_, i) => {
                                    const day = i + 1;
                                    const dayEvents = getEventsForDate(day);
                                    const isSelected = selectedDate === day;
                                    const isTodayDate = isToday(day);
                                    const displayEvents = dayEvents.slice(0, 3);
                                    const remainingCount = dayEvents.length - 3;

                                    return (
                                        <motion.button
                                            key={day}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={() => setSelectedDate(day)}
                                            className={`
                                                min-h-40 p-3 rounded-xl flex flex-col items-start justify-start relative transition-all text-left overflow-hidden backdrop-blur-xl
                                                ${isSelected ? 'bg-white/30 border-white/50 ring-2 ring-white/40' : 'bg-white/20 border-white/30 hover:bg-white/30'}
                                                ${isTodayDate ? 'ring-2 ring-white/60' : 'border'}
                                            `}
                                        >
                                            <span className={`text-sm font-bold mb-1 ${isTodayDate ? 'text-white' : 'text-white/90'}`}>
                                                {day}
                                            </span>

                                            {/* Task List in Cell */}
                                            <div className="w-full flex flex-col gap-1">
                                                {displayEvents.map((event) => {
                                                    const color = getColorForSubject(event.subject || event.category);
                                                    return (
                                                        <div
                                                            key={event.id}
                                                            className={`w-full text-[10px] px-2 py-1 rounded-lg truncate font-medium text-white backdrop-blur-md border border-white/30 ${event.type === 'schedule' ? 'bg-white/20' : ''}`}
                                                            style={{ backgroundColor: event.type === 'task' ? `${color.color}60` : undefined }}
                                                            title={event.title}
                                                        >
                                                            {event.title}
                                                        </div>
                                                    );
                                                })}
                                                {remainingCount > 0 && (
                                                    <div className="text-[9px] text-white/70 text-center">
                                                        +{remainingCount} more
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
                                        className="bg-white/20 backdrop-blur-2xl rounded-2xl border border-white/30 p-6 h-full sticky top-4">
                                        <h3 className="text-xl font-bold text-white mb-4 border-b border-white/30 pb-2">
                                            {monthNames[currentDate.getMonth()]} {selectedDate}
                                        </h3>

                                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                            {getEventsForDate(selectedDate).length > 0 ? (
                                                getEventsForDate(selectedDate).map(event => {
                                                    const color = getColorForSubject(event.subject || event.category);
                                                    return (
                                                        <div key={event.id} className="bg-white/15 backdrop-blur-md p-3 rounded-xl border border-white/20 flex items-start gap-3 group hover:bg-white/20 transition-colors">
                                                            <div
                                                                className="w-1 h-full min-h-[2rem] rounded-full"
                                                                style={{ backgroundColor: color.color }}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <h4 className="text-sm font-bold text-white transition-colors truncate">{event.title}</h4>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <span
                                                                        className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white border border-white/20"
                                                                        style={{ backgroundColor: `${color.color}60` }}
                                                                    >
                                                                        {event.subject || event.category || 'Other'}
                                                                    </span>
                                                                    <span className="text-[10px] text-white/70 flex items-center gap-1">
                                                                        <Clock size={10} />
                                                                        {new Date(event.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="text-center py-8 text-white/60 italic">
                                                    No tasks scheduled for this day
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="empty"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="bg-white/10 backdrop-blur-2xl rounded-2xl border border-white/20 p-6 h-full flex flex-col items-center justify-center text-center text-white/70 sticky top-4"
                                    >
                                        <CalendarIcon size={48} className="mb-4 opacity-50" />
                                        <p>Select a date to view details</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Calendar;
