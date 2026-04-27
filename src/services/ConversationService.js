/**
 * ConversationService - Manages multi-turn chat sessions with Gemini
 * Provides semantic summarization for older messages to maintain context
 */

import { createGenerativeModel } from './generativeClient';
import {
    buildAgentStateMessage,
    buildAgentSystemPrompt as buildConfiguredAgentSystemPrompt
} from './agentPrompts';

const API_BACKEND_AVAILABLE = true;
const genAI = {
    getGenerativeModel: createGenerativeModel
};

// Configuration
const CONFIG = {
    RECENT_MESSAGES_WINDOW: 20,  // Keep last 20 messages in full detail
    SUMMARY_BATCH_SIZE: 10,      // Summarize 10 messages at a time
    MODEL_NAME: "gemini-3.1-flash-lite-preview"
};

// Active chat session cache (per-session, not persisted)
let activeChatSession = null;

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

    if (!API_BACKEND_AVAILABLE) {
        // Fallback: just extract key points as bullet list
        return oldMessages.slice(-5).map(m =>
            `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content.substring(0, 100)}...`
        ).join('\n');
    }

    try {
        const model = genAI.getGenerativeModel({ model: CONFIG.MODEL_NAME });

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
    return buildConfiguredAgentSystemPrompt(context, olderSummary);
};

/**
 * Create a new chat session with history
 * @param {Array} messages - Conversation messages
 * @param {Object} context - User context
 * @returns {Promise<Object>} - Chat session object
 */
export const createChatSession = async (messages, context) => {
    if (!API_BACKEND_AVAILABLE) {
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
    if (!API_BACKEND_AVAILABLE) {
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
    return buildAgentStateMessage(userMessage, context);
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
