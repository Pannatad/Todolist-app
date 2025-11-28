import React, { useState, useEffect } from 'react';
import { Plus, MoreHorizontal, Sparkles, Loader2, CheckSquare, Palette, Settings, Database, Code, FileText, Check, Trash2, X } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { useAIProjectArchitect } from '../hooks/useAIProjectArchitect';
import ProjectDetailView from './ProjectDetailView';

const ProjectBoards = () => {
    const { projects, addProject, updateProject, deleteProject } = useProject();
    const { generateProjectPlan, isGenerating } = useAIProjectArchitect();

    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [showNewProjectModal, setShowNewProjectModal] = useState(false);
    const [showManualProjectModal, setShowManualProjectModal] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [manualProjectData, setManualProjectData] = useState({ title: '', description: '' });
    const [projectMenuOpen, setProjectMenuOpen] = useState(null);

    const selectedProject = projects.find(p => p.id === selectedProjectId);

    const getTaskIcon = (title) => {
        const t = title.toLowerCase();
        if (t.includes('design') || t.includes('ui') || t.includes('ux')) return <Palette className="w-4 h-4 text-amber-500" />;
        if (t.includes('setup') || t.includes('config') || t.includes('environment')) return <Settings className="w-4 h-4 text-red-500" />;
        if (t.includes('database') || t.includes('schema') || t.includes('model')) return <Database className="w-4 h-4 text-slate-500" />;
        if (t.includes('api') || t.includes('endpoint') || t.includes('backend')) return <Code className="w-4 h-4 text-blue-500" />;
        if (t.includes('requirement') || t.includes('plan') || t.includes('define')) return <CheckSquare className="w-4 h-4 text-red-500" />;
        return <FileText className="w-4 h-4 text-sage-400" />;
    };

    const getPriorityBadgeStyle = (priority) => {
        switch (priority?.toLowerCase()) {
            case 'high':
                return 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400';
            case 'medium':
                return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400';
            case 'low':
                return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400';
            default:
                return 'bg-sage-50 text-sage-600 dark:bg-sage-900/20 dark:text-sage-400';
        }
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        const newProject = await generateProjectPlan(prompt);
        addProject(newProject);
        setShowNewProjectModal(false);
        setPrompt('');
    };

    const handleCreateManualProject = (e) => {
        e.preventDefault();
        if (!manualProjectData.title.trim()) return;

        const newProject = {
            id: Date.now().toString(),
            title: manualProjectData.title,
            description: manualProjectData.description,
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
        setManualProjectData({ title: '', description: '' });
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

    if (selectedProject) {
        return <ProjectDetailView project={selectedProject} onBack={() => setSelectedProjectId(null)} />;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-sage-700 dark:text-bone-200">Project Boards</h2>
                    <p className="text-sage-500 dark:text-bone-400">Manage your ideas and execution plans</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowManualProjectModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-void-800 border border-sage-300 dark:border-white/10 text-sage-700 dark:text-bone-200 rounded-lg hover:bg-sage-50 dark:hover:bg-void-700 transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Manual Project
                    </button>
                    <button
                        onClick={() => setShowNewProjectModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-sage-600 text-white rounded-lg hover:bg-sage-700 transition-colors shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                    >
                        <Sparkles className="w-4 h-4" />
                        AI Project
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(project => (
                    <div
                        key={project.id}
                        onClick={() => setSelectedProjectId(project.id)}
                        className="bg-white/80 dark:bg-void-800/80 backdrop-blur-sm border border-sage-200 dark:border-white/10 rounded-2xl p-6 hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1"
                    >
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="text-xl font-bold text-sage-800 dark:text-bone-100 line-clamp-1">{project.title}</h3>
                            <div className="relative">
                                <button
                                    onClick={(e) => toggleProjectMenu(e, project.id)}
                                    className="p-1 rounded-full hover:bg-sage-100 dark:hover:bg-void-700 text-sage-500 dark:text-bone-400 opacity-70 group-hover:opacity-100 transition-opacity"
                                >
                                    <MoreHorizontal className="w-5 h-5" />
                                </button>

                                {projectMenuOpen === project.id && (
                                    <div className="absolute right-0 top-8 bg-white dark:bg-void-800 border border-sage-200 dark:border-white/10 rounded-lg shadow-xl z-50 min-w-[160px] overflow-hidden">
                                        <button
                                            onClick={(e) => handleCompleteProject(e, project.id)}
                                            className="w-full px-4 py-2.5 text-left text-sm active:bg-sage-50 dark:active:bg-void-700 flex items-center gap-2 text-sage-700 dark:text-bone-200"
                                        >
                                            {project.status === 'completed' ? (
                                                <>
                                                    <X className="w-4 h-4" />
                                                    Mark as Active
                                                </>
                                            ) : (
                                                <>
                                                    <Check className="w-4 h-4 text-green-600" />
                                                    Mark as Complete
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={(e) => handleDeleteProject(e, project.id)}
                                            className="w-full px-4 py-2.5 text-left text-sm active:bg-red-50 dark:active:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Delete Project
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {project.isAIGenerated !== false && (
                            <p className="text-sm text-sage-500 dark:text-bone-400 mb-4">
                                AI Generated plan for: {project.title}
                            </p>
                        )}

                        {/* Task Preview List */}
                        <div className="space-y-2 mb-4">
                            {project.tasks.slice(0, 5).map((task, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    {getTaskIcon(task.title)}
                                    <span className="text-sm text-sage-700 dark:text-bone-200 flex-1 truncate">
                                        {task.title}
                                    </span>
                                    {task.priority && (
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getPriorityBadgeStyle(task.priority)}`}>
                                            {task.priority} Priority
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Progress Section */}
                        <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm text-sage-600 dark:text-bone-300">Progress</span>
                                <span className="text-sm font-bold text-sage-700 dark:text-bone-200">{project.progress}%</span>
                            </div>
                            <div className="w-full h-2 bg-sage-100 dark:bg-void-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-sage-500 to-sage-600 dark:from-magma-500 dark:to-magma-600 transition-all duration-500"
                                    style={{ width: `${project.progress}%` }}
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex gap-2">
                            <div className="px-3 py-1.5 bg-sage-100 dark:bg-void-700 rounded-lg text-sm font-medium text-sage-700 dark:text-bone-300">
                                {project.tasks.length} Tasks
                            </div>
                            <div className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${project.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                project.status === 'completed' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                    'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                }`}>
                                {project.status}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Add New Project Card */}
                <button
                    onClick={() => setShowNewProjectModal(true)}
                    className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-sage-300 dark:border-white/10 rounded-2xl hover:border-sage-500 dark:hover:border-white/30 hover:bg-sage-50 dark:hover:bg-void-800/30 transition-all group text-sage-500 dark:text-bone-400"
                >
                    <div className="p-3 rounded-full bg-sage-100 dark:bg-void-700 group-hover:scale-110 transition-transform mb-3">
                        <Plus className="w-6 h-6" />
                    </div>
                    <span className="font-medium">Create New Board</span>
                </button>
            </div>

            {/* AI Project Modal */}
            {
                showNewProjectModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-void-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-sage-200 dark:border-white/10">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-sage-100 dark:bg-void-800 rounded-lg">
                                        <Sparkles className="w-6 h-6 text-sage-600 dark:text-magma-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-sage-800 dark:text-bone-100">AI Architect</h3>
                                </div>

                                <p className="text-sage-600 dark:text-bone-300 mb-6 text-sm">
                                    Describe your project idea, and I'll generate a complete plan with columns and tasks for you.
                                </p>

                                <form onSubmit={handleCreateProject}>
                                    <div className="mb-6">
                                        <label className="block text-sm font-medium text-sage-700 dark:text-bone-200 mb-2">
                                            What do you want to build?
                                        </label>
                                        <textarea
                                            value={prompt}
                                            onChange={(e) => setPrompt(e.target.value)}
                                            placeholder="e.g., Build a personal portfolio website with a blog and contact form..."
                                            className="w-full px-4 py-3 rounded-xl bg-sage-50 dark:bg-void-800 border-none focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100 placeholder-sage-400 dark:placeholder-bone-500 resize-none h-32"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowNewProjectModal(false)}
                                            className="flex-1 px-4 py-2 rounded-lg border border-sage-200 dark:border-white/10 text-sage-600 dark:text-bone-300 hover:bg-sage-50 dark:hover:bg-void-800 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!prompt.trim() || isGenerating}
                                            className="flex-1 px-4 py-2 rounded-lg bg-sage-600 dark:bg-magma-600 text-white font-medium hover:bg-sage-700 dark:hover:bg-magma-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {isGenerating ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Generating...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4" />
                                                    Generate Plan
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Manual Project Modal */}
            {
                showManualProjectModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white dark:bg-void-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-sage-200 dark:border-white/10">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-sage-100 dark:bg-void-800 rounded-lg">
                                        <Plus className="w-6 h-6 text-sage-600 dark:text-magma-500" />
                                    </div>
                                    <h3 className="text-xl font-bold text-sage-800 dark:text-bone-100">Create Manual Project</h3>
                                </div>

                                <p className="text-sage-600 dark:text-bone-300 mb-6 text-sm">
                                    Create your own project board with custom columns.
                                </p>

                                <form onSubmit={handleCreateManualProject}>
                                    <div className="space-y-4 mb-6">
                                        <div>
                                            <label className="block text-sm font-medium text-sage-700 dark:text-bone-200 mb-2">
                                                Project Title
                                            </label>
                                            <input
                                                type="text"
                                                value={manualProjectData.title}
                                                onChange={(e) => setManualProjectData({ ...manualProjectData, title: e.target.value })}
                                                placeholder="e.g., My Personal Website"
                                                className="w-full px-4 py-3 rounded-xl bg-sage-50 dark:bg-void-800 border-none focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100 placeholder-sage-400 dark:placeholder-bone-500"
                                                autoFocus
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-sage-700 dark:text-bone-200 mb-2">
                                                Description (Optional)
                                            </label>
                                            <textarea
                                                value={manualProjectData.description}
                                                onChange={(e) => setManualProjectData({ ...manualProjectData, description: e.target.value })}
                                                placeholder="Brief description of your project..."
                                                className="w-full px-4 py-3 rounded-xl bg-sage-50 dark:bg-void-800 border-none focus:ring-2 focus:ring-sage-500 dark:focus:ring-magma-500 text-sage-900 dark:text-bone-100 placeholder-sage-400 dark:placeholder-bone-500 resize-none h-24"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setShowManualProjectModal(false)}
                                            className="flex-1 px-4 py-2 rounded-lg border border-sage-200 dark:border-white/10 text-sage-600 dark:text-bone-300 hover:bg-sage-50 dark:hover:bg-void-800 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 px-4 py-2 rounded-lg bg-sage-600 dark:bg-magma-600 text-white font-medium hover:bg-sage-700 dark:hover:bg-magma-700 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Create Project
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default ProjectBoards;
