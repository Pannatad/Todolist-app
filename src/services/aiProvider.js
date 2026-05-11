export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
export const DEFAULT_QWEN_MODEL = 'qwen/qwen3.6-35b-a3b';
export const DEFAULT_AI_PROVIDER = 'gemini';

export const AI_PROVIDER_OPTIONS = [
    {
        id: 'gemini',
        label: 'Gemini',
        proxyProvider: 'gemini',
        model: DEFAULT_GEMINI_MODEL,
        description: 'Google Gemini cloud model'
    },
    {
        id: 'qwen',
        label: 'Qwen Local',
        proxyProvider: 'lmstudio',
        model: DEFAULT_QWEN_MODEL,
        description: 'Local Qwen through LM Studio'
    }
];

const OPTION_BY_ID = Object.fromEntries(AI_PROVIDER_OPTIONS.map(option => [option.id, option]));

export const normalizeAIProvider = (provider) => {
    const normalized = String(provider || '').toLowerCase();
    return OPTION_BY_ID[normalized] ? normalized : DEFAULT_AI_PROVIDER;
};

export const getAIProviderOption = (provider) => OPTION_BY_ID[normalizeAIProvider(provider)];

export const getAIProviderLabel = (provider) => getAIProviderOption(provider).label;

export const getAIProviderRequestOptions = (provider) => {
    const option = getAIProviderOption(provider);
    const requestOptions = {
        provider: option.proxyProvider,
        model: option.model
    };

    if (option.id === 'qwen') {
        requestOptions.fallbackToGemini = false;
    }

    return requestOptions;
};
