const COMPLETED_STATUSES = new Set(['completed', 'done', 'harvested']);

export const getTaskCompletionTimestamp = (task) => (
    task?.completedAt || task?.completed_at || null
);

export const isTaskCompleted = (task) => {
    if (!task) return false;

    return Boolean(
        task.completed === true ||
        COMPLETED_STATUSES.has(task.status) ||
        getTaskCompletionTimestamp(task)
    );
};

export const isTaskArchived = (task) => task?.archived === true;

export const isTaskActive = (task) => (
    Boolean(task) && !isTaskArchived(task) && !isTaskCompleted(task)
);

export const normalizeTaskSubtasks = (subtasks) => {
    if (!Array.isArray(subtasks)) return [];

    return subtasks
        .filter(subtask => subtask && typeof subtask === 'object')
        .map((subtask, index) => {
            const estimate = Number(subtask.estimatedTime ?? subtask.estimated_time ?? 0);
            const nestedSubtasks = normalizeTaskSubtasks(subtask.subtasks);
            const nestedEstimate = nestedSubtasks.reduce((total, nestedSubtask) => total + nestedSubtask.estimatedTime, 0);

            return {
                id: subtask.id || `${Date.now()}-${index}`,
                title: String(subtask.title || '').trim(),
                completed: subtask.completed === true,
                estimatedTime: nestedSubtasks.length > 0
                    ? nestedEstimate
                    : Number.isFinite(estimate) && estimate > 0 ? estimate : 0,
                subtasks: nestedSubtasks,
            };
        })
        .filter(subtask => subtask.title);
};

export const getTaskChunkEstimate = (task) => (
    normalizeTaskSubtasks(task?.subtasks).reduce((total, subtask) => total + subtask.estimatedTime, 0)
);

export const sanitizeTaskUpdates = (updates = {}) => {
    const { difficulty: _legacyDifficulty, ...safeUpdates } = updates;
    return safeUpdates;
};

export const calculateCompletionReward = (task, completedAt = new Date()) => {
    let reward = 10;
    if (!task?.deadline) return reward;
    return completedAt <= new Date(task.deadline) ? reward + 10 : Math.max(0, reward - 5);
};

export const normalizeTaskRecord = (task) => {
    if (!task) return task;

    const completedAt = getTaskCompletionTimestamp(task);
    const completed = isTaskCompleted(task);
    const normalizedEstimatedTime = task.estimatedTime ?? task.estimated_time ?? null;
    const normalizedSubtasks = normalizeTaskSubtasks(task.subtasks);

    let normalizedStatus = task.status;
    if (completed) {
        normalizedStatus = 'harvested';
    } else if (task.status === 'seed') {
        normalizedStatus = 'seed';
    } else {
        normalizedStatus = 'growing';
    }

    const { difficulty: _legacyDifficulty, ...taskWithoutDifficulty } = task;

    return {
        ...taskWithoutDifficulty,
        status: normalizedStatus,
        completed,
        completedAt: completed ? completedAt : null,
        completed_at: completed ? completedAt : null,
        estimatedTime: normalizedEstimatedTime,
        estimated_time: normalizedEstimatedTime,
        subtasks: normalizedSubtasks,
        archived: task.archived === true,
    };
};
