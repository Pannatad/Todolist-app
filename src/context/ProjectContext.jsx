/* eslint-disable react-refresh/only-export-components, react-hooks/set-state-in-effect */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { createProjectStructureActions } from './projects/projectStructureActions';
import { createProjectTaskActions } from './projects/projectTaskActions';
import { normalizeProjectRecord, readLocalProjects } from './projectUtils';

const ProjectContext = createContext();

export const useProject = () => useContext(ProjectContext);

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

    const structureActions = createProjectStructureActions({ projects, setProjects, user });
    const taskActions = createProjectTaskActions({ projects, setProjects, user });

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
