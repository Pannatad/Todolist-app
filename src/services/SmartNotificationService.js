import { isTaskActive } from '../utils/taskState';
import { toLocalDateKey } from '../utils/scheduleOccurrences';

/**
 * Smart Notification Service
 * Monitors schedule, tasks, and habits to send proactive notifications
 */

class SmartNotificationService {
    constructor() {
        this.intervalId = null;
        this.notifiedEvents = new Set(); // Track already-notified event IDs
        this.notifiedTasks = new Set();
        this.listeners = [];
        this.permissionGranted = false;
        this.checkInterval = 60000; // Check every 60 seconds
    }

    /**
     * Request browser notification permission
     */
    async requestPermission() {
        if (!('Notification' in window)) {
            return false;
        }

        if (Notification.permission === 'granted') {
            this.permissionGranted = true;
            return true;
        }

        if (Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            this.permissionGranted = permission === 'granted';
            return this.permissionGranted;
        }

        return false;
    }

    /**
     * Start the notification service
     */
    start(getData) {
        if (this.intervalId) return;

        this.getData = getData;
        this.requestPermission();

        // Initial check
        this.checkNotifications();

        // Set up interval
        this.intervalId = setInterval(() => {
            this.checkNotifications();
        }, this.checkInterval);

    }

    /**
     * Send a test notification to verify the system works
     */
    testNotification() {
        this.emit({
            id: `test-${Date.now()}`,
            type: 'event-reminder',
            icon: '✅',
            title: 'Test Notification',
            message: 'Smart notifications are working!',
            priority: 'high',
            action: null,
            data: null
        });
    }

    /**
     * Demo notification - shows actual habit/task data without time restrictions
     * Call window.demoNotification() in console to test
     */
    demoNotification() {
        if (!this.getData) {
            return;
        }

        const { scheduleItems, tasks, habits } = this.getData();
        const todayStr = new Date().toISOString().split('T')[0];

        // Show incomplete habits
        const incompleteHabits = (habits || []).filter(h => !h.completedToday);
        if (incompleteHabits.length > 0) {
            this.emit({
                id: `demo-habits-${Date.now()}`,
                type: 'habit-nudge',
                icon: '💧',
                title: 'Habits Status (Demo)',
                message: `You have ${incompleteHabits.length} incomplete habit${incompleteHabits.length > 1 ? 's' : ''} today`,
                priority: 'medium',
                action: 'Go to Habits',
                data: incompleteHabits
            });
        }

        // Show tasks due today
        const tasksDueToday = (tasks || []).filter(t => {
            if (!isTaskActive(t)) return false;
            if (!t.deadline) return false;
            return t.deadline.split('T')[0] === todayStr;
        });
        if (tasksDueToday.length > 0) {
            setTimeout(() => {
                this.emit({
                    id: `demo-tasks-${Date.now()}`,
                    type: 'deadline-alert',
                    icon: '⚠️',
                    title: 'Tasks Due Today (Demo)',
                    message: tasksDueToday.slice(0, 2).map(t => t.title).join(', '),
                    priority: 'high',
                    action: 'View tasks',
                    data: tasksDueToday
                });
            }, 500);
        }

        // Show upcoming events
        const upcomingEvents = (scheduleItems || []).filter(e => {
            const timeValue = e.startTime || e.start_time;
            if (!timeValue) return false;
            const eventDate = new Date(timeValue);
            if (isNaN(eventDate.getTime())) return false;
            return eventDate > new Date();
        }).slice(0, 1);
        if (upcomingEvents.length > 0) {
            setTimeout(() => {
                this.emit({
                    id: `demo-events-${Date.now()}`,
                    type: 'event-reminder',
                    icon: '📅',
                    title: 'Next Event (Demo)',
                    message: `"${upcomingEvents[0].title}" coming up`,
                    priority: 'medium',
                    action: 'View Schedule',
                    data: upcomingEvents[0]
                });
            }, 1000);
        }

    }

