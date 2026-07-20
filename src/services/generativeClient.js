import { DEFAULT_GEMINI_MODEL } from './aiProvider.js';

const DEFAULT_MODEL = DEFAULT_GEMINI_MODEL;

const readTextResponse = async (response) => {
    if (!response.ok) {
        let message = `AI request failed (${response.status})`;
        try {
            const data = await response.json();
            message = data?.error || message;
        } catch {
            // Keep the generic message if the response is not JSON.
        }
        throw new Error(message);
    }

    const data = await response.json();
    return data.text || '';
};

const postAI = async (path, body) => {
    let response;

    try {
        response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch {
        throw new Error('AI proxy is not reachable. Make sure the Vite dev server is running, then retry.');
    }

    return readTextResponse(response);
};

const postAIStream = async (path, body, { onText, signal } = {}) => {
    let response;

    try {
        response = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal
        });
    } catch (error) {
        if (error?.name === 'AbortError') throw error;
        throw new Error('AI proxy is not reachable. Make sure the app server is running, then retry.');
    }

    if (!response.ok) return readTextResponse(response);
    if (!response.body) throw new Error('AI proxy returned no streaming response body.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    try {
        while (true) {
            const { value, done } = await reader.read();
            buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
            const lines = buffer.split(/\r?\n/);
            buffer = done ? '' : lines.pop() || '';

            for (const line of lines) {
                if (!line.trim()) continue;
                const event = JSON.parse(line);
                if (event.type === 'error') throw new Error(event.error || 'AI streaming request failed.');
                if (event.type !== 'delta' || !event.text) continue;
                fullText += event.text;
                onText?.(fullText, event.text);
            }

            if (done) break;
        }
    } finally {
        reader.releaseLock();
    }

    return fullText;
};

export const getAIHealth = async (provider, { timeoutMs = 5_000 } = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(`/api/ai/health?provider=${encodeURIComponent(provider || '')}`, {
            signal: controller.signal
        });
        if (!response.ok) throw new Error(`AI health check failed (${response.status})`);
        return await response.json();
    } catch (error) {
        return {
            status: 'offline',
            reachable: false,
            model: null,
            message: error?.name === 'AbortError'
                ? 'The local AI health check timed out.'
                : error.message || 'The local AI proxy is not reachable.'
        };
    } finally {
        clearTimeout(timer);
    }
};

const resolveRequestModel = (provider, model) => model ?? (provider === null || provider === 'gemini' ? DEFAULT_MODEL : undefined);

export const createGenerativeModel = ({
    model = undefined,
    provider = null,
    fallbackToGemini = undefined,
    systemInstruction = null,
    responseFormat = undefined,
    enableThinking = undefined
} = {}) => ({
    generateContent: async (contents, options = {}) => {
        const text = await postAI('/api/ai/generate', {
            provider,
            fallbackToGemini,
            model: resolveRequestModel(provider, model),
            systemInstruction,
            responseFormat,
            enableThinking,
            contents,
            generationConfig: options.generationConfig || options
        });

        return {
            response: {
                text: () => text
            }
        };
    },

    startChat: ({ history = [], generationConfig = {} } = {}) => ({
        sendMessage: async (message) => {
            const text = await postAI('/api/ai/chat', {
                provider,
                fallbackToGemini,
                model: resolveRequestModel(provider, model),
                systemInstruction,
                responseFormat,
                enableThinking,
                history,
                message,
                generationConfig
            });

            return {
                response: {
                    text: () => text
                }
            };
        },

        sendMessageStream: async (message, { onText, signal } = {}) => {
            const text = await postAIStream('/api/ai/stream', {
                provider,
                fallbackToGemini,
                model: resolveRequestModel(provider, model),
                systemInstruction,
                responseFormat,
                enableThinking,
                history,
                message,
                generationConfig
            }, { onText, signal });

            return {
                response: {
                    text: () => text
                }
            };
        }
    })
});

export const hasAIBackend = true;

export default {
    createGenerativeModel,
    getAIHealth,
    hasAIBackend
};
