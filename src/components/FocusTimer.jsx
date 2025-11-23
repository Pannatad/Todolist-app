import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Timer } from 'lucide-react';

const FocusTimer = ({ onComplete }) => {
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
    const [duration, setDuration] = useState(25);
    const [customTime, setCustomTime] = useState('');

    useEffect(() => {
        let interval = null;
        if (isActive && timeLeft > 0) {
            interval = setInterval(() => {
                setTimeLeft(timeLeft - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            onComplete(duration); // Reward based on duration
            setTimeLeft(duration * 60);
        }
        return () => clearInterval(interval);
    }, [isActive, timeLeft, duration, onComplete]);

    const toggleTimer = () => setIsActive(!isActive);
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(duration * 60);
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
    const progress = timeLeft / (duration * 60);
    const strokeDashoffset = circumference - (progress * circumference);

    return (
        <div className="glass-panel rounded-3xl p-8 mb-8 flex flex-col items-center text-center relative overflow-hidden">
            <div className="flex items-center gap-2 mb-8 text-sage-600 dark:text-sage-300 z-10">
                <Timer className="w-5 h-5" />
                <h3 className="font-serif font-bold text-lg">Focus Mode</h3>
            </div>

            {/* Circular Timer */}
            <div className="relative mb-8 z-10">
                {/* Background Circle */}
                <svg width="300" height="300" className="transform -rotate-90">
                    <circle
                        cx="150"
                        cy="150"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        className="text-sage-200 dark:text-void-800"
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
                        className="text-magma-500 transition-all duration-1000 ease-linear"
                    />
                </svg>

                {/* Time Display */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                    <div className="text-5xl font-bold font-mono text-sage-800 dark:text-bone-100 tracking-wider">
                        {formatTime(timeLeft)}
                    </div>
                    <p className="text-sm text-sage-500 dark:text-sage-400 mt-2 font-medium">
                        {isActive ? 'Focusing...' : 'Ready'}
                    </p>
                </div>
            </div>

            {/* Controls */}
            <div className="flex gap-4 mb-8 z-10">
                <button
                    onClick={toggleTimer}
                    className="p-4 rounded-full bg-magma-500 hover:bg-magma-400 text-white transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:scale-105 active:scale-95"
                >
                    {isActive ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                </button>

                <button
                    onClick={resetTimer}
                    className="p-4 rounded-full bg-sage-100 dark:bg-void-800/50 hover:bg-sage-200 dark:hover:bg-void-700 text-sage-500 dark:text-sage-400 hover:text-sage-800 dark:hover:text-bone-200 transition-all shadow-sm hover:scale-105 active:scale-95 border border-sage-200 dark:border-white/5"
                >
                    <Square className="w-6 h-6 fill-current" />
                </button>
            </div>

            {/* Presets & Custom Input */}
            {!isActive && (
                <div className="flex flex-col items-center gap-4 z-10 w-full max-w-md">
                    <div className="flex gap-2 flex-wrap justify-center">
                        {[15, 25, 45, 60].map(min => (
                            <button
                                key={min}
                                onClick={() => {
                                    setDuration(min);
                                    setTimeLeft(min * 60);
                                }}
                                className={`px-4 py-2 rounded-full text-sm font-bold transition-all border ${duration === min ? 'bg-magma-500/20 border-magma-500 text-magma-500 dark:text-magma-400' : 'bg-sage-100 dark:bg-void-800/30 border-transparent text-sage-500 hover:bg-sage-200 dark:hover:bg-void-800/50 hover:text-sage-700 dark:hover:text-sage-300'}`}
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
                            className="w-full bg-sage-50 dark:bg-void-900/50 border border-sage-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-center text-sage-800 dark:text-bone-200 focus:outline-none focus:border-magma-500/50 transition-colors"
                            min="1"
                            max="180"
                        />
                        <button
                            type="submit"
                            disabled={!customTime}
                            className="px-3 py-2 bg-sage-200 dark:bg-void-800 hover:bg-sage-300 dark:hover:bg-void-700 text-sage-600 dark:text-sage-400 hover:text-magma-500 dark:hover:text-magma-400 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                        >
                            Set
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

export default FocusTimer;
