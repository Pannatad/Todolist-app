import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

// Default phases for new projects
const DEFAULT_PHASES = [
    { id: 'phase-1', name: 'Planning', color: 'purple', order: 0, deadline: null },
    { id: 'phase-2', name: 'Prototype', color: 'blue', order: 1, deadline: null },
    { id: 'phase-3', name: 'Testing', color: 'amber', order: 2, deadline: null },
    { id: 'phase-4', name: 'Deployment', color: 'emerald', order: 3, deadline: null },
];

// Default columns (same for each phase)
const DEFAULT_COLUMNS = [
    { id: 'c-1', title: 'To Do' },
    { id: 'c-2', title: 'In Progress' },
    { id: 'c-3', title: 'Review' },
    { id: 'c-4', title: 'Done' }
];

export const ProjectProvider = ({ children }) => {
    const { user } = useAuth();

    const [projects, setProjects] = useState(() => {
        try {
            const saved = localStorage.getItem('demon-projects');
            if (saved) {
                const parsed = JSON.parse(saved);
                return parsed.map(p => ({
                    ...p,
                    isPinned: p.isPinned === true,
                    // Ensure phases exist
                    phases: p.phases || DEFAULT_PHASES,
                    // Ensure tasks have phaseId
                    tasks: Array.isArray(p.tasks) ? p.tasks.map(t => ({
                        ...t,
                        phaseId: t.phaseId || (p.phases?.[0]?.id || 'phase-1')
                    })) : []
                }));
            }
            return [
                {
                    id: 'sample-1',
                    title: 'Website Redesign',
                    description: 'Overhaul the company website with new branding.',
                    status: 'active',
                    progress: 35,
                    isPinned: false,
                    phases: DEFAULT_PHASES,
                    columns: DEFAULT_COLUMNS,
                    tasks: [
                        { id: 't1', title: 'Design Mockups', description: 'Create Figma designs', priority: 'High', difficulty: 'Hard', columnId: 'c-2', phaseId: 'phase-1' },
                        { id: 't2', title: 'Setup Repo', description: 'Initialize Git repository', priority: 'Medium', difficulty: 'Easy', columnId: 'c-4', phaseId: 'phase-1' },
                        { id: 't3', title: 'Write Content', description: 'Draft copy for homepage', priority: 'Low', difficulty: 'Medium', columnId: 'c-1', phaseId: 'phase-2' }
                    ]
                }
            ];
        } catch (e) {
            console.error('Failed to load projects', e);
            return [];
        }
    });

    // Load from Supabase
    const loadProjectsFromSupabase = async () => {
        if (!user) return;

        try {
            const { data: projectsData } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });

            if (projectsData) {
                const formattedProjects = projectsData.map(p => ({
                    ...p,
                    isAIGenerated: p.is_ai_generated || false,
                    isPinned: p.is_pinned === true,
                    category: p.category || 'General',
                    phases: p.phases || DEFAULT_PHASES,
                    tasks: Array.isArray(p.tasks) ? p.tasks.map(t => ({
                        ...t,
                        id: t.id || crypto.randomUUID(),
                        phaseId: t.phaseId || (p.phases?.[0]?.id || 'phase-1')
                    })) : []
                }));
                setProjects(formattedProjects);
            }
        } catch (error) {
            console.error("Error loading projects:", error);
        }
    };

    useEffect(() => {
        if (user) {
            loadProjectsFromSupabase();
        }
    }, [user]);

    // Save to LocalStorage (Guest Mode)
    useEffect(() => {
        if (!user) {
            localStorage.setItem('demon-projects', JSON.stringify(projects));
        }
    }, [projects, user]);

    const addProject = async (project) => {
        const newProject = {
            ...project,
            id: user ? undefined : crypto.randomUUID(),
            user_id: user?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            progress: 0,
            category: project.category || 'General',
            tags: project.tags || [],
            phases: project.phases || DEFAULT_PHASES,
            columns: project.columns || DEFAULT_COLUMNS,
            tasks: project.tasks || []
        };

        const tempId = crypto.randomUUID();
        setProjects(prev => [...prev, { ...newProject, id: user ? tempId : newProject.id }]);

        if (user) {
            try {
                // Only include columns that exist in the Supabase schema
                // Note: 'tags' is NOT in the schema, so we exclude it
                const dbProject = {
                    user_id: newProject.user_id,
                    title: newProject.title,
                    description: newProject.description,
                    status: newProject.status || 'active',
                    progress: newProject.progress || 0,
                    is_ai_generated: newProject.isAIGenerated || false,
                    category: newProject.category || 'General',
                    is_pinned: newProject.isPinned || false,
                    phases: newProject.phases || DEFAULT_PHASES,
                    columns: newProject.columns || DEFAULT_COLUMNS,
                    tasks: newProject.tasks || [],
                    updated_at: newProject.updated_at
                };

                const { data, error } = await supabase.from('projects').insert([dbProject]).select().single();

                if (data) {
                    const formattedData = {
                        ...data,
                        isAIGenerated: data.is_ai_generated || false,
                        isPinned: data.is_pinned === true,
                        category: data.category || 'General',
                        phases: data.phases || DEFAULT_PHASES,
                        tasks: Array.isArray(data.tasks) ? data.tasks.map(t => ({ ...t, id: t.id || crypto.randomUUID() })) : []
                    };
                    setProjects(prev => prev.map(p => p.id === tempId ? { ...p, ...formattedData } : p));
                    return formattedData;
                } else if (error) {
                    console.error("Error saving project to cloud:", error);
                    setProjects(prev => prev.map(p => p.id === tempId ? { ...p, id: tempId } : p));

                    if (error.code === '42P01') {
                        alert('⚠️ Cloud sync not set up yet. Project saved locally.\n\nTo enable cloud sync, run the SQL script in SUPABASE_SETUP.md');
                    } else {
                        alert(`⚠️ Project saved locally but cloud sync failed.\n\nError: ${error.message}`);
                    }

                    return { ...newProject, id: tempId };
                }
            } catch (err) {
                console.error("Unexpected error adding project:", err);
                setProjects(prev => prev.map(p => p.id === tempId ? { ...p, id: tempId } : p));
                alert('⚠️ Project saved locally but cloud sync failed.');
                return { ...newProject, id: tempId };
            }
        }

        return newProject;
    };

    const updateProject = async (id, updates) => {
        const fullUpdates = { ...updates, updated_at: new Date().toISOString() };
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...fullUpdates } : p));

        if (user) {
            // Only include columns that exist in the Supabase schema
            const dbUpdates = {};
            if (updates.title !== undefined) dbUpdates.title = updates.title;
            if (updates.description !== undefined) dbUpdates.description = updates.description;
            if (updates.status !== undefined) dbUpdates.status = updates.status;
            if (updates.progress !== undefined) dbUpdates.progress = updates.progress;
            if (updates.category !== undefined) dbUpdates.category = updates.category;
            if (updates.isPinned !== undefined) dbUpdates.is_pinned = updates.isPinned;
            if (updates.phases !== undefined) dbUpdates.phases = updates.phases;
            if (updates.columns !== undefined) dbUpdates.columns = updates.columns;
            if (updates.tasks !== undefined) dbUpdates.tasks = updates.tasks;
            if (updates.isAIGenerated !== undefined) dbUpdates.is_ai_generated = updates.isAIGenerated;
            // Note: 'tags' is excluded as it's not in the Supabase schema
            dbUpdates.updated_at = fullUpdates.updated_at;

            // Only update if there are valid DB fields
            if (Object.keys(dbUpdates).length > 0) {
                await supabase.from('projects').update(dbUpdates).eq('id', id);
            }
        }
    };

    // Phase operations
    const addPhase = async (projectId, phaseName, deadline = null) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const newPhase = {
            id: `phase-${crypto.randomUUID().slice(0, 8)}`,
            name: phaseName,
            color: ['purple', 'blue', 'teal', 'amber', 'pink', 'emerald'][project.phases.length % 6],
            order: project.phases.length,
            deadline: deadline || null
        };

        const updatedPhases = [...project.phases, newPhase];
        await updateProject(projectId, { phases: updatedPhases });
        return newPhase;
    };

    const updatePhase = async (projectId, phaseId, updates) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const updatedPhases = project.phases.map(phase =>
            phase.id === phaseId ? { ...phase, ...updates } : phase
        );
        await updateProject(projectId, { phases: updatedPhases });
    };

    const deletePhase = async (projectId, phaseId) => {
        const project = projects.find(p => p.id === projectId);
        if (!project || project.phases.length <= 1) return; // Keep at least one phase

        // Move tasks from deleted phase to first remaining phase
        const remainingPhases = project.phases.filter(p => p.id !== phaseId);
        const firstPhaseId = remainingPhases[0].id;

        const updatedTasks = project.tasks.map(task =>
            task.phaseId === phaseId ? { ...task, phaseId: firstPhaseId } : task
        );

        // Reorder remaining phases
        const reorderedPhases = remainingPhases.map((phase, idx) => ({
            ...phase,
            order: idx
        }));

        await updateProject(projectId, { phases: reorderedPhases, tasks: updatedTasks });
    };

    const reorderPhases = async (projectId, newPhasesOrder) => {
        const reorderedPhases = newPhasesOrder.map((phase, idx) => ({
            ...phase,
            order: idx
        }));
        await updateProject(projectId, { phases: reorderedPhases });
    };

    const addTask = async (projectId, task) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const newTask = {
            ...task,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            phaseId: task.phaseId || project?.phases?.[0]?.id || 'phase-1'
        };

        // Create the updated tasks array BEFORE updating state
        const updatedTasks = [...project.tasks, newTask];

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                tasks: updatedTasks
            };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: updatedTasks,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
                console.log('✅ Task synced to cloud');
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
        const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                tasks: updatedTasks
            };
        }));

        if (user) {
            try {
                await supabase.from('projects').update({
                    tasks: updatedTasks,
                    updated_at: new Date().toISOString()
                }).eq('id', projectId);
                console.log('✅ Task update synced to cloud');
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
        const doneColumn = project.columns.find(c => c.title.toLowerCase() === 'done');
        let progress = project.progress;

        if (doneColumn) {
            const totalTasks = updatedTasks.length;
            const doneTasks = updatedTasks.filter(t => t.columnId === doneColumn.id).length;
            progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
        }

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
                console.log('✅ Task deletion synced to cloud');
            } catch (error) {
                console.error('❌ Failed to sync task deletion to cloud:', error);
            }
        }
    };

    const deleteProject = async (id) => {
        setProjects(prev => prev.filter(p => p.id !== id));

        if (user) {
            await supabase.from('projects').delete().eq('id', id);
        }
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

        const doneColumn = project.columns.find(c => c.title.toLowerCase() === 'done');
        let progress = project.progress;

        if (doneColumn) {
            const totalTasks = updatedTasks.length;
            const doneTasks = updatedTasks.filter(t => t.columnId === doneColumn.id).length;
            progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
        }

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
                console.log('✅ Task move synced to cloud');
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

        // Recalculate progress
        const completedCount = updatedTasks.filter(t => t.completed).length;
        const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : 0;

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

    // Reorder tasks (for drag-and-drop)
    const reorderTasks = async (projectId, newTaskOrder) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        // Recalculate progress
        const completedCount = newTaskOrder.filter(t => t.completed).length;
        const progress = newTaskOrder.length > 0 ? Math.round((completedCount / newTaskOrder.length) * 100) : 0;

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

    return (
        <ProjectContext.Provider value={{
            projects,
            addProject,
            updateProject,
            addTask,
            updateTask,
            deleteTask,
            deleteProject,
            moveTask,
            setProjects,
            // Phase operations
            addPhase,
            updatePhase,
            deletePhase,
            reorderPhases,
            // Mind map operations
            toggleTaskComplete,
            addSubtask,
            toggleSubtaskComplete,
            deleteSubtask,
            reorderTasks
        }}>
            {children}
        </ProjectContext.Provider>
    );
};
