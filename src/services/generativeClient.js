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

const resolveRequestModel = (provider, model) => model ?? (provider === null || provider === 'gemini' ? DEFAULT_MODEL : undefined);

export const createGenerativeModel = ({ model = undefined, provider = null, fallbackToGemini = undefined, systemInstruction = null } = {}) => ({
    generateContent: async (contents, options = {}) => {
        const text = await postAI('/api/ai/generate', {
            provider,
            fallbackToGemini,
            model: resolveRequestModel(provider, model),
            systemInstruction,
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
                history,
                message,
                generationConfig
            });

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
    hasAIBackend
};
