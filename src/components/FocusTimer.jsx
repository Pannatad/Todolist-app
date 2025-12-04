import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Timer, Volume2, VolumeX, Tag } from 'lucide-react';
import { useLog } from '../context/LogContext';

const FocusTimer = ({ onComplete, initialTask }) => {
    const { addActivityLog } = useLog();

    const [isActive, setIsActive] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [category, setCategory] = useState('');
    const [isMuted, setIsMuted] = useState(false);

    const audioRef = useRef(null);
    const startTimeRef = useRef(null);

    // Initialize with task if provided
    useEffect(() => {
        if (initialTask) {
            setCategory(initialTask.subject || 'Work');
            // We don't auto-start to let user confirm category
        }
    }, [initialTask]);

    // Timer Logic
    useEffect(() => {
        let interval = null;
        if (isActive) {
            startTimeRef.current = Date.now() - elapsedTime * 1000;
            interval = setInterval(() => {
                setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    // Audio Logic
    useEffect(() => {
        if (isActive && !isMuted && audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed:", e));
        } else if (audioRef.current) {
            audioRef.current.pause();
        }
    }, [isActive, isMuted]);

    const toggleTimer = () => {
        if (!isActive && !category.trim()) {
            alert("Please enter a focus category first!");
            return;
        }
        setIsActive(!isActive);
    };

    const stopTimer = async () => {
        if (elapsedTime > 60) { // Only log if > 1 minute
            const minutes = Math.ceil(elapsedTime / 60);
            await addActivityLog({
                activity: `Focus Session: ${category}`,
                duration: minutes,
                category: category,
                timestamp: new Date().toISOString()
            });
            if (onComplete) onComplete(minutes);
        }

        setIsActive(false);
        setElapsedTime(0);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const toggleMute = () => setIsMuted(!isMuted);

    const formatTime = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Visuals
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    // Rotate 1 full circle every 60 minutes
    const progress = (elapsedTime % 3600) / 3600;
    const strokeDashoffset = circumference - (progress * circumference);

    return (
        <div className="relative overflow-hidden rounded-3xl p-8 mb-8 flex flex-col items-center text-center shadow-2xl group bg-gray-900 min-h-[600px]">
            {/* Background Image */}
            <div className="absolute inset-0 z-0 pointer-events-none bg-gradient-to-br from-amber-900 to-black">
                <img
                    src="/cozy-cafe.png"
                    alt="Cozy Cafe"
                    className="w-full h-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60"></div>
            </div>

            {/* Audio Element */}
            <audio ref={audioRef} loop src="https://cdn.pixabay.com/audio/2022/05/13/audio_2fe7f89e90.mp3" />

            {/* Content */}
            <div className="relative z-20 w-full flex flex-col items-center">
                {/* Header */}
                <div className="flex items-center gap-2 mb-8 text-white bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 shadow-sm">
                    <Timer className="w-5 h-5" />
                    <h3 className="font-serif font-bold text-lg">Focus Session</h3>
                </div>

                {/* Timer Display */}
                <div className="relative mb-8">
                    <svg width="300" height="300" className="transform -rotate-90">
                        <circle
                            cx="150"
                            cy="150"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-white/10"
                        />
                        <circle
                            cx="150"
                            cy="150"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="text-magma-500 transition-all duration-1000 ease-linear drop-shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                        />
                    </svg>

                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <div className="text-6xl font-bold font-mono text-white tracking-wider drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                            {formatTime(elapsedTime)}
                        </div>
                        <p className="text-sm text-orange-200 mt-2 font-bold uppercase tracking-widest">
                            {isActive ? 'Focusing' : 'Ready'}
                        </p>
                    </div>
                </div>

                {/* Category Input */}
                <div className="mb-8 w-full max-w-xs">
                    <div className="relative">
                        <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="What are you focusing on?"
                            disabled={isActive}
                            className="w-full bg-black/40 border border-white/20 rounded-full py-3 pl-10 pr-4 text-white placeholder-white/40 focus:outline-none focus:border-magma-500 focus:ring-1 focus:ring-magma-500 transition-all text-center font-medium backdrop-blur-sm"
                        />
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-6 items-center">
                    <button
                        onClick={toggleMute}
                        className={`p-3 rounded-full transition-all shadow-lg hover:scale-110 active:scale-95 border ${!isMuted ? 'bg-orange-500/90 text-white border-orange-400' : 'bg-gray-700/80 text-gray-400 border-gray-600'}`}
                        title={isMuted ? "Unmute Jazz" : "Mute Jazz"}
                    >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>

                    <button
                        onClick={toggleTimer}
                        className={`p-6 rounded-full text-white transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-110 active:scale-95 border-4 
                            ${isActive ? 'bg-amber-600 border-amber-700/30' : 'bg-magma-500 border-magma-600/30 hover:bg-magma-400'}`}
                    >
                        {isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                    </button>

                    <button
                        onClick={stopTimer}
                        disabled={elapsedTime === 0}
                        className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all shadow-lg hover:scale-110 active:scale-95 border border-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Stop & Log"
                    >
                        <Square className="w-5 h-5 fill-current" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FocusTimer;
