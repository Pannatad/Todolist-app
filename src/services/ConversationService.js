/**
 * ConversationService - Manages multi-turn chat sessions with Gemini
 * Provides semantic summarization for older messages to maintain context
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

// Configuration
const CONFIG = {
    RECENT_MESSAGES_WINDOW: 20,  // Keep last 20 messages in full detail
    SUMMARY_BATCH_SIZE: 10,      // Summarize 10 messages at a time
    MODEL_NAME: "gemini-3.1-flash-lite-preview"
};

// Active chat session cache (per-session, not persisted)
let activeChatSession = null;
let lastSystemPrompt = null;

/**
 * Format messages for Gemini's chat history format
 * Gemini requires: history MUST start with 'user' role and alternate user/model
 * @param {Array} messages - Array of { role: 'user'|'assistant', content: string }
 * @returns {Array} - Gemini format [{ role: 'user'|'model', parts: [{ text }] }]
 */
export const formatHistoryForGemini = (messages) => {
    const filtered = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

    // Gemini requires history to start with 'user' role
    // Find the first 'user' message and start from there
    const firstUserIndex = filtered.findIndex(m => m.role === 'user');
    if (firstUserIndex === -1) {
        // No user messages, return empty history
        return [];
    }

    const trimmedHistory = filtered.slice(firstUserIndex);

    // Ensure alternating roles (Gemini requirement)
    // Merge consecutive same-role messages
    const alternatingHistory = [];
    for (const msg of trimmedHistory) {
        const lastMsg = alternatingHistory[alternatingHistory.length - 1];
        if (lastMsg && lastMsg.role === msg.role) {
            // Merge with previous message of same role
            lastMsg.parts[0].text += '\n\n' + msg.parts[0].text;
        } else {
            alternatingHistory.push(msg);
        }
    }

    // Final check: must start with 'user'
    if (alternatingHistory.length > 0 && alternatingHistory[0].role !== 'user') {
        return alternatingHistory.slice(1);
    }

    return alternatingHistory;
};

/**
 * Summarize older messages into a compact context summary
 * @param {Array} oldMessages - Messages to summarize (beyond the recent window)
 * @returns {Promise<string>} - Concise summary of older conversation
 */
export const summarizeOlderMessages = async (oldMessages) => {
    if (!oldMessages || oldMessages.length === 0) {
        return '';
    }

    if (!API_KEY) {
        // Fallback: just extract key points as bullet list
        return oldMessages.slice(-5).map(m =>
            `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content.substring(0, 100)}...`
        ).join('\n');
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite-preview" });

        const conversationText = oldMessages.map(m =>
            `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`
        ).join('\n');

        const prompt = `Summarize this conversation history into a concise context summary (max 200 words). 
Focus on:
1. Key decisions or actions taken
2. Important information shared by the user
3. Ongoing topics or unresolved questions
4. User preferences mentioned

Conversation:
${conversationText}

Summary (be concise, focus on context the agent needs to remember):`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text().trim();

        console.log('📝 Generated conversation summary:', summary.substring(0, 100) + '...');
        return summary;

    } catch (error) {
        console.error('Error summarizing messages:', error);
        // Fallback to simple extraction
        return oldMessages.slice(-3).map(m =>
            `${m.role === 'user' ? 'User asked' : 'Agent said'}: ${m.content.substring(0, 80)}...`
        ).join(' ');
    }
};

/**
 * Prepare conversation context with summarization
 * @param {Array} allMessages - All conversation messages
 * @returns {Promise<{ recentHistory: Array, olderSummary: string }>}
 */
export const prepareConversationContext = async (allMessages) => {
    if (!allMessages || allMessages.length === 0) {
        return { recentHistory: [], olderSummary: '' };
    }

    const recentMessages = allMessages.slice(-CONFIG.RECENT_MESSAGES_WINDOW);
    const olderMessages = allMessages.slice(0, -CONFIG.RECENT_MESSAGES_WINDOW);

    let olderSummary = '';
    if (olderMessages.length > 0) {
        olderSummary = await summarizeOlderMessages(olderMessages);
    }

    return {
        recentHistory: recentMessages,
        olderSummary
    };
};

