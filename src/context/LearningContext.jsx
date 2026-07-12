/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { createLearningPathActions } from './learning/learningPathActions';
import { useLearningResourceActions } from './learning/learningResourceActions';
import { createLearningTimeAndMaterialActions } from './learning/learningTimeAndMaterialActions';
import { createLearningTopicActions } from './learning/learningTopicActions';
import { useLearningSelectors } from './learning/useLearningSelectors';
import { DEFAULT_MAX_PATHS, readStoredJson } from './learningUtils';

const LearningContext = createContext();

export const useLearning = () => {
    const context = useContext(LearningContext);
    if (!context) {
        throw new Error('useLearning must be used within LearningProvider');
    }
    return context;
};

export const LearningProvider = ({ children }) => {
    const { user } = useAuth();

    // ── State ──────────────────────────────────────────────
    const [learningPaths, setLearningPaths] = useState(() => readStoredJson('learning-paths'));
    const [topics, setTopics] = useState(() => readStoredJson('learning-topics'));
    const [resources, setResources] = useState(() => readStoredJson('learning-resources'));
    const [timeLogs, setTimeLogs] = useState(() => readStoredJson('learning-time-logs'));

    const [isLoading, setIsLoading] = useState(false);
    const [currentPathId, setCurrentPathId] = useState(null);

    // Configurable Settings
    const [maxConcurrentPaths, setMaxConcurrentPaths] = useState(() => {
        try {
            const saved = localStorage.getItem('learning-max-concurrent');
            return saved ? parseInt(saved, 10) : DEFAULT_MAX_PATHS;
        } catch {
            return DEFAULT_MAX_PATHS;
        }
    });

    // Save settings when they change
    useEffect(() => {
        localStorage.setItem('learning-max-concurrent', maxConcurrentPaths.toString());
    }, [maxConcurrentPaths]);

    const loadFromLocalStorage = useCallback(() => {
        setLearningPaths(readStoredJson('learning-paths'));
        setTopics(readStoredJson('learning-topics'));
        setResources(readStoredJson('learning-resources'));
        setTimeLogs(readStoredJson('learning-time-logs'));
        setIsLoading(false);
    }, []);

    // ── Load from Supabase ─────────────────────────────────
    const loadFromSupabase = useCallback(async () => {
        if (!user || !supabase) return;
        setIsLoading(true);

        try {
            const [pathsRes, topicsRes, resourcesRes, timeLogsRes] = await Promise.all([
                supabase.from('learning_paths').select('*').eq('user_id', user.id).order('display_order', { ascending: true }),
                supabase.from('learning_topics').select('*').eq('user_id', user.id).order('display_order', { ascending: true }),
                supabase.from('topic_resources').select('*').eq('user_id', user.id).order('display_order', { ascending: true }),
                supabase.from('topic_time_logs').select('*').eq('user_id', user.id).order('logged_at', { ascending: false }),
            ]);

            if (pathsRes.data) setLearningPaths(pathsRes.data);
            if (topicsRes.data) setTopics(topicsRes.data);
            if (resourcesRes.data) setResources(resourcesRes.data);
            if (timeLogsRes.data) setTimeLogs(timeLogsRes.data);
        } catch (error) {
            console.error("Error loading learning data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadFromSupabase();
        } else {
            loadFromLocalStorage();
        }
    }, [loadFromLocalStorage, loadFromSupabase, user]);

    useEffect(() => {
        if (!user || !supabase) return undefined;

        const channel = supabase
            .channel(`learning-${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'learning_paths', filter: `user_id=eq.${user.id}` },
                () => {
                    loadFromSupabase().catch((error) => {
                        console.error('Error refreshing learning paths in realtime:', error);
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'learning_topics', filter: `user_id=eq.${user.id}` },
                () => {
                    loadFromSupabase().catch((error) => {
                        console.error('Error refreshing learning topics in realtime:', error);
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'topic_resources', filter: `user_id=eq.${user.id}` },
                () => {
                    loadFromSupabase().catch((error) => {
                        console.error('Error refreshing learning resources in realtime:', error);
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'topic_time_logs', filter: `user_id=eq.${user.id}` },
                () => {
                    loadFromSupabase().catch((error) => {
                        console.error('Error refreshing learning time logs in realtime:', error);
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [loadFromSupabase, user]);

    useEffect(() => {
        if (currentPathId && !learningPaths.some((path) => path.id === currentPathId)) {
            setCurrentPathId(null);
        }
    }, [currentPathId, learningPaths]);

    // ── Save to localStorage (Guest Mode) ──────────────────
    useEffect(() => {
        if (!user) {
            localStorage.setItem('learning-paths', JSON.stringify(learningPaths));
            localStorage.setItem('learning-topics', JSON.stringify(topics));
            localStorage.setItem('learning-resources', JSON.stringify(resources));
            localStorage.setItem('learning-time-logs', JSON.stringify(timeLogs));
        }
    }, [learningPaths, topics, resources, timeLogs, user]);

    // ── Learning Path CRUD ─────────────────────────────────
    const resourceActions = useLearningResourceActions({ resources, setResources, user });
    const topicActions = createLearningTopicActions({
        resources,
        setResources,
        setTimeLogs,
        setTopics,
        syncPrimaryVideoResource: resourceActions.syncPrimaryVideoResource,
        timeLogs,
        topics,
        user,
    });
    const pathActions = createLearningPathActions({
        learningPaths,
        resources,
        setLearningPaths,
        setResources,
        setTimeLogs,
        setTopics,
        timeLogs,
        topics,
        user,
    });
    const timeAndMaterialActions = createLearningTimeAndMaterialActions({
        setTimeLogs,
        timeLogs,
        topics,
        updateTopic: topicActions.updateTopic,
        user,
    });
    const selectors = useLearningSelectors({
        learningPaths,
        maxConcurrentPaths,
        resources,
        timeLogs,
        topics,
    });

    const value = {
        learningPaths,
        topics,
        resources,
        timeLogs,
        isLoading,
        currentPathId,
        setCurrentPathId,
        maxConcurrentPaths,
        setMaxConcurrentPaths,
        ...pathActions,
        ...topicActions,
        ...resourceActions,
        ...timeAndMaterialActions,
        ...selectors,
    };

    return (
        <LearningContext.Provider value={value}>
            {children}
        </LearningContext.Provider>
    );
};
