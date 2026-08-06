/**
 * Pattern Learning Service
 * Analyzes user data to auto-generate insights and patterns for the agent
 */

import { getTaskCompletionTimestamp, isTaskCompleted } from '../utils/taskState';

class PatternLearningService {
    constructor() {
        this.patterns = {
            workTimes: [],
            sleepPatterns: [],
            taskPreferences: [],
            productivityPatterns: []
        };
    }

    /**
     * Analyze all user data and generate insights
     */
    analyzeAndGenerateInsights(data) {
        const { tasks, scheduleItems, sleepData } = data;
        const insights = [];

        // Analyze work patterns
        const workPatterns = this.analyzeWorkPatterns(scheduleItems, tasks);
        if (workPatterns) insights.push(...workPatterns);

        // Analyze sleep patterns
        const sleepPatterns = this.analyzeSleepPatterns(sleepData);
        if (sleepPatterns) insights.push(...sleepPatterns);

        // Analyze task preferences
        const taskPatterns = this.analyzeTaskPreferences(tasks);
        if (taskPatterns) insights.push(...taskPatterns);

        // Analyze productivity patterns
        const productivityPatterns = this.analyzeProductivity(tasks);
        if (productivityPatterns) insights.push(...productivityPatterns);

        return insights;
    }

    /**
     * Analyze when user typically schedules work/study
     */
    analyzeWorkPatterns(scheduleItems, tasks) {
        if (!scheduleItems?.length && !tasks?.length) return null;

        const insights = [];
        const hourCounts = {};
        const dayOfWeekCounts = {};

        // Analyze schedule items
        scheduleItems?.forEach(item => {
            const date = new Date(item.startTime || item.start_time);
            const hour = date.getHours();
            const dayOfWeek = date.getDay();

            hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            dayOfWeekCounts[dayOfWeek] = (dayOfWeekCounts[dayOfWeek] || 0) + 1;
        });

        // Find peak work hours
        const sortedHours = Object.entries(hourCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        if (sortedHours.length > 0) {
            const peakHours = sortedHours.map(([h]) => {
                const hour = parseInt(h);
                return hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
            });

            insights.push({
                type: 'pattern',
                category: 'work_time',
                content: `User is most active at ${peakHours.join(', ')}`,
                confidence: Math.min(0.9, sortedHours[0][1] / 10)
            });
        }

        // Find most productive days
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const sortedDays = Object.entries(dayOfWeekCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 2);

        if (sortedDays.length > 0) {
            const productiveDays = sortedDays.map(([d]) => dayNames[parseInt(d)]);
            insights.push({
                type: 'pattern',
                category: 'productive_days',
                content: `Most productive on ${productiveDays.join(' and ')}`,
                confidence: Math.min(0.85, sortedDays[0][1] / 5)
            });
        }

        return insights;
    }

    /**
     * Analyze sleep patterns from daily reflections
     */
    analyzeSleepPatterns(sleepData) {
        if (!sleepData?.length || sleepData.length < 3) return null;

        const insights = [];

        // Calculate average sleep duration
        const durations = sleepData
            .map(d => d.raw_data?.sleepHours)
            .filter(h => h != null);

        if (durations.length >= 3) {
            const avgDuration = (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1);
            insights.push({
                type: 'pattern',
                category: 'sleep_duration',
                content: `Averages ${avgDuration} hours of sleep per night`,
                confidence: Math.min(0.9, durations.length / 10)
            });
        }

        // Calculate average wake time
        const wakeTimes = sleepData
            .map(d => d.raw_data?.wakeUpTime)
            .filter(Boolean)
            .map(t => {
                const [h, m] = t.split(':').map(Number);
                return h * 60 + m;
            });

        if (wakeTimes.length >= 3) {
            const avgMinutes = Math.round(wakeTimes.reduce((a, b) => a + b, 0) / wakeTimes.length);
            const hours = Math.floor(avgMinutes / 60);
            const mins = avgMinutes % 60;
            const avgWakeTime = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;

            insights.push({
                type: 'pattern',
                category: 'wake_time',
                content: `Usually wakes up around ${avgWakeTime}`,
                confidence: Math.min(0.85, wakeTimes.length / 10)
            });
        }

        // Analyze sleep quality
        const qualities = sleepData
            .map(d => d.mood_score || d.raw_data?.sleepQuality)
            .filter(q => q != null);

        if (qualities.length >= 3) {
            const avgQuality = (qualities.reduce((a, b) => a + b, 0) / qualities.length).toFixed(1);
            const qualityLabel = avgQuality >= 4 ? 'excellent' : avgQuality >= 3 ? 'good' : avgQuality >= 2 ? 'fair' : 'poor';

            insights.push({
                type: 'pattern',
                category: 'sleep_quality',
                content: `Sleep quality is generally ${qualityLabel} (avg ${avgQuality}/5)`,
                confidence: Math.min(0.8, qualities.length / 10)
            });
        }

        return insights;
    }

    /**
     * Analyze task preferences (subjects and duration)
     */
    analyzeTaskPreferences(tasks) {
        if (!tasks?.length || tasks.length < 5) return null;

        const insights = [];

        // Analyze top subjects
        const subjectCounts = {};
        tasks.forEach(t => {
            if (t.subject) {
                subjectCounts[t.subject] = (subjectCounts[t.subject] || 0) + 1;
            }
        });

        const topSubjects = Object.entries(subjectCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([s]) => s);

        if (topSubjects.length > 0) {
            insights.push({
                type: 'preference',
                category: 'subjects',
                content: `Main focus areas: ${topSubjects.join(', ')}`,
                confidence: Math.min(0.8, topSubjects.length / 3)
            });
        }

        // Analyze estimated time preferences
        const times = tasks
            .map(t => t.estimatedTime)
            .filter(t => t != null);

        if (times.length >= 5) {
            const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
            const timePreference = avgTime <= 30 ? 'short (under 30 min)' :
                avgTime <= 60 ? 'medium (30-60 min)' : 'long (over 1 hour)';

            insights.push({
                type: 'preference',
                category: 'task_duration',
                content: `Prefers ${timePreference} tasks`,
                confidence: Math.min(0.75, times.length / 10)
            });
        }

        return insights;
    }

    /**
     * Analyze productivity patterns
     */
    analyzeProductivity(tasks) {
        if (!tasks?.length) return null;

        const insights = [];
        const completedTasks = tasks.filter(isTaskCompleted);
        const totalTasks = tasks.length;

        if (completedTasks.length >= 5) {
            const completionRate = ((completedTasks.length / totalTasks) * 100).toFixed(0);

            insights.push({
                type: 'insight',
                category: 'completion_rate',
                content: `Task completion rate: ${completionRate}%`,
                confidence: 0.9
            });
        }

        // Analyze deadline behavior
        const tasksWithDeadlines = completedTasks.filter(t => t.deadline && getTaskCompletionTimestamp(t));

        if (tasksWithDeadlines.length >= 3) {
            let earlyCount = 0;
            let onTimeCount = 0;
            let lateCount = 0;

            tasksWithDeadlines.forEach(t => {
                const deadline = new Date(t.deadline);
                const completed = new Date(getTaskCompletionTimestamp(t));
                const diffDays = (deadline - completed) / (1000 * 60 * 60 * 24);

                if (diffDays > 1) earlyCount++;
                else if (diffDays >= 0) onTimeCount++;
                else lateCount++;
            });

            const total = earlyCount + onTimeCount + lateCount;
            const behavior = earlyCount > lateCount ? 'ahead of schedule' :
                lateCount > earlyCount ? 'last-minute' : 'on time';

            insights.push({
                type: 'insight',
                category: 'deadline_behavior',
                content: `Usually completes tasks ${behavior}`,
                confidence: Math.min(0.85, total / 10)
            });
        }

        return insights;
    }

    /**
     * Generate a formatted summary for the agent prompt
     */
    generateSummaryForAgent(insights, userProfile) {
        if (!insights?.length && !userProfile) return '';

        let summary = '';

        // Add user profile info
        if (userProfile) {
            const profileParts = [];
            if (userProfile.nickname) profileParts.push(`Name: ${userProfile.nickname}`);
            if (userProfile.focusStyle) profileParts.push(`Focus style: ${userProfile.focusStyle}`);
            if (userProfile.occupation) profileParts.push(`Role: ${userProfile.occupation}`);

            if (profileParts.length > 0) {
                summary += `User: ${profileParts.join(', ')}. `;
            }
        }

        // Group insights by category
        const patterns = insights.filter(i => i.type === 'pattern');
        const preferences = insights.filter(i => i.type === 'preference');
        const insightsList = insights.filter(i => i.type === 'insight');

        if (patterns.length > 0) {
            summary += `Patterns: ${patterns.map(p => p.content).join('. ')}. `;
        }

        if (preferences.length > 0) {
            summary += `Preferences: ${preferences.map(p => p.content).join('. ')}. `;
        }

        if (insightsList.length > 0) {
            summary += `Insights: ${insightsList.map(i => i.content).join('. ')}.`;
        }

        return summary || 'Still learning user patterns...';
    }
}

// Singleton instance
const patternLearningService = new PatternLearningService();
export default patternLearningService;
