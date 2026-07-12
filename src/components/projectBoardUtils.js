import { Briefcase, Folder, GraduationCap, Rocket, Trophy } from 'lucide-react';

const CATEGORIES = ['Work Projects', 'Personal Growth', 'Side Hustles', 'Learning', 'General'];

const CATEGORY_ICONS = {
    'Work Projects': Briefcase,
    'Personal Growth': Trophy,
    'Side Hustles': Rocket,
    Learning: GraduationCap,
    General: Folder
};

const EMPTY_MANUAL_PROJECT = {
    title: '',
    category: 'General',
    vision: '',
    notes: '',
    deadline: ''
};

const DEFAULT_COLUMNS = [
    { id: 'c-1', title: 'Work tree 1' }
];

const DEFAULT_PHASES = [
    { id: 'phase-1', name: 'Stage 1', color: 'indigo', order: 0, deadline: null }
];

const getDoneColumnId = (project) => (
    project.columns?.find((column) => column.id === 'c-4' || column.title?.toLowerCase() === 'done')?.id
);

const isTaskDone = (task, project) => {
    const doneColumnId = getDoneColumnId(project);
    return task.completed === true || (doneColumnId && task.columnId === doneColumnId);
};

const getSortedPhases = (project) => (
    [...(project.phases || [])].sort((left, right) => (left.order ?? 0) - (right.order ?? 0))
);

const getProjectStats = (project) => {
    const tasks = project.tasks || [];
    const completed = tasks.filter((task) => isTaskDone(task, project)).length;
    const total = tasks.length;
    const remaining = Math.max(total - completed, 0);
    const progress = total > 0 ? Math.round((completed / total) * 100) : project.progress || 0;

    return { total, completed, remaining, progress };
};

const getProjectDeadline = (project) => {
    if (project.deadline) return project.deadline;

    const phaseDeadlines = getSortedPhases(project)
        .map((phase) => phase.deadline)
        .filter(Boolean);

    return phaseDeadlines.at(-1) || null;
};

const getTasksForPhase = (project, phaseId) => (
    (project.tasks || []).filter((task) => task.phaseId === phaseId)
);

const getPhaseStats = (project, phase) => {
    const tasks = getTasksForPhase(project, phase.id);
    const completed = tasks.filter((task) => isTaskDone(task, project)).length;
    const progress = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

    return {
        tasks,
        completed,
        remaining: Math.max(tasks.length - completed, 0),
        progress
    };
};

const getDaysUntil = (dateString) => {
    if (!dateString) return null;
    const target = new Date(dateString);
    if (Number.isNaN(target.getTime())) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    target.setHours(0, 0, 0, 0);

    return Math.ceil((target - today) / 86400000);
};

const formatDeadlineStatus = (dateString) => {
    const days = getDaysUntil(dateString);
    if (days === null) return 'No deadline';
    if (days < 0) return `${Math.abs(days)}d overdue`;
    if (days === 0) return 'Due today';
    if (days === 1) return 'Due tomorrow';
    return `${days}d left`;
};

const getCategoryIcon = (category) => {
    return CATEGORY_ICONS[category] || Folder;
};

const buildProjectPayload = (formData) => {
    const phases = DEFAULT_PHASES.map((phase, index, allPhases) => ({
        ...phase,
        deadline: formData.deadline && index === allPhases.length - 1 ? formData.deadline : phase.deadline
    }));

    return {
        title: formData.title.trim(),
        description: formData.vision.trim(),
        vision: formData.vision.trim(),
        notes: formData.notes.trim(),
        deadline: formData.deadline || null,
        category: formData.category,
        status: 'active',
        progress: 0,
        isAIGenerated: false,
        phases,
        columns: DEFAULT_COLUMNS,
        tasks: []
    };
};

export {
    CATEGORIES,
    EMPTY_MANUAL_PROJECT,
    buildProjectPayload,
    getSortedPhases,
    getProjectStats,
    getProjectDeadline,
    getPhaseStats,
    getCategoryIcon,
    formatDeadlineStatus,
    isTaskDone,
};

