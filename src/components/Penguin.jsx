import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Penguin = ({ stage, level, difficulty }) => {
    const [hoverAction, setHoverAction] = useState(null);

    const handleMouseEnter = () => {
        const actions = ['blink', 'wiggle', 'sleep'];
        const randomAction = actions[Math.floor(Math.random() * actions.length)];
        setHoverAction(randomAction);
    };

    const handleMouseLeave = () => {
        setHoverAction(null);
    };

    // --- Animation Variants ---
    const bodyVariants = {
        wiggle: {
            rotate: [-3, 3, -3, 3, 0],
            transition: { duration: 0.4 }
        },
        sleep: {
            rotate: [0, 2, 0],
            y: [0, 1, 0],
            transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" }
        },
        idle: {
            y: [0, -2, 0],
            transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
        }
    };

    const eyeVariants = {
        blink: {
            scaleY: [1, 0.1, 1],
            transition: { duration: 0.25 }
        },
        sleep: {
            scaleY: 0.1,
            transition: { duration: 0.5 }
        },
        idle: {
            scaleY: 1
        }
    };

    // --- Sizing Logic ---
    let size = "w-12 h-12";
    if (stage === 'growing') size = "w-16 h-16";
    if (stage === 'harvested') size = "w-24 h-24";
    if (level >= 4) size = "w-20 h-20";

    // --- Color Logic ---
    let bodyColor = "#374151"; // Default/Hard (Black/Dark Grey)
    if (difficulty === 'easy') bodyColor = "#F472B6"; // Pink
    if (difficulty === 'medium') bodyColor = "#60A5FA"; // Light Blue

    return (
        <motion.div
            className={`relative flex items-center justify-center ${size}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            animate={hoverAction === 'wiggle' ? 'wiggle' : (hoverAction === 'sleep' ? 'sleep' : 'idle')}
            variants={bodyVariants}
        >
            {/* Penguin SVG Group */}
            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">

                {/* 1. WINGS (Sticking out sides) */}
                {/* Left Wing */}
                <path d="M15 55 Q 5 50 5 65 Q 10 75 25 65" fill={bodyColor} />
                {/* Right Wing */}
                <path d="M85 55 Q 95 50 95 65 Q 90 75 75 65" fill={bodyColor} />

                {/* 2. FEET (Yellow/Orange - Small rounded at bottom) */}
                <path d="M35 92 Q 35 98 45 98 Q 50 95 48 90" fill="#FCD34D" />
                <path d="M65 92 Q 65 98 55 98 Q 50 95 52 90" fill="#FCD34D" />

                {/* 3. MAIN BODY (Round Shape) */}
                <ellipse cx="50" cy="55" rx="42" ry="40" fill={bodyColor} />

                {/* 4. WHITE FACE/BELLY MASK */}
                {/* Heart-like shape for the face */}
                <path
                    d="M50 30 
                       Q 35 20 20 45 
                       Q 15 65 25 80 
                       Q 40 95 50 92 
                       Q 60 95 75 80 
                       Q 85 65 80 45 
                       Q 65 20 50 30"
                    fill="#F9FAFB"
                />

                {/* 5. FACE FEATURES */}
                <g transform="translate(0, 0)">
                    {/* Eyes (Happy Arcs) */}
                    {/* Left Eye */}
                    <path d="M 32 42 Q 38 35 44 42" fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />
                    {/* Right Eye */}
                    <path d="M 56 42 Q 62 35 68 42" fill="none" stroke="#1F2937" strokeWidth="3" strokeLinecap="round" />

                    {/* Cheeks (Pink Circles) */}
                    <circle cx="28" cy="50" r="6" fill="#F472B6" opacity="0.8" />
                    <circle cx="72" cy="50" r="6" fill="#F472B6" opacity="0.8" />

                    {/* Beak (Yellow Rounded) */}
                    <ellipse cx="50" cy="50" rx="6" ry="4" fill="#FCD34D" />
                </g>

                {/* 6. SHADOW/HIGHLIGHT (Optional for depth) */}
                <path d="M50 20 Q 65 20 75 35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />

            </svg>

            {/* Sleep Zzz Animation */}
            {hoverAction === 'sleep' && (
                <motion.div
                    initial={{ opacity: 0, x: 10, y: -5 }}
                    animate={{ opacity: [0, 1, 0], x: 25, y: -25 }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute top-0 right-0 text-blue-400 font-bold text-sm font-sans pointer-events-none"
                >
                    Zzz
                </motion.div>
            )}
        </motion.div>
    );
};

export default Penguin;
