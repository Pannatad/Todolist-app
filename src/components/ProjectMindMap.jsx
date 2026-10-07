/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Minus, Plus, SlidersHorizontal, Star, Trash2, X } from 'lucide-react';
import { useProject } from '../context/ProjectContext';
import { BarButton, MenuButton, PageHeader, RowMenu, Sheet } from '../ui';
import { confirmAction } from '../utils/confirm';
import ProjectMindMapGraph from './ProjectMindMapGraph';

const ProjectMindMap = ({ project, onBack }) => {
    const {
        toggleTaskComplete,
        addSubtask,
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
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
    const [draggedTask, setDraggedTask] = useState(null);

    // Highlight state
    const [highlightedTasks, setHighlightedTasks] = useState(new Set());
    const [highlightedSubtasks, setHighlightedSubtasks] = useState(new Set()); // Format: "taskId-subtaskId"
    const [showHighlightedOnly, setShowHighlightedOnly] = useState(false);

    // Task sheet (tap a node to open it)
    const [openTaskId, setOpenTaskId] = useState(null);
    const [taskTitleDraft, setTaskTitleDraft] = useState('');

    // Zoom state
    // Phones start slightly zoomed out so subtask labels fit inside the canvas.
    const [defaultZoom] = useState(() => (window.matchMedia?.('(max-width: 40rem)').matches ? 0.8 : 1));
    const [zoom, setZoom] = useState(defaultZoom);
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

    const openTask = tasks.find((task) => task.id === openTaskId) || null;

    const openTaskSheet = (taskId) => {
        const task = tasks.find((item) => item.id === taskId);
        setTaskTitleDraft(task?.title || '');
        setNewSubtaskTitle('');
        setOpenTaskId(taskId);
    };

    const saveTaskTitle = async () => {
        const title = taskTitleDraft.trim();
        if (!openTask || !title || title === openTask.title) return;
        await updateTask(project.id, openTask.id, { title });
    };

    const closeTaskSheet = () => {
        saveTaskTitle();
        setOpenTaskId(null);
    };

    const handleDeleteTask = async () => {
        if (!openTask || !confirmAction(`Delete "${openTask.title}"?`)) return;
        const taskId = openTask.id;
        setOpenTaskId(null);
        await deleteTask(project.id, taskId);
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
    const handleResetZoom = () => setZoom(defaultZoom);

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
        await addSubtask(project.id, taskId, newSubtaskTitle.trim());
        setNewSubtaskTitle('');
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

    const openSubtasks = openTask?.subtasks || [];
    const openTaskStarred = openTask ? highlightedTasks.has(openTask.id) : false;

    return (
        <div className="mindmap-page push-enter">
            <PageHeader
                title={project?.title}
                subtitle={`${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} · ${progress}% done`}
                onBack={onBack}
                backLabel="Projects"
                showAccount={false}
                actions={(
                    <>
                        <MenuButton
                            icon={SlidersHorizontal}
                            label="View options"
                            sections={[{
                                title: 'View',
                                items: [
                                    { id: 'expand', label: allExpanded ? 'Hide Subtasks' : 'Show Subtasks', onSelect: toggleAllExpanded },
                                    { id: 'starred', label: 'Starred Only', checked: showHighlightedOnly, disabled: !hasHighlights, onSelect: () => setShowHighlightedOnly((value) => !value) },
                                ],
                            }]}
                        />
                        <BarButton icon={Plus} tone="primary" label="New task" onClick={() => setShowAddTask(true)} />
                    </>
                )}
            />

            <div ref={containerRef} className="ui-card mindmap-canvas">
                {tasks.length === 0 ? (
                    <div className="mindmap-empty">
                        <p>No tasks yet.</p>
                        <button type="button" className="ui-button ui-button--accent" onClick={() => setShowAddTask(true)}>New Task</button>
                    </div>
                ) : (
                    <>
                        <ProjectMindMapGraph
                            view={{
                                expandedTasks, handleDragEnd, handleDragOver, handleDragStart, highlightedSubtasks,
                                highlightedTasks, onOpenTask: openTaskSheet, project, progress, showHighlightedOnly,
                                taskPositions, tasks, toggleSubtaskComplete, toggleTaskComplete, zoom,
                            }}
                        />
                        <div className="mindmap-zoom" role="group" aria-label="Zoom">
                            <button type="button" onClick={handleZoomOut} disabled={zoom <= minZoom} aria-label="Zoom out"><Minus size={16} /></button>
                            <button type="button" onClick={handleResetZoom} aria-label="Reset zoom">{Math.round(zoom * 100)}%</button>
                            <button type="button" onClick={handleZoomIn} disabled={zoom >= maxZoom} aria-label="Zoom in"><Plus size={16} /></button>
                        </div>
                    </>
                )}
            </div>

            <Sheet open={showAddTask} onClose={() => { setShowAddTask(false); setNewTaskTitle(''); }} title="New Task" className="form-sheet">
                <form className="form-stack" onSubmit={(event) => { event.preventDefault(); handleAddTask(); }}>
                    <div className="form-group">
                        <label className="form-field">
                            <span className="sr-only">Title</span>
                            <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Title"
                                autoFocus
                            />
                        </label>
                    </div>
                    <button type="submit" disabled={!newTaskTitle.trim()} className="ui-button ui-button--accent form-submit">Add Task</button>
                </form>
            </Sheet>

            <Sheet
                open={Boolean(openTask)}
                onClose={closeTaskSheet}
                title="Task"
                className="form-sheet"
                actions={openTask ? (
                    <RowMenu
                        label="Task actions"
                        items={[
                            { label: openTaskStarred ? 'Unstar' : 'Star', icon: Star, onSelect: () => toggleTaskHighlight(openTask.id) },
                            { label: 'Delete', icon: Trash2, destructive: true, onSelect: handleDeleteTask },
                        ]}
                    />
                ) : null}
            >
                {openTask && (
                    <div className="form-stack">
                        <div className="form-group">
                            <label className="form-field">
                                <span className="sr-only">Title</span>
                                <input
                                    type="text"
                                    value={taskTitleDraft}
                                    onChange={(e) => setTaskTitleDraft(e.target.value)}
                                    onBlur={saveTaskTitle}
                                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                                    placeholder="Title"
                                />
                            </label>
                        </div>

                        <p className="form-section-label">Subtasks</p>
                        <div className="form-group">
                            {openSubtasks.map((subtask) => {
                                const starred = highlightedSubtasks.has(`${openTask.id}-${subtask.id}`);
                                return (
                                    <div key={subtask.id} className="form-field form-subtask">
                                        <button
                                            type="button"
                                            className="task-check form-subtask__check"
                                            aria-pressed={Boolean(subtask.completed)}
                                            aria-label={subtask.completed ? `Mark ${subtask.title} not done` : `Complete ${subtask.title}`}
                                            onClick={() => toggleSubtaskComplete(project.id, openTask.id, subtask.id)}
                                        >
                                            <span>{subtask.completed && <Check size={12} strokeWidth={3.2} />}</span>
                                        </button>
                                        <span className={`form-subtask__title${subtask.completed ? ' is-done' : ''}`}>{subtask.title}</span>
                                        <button
                                            type="button"
                                            className={`mindmap-sheet__star${starred ? ' is-on' : ''}`}
                                            aria-pressed={starred}
                                            aria-label={starred ? `Unstar ${subtask.title}` : `Star ${subtask.title}`}
                                            onClick={() => toggleSubtaskHighlight(openTask.id, subtask.id)}
                                        >
                                            <Star size={15} fill={starred ? 'currentColor' : 'none'} />
                                        </button>
                                        <button
                                            type="button"
                                            className="form-remove"
                                            aria-label={`Delete ${subtask.title}`}
                                            onClick={() => deleteSubtask(project.id, openTask.id, subtask.id)}
                                        >
                                            <X size={13} strokeWidth={2.6} />
                                        </button>
                                    </div>
                                );
                            })}
                            <form className="form-field" onSubmit={(event) => { event.preventDefault(); handleAddSubtask(openTask.id); }}>
                                <input
                                    type="text"
                                    value={newSubtaskTitle}
                                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                                    placeholder="Add Subtask"
                                    aria-label="New subtask"
                                />
                                {newSubtaskTitle.trim() && <button type="submit" className="ui-text-button mindmap-sheet__add">Add</button>}
                            </form>
                        </div>

                        <button
                            type="button"
                            className="ui-button ui-button--accent form-submit"
                            onClick={() => toggleTaskComplete(project.id, openTask.id)}
                        >
                            {openTask.completed ? 'Mark Open' : 'Mark Done'}
                        </button>
                    </div>
                )}
            </Sheet>
        </div>
    );
};

export default ProjectMindMap;
