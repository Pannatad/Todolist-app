/**
 * InsightExtractionService - Automatically extracts insights from conversations
 * Identifies personal facts, preferences, and patterns shared by the user
 */

import { createGenerativeModel } from './generativeClient';

const MODEL_NAME = import.meta.env.VITE_AI_MODEL || 'gemini-3.1-flash-lite-preview';
const API_BACKEND_AVAILABLE = true;
const genAI = {
    getGenerativeModel: createGenerativeModel
};

/**
 * Extract insights from a conversation exchange
 * @param {string} userMessage - The user's message
 * @param {string} assistantResponse - The agent's response
 * @param {Array} existingIntelligence - Already known facts (to avoid duplicates)
 * @returns {Promise<Array>} - Array of extracted insights
 */
export const extractInsightsFromExchange = async (userMessage, assistantResponse, existingIntelligence = []) => {
    if (!API_BACKEND_AVAILABLE) {
        console.warn('⚠️ No API key for insight extraction');
        return [];
    }

    // Skip very short messages (likely not informative)
    if (userMessage.length < 20) {
        return [];
    }

    // Skip pure command messages
    const commandPatterns = [
        /^(add|create|delete|remove|edit|update|show|list|what|when|how)\s/i,
        /^(yes|no|ok|okay|sure|thanks|thank you)$/i
    ];
    if (commandPatterns.some(p => p.test(userMessage.trim()))) {
        return [];
    }

    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // Build context of what we already know
        const knownFacts = existingIntelligence.map(i => i.content).join('; ');

        const prompt = `Analyze this user message for any personal information, preferences, or patterns that could help personalize future interactions.

USER MESSAGE: "${userMessage}"

${knownFacts ? `ALREADY KNOWN: ${knownFacts}` : ''}

Extract ONLY new, useful insights. Skip anything:
- Already known from the "ALREADY KNOWN" list
- Too vague or generic
- Just task/command information
- Temporary or time-specific (like "I'm busy today")

For each insight found, categorize as:
- "fact": Personal information (occupation, hobbies, family, location, etc.)
- "preference": Likes, dislikes, preferences (time preferences, communication style, etc.)
- "pattern": Behavioral patterns (usually busy on X, tends to Y, etc.)

Reply with a JSON array (empty array [] if no new insights):
[
    {
        "content": "concise insight statement",
        "category": "fact|preference|pattern",
        "confidence": 0.0-1.0
    }
]

IMPORTANT: Only extract genuinely useful, lasting insights. Quality over quantity.
Reply ONLY with the JSON array, no markdown or explanation.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        // Clean up markdown if present
        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const insights = JSON.parse(text);

        // Validate and filter insights
        return insights.filter(insight =>
            insight.content &&
            insight.content.length > 10 &&
            insight.content.length < 200 &&
            ['fact', 'preference', 'pattern'].includes(insight.category) &&
            typeof insight.confidence === 'number'
        ).map(insight => ({
            ...insight,
            source: 'inferred',
            confidence: Math.min(Math.max(insight.confidence, 0), 1)
        }));

    } catch (error) {
        console.error('Error extracting insights:', error);
        return [];
    }
};

/**
 * Batch extract insights from multiple messages (for older conversation analysis)
 * @param {Array} messages - Array of { role, content } messages
 * @param {Array} existingIntelligence - Already known facts
 * @returns {Promise<Array>} - Array of extracted insights
 */
export const extractInsightsFromConversation = async (messages, existingIntelligence = []) => {
    if (!API_BACKEND_AVAILABLE || messages.length === 0) {
        return [];
    }

    // Filter to only user messages with substantial content
    const userMessages = messages
        .filter(m => m.role === 'user' && m.content.length > 30)
        .slice(-10); // Look at last 10 substantial user messages

    if (userMessages.length === 0) {
        return [];
    }

    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        const conversationText = userMessages.map(m => `User: ${m.content}`).join('\n');
        const knownFacts = existingIntelligence.map(i => i.content).join('; ');

        const prompt = `Analyze these user messages for personal information, preferences, or behavioral patterns.

CONVERSATION:
${conversationText}

${knownFacts ? `ALREADY KNOWN: ${knownFacts}` : ''}

Extract ONLY new, lasting insights useful for personalization. Skip temporary or task-specific info.

Categories:
- "fact": Personal info (occupation, location, hobbies, family, etc.)
- "preference": Likes, dislikes, communication preferences
- "pattern": Behavioral patterns, habits, routines

Reply with JSON array ([] if no new insights):
[{"content": "insight", "category": "fact|preference|pattern", "confidence": 0.0-1.0}]

Reply ONLY with JSON, no markdown.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text().trim();

        if (text.startsWith('```')) {
            text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        }

        const insights = JSON.parse(text);

        return insights.filter(insight =>
            insight.content &&
            insight.content.length > 10 &&
            insight.content.length < 200 &&
            ['fact', 'preference', 'pattern'].includes(insight.category)
        ).map(insight => ({
            ...insight,
            source: 'inferred',
            confidence: Math.min(Math.max(insight.confidence || 0.7, 0), 1)
        }));

    } catch (error) {
        console.error('Error extracting conversation insights:', error);
        return [];
    }
};

export default {
    extractInsightsFromExchange,
    extractInsightsFromConversation
};
