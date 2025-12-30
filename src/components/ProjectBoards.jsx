import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Sparkles, Loader2, Check, Trash2, X, Pin, PinOff, ChevronDown, ChevronRight, Calendar, ListTodo, Dumbbell, Brain, Briefcase, Rocket, Folder, Trophy, GraduationCap } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useAIProjectArchitect } from '../hooks/useAIProjectArchitect';
import PhaseSelectionView from './PhaseSelectionView';
import ProjectDetailView from './ProjectDetailView';

const ProjectBoards = () => {
    const { projects, addProject, updateProject, deleteProject } = useProject();
    const { generateProjectPlan, isGenerating } = useAIProjectArchitect();

    // Navigation state: 'list' -> 'phases' -> 'kanban'
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

    // View 1: Project List Table
    return (
        <div className="h-full flex flex-col p-4 md:p-8 overflow-y-auto custom-scrollbar bg-slate-950 rounded-2xl relative">
            {/* Aurora Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
                <div className="absolute inset-0 grid-pattern opacity-30" />
            </div>

            {/* Header */}
            <div className="relative z-10 flex justify-between items-center mb-12">
                <div>
                    <h2 className="text-4xl font-extrabold text-white tracking-tight mb-2">
                        Project <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-400">Boards</span>
                    </h2>
                    <p className="text-white/40 font-medium">Manage your ideas and execution plans</p>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowManualProjectModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-white/5 backdrop-blur-md border border-white/10 text-white/70 rounded-2xl hover:bg-white/10 hover:text-white transition-all duration-300"
                    >
                        <Plus className="w-5 h-5" />
                        Manual Project
                    </button>
                    <button
                        onClick={() => setShowNewProjectModal(true)}
                        className="relative flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-bold transition-all duration-300 hover:scale-105 shadow-[0_0_20px_rgba(168,85,247,0.4)] group overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Sparkles className="w-5 h-5 animate-pulse" />
                        <span>AI Project</span>
                    </button>
                </div>
            </div>

            {/* Project Cards Grid */}
            <div className="relative z-10 bento-grid-track">
                {/* Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {projects
                        .sort((a, b) => (b.isPinned === true) - (a.isPinned === true))
                        .map(project => {
                            const isExpanded = expandedProjects[project.id];
                            const sortedPhases = [...(project.phases || [])].sort((a, b) => a.order - b.order);
                            const CategoryIcon = getCategoryIcon(project.category);
                            const borderColor = getPriorityColor(project);
                            const showStatusBadge = shouldShowStatus();
                            const progress = project.progress || 0;

                            // Dynamic Gradient for Progress
                            const getProgressGradient = (pct) => {
                                if (pct < 30) return ['#9333ea', '#6366f1']; // Purple to Indigo
                                if (pct < 70) return ['#6366f1', '#3b82f6']; // Indigo to Blue
                                return ['#06b6d4', '#22c55e']; // Cyan to Green
                            };
                            const [startColor, endColor] = getProgressGradient(progress);

                            return (
                                <div key={project.id} className="group">
                                    {/* Project Card */}
                                    <div
                                        className={`relative glass-premium p-6 rounded-[2rem] cursor-pointer transition-all duration-500 hover:scale-[1.03] overflow-hidden`}
                                        onClick={() => handleSelectProject(project.id)}
                                    >
                                        {/* Status / Category Color Indicator Overlay */}
                                        <div className={`absolute top-0 left-0 w-1 h-full ${borderColor.replace('border-l-4', '').replace('border-l-', 'bg-')}`} />

                                        {/* Pin Icon */}
                                        {project.isPinned && (
                                            <div className="absolute top-6 right-6">
                                                <Pin className="w-5 h-5 text-amber-400 fill-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
                                            </div>
                                        )}

                                        {/* Header: Icon & Meta */}
                                        <div className="flex items-start justify-between mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-white/20 rounded-2xl blur-lg group-hover:blur-xl transition-all opacity-0 group-hover:opacity-100" />
                                                    <div className="relative p-4 bg-white/5 rounded-2xl border border-white/10 group-hover:border-white/20 transition-all shadow-inner">
                                                        <CategoryIcon className="w-7 h-7 text-white animate-float" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] uppercase tracking-widest text-white/30 font-bold">{project.category}</span>
                                                        {project.isAIGenerated !== false && (
                                                            <Sparkles className="w-3 h-3 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.5)]" />
                                                        )}
                                                    </div>
                                                    {project.updated_at && (
                                                        <span className="text-[11px] text-white/20">{formatTimeAgo(project.updated_at)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Title & Description */}
                                        <div className="mb-8">
                                            <h3 className="text-2xl font-bold text-white mb-2 line-clamp-2 leading-tight group-hover:text-purple-300 transition-colors">
                                                {project.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-white/40 text-sm font-medium">
                                                <ListTodo className="w-4 h-4" />
                                                <span>{getTotalTasks(project)} Tasks</span>
                                            </div>
                                        </div>

                                        {/* Progress Section */}
                                        <div className="flex items-end justify-between">
                                            <div className="relative flex flex-col items-center">
                                                <div className="relative w-24 h-24">
                                                    <svg className="w-24 h-24 transform -rotate-90 slice-svg" viewBox="0 0 100 100">
                                                        <circle
                                                            cx="50" cy="50" r="42"
                                                            stroke="currentColor" strokeWidth="8" fill="none"
                                                            className="text-white/[0.03]"
                                                        />
                                                        <circle
                                                            cx="50" cy="50" r="42"
                                                            stroke={`url(#grad-${project.id})`}
                                                            strokeWidth="8" fill="none" strokeLinecap="round"
                                                            strokeDasharray={`${2 * Math.PI * 42}`}
                                                            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                                                            className="transition-all duration-1000 ease-out"
                                                        />
                                                        <defs>
                                                            <linearGradient id={`grad-${project.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                                                <stop offset="0%" stopColor={startColor} />
                                                                <stop offset="100%" stopColor={endColor} />
                                                            </linearGradient>
                                                        </defs>
                                                    </svg>
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center translate-y-1">
                                                        <span className="text-2xl font-black text-white">{progress}%</span>
                                                        <span className="text-[9px] uppercase tracking-tighter text-white/30 font-bold">Done</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-3">
                                                {showStatusBadge && (
                                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 ${project.status === 'active'
                                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                                                        }`}>
                                                        {project.status}
                                                    </span>
                                                )}

                                                <div className="flex items-center gap-2">
                                                    {sortedPhases.length > 0 && (
                                                        <button
                                                            onClick={(e) => toggleProjectExpand(e, project.id)}
                                                            className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group/expand"
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown className="w-5 h-5 text-white/60 group-hover/expand:text-white" />
                                                            ) : (
                                                                <ChevronRight className="w-5 h-5 text-white/60 group-hover/expand:text-white" />
                                                            )}
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => toggleProjectMenu(e, project.id)}
                                                        className="p-3 bg-white/5 rounded-2xl hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group/menu"
                                                    >
                                                        <MoreHorizontal className="w-5 h-5 text-white/60 group-hover/menu:text-white" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tags Section */}
                                        {project.tags && project.tags.length > 0 && (
                                            <div className="mt-6 flex flex-wrap gap-2">
                                                {project.tags.map(tag => (
                                                    <span key={tag} className="px-3 py-1 bg-white/5 rounded-lg text-[10px] text-white/40 border border-white/10">#{tag}</span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Actions Menu (Show on click) */}
                                        {projectMenuOpen === project.id && (
                                            <div className="absolute right-6 bottom-24 bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 min-w-[200px] overflow-hidden animate-in fade-in zoom-in duration-200">
                                                <button
                                                    onClick={(e) => handleCompleteProject(e, project.id)}
                                                    className="w-full px-5 py-3.5 text-left text-sm hover:bg-white/10 flex items-center gap-3 text-white/80 transition-colors"
                                                >
                                                    {project.status === 'completed' ? (
                                                        <><X className="w-4 h-4" /> Mark Active</>
                                                    ) : (
                                                        <><Check className="w-4 h-4 text-emerald-400" /> Mark Complete</>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={(e) => handlePinProject(e, project.id)}
                                                    className="w-full px-5 py-3.5 text-left text-sm hover:bg-white/10 flex items-center gap-3 text-white/80 transition-colors"
                                                >
                                                    {project.isPinned ? (
                                                        <><PinOff className="w-4 h-4" /> Unpin</>
                                                    ) : (
                                                        <><Pin className="w-4 h-4" /> Pin</>
                                                    )}
                                                </button>
                                                <div className="h-px bg-white/10" />
                                                <button
                                                    onClick={(e) => handleDeleteProject(e, project.id)}
                                                    className="w-full px-5 py-3.5 text-left text-sm hover:bg-red-500/20 flex items-center gap-3 text-red-400 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" /> Delete Project
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Expanded Phase List (Below Card) */}
                                    {isExpanded && sortedPhases.length > 0 && (
                                        <div className="mt-4 ml-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                                            {sortedPhases.map((phase, idx) => (
                                                <div
                                                    key={phase.id}
                                                    className="glass-premium p-4 rounded-2xl hover:bg-white/10 cursor-pointer transition-all border-l-4 border-l-indigo-500/50"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedProjectId(project.id);
                                                        handleSelectPhase(phase.id);
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-6 h-6 flex items-center justify-center bg-white/5 rounded-lg border border-white/10">
                                                                <span className="text-[10px] font-bold text-white/50">{idx + 1}</span>
                                                            </div>
                                                            <span className="text-white/80 font-semibold text-sm">{phase.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] text-white/40 font-bold uppercase tracking-widest">
                                                            <div className="flex items-center gap-1.5">
                                                                <ListTodo className="w-3.5 h-3.5" />
                                                                {getPhaseTaskCount(project, phase.id)}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded-lg">
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
                    <div className="flex flex-col items-center justify-center min-h-[500px] bento-grid-track border-dashed border-white/10">
                        <div className="text-center max-w-xl">
                            {/* Illustration */}
                            <div className="relative mx-auto mb-10">
                                <div className="w-48 h-48 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4 relative overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.3)] animate-pulse">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2),transparent)] opacity-50"></div>
                                    <Sparkles className="w-24 h-24 text-white relative z-10 animate-float" />
                                </div>
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-white/10 rounded-full animate-[spin_20s_linear_infinite]" />
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-white/5 rounded-full animate-[spin_30s_linear_infinite_reverse]" />
                            </div>

                            {/* Text */}
                            <h3 className="text-4xl font-extrabold text-white mb-4 tracking-tight">The canvas is blank.</h3>
                            <p className="text-white/30 mb-12 text-lg font-medium leading-relaxed">
                                Every masterpiece starts as a single thought.<br />
                                Let our AI Architect help you blueprint your next project.
                            </p>

                            {/* CTA Buttons */}
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <button
                                    onClick={() => setShowNewProjectModal(true)}
                                    className="relative flex items-center justify-center gap-3 px-10 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black transition-all hover:scale-105 shadow-[0_10px_40px_rgba(168,85,247,0.4)] group overflow-hidden"
                                >
                                    <Sparkles className="w-6 h-6" />
                                    <span>Start with AI</span>
                                </button>
                                <button
                                    onClick={() => setShowManualProjectModal(true)}
                                    className="flex items-center justify-center gap-3 px-10 py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all hover:scale-105"
                                >
                                    <Plus className="w-6 h-6" />
                                    <span>Manual Creation</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* AI Command Palette Modal */}
            {showNewProjectModal && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center z-[100] p-6 animate-in fade-in duration-300">
                    <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-[0_0_100px_rgba(168,85,247,0.2)] overflow-hidden">
                        <div className="p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20">
                                    <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight">AI Project Architect</h3>
                                    <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Command Palette v2.0</p>
                                </div>
                                <button
                                    onClick={() => setShowNewProjectModal(false)}
                                    className="ml-auto p-3 bg-white/5 rounded-2xl hover:bg-white/10 text-white/40 transition-all"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleCreateProject} className="space-y-8">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition-opacity" />
                                    <textarea
                                        value={prompt}
                                        onChange={(e) => setPrompt(e.target.value)}
                                        placeholder="What is your grand vision today? (e.g., 'I want to build a stock market simulator in Python')"
                                        className="relative w-full px-6 py-6 rounded-2xl bg-slate-900 border border-white/10 text-xl text-white placeholder-white/20 resize-none h-32 outline-none focus:border-purple-500/50 transition-all font-serif italic"
                                        autoFocus
                                    />
                                </div>

                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        <label className="block text-[10px] font-black uppercase tracking-widest text-white/30 mb-3">Target Category</label>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map(cat => (
                                                <button
                                                    key={cat}
                                                    type="button"
                                                    onClick={() => setAiProjectCategory(cat)}
                                                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${aiProjectCategory === cat
                                                        ? 'bg-purple-600/20 text-purple-400 border-purple-500/30'
                                                        : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="submit"
                                        disabled={!prompt.trim() || isGenerating}
                                        className="flex-1 px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-[0_4px_20px_rgba(168,85,247,0.3)] hover:shadow-[0_4px_30px_rgba(168,85,247,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                                    >
                                        {isGenerating ? (
                                            <>
                                                <Loader2 className="w-6 h-6 animate-spin" />
                                                <span>Architecting Plan...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-6 h-6" />
                                                <span>Build My Project</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {/* Status bar */}
                        <div className="bg-white/5 px-8 py-3 flex items-center justify-between border-t border-white/5">
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">System Status: {isGenerating ? 'Building...' : 'Ready'}</span>
                            <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Esc to Close</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Project Modal */}
            {showManualProjectModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-white/10">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-white/10 rounded-lg">
                                    <Plus className="w-6 h-6 text-white" />
                                </div>
                                <h3 className="text-xl font-bold text-white">Create Manual Project</h3>
                            </div>

                            <p className="text-white/60 mb-6 text-sm">
                                Create your own project board with custom phases.
                            </p>

                            <form onSubmit={handleCreateManualProject}>
                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            Project Title
                                        </label>
                                        <input
                                            type="text"
                                            value={manualProjectData.title}
                                            onChange={(e) => setManualProjectData({ ...manualProjectData, title: e.target.value })}
                                            placeholder="e.g., My Personal Website"
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 text-white placeholder-white/40 outline-none"
                                            autoFocus
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-2">Category</label>
                                        <select
                                            value={manualProjectData.category}
                                            onChange={(e) => setManualProjectData({ ...manualProjectData, category: e.target.value })}
                                            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 focus:border-purple-500/50 text-white outline-none"
                                        >
                                            {categories.map(cat => (
                                                <option key={cat} value={cat} className="bg-slate-900">{cat}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-white/80 mb-2">
                                            Description (Optional)
                                        </label>
                                        <textarea
                                            value={manualProjectData.description}
                                            onChange={(e) => setManualProjectData({ ...manualProjectData, description: e.target.value })}
                                            placeholder="Brief description of your project..."
                                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:border-purple-500/50 text-white placeholder-white/40 resize-none h-24 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowManualProjectModal(false)}
                                        className="flex-1 px-4 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-medium hover:from-purple-600 hover:to-indigo-600 transition-colors flex items-center justify-center gap-2"
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
