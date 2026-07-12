const priorityOrder = { High: 3, Medium: 2, Low: 1 };
const difficultyOrder = { Hard: 3, Medium: 2, Easy: 1 };

const DEFAULT_COLUMNS = [
    { id: 'c-1', title: 'Work tree 1' }
];

const getPhaseColumns = (project, phaseId) => {
    const phase = project.phases?.find((item) => item.id === phaseId);
    const columns = phase?.columns || DEFAULT_COLUMNS;

    return Array.isArray(columns) && columns.length > 0 ? columns : DEFAULT_COLUMNS;
};

const getDoneColumn = (project, phaseId) => (
    getPhaseColumns(project, phaseId).find((column) => column.id === 'c-4' || column.title?.toLowerCase() === 'done')
);

const isTaskDone = (task, project) => {
    const doneColumn = getDoneColumn(project, task.phaseId);
    return task.completed === true || (doneColumn && task.columnId === doneColumn.id);
};

const getSortedPhases = (project) => (
    [...(project.phases || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
);

const getPhaseTasks = (project, phaseId) => (
    (project.tasks || []).filter((task) => task.phaseId === phaseId)
);

const getPhaseProgress = (project, phaseId) => {
    const tasks = getPhaseTasks(project, phaseId);
    if (tasks.length === 0) return 0;
    const completed = tasks.filter((task) => isTaskDone(task, project)).length;
    return Math.round((completed / tasks.length) * 100);
};

export {
    DEFAULT_COLUMNS,
    difficultyOrder,
    getDoneColumn,
    getPhaseColumns,
    getPhaseProgress,
    getPhaseTasks,
    getSortedPhases,
    isTaskDone,
    priorityOrder,
};