/**
 * Build the system prompt for the agent chat session
 * @param {Object} context - User context (profile, tasks, schedule, etc.)
 * @param {string} olderSummary - Summary of older conversation
 * @returns {string} - System instruction for the chat session
 */
export const buildAgentSystemPrompt = (context, olderSummary = '') => {
    const { userProfile = {}, memorySummary = '', intelligenceSummary = '' } = context;

    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    const timezoneOffset = -now.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60).toString().padStart(2, '0');
    const offsetMins = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0');
    const timezoneString = `${timezoneOffset >= 0 ? '+' : '-'}${offsetHours}:${offsetMins}`;

    return `You are an intelligent AI agent for a productivity app called "All-in-One Assistant".
Your job is to help the user manage tasks, schedule, habits, and projects through natural conversation.
You have memory of past interactions and know the user's preferences.

CURRENT DATE & TIME: ${currentDateTime}
TIMEZONE: ${timezoneString}

USER PROFILE:
Name: ${userProfile.name || 'User'}
Role: ${userProfile.role || 'Not specified'}
Bio: ${userProfile.bio || 'Not provided'}

${intelligenceSummary ? `LEARNED ABOUT THIS USER:
${intelligenceSummary}
` : ''}${memorySummary ? `AGENT MEMORY (short-term patterns):
${memorySummary}
` : ''}
${olderSummary ? `EARLIER CONVERSATION SUMMARY (important context from past messages):
${olderSummary}

` : ''}CONVERSATION GUIDELINES:
- Remember everything discussed in this conversation session
- Reference previous messages naturally (e.g., "As you mentioned earlier...")
- Use learned information about the user to personalize responses
- Make suggestions based on known preferences and patterns
- Keep track of any commitments or promises made
- Notice patterns in user requests
- Be conversational and helpful
- When user shares personal information, acknowledge it naturally

RESPONSE FORMAT:
Always respond with JSON containing:
{
    "actions": [{ "type": "action_type", "params": {...}, "explanation": "..." }],
    "summary": "Brief description"
}

Supported action types:
- add_task: params { title, deadline (ISO string like "${new Date().toISOString().split('T')[0]}T23:59:00"), difficulty, subject, estimatedTime }
- edit_task: params { taskId, updates }
- delete_task: params { taskId }
- complete_task: params { taskId }
- add_schedule: params { title, startTime (MUST be full ISO string with date, e.g., "${new Date().toISOString().split('T')[0]}T13:00:00"), duration (minutes), category }
- edit_schedule: params { eventId, updates } - ONLY use if you have a valid eventId from an existing item
- delete_schedule: params { eventId }
- complete_habit: params { habitId }
- navigate: params { tabName }
- info_response: params { message, suggestedTab }
- clarify: params { question, suggestions }
- remember: params { note }
- set_goal: params { goalText, type }

CRITICAL RULES:
1. For add_schedule, startTime MUST include the full date (not just time). Use format: YYYY-MM-DDTHH:MM:SS
2. If user REJECTS a pending action and provides new details (e.g., "No, at 8 AM instead"), use add_schedule with the corrected params, NOT edit_schedule. The previous action was never executed, so there's nothing to edit.
3. Only use edit_schedule when modifying an EXISTING item that has a valid ID from the schedule list above.`;
};

/**
 * Create a new chat session with history
 * @param {Array} messages - Conversation messages
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Chat session object
 */
export const createChatSession = async (messages, context) => {
    if (!API_KEY) {
        console.warn('⚠️ Gemini API Key missing');
        return null;
    }

    try {
        // Prepare conversation context with summarization
        const { recentHistory, olderSummary } = await prepareConversationContext(messages);

        // Build system prompt
        const systemPrompt = buildAgentSystemPrompt(context, olderSummary);

        // Format history for Gemini (exclude the last user message - that gets sent separately)
        const historyForGemini = formatHistoryForGemini(recentHistory.slice(0, -1));

        // Create the model with system instruction
        const model = genAI.getGenerativeModel({
            model: CONFIG.MODEL_NAME,
            systemInstruction: systemPrompt
        });

        // Start chat with history
        const chat = model.startChat({
            history: historyForGemini,
            generationConfig: {
                temperature: 0.7,
                topP: 0.95,
                topK: 40,
                maxOutputTokens: 2048,
            }
        });

        console.log('🔄 Created new chat session with', historyForGemini.length, 'history messages');

        activeChatSession = chat;
        lastSystemPrompt = systemPrompt;

        return chat;

    } catch (error) {
        console.error('Error creating chat session:', error);
        return null;
    }
};

