import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Timer, Volume2, VolumeX } from 'lucide-react';

const FocusTimer = ({ onComplete, initialTask }) => {
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
    const [duration, setDuration] = useState(25);
    const [customTime, setCustomTime] = useState('');
    const [isStopwatch, setIsStopwatch] = useState(false);

    const [isMuted, setIsMuted] = useState(false);
    const audioRef = React.useRef(null);

    // Prevent body scroll when active
    useEffect(() => {
        if (isActive) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isActive]);

    // Initialize with task if provided
    useEffect(() => {
        if (initialTask) {
            setIsActive(true);
            setIsStopwatch(true);
            setTimeLeft(0);
            setDuration(60); // Default reference for progress bar
        }
    }, [initialTask]);

    // Timer Effect
    useEffect(() => {
        let interval = null;
        if (isActive) {
            interval = setInterval(() => {
                setTimeLeft(prev => isStopwatch ? prev + 1 : prev - 1);
            }, 1000);
        }

        if (!isStopwatch && timeLeft === 0 && isActive) {
            setIsActive(false);
            onComplete(duration);
            setTimeLeft(duration * 60);
        }

        return () => clearInterval(interval);
    }, [isActive, timeLeft, duration, onComplete, isStopwatch]);

    // Audio Effect
    useEffect(() => {
        if (isActive && !isMuted && audioRef.current) {
            audioRef.current.play().catch(e => console.log("Audio play failed:", e));
        } else if (audioRef.current) {
            audioRef.current.pause();
        }

        // Cleanup on unmount
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, [isActive, isMuted]);

    // Handle mute toggle
    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (audioRef.current) {
            if (!isMuted) { // We are about to mute
                audioRef.current.pause();
            } else if (isActive) { // We are about to unmute and timer is running
                audioRef.current.play().catch(e => console.log("Audio play failed:", e));
            }
        }
    };

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setIsStopwatch(false);
        setTimeLeft(duration * 60);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    };

    const handleCustomTimeSubmit = (e) => {
        e.preventDefault();
        const minutes = parseInt(customTime);
        if (minutes > 0 && minutes <= 180) {
            setDuration(minutes);
            setTimeLeft(minutes * 60);
            setCustomTime('');
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Circular Progress Calculation
    const radius = 120;
    const circumference = 2 * Math.PI * radius;
    const progress = isStopwatch
        ? (timeLeft % 3600) / 3600 // Fill up every hour
        : timeLeft / (duration * 60);
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
                {/* Overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/30 to-black/60"></div>
            </div>

            {/* Hidden Audio Element for Lofi Jazz */}
            <audio ref={audioRef} loop src="https://cdn.pixabay.com/audio/2022/05/13/audio_2fe7f89e90.mp3" />

            {/* YouTube Music Player (hidden) */}
            <div className="absolute bottom-4 right-4 z-30">
                <iframe
                    width="200"
                    height="113"
                    src="https://www.youtube.com/embed/9a8eBDuc3uA?autoplay=1&loop=1&playlist=9a8eBDuc3uA&controls=1"
                    title="Lofi Music"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="rounded-lg shadow-lg opacity-80 hover:opacity-100 transition-opacity"
                ></iframe>
            </div>

            {/* Content Container */}
            <div className="relative z-20 w-full flex flex-col items-center">
                <div className="flex items-center gap-2 mb-8 text-white bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-white/20 shadow-sm">
                    <Timer className="w-5 h-5" />
                    <h3 className="font-serif font-bold text-lg">
                        {initialTask ? `Focusing: ${initialTask.title}` : 'Focus Mode'}
                    </h3>
                </div>

                {/* Circular Timer */}
                <div className="relative mb-8">
                    {/* Background Circle */}
                    <svg width="300" height="300" className="transform -rotate-90">
                        <circle
                            cx="150"
                            cy="150"
                            r={radius}
                            stroke="currentColor"
                            strokeWidth="12"
                            fill="transparent"
                            className="text-orange-200/30"
                        />
                        {/* Progress Circle */}
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

                    {/* Time Display */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <div className="text-6xl font-bold font-mono text-white tracking-wider drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                            {formatTime(timeLeft)}
                        </div>
                        <p className="text-sm text-orange-200 mt-2 font-bold uppercase tracking-widest">
                            {isActive ? (isStopwatch ? 'Elapsed Time' : 'Focusing') : 'Ready'}
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex gap-6 mb-8 items-center">
                    <button
                        onClick={toggleMute}
                        className={`p-3 rounded-full transition-all shadow-lg hover:scale-110 active:scale-95 border ${!isMuted ? 'bg-orange-500/90 text-white border-orange-400' : 'bg-gray-700/80 text-gray-400 border-gray-600'}`}
                        title={isMuted ? "Unmute Jazz" : "Mute Jazz"}
                    >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>

                    <button
                        onClick={toggleTimer}
                        className="p-6 rounded-full bg-magma-500 hover:bg-magma-400 text-white transition-all shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:scale-110 active:scale-95 border-4 border-magma-600/30"
                    >
                        {isActive ? <Pause className="w-10 h-10 fill-current" /> : <Play className="w-10 h-10 fill-current ml-1" />}
                    </button>

                    <button
                        onClick={resetTimer}
                        className="p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all shadow-lg hover:scale-110 active:scale-95 border border-white/30"
                        title="Reset Timer"
                    >
                        <Square className="w-5 h-5 fill-current" />
                    </button>
                </div>

                {/* Presets & Custom Input */}
                {!isActive && (
                    <div className="flex flex-col items-center gap-4 w-full max-w-md bg-black/40 p-4 rounded-2xl backdrop-blur-md border border-white/20 shadow-md">
                        <div className="flex gap-2 flex-wrap justify-center">
                            {[15, 25, 45, 60].map(min => (
                                <button
                                    key={min}
                                    onClick={() => {
                                        setDuration(min);
                                        setTimeLeft(min * 60);
                                    }}
                                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${duration === min ? 'bg-magma-500 text-white border-magma-500 shadow-md' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}`}
                                >
                                    {min}m
                                </button>
                            ))}
                        </div>

                        <form onSubmit={handleCustomTimeSubmit} className="flex gap-2 w-full max-w-[200px]">
                            <input
                                type="number"
                                value={customTime}
                                onChange={(e) => setCustomTime(e.target.value)}
                                placeholder="Custom (min)"
                                className="w-full bg-white/20 border border-white/30 rounded-lg px-3 py-2 text-sm text-center text-white focus:outline-none focus:border-magma-500 focus:ring-2 focus:ring-magma-400/30 transition-colors placeholder-white/60 font-medium"
                                min="1"
                                max="180"
                            />
                            <button
                                type="submit"
                                disabled={!customTime}
                                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 shadow-sm"
                            >
                                Set
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FocusTimer;
