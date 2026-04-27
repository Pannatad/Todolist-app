const DEFAULT_MODEL = 'gemini-3.1-flash-lite-preview';

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
    const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    return readTextResponse(response);
};

export const createGenerativeModel = ({ model = DEFAULT_MODEL, systemInstruction = null } = {}) => ({
    generateContent: async (contents, options = {}) => {
        const text = await postAI('/api/ai/generate', {
            model,
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
                model,
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
