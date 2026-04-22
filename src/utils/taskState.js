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

export const normalizeTaskRecord = (task) => {
    if (!task) return task;

    const completedAt = getTaskCompletionTimestamp(task);
    const completed = isTaskCompleted(task);
    const normalizedEstimatedTime = task.estimatedTime ?? task.estimated_time ?? null;

    let normalizedStatus = task.status;
    if (completed) {
        normalizedStatus = 'harvested';
    } else if (task.status === 'seed') {
        normalizedStatus = 'seed';
    } else {
        normalizedStatus = 'growing';
    }

    return {
        ...task,
        status: normalizedStatus,
        completed,
        completedAt: completed ? completedAt : null,
        completed_at: completed ? completedAt : null,
        estimatedTime: normalizedEstimatedTime,
        estimated_time: normalizedEstimatedTime,
        archived: task.archived === true,
    };
};
