/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { toast } from '../ui/Toast';
import { log } from '../utils/log.js';

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

const DEFAULT_COLUMNS = [
    { id: 'c-1', title: 'Work tree 1' }
];

// Default phases for new projects
const DEFAULT_PHASES = [
    { id: 'phase-1', name: 'Stage 1', color: 'purple', order: 0, deadline: null, columns: DEFAULT_COLUMNS },
];

const cloneColumns = (columns = DEFAULT_COLUMNS) => (
    (Array.isArray(columns) && columns.length > 0 ? columns : DEFAULT_COLUMNS).map((column, index) => ({
        id: column.id || `c-${index + 1}`,
        title: column.title || `Work tree ${index + 1}`
    }))
);

const getColumnSignature = (columns = []) => (
    cloneColumns(columns).map((column) => `${column.id}:${column.title}`).join('|')
);

const getColumnsUsedInPhase = (tasks = [], phaseId, fallbackColumns = DEFAULT_COLUMNS, includeUnassignedTasks = false) => {
    const usedColumnIds = new Set(
        tasks
            .filter((task) => (task.phaseId || (includeUnassignedTasks ? phaseId : null)) === phaseId && task.columnId)
            .map((task) => task.columnId)
    );

    const usedColumns = cloneColumns(fallbackColumns).filter((column) => usedColumnIds.has(column.id));
    return usedColumns.length > 0 ? usedColumns : cloneColumns(DEFAULT_COLUMNS);
};

const normalizePhases = (phases, fallbackColumns = DEFAULT_COLUMNS, tasks = [], options = {}) => (
    (Array.isArray(phases) && phases.length > 0 ? phases : DEFAULT_PHASES).map((phase, index) => ({
        ...phase,
        id: phase.id || `phase-${index + 1}`,
        name: phase.name || `Stage ${index + 1}`,
        order: phase.order ?? index,
        columns: !options.ignorePhaseColumns && Array.isArray(phase.columns) && phase.columns.length > 0
            ? cloneColumns(phase.columns)
            : getColumnsUsedInPhase(tasks, phase.id || `phase-${index + 1}`, fallbackColumns, index === 0)
    }))
);

const getPhaseColumns = (project, phaseId) => {
    const phase = project?.phases?.find((item) => item.id === phaseId);
    return cloneColumns(phase?.columns || project?.columns || DEFAULT_COLUMNS);
};

const getDoneColumn = (project, phaseId = null) => (
    getPhaseColumns(project, phaseId).find((column) => column.id === 'c-4' || column.title?.toLowerCase() === 'done')
);

const calculateProgress = (tasks = [], project) => {
    if (tasks.length === 0) return 0;

    const doneColumnByPhase = new Map();
    const doneTasks = tasks.filter((task) => {
        if (task.completed === true) return true;

        if (!doneColumnByPhase.has(task.phaseId)) {
            doneColumnByPhase.set(task.phaseId, getDoneColumn(project, task.phaseId));
        }

        return doneColumnByPhase.get(task.phaseId)?.id === task.columnId;
    });

    return Math.round((doneTasks.length / tasks.length) * 100);
};

const getDefaultLocalProjects = () => ([
    {
        id: 'sample-1',
        title: 'Website Redesign',
        description: 'Overhaul the company website with new branding.',
        vision: 'Launch a clearer, faster company website that makes the new brand feel trustworthy and easy to understand.',
        notes: 'Keep homepage copy focused on the main offer. Confirm brand assets before final implementation.',
        deadline: null,
        status: 'active',
        progress: 35,
        isPinned: false,
        phases: DEFAULT_PHASES,
        columns: DEFAULT_COLUMNS,
        tasks: [
            { id: 't1', title: 'Design Mockups', description: 'Create Figma designs', priority: 'High', difficulty: 'Hard', columnId: 'c-1', phaseId: 'phase-1' },
            { id: 't2', title: 'Setup Repo', description: 'Initialize Git repository', priority: 'Medium', difficulty: 'Easy', columnId: 'c-1', phaseId: 'phase-1' },
            { id: 't3', title: 'Write Content', description: 'Draft copy for homepage', priority: 'Low', difficulty: 'Medium', columnId: 'c-1', phaseId: 'phase-1' }
        ]
    }
]);

