import { toast } from '../../ui/Toast';
import {
    calculateProgress,
    cloneColumns,
    DEFAULT_COLUMNS,
    getPhaseColumns,
    normalizePhases,
} from '../projectUtils';

export const createProjectStructureActions = ({ projects, projectsRepo, setProjects, user }) => {
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

        if (!user) {
            await projectsRepo.create(newProject);
            return newProject;
        }

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

                const data = await projectsRepo.create(dbProject);
                const error = null;

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

        if (!user) {
            await projectsRepo.update(id, fullUpdates);
            return;
        }

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
                await projectsRepo.update(id, dbUpdates);
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

    return {
        addProject,
        addPhase,
        addColumn,
        deleteColumn,
        deletePhase,
        reorderPhases,
        updateColumn,
        updatePhase,
        updateProject,
    };
};

