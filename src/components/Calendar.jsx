import React, { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, LayoutGrid, Camera, Loader2, Upload, CalendarDays } from 'lucide-react';
import Schedule from './Schedule';
import { parseScheduleImage } from '../services/aiClient';
import { toLocalDateKey } from '../utils/scheduleOccurrences';
import { isTaskActive } from '../utils/taskState';
import WeeklyPlan from './WeeklyPlan';

const Calendar = ({ tasks, onCompleteTask, onDeleteTask, onUpdateTask, scheduleItems, onAddScheduleItem, onUpdateScheduleItem, onDeleteScheduleItem }) => {
    const [viewMode, setViewMode] = useState('week'); // 'week' or 'schedule'
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
                    const dateStr = toLocalDateKey(new Date());
                    return {
                        title: item.activity,
                        difficulty: 'medium',
                        subject: item.category,
                        deadline: dateStr + 'T' + (item.startTime || '12:00'),
                        estimatedTime: item.duration,
                        status: 'growing'
                    };
                });

                // 2. Check for conflicts
                // Get tasks for the relevant day(s) - currently assuming "today" for simplicity of the prototype
                // In a real app, we'd parse the date from the image or ask the user.
                const todayStr = toLocalDateKey(new Date());
                const existingTasks = tasks.filter((task) => (
                    task.deadline && toLocalDateKey(task.deadline) === todayStr && isTaskActive(task)
                ));

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
                        existingTasks.forEach((task) => {
                            onDeleteTask?.(task.id);
                        });
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
                        startTime: item.deadline,
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

    return (
        <div className="w-full max-w-6xl mx-auto min-h-[850px] h-[calc(100vh-4rem)] flex flex-col relative overflow-hidden bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 rounded-2xl p-6">

            {/* Camera Modal */}
            <AnimatePresence>
                {isCameraOpen && (
                    <Motion.div
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
                    </Motion.div>
                )}
            </AnimatePresence>

            {/* Header & Tabs */}
            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex bg-white/20 backdrop-blur-md p-1 rounded-full border border-white/30">
                    <button
                        onClick={() => setViewMode('week')}
                        className={`px-4 py-1.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${viewMode === 'week' ? 'bg-white/40 text-white shadow-lg' : 'text-white/70 hover:text-white hover:bg-white/20'}`}
                    >
                        <CalendarDays size={14} />
                        Weekly Plan
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
            </div>

            {/* Content Area */}
            <div className="relative z-10 flex-1 min-h-0">
                {viewMode === 'schedule' ? (
                    <Schedule
                        events={scheduleItems}
                        tasks={tasks}
                        onAddEvent={onAddScheduleItem}
                        onUpdateEvent={onUpdateScheduleItem}
                        onDeleteEvent={onDeleteScheduleItem}
                        onCompleteTask={onCompleteTask}
                    />
                ) : (
                    <WeeklyPlan
                        tasks={tasks}
                        scheduleItems={scheduleItems}
                        onCompleteTask={onCompleteTask}
                        onDeleteScheduleItem={onDeleteScheduleItem}
                        onDeleteTask={onDeleteTask}
                        onUpdateScheduleItem={onUpdateScheduleItem}
                        onUpdateTask={onUpdateTask}
                    />
                )}
            </div>
        </div>
    );
};

export default Calendar;
