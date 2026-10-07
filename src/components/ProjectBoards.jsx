import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Calendar, Plus, Sparkles } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useAIProjectArchitect } from '../hooks/useAIProjectArchitect';
import ProjectMindMap from './ProjectMindMap';
import ProjectDetailView from './ProjectDetailView';
import { confirmAction } from '../utils/confirm';
import { ProjectCalendar } from './ProjectCalendar';
import { BarButton, PageHeader, RowMenu, SegmentedControl } from '../ui';
import { AIProjectModal, EmptyProjectMap, ProjectPlanModal, ProjectTreeCard } from './projectBoardParts';
import { buildProjectPayload, EMPTY_MANUAL_PROJECT, getSortedPhases } from './projectBoardUtils';
import './projects.css';

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
    const [activePhaseByProject, setActivePhaseByProject] = useState({});
    // Returning from a pushed screen slides the list back in from the leading edge.
    const [cameBack, setCameBack] = useState(false);

    const workspaceControl = (
        <SegmentedControl
            items={[
                { id: 'projects', label: 'Projects' },
                { id: 'ideas', label: 'Ideas' },
            ]}
            value={workspace}
            onChange={setWorkspace}
            ariaLabel="Projects workspace"
            className="projects-page__segments"
        />
    );

    const projectActions = (
        <>
            <BarButton icon={Calendar} label="Project calendar" onClick={() => setView('calendar')} />
            <RowMenu
                variant="bar"
                icon={Plus}
                label="New project"
                items={[
                    { label: 'New Project', icon: Plus, onSelect: () => setShowManualProjectModal(true) },
                    { label: 'Plan with the Agent', icon: Sparkles, onSelect: () => setShowNewProjectModal(true) },
                ]}
            />
        </>
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
        setCameBack(true);
        setSelectedProjectId(null);
        setSelectedPhaseId(null);
        window.scrollTo(0, 0);
    };

    const openProjectBoard = (projectId, phaseId = null) => {
        setSelectedProjectId(projectId);
        setSelectedPhaseId(phaseId);
        setView('board');
        window.scrollTo(0, 0);
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
    };

    const handleDeleteProject = (event, projectId) => {
        event.stopPropagation();
        if (confirmAction('Delete this project and its tasks?')) {
            deleteProject(projectId);
        }
    };

    const handlePinProject = (event, projectId) => {
        event.stopPropagation();
        const project = projects.find((item) => item.id === projectId);
        updateProject(projectId, { isPinned: !project?.isPinned });
    };

    if (view === 'mindmap' && selectedProject) {
        return <ProjectMindMap project={selectedProject} onBack={handleBackToList} />;
    }

    if (workspace === 'ideas') {
        return (
            <div className="projects-page">
                <PageHeader title="Projects" />
                {workspaceControl}
                <Suspense fallback={null}>
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
        <div className={`projects-page${cameBack ? ' pop-enter' : ''}`} onAnimationEnd={(event) => { if (event.target === event.currentTarget) setCameBack(false); }}>
            <PageHeader title="Projects" actions={projectActions} />
            {workspaceControl}

            {orderedProjects.length > 0 ? (
                <div className="project-grid">
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
                                onTogglePhase={togglePhaseBranch}
                                onOpenBoard={openProjectBoard}
                                onOpenMindMap={openProjectMindMap}
                                onEditProject={startEditingProject}
                                onCompleteProject={handleCompleteProject}
                                onPinProject={handlePinProject}
                                onDeleteProject={handleDeleteProject}
                            />
                        );
                    })}
                </div>
            ) : (
                <EmptyProjectMap
                    onCreateManual={() => setShowManualProjectModal(true)}
                    onCreateAI={() => setShowNewProjectModal(true)}
                />
            )}

            <AIProjectModal
                    open={showNewProjectModal}
                    prompt={prompt}
                    setPrompt={setPrompt}
                    category={aiProjectCategory}
                    setCategory={setAiProjectCategory}
                    onClose={() => setShowNewProjectModal(false)}
                    onSubmit={handleCreateProject}
                    isGenerating={isGenerating}
                />

            <ProjectPlanModal
                    open={showManualProjectModal}
                    title="New Project"
                    submitLabel="Create Project"
                    data={manualProjectData}
                    setData={setManualProjectData}
                    onSubmit={handleCreateManualProject}
                    onClose={() => setShowManualProjectModal(false)}
                />

            <ProjectPlanModal
                    open={Boolean(editingProject)}
                    title="Edit Project"
                    submitLabel="Save"
                    data={editProjectData}
                    setData={setEditProjectData}
                    onSubmit={handleUpdateProjectPlan}
                    onClose={() => setEditingProject(null)}
                />
        </div>
    );
};


export default ProjectBoards;
