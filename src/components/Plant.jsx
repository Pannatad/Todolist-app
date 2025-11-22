import React from 'react';
import { motion } from 'framer-motion';
import { Ghost, Skull, Flame, X } from 'lucide-react';
import Penguin from './Penguin';
import { getColorForSubject } from '../constants/subjects';

const Plant = ({ task, onComplete, onDelete, penguinMode }) => {
    const { status, difficulty, title, deadline, subject } = task;
    const [timeLeft, setTimeLeft] = React.useState('');
    const subjectColor = getColorForSubject(subject);

    // Helper to calculate time left
    const calculateTimeLeft = () => {
        if (!deadline) return '';
        const now = new Date();
        const end = new Date(deadline);
        const diff = end - now;

        if (diff <= 0) return 'Expired';

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        let timeString = '';
        if (days > 0) timeString += `${days}d `;
        if (hours > 0 || days > 0) timeString += `${hours}h `;
        timeString += `${minutes}m`;

        return timeString;
    };

    // Helper to get demon level based on time left
    const getDemonLevel = () => {
        if (!deadline) return 1;
        const now = new Date();
        const end = new Date(deadline);
        const diff = end - now;
        const hoursLeft = diff / (1000 * 60 * 60);
        const daysLeft = hoursLeft / 24;

        if (daysLeft > 7) return 1; // > 1 week
        if (daysLeft > 3) return 2; // > 3 days
        if (daysLeft > 1) return 3; // > 1 day
        if (hoursLeft > 6) return 4; // > 6 hours
        return 5; // < 6 hours
    };

    React.useEffect(() => {
        setTimeLeft(calculateTimeLeft());
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 60000); // Update every minute
        return () => clearInterval(timer);
    }, [deadline]);

    // Visual mapping based on status and difficulty
    const getDemonVisual = () => {
        const level = getDemonLevel();

        // Base classes for all demons
        const baseClasses = "drop-shadow-md transition-all duration-500";

        // Color mapping based on difficulty
        let colorClasses = "";
        switch (difficulty) {
            case 'hard':
                colorClasses = "text-red-500 fill-red-100";
                break;
            case 'medium':
                colorClasses = "text-yellow-500 fill-yellow-100";
                break;
            case 'easy':
            default:
                colorClasses = "text-emerald-500 fill-emerald-100";
                break;
        }

        // Size and Animation based on Level (Time Left)
        let sizeClasses = "w-10 h-10"; // Default
        let animationProps = {};

        if (status === 'growing' || status === 'harvested') {
            switch (level) {
                case 5: // Critical (< 6 hours)
                    sizeClasses = "w-20 h-20";
                    animationProps = {
                        scale: [1.2, 1.3, 1.2],
                        rotate: [-3, 3, -3],
                        transition: { duration: 0.2, repeat: Infinity, repeatType: "reverse" }
                    };
                    break;
                case 4: // Urgent (> 6 hours)
                    sizeClasses = "w-16 h-16";
                    animationProps = {
                        scale: [1.1, 1.15, 1.1],
                        transition: { duration: 1, repeat: Infinity, repeatType: "reverse" }
                    };
                    break;
                case 3: // Normal (> 1 day)
                    sizeClasses = "w-14 h-14";
                    animationProps = {
                        y: [0, -3, 0],
                        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    };
                    break;
                case 2: // Chill (> 3 days)
                    sizeClasses = "w-12 h-12";
                    animationProps = {
                        y: [0, -2, 0],
                        transition: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                    };
                    break;
                case 1: // Safe (> 1 week)
                default:
                    sizeClasses = "w-10 h-10";
                    animationProps = {
                        y: [0, -1, 0],
                        transition: { duration: 5, repeat: Infinity, ease: "easeInOut" }
                    };
                    break;
            }
        } else if (status === 'seed') {
            // Seed state
            return <Ghost className={`w-8 h-8 ${colorClasses} ${baseClasses} opacity-60`} />;
        }

        // Face Logic (Eyes + Mouth)
        const getFace = () => {
            const eyeColor = level >= 4 ? "bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]" : "bg-gray-800 dark:bg-gray-900";
            const mouthColor = level >= 4 ? "bg-red-900/50" : "border-gray-800 dark:border-gray-900";

            // Blinking animation
            const blinkAnimation = {
                scaleY: [1, 0.1, 1],
                transition: { duration: 3, repeat: Infinity, repeatDelay: Math.random() * 2 + 1 }
            };

            // Scarier face for high levels
            if (level >= 4) {
                return (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                        {/* Angry Eyes - Closer together */}
                        <motion.div
                            className={`absolute top-[30%] left-[38%] w-[12%] h-[15%] ${eyeColor} rounded-full`}
                            style={{ borderRadius: '40% 60% 40% 60% / 60% 40% 60% 40%', rotate: '15deg' }}
                        />
                        <motion.div
                            className={`absolute top-[30%] right-[38%] w-[12%] h-[15%] ${eyeColor} rounded-full`}
                            style={{ borderRadius: '60% 40% 60% 40% / 40% 60% 40% 60%', rotate: '-15deg' }}
                        />

                        {/* Open/Scary Mouth */}
                        <motion.div
                            initial={{ height: "5%" }}
                            animate={{ height: ["5%", "15%", "5%"] }}
                            transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
                            className={`absolute top-[55%] left-1/2 -translate-x-1/2 w-[25%] bg-black rounded-full opacity-80`}
                        />
                    </div>
                );
            }

            // Cute/Normal Face
            return (
                <div className="absolute inset-0 z-20 pointer-events-none">
                    {/* Cute Eyes - Closer together */}
                    <motion.div
                        animate={blinkAnimation}
                        className={`absolute top-[35%] left-[38%] w-[10%] h-[10%] ${eyeColor} rounded-full`}
                    />
                    <motion.div
                        animate={blinkAnimation}
                        className={`absolute top-[35%] right-[38%] w-[10%] h-[10%] ${eyeColor} rounded-full`}
                    />

                    {/* Small Smile */}
                    <div
                        className={`absolute top-[45%] left-1/2 -translate-x-1/2 w-[20%] h-[10%] border-b-2 ${mouthColor} rounded-full opacity-60`}
                    />
                </div>
            );
        };

        return (
            <motion.div
                animate={status === 'growing' ? animationProps : {}}
                className={`relative flex items-center justify-center ${sizeClasses}`}
            >
                <Ghost className={`w-full h-full ${colorClasses} ${baseClasses}`} />
                {status !== 'seed' && getFace()}
            </motion.div>
        );
    };

    return (
        <motion.div
            layout
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            whileHover={{ scale: 1.05, y: -5 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            className="flex flex-col items-center justify-end relative w-32 min-h-40 h-auto cursor-pointer group pb-2"
            onClick={() => status !== 'harvested' && onComplete(task.id)}
        >
            {/* Plant Visual Container */}
            <div className="relative w-28 h-28 flex items-center justify-center">
                {/* Base/Soil - Changed to a Summoning Circle style or just dark base */}
                <div className={`absolute bottom-0 w-24 h-24 rounded-full ${status === 'harvested' ? 'bg-purple-900/30' : 'bg-gray-200 dark:bg-gray-800'} shadow-inner transition-colors duration-300`}>
                </div>

                {/* Icon (Demon or Penguin) */}
                <div className="relative z-10 mb-2 flex items-center justify-center h-full w-full">
                    {penguinMode ? (
                        <Penguin stage={status} level={getDemonLevel()} difficulty={difficulty} />
                    ) : (
                        getDemonVisual()
                    )}

                    {/* Hover effect for interaction */}
                    {status === 'seed' && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-50">
                            <span className="text-xs font-bold text-purple-600 dark:text-purple-300">Summon!</span>
                        </div>
                    )}
                    {status === 'growing' && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-800 px-3 py-1 rounded-full shadow-lg whitespace-nowrap pointer-events-none z-50">
                            <span className="text-xs font-bold text-red-600 dark:text-red-300">Banish!</span>
                        </div>
                    )}
                </div>

                {/* Delete Button - Appears on Hover */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                    }}
                    className="absolute top-0 right-0 p-1.5 bg-red-500/80 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-110 z-50"
                    title="Banish Forever"
                >
                    <X size={12} strokeWidth={3} />
                </button>
            </div>

            {/* Task Label */}
            <div className="mt-2 max-w-full px-1 flex flex-col items-center w-full gap-1">
                <p className="text-base font-bold text-center text-sage-700 dark:text-sage-200 break-words w-full leading-tight drop-shadow-sm">
                    {title}
                </p>
                {/* Subject Badge */}
                {subject && (
                    <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{
                            backgroundColor: subjectColor.bgColor,
                            color: subjectColor.color
                        }}
                    >
                        {subject}
                    </span>
                )}
                {status !== 'harvested' && (
                    <p className="text-xs font-bold text-center text-sage-500 dark:text-sage-400 w-full leading-tight">
                        {timeLeft || "No Due Date"}
                    </p>
                )}
            </div>
        </motion.div>
    );
};

export default Plant;
