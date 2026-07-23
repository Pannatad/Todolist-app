import React, { useState, useEffect } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { X, Bell, AlertTriangle, Clock, Zap, ArrowRight } from 'lucide-react';
import smartNotificationService from '../services/SmartNotificationService';

const NOTIFICATION_ICONS = {
    'event-reminder': Bell,
    'deadline-alert': AlertTriangle,
    'habit-nudge': Clock,
    'habit-backfill': Clock,
    'conflict-warning': Zap
};

// Accent hue per type, used for the icon chip only — the card itself stays
// a calm raised surface in the app's design language.
const NOTIFICATION_TINTS = {
    'event-reminder': '#6366f1',
    'deadline-alert': '#f59e0b',
    'habit-nudge': '#10b981',
    'habit-backfill': '#f59e0b',
    'conflict-warning': '#ef4444'
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
        <div className="pointer-events-none fixed left-4 right-4 top-4 z-[9999] flex flex-col items-center gap-2 sm:left-auto sm:items-end">
            <AnimatePresence>
                {notifications.map((notification) => {
                    const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
                    const tint = NOTIFICATION_TINTS[notification.type] || 'var(--color-accent)';

                    return (
                        <Motion.div
                            key={notification.id}
                            initial={{ opacity: 0, y: -12, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.97 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className="pointer-events-auto w-full sm:w-[22rem]"
                        >
                            <div className="ui-card flex items-start gap-3 p-3.5">
                                <span
                                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                                    style={{
                                        background: `color-mix(in srgb, ${tint} 14%, transparent)`,
                                        color: `color-mix(in oklch, ${tint} 70%, var(--color-ink))`
                                    }}
                                >
                                    <Icon size={16} aria-hidden="true" />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-[var(--color-ink)]">{notification.title}</p>
                                    <p className="mt-0.5 text-xs leading-5 text-[var(--color-muted)]">{notification.message}</p>
                                    {notification.action && (
                                        <button
                                            onClick={() => handleAction(notification)}
                                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-[var(--color-accent)]"
                                        >
                                            {notification.action}
                                            <ArrowRight size={13} aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={() => dismiss(notification.id)}
                                    className="shrink-0 rounded-lg p-1 text-[var(--color-muted)] transition-colors hover:bg-[var(--color-paper-2)]"
                                    aria-label="Dismiss notification"
                                >
                                    <X size={15} aria-hidden="true" />
                                </button>
                            </div>
                        </Motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
};

export default NotificationToast;
