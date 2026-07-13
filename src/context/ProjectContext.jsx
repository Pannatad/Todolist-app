/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { createProjectsRepo } from '../data/projectsRepo';
import { createProjectStructureActions } from './projects/projectStructureActions';
import { createProjectTaskActions } from './projects/projectTaskActions';
import { getDefaultLocalProjects, normalizeProjectRecord, readLocalProjects } from './projectUtils';

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

export const ProjectProvider = ({ children }) => {
    const { user } = useAuth();
    const userId = user?.id;
    const projectsRepo = useMemo(() => createProjectsRepo(userId ? { id: userId } : null, getDefaultLocalProjects), [userId]);

    const [projects, setProjects] = useState(() => readLocalProjects());

    // Load from Supabase
    const loadProjectsFromSupabase = useCallback(async () => {
        if (!user) return;

        try {
            const projectsData = await projectsRepo.list();

            if (projectsData) {
                const formattedProjects = projectsData.map(normalizeProjectRecord);
                setProjects(formattedProjects);
            }
        } catch (error) {
            console.error("Error loading projects:", error);
        }
    }, [projectsRepo, user]);

    useEffect(() => {
        if (user) {
            loadProjectsFromSupabase();
        } else {
            projectsRepo.list().then((data) => setProjects(data.map(normalizeProjectRecord)));
        }
    }, [loadProjectsFromSupabase, projectsRepo, user]);

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

    useEffect(() => {
        if (!user) localStorage.setItem('demon-projects', JSON.stringify(projects));
    }, [projects, user]);

    const structureActions = createProjectStructureActions({ projects, projectsRepo, setProjects, user });
    const taskActions = createProjectTaskActions({ projects, projectsRepo, setProjects, user });

    return (
        <ProjectContext.Provider value={{
            projects,
            setProjects,
            ...structureActions,
            ...taskActions,
        }}>
            {children}
        </ProjectContext.Provider>
    );
};
