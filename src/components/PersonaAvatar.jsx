import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Penguin from './Penguin';

const PersonaAvatar = ({ mode, message, isTyping }) => {
    // mode: 'demon' | 'penguin'

    return (
        <div className="relative flex items-center">
            {/* Speech Bubble */}
            <AnimatePresence mode="wait">
                {(message || isTyping) && (
                    <motion.div
                        initial={{ opacity: 0, x: -20, scale: 0.8 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -10, scale: 0.8 }}
                        className={`absolute left-full ml-4 w-64 p-4 rounded-2xl shadow-xl border z-50
                            ${mode === 'penguin'
                                ? 'bg-white dark:bg-void-800 border-blue-200 dark:border-blue-900/30 text-sage-800 dark:text-bone-200'
                                : 'bg-void-900 border-red-900/30 text-red-100'
                            }
                        `}
                    >
                        {/* Triangle pointer */}
                        <div
                            className={`absolute top-1/2 -left-2 w-4 h-4 transform -translate-y-1/2 rotate-45 border-l border-b
                                ${mode === 'penguin'
                                    ? 'bg-white dark:bg-void-800 border-blue-200 dark:border-blue-900/30'
                                    : 'bg-void-900 border-red-900/30'
                                }
                            `}
                        />

                        {isTyping ? (
                            <div className="flex gap-1 justify-center py-2">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.6 }}
                                    className={`w-2 h-2 rounded-full ${mode === 'penguin' ? 'bg-blue-400' : 'bg-red-500'}`}
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                                    className={`w-2 h-2 rounded-full ${mode === 'penguin' ? 'bg-blue-400' : 'bg-red-500'}`}
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                                    className={`w-2 h-2 rounded-full ${mode === 'penguin' ? 'bg-blue-400' : 'bg-red-500'}`}
                                />
                            </div>
                        ) : (
                            <p className="text-sm font-medium leading-relaxed italic">
                                "{message}"
                            </p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Avatar Circle */}
            <div className={`
                w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-lg transition-colors relative overflow-hidden
                ${mode === 'penguin'
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-500/30'
                    : 'bg-void-900 border-red-900/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                }
            `}>
                {mode === 'penguin' ? (
                    <div className="scale-75 transform translate-y-1">
                        <Penguin stage="growing" level={1} difficulty="medium" />
                    </div>
                ) : (
                    <div className="text-3xl animate-pulse">
                        👿
                    </div>
                )}
            </div>
        </div>
    );
};

export default PersonaAvatar;
