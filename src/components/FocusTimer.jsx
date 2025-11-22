import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Timer } from 'lucide-react';

const FocusTimer = ({ onComplete }) => {
    const [isActive, setIsActive] = useState(false);
    const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
    const [duration, setDuration] = useState(25);

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

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="glass-panel rounded-3xl p-6 mb-8 flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-4 text-sage-600 dark:text-sage-300">
                <Timer className="w-5 h-5" />
                <h3 className="font-serif font-bold text-lg">Focus Mode</h3>
            </div>

            <div className="text-5xl font-bold font-mono text-sage-800 dark:text-sage-100 mb-6 tracking-wider">
                {formatTime(timeLeft)}
            </div>

            <div className="flex gap-4">
                <button
                    onClick={toggleTimer}
                    className="p-4 rounded-full bg-sage-400 hover:bg-sage-500 text-white transition-all shadow-md hover:scale-105 active:scale-95"
                >
                    {isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current" />}
                </button>

                <button
                    onClick={resetTimer}
                    className="p-4 rounded-full bg-white/50 hover:bg-white/80 text-sage-600 transition-all shadow-sm hover:scale-105 active:scale-95"
                >
                    <Square className="w-6 h-6 fill-current" />
                </button>
            </div>

            {!isActive && (
                <div className="mt-6 flex gap-2">
                    {[15, 25, 45, 60].map(min => (
                        <button
                            key={min}
                            onClick={() => {
                                setDuration(min);
                                setTimeLeft(min * 60);
                            }}
                            className={`px-3 py-1 rounded-full text-sm font-bold transition-colors ${duration === min ? 'bg-sage-200 text-sage-800' : 'bg-transparent text-sage-500 hover:bg-sage-100'}`}
                        >
                            {min}m
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FocusTimer;
