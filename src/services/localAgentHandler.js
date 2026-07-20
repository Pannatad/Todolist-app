/**
 * Local Agent Handler - Handles common queries without calling Gemini API
 * Saves tokens by generating responses locally for predictable patterns
 */
import { log } from '../utils/log.js';

// Patterns that REQUIRE AI reasoning - don't handle locally
const AI_REQUIRED_PATTERNS = [
    /how should/i,
    /what should/i,
    /suggest|recommend|advice|help me|approach|plan|optimize|prioritize/i,
    /can you|could you|would you/i,
    /why|explain|analyze/i,
    /best way|better|improve/i
];

const SCHEDULE_READ_PATTERN = /^(?!.*\b(?:add|create|book|block|put|set up|make|new)\b)(?=.*\b(?:schedule|calendar|agenda|events?|plans?)\b)(?=.*\b(?:show|list|view|tell|check|what(?:'s|s| is)?|when|anything|do i have|have i got|what do i have|can you show|could you show)\b).*/i;
const TODAY_SCHEDULE_READ_PATTERN = /^(?!.*\b(?:add|create|book|block|put|set up|make|new)\b)(?=.*\b(?:today|tonight|this morning|this afternoon|this evening|right now)\b)(?=.*\b(?:schedule|calendar|agenda|events?|plans?|anything|do i have|what do i have|what(?:'s|s)? on)\b).*/i;
const DAY_OVERVIEW_PATTERN = /^(?:(?:can|could|would)\s+you\s+)?(?:please\s+)?(?:(?:summarize|recap|review)\s+(?:my\s+)?(?:day|today)|(?:show|give)\s+(?:me\s+)?(?:a\s+)?(?:summary|overview|recap)\s+(?:of\s+)?(?:my\s+)?(?:day|today)|(?:show|give)\s+(?:me\s+)?(?:my\s+)?(?:day|today)(?:'s)?\s+(?:summary|overview|recap)|what(?:'s| is)\s+(?:my\s+)?day\s+like)[?.!]*$/i;

// Simple data queries that can be handled locally
// These must be EXACT data display requests, not analytical questions
const LOCAL_PATTERNS = {
    // Only match explicit "show overview" or "give overview" type requests
    overview: /^(?:show|give|get|display)?\s*(?:me)?\s*(?:a|an|my|the)?\s*(?:day(?:'s)?|daily|today(?:'s)?)?\s*overview$/i,
    // Count queries
    taskCount: /^how many (?:pending\s*)?tasks|^task count$|^(?:show\s*)?pending tasks$/i,
    // Explicit schedule display
    scheduleQuery: SCHEDULE_READ_PATTERN,
    todayScheduleQuery: TODAY_SCHEDULE_READ_PATTERN,
    // Habit status
    habitQuery: /^(?:show\s*)?(?:my\s*)?(?:incomplete\s*)?habits?(?:\s*left|\s*today|\s*to complete)?$/i,
    // Project status
    projectQuery: /^(?:show\s*)?(?:my\s*)?projects?(?:\s*status)?$/i
};

/**
 * Check if a query can be handled locally
 * @param {string} input - User's query
 * @returns {string|null} - Pattern name if matched, null otherwise
 */
export const canHandleLocally = (input) => {
    const trimmed = input.trim();

    // Read-only data questions should stay deterministic even when phrased politely
    // ("can you show...") so the LLM does not mistake "schedule" as a create verb.
    if (SCHEDULE_READ_PATTERN.test(trimmed) || TODAY_SCHEDULE_READ_PATTERN.test(trimmed)) {
        return 'scheduleQuery';
    }

    if (DAY_OVERVIEW_PATTERN.test(trimmed)) {
        return 'overview';
    }

    // FIRST: Check if this needs AI reasoning - if so, don't handle locally
    for (const exclusion of AI_REQUIRED_PATTERNS) {
        if (exclusion.test(trimmed)) {
            log('AI reasoning required for:', trimmed);
            return null;
        }
    }

    // THEN: Check if it matches a simple data query
    for (const [pattern, regex] of Object.entries(LOCAL_PATTERNS)) {
        if (regex.test(trimmed)) {
            return pattern;
        }
    }

    return null;
};

/**
 * Generate a local response without calling Gemini
 * @param {string} patternType - The matched pattern type
 * @param {object} context - User context (tasks, schedule, habits, etc.)
 * @returns {object} - Response in the same format as routeAgentCommand
 */
export const generateLocalResponse = (patternType, context) => {
    const { recentTasks = [], tasksDueToday = [], recentSchedule = [], habits = [], projects = [] } = context;

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric'
    });

    switch (patternType) {
        case 'overview':
            return generateDayOverview(context, today);

        case 'taskCount':
            return {
                actions: [{
                    type: 'info_response',
                    params: {
                        message: `You have ${recentTasks.length} pending tasks.${tasksDueToday.length > 0 ? ` ${tasksDueToday.length} are due today.` : ''}`,
                        suggestedTab: 'tasks'
                    },
                    explanation: 'Task count summary'
                }],
                summary: 'Provided your task count.'
            };

        case 'scheduleQuery':
            return generateScheduleResponse(recentSchedule, today);

        case 'habitQuery':
            return generateHabitResponse(habits);

        case 'projectQuery':
            return generateProjectResponse(projects);

        default:
            return null;
    }
};

/**
 * Generate day overview response locally
 */
const generateDayOverview = (context, today) => {
    const { recentSchedule = [], tasksDueToday = [], habits = [], dailyHighlights = [] } = context;
    const todayKey = new Date().toDateString();

    // Build schedule section
    const scheduleItems = recentSchedule
        .filter(s => new Date(s.displayTime || s.startTime || s.start_time).toDateString() === todayKey)
        .sort((a, b) => new Date(a.displayTime || a.startTime || a.start_time) - new Date(b.displayTime || b.startTime || b.start_time))
        .slice(0, 5)
        .map(s => {
        const time = new Date(s.displayTime || s.startTime || s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isPassed = new Date(s.displayTime || s.startTime || s.start_time) < new Date();
        return `• ${time}: ${s.title}${isPassed ? ' (passed)' : ''}${s.isRecurring ? ' (recurring)' : ''}`;
        }).join('\n');

    // Build tasks section
    const taskItems = tasksDueToday.slice(0, 5).map(t => `• ${t.title}`).join('\n');

    // Build habits section
    const incompleteHabits = habits.filter(h => !h.completedToday);
    const habitItems = incompleteHabits.slice(0, 5).map(h => `• ${h.name} (${h.frequency})`).join('\n');

    // Build highlights section
    const highlightItems = dailyHighlights.slice(0, 3).map(h => `• ${h.text}`).join('\n');

    const message = `YOUR SCHEDULE TODAY
${scheduleItems || 'No scheduled events for today'}

TASKS DUE TODAY
${taskItems || 'No tasks due today'}

HABITS NOT YET DONE TODAY
${habitItems || 'All habits completed! 🎉'}

DAILY HIGHLIGHTS
${highlightItems || 'No daily highlights set for today'}`;

    return {
        actions: [{
            type: 'info_response',
            params: {
                message,
                suggestedTab: 'overview'
            },
            explanation: 'Day overview summary'
        }],
        summary: `Here's your day overview for ${today}.`
    };
};

/**
 * Generate schedule-only response
 */
const generateScheduleResponse = (schedule, today) => {
    const now = new Date();
    const todayKey = now.toDateString();
    const todaysSchedule = schedule
        .filter(s => new Date(s.displayTime || s.startTime || s.start_time).toDateString() === todayKey)
        .sort((a, b) => new Date(a.displayTime || a.startTime || a.start_time) - new Date(b.displayTime || b.startTime || b.start_time));

    const scheduleItems = todaysSchedule.slice(0, 8).map(s => {
        const eventTime = new Date(s.displayTime || s.startTime || s.start_time);
        const time = eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const duration = s.duration ? ` (${s.duration} min)` : '';
        const passed = eventTime < now ? ' (passed)' : '';
        return `• "${s.title}" at ${time}${duration}${passed}${s.isRecurring ? ' (recurring)' : ''}`;
    }).join('\n');

    return {
        actions: [{
            type: 'info_response',
            params: {
                message: `YOUR SCHEDULE TODAY\n${scheduleItems || 'No scheduled events for today.'}`,
                suggestedTab: 'schedule'
            },
            explanation: 'Today\'s schedule'
        }],
        summary: `Here's your schedule for ${today}.`
    };
};

/**
 * Generate habit response
 */
const generateHabitResponse = (habits) => {
    const incompleteHabits = habits.filter(h => !h.completedToday);

    if (incompleteHabits.length === 0) {
        return {
            actions: [{
                type: 'info_response',
                params: {
                    message: 'Great job! You\'ve completed all your habits for today! 🎉',
                    suggestedTab: 'habits'
                },
                explanation: 'Habit status'
            }],
            summary: 'All habits completed!'
        };
    }

    const habitNames = incompleteHabits.map(h => h.name).join(', ');

    return {
        actions: [{
            type: 'info_response',
            params: {
                message: `You have ${incompleteHabits.length} habits left to complete today: ${habitNames}.`,
                suggestedTab: 'habits'
            },
            explanation: 'Incomplete habits'
        }],
        summary: 'Listed your incomplete habits.'
    };
};

/**
 * Generate project response
 */
const generateProjectResponse = (projects) => {
    if (!projects || projects.length === 0) {
        return {
            actions: [{
                type: 'info_response',
                params: {
                    message: 'You don\'t have any active projects yet. Would you like to create one?',
                    suggestedTab: 'projects'
                },
                explanation: 'Project status'
            }],
            summary: 'No projects found.'
        };
    }

    const projectSummary = projects.slice(0, 5).map(p =>
        `"${p.title}" (${p.progress}% done, ${p.taskCount} tasks)`
    ).join(', ');

    return {
        actions: [{
            type: 'info_response',
            params: {
                message: `You currently have ${projects.length} active projects: ${projectSummary}.`,
                suggestedTab: 'projects'
            },
            explanation: 'Project summary'
        }],
        summary: 'Provided project summary.'
    };
};

// Response cache
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached response if available and not expired
 * @param {string} cacheKey - Cache key
 * @returns {object|null} - Cached response or null
 */
export const getCachedResponse = (cacheKey) => {
    const cached = responseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        log('Using cached response for:', cacheKey);
        return cached.response;
    }
    return null;
};

/**
 * Cache a response
 * @param {string} cacheKey - Cache key
 * @param {object} response - Response to cache
 */
export const cacheResponse = (cacheKey, response) => {
    responseCache.set(cacheKey, {
        response,
        timestamp: Date.now()
    });
    log('Cached response for:', cacheKey);
};

/**
 * Clear all cached responses (call when data changes)
 */
export const clearCache = () => {
    responseCache.clear();
    log('Cache cleared');
};

/**
 * Generate a cache key from input
 * @param {string} input - User input
 * @returns {string} - Cache key
 */
export const generateCacheKey = (input) => {
    const pattern = canHandleLocally(input);
    const today = new Date().toISOString().split('T')[0];
    return pattern ? `${pattern}_${today}` : `query_${input.toLowerCase().trim()}_${today}`;
};
