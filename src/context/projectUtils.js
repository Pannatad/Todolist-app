const DEFAULT_COLUMNS = [
    { id: 'c-1', title: 'Work tree 1' }
];

// Default phases for new projects
const DEFAULT_PHASES = [
    { id: 'phase-1', name: 'Stage 1', color: 'purple', order: 0, deadline: null, columns: DEFAULT_COLUMNS },
];

const cloneColumns = (columns = DEFAULT_COLUMNS) => (
    (Array.isArray(columns) && columns.length > 0 ? columns : DEFAULT_COLUMNS).map((column, index) => ({
        id: column.id || `c-${index + 1}`,
        title: column.title || `Work tree ${index + 1}`
    }))
);

const getColumnSignature = (columns = []) => (
    cloneColumns(columns).map((column) => `${column.id}:${column.title}`).join('|')
);

const getColumnsUsedInPhase = (tasks = [], phaseId, fallbackColumns = DEFAULT_COLUMNS, includeUnassignedTasks = false) => {
    const usedColumnIds = new Set(
        tasks
            .filter((task) => (task.phaseId || (includeUnassignedTasks ? phaseId : null)) === phaseId && task.columnId)
            .map((task) => task.columnId)
    );

    const usedColumns = cloneColumns(fallbackColumns).filter((column) => usedColumnIds.has(column.id));
    return usedColumns.length > 0 ? usedColumns : cloneColumns(DEFAULT_COLUMNS);
};

const normalizePhases = (phases, fallbackColumns = DEFAULT_COLUMNS, tasks = [], options = {}) => (
    (Array.isArray(phases) && phases.length > 0 ? phases : DEFAULT_PHASES).map((phase, index) => ({
        ...phase,
        id: phase.id || `phase-${index + 1}`,
        name: phase.name || `Stage ${index + 1}`,
        order: phase.order ?? index,
        columns: !options.ignorePhaseColumns && Array.isArray(phase.columns) && phase.columns.length > 0
            ? cloneColumns(phase.columns)
            : getColumnsUsedInPhase(tasks, phase.id || `phase-${index + 1}`, fallbackColumns, index === 0)
    }))
);

const getPhaseColumns = (project, phaseId) => {
    const phase = project?.phases?.find((item) => item.id === phaseId);
    return cloneColumns(phase?.columns || project?.columns || DEFAULT_COLUMNS);
};

const getDoneColumn = (project, phaseId = null) => (
    getPhaseColumns(project, phaseId).find((column) => column.id === 'c-4' || column.title?.toLowerCase() === 'done')
);

const calculateProgress = (tasks = [], project) => {
    if (tasks.length === 0) return 0;

    const doneColumnByPhase = new Map();
    const doneTasks = tasks.filter((task) => {
        if (task.completed === true) return true;

        if (!doneColumnByPhase.has(task.phaseId)) {
            doneColumnByPhase.set(task.phaseId, getDoneColumn(project, task.phaseId));
        }

        return doneColumnByPhase.get(task.phaseId)?.id === task.columnId;
    });

    return Math.round((doneTasks.length / tasks.length) * 100);
};

const getDefaultLocalProjects = () => ([
    {
        id: 'sample-1',
        title: 'Website Redesign',
        description: 'Overhaul the company website with new branding.',
        vision: 'Launch a clearer, faster company website that makes the new brand feel trustworthy and easy to understand.',
        notes: 'Keep homepage copy focused on the main offer. Confirm brand assets before final implementation.',
        deadline: null,
        status: 'active',
        progress: 35,
        isPinned: false,
        phases: DEFAULT_PHASES,
        columns: DEFAULT_COLUMNS,
        tasks: [
            { id: 't1', title: 'Design Mockups', description: 'Create Figma designs', priority: 'High', columnId: 'c-1', phaseId: 'phase-1' },
            { id: 't2', title: 'Setup Repo', description: 'Initialize Git repository', priority: 'Medium', columnId: 'c-1', phaseId: 'phase-1' },
            { id: 't3', title: 'Write Content', description: 'Draft copy for homepage', priority: 'Low', columnId: 'c-1', phaseId: 'phase-1' }
        ]
    }
]);

const stripSubtaskDifficulty = (subtask = {}) => {
    const { difficulty: _legacyDifficulty, ...subtaskWithoutDifficulty } = subtask;
    return {
        ...subtaskWithoutDifficulty,
        ...(Array.isArray(subtask.subtasks)
            ? { subtasks: subtask.subtasks.map(stripSubtaskDifficulty) }
            : {})
    };
};

const normalizeProjectTask = (task = {}) => {
    const { difficulty: _legacyDifficulty, ...taskWithoutDifficulty } = task;
    return {
        ...taskWithoutDifficulty,
        ...(Array.isArray(task.subtasks)
            ? { subtasks: task.subtasks.map(stripSubtaskDifficulty) }
            : {})
    };
};

const normalizeProjectRecord = (project) => {
    const projectColumns = cloneColumns(project?.columns);
    const rawPhases = Array.isArray(project?.phases) && project.phases.length > 0 ? project.phases : DEFAULT_PHASES;
    const tasks = Array.isArray(project?.tasks) ? project.tasks : [];
    const projectColumnSignature = getColumnSignature(projectColumns);
    const hasLegacySharedPhaseColumns = rawPhases.length > 1 && rawPhases.every((phase) => (
        Array.isArray(phase.columns)
        && phase.columns.length > 1
        && getColumnSignature(phase.columns) === projectColumnSignature
    ));
    const phases = normalizePhases(rawPhases, projectColumns, tasks, {
        ignorePhaseColumns: hasLegacySharedPhaseColumns
    });

    return {
        ...project,
        isPinned: project?.isPinned === true || project?.is_pinned === true,
        isAIGenerated: project?.isAIGenerated === true || project?.is_ai_generated === true,
        category: project?.category || 'General',
        vision: project?.vision || project?.description || '',
        notes: project?.notes || '',
        deadline: project?.deadline || null,
        phases,
        columns: projectColumns,
        tasks: tasks.length > 0
            ? tasks.map((task) => {
                const phaseId = task.phaseId || phases[0].id;
                const phaseColumns = getPhaseColumns({ ...project, phases, columns: projectColumns }, phaseId);

                const taskWithoutDifficulty = normalizeProjectTask(task);
                return {
                    ...taskWithoutDifficulty,
                    id: task.id || crypto.randomUUID(),
                    phaseId,
                    columnId: task.columnId || phaseColumns[0]?.id || DEFAULT_COLUMNS[0].id
                };
            })
            : []
    };
};

const readLocalProjects = () => {
    try {
        const saved = localStorage.getItem('demon-projects');
        if (!saved) {
            return getDefaultLocalProjects();
        }

        return JSON.parse(saved).map(normalizeProjectRecord);
    } catch (error) {
        console.error('Failed to load projects', error);
        return getDefaultLocalProjects();
    }
};


export {
    calculateProgress,
    cloneColumns,
    DEFAULT_COLUMNS,
    DEFAULT_PHASES,
    getDefaultLocalProjects,
    getDoneColumn,
    getPhaseColumns,
    normalizePhases,
    normalizeProjectTask,
    normalizeProjectRecord,
    readLocalProjects,
};