    /**
     * Stop the notification service
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Subscribe to notifications
     */
    subscribe(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(l => l !== callback);
        };
    }

    /**
     * Emit notification to all listeners
     */
    emit(notification) {
        // Always notify in-app listeners (for toast display)
        this.listeners.forEach(callback => callback(notification));

        // Always show browser notification if permitted (not just when tab hidden)
        if (this.permissionGranted) {
            this.showBrowserNotification(notification);
        }
    }

    /**
     * Show browser notification
     */
    showBrowserNotification(notification) {
        try {
            const n = new Notification(notification.title, {
                body: notification.message,
                icon: '/favicon.ico',
                tag: notification.id,
                requireInteraction: notification.priority === 'urgent'
            });

            n.onclick = () => {
                window.focus();
                n.close();
            };

            // Auto close after 10 seconds
            setTimeout(() => n.close(), 10000);
        } catch (error) {
            console.error('Browser notification error:', error);
        }
    }

    /**
     * Main check function - runs on interval
     */
    checkNotifications() {
        if (!this.getData) return;

        const { scheduleItems, tasks, habits } = this.getData();
        const now = new Date();

        // Check upcoming schedule events (15 min warning)
        this.checkUpcomingEvents(scheduleItems, now);

        // Check task deadlines (same day)
        this.checkDeadlines(tasks, now);

        // Check habit reminders (midday nudge)
        this.checkHabits(habits, now);

        // Check yesterday's unlogged habits while the grace window is still open
        this.checkYesterdayHabitReview(habits, now);

        // Check scheduling conflicts
        this.checkConflicts(scheduleItems, now);
    }

    /**
     * Check for events starting in 5-15 minutes
     */
    checkUpcomingEvents(scheduleItems, now) {
        if (!scheduleItems?.length) return;

        const fifteenMinutesFromNow = new Date(now.getTime() + 15 * 60 * 1000);
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

        scheduleItems.forEach(event => {
            const timeValue = event.startTime || event.start_time;
            if (!timeValue) return; // Skip items without a valid time
            const eventStart = new Date(timeValue);
            if (isNaN(eventStart.getTime())) return; // Skip invalid dates
            const eventId = event.id || `${event.title}-${eventStart.getTime()}`;
            const minutesUntil = Math.round((eventStart - now) / (60 * 1000));

            // Check if event starts between 5-15 minutes from now
            if (
                eventStart > fiveMinutesFromNow &&
                eventStart <= fifteenMinutesFromNow &&
                !this.notifiedEvents.has(eventId)
            ) {
                this.notifiedEvents.add(eventId);

                this.emit({
                    id: `event-${eventId}`,
                    type: 'event-reminder',
                    icon: '🔔',
                    title: 'Upcoming Event',
                    message: `"${event.title}" starts in ${minutesUntil} minutes`,
                    priority: 'high',
                    action: null,
                    data: event
                });
            }
        });

        // Clean up old notified events (older than 1 hour)
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        scheduleItems.forEach(event => {
            const timeValue = event.startTime || event.start_time;
            if (!timeValue) return;
            const eventStart = new Date(timeValue);
            if (isNaN(eventStart.getTime())) return;
            const eventId = event.id || `${event.title}-${eventStart.getTime()}`;
            if (eventStart < oneHourAgo) {
                this.notifiedEvents.delete(eventId);
            }
        });
    }

    /**
     * Check for tasks due today
     */
    checkDeadlines(tasks, now) {
        if (!tasks?.length) return;

        const todayStr = now.toISOString().split('T')[0];
        const hour = now.getHours();

        // Check multiple times throughout the day (more helpful!)
        // 8am, 10am, 1pm, 4pm, 7pm, 9pm
        if (![8, 10, 13, 16, 19, 21].includes(hour)) return;

        const tasksDueToday = tasks.filter(task => {
            if (!isTaskActive(task)) return false;
            if (!task.deadline) return false;
            const deadlineStr = task.deadline.split('T')[0];
            return deadlineStr === todayStr;
        });

        if (tasksDueToday.length > 0) {
            const notificationId = `deadline-${todayStr}-${hour}`;
            if (this.notifiedTasks.has(notificationId)) return;

            this.notifiedTasks.add(notificationId);

            const taskNames = tasksDueToday.slice(0, 2).map(t => t.title).join(', ');
            const extra = tasksDueToday.length > 2 ? ` and ${tasksDueToday.length - 2} more` : '';

            this.emit({
                id: notificationId,
                type: 'deadline-alert',
                icon: '⚠️',
                title: 'Tasks Due Today',
                message: `${taskNames}${extra}`,
                priority: hour >= 18 ? 'urgent' : 'high',
                action: 'View tasks',
                data: tasksDueToday
            });
        }
    }

    /**
     * Check for incomplete habits - smarter time-based reminders
     */
    checkHabits(habits, now) {
        if (!habits?.length) return;

        const hour = now.getHours();
        const todayStr = now.toISOString().split('T')[0];

        // Define reminder windows for different habit times
        // Morning habits: remind at 10am and 12pm
        // Afternoon habits: remind at 3pm
        // Evening/Night habits: remind at 8pm  
        // Anytime habits: remind at 2pm
        const reminderSchedule = {
            morning: [10, 12],
            afternoon: [15],
            evening: [20],
            night: [20],
            anytime: [14, 20]
        };

        // Check which time-of-day habits should be reminded now
        for (const [timeOfDay, checkHours] of Object.entries(reminderSchedule)) {
            if (!checkHours.includes(hour)) continue;

            const notificationId = `habits-${timeOfDay}-${todayStr}-${hour}`;
            if (this.notifiedTasks.has(notificationId)) continue;

            const incompleteHabits = habits.filter(h => {
                const habitTime = h.time_of_day || h.timeOfDay || 'morning';
                return habitTime.toLowerCase() === timeOfDay && !h.completedToday;
            });

            if (incompleteHabits.length > 0) {
                this.notifiedTasks.add(notificationId);

                const timeLabel = timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1);
                this.emit({
                    id: notificationId,
                    type: 'habit-nudge',
                    icon: '💧',
                    title: `${timeLabel} Habits Reminder`,
                    message: `You have ${incompleteHabits.length} ${timeOfDay} habit${incompleteHabits.length > 1 ? 's' : ''} to complete`,
                    priority: 'medium',
                    action: 'Go to Habits',
                    data: incompleteHabits
                });
            }
        }
    }

    /**
     * Ask whether yesterday's incomplete habits were truly missed or just not logged.
     */
    checkYesterdayHabitReview(habits, now) {
        if (!habits?.length) return;

        const hour = now.getHours();
        if (![8, 12, 18, 21].includes(hour)) return;

        const todayStr = toLocalDateKey(now);
        const yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = toLocalDateKey(yesterday);
        const notificationId = `habit-backfill-${yesterdayStr}-${hour}`;

        if (this.notifiedTasks.has(notificationId)) return;

        const needsReview = habits.filter((habit) => {
            if (!this.isHabitScheduledOnDate(habit, yesterday)) return false;
            return !(habit.completedDates || []).includes(yesterdayStr);
        });

        if (needsReview.length === 0) return;

        this.notifiedTasks.add(notificationId);

        const habitNames = needsReview.slice(0, 2).map((habit) => habit.name).join(', ');
        const extra = needsReview.length > 2 ? ` and ${needsReview.length - 2} more` : '';

        this.emit({
            id: notificationId,
            type: 'habit-backfill',
            icon: '🌿',
            title: 'Yesterday Habit Check',
            message: `Did you miss ${habitNames}${extra}, or just forget to log? You can still backfill today.`,
            priority: hour >= 18 ? 'high' : 'medium',
            action: 'Go to Habits',
            data: { habits: needsReview, date: yesterdayStr, today: todayStr }
        });
    }

    isHabitScheduledOnDate(habit, date) {
        if (habit.frequency === 'daily') return true;
        if (habit.frequency === 'weekly' || habit.frequency === 'custom') {
            return habit.schedule_days?.includes(date.getDay());
        }
        return true;
    }

    /**
     * Check for scheduling conflicts
     */
    checkConflicts(scheduleItems, now) {
        if (!scheduleItems?.length || scheduleItems.length < 2) return;

        const todayStr = now.toISOString().split('T')[0];
        const todayEvents = scheduleItems.filter(e => {
            const timeValue = e.startTime || e.start_time;
            if (!timeValue) return false; // Skip items without a valid time
            const eventDate = new Date(timeValue);
            if (isNaN(eventDate.getTime())) return false; // Skip invalid dates
            return eventDate.toISOString().split('T')[0] === todayStr;
        });

        // Check for overlapping events
        const conflicts = [];
        for (let i = 0; i < todayEvents.length; i++) {
            for (let j = i + 1; j < todayEvents.length; j++) {
                const a = todayEvents[i];
                const b = todayEvents[j];

                const aStart = new Date(a.startTime || a.start_time);
                const aEnd = new Date(aStart.getTime() + (a.duration || 60) * 60 * 1000);
                const bStart = new Date(b.startTime || b.start_time);
                const bEnd = new Date(bStart.getTime() + (b.duration || 60) * 60 * 1000);

                // Check overlap
                if (aStart < bEnd && bStart < aEnd) {
                    conflicts.push({ a, b });
                }
            }
        }

        if (conflicts.length > 0) {
            const notificationId = `conflict-${todayStr}`;
            if (this.notifiedTasks.has(notificationId)) return;

            this.notifiedTasks.add(notificationId);

            this.emit({
                id: notificationId,
                type: 'conflict-warning',
                icon: '⚡',
                title: 'Schedule Conflict',
                message: `"${conflicts[0].a.title}" overlaps with "${conflicts[0].b.title}"`,
                priority: 'high',
                action: 'View Schedule',
                data: conflicts
            });
        }
    }

    /**
     * Reset daily notifications (call at midnight)
     */
    resetDaily() {
        this.notifiedTasks.clear();
    }
}

// Singleton instance
const smartNotificationService = new SmartNotificationService();

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.testNotification = () => smartNotificationService.testNotification();
    window.demoNotification = () => smartNotificationService.demoNotification();
    window.smartNotificationService = smartNotificationService;
}

export default smartNotificationService;
