export const sanitizeParsedTask = (task, fallbackTitle = '') => {
    const title = String(task?.title || fallbackTitle).trim();
    const deadlineValue = task?.deadline ? new Date(task.deadline) : null;
    const estimate = Number(task?.estimatedTime);
    return {
        title,
        deadline: deadlineValue && !Number.isNaN(deadlineValue.getTime()) ? task.deadline : null,
        subject: typeof task?.subject === 'string' && task.subject.trim() ? task.subject.trim() : null,
        estimatedTime: Number.isFinite(estimate) && estimate > 0 ? Math.round(estimate) : null,
    };
};

export const sanitizeParsedTasks = (value) => (
    Array.isArray(value) ? value.map((task) => sanitizeParsedTask(task)).filter((task) => task.title) : []
);

export const sanitizeActivitySuggestions = (value) => {
    if (!Array.isArray(value)) return [];
    return value.map((suggestion) => ({
        activity: String(suggestion?.activity || '').trim(),
        duration: Number.isFinite(Number(suggestion?.duration)) && Number(suggestion.duration) > 0 ? Math.round(Number(suggestion.duration)) : 0,
        category: typeof suggestion?.category === 'string' && suggestion.category.trim() ? suggestion.category.trim() : 'Other',
    })).filter((suggestion) => suggestion.activity);
};
