export const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
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
        id: 'local',
        label: 'Gemma Local',
        proxyProvider: 'lmstudio',
        model: null,
        description: 'Loaded local model through LM Studio'
    }
];

const OPTION_BY_ID = Object.fromEntries(AI_PROVIDER_OPTIONS.map(option => [option.id, option]));
const PROVIDER_ALIASES = {
    qwen: 'local',
    lmstudio: 'local'
};

export const normalizeAIProvider = (provider) => {
    const normalized = String(provider || '').toLowerCase();
    const aliased = PROVIDER_ALIASES[normalized] || normalized;
    return OPTION_BY_ID[aliased] ? aliased : DEFAULT_AI_PROVIDER;
};

export const getAIProviderOption = (provider) => OPTION_BY_ID[normalizeAIProvider(provider)];

export const getAIProviderLabel = (provider) => getAIProviderOption(provider).label;

export const getAIProviderRequestOptions = (provider) => {
    const option = getAIProviderOption(provider);
    const requestOptions = {
        provider: option.proxyProvider
    };

    if (option.model) {
        requestOptions.model = option.model;
    }

    if (option.proxyProvider === 'lmstudio') {
        requestOptions.fallbackToGemini = false;
    }

    return requestOptions;
};