/**
 * Send a message using multi-turn chat
 * @param {string} userMessage - The user's message
 * @param {Array} allMessages - All conversation messages (for context)
 * @param {Object} context - User context (tasks, schedule, etc.)
 * @returns {Promise<Object>} - Parsed response { actions, summary }
 */
export const sendChatMessage = async (userMessage, allMessages, context) => {
    if (!API_KEY) {
        return {
            actions: [{
                type: 'info_response',
                params: { message: "API key missing. Unable to process." },
                explanation: 'Error'
            }],
            summary: "API key error"
        };
    }

    try {
        // Create/update chat session
        const chat = await createChatSession(allMessages, context);

        if (!chat) {
            throw new Error('Failed to create chat session');
        }

        // Build the message with current context
        const messageWithContext = buildMessageWithContext(userMessage, context);

        console.log('💬 Sending chat message...');
        const result = await chat.sendMessage(messageWithContext);
        const response = await result.response;
        let text = response.text().trim();

        console.log('📄 Chat response:', text.substring(0, 200) + '...');

        // Clean up markdown if present
        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const parsed = JSON.parse(text);

        return {
            actions: Array.isArray(parsed.actions) ? parsed.actions : [],
            summary: parsed.summary || "Processed your request."
        };

    } catch (error) {
        console.error('❌ Error in chat message:', error);

        // Fallback: try single-shot if chat fails
        console.log('🔄 Falling back to single-shot mode...');
        return fallbackSingleShot(userMessage, allMessages, context);
    }
};

/**
 * Build message with current dynamic context (tasks, schedule, etc.)
 */