const normalizeProjectRecord = (project) => {
    const projectColumns = cloneColumns(project?.columns);
    const rawPhases = Array.isArray(project?.phases) && project.phases.length > 0 ? project.phases : DEFAULT_PHASES;
    const tasks = Array.isArray(project?.tasks) ? project.tasks : [];
    const projectColumnSignature = getColumnSignature(projectColumns);
    const hasLegacySharedPhaseColumns = rawPhases.length > 1 && rawPhases.every((phase) => (
        Array.isArray(phase.columns)
        && phase.columns.length > 1
        && getColumnSignature(phase.columns) === projectColumnSignature
    ));
    const phases = normalizePhases(rawPhases, projectColumns, tasks, {
        ignorePhaseColumns: hasLegacySharedPhaseColumns
    });

    return {
        ...project,
        isPinned: project?.isPinned === true || project?.is_pinned === true,
        isAIGenerated: project?.isAIGenerated === true || project?.is_ai_generated === true,
        category: project?.category || 'General',
        vision: project?.vision || project?.description || '',
        notes: project?.notes || '',
        deadline: project?.deadline || null,
        phases,
        columns: projectColumns,
        tasks: tasks.length > 0
            ? tasks.map((task) => {
                const phaseId = task.phaseId || phases[0].id;
                const phaseColumns = getPhaseColumns({ ...project, phases, columns: projectColumns }, phaseId);

                return {
                    ...task,
                    id: task.id || crypto.randomUUID(),
                    phaseId,
                    columnId: task.columnId || phaseColumns[0]?.id || DEFAULT_COLUMNS[0].id
                };
            })
            : []
    };
};

const readLocalProjects = () => {
    try {
        const saved = localStorage.getItem('demon-projects');
        if (!saved) {
            return getDefaultLocalProjects();
        }

        return JSON.parse(saved).map(normalizeProjectRecord);
    } catch (error) {
        console.error('Failed to load projects', error);
        return getDefaultLocalProjects();
    }
};

