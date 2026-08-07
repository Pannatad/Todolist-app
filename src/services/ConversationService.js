/**
 * ConversationService - Manages multi-turn chat sessions with Gemini
 * Provides semantic summarization for older messages to maintain context
 */

import { createGenerativeModel } from './generativeClient';
import { getAIProviderRequestOptions, DEFAULT_GEMINI_MODEL, normalizeAIProvider } from './aiProvider';
import {
    AGENT_PLAN_RESPONSE_FORMAT,
    extractConversationText,
    shouldIncludeAgentState,
    shouldUseAgentActionMode
} from './agentResponseSchema';
import {
    buildAgentStateMessage,
    buildAgentSystemPrompt as buildConfiguredAgentSystemPrompt,
    buildConversationSystemPrompt
} from './agentPrompts';
import { log } from '../utils/log.js';
import { buildAttachmentMessage } from './chatAttachments.js';
import {
    DEFAULT_RECENT_MESSAGES_WINDOW,
    DEFAULT_SUMMARY_BATCH_SIZE,
    getConversationWindowPlan
} from './conversationHistory.js';

const API_BACKEND_AVAILABLE = true;
const genAI = {
    getGenerativeModel: createGenerativeModel
};

// Configuration
const CONFIG = {
    RECENT_MESSAGES_WINDOW: DEFAULT_RECENT_MESSAGES_WINDOW,
    SUMMARY_BATCH_SIZE: DEFAULT_SUMMARY_BATCH_SIZE,
    MODEL_NAME: DEFAULT_GEMINI_MODEL
};

// Active chat session cache (per-session, not persisted)
let activeChatSession = null;
let summaryCache = {
    provider: null,
    firstMessageKey: null,
    summarizedCount: 0,
    lastSummarizedKey: null,
    summary: ''
};

const messageKey = (message) => message?.id
    || `${message?.role || 'unknown'}:${String(message?.content || '').slice(0, 120)}`;

const resetSummaryCache = () => {
    summaryCache = {
        provider: null,
        firstMessageKey: null,
        summarizedCount: 0,
        lastSummarizedKey: null,
        summary: ''
    };
};

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
export const summarizeOlderMessages = async (oldMessages, aiProvider = undefined, previousSummary = '') => {
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
        const model = genAI.getGenerativeModel(getAIProviderRequestOptions(aiProvider));

        const conversationText = oldMessages.map(m =>
            `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`
        ).join('\n');

        const prompt = `Update the conversation context summary below. Keep the result under 240 words.
Focus on:
1. Key decisions or actions taken
2. Important information shared by the user
3. Ongoing topics or unresolved questions
4. User preferences mentioned

${previousSummary ? `Existing summary:\n${previousSummary}\n\n` : ''}New conversation messages:
${conversationText}

Summary (be concise, focus on context the agent needs to remember):`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const summary = response.text().trim();

        log('Generated conversation summary:', summary.substring(0, 100) + '...');
        return summary;

    } catch (error) {
        console.error('Error summarizing messages:', error);
        // Fallback to simple extraction
        const fallback = oldMessages.slice(-3).map(m =>
            `${m.role === 'user' ? 'User asked' : 'Agent said'}: ${m.content.substring(0, 80)}...`
        ).join(' ');
        return [previousSummary, fallback].filter(Boolean).join(' ').slice(0, 1800);
    }
};

/**
 * Prepare conversation context with summarization
 * @param {Array} allMessages - All conversation messages
 * @returns {Promise<{ recentHistory: Array, olderSummary: string }>}
 */
