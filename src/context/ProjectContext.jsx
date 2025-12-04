import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }) => {
    const { user } = useAuth();

    const [projects, setProjects] = useState(() => {
        try {
            const saved = localStorage.getItem('demon-projects');
            return saved ? JSON.parse(saved) : [
                {
                    id: 'sample-1',
                    title: 'Website Redesign',
                    description: 'Overhaul the company website with new branding.',
                    status: 'active',
                    progress: 35,
                    columns: [
                        { id: 'col-1', title: 'Backlog' },
                        { id: 'col-2', title: 'To Do' },
                        { id: 'col-3', title: 'In Progress' },
                        { id: 'col-4', title: 'Done' }
                    ],
                    tasks: [
                        { id: 't1', title: 'Design Mockups', description: 'Create Figma designs', priority: 'High', difficulty: 'Hard', columnId: 'col-3' },
                        { id: 't2', title: 'Setup Repo', description: 'Initialize Git repository', priority: 'Medium', difficulty: 'Easy', columnId: 'col-4' },
                        { id: 't3', title: 'Write Content', description: 'Draft copy for homepage', priority: 'Low', difficulty: 'Medium', columnId: 'col-2' }
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
                // Convert snake_case to camelCase
                const formattedProjects = projectsData.map(p => ({
                    ...p,
                    isAIGenerated: p.is_ai_generated,
                    isPinned: p.is_pinned,
                    category: p.category || 'General', // Default to General if null
                    // Ensure all tasks have IDs
                    tasks: Array.isArray(p.tasks) ? p.tasks.map(t => ({
                        ...t,
                        id: t.id || crypto.randomUUID()
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
            progress: 0,
            category: project.category || 'General',
            columns: project.columns || [
                { id: 'c-1', title: 'To Do' },
                { id: 'c-2', title: 'In Progress' },
                { id: 'c-3', title: 'Review' },
                { id: 'c-4', title: 'Done' }
            ],
            tasks: project.tasks || []
        };

        const tempId = crypto.randomUUID();
        setProjects(prev => [...prev, { ...newProject, id: user ? tempId : newProject.id }]);

        if (user) {
            try {
                // Convert to database format (snake_case)
                const { id, isAIGenerated, ...dbProject } = newProject;

                // Map camelCase to snake_case for database
                if (isAIGenerated !== undefined) {
                    dbProject.is_ai_generated = isAIGenerated;
                }
                if (newProject.isPinned !== undefined) {
                    dbProject.is_pinned = newProject.isPinned;
                }

                const { data, error } = await supabase.from('projects').insert([dbProject]).select().single();

                if (data) {
                    // Successfully saved to cloud - update with real ID
                    // Convert snake_case back to camelCase for state
                    const formattedData = {
                        ...data,
                        ...data,
                        isAIGenerated: data.is_ai_generated,
                        isPinned: data.is_pinned,
                        category: data.category || 'General',
                        // Ensure tasks have IDs if any returned
                        tasks: Array.isArray(data.tasks) ? data.tasks.map(t => ({ ...t, id: t.id || crypto.randomUUID() })) : []
                    };
                    setProjects(prev => prev.map(p => p.id === tempId ? { ...p, ...formattedData } : p));
                    return formattedData;
                } else if (error) {
                    console.error("Error saving project to cloud:", error);

                    // Keep the project locally even if cloud sync fails
                    setProjects(prev => prev.map(p => p.id === tempId ? { ...p, id: tempId } : p));

                    // Show user-friendly message
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
        setProjects(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

        if (user) {
            const dbUpdates = { ...updates };
            if (updates.isPinned !== undefined) {
                dbUpdates.is_pinned = updates.isPinned;
                delete dbUpdates.isPinned;
            }
            // Category is a direct mapping, so no change needed for it
            await supabase.from('projects').update(dbUpdates).eq('id', id);
        }
    };

    const addTask = async (projectId, task) => {
        // Always generate an ID for the new task
        const newTask = {
            ...task,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
        };

        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                tasks: [...p.tasks, newTask]
            };
        }));

        if (user) {
            const project = projects.find(p => p.id === projectId);
            if (project) {
                // Use the newTask with the generated ID
                const updatedTasks = [...project.tasks, newTask];
                await supabase.from('projects').update({ tasks: updatedTasks }).eq('id', projectId);
            }
        }
    };

    const updateTask = async (projectId, taskId, updates) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return {
                ...p,
                tasks: p.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
            };
        }));

        if (user) {
            const project = projects.find(p => p.id === projectId);
            if (project) {
                const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t);
                await supabase.from('projects').update({ tasks: updatedTasks }).eq('id', projectId);
            }
        }
    };

    const deleteTask = async (projectId, taskId) => {
        setProjects(prev => prev.map(project => {
            if (project.id !== projectId) return project;

            const updatedTasks = project.tasks.filter(t => t.id !== taskId);
            const doneColumn = project.columns.find(c => c.title.toLowerCase() === 'done');
            let progress = project.progress;

            if (doneColumn) {
                const totalTasks = updatedTasks.length;
                const doneTasks = updatedTasks.filter(t => t.columnId === doneColumn.id).length;
                progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
            }

            return { ...project, tasks: updatedTasks, progress };
        }));

        if (user) {
            const project = projects.find(p => p.id === projectId);
            if (project) {
                const updatedTasks = project.tasks.filter(t => t.id !== taskId);
                const doneColumn = project.columns.find(c => c.title.toLowerCase() === 'done');
                let progress = project.progress;

                if (doneColumn) {
                    const totalTasks = updatedTasks.length;
                    const doneTasks = updatedTasks.filter(t => t.columnId === doneColumn.id).length;
                    progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
                }

                await supabase.from('projects').update({ tasks: updatedTasks, progress }).eq('id', projectId);
            }
        }
    };

    const deleteProject = async (id) => {
        setProjects(prev => prev.filter(p => p.id !== id));

        if (user) {
            await supabase.from('projects').delete().eq('id', id);
        }
    };

    const moveTask = async (projectId, taskId, newColumnId) => {
        setProjects(prev => prev.map(project => {
            if (project.id !== projectId) return project;

            const updatedTasks = project.tasks.map(task =>
                task.id === taskId ? { ...task, columnId: newColumnId } : task
            );

            const doneColumn = project.columns.find(c => c.title.toLowerCase() === 'done');
            let progress = project.progress;

            if (doneColumn) {
                const totalTasks = updatedTasks.length;
                const doneTasks = updatedTasks.filter(t => t.columnId === doneColumn.id).length;
                progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
            }

            return { ...project, tasks: updatedTasks, progress };
        }));

        if (user) {
            const project = projects.find(p => p.id === projectId);
            if (project) {
                const updatedTasks = project.tasks.map(task =>
                    task.id === taskId ? { ...task, columnId: newColumnId } : task
                );

                const doneColumn = project.columns.find(c => c.title.toLowerCase() === 'done');
                let progress = project.progress;

                if (doneColumn) {
                    const totalTasks = updatedTasks.length;
                    const doneTasks = updatedTasks.filter(t => t.columnId === doneColumn.id).length;
                    progress = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
                }

                await supabase.from('projects').update({ tasks: updatedTasks, progress }).eq('id', projectId);
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
            setProjects
        }}>
            {children}
        </ProjectContext.Provider>
    );
};
