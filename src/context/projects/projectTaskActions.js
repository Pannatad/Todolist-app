import { supabase } from '../../services/supabase';
import { log } from '../../utils/log.js';
import {
    calculateProgress,
    DEFAULT_COLUMNS,
    DEFAULT_PHASES,
    getPhaseColumns,
    normalizeProjectTask,
} from '../projectUtils';

export const createProjectTaskActions = ({ projects, projectsRepo, setProjects, user }) => {
    const addTask = async (projectId, task) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const taskWithoutDifficulty = normalizeProjectTask(task);
        const newTask = {
            ...taskWithoutDifficulty,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            phaseId: task.phaseId || project?.phases?.[0]?.id || DEFAULT_PHASES[0].id,
            columnId: task.columnId || getPhaseColumns(project, task.phaseId || project?.phases?.[0]?.id || DEFAULT_PHASES[0].id)[0]?.id || DEFAULT_COLUMNS[0].id
        };

        // Create the updated tasks array BEFORE updating state
        const updatedTasks = [...project.tasks, newTask];
        const progress = calculateProgress(updatedTasks, project);

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                tasks: updatedTasks,
                progress
            };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: updatedTasks,
                    progress,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
                log('✅ Task synced to cloud');
            } catch (error) {
                console.error('❌ Failed to sync task to cloud:', error);
            }
        }

        return newTask;
    };

    const updateTask = async (projectId, taskId, updates) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        // Compute updated tasks BEFORE updating state
        const safeUpdates = normalizeProjectTask(updates);
        const updatedTasks = project.tasks.map(t => {
            const taskWithoutDifficulty = normalizeProjectTask(t);
            return t.id === taskId ? { ...taskWithoutDifficulty, ...safeUpdates } : taskWithoutDifficulty;
        });
        const progress = calculateProgress(updatedTasks, project);

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                tasks: updatedTasks,
                progress
            };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: updatedTasks,
                    progress,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
                log('✅ Task update synced to cloud');
            } catch (error) {
                console.error('❌ Failed to sync task update to cloud:', error);
            }
        }
    };

    const deleteTask = async (projectId, taskId) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        // Compute updated data BEFORE state update
        const updatedTasks = project.tasks.filter(t => t.id !== taskId);
        const progress = calculateProgress(updatedTasks, project);

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: updatedTasks, progress };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: updatedTasks,
                    progress,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
                log('✅ Task deletion synced to cloud');
            } catch (error) {
                console.error('❌ Failed to sync task deletion to cloud:', error);
            }
        }
    };

    const deleteProject = async (id) => {
        setProjects(prev => prev.filter(p => p.id !== id));

        await projectsRepo.remove(id);
    };

    const moveTask = async (projectId, taskId, newColumnId, newPhaseId = null) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        // Compute updated data BEFORE state update
        const updatedTasks = project.tasks.map(task => {
            if (task.id !== taskId) return task;
            const updates = { columnId: newColumnId };
            if (newPhaseId) updates.phaseId = newPhaseId;
            return { ...task, ...updates };
        });

        const progress = calculateProgress(updatedTasks, project);

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: updatedTasks, progress };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: updatedTasks,
                    progress,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
                log('✅ Task move synced to cloud');
            } catch (error) {
                console.error('❌ Failed to sync task move to cloud:', error);
            }
        }
    };

    // Toggle task completion
    const toggleTaskComplete = async (projectId, taskId) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const updatedTasks = project.tasks.map(t =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
        );

        const progress = calculateProgress(updatedTasks, project);

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: updatedTasks, progress };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: updatedTasks,
                    progress,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
            } catch (error) {
                console.error('❌ Failed to sync task toggle:', error);
            }
        }
    };

    // Add subtask to a task
    const addSubtask = async (projectId, taskId, subtaskTitle) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const newSubtask = {
            id: crypto.randomUUID(),
            title: subtaskTitle,
            completed: false,
            created_at: new Date().toISOString()
        };

        const updatedTasks = project.tasks.map(t => {
            if (t.id !== taskId) return t;
            return {
                ...t,
                subtasks: [...(t.subtasks || []), newSubtask]
            };
        });

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: updatedTasks };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: updatedTasks,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
            } catch (error) {
                console.error('❌ Failed to sync subtask:', error);
            }
        }

        return newSubtask;
    };

    // Toggle subtask completion
    const toggleSubtaskComplete = async (projectId, taskId, subtaskId) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const updatedTasks = project.tasks.map(t => {
            if (t.id !== taskId) return t;
            return {
                ...t,
                subtasks: (t.subtasks || []).map(st =>
                    st.id === subtaskId ? { ...st, completed: !st.completed } : st
                )
            };
        });

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: updatedTasks };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: updatedTasks,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
            } catch (error) {
                console.error('❌ Failed to sync subtask toggle:', error);
            }
        }
    };

    // Delete subtask
    const deleteSubtask = async (projectId, taskId, subtaskId) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const updatedTasks = project.tasks.map(t => {
            if (t.id !== taskId) return t;
            return {
                ...t,
                subtasks: (t.subtasks || []).filter(st => st.id !== subtaskId)
            };
        });

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: updatedTasks };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: updatedTasks,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
            } catch (error) {
                console.error('❌ Failed to sync subtask delete:', error);
            }
        }
    };

    // Update subtask (for editing subtask title)
    const updateSubtask = async (projectId, taskId, subtaskId, updates) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const updatedTasks = project.tasks.map(t => {
            if (t.id !== taskId) return t;
            return {
                ...t,
                subtasks: (t.subtasks || []).map(st =>
                    st.id === subtaskId ? { ...st, ...updates } : st
                )
            };
        });

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: updatedTasks };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: updatedTasks,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
                log('✅ Subtask update synced to cloud');
            } catch (error) {
                console.error('❌ Failed to sync subtask update:', error);
            }
        }
    };

    // Reorder tasks (for drag-and-drop)
    const reorderTasks = async (projectId, newTaskOrder) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const progress = calculateProgress(newTaskOrder, project);

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, tasks: newTaskOrder, progress };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: newTaskOrder,
                    progress,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
            } catch (error) {
                console.error('❌ Failed to sync task reorder:', error);
            }
        }
    };

    // ============ Highlight/Star Functions ============

    // Load highlights for a project
    const loadProjectHighlights = async (projectId) => {
        if (!user) return { tasks: new Set(), subtasks: new Set() };

        try {
            const data = await projectsRepo.listHighlights(projectId);

            const taskHighlights = new Set();
            const subtaskHighlights = new Set();

            data.forEach(item => {
                if (item.subtask_id) {
                    subtaskHighlights.add(`${item.task_id}-${item.subtask_id}`);
                } else {
                    taskHighlights.add(item.task_id);
                }
            });

            log('✅ Loaded highlights:', { tasks: taskHighlights.size, subtasks: subtaskHighlights.size });
            return { tasks: taskHighlights, subtasks: subtaskHighlights };
        } catch (error) {
            console.error('❌ Failed to load highlights:', error);
            return { tasks: new Set(), subtasks: new Set() };
        }
    };

    // Add a highlight
    const addHighlight = async (projectId, taskId, subtaskId = null) => {
        if (!user) return;

        try {
            await projectsRepo.addHighlight(projectId, taskId, subtaskId);
            log('✅ Highlight added');
        } catch (error) {
            console.error('❌ Failed to add highlight:', error);
        }
    };

    // Remove a highlight
    const removeHighlight = async (projectId, taskId, subtaskId = null) => {
        if (!user) return;

        try {
            await projectsRepo.removeHighlight(projectId, taskId, subtaskId);
            log('✅ Highlight removed');
        } catch (error) {
            console.error('❌ Failed to remove highlight:', error);
        }
    };

    return {
        addHighlight,
        addSubtask,
        addTask,
        deleteProject,
        deleteSubtask,
        deleteTask,
        loadProjectHighlights,
        moveTask,
        removeHighlight,
        reorderTasks,
        toggleSubtaskComplete,
        toggleTaskComplete,
        updateSubtask,
        updateTask,
    };
};
