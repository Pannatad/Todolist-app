/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Plus, RotateCcw, Sparkles, Star, ZoomIn, ZoomOut } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import ProjectMindMapGraph from './ProjectMindMapGraph';

const ProjectMindMap = ({ project, onBack }) => {
    const {
        toggleTaskComplete,
        addSubtask,
        updateSubtask,
        toggleSubtaskComplete,
        deleteSubtask,
        addTask,
        updateTask,
        deleteTask,
        reorderTasks,
        loadProjectHighlights,
        addHighlight,
        removeHighlight
    } = useProject();

    const [expandedTasks, setExpandedTasks] = useState({});
    const [allExpanded, setAllExpanded] = useState(true);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [showAddTask, setShowAddTask] = useState(false);
    const [addingSubtaskTo, setAddingSubtaskTo] = useState(null);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [draggedTask, setDraggedTask] = useState(null);

    // Highlight state
    const [highlightedTasks, setHighlightedTasks] = useState(new Set());
    const [highlightedSubtasks, setHighlightedSubtasks] = useState(new Set()); // Format: "taskId-subtaskId"
    const [showHighlightedOnly, setShowHighlightedOnly] = useState(false);

    // Editing state for inline title editing
    const [editingTaskId, setEditingTaskId] = useState(null);
    const [editingTaskTitle, setEditingTaskTitle] = useState('');
    const [editingSubtaskKey, setEditingSubtaskKey] = useState(null); // Format: "taskId-subtaskId"
    const [editingSubtaskTitle, setEditingSubtaskTitle] = useState('');

    // Zoom state
    const [zoom, setZoom] = useState(1);
    const minZoom = 0.5;
    const maxZoom = 2;

    const tasks = project?.tasks || [];

    // Load highlights from Supabase on mount
    useEffect(() => {
        const loadHighlights = async () => {
            if (project?.id) {
                const { tasks: taskSet, subtasks: subtaskSet } = await loadProjectHighlights(project.id);
                setHighlightedTasks(taskSet);
                setHighlightedSubtasks(subtaskSet);
            }
        };
        loadHighlights();
    }, [project?.id]);

    // Toggle highlight for a task (with Supabase persistence)
    const toggleTaskHighlight = async (taskId) => {
        const isHighlighted = highlightedTasks.has(taskId);

        // Update local state first for responsiveness
        setHighlightedTasks(prev => {
            const newSet = new Set(prev);
            if (isHighlighted) {
                newSet.delete(taskId);
            } else {
                newSet.add(taskId);
            }
            return newSet;
        });

        // Sync to Supabase
        if (isHighlighted) {
            await removeHighlight(project.id, taskId, null);
        } else {
            await addHighlight(project.id, taskId, null);
        }
    };

    // Toggle highlight for a subtask (with Supabase persistence)
    const toggleSubtaskHighlight = async (taskId, subtaskId) => {
        const key = `${taskId}-${subtaskId}`;
        const isHighlighted = highlightedSubtasks.has(key);

        // Update local state first for responsiveness
        setHighlightedSubtasks(prev => {
            const newSet = new Set(prev);
            if (isHighlighted) {
                newSet.delete(key);
            } else {
                newSet.add(key);
            }
            return newSet;
        });

        // Sync to Supabase
        if (isHighlighted) {
            await removeHighlight(project.id, taskId, subtaskId);
        } else {
            await addHighlight(project.id, taskId, subtaskId);
        }
    };

    // Start editing a task title
    const startEditingTask = (task) => {
        setEditingTaskId(task.id);
        setEditingTaskTitle(task.title);
    };

    // Save task title edit
    const saveTaskEdit = async () => {
        if (editingTaskId && editingTaskTitle.trim()) {
            await updateTask(project.id, editingTaskId, { title: editingTaskTitle.trim() });
        }
        setEditingTaskId(null);
        setEditingTaskTitle('');
    };

    // Cancel task title edit
    const cancelTaskEdit = () => {
        setEditingTaskId(null);
        setEditingTaskTitle('');
    };

    // Start editing a subtask title
    const startEditingSubtask = (taskId, subtask) => {
        setEditingSubtaskKey(`${taskId}-${subtask.id}`);
        setEditingSubtaskTitle(subtask.title);
    };

    // Save subtask title edit
    const saveSubtaskEdit = async (taskId, subtaskId) => {
        if (editingSubtaskTitle.trim()) {
            await updateSubtask(project.id, taskId, subtaskId, { title: editingSubtaskTitle.trim() });
        }
        setEditingSubtaskKey(null);
        setEditingSubtaskTitle('');
    };

    // Cancel subtask title edit
    const cancelSubtaskEdit = () => {
        setEditingSubtaskKey(null);
        setEditingSubtaskTitle('');
    };

    // Check if any item is highlighted
    const hasHighlights = highlightedTasks.size > 0 || highlightedSubtasks.size > 0;

    // Initialize all tasks as expanded
    useEffect(() => {
        const initialExpanded = {};
        tasks.forEach(task => {
            if (expandedTasks[task.id] === undefined) {
                initialExpanded[task.id] = true;
            }
        });
        if (Object.keys(initialExpanded).length > 0) {
            setExpandedTasks(prev => ({ ...prev, ...initialExpanded }));
        }
    }, [tasks]);

    const handleZoomIn = () => setZoom(prev => Math.min(maxZoom, prev + 0.2));
    const handleZoomOut = () => setZoom(prev => Math.max(minZoom, prev - 0.2));
    const handleResetZoom = () => setZoom(1);

    // Ref for mind map container
    const containerRef = useRef(null);

    // Touchpad/mouse wheel zoom - use useEffect with passive:false to properly prevent browser zoom
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleWheel = (e) => {
            // Ctrl+wheel or pinch gesture (trackpad pinch is usually ctrlKey + wheel)
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                e.stopPropagation();
                const delta = e.deltaY > 0 ? -0.1 : 0.1;
                setZoom(prev => Math.min(maxZoom, Math.max(minZoom, prev + delta)));
            }
        };

        // Must use passive: false to be able to preventDefault
        container.addEventListener('wheel', handleWheel, { passive: false });
        return () => container.removeEventListener('wheel', handleWheel);
    }, []);

    // Toggle task expansion (for subtasks)
    const toggleExpand = (taskId) => {
        setExpandedTasks(prev => ({
            ...prev,
            [taskId]: !prev[taskId]
        }));
    };

    // Expand/Collapse all subtasks
    const toggleAllExpanded = () => {
        const newState = !allExpanded;
        setAllExpanded(newState);
        const newExpanded = {};
        tasks.forEach(task => {
            newExpanded[task.id] = newState;
        });
        setExpandedTasks(newExpanded);
    };

    // Calculate radial positions for tasks
    const taskPositions = useMemo(() => {
        const centerX = 50; // percentage
        const centerY = 50;
        const radius = 30; // percentage from center

        return tasks.map((task, index) => {
            const angle = (2 * Math.PI * index) / tasks.length - Math.PI / 2;
            return {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
                angle: angle
            };
        });
    }, [tasks]);

    // Handle adding new task
    const handleAddTask = async () => {
        if (!newTaskTitle.trim()) return;
        await addTask(project.id, {
            title: newTaskTitle,
            completed: false,
            subtasks: []
        });
        setNewTaskTitle('');
        setShowAddTask(false);
    };

    // Handle adding subtask
    const handleAddSubtask = async (taskId) => {
        if (!newSubtaskTitle.trim()) return;
        await addSubtask(project.id, taskId, newSubtaskTitle);
        setNewSubtaskTitle('');
        setAddingSubtaskTo(null);
    };

    // Drag and drop handlers
    const handleDragStart = (e, taskIndex) => {
        setDraggedTask(taskIndex);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, targetIndex) => {
        e.preventDefault();
        if (draggedTask === null || draggedTask === targetIndex) return;

        const newTasks = [...tasks];
        const [draggedItem] = newTasks.splice(draggedTask, 1);
        newTasks.splice(targetIndex, 0, draggedItem);
        reorderTasks(project.id, newTasks);
        setDraggedTask(targetIndex);
    };

    const handleDragEnd = () => {
        setDraggedTask(null);
    };

    // Progress calculation
    const progress = useMemo(() => {
        if (tasks.length === 0) return 0;
        const completed = tasks.filter(t => t.completed).length;
        return Math.round((completed / tasks.length) * 100);
    }, [tasks]);

    return (
        <div className="h-full flex flex-col bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-500 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-white/20">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onBack}
                        className="p-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/30 transition-all"
                    >
                        <ArrowLeft className="w-5 h-5 text-white" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">{project?.title}</h1>
                        <p className="text-white/70 text-sm">{tasks.length} tasks · {progress}% complete</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {/* Zoom Controls */}
                    <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl p-1">
                        <button
                            onClick={handleZoomOut}
                            disabled={zoom <= minZoom}
                            className="p-2 hover:bg-white/20 rounded-lg transition-all disabled:opacity-40"
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-4 h-4 text-white" />
                        </button>
                        <span className="text-white text-xs font-medium w-12 text-center">{Math.round(zoom * 100)}%</span>
                        <button
                            onClick={handleZoomIn}
                            disabled={zoom >= maxZoom}
                            className="p-2 hover:bg-white/20 rounded-lg transition-all disabled:opacity-40"
                            title="Zoom In"
                        >
                            <ZoomIn className="w-4 h-4 text-white" />
                        </button>
                        <button
                            onClick={handleResetZoom}
                            className="p-2 hover:bg-white/20 rounded-lg transition-all"
                            title="Reset Zoom"
                        >
                            <RotateCcw className="w-4 h-4 text-white" />
                        </button>
                    </div>
                    {/* Collapse/Expand All */}
                    <button
                        onClick={toggleAllExpanded}
                        className="flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/30 transition-all text-white"
                        title={allExpanded ? "Collapse All" : "Expand All"}
                    >
                        {allExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        <span className="hidden sm:inline text-sm font-medium">{allExpanded ? 'Collapse' : 'Expand'}</span>
                    </button>
                    {/* Show Highlighted Only */}
                    <button
                        onClick={() => setShowHighlightedOnly(!showHighlightedOnly)}
                        disabled={!hasHighlights}
                        className={`flex items-center gap-2 px-3 py-2 backdrop-blur-md border rounded-xl transition-all text-white ${showHighlightedOnly
                            ? 'bg-yellow-500/40 border-yellow-400/60 hover:bg-yellow-500/50'
                            : 'bg-white/20 border-white/30 hover:bg-white/30'
                            } ${!hasHighlights ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title={showHighlightedOnly ? "Show All" : "Show Highlighted Only"}
                    >
                        <Star className={`w-4 h-4 ${showHighlightedOnly ? 'fill-yellow-300 text-yellow-300' : ''}`} />
                        <span className="hidden sm:inline text-sm font-medium">{showHighlightedOnly ? 'Starred' : 'Stars'}</span>
                    </button>
                    <button
                        onClick={() => setShowAddTask(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-md border border-white/30 rounded-xl hover:bg-white/30 transition-all text-white font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add Task</span>
                    </button>
                </div>
            </div>

            {/* Mind Map Container */}
            <div
                ref={containerRef}
                className="flex-1 relative overflow-auto p-4 md:p-8"
            >
                {tasks.length === 0 ? (
                    /* Empty State */
                    <div className="h-full flex flex-col items-center justify-center">
                        <div className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center mb-6 border border-white/30">
                            <Sparkles className="w-12 h-12 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">No tasks yet</h3>
                        <p className="text-white/70 mb-6">Add your first task to start the mind map</p>
                        <button
                            onClick={() => setShowAddTask(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-white/30 backdrop-blur-md border border-white/40 rounded-xl hover:bg-white/40 transition-all text-white font-semibold"
                        >
                            <Plus className="w-5 h-5" />
                            Add First Task
                        </button>
                    </div>
                ) : (
                    /* Mind Map Visualization with Zoom */
                    <ProjectMindMapGraph
                        view={{
                            addingSubtaskTo, cancelSubtaskEdit, cancelTaskEdit, deleteSubtask, deleteTask,
                            editingSubtaskKey, editingSubtaskTitle, editingTaskId, editingTaskTitle, expandedTasks,
                            handleAddSubtask, handleDragEnd, handleDragOver, handleDragStart, highlightedSubtasks,
                            highlightedTasks, newSubtaskTitle, project, saveSubtaskEdit, saveTaskEdit, setAddingSubtaskTo,
                            setEditingSubtaskTitle, setEditingTaskTitle, setNewSubtaskTitle, showHighlightedOnly,
                            startEditingSubtask, startEditingTask, taskPositions, tasks, toggleExpand, toggleSubtaskComplete,
                            toggleSubtaskHighlight, toggleTaskComplete, toggleTaskHighlight, zoom,
                            progress,
                        }}
                    />
                )}
            </div>

            {/* Add Task Modal */}
            {showAddTask && (
                <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Add New Task</h3>
                        <input
                            type="text"
                            value={newTaskTitle}
                            onChange={(e) => setNewTaskTitle(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                            placeholder="Task title..."
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none mb-4"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowAddTask(false)}
                                className="flex-1 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddTask}
                                disabled={!newTaskTitle.trim()}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold disabled:opacity-50"
                            >
                                Add Task
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectMindMap;