export const prepareConversationContext = async (allMessages, aiProvider = undefined) => {
    if (!allMessages || allMessages.length === 0) {
        return { recentHistory: [], olderSummary: '' };
    }

    const provider = normalizeAIProvider(aiProvider);
    const firstMessageKey = messageKey(allMessages[0]);
    const cacheStillMatches = summaryCache.provider === provider
        && summaryCache.firstMessageKey === firstMessageKey
        && summaryCache.summarizedCount <= allMessages.length
        && (summaryCache.summarizedCount === 0
            || messageKey(allMessages[summaryCache.summarizedCount - 1]) === summaryCache.lastSummarizedKey);

    if (!cacheStillMatches) resetSummaryCache();
    if (!summaryCache.firstMessageKey) {
        summaryCache.provider = provider;
        summaryCache.firstMessageKey = firstMessageKey;
    }

    const windowPlan = getConversationWindowPlan(
        allMessages.length,
        summaryCache.summarizedCount,
        {
            recentMessagesWindow: CONFIG.RECENT_MESSAGES_WINDOW,
            summaryBatchSize: CONFIG.SUMMARY_BATCH_SIZE
        }
    );
    const { targetSummaryCount } = windowPlan;

    if (targetSummaryCount > summaryCache.summarizedCount) {
        const nextBatch = allMessages.slice(windowPlan.nextSummaryStart, windowPlan.nextSummaryEnd);
        summaryCache.summary = await summarizeOlderMessages(
            nextBatch,
            aiProvider,
            summaryCache.summary
        );
        summaryCache.summarizedCount = targetSummaryCount;
        summaryCache.lastSummarizedKey = messageKey(allMessages[targetSummaryCount - 1]);
    }

    return {
        // Between summary batches this can temporarily reach 29 messages,
        // avoiding an extra model call on every turn while keeping a bounded
        // context window.
        recentHistory: allMessages.slice(windowPlan.recentStart),
        olderSummary: summaryCache.summary
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
export const createChatSession = async (
    messages,
    context,
    aiProvider = undefined,
    { actionMode = true, enableThinking = false } = {}
) => {
    if (!API_BACKEND_AVAILABLE) {
        console.warn('⚠️ Gemini API Key missing');
        return null;
    }

    try {
        // Prepare conversation context with summarization
        const { recentHistory, olderSummary } = await prepareConversationContext(messages, aiProvider);

        // Build system prompt
        const systemPrompt = actionMode
            ? buildAgentSystemPrompt(context, olderSummary)
            : buildConversationSystemPrompt(context, olderSummary);

        // Format history for Gemini (exclude the last user message - that gets sent separately)
        const historyForGemini = formatHistoryForGemini(recentHistory.slice(0, -1));

        // Create the model with system instruction
        const model = genAI.getGenerativeModel({
            ...getAIProviderRequestOptions(aiProvider, { enableThinking }),
            systemInstruction: systemPrompt,
            ...(actionMode ? { responseFormat: AGENT_PLAN_RESPONSE_FORMAT } : {})
        });

        // Start chat with history
        const chat = model.startChat({
            history: historyForGemini,
            generationConfig: {
                temperature: actionMode ? 0.2 : 0.5,
                topP: actionMode ? 0.8 : 0.9,
                topK: actionMode ? 20 : 40,
                maxOutputTokens: 2048,
            }
        });

        log('Created new chat session with', historyForGemini.length, 'history messages');

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
export const sendChatMessage = async (
    userMessage,
    allMessages,
    context,
    aiProvider = undefined,
    { attachment, enableThinking = false, onStream, signal } = {}
) => {
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
        const actionMode = shouldUseAgentActionMode(userMessage, {
            hasPendingAction: Array.isArray(context?.pendingActions) && context.pendingActions.length > 0,
            scheduleIntent: context?.scheduleIntent
        });

        // Create/update chat session
        const chat = await createChatSession(allMessages, context, aiProvider, {
            actionMode,
            enableThinking
        });

        if (!chat) {
            throw new Error('Failed to create chat session');
        }

        // Build the message with current context
        const messageWithContext = buildAttachmentMessage(
            buildMessageWithContext(userMessage, context, { actionMode }),
            attachment
        );

        log('Sending chat message');
        const shouldStream = !actionMode && typeof onStream === 'function';
        const result = shouldStream
            ? await chat.sendMessageStream(messageWithContext, { onText: onStream, signal })
            : await chat.sendMessage(messageWithContext);
        const response = await result.response;
        let text = response.text().trim();

        log('Chat response:', text.substring(0, 200) + '...');

        if (!actionMode) {
            const conversationText = extractConversationText(text);
            return {
                actions: [{
                    type: 'info_response',
                    params: { message: conversationText },
                    explanation: 'Conversational response'
                }],
                summary: 'Answered the user directly.'
            };
        }

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
        // A user-initiated stop is not a provider failure and must never start
        // the buffered fallback request.
        if (error?.name === 'AbortError') throw error;
        console.error('❌ Error in chat message:', error);

        if (normalizeAIProvider(aiProvider) === 'local' && /LM Studio|local AI|empty final answer|timed out|not reachable/i.test(error.message)) {
            return {
                actions: [{
                    type: 'info_response',
                    params: { message: `Local Gemma is unavailable: ${error.message}` },
                    explanation: 'Local model connection error'
                }],
                summary: 'Local Gemma is unavailable.'
            };
        }

        // Fallback: try single-shot if chat fails
        log('Falling back to single-shot mode');
        return fallbackSingleShot(userMessage, allMessages, context, aiProvider);
    }
};

/**
 * Build message with current dynamic context (tasks, schedule, etc.)
 */
const buildMessageWithContext = (userMessage, context, { actionMode = true } = {}) => {
    if (!actionMode && !shouldIncludeAgentState(userMessage)) return userMessage;

    // The chat history is already sent as first-class assistant/user messages.
    // Do not repeat the same exchanges inside the current state prompt.
    return buildAgentStateMessage(userMessage, {
        ...context,
        conversationHistory: null
    }, { actionMode });
};

/**
 * Fallback to single-shot generation if chat session fails
 */
const fallbackSingleShot = async (userMessage, allMessages, context, aiProvider = undefined) => {
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
        }, aiProvider);
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
    resetSummaryCache();
    log('Chat session cleared');
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
