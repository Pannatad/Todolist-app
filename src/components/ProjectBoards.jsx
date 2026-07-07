import React, { useMemo, useState, useEffect } from 'react';
import {
    ArrowUpRight,
    BarChart3,
    Briefcase,
    Calendar,
    Check,
    ChevronDown,
    ChevronRight,
    Clock3,
    Edit3,
    Flag,
    Folder,
    GraduationCap,
    LayoutDashboard,
    ListChecks,
    Loader2,
    Map,
    MoreHorizontal,
    NotebookText,
    Pin,
    PinOff,
    Plus,
    Rocket,
    Sparkles,
    Target,
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
    { id: 'c-1', title: 'To Do' },
    { id: 'c-2', title: 'In Progress' },
    { id: 'c-3', title: 'Review' },
    { id: 'c-4', title: 'Done' }
];

const DEFAULT_PHASES = [
    { id: 'phase-1', name: 'Discovery', color: 'indigo', order: 0, deadline: null },
    { id: 'phase-2', name: 'Build', color: 'emerald', order: 1, deadline: null },
    { id: 'phase-3', name: 'Review', color: 'amber', order: 2, deadline: null },
    { id: 'phase-4', name: 'Launch', color: 'rose', order: 3, deadline: null }
];

const priorityWeight = { High: 3, Medium: 2, Low: 1 };

