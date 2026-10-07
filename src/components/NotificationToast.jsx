import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bell, Clock, Zap } from 'lucide-react';
import smartNotificationService from '../services/SmartNotificationService';

const NOTIFICATION_ICONS = {
    'event-reminder': Bell,
    'deadline-alert': AlertTriangle,
    'habit-nudge': Clock,
    'habit-backfill': Clock,
    'conflict-warning': Zap
};

// Accent per type, used for the small app-icon tile only.
const NOTIFICATION_TINTS = {
    'event-reminder': '#5856d6',
    'deadline-alert': '#ff9500',
    'habit-nudge': '#34c759',
    'habit-backfill': '#ff9500',
    'conflict-warning': '#ff3b30'
};

const VISIBLE_MS = 8000;
const LEAVE_MS = 260;

/** One banner: tap to open its action, swipe up (or wait) to dismiss. */
const Banner = ({ notification, onOpen, onDismiss }) => {
    const ref = useRef(null);
    const drag = useRef(null);
    const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
    const tint = NOTIFICATION_TINTS[notification.type] || 'var(--color-accent)';

    const startDrag = (event) => {
        drag.current = { startY: event.clientY, moved: false };
        try {
            event.currentTarget.setPointerCapture?.(event.pointerId);
        } catch {
            // Pointer already released; drag still works without capture.
        }
    };

    const moveDrag = (event) => {
        if (!drag.current || !ref.current) return;
        const delta = event.clientY - drag.current.startY;
        if (Math.abs(delta) > 6) drag.current.moved = true;
        ref.current.style.transform = `translate3d(0, ${delta < 0 ? delta : delta * 0.2}px, 0)`;
        ref.current.dataset.dragging = 'true';
    };

    const endDrag = (event) => {
        const state = drag.current;
        drag.current = null;
        if (!state || !ref.current) return;
        delete ref.current.dataset.dragging;
        const delta = event.clientY - state.startY;
        if (delta < -30) {
            onDismiss(notification.id);
            return;
        }
        ref.current.style.transform = '';
        if (!state.moved) onOpen(notification);
    };

    return (
        <div
            ref={ref}
            role="status"
            className={`ios-banner${notification.leaving ? ' is-leaving' : ''}`}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={() => {
                drag.current = null;
                if (ref.current) ref.current.style.transform = '';
            }}
            onKeyDown={(event) => {
                if (event.key === 'Enter') onOpen(notification);
                if (event.key === 'Escape') onDismiss(notification.id);
            }}
            tabIndex={0}
            aria-label={`${notification.title}. ${notification.message}${notification.action ? `. Press Enter to ${notification.action.toLowerCase()}.` : ''}`}
        >
            <span className="ios-banner__icon" style={{ background: tint }} aria-hidden="true">
                <Icon size={16} strokeWidth={2.4} />
            </span>
            <span className="ios-banner__copy">
                <span className="ios-banner__top">
                    <strong>{notification.title}</strong>
                    <span>now</span>
                </span>
                <span className="ios-banner__message">{notification.message}</span>
            </span>
        </div>
    );
};

const NotificationToast = ({ onAction }) => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        const unsubscribe = smartNotificationService.subscribe((notification) => {
            setNotifications((prev) => {
                if (prev.find((item) => item.id === notification.id)) return prev;
                return [...prev, { ...notification, timestamp: Date.now() }];
            });
        });

        return () => unsubscribe();
    }, []);

    const dismiss = (id) => {
        setNotifications((prev) => prev.map((item) => (item.id === id ? { ...item, leaving: true } : item)));
        window.setTimeout(() => {
            setNotifications((prev) => prev.filter((item) => item.id !== id));
        }, LEAVE_MS);
    };

    // Banners leave on their own after a few seconds, like iOS.
    useEffect(() => {
        if (notifications.length === 0) return undefined;
        const timer = window.setInterval(() => {
            const now = Date.now();
            notifications
                .filter((item) => !item.leaving && now - item.timestamp >= VISIBLE_MS)
                .forEach((item) => dismiss(item.id));
        }, 1000);
        return () => window.clearInterval(timer);
    }, [notifications]);

    const open = (notification) => {
        if (notification.action && onAction) onAction(notification.action, notification.data);
        dismiss(notification.id);
    };

    return (
        <div className="ios-banner-region">
            {notifications.slice(-2).map((notification) => (
                <Banner key={notification.id} notification={notification} onOpen={open} onDismiss={dismiss} />
            ))}
        </div>
    );
};

export default NotificationToast;