const buildMessageWithContext = (userMessage, context) => {
    const { recentTasks = [], tasksDueToday = [], recentSchedule = [], habits = [], projects = [], activeSubject = null, pendingActions = null } = context;

    const now = new Date();
    const todayDateForSchedule = now.toISOString().split('T')[0];

    // Get timezone string
    const timezoneOffset = -now.getTimezoneOffset();
    const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60).toString().padStart(2, '0');
    const offsetMins = (Math.abs(timezoneOffset) % 60).toString().padStart(2, '0');
    const timezoneString = `${timezoneOffset >= 0 ? '+' : '-'}${offsetHours}:${offsetMins}`;

    // Build active subject section if present
    let activeSubjectSection = '';
    if (activeSubject) {
        activeSubjectSection = `
⚠️ ACTIVE SUBJECT (the item user is currently discussing):
Type: ${activeSubject.type}
Title: "${activeSubject.title}"
${activeSubject.id ? `ID: ${activeSubject.id}` : '(New item - not yet created)'}
Last Action: ${activeSubject.action || 'referenced'}

CRITICAL: If the user's message refers to "it", "this", "the time", "the duration", or makes any follow-up request without naming a specific item, they are referring to THIS active subject. Do NOT modify any other item!

`;
    }

    // Build pending actions section - CRITICAL for handling modifications before confirmation
    let pendingActionsSection = '';
    if (pendingActions && pendingActions.length > 0) {
        const pendingSchedule = pendingActions.find(a => a.type === 'add_schedule');
        const pendingTask = pendingActions.find(a => a.type === 'add_task');

        if (pendingSchedule || pendingTask) {
            pendingActionsSection = `
🔴 PENDING UNCONFIRMED ACTIONS (waiting for user to confirm - NOT YET CREATED):
${pendingSchedule ? `- add_schedule: "${pendingSchedule.params?.title}" at ${pendingSchedule.params?.startTime} for ${pendingSchedule.params?.duration || 60} min` : ''}
${pendingTask ? `- add_task: "${pendingTask.params?.title}"` : ''}

⚠️ CRITICAL RULES FOR MODIFYING PENDING ACTIONS:
1. NEVER use edit_schedule or edit_task - the item doesn't exist yet!
2. If user says "change the name" or "rename it" WITHOUT providing the new name:
   → Use clarify action to ask: "What would you like to call it instead?"
3. If user provides new details (e.g., "make it 45 mins", "change to 8 AM", "call it Study Session"):
   → Propose a NEW add_schedule with ALL parameters:
   → Keep ORIGINAL values for unchanged fields + apply user's changes
   → Example: Pending is "Deep Work" at ${pendingSchedule?.params?.startTime || '9AM'} for ${pendingSchedule?.params?.duration || 30} min
     User says "call it Focus Time" → add_schedule: title="Focus Time", startTime=${pendingSchedule?.params?.startTime || 'ORIGINAL'}, duration=${pendingSchedule?.params?.duration || 'ORIGINAL'}

`
        }
    }

    return `CURRENT STATE (use this for your response):

TODAY: ${todayDateForSchedule}
CURRENT TIME: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
TIMEZONE: ${timezoneString}
${pendingActionsSection}${activeSubjectSection}
TASKS (${recentTasks.length} total, ${tasksDueToday?.length || 0} due today):
${recentTasks.slice(0, 10).map(t => `- [ID: ${t.id}] "${t.title}" (${t.completed ? 'done' : 'pending'}${t.deadline ? ', due: ' + new Date(t.deadline).toLocaleDateString() : ''})`).join('\n') || 'No tasks'}

SCHEDULE ITEMS (recent and upcoming):
${recentSchedule.slice(0, 8).map(s => {
        const eventTime = new Date(s.displayTime || s.startTime || s.start_time);
        const isPassed = eventTime < now;
        return `- [ID: ${s.id}] "${s.title}" at ${eventTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${isPassed ? '(passed)' : ''}`;
    }).join('\n') || 'No events'}

HABITS:
${habits.slice(0, 5).map(h => `- [ID: ${h.id}] "${h.name}" (${h.completedToday ? '✓ done' : 'not done'})`).join('\n') || 'No habits'}

PROJECTS:
${projects.slice(0, 5).map(p => `- "${p.title}" (${p.progress}% done)`).join('\n') || 'No projects'}

---

USER MESSAGE: ${userMessage}

IMPORTANT: If creating a schedule event for today, use startTime format: "${todayDateForSchedule}T[HH:MM:00]" (e.g., "${todayDateForSchedule}T13:00:00" for 1 PM today)

Respond with JSON: { "actions": [...], "summary": "..." }`;
};

/**
 * Fallback to single-shot generation if chat session fails
 */
const fallbackSingleShot = async (userMessage, allMessages, context) => {
    try {
        const { routeAgentCommand } = await import('./gemini.js');

        // Build conversation history for context
        const recentMessages = allMessages.slice(-10);
        const conversationHistory = recentMessages.map(m =>
            `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`
        ).join('\n');

        return await routeAgentCommand(userMessage, {
            ...context,
            conversationHistory
        });
    } catch (error) {
        console.error('Fallback also failed:', error);
        return {
            actions: [{
                type: 'info_response',
                params: { message: "I had trouble processing that. Could you try again?" },
                explanation: 'Error recovery'
            }],
            summary: "Error occurred"
        };
    }
};

/**
 * Clear the active chat session (call when conversation is cleared)
 */
export const clearChatSession = () => {
    activeChatSession = null;
    lastSystemPrompt = null;
    console.log('🗑️ Chat session cleared');
};

/**
 * Get current session info (for debugging)
 */
export const getSessionInfo = () => ({
    hasActiveSession: !!activeChatSession,
    messageWindowSize: CONFIG.RECENT_MESSAGES_WINDOW
});

export default {
    sendChatMessage,
    createChatSession,
    clearChatSession,
    prepareConversationContext,
    summarizeOlderMessages,
    formatHistoryForGemini,
    getSessionInfo,
    CONFIG
};
