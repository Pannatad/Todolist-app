import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, AlertTriangle, Clock, Zap, ArrowRight } from 'lucide-react';
import smartNotificationService from '../services/SmartNotificationService';

const NOTIFICATION_ICONS = {
    'event-reminder': Bell,
    'deadline-alert': AlertTriangle,
    'habit-nudge': Clock,
    'habit-backfill': Clock,
    'conflict-warning': Zap
};

const NOTIFICATION_COLORS = {
    'event-reminder': 'from-blue-500 to-indigo-600',
    'deadline-alert': 'from-amber-500 to-orange-600',
    'habit-nudge': 'from-emerald-500 to-teal-600',
    'habit-backfill': 'from-amber-500 to-lime-600',
    'conflict-warning': 'from-red-500 to-rose-600'
};

const NotificationToast = ({ onAction }) => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        // Subscribe to notification service
        const unsubscribe = smartNotificationService.subscribe((notification) => {
            setNotifications(prev => {
                // Prevent duplicates
                if (prev.find(n => n.id === notification.id)) return prev;
                return [...prev, { ...notification, timestamp: Date.now() }];
            });
        });

        return () => unsubscribe();
    }, []);

    // Auto-dismiss notifications after 8 seconds
    useEffect(() => {
        if (notifications.length === 0) return;

        const timer = setInterval(() => {
            const now = Date.now();
            setNotifications(prev =>
                prev.filter(n => now - n.timestamp < 8000)
            );
        }, 1000);

        return () => clearInterval(timer);
    }, [notifications.length]);

    const dismiss = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleAction = (notification) => {
        if (notification.action && onAction) {
            onAction(notification.action, notification.data);
        }
        dismiss(notification.id);
    };

    return (
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
            <AnimatePresence>
                {notifications.map((notification) => {
                    const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
                    const colorClass = NOTIFICATION_COLORS[notification.type] || 'from-gray-500 to-gray-600';

                    return (
                        <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 100, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.9 }}
                            className="pointer-events-auto"
                        >
                            <div className={`bg-gradient-to-r ${colorClass} rounded-2xl shadow-2xl p-4 min-w-[320px] max-w-[400px] text-white`}>
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/20 rounded-xl">
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">{notification.icon}</span>
                                                <h4 className="font-bold">{notification.title}</h4>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => dismiss(notification.id)}
                                        className="p-1 hover:bg-white/20 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Message */}
                                <p className="text-white/90 text-sm mb-3 ml-12">
                                    {notification.message}
                                </p>

                                {/* Action Button */}
                                {notification.action && (
                                    <div className="ml-12">
                                        <button
                                            onClick={() => handleAction(notification)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            {notification.action}
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Progress bar for auto-dismiss */}
                                <motion.div
                                    className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-2xl"
                                    initial={{ width: '100%' }}
                                    animate={{ width: '0%' }}
                                    transition={{ duration: 8, ease: 'linear' }}
                                />
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default NotificationToast;
