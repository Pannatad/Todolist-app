import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Sparkles, Loader2, Check, Trash2, X, Pin, PinOff, ChevronDown, ChevronRight, Calendar, ListTodo, Dumbbell, Brain, Briefcase, Rocket, Folder, Trophy, GraduationCap } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useAIProjectArchitect } from '../hooks/useAIProjectArchitect';
import PhaseSelectionView from './PhaseSelectionView';
import ProjectDetailView from './ProjectDetailView';
import { ProjectCalendar } from './ProjectCalendar';

const ProjectBoards = () => {
    const { projects, addProject, updateProject, deleteProject } = useProject();
    const { generateProjectPlan, isGenerating } = useAIProjectArchitect();

    // Navigation state: 'list' -> 'calendar' -> 'phases' -> 'kanban'
    const [view, setView] = useState('list');
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedPhaseId, setSelectedPhaseId] = useState(null);

    // Modal states
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [showManualProjectModal, setShowManualProjectModal] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [manualProjectData, setManualProjectData] = useState({ title: '', description: '', category: 'General' });
    const [projectMenuOpen, setProjectMenuOpen] = useState(null);
    const [expandedProjects, setExpandedProjects] = useState({});
    const [aiProjectCategory, setAiProjectCategory] = useState('General');

    const selectedProject = projects.find(p => p.id === selectedProjectId);
    const categories = ['Work Projects', 'Personal Growth', 'Side Hustles', 'Learning', 'General'];

    // Navigation handlers
    const handleSelectProject = (projectId) => {
        setSelectedProjectId(projectId);
        setView('phases');
    };

    const handleSelectPhase = (phaseId) => {
        setSelectedPhaseId(phaseId);
        setView('kanban');
    };

    const handleBackToList = () => {
        setView('list');
        setSelectedProjectId(null);
        setSelectedPhaseId(null);
    };

    const handleBackToPhases = () => {
        setView('phases');
        setSelectedPhaseId(null);
    };

    // Toggle project expansion in table
    const toggleProjectExpand = (e, projectId) => {
        e.stopPropagation();
        setExpandedProjects(prev => ({
            ...prev,
            [projectId]: !prev[projectId]
        }));
    };

    // Project handlers
    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        const newProject = await generateProjectPlan(prompt);
        const projectWithCategory = {
            ...newProject,
            category: aiProjectCategory
        };

        addProject(projectWithCategory);
        setShowNewProjectModal(false);
        setPrompt('');
        setAiProjectCategory('General');
    };

    const handleCreateManualProject = (e) => {
        e.preventDefault();
        if (!manualProjectData.title.trim()) return;

        const newProject = {
            id: Date.now().toString(),
            title: manualProjectData.title,
            description: manualProjectData.description,
            category: manualProjectData.category,
            status: 'active',
            progress: 0,
            isAIGenerated: false,
            columns: [
                { id: 'col-1', title: 'To Do' },
                { id: 'col-2', title: 'In Progress' },
                { id: 'col-3', title: 'Review' },
                { id: 'col-4', title: 'Done' }
            ],
            tasks: []
        };

        addProject(newProject);
        setShowManualProjectModal(false);
        setManualProjectData({ title: '', description: '', category: 'General' });
    };

    const handleCompleteProject = (e, projectId) => {
        e.stopPropagation();
        const project = projects.find(p => p.id === projectId);
        const newStatus = project.status === 'completed' ? 'active' : 'completed';
        updateProject(projectId, { status: newStatus });
        setProjectMenuOpen(null);
    };

    const handleDeleteProject = (e, projectId) => {
        e.stopPropagation();
        if (window.confirm('Are you sure you want to delete this project? This cannot be undone.')) {
            deleteProject(projectId);
        }
        setProjectMenuOpen(null);
    };

    const handlePinProject = (e, projectId) => {
        e.stopPropagation();
        const project = projects.find(p => p.id === projectId);
        updateProject(projectId, { isPinned: !project.isPinned });
        setProjectMenuOpen(null);
    };

    const toggleProjectMenu = (e, projectId) => {
        e.stopPropagation();
        setProjectMenuOpen(projectMenuOpen === projectId ? null : projectId);
    };

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            if (projectMenuOpen) {
                setProjectMenuOpen(null);
            }
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [projectMenuOpen]);

    // Helper functions
    const getPhaseTaskCount = (project, phaseId) => {
        return project.tasks.filter(t => t.phaseId === phaseId).length;
    };

    const formatTimeAgo = (dateString) => {
        if (!dateString) return null;
        const now = new Date();
        const past = new Date(dateString);
        const diffMs = now - past;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${diffDays}d ago`;
    };

    const formatDeadline = (deadline) => {
        if (!deadline) return '-';
        const date = new Date(deadline);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    const getTotalTasks = (project) => {
        return project.tasks.length;
    };

    // Get icon for project category
    const getCategoryIcon = (category) => {
        const iconMap = {
            'Work Projects': Briefcase,
            'Personal Growth': Trophy,
            'Side Hustles': Rocket,
            'Learning': GraduationCap,
            'General': Folder
        };
        return iconMap[category] || Folder;
    };

    // Check if we should show status badges (only if there's diversity)
    const shouldShowStatus = () => {
        const statuses = new Set(projects.map(p => p.status));
        return statuses.size > 1;
    };

    // Get priority color for border (placeholder - you can add priority field later)
    const getPriorityColor = (project) => {
        // For now, use category-based colors as placeholder
        const colorMap = {
            'Work Projects': 'border-l-blue-500',
            'Personal Growth': 'border-l-emerald-500',
            'Side Hustles': 'border-l-amber-500',
            'Learning': 'border-l-purple-500',
            'General': 'border-l-slate-500'
        };
        return colorMap[project.category] || 'border-l-slate-500';
    };

    // Render based on current view
    if (view === 'kanban' && selectedProject) {
        return (
            <ProjectDetailView
                project={selectedProject}
                onBack={handleBackToPhases}
                selectedPhaseId={selectedPhaseId}
            />
        );
    }

    if (view === 'phases' && selectedProject) {
        return (
            <PhaseSelectionView
                project={selectedProject}
                onBack={handleBackToList}
                onSelectPhase={handleSelectPhase}
            />
        );
    }

    // View 0: Calendar View
    if (view === 'calendar') {
        return <ProjectCalendar />;
    }

    // View 1: Project List Table
    return (
        <div className="h-full flex flex-col p-4 md:p-8 overflow-y-auto custom-scrollbar bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 rounded-2xl relative">

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">
                        Project Boards
                    </h2>
                    <p className="text-white/80 mt-1">Manage your ideas and execution plans</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setView('calendar')}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all"
                    >
                        <Calendar className="w-4 h-4" />
                        Calendar
                    </button>
                    <button
                        onClick={() => setShowManualProjectModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl hover:bg-white/30 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Manual Project
                    </button>
                    <button
                        onClick={() => setShowNewProjectModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white/30 backdrop-blur-md border border-white/40 text-white rounded-xl font-semibold transition-all hover:bg-white/40 hover:shadow-lg hover:shadow-white/20 hover:scale-105"
                    >
                        <Sparkles className="w-5 h-5" />
                        AI Project
                    </button>
                </div>
            </div>

            {/* Project Cards Grid */}
            <div className="relative z-10">
                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects
                        .sort((a, b) => (b.isPinned === true) - (a.isPinned === true))
                        .map(project => {
                            const isExpanded = expandedProjects[project.id];
                            const sortedPhases = [...(project.phases || [])].sort((a, b) => a.order - b.order);
                            const CategoryIcon = getCategoryIcon(project.category);
                            const showStatusBadge = shouldShowStatus();
                            const progress = project.progress || 0;

                            // Category color mapping for left border
                            const getCategoryColor = (category) => {
                                const colorMap = {
                                    'Work Projects': 'border-l-blue-500',
                                    'Personal Growth': 'border-l-emerald-500',
                                    'Side Hustles': 'border-l-amber-500',
                                    'Learning': 'border-l-purple-500',
                                    'General': 'border-l-gray-400'
                                };
                                return colorMap[category] || 'border-l-gray-400';
                            };

                            // Progress color based on percentage
                            const getProgressColor = (pct) => {
                                if (pct < 30) return '#6366f1'; // Indigo
                                if (pct < 70) return '#3b82f6'; // Blue
                                return '#22c55e'; // Green
                            };

                            return (
                                <div key={project.id} className="group">
                                    {/* Project Card */}
                                    <div
                                        className={`relative bg-white/25 backdrop-blur-2xl p-6 rounded-[2rem] cursor-pointer transition-all duration-300 hover:bg-white/30 hover:shadow-2xl hover:shadow-white/20 border border-white/30 ${getCategoryColor(project.category)} border-l-4 overflow-hidden`}
                                        onClick={() => handleSelectProject(project.id)}
                                    >


                                        {/* Pin Icon */}
                                        {project.isPinned && (
                                            <div className="absolute top-5 right-5">
                                                <Pin className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                                            </div>
                                        )}

                                        {/* Header: Icon & Meta */}
                                        <div className="flex items-start justify-between mb-4 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-white/20 backdrop-blur-md rounded-xl border border-white/30">
                                                    <CategoryIcon className="w-5 h-5 text-white" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs uppercase tracking-wider text-white/80 font-bold">{project.category}</span>
                                                        {project.isAIGenerated !== false && (
                                                            <Sparkles className="w-3 h-3 text-yellow-300" />
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Title & Description */}
                                        <div className="mb-6 relative z-10">
                                            <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-white/90 transition-colors">
                                                {project.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-white/80 text-sm font-medium">
                                                <ListTodo className="w-4 h-4" />
                                                <span>{getTotalTasks(project)} Tasks</span>
                                            </div>
                                        </div>

                                        {/* Progress Section */}
                                        <div className="flex items-end justify-between relative z-10">
                                            <div className="relative flex flex-col items-center">
                                                <div className="relative w-20 h-20">
                                                    <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                                                        <circle
                                                            cx="40" cy="40" r="32"
                                                            stroke="currentColor" strokeWidth="6" fill="none"
                                                            className="text-white/20"
                                                        />
                                                        <circle
                                                            cx="40" cy="40" r="32"
                                                            stroke="white"
                                                            strokeWidth="6" fill="none" strokeLinecap="round"
                                                            strokeDasharray={`${2 * Math.PI * 32}`}
                                                            strokeDashoffset={`${2 * Math.PI * 32 * (1 - progress / 100)}`}
                                                            className="transition-all duration-500"
                                                        />
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                        <span className="text-lg font-bold text-white">{progress}%</span>
                                                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-tight">Done</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-2">
                                                {showStatusBadge && (
                                                    <span className={`px-3 py-1 rounded-full text-xs font-bold backdrop-blur-md ${project.status === 'active'
                                                        ? 'bg-emerald-400/30 text-white border border-emerald-300/50'
                                                        : 'bg-blue-400/30 text-white border border-blue-300/50'
                                                        }`}>
                                                        {project.status}
                                                    </span>
                                                )}

                                                <div className="flex items-center gap-2">
                                                    {sortedPhases.length > 0 && (
                                                        <button
                                                            onClick={(e) => toggleProjectExpand(e, project.id)}
                                                            className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all text-gray-500 hover:text-gray-700"
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown className="w-4 h-4" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4" />
                                                            )}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => toggleProjectMenu(e, project.id)}
                                                        className="p-2 bg-gray-50 rounded-xl hover:bg-gray-100 border border-gray-200 hover:border-gray-300 transition-all text-gray-500 hover:text-gray-700"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tags Section */}
                                        {project.tags && project.tags.length > 0 && (
                                            <div className="mt-4 flex flex-wrap gap-2 relative z-10">
                                                {project.tags.map(tag => (
                                                    <span key={tag} className="px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg text-xs font-medium text-white border border-white/30">#{tag}</span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Phases Preview Section */}
                                        {sortedPhases.length > 0 && (
                                            <div className="mt-4 relative z-10">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Phases ({sortedPhases.length})</span>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {sortedPhases.slice(0, 3).map((phase, idx) => {
                                                        const phaseDeadline = phase.deadline ? new Date(phase.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No deadline';
                                                        return (
                                                            <div key={phase.id} className="flex items-center justify-between text-xs bg-white/10 backdrop-blur-md rounded-lg px-3 py-2 border border-white/20">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-white/80 font-bold">{idx + 1}.</span>
                                                                    <span className="text-white font-medium">{phase.name}</span>
                                                                </div>
                                                                <span className="text-white font-medium text-xs">{phaseDeadline}</span>
                                                            </div>
                                                        );
                                                    })}
                                                    {sortedPhases.length > 3 && (
                                                        <div className="text-xs text-white/80 text-center py-1">
                                                            +{sortedPhases.length - 3} more phases
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Actions Menu (Show on click) - FIXED POSITIONING */}
                                        {projectMenuOpen === project.id && (
                                            <div className="absolute top-16 right-6 bg-white/10 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl z-50 min-w-[180px] overflow-hidden">
                                                <button
                                                    onClick={(e) => handleCompleteProject(e, project.id)}
                                                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/20 flex items-center gap-3 text-white font-medium transition-colors"
                                                >
                                                    {project.status === 'completed' ? (
                                                        <><X className="w-4 h-4" /> Mark Active</>
                                                    ) : (
                                                        <><Check className="w-4 h-4 text-emerald-300" /> Mark Complete</>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={(e) => handlePinProject(e, project.id)}
                                                    className="w-full px-4 py-3 text-left text-sm hover:bg-white/20 flex items-center gap-3 text-white font-medium transition-colors"
                                                >
                                                    {project.isPinned ? (
                                                        <><PinOff className="w-4 h-4" /> Unpin</>
                                                    ) : (
                                                        <><Pin className="w-4 h-4" /> Pin</>
                                                    )}
                                                </button>
                                                <div className="h-px bg-white/20" />
                                                <button
                                                    onClick={(e) => handleDeleteProject(e, project.id)}
                                                    className="w-full px-4 py-3 text-left text-sm hover:bg-red-500/20 flex items-center gap-3 text-red-300 font-medium transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Delete Project
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expanded Phase List (Below Card) */}
                                    {isExpanded && sortedPhases.length > 0 && (
                                        <div className="mt-3 ml-4 space-y-2">
                                            {sortedPhases.map((phase, idx) => (
                                                <div
                                                    key={phase.id}
                                                    className="bg-white/15 backdrop-blur-xl p-3.5 rounded-xl hover:bg-white/25 cursor-pointer transition-all border border-white/30 border-l-4 border-l-white shadow-lg hover:shadow-xl"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedProjectId(project.id);
                                                        handleSelectPhase(phase.id);
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-lg">
                                                                <span className="text-xs font-bold text-white">{idx + 1}</span>
                                                            </div>
                                                            <span className="text-white font-semibold text-sm">{phase.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-white/80 font-medium">
                                                            <div className="flex items-center gap-1">
                                                                <ListTodo className="w-3.5 h-3.5" />
                                                                {getPhaseTaskCount(project, phase.id)}
                                                            </div>
                                                            <div className="flex items-center gap-1 px-2 py-1 bg-white/20 backdrop-blur-md rounded-lg">
                                                                <Calendar className="w-3.5 h-3.5" />
                                                                {formatDeadline(phase.deadline)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                </div>

                {/* Empty State */}
                {projects.length === 0 && (
                    <div className="flex flex-col items-center justify-center min-h-[400px]">
                        <div className="text-center max-w-md">
                            {/* Illustration */}
                            <div className="relative mx-auto mb-8">
                                <div className="w-32 h-32 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mx-auto relative border border-white/30">
                                    <Sparkles className="w-16 h-16 text-white" />
                                </div>
                            </div>


                            {/* Text */}
                            <h3 className="text-2xl font-bold text-white mb-3">No projects yet</h3>
                            <p className="text-white/80 mb-8 text-base font-medium">
                                Start organizing your ideas and bring them to life.<br />
                                Create your first project with AI assistance!
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                <button
                                    onClick={() => setShowNewProjectModal(true)}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white/30 backdrop-blur-md border border-white/40 text-white rounded-xl font-semibold transition-all hover:bg-white/40 hover:shadow-lg hover:shadow-white/20 hover:scale-105"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    Start with AI
                                </button>
                                <button
                                    onClick={() => setShowManualProjectModal(true)}
                                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-md border border-white/30 text-white rounded-xl font-medium hover:bg-white/30 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                    Create Manually
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* AI Command Palette Modal */}
            {showNewProjectModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-6">
                    <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-indigo-100 rounded-xl">
                                    <Sparkles className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">AI Project Architect</h3>
                                    <p className="text-gray-500 text-sm">Describe your project and let AI create the plan</p>
                                </div>
                                <button
                                    onClick={() => setShowNewProjectModal(false)}
                                    className="ml-auto p-2 bg-gray-100 rounded-xl hover:bg-gray-200 text-gray-400 transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateProject} className="space-y-6">
                                <div>
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="What is your project vision? (e.g., 'I want to build a stock market simulator in Python')"
                                        className="w-full px-4 py-4 rounded-xl bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-400 resize-none h-28 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                                        autoFocus
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                    <div className="flex flex-wrap gap-2">
                                        {categories.map(cat => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setAiProjectCategory(cat)}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${aiProjectCategory === cat
                                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-300'
                                                    : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                                    }`}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowNewProjectModal(false)}
                                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!prompt.trim() || isGenerating}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-indigo-500/30"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                <span>Creating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                <span>Create Project</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Project Modal */}
            {showManualProjectModal && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Plus className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Create Project</h3>
                            </div>

                            <p className="text-gray-500 mb-6 text-sm">
                                Create your own project board with custom phases.
                            </p>

                            <form onSubmit={handleCreateManualProject}>
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Project Title
                                        </label>
                                        <input
                                            type="text"
                                            value={manualProjectData.title}
                                            onChange={(e) => setManualProjectData({ ...manualProjectData, title: e.target.value })}
                                            placeholder="e.g., My Personal Website"
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-gray-900 placeholder-gray-400 outline-none"
                                            autoFocus
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                                        <select
                                            value={manualProjectData.category}
                                            onChange={(e) => setManualProjectData({ ...manualProjectData, category: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-gray-900 outline-none"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            value={manualProjectData.description}
                                            onChange={(e) => setManualProjectData({ ...manualProjectData, description: e.target.value })}
                                            placeholder="Brief description of your project..."
                                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 text-gray-900 placeholder-gray-400 resize-none h-24 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowManualProjectModal(false)}
                                        className="flex-1 px-4 py-3 rounded-xl bg-gray-100 text-gray-600 font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Project
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectBoards;