export const ProjectProvider = ({ children }) => {
    const { user } = useAuth();

    const [projects, setProjects] = useState(() => readLocalProjects());

    // Load from Supabase
    const loadProjectsFromSupabase = useCallback(async () => {
        if (!user) return;

        try {
            const { data: projectsData } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (projectsData) {
                const formattedProjects = projectsData.map(normalizeProjectRecord);
                setProjects(formattedProjects);
            }
        } catch (error) {
            console.error("Error loading projects:", error);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadProjectsFromSupabase();
        } else {
            setProjects(readLocalProjects());
        }
    }, [loadProjectsFromSupabase, user]);

    useEffect(() => {
        if (!user || !supabase) return undefined;

        const channel = supabase
            .channel(`projects-${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'projects', filter: `user_id=eq.${user.id}` },
                () => {
                    loadProjectsFromSupabase().catch((error) => {
                        console.error('Error refreshing projects in realtime:', error);
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadProjectsFromSupabase, user]);

    // Save to LocalStorage (Guest Mode)
    useEffect(() => {
        if (!user) {
            localStorage.setItem('demon-projects', JSON.stringify(projects));
        }
    }, [projects, user]);

    const addProject = async (project) => {
        const projectColumns = cloneColumns(project.columns);
        const incomingTasks = Array.isArray(project.tasks) ? project.tasks : [];
        const projectPhases = normalizePhases(project.phases, projectColumns, incomingTasks);
        const projectTasks = Array.isArray(project.tasks)
            ? project.tasks.map((task) => ({
                ...task,
                id: task.id || crypto.randomUUID(),
                phaseId: task.phaseId || projectPhases[0].id,
                columnId: task.columnId || getPhaseColumns({ ...project, phases: projectPhases, columns: projectColumns }, task.phaseId || projectPhases[0].id)[0]?.id || projectColumns[0].id
            }))
            : [];

        const newProject = {
            ...project,
            id: user ? undefined : crypto.randomUUID(),
            user_id: user?.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            progress: 0,
            category: project.category || 'General',
            vision: project.vision || project.description || '',
            notes: project.notes || '',
            deadline: project.deadline || null,
            tags: project.tags || [],
            phases: projectPhases,
            columns: projectColumns,
            tasks: projectTasks
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
                    vision: newProject.vision || newProject.description || '',
                    notes: newProject.notes || '',
                    deadline: newProject.deadline || null,
                    status: newProject.status || 'active',
                    progress: newProject.progress || 0,
                    is_ai_generated: newProject.isAIGenerated || false,
                    category: newProject.category || 'General',
                    is_pinned: newProject.isPinned || false,
                    phases: newProject.phases,
                    columns: newProject.columns,
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
                        vision: data.vision || data.description || '',
                        notes: data.notes || '',
                        deadline: data.deadline || null,
                        phases: normalizePhases(data.phases, cloneColumns(data.columns), data.tasks),
                        columns: cloneColumns(data.columns),
                        tasks: Array.isArray(data.tasks) ? data.tasks.map(t => ({ ...t, id: t.id || crypto.randomUUID() })) : []
                    };
                    setProjects(prev => prev.map(p => p.id === tempId ? { ...p, ...formattedData } : p));
                    return formattedData;
                } else if (error) {
                    console.error("Error saving project to cloud:", error);
                    setProjects(prev => prev.map(p => p.id === tempId ? { ...p, id: tempId } : p));

                    if (error.code === '42P01') {
                        toast('Cloud sync is not set up. Project saved locally.', { tone: 'error' });
                    } else {
                        toast(`Project saved locally, but cloud sync failed: ${error.message}`, { tone: 'error' });
                    }

                    return { ...newProject, id: tempId };
                }
            } catch (err) {
                console.error("Unexpected error adding project:", err);
                setProjects(prev => prev.map(p => p.id === tempId ? { ...p, id: tempId } : p));
                toast('Project saved locally, but cloud sync failed.', { tone: 'error' });
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
            if (updates.vision !== undefined) dbUpdates.vision = updates.vision;
            if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
            if (updates.deadline !== undefined) dbUpdates.deadline = updates.deadline;
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
            deadline: deadline || null,
            columns: cloneColumns(DEFAULT_COLUMNS)
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

    const addColumn = async (projectId, columnTitle, phaseId = null) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const nextColumn = {
            id: `c-${crypto.randomUUID().slice(0, 8)}`,
            title: columnTitle
        };

        if (phaseId) {
            const updatedPhases = normalizePhases(project.phases, project.columns).map(phase => {
                if (phase.id !== phaseId) return phase;
                return { ...phase, columns: [...getPhaseColumns(project, phaseId), nextColumn] };
            });

            await updateProject(projectId, { phases: updatedPhases });
            return nextColumn;
        }

        const updatedColumns = [...cloneColumns(project.columns), nextColumn];
        await updateProject(projectId, { columns: updatedColumns });
        return nextColumn;
    };

    const updateColumn = async (projectId, columnId, updates, phaseId = null) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        if (phaseId) {
            const updatedPhases = normalizePhases(project.phases, project.columns).map(phase => {
                if (phase.id !== phaseId) return phase;
                return {
                    ...phase,
                    columns: getPhaseColumns(project, phaseId).map(column =>
                        column.id === columnId ? { ...column, ...updates } : column
                    )
                };
            });

            await updateProject(projectId, { phases: updatedPhases });
            return;
        }

        const updatedColumns = cloneColumns(project.columns).map(column =>
            column.id === columnId ? { ...column, ...updates } : column
        );

        await updateProject(projectId, { columns: updatedColumns });
    };

    const deleteColumn = async (projectId, columnId, phaseId = null) => {
        const project = projects.find(p => p.id === projectId);
        const columns = phaseId ? getPhaseColumns(project, phaseId) : cloneColumns(project?.columns);
        if (!project || columns.length <= 1) return;

        const remainingColumns = columns.filter(column => column.id !== columnId);
        const fallbackColumnId = remainingColumns[0].id;
        const updatedTasks = (project.tasks || []).map(task =>
            task.columnId === columnId && (!phaseId || task.phaseId === phaseId) ? { ...task, columnId: fallbackColumnId } : task
        );

        if (phaseId) {
            const updatedPhases = normalizePhases(project.phases, project.columns).map(phase =>
                phase.id === phaseId ? { ...phase, columns: remainingColumns } : phase
            );
            const progress = calculateProgress(updatedTasks, { ...project, phases: updatedPhases });

            await updateProject(projectId, {
                phases: updatedPhases,
                tasks: updatedTasks,
                progress
            });
            return;
        }

        const progress = calculateProgress(updatedTasks, { ...project, columns: remainingColumns });

        await updateProject(projectId, {
            columns: remainingColumns,
            tasks: updatedTasks,
            progress
        });
    };

    const addTask = async (projectId, task) => {
        const project = projects.find(p => p.id === projectId);
        if (!project) return;

        const newTask = {
            ...task,
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
        const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
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
            const { data, error } = await supabase
                .from('project_highlights')
                .select('task_id, subtask_id')
                .eq('project_id', projectId)
                .eq('user_id', user.id);

            if (error) throw error;

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
            const { error } = await supabase
                .from('project_highlights')
                .insert({
                    user_id: user.id,
                    project_id: projectId,
                    task_id: taskId,
                    subtask_id: subtaskId
                });

            if (error && error.code !== '23505') { // Ignore duplicate key errors
                throw error;
            }
            log('✅ Highlight added');
        } catch (error) {
            console.error('❌ Failed to add highlight:', error);
        }
    };

    // Remove a highlight
    const removeHighlight = async (projectId, taskId, subtaskId = null) => {
        if (!user) return;

        try {
            let query = supabase
                .from('project_highlights')
                .delete()
                .eq('user_id', user.id)
                .eq('project_id', projectId)
                .eq('task_id', taskId);

            if (subtaskId) {
                query = query.eq('subtask_id', subtaskId);
            } else {
                query = query.is('subtask_id', null);
            }

            const { error } = await query;
            if (error) throw error;
            log('✅ Highlight removed');
        } catch (error) {
            console.error('❌ Failed to remove highlight:', error);
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
            // Work tree operations
            addColumn,
            updateColumn,
            deleteColumn,
            // Mind map operations
            toggleTaskComplete,
            addSubtask,
            updateSubtask,
            toggleSubtaskComplete,
            deleteSubtask,
            reorderTasks,
            // Highlight operations
            loadProjectHighlights,
            addHighlight,
            removeHighlight
        }}>
            {children}
        </ProjectContext.Provider>
    );
};
