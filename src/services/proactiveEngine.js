/**
 * Proactive Suggestion Engine
 * Generates contextual suggestions based on time of day, user data, and patterns
 */

/**
 * Generates proactive suggestions based on current context
 * @param {object} context - User context
 * @returns {Array} - Array of suggestion objects
 */
export const generateProactiveSuggestions = (context) => {
    const { tasks, schedule, habits, profile, currentTime } = context;
    const now = currentTime ? new Date(currentTime) : new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const suggestions = [];

    const pendingTasks = tasks?.filter(t => !t.completed) || [];
    const todaySchedule = schedule || [];
    const nickname = profile?.nickname || profile?.name || 'there';

    // Morning suggestions (6am - 11am)
    if (hour >= 6 && hour < 11) {
        // Suggest planning the day
        if (pendingTasks.length > 0) {
            suggestions.push({
                id: 'morning-plan',
                type: 'action',
                icon: '☀️',
                title: `Good morning, ${nickname}!`,
                message: `You have ${pendingTasks.length} task${pendingTasks.length > 1 ? 's' : ''} pending. Want me to help prioritize?`,
                action: 'Help me prioritize my tasks for today',
                priority: 'high'
            });
        }

        // Check for urgent deadlines
        const urgentTasks = pendingTasks.filter(t => {
            if (!t.deadline) return false;
            const deadline = new Date(t.deadline);
            const hoursUntilDue = (deadline - now) / (1000 * 60 * 60);
            return hoursUntilDue > 0 && hoursUntilDue <= 24;
        });

        if (urgentTasks.length > 0) {
            suggestions.push({
                id: 'urgent-deadline',
                type: 'warning',
                icon: '⚠️',
                title: 'Urgent Deadlines!',
                message: `${urgentTasks.length} task${urgentTasks.length > 1 ? 's' : ''} due within 24 hours: "${urgentTasks[0].title}"${urgentTasks.length > 1 ? ' and more' : ''}`,
                action: `Help me complete "${urgentTasks[0].title}"`,
                priority: 'urgent'
            });
        }
    }

    // Midday suggestions (11am - 2pm)
    if (hour >= 11 && hour < 14) {
        // Suggest a break or lunch
        if (todaySchedule.length > 3) {
            suggestions.push({
                id: 'lunch-break',
                type: 'reminder',
                icon: '🍽️',
                title: 'Time for a break?',
                message: 'Busy morning! Consider taking a lunch break to recharge.',
                action: 'Schedule a 30-minute lunch break',
                priority: 'low'
            });
        }
    }

    // Afternoon suggestions (2pm - 5pm)
    if (hour >= 14 && hour < 17) {
        const completedToday = tasks?.filter(t => {
            if (!t.completed || !t.completedAt) return false;
            const completedDate = new Date(t.completedAt);
            return completedDate.toDateString() === now.toDateString();
        }) || [];

        if (completedToday.length > 0) {
            suggestions.push({
                id: 'afternoon-progress',
                type: 'celebration',
                icon: '🎉',
                title: 'Great progress!',
                message: `You've completed ${completedToday.length} task${completedToday.length > 1 ? 's' : ''} today. Keep it up!`,
                priority: 'low'
            });
        }

        // Focus block suggestion
        if (profile?.focusStyle === 'deep_work' && pendingTasks.length > 0) {
            suggestions.push({
                id: 'focus-block',
                type: 'action',
                icon: '🎯',
                title: 'Deep work time?',
                message: 'Afternoon is great for focused work. Want to schedule a focus block?',
                action: 'Schedule a 90-minute focus block now',
                priority: 'medium'
            });
        }
    }

    // Evening suggestions (5pm - 9pm)
    if (hour >= 17 && hour < 21) {
        suggestions.push({
            id: 'evening-review',
            type: 'action',
            icon: '🌙',
            title: 'Wrap up your day?',
            message: 'Perfect time to review what you accomplished and plan tomorrow.',
            action: 'Show me my day summary',
            priority: 'medium'
        });
    }

    // Weekend suggestions
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        suggestions.push({
            id: 'weekend-reflection',
            type: 'insight',
            icon: '📊',
            title: 'Weekend reflection',
            message: 'Want to see your weekly progress and set goals for next week?',
            action: 'Show me my weekly summary',
            priority: 'low'
        });
    }

    // No tasks suggestion
    if (pendingTasks.length === 0) {
        suggestions.push({
            id: 'no-tasks',
            type: 'celebration',
            icon: '✨',
            title: 'All caught up!',
            message: 'No pending tasks. Time to set new goals or take a well-deserved break!',
            priority: 'low'
        });
    }

    // Sort by priority
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    suggestions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Return top 2 most relevant suggestions
    return suggestions.slice(0, 2);
};

export default { generateProactiveSuggestions };
