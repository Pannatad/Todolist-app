import React, { useMemo, useState, useEffect } from 'react';
import {
    ArrowUpRight,
    Briefcase,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    Edit3,
    Folder,
    GraduationCap,
    LayoutDashboard,
    Loader2,
    Map,
    MoreHorizontal,
    Pin,
    PinOff,
    Plus,
    Rocket,
    Sparkles,
    Trash2,
    Trophy,
    X
} from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useAIProjectArchitect } from '../hooks/useAIProjectArchitect';
import ProjectMindMap from './ProjectMindMap';
import ProjectDetailView from './ProjectDetailView';
import { ProjectCalendar } from './ProjectCalendar';

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

const ProjectBoards = () => {
    const { projects, addProject, updateProject, deleteProject } = useProject();
    const { generateProjectPlan, isGenerating } = useAIProjectArchitect();

    const [view, setView] = useState('list');
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedPhaseId, setSelectedPhaseId] = useState(null);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [showManualProjectModal, setShowManualProjectModal] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    const [prompt, setPrompt] = useState('');
    const [aiProjectCategory, setAiProjectCategory] = useState('General');
    const [manualProjectData, setManualProjectData] = useState(EMPTY_MANUAL_PROJECT);
    const [editProjectData, setEditProjectData] = useState(EMPTY_MANUAL_PROJECT);
    const [projectMenuOpen, setProjectMenuOpen] = useState(null);
    const [activePhaseByProject, setActivePhaseByProject] = useState({});

    const selectedProject = projects.find((project) => project.id === selectedProjectId);

    const orderedProjects = useMemo(() => (
        [...projects].sort((left, right) => {
            if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
            return new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0);
        })
    ), [projects]);

    const handleBackToList = () => {
        setView('list');
        setSelectedProjectId(null);
        setSelectedPhaseId(null);
    };

    const openProjectBoard = (projectId, phaseId = null) => {
        setSelectedProjectId(projectId);
        setSelectedPhaseId(phaseId);
        setView('board');
    };

    const openProjectMindMap = (projectId) => {
        setSelectedProjectId(projectId);
        setSelectedPhaseId(null);
        setView('mindmap');
    };

    const togglePhaseBranch = (event, projectId, phaseId) => {
        event.stopPropagation();
        setActivePhaseByProject((prev) => ({
            ...prev,
            [projectId]: prev[projectId] === phaseId ? '__closed' : phaseId
        }));
    };

    const handleCreateProject = async (event) => {
        event.preventDefault();
        if (!prompt.trim()) return;

        const newProject = await generateProjectPlan(prompt);
        const projectWithPlanning = {
            ...newProject,
            category: aiProjectCategory,
            vision: prompt.trim(),
            notes: newProject.notes || '',
            deadline: newProject.deadline || null
        };

        await addProject(projectWithPlanning);
        setShowNewProjectModal(false);
        setPrompt('');
        setAiProjectCategory('General');
    };

    const handleCreateManualProject = async (event) => {
        event.preventDefault();
        if (!manualProjectData.title.trim()) return;

        await addProject(buildProjectPayload(manualProjectData));
        setShowManualProjectModal(false);
        setManualProjectData(EMPTY_MANUAL_PROJECT);
    };

    const startEditingProject = (event, project) => {
        event.stopPropagation();
        setEditingProject(project);
        setEditProjectData({
            title: project.title || '',
            category: project.category || 'General',
            vision: project.vision || project.description || '',
            notes: project.notes || '',
            deadline: project.deadline || ''
        });
        setProjectMenuOpen(null);
    };

    const handleUpdateProjectPlan = async (event) => {
        event.preventDefault();
        if (!editingProject || !editProjectData.title.trim()) return;

        await updateProject(editingProject.id, {
            title: editProjectData.title.trim(),
            category: editProjectData.category,
            description: editProjectData.vision.trim(),
            vision: editProjectData.vision.trim(),
            notes: editProjectData.notes.trim(),
            deadline: editProjectData.deadline || null
        });

        setEditingProject(null);
        setEditProjectData(EMPTY_MANUAL_PROJECT);
    };

    const handleCompleteProject = (event, projectId) => {
        event.stopPropagation();
        const project = projects.find((item) => item.id === projectId);
        updateProject(projectId, { status: project?.status === 'completed' ? 'active' : 'completed' });
        setProjectMenuOpen(null);
    };

    const handleDeleteProject = (event, projectId) => {
        event.stopPropagation();
        if (window.confirm('Delete this project and its tasks?')) {
            deleteProject(projectId);
        }
        setProjectMenuOpen(null);
    };

    const handlePinProject = (event, projectId) => {
        event.stopPropagation();
        const project = projects.find((item) => item.id === projectId);
        updateProject(projectId, { isPinned: !project?.isPinned });
        setProjectMenuOpen(null);
    };

    const toggleProjectMenu = (event, projectId) => {
        event.stopPropagation();
        setProjectMenuOpen(projectMenuOpen === projectId ? null : projectId);
    };

    useEffect(() => {
        const handleClickOutside = () => setProjectMenuOpen(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    if (view === 'mindmap' && selectedProject) {
        return <ProjectMindMap project={selectedProject} onBack={handleBackToList} />;
    }

    if (view === 'board' && selectedProject) {
        return (
            <ProjectDetailView
                project={selectedProject}
                onBack={handleBackToList}
                selectedPhaseId={selectedPhaseId}
            />
        );
    }

    if (view === 'calendar') {
        return <ProjectCalendar onBack={handleBackToList} />;
    }

    return (
        <div className="ios-codex-projects h-full min-h-[720px] overflow-y-auto rounded-lg border border-slate-200 p-4 text-slate-900 shadow-sm dark:border-white/10 dark:text-bone-100 md:p-6">
            <header className="ios-codex-header mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <div className="app-eyebrow flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" />
                        Project map
                    </div>
                    <h2 className="app-page-title mt-2">
                        Main Page Projects
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-bone-200/70">
                        Projects split into stages, and stages open into the tasks that move them forward.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setView('calendar')}
                        className="ios-codex-button inline-flex items-center gap-2"
                    >
                        <Calendar className="h-4 w-4" />
                        Calendar
                    </button>
                    <button
                        onClick={() => setShowManualProjectModal(true)}
                        className="ios-codex-button inline-flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Manual
                    </button>
                    <button
                        onClick={() => setShowNewProjectModal(true)}
                        className="ios-codex-button ios-codex-button-primary inline-flex items-center gap-2"
                    >
                        <Sparkles className="h-4 w-4" />
                        AI Project
                    </button>
                </div>
            </header>

            <section className="ios-codex-map mb-5 py-5">
                <div className="mx-auto max-w-xl text-center">
                    <div className="ios-codex-root-pill inline-flex items-center gap-2 px-3 py-2 text-sm font-bold">
                        <Folder className="h-4 w-4 text-sage-600 dark:text-sage-400" />
                        Main Page Projects
                    </div>
                    <div className="mx-auto mt-4 hidden h-12 w-px bg-slate-300 dark:bg-white/20 md:block" />
                </div>

                {orderedProjects.length > 0 ? (
                    <div className="relative mt-4">
                        <div className="absolute left-[10%] right-[10%] top-0 hidden h-px bg-slate-300 dark:bg-white/20 md:block" />
                        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                            {orderedProjects.map((project, index) => {
                                const firstPhaseId = getSortedPhases(project)[0]?.id || null;
                                const storedPhaseId = activePhaseByProject[project.id];
                                const activePhaseId = storedPhaseId === '__closed'
                                    ? null
                                    : storedPhaseId || (index === 0 ? firstPhaseId : null);

                                return (
                                    <ProjectTreeCard
                                        key={project.id}
                                        project={project}
                                        activePhaseId={activePhaseId}
                                        isMenuOpen={projectMenuOpen === project.id}
                                        onTogglePhase={togglePhaseBranch}
                                        onOpenBoard={openProjectBoard}
                                        onOpenMindMap={openProjectMindMap}
                                        onToggleMenu={toggleProjectMenu}
                                        onEditProject={startEditingProject}
                                        onCompleteProject={handleCompleteProject}
                                        onPinProject={handlePinProject}
                                        onDeleteProject={handleDeleteProject}
                                    />
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <EmptyProjectMap
                        onCreateManual={() => setShowManualProjectModal(true)}
                        onCreateAI={() => setShowNewProjectModal(true)}
                    />
                )}
            </section>

            {showNewProjectModal && (
                <AIProjectModal
                    prompt={prompt}
                    setPrompt={setPrompt}
                    category={aiProjectCategory}
                    setCategory={setAiProjectCategory}
                    onClose={() => setShowNewProjectModal(false)}
                    onSubmit={handleCreateProject}
                    isGenerating={isGenerating}
                />
            )}

            {showManualProjectModal && (
                <ProjectPlanModal
                    title="Create Project"
                    submitLabel="Create Project"
                    data={manualProjectData}
                    setData={setManualProjectData}
                    onSubmit={handleCreateManualProject}
                    onClose={() => setShowManualProjectModal(false)}
                />
            )}

            {editingProject && (
                <ProjectPlanModal
                    title="Edit Project Plan"
                    submitLabel="Save Changes"
                    data={editProjectData}
                    setData={setEditProjectData}
                    onSubmit={handleUpdateProjectPlan}
                    onClose={() => setEditingProject(null)}
                />
            )}
        </div>
    );
};

const ProjectTreeCard = ({
    project,
    activePhaseId,
    isMenuOpen,
    onOpenBoard,
    onOpenMindMap,
    onTogglePhase,
    onToggleMenu,
    onEditProject,
    onCompleteProject,
    onPinProject,
    onDeleteProject
}) => {
    const stats = getProjectStats(project);
    const phases = getSortedPhases(project);
    const CategoryIcon = getCategoryIcon(project.category);
    const deadline = getProjectDeadline(project);

    return (
        <article className="relative pt-8 md:pt-12">
            <div className="absolute left-1/2 top-0 hidden h-12 w-px bg-slate-300 dark:bg-white/20 md:block" />
            <div className="ios-codex-card p-4 transition-colors">
                <div className="flex items-start justify-between gap-3">
                    <button
                        onClick={() => onOpenBoard(project.id)}
                        className="flex min-w-0 flex-1 items-start gap-3 rounded-lg text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
                    >
                        <span className="rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-white/10 dark:text-bone-100">
                            {React.createElement(CategoryIcon, { className: 'h-5 w-5' })}
                        </span>
                        <span className="min-w-0">
                            <span className="flex min-w-0 items-center gap-2">
                                <span className="truncate text-lg font-bold text-slate-950 dark:text-bone-100">{project.title}</span>
                                {project.isPinned && <Pin className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500" />}
                                {project.isAIGenerated !== false && <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />}
                            </span>
                            <span className="mt-1 block truncate text-xs font-semibold text-slate-500 dark:text-bone-200/60">
                                {project.category || 'General'} / {stats.remaining} open / {formatDeadlineStatus(deadline)}
                            </span>
                        </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            onClick={(event) => onEditProject(event, project)}
                            className="ios-codex-icon-button rounded-lg p-2"
                            title="Edit project plan"
                        >
                            <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={(event) => onToggleMenu(event, project.id)}
                            className="ios-codex-icon-button rounded-lg p-2"
                            title="Project actions"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="mt-5">
                    <div className="relative space-y-3 pl-5">
                        <div className="absolute bottom-4 left-2 top-2 w-px bg-slate-200 dark:bg-white/10" />
                        {phases.map((phase, index) => {
                            const phaseStats = getPhaseStats(project, phase);
                            const isOpen = activePhaseId === phase.id;

                            return (
                                <div key={phase.id} className="relative">
                                    <span className="absolute -left-5 top-4 h-px w-5 bg-slate-200 dark:bg-white/10" />
                                    <button
                                        onClick={(event) => onTogglePhase(event, project.id, phase.id)}
                                        className="ios-codex-tree-row flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-xs font-bold text-slate-600 shadow-sm dark:bg-white/10 dark:text-bone-100">
                                                {index + 1}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block truncate text-sm font-bold text-slate-900 dark:text-bone-100">{phase.name}</span>
                                                <span className="block truncate text-xs text-slate-500 dark:text-bone-200/60">
                                                    {phaseStats.completed}/{phaseStats.tasks.length} tasks / {formatDeadlineStatus(phase.deadline)}
                                                </span>
                                            </span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-500 dark:text-bone-200/60">
                                            {phaseStats.progress}%
                                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </span>
                                    </button>

                                    {isOpen && (
                                        <StageTaskBranch
                                            project={project}
                                            phase={phase}
                                            tasks={phaseStats.tasks}
                                            onOpenBoard={onOpenBoard}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                    <button
                        onClick={() => onOpenBoard(project.id)}
                        className="ios-codex-button ios-codex-button-primary inline-flex flex-1 items-center justify-center gap-2"
                    >
                        <ArrowUpRight className="h-4 w-4" />
                        Board
                    </button>
                    <button
                        onClick={() => onOpenMindMap(project.id)}
                        className="ios-codex-button inline-flex items-center justify-center p-2"
                        title="Open mind map"
                    >
                        <Map className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {isMenuOpen && (
                <div className="absolute right-4 top-14 z-20 min-w-48 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-void-900">
                    <button
                        onClick={(event) => onCompleteProject(event, project.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-bone-100 dark:hover:bg-white/10"
                    >
                        <Check className="h-4 w-4 text-emerald-500" />
                        {project.status === 'completed' ? 'Mark Active' : 'Mark Complete'}
                    </button>
                    <button
                        onClick={(event) => onPinProject(event, project.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-bone-100 dark:hover:bg-white/10"
                    >
                        {project.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                        {project.isPinned ? 'Unpin' : 'Pin'}
                    </button>
                    <button
                        onClick={(event) => onDeleteProject(event, project.id)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-500/10"
                    >
                        <Trash2 className="h-4 w-4" />
                        Delete
                    </button>
                </div>
            )}
        </article>
    );
};

const StageTaskBranch = ({ project, phase, tasks, onOpenBoard }) => {
    const sortedTasks = [...tasks].sort((left, right) => {
        if (isTaskDone(left, project) !== isTaskDone(right, project)) return isTaskDone(left, project) ? 1 : -1;
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        return (priorityOrder[right.priority] || 0) - (priorityOrder[left.priority] || 0);
    });

    return (
        <div className="ml-8 mt-2 space-y-2 border-l border-slate-200 pl-4 dark:border-white/10">
            {sortedTasks.length > 0 ? (
                sortedTasks.slice(0, 5).map((task) => {
                    const done = isTaskDone(task, project);

                    return (
                        <button
                            key={task.id}
                            onClick={() => onOpenBoard(project.id, phase.id)}
                            className="relative flex w-full items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 dark:border-white/10 dark:bg-void-900 dark:hover:bg-void-800"
                        >
                            <span className="absolute -left-4 top-4 h-px w-4 bg-slate-200 dark:bg-white/10" />
                            <span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white dark:border-white/20 dark:bg-void-800'}`}>
                                {done && <Check className="h-3 w-3" />}
                            </span>
                            <span className="min-w-0">
                                <span className={`block truncate text-sm font-semibold ${done ? 'text-slate-400 line-through dark:text-bone-200/40' : 'text-slate-800 dark:text-bone-100'}`}>
                                    {task.title}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-bone-200/60">
                                    {task.priority || 'Normal'} priority
                                </span>
                            </span>
                        </button>
                    );
                })
            ) : (
                <div className="relative rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 dark:border-white/10 dark:bg-void-900 dark:text-bone-200/60">
                    <span className="absolute -left-4 top-4 h-px w-4 bg-slate-200 dark:bg-white/10" />
                    No tasks in this stage yet.
                </div>
            )}
            {sortedTasks.length > 5 && (
                <button
                    onClick={() => onOpenBoard(project.id, phase.id)}
                    className="text-sm font-semibold text-sage-700 hover:text-sage-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500 dark:text-sage-300"
                >
                    Open {sortedTasks.length - 5} more tasks
                </button>
            )}
        </div>
    );
};

const EmptyProjectMap = ({ onCreateManual, onCreateAI }) => (
    <div className="mx-auto mt-4 flex min-h-[360px] max-w-xl flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 text-center dark:border-white/10 dark:bg-void-900">
        <Sparkles className="h-10 w-10 text-slate-400" />
        <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-bone-100">No projects yet</h3>
        <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-bone-200/60">
            Create a project, then this page will map it into stages and tasks.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button
                onClick={onCreateManual}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
            >
                <Plus className="h-4 w-4" />
                Manual
            </button>
            <button
                onClick={onCreateAI}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
            >
                <Sparkles className="h-4 w-4" />
                AI Project
            </button>
        </div>
    </div>
);

const ProjectPlanModal = ({ title, submitLabel, data, setData, onSubmit, onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-void-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <div>
                    <h3 className="text-xl font-bold text-slate-950 dark:text-bone-100">{title}</h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-bone-200/60">Vision, notes, and timeline live with the project.</p>
                </div>
                <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <form onSubmit={onSubmit} className="max-h-[calc(92vh-80px)] overflow-y-auto p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Project title">
                        <input
                            type="text"
                            value={data.title}
                            onChange={(event) => setData({ ...data, title: event.target.value })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                            placeholder="Project name"
                            autoFocus
                            required
                        />
                    </FormField>
                    <FormField label="Category">
                        <select
                            value={data.category}
                            onChange={(event) => setData({ ...data, category: event.target.value })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                        >
                            {CATEGORIES.map((category) => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </FormField>
                </div>

                <div className="mt-4">
                    <FormField label="Vision">
                        <textarea
                            value={data.vision}
                            onChange={(event) => setData({ ...data, vision: event.target.value })}
                            className="h-28 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                            placeholder="What does done look like, and why does this matter?"
                        />
                    </FormField>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_180px]">
                    <FormField label="Notes">
                        <textarea
                            value={data.notes}
                            onChange={(event) => setData({ ...data, notes: event.target.value })}
                            className="h-28 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                            placeholder="Constraints, decisions, links, assumptions..."
                        />
                    </FormField>
                    <FormField label="Deadline">
                        <input
                            type="date"
                            value={data.deadline || ''}
                            onChange={(event) => setData({ ...data, deadline: event.target.value })}
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                        />
                    </FormField>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100 dark:hover:bg-void-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-sage-500 dark:text-void-950 dark:hover:bg-sage-400"
                    >
                        {submitLabel}
                    </button>
                </div>
            </form>
        </div>
    </div>
);

const AIProjectModal = ({ prompt, setPrompt, category, setCategory, onClose, onSubmit, isGenerating }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
        <div className="w-full max-w-2xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-void-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-indigo-100 p-2 text-indigo-700">
                        <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-950 dark:text-bone-100">AI Project Architect</h3>
                        <p className="mt-1 text-sm text-slate-500 dark:text-bone-200/60">Turn a project vision into phases and tasks.</p>
                    </div>
                </div>
                <button onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10">
                    <X className="h-5 w-5" />
                </button>
            </div>

            <form onSubmit={onSubmit} className="p-5">
                <FormField label="Project vision">
                    <textarea
                        value={prompt}
                        onChange={(event) => setPrompt(event.target.value)}
                        className="h-32 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100"
                        placeholder="Example: build a stock market simulator in Python with portfolio tracking and replay mode"
                        autoFocus
                    />
                </FormField>

                <div className="mt-4">
                    <div className="mb-2 text-sm font-semibold text-slate-700 dark:text-bone-200">Category</div>
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map((item) => (
                            <button
                                key={item}
                                type="button"
                                onClick={() => setCategory(item)}
                                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${category === item
                                    ? 'border-slate-900 bg-slate-950 text-white dark:border-sage-400 dark:bg-sage-500 dark:text-void-950'
                                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100 dark:hover:bg-void-700'
                                    }`}
                            >
                                {item}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100 dark:hover:bg-void-700"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={!prompt.trim() || isGenerating}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-sage-500 dark:text-void-950 dark:hover:bg-sage-400"
                    >
                        {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        Create Project
                    </button>
                </div>
            </form>
        </div>
    </div>
);

const FormField = ({ label, children }) => (
    <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-bone-200">{label}</span>
        {children}
    </label>
);

export default ProjectBoards;