const getDoneColumnId = (project) => (
    project.columns?.find((column) => column.title.toLowerCase() === 'done')?.id
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

const getNextMilestone = (project) => {
    const now = new Date();
    const upcoming = getSortedPhases(project)
        .filter((phase) => phase.deadline)
        .map((phase) => ({ ...phase, date: new Date(phase.deadline) }))
        .filter((phase) => !Number.isNaN(phase.date.getTime()))
        .sort((left, right) => left.date - right.date);

    return upcoming.find((phase) => phase.date >= now) || upcoming.at(-1) || null;
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

const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return 'No date';
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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

const getDeadlineTone = (dateString) => {
    const days = getDaysUntil(dateString);
    if (days === null) return 'border-slate-200 bg-slate-50 text-slate-600';
    if (days < 0) return 'border-rose-200 bg-rose-50 text-rose-700';
    if (days <= 7) return 'border-amber-200 bg-amber-50 text-amber-700';
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
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
    const [expandedProjects, setExpandedProjects] = useState({});

    const selectedProject = projects.find((project) => project.id === selectedProjectId);

    const orderedProjects = useMemo(() => (
        [...projects].sort((left, right) => {
            if (left.isPinned !== right.isPinned) return left.isPinned ? -1 : 1;
            return new Date(right.updated_at || right.created_at || 0) - new Date(left.updated_at || left.created_at || 0);
        })
    ), [projects]);

    const portfolioStats = useMemo(() => {
        const activeProjects = projects.filter((project) => project.status !== 'completed');
        const allProjectStats = projects.map(getProjectStats);
        const totalTasks = allProjectStats.reduce((sum, stats) => sum + stats.total, 0);
        const remainingTasks = allProjectStats.reduce((sum, stats) => sum + stats.remaining, 0);
        const completedTasks = allProjectStats.reduce((sum, stats) => sum + stats.completed, 0);
        const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        const nextDeadline = projects
            .map((project) => ({ project, deadline: getProjectDeadline(project) }))
            .filter((item) => item.deadline)
            .sort((left, right) => new Date(left.deadline) - new Date(right.deadline))[0];

        return {
            activeCount: activeProjects.length,
            progress,
            remainingTasks,
            nextDeadline
        };
    }, [projects]);

    const upcomingTasks = useMemo(() => (
        projects
            .flatMap((project) => {
                const phases = getSortedPhases(project);
                return (project.tasks || [])
                    .filter((task) => !isTaskDone(task, project))
                    .map((task) => {
                        const phase = phases.find((item) => item.id === task.phaseId);
                        return {
                            ...task,
                            projectId: project.id,
                            projectTitle: project.title,
                            projectCategory: project.category,
                            phaseName: phase?.name || 'General',
                            phaseDeadline: phase?.deadline || getProjectDeadline(project)
                        };
                    });
            })
            .sort((left, right) => {
                const leftDate = left.phaseDeadline ? new Date(left.phaseDeadline).getTime() : Number.POSITIVE_INFINITY;
                const rightDate = right.phaseDeadline ? new Date(right.phaseDeadline).getTime() : Number.POSITIVE_INFINITY;
                if (leftDate !== rightDate) return leftDate - rightDate;
                return (priorityWeight[right.priority] || 0) - (priorityWeight[left.priority] || 0);
            })
            .slice(0, 6)
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

    const toggleProjectExpand = (event, projectId) => {
        event.stopPropagation();
        setExpandedProjects((prev) => ({
            ...prev,
            [projectId]: !prev[projectId]
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
        <div className="h-full min-h-[720px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-slate-900 shadow-sm dark:border-white/10 dark:bg-void-950 dark:text-bone-100 md:p-6">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-bone-200/60">
                        <LayoutDashboard className="h-4 w-4" />
                        Project boards
                    </div>
                    <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-bone-100 md:text-3xl">
                        Progress, next steps, notes, and deadlines
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-bone-200/70">
                        A working view for project direction, execution state, upcoming tasks, and timeline risk.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={() => setView('calendar')}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-void-900 dark:text-bone-100 dark:hover:bg-void-800"
                    >
                        <Calendar className="h-4 w-4" />
                        Calendar
                    </button>
                    <button
                        onClick={() => setShowManualProjectModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-void-900 dark:text-bone-100 dark:hover:bg-void-800"
                    >
                        <Plus className="h-4 w-4" />
                        Manual
                    </button>
                    <button
                        onClick={() => setShowNewProjectModal(true)}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-sage-500 dark:text-void-950 dark:hover:bg-sage-400"
                    >
                        <Sparkles className="h-4 w-4" />
                        AI Project
                    </button>
                </div>
            </div>

            <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PortfolioMetric icon={Folder} label="Active projects" value={portfolioStats.activeCount} detail={`${projects.length} total`} tone="slate" />
                <PortfolioMetric icon={BarChart3} label="Portfolio progress" value={`${portfolioStats.progress}%`} detail="task completion" tone="emerald" />
                <PortfolioMetric icon={ListChecks} label="Still left" value={portfolioStats.remainingTasks} detail="open project tasks" tone="amber" />
                <PortfolioMetric
                    icon={Flag}
                    label="Next deadline"
                    value={portfolioStats.nextDeadline ? formatDate(portfolioStats.nextDeadline.deadline) : '-'}
                    detail={portfolioStats.nextDeadline ? portfolioStats.nextDeadline.project.title : 'No dated milestones'}
                    tone="rose"
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <section className="space-y-3">
                    {orderedProjects.map((project) => (
                        <ProjectSummaryCard
                            key={project.id}
                            project={project}
                            isExpanded={expandedProjects[project.id]}
                            isMenuOpen={projectMenuOpen === project.id}
                            onOpenBoard={openProjectBoard}
                            onOpenMindMap={openProjectMindMap}
                            onToggleExpand={toggleProjectExpand}
                            onToggleMenu={toggleProjectMenu}
                            onEditProject={startEditingProject}
                            onCompleteProject={handleCompleteProject}
                            onPinProject={handlePinProject}
                            onDeleteProject={handleDeleteProject}
                        />
                    ))}

                    {projects.length === 0 && (
                        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 text-center dark:border-white/10 dark:bg-void-900">
                            <Sparkles className="h-10 w-10 text-slate-400" />
                            <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-bone-100">No projects yet</h3>
                            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-bone-200/60">
                                Create a project with a vision, notes, next steps, and a timeline.
                            </p>
                            <div className="mt-5 flex flex-wrap justify-center gap-2">
                                <button
                                    onClick={() => setShowManualProjectModal(true)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    <Plus className="h-4 w-4" />
                                    Manual
                                </button>
                                <button
                                    onClick={() => setShowNewProjectModal(true)}
                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    AI Project
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                <aside className="space-y-5">
                    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-void-900">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-bone-100">Upcoming next steps</h3>
                            <Clock3 className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="space-y-2">
                            {upcomingTasks.map((task) => (
                                <button
                                    key={`${task.projectId}-${task.id}`}
                                    onClick={() => openProjectBoard(task.projectId, task.phaseId)}
                                    className="w-full rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-void-800 dark:hover:bg-void-700"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-slate-900 dark:text-bone-100">{task.title}</div>
                                            <div className="mt-1 truncate text-xs text-slate-500 dark:text-bone-200/60">
                                                {task.projectTitle} / {task.phaseName}
                                            </div>
                                        </div>
                                        <span className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold ${getDeadlineTone(task.phaseDeadline)}`}>
                                            {formatDeadlineStatus(task.phaseDeadline)}
                                        </span>
                                    </div>
                                </button>
                            ))}

                            {upcomingTasks.length === 0 && (
                                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500 dark:border-white/10 dark:bg-void-800 dark:text-bone-200/60">
                                    No open project tasks yet.
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-void-900">
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-bone-100">Timeline radar</h3>
                            <Calendar className="h-4 w-4 text-slate-400" />
                        </div>
                        <div className="space-y-3">
                            {orderedProjects.slice(0, 5).map((project) => {
                                const deadline = getProjectDeadline(project);
                                const stats = getProjectStats(project);

                                return (
                                    <div key={project.id} className="flex items-center gap-3">
                                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                            <div className="h-full bg-emerald-500" style={{ width: `${stats.progress}%` }} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="truncate text-sm font-semibold text-slate-800 dark:text-bone-100">{project.title}</div>
                                            <div className="text-xs text-slate-500 dark:text-bone-200/60">{formatDeadlineStatus(deadline)}</div>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 dark:text-bone-200/60">{stats.progress}%</span>
                                    </div>
                                );
                            })}

                            {orderedProjects.length === 0 && (
                                <p className="text-sm text-slate-500 dark:text-bone-200/60">No timeline to show.</p>
                            )}
                        </div>
                    </section>
                </aside>
            </div>

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

const PortfolioMetric = ({ icon: Icon, label, value, detail, tone }) => {
    const toneClasses = {
        slate: 'bg-slate-100 text-slate-700',
        emerald: 'bg-emerald-100 text-emerald-700',
        amber: 'bg-amber-100 text-amber-700',
        rose: 'bg-rose-100 text-rose-700'
    };

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-void-900">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-bone-200/50">{label}</p>
                    <div className="mt-2 text-2xl font-bold text-slate-950 dark:text-bone-100">{value}</div>
                    <p className="mt-1 truncate text-sm text-slate-500 dark:text-bone-200/60">{detail}</p>
                </div>
                <div className={`rounded-lg p-2 ${toneClasses[tone] || toneClasses.slate}`}>
                    {React.createElement(Icon, { className: 'h-5 w-5' })}
                </div>
            </div>
        </div>
    );
};

const ProjectSummaryCard = ({
    project,
    isExpanded,
    isMenuOpen,
    onOpenBoard,
    onOpenMindMap,
    onToggleExpand,
    onToggleMenu,
    onEditProject,
    onCompleteProject,
    onPinProject,
    onDeleteProject
}) => {
    const stats = getProjectStats(project);
    const phases = getSortedPhases(project);
    const CategoryIcon = getCategoryIcon(project.category);
    const nextMilestone = getNextMilestone(project);
    const deadline = getProjectDeadline(project);
    const vision = project.vision || project.description || 'No vision captured yet.';
    const notes = project.notes || 'No notes yet.';
    const nextTask = (project.tasks || [])
        .filter((task) => !isTaskDone(task, project))
        .sort((left, right) => (priorityWeight[right.priority] || 0) - (priorityWeight[left.priority] || 0))[0];

    return (
        <article className="relative rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 dark:border-white/10 dark:bg-void-900">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="rounded-lg bg-slate-100 p-2 text-slate-700 dark:bg-white/10 dark:text-bone-100">
                                {React.createElement(CategoryIcon, { className: 'h-5 w-5' })}
                            </div>
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="truncate text-xl font-bold text-slate-950 dark:text-bone-100">{project.title}</h3>
                                    {project.isPinned && <Pin className="h-4 w-4 fill-amber-400 text-amber-500" />}
                                    {project.isAIGenerated !== false && <Sparkles className="h-4 w-4 text-indigo-500" />}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500 dark:text-bone-200/60">
                                    <span>{project.category || 'General'}</span>
                                    <span>/</span>
                                    <span className="capitalize">{project.status || 'active'}</span>
                                    <span>/</span>
                                    <span>{stats.remaining} left</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={(event) => onEditProject(event, project)}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-bone-200/60 dark:hover:bg-white/10 dark:hover:text-bone-100"
                                title="Edit project plan"
                            >
                                <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={(event) => onToggleMenu(event, project.id)}
                                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-bone-200/60 dark:hover:bg-white/10 dark:hover:text-bone-100"
                                title="Project actions"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <InfoBlock icon={Target} label="Vision" text={vision} />
                        <InfoBlock icon={NotebookText} label="Notes" text={notes} />
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                        <StatusPill icon={BarChart3} label="Progress" value={`${stats.progress}%`} />
                        <StatusPill icon={Flag} label="Deadline" value={formatDeadlineStatus(deadline)} tone={getDeadlineTone(deadline)} />
                        <StatusPill icon={Clock3} label="Next milestone" value={nextMilestone ? nextMilestone.name : 'No milestone'} />
                    </div>
                </div>

                <div className="flex flex-col justify-between gap-4 border-t border-slate-200 pt-4 dark:border-white/10 xl:border-l xl:border-t-0 xl:pl-4 xl:pt-0">
                    <div>
                        <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-bone-200/50">
                            <span>Progress</span>
                            <span>{stats.completed}/{stats.total}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${stats.progress}%` }} />
                        </div>
                        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-void-800">
                            <div className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-bone-200/50">Next step</div>
                            <div className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900 dark:text-bone-100">
                                {nextTask?.title || 'No open tasks'}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => onOpenBoard(project.id)}
                            className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-sage-500 dark:text-void-950 dark:hover:bg-sage-400"
                        >
                            <ArrowUpRight className="h-4 w-4" />
                            Board
                        </button>
                        <button
                            onClick={() => onOpenMindMap(project.id)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100 dark:hover:bg-void-700"
                            title="Open mind map"
                        >
                            <Map className="h-4 w-4" />
                        </button>
                        <button
                            onClick={(event) => onToggleExpand(event, project.id)}
                            className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:border-white/10 dark:bg-void-800 dark:text-bone-100 dark:hover:bg-void-700"
                            title="Show timeline"
                        >
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                    </div>
                </div>
            </div>

            {isExpanded && (
                <div className="mt-4 border-t border-slate-200 pt-4 dark:border-white/10">
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        {phases.map((phase, index) => {
                            const phaseTasks = (project.tasks || []).filter((task) => task.phaseId === phase.id);
                            const done = phaseTasks.filter((task) => isTaskDone(task, project)).length;
                            const pct = phaseTasks.length > 0 ? Math.round((done / phaseTasks.length) * 100) : 0;

                            return (
                                <button
                                    key={phase.id}
                                    onClick={() => onOpenBoard(project.id, phase.id)}
                                    className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-left transition-colors hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-void-800 dark:hover:bg-void-700"
                                >
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white text-xs font-bold text-slate-600 shadow-sm dark:bg-white/10 dark:text-bone-100">
                                                {index + 1}
                                            </span>
                                            <span className="truncate text-sm font-bold text-slate-900 dark:text-bone-100">{phase.name}</span>
                                        </div>
                                        <span className="text-xs font-bold text-slate-500 dark:text-bone-200/60">{pct}%</span>
                                    </div>
                                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                                        <div className="h-full bg-indigo-500" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-bone-200/60">
                                        <span>{phaseTasks.length} tasks</span>
                                        <span>{formatDeadlineStatus(phase.deadline)}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

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

const InfoBlock = ({ icon: Icon, label, text }) => (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-void-800">
        <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-bone-200/50">
            {React.createElement(Icon, { className: 'h-3.5 w-3.5' })}
            {label}
        </div>
        <p className="line-clamp-3 min-h-12 text-sm leading-6 text-slate-700 dark:text-bone-200/80">{text}</p>
    </div>
);

const StatusPill = ({ icon: Icon, label, value, tone = 'border-slate-200 bg-slate-50 text-slate-700' }) => (
    <div className={`rounded-lg border px-3 py-2 ${tone}`}>
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">
            {React.createElement(Icon, { className: 'h-3.5 w-3.5' })}
            {label}
        </div>
        <div className="mt-1 truncate text-sm font-bold">{value}</div>
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
