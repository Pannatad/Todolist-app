let geminiModulePromise = null;

const loadGeminiModule = async () => {
    if (!geminiModulePromise) {
        geminiModulePromise = import('./gemini.js');
    }

    return geminiModulePromise;
};

export const parseTaskInput = async (...args) => {
    const module = await loadGeminiModule();
    return module.parseTaskInput(...args);
};

export const parseTaskImage = async (...args) => {
    const module = await loadGeminiModule();
    return module.parseTaskImage(...args);
};

export const parseScheduleImage = async (...args) => {
    const module = await loadGeminiModule();
    return module.parseScheduleImage(...args);
};

export const parseScheduleCommand = async (...args) => {
    const module = await loadGeminiModule();
    return module.parseScheduleCommand(...args);
};

export const routeAgentCommand = async (...args) => {
    const module = await loadGeminiModule();
    return module.routeAgentCommand(...args);
};

export const generateTopicsFromDescription = async (...args) => {
    const module = await loadGeminiModule();
    return module.generateTopicsFromDescription(...args);
};

export const generateTopicsFromImage = async (...args) => {
    const module = await loadGeminiModule();
    return module.generateTopicsFromImage(...args);
};

export const generateDailySchedule = async (...args) => {
    const module = await loadGeminiModule();
    return module.generateDailySchedule(...args);
};

export const getSmartSuggestions = async (...args) => {
    const module = await loadGeminiModule();
    return module.getSmartSuggestions(...args);
};

export const getPersonalizedAdvice = async (...args) => {
    const module = await loadGeminiModule();

    if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
        const task = args[0];
        return module.getPersonalizedAdvice(
            task.title || '',
            task.subject || '',
            task.instructions || task.description || '',
            task.file || null
        );
    }

    return module.getPersonalizedAdvice(...args);
};
