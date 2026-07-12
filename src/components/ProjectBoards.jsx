import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Calendar, Folder, LayoutDashboard, Plus, Sparkles } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useAIProjectArchitect } from '../hooks/useAIProjectArchitect';
import ProjectMindMap from './ProjectMindMap';
import ProjectDetailView from './ProjectDetailView';
import { confirmAction } from '../utils/confirm';
import { ProjectCalendar } from './ProjectCalendar';
import { SegmentedControl } from '../ui';
import { AIProjectModal, EmptyProjectMap, ProjectPlanModal, ProjectTreeCard } from './projectBoardParts';
import { buildProjectPayload, EMPTY_MANUAL_PROJECT, getSortedPhases } from './projectBoardUtils';

const IdeasBoard = lazy(() => import('./IdeasBoard'));

const ProjectBoards = () => {
    const { projects, addProject, updateProject, deleteProject } = useProject();
    const { generateProjectPlan, isGenerating } = useAIProjectArchitect();

    const [view, setView] = useState('list');
    const [workspace, setWorkspace] = useState('projects');
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

    const workspaceControl = (
        <SegmentedControl
            items={[
                { id: 'projects', label: 'Projects' },
                { id: 'ideas', label: 'Ideas' },
            ]}
            value={workspace}
            onChange={setWorkspace}
            ariaLabel="Projects workspace"
        />
    );

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
        if (confirmAction('Delete this project and its tasks?')) {
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

    if (workspace === 'ideas') {
        return (
            <div className="h-full min-h-[720px] overflow-y-auto p-4 md:p-6">
                <div className="mb-5">{workspaceControl}</div>
                <Suspense fallback={<div className="py-16 text-center text-sm text-slate-500">Loading...</div>}>
                    <IdeasBoard />
                </Suspense>
            </div>
        );
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
            <div className="mb-5">{workspaceControl}</div>
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


export default ProjectBoards;
