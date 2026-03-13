import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';

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
    const [learningPaths, setLearningPaths] = useState(() => {
        try {
            const saved = localStorage.getItem('learning-paths');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse learning paths:", e);
            return [];
        }
    });

    const [topics, setTopics] = useState(() => {
        try {
            const saved = localStorage.getItem('learning-topics');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse learning topics:", e);
            return [];
        }
    });

    const [resources, setResources] = useState(() => {
        try {
            const saved = localStorage.getItem('learning-resources');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse learning resources:", e);
            return [];
        }
    });

    const [timeLogs, setTimeLogs] = useState(() => {
        try {
            const saved = localStorage.getItem('learning-time-logs');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse learning time logs:", e);
            return [];
        }
    });

    const [isLoading, setIsLoading] = useState(false);
    const [currentPathId, setCurrentPathId] = useState(null);

    // ── Load from Supabase ─────────────────────────────────
    const loadFromSupabase = async () => {
        if (!user || !supabase) return;
        setIsLoading(true);

        try {
            const [pathsRes, topicsRes, resourcesRes, timeLogsRes] = await Promise.all([
                supabase.from('learning_paths').select('*').order('display_order', { ascending: true }),
                supabase.from('learning_topics').select('*').order('display_order', { ascending: true }),
                supabase.from('topic_resources').select('*').order('display_order', { ascending: true }),
                supabase.from('topic_time_logs').select('*').order('logged_at', { ascending: false }),
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
    };

    useEffect(() => {
        if (user) {
            loadFromSupabase();
        }
    }, [user]);

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
    const addLearningPath = async (pathData) => {
        const newPath = {
            ...pathData,
            id: user ? undefined : `local-${Date.now()}`,
            user_id: user?.id,
            archived: false,
            display_order: learningPaths.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const tempId = `temp-${Date.now()}`;
        setLearningPaths(prev => [...prev, { ...newPath, id: user ? tempId : newPath.id }]);

        if (user && supabase) {
            const { id, ...dbPath } = newPath;
            const { data, error } = await supabase.from('learning_paths').insert([dbPath]).select().single();
            if (data) {
                setLearningPaths(prev => prev.map(p => p.id === tempId ? data : p));
            }
            if (error) console.error("Error adding learning path:", error);
        }
    };

    const updateLearningPath = async (id, updates) => {
        const updatedData = { ...updates, updated_at: new Date().toISOString() };
        setLearningPaths(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));

        if (user && supabase) {
            const { error } = await supabase.from('learning_paths').update(updatedData).eq('id', id);
            if (error) console.error("Error updating learning path:", error);
        }
    };

    const deleteLearningPath = async (id) => {
        // Also delete related topics and their resources
        const pathTopics = topics.filter(t => t.learning_path_id === id);
        const pathTopicIds = pathTopics.map(t => t.id);

        setLearningPaths(prev => prev.filter(p => p.id !== id));
        setTopics(prev => prev.filter(t => t.learning_path_id !== id));
        setResources(prev => prev.filter(r => !pathTopicIds.includes(r.topic_id)));
        setTimeLogs(prev => prev.filter(l => !pathTopicIds.includes(l.topic_id)));

        if (user && supabase) {
            const { error } = await supabase.from('learning_paths').delete().eq('id', id);
            if (error) console.error("Error deleting learning path:", error);
        }
    };

    const archiveLearningPath = async (id) => {
        await updateLearningPath(id, { archived: true });
    };

    // ── Topic CRUD ─────────────────────────────────────────
    const addTopic = async (topicData) => {
        const pathTopics = topics.filter(t => t.learning_path_id === topicData.learning_path_id);
        const newTopic = {
            ...topicData,
            id: user ? undefined : `local-${Date.now()}`,
            user_id: user?.id,
            status: topicData.status || 'not_started',
            section: topicData.section || 'future',
            difficulty: topicData.difficulty || 'beginner',
            estimated_time: topicData.estimated_time || 0,
            actual_time: 0,
            notes: topicData.notes || '',
            display_order: pathTopics.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const tempId = `temp-${Date.now()}`;
        setTopics(prev => [...prev, { ...newTopic, id: user ? tempId : newTopic.id }]);

        if (user && supabase) {
            const { id, ...dbTopic } = newTopic;
            const { data, error } = await supabase.from('learning_topics').insert([dbTopic]).select().single();
            if (data) {
                setTopics(prev => prev.map(t => t.id === tempId ? data : t));
            }
            if (error) console.error("Error adding topic:", error);
        }
    };

    const addTopicsBatch = async (topicsArray) => {
        const pathId = topicsArray[0]?.learning_path_id;
        if (!pathId) return;

        const existingCount = topics.filter(t => t.learning_path_id === pathId).length;
        const now = new Date().toISOString();

        const newTopics = topicsArray.map((topicData, index) => ({
            ...topicData,
            id: user ? undefined : `local-${Date.now()}-${index}`,
            user_id: user?.id,
            status: topicData.status || 'not_started',
            section: topicData.section || 'future',
            difficulty: topicData.difficulty || 'beginner',
            estimated_time: topicData.estimated_time || 0,
            actual_time: 0,
            notes: topicData.notes || '',
            display_order: existingCount + index,
            created_at: now,
            updated_at: now,
        }));

        // Optimistic update with temp IDs
        const tempTopics = newTopics.map((t, i) => ({
            ...t,
            id: user ? `temp-batch-${Date.now()}-${i}` : t.id,
        }));
        setTopics(prev => [...prev, ...tempTopics]);

        if (user && supabase) {
            try {
                const dbTopics = newTopics.map(({ id, ...rest }) => rest);
                const { data, error } = await supabase.from('learning_topics').insert(dbTopics).select();
                if (data) {
                    setTopics(prev => {
                        let updated = [...prev];
                        data.forEach((dbTopic, i) => {
                            const tempId = tempTopics[i]?.id;
                            updated = updated.map(t => t.id === tempId ? dbTopic : t);
                        });
                        return updated;
                    });
                }
                if (error) console.error('Error batch adding topics:', error);
            } catch (err) {
                console.error('Error batch adding topics:', err);
            }
        }
    };

    const updateTopic = async (id, updates) => {
        const updatedData = { ...updates, updated_at: new Date().toISOString() };
        setTopics(prev => prev.map(t => t.id === id ? { ...t, ...updatedData } : t));

        if (user && supabase) {
            const { error } = await supabase.from('learning_topics').update(updatedData).eq('id', id);
            if (error) console.error("Error updating topic:", error);
        }
    };

    const deleteTopic = async (id) => {
        setTopics(prev => prev.filter(t => t.id !== id));
        setResources(prev => prev.filter(r => r.topic_id !== id));
        setTimeLogs(prev => prev.filter(l => l.topic_id !== id));

        if (user && supabase) {
            const { error } = await supabase.from('learning_topics').delete().eq('id', id);
            if (error) console.error("Error deleting topic:", error);
        }
    };

    const updateTopicStatus = async (id, newStatus) => {
        const updates = { status: newStatus };

        if (newStatus === 'completed') {
            updates.completed_at = new Date().toISOString();
        } else if (newStatus === 'mastered') {
            updates.mastered_at = new Date().toISOString();
        }

        await updateTopic(id, updates);
    };

    const cycleTopicStatus = async (id) => {
        const topic = topics.find(t => t.id === id);
        if (!topic) return;

        const statusOrder = ['not_started', 'in_progress', 'completed', 'mastered'];
        const currentIndex = statusOrder.indexOf(topic.status);
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

        await updateTopicStatus(id, nextStatus);
    };

    const moveTopicToSection = async (id, newSection) => {
        await updateTopic(id, { section: newSection });
    };

    const reorderTopics = async (pathId, orderedIds) => {
        // Update display_order for each topic
        const updates = orderedIds.map((id, index) => ({ id, display_order: index }));
        setTopics(prev => prev.map(t => {
            const update = updates.find(u => u.id === t.id);
            return update ? { ...t, display_order: update.display_order } : t;
        }));

        if (user && supabase) {
            try {
                await Promise.all(
                    updates.map(({ id, display_order }) =>
                        supabase.from('learning_topics').update({ display_order }).eq('id', id)
                    )
                );
            } catch (error) {
                console.error('Error reordering topics:', error);
            }
        }
    };

    // ── Resource CRUD ──────────────────────────────────────
    const addResource = async (resourceData) => {
        const newResource = {
            ...resourceData,
            id: user ? undefined : `local-${Date.now()}`,
            user_id: user?.id,
            display_order: resources.filter(r => r.topic_id === resourceData.topic_id).length,
            created_at: new Date().toISOString(),
        };

        const tempId = `temp-${Date.now()}`;
        setResources(prev => [...prev, { ...newResource, id: user ? tempId : newResource.id }]);

        if (user && supabase) {
            const { id, ...dbResource } = newResource;
            const { data, error } = await supabase.from('topic_resources').insert([dbResource]).select().single();
            if (data) {
                setResources(prev => prev.map(r => r.id === tempId ? data : r));
            }
            if (error) console.error("Error adding resource:", error);
        }
    };

    const updateResource = async (id, updates) => {
        setResources(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

        if (user && supabase) {
            const { error } = await supabase.from('topic_resources').update(updates).eq('id', id);
            if (error) console.error("Error updating resource:", error);
        }
    };

    const deleteResource = async (id) => {
        setResources(prev => prev.filter(r => r.id !== id));

        if (user && supabase) {
            const { error } = await supabase.from('topic_resources').delete().eq('id', id);
            if (error) console.error("Error deleting resource:", error);
        }
    };

    // ── Time Tracking ──────────────────────────────────────
    const logTime = async (topicId, durationMinutes, notes = '') => {
        const newLog = {
            id: user ? undefined : `local-${Date.now()}`,
            topic_id: topicId,
            user_id: user?.id,
            duration_minutes: durationMinutes,
            notes,
            logged_at: new Date().toISOString(),
        };

        const tempId = `temp-${Date.now()}`;
        setTimeLogs(prev => [{ ...newLog, id: user ? tempId : newLog.id }, ...prev]);

        // Update topic's actual_time
        const topic = topics.find(t => t.id === topicId);
        if (topic) {
            const newActualTime = (topic.actual_time || 0) + durationMinutes;
            await updateTopic(topicId, { actual_time: newActualTime });
        }

        if (user && supabase) {
            const { id, ...dbLog } = newLog;
            const { data, error } = await supabase.from('topic_time_logs').insert([dbLog]).select().single();
            if (data) {
                setTimeLogs(prev => prev.map(l => l.id === tempId ? data : l));
            }
            if (error) console.error("Error logging time:", error);
        }
    };

    // ── Computed Values ────────────────────────────────────
    const getTopicsByPath = useCallback((pathId) => {
        return topics.filter(t => t.learning_path_id === pathId);
    }, [topics]);

    const getTopicsBySection = useCallback((pathId, section) => {
        return topics
            .filter(t => t.learning_path_id === pathId && t.section === section)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }, [topics]);

    const getResourcesByTopic = useCallback((topicId) => {
        return resources
            .filter(r => r.topic_id === topicId)
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }, [resources]);

    const getPathProgress = useCallback((pathId) => {
        const pathTopics = topics.filter(t => t.learning_path_id === pathId);
        if (pathTopics.length === 0) return 0;
        const completed = pathTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;
        return Math.round((completed / pathTopics.length) * 100);
    }, [topics]);

    const getPathTotalTime = useCallback((pathId) => {
        const pathTopicIds = topics.filter(t => t.learning_path_id === pathId).map(t => t.id);
        return timeLogs
            .filter(l => pathTopicIds.includes(l.topic_id))
            .reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    }, [topics, timeLogs]);

    const getTopicTotalTime = useCallback((topicId) => {
        return timeLogs
            .filter(l => l.topic_id === topicId)
            .reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
    }, [timeLogs]);

    const getCurrentFocusTopics = useCallback(() => {
        return topics
            .filter(t => t.section === 'current_focus')
            .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
    }, [topics]);

    const getLearningStreak = useCallback(() => {
        if (timeLogs.length === 0) return 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get unique dates with logged time
        const logDates = [...new Set(
            timeLogs.map(l => {
                const d = new Date(l.logged_at);
                d.setHours(0, 0, 0, 0);
                return d.getTime();
            })
        )].sort((a, b) => b - a); // most recent first

        let streak = 0;
        let checkDate = today.getTime();

        for (const logDate of logDates) {
            if (logDate === checkDate) {
                streak++;
                checkDate -= 86400000; // subtract one day
            } else if (logDate < checkDate) {
                // Check if yesterday (allow current day to not have a log yet)
                if (streak === 0 && logDate === checkDate - 86400000) {
                    streak++;
                    checkDate = logDate - 86400000;
                } else {
                    break;
                }
            }
        }

        return streak;
    }, [timeLogs]);

    const getWeeklyStats = useCallback(() => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400000);

        const weekLogs = timeLogs.filter(l => new Date(l.logged_at) >= weekAgo);
        const weekTopicsCompleted = topics.filter(t =>
            t.completed_at && new Date(t.completed_at) >= weekAgo
        ).length;

        return {
            totalMinutes: weekLogs.reduce((sum, l) => sum + (l.duration_minutes || 0), 0),
            sessionsCount: weekLogs.length,
            topicsCompleted: weekTopicsCompleted,
        };
    }, [timeLogs, topics]);

    const getActivePaths = useCallback(() => {
        return learningPaths.filter(p => !p.archived);
    }, [learningPaths]);

    const getCategories = useCallback(() => {
        const cats = learningPaths
            .map(p => p.category)
            .filter(c => c && c.trim() !== '');
        return [...new Set(cats)].sort();
    }, [learningPaths]);

    const getInProgressTopicsWithPaths = useCallback(() => {
        return topics
            .filter(t => t.status === 'in_progress')
            .map(t => {
                const path = learningPaths.find(p => p.id === t.learning_path_id);
                return { ...t, path };
            })
            .filter(t => t.path && !t.path.archived);
    }, [topics, learningPaths]);

    // ── Context Value ──────────────────────────────────────
    const value = {
        // State
        learningPaths,
        topics,
        resources,
        timeLogs,
        isLoading,
        currentPathId,
        setCurrentPathId,

        // Path operations
        addLearningPath,
        updateLearningPath,
        deleteLearningPath,
        archiveLearningPath,

        // Topic operations
        addTopic,
        addTopicsBatch,
        updateTopic,
        deleteTopic,
        updateTopicStatus,
        cycleTopicStatus,
        moveTopicToSection,
        reorderTopics,

        // Resource operations
        addResource,
        updateResource,
        deleteResource,

        // Time tracking
        logTime,

        // Computed
        getTopicsByPath,
        getTopicsBySection,
        getResourcesByTopic,
        getPathProgress,
        getPathTotalTime,
        getTopicTotalTime,
        getCurrentFocusTopics,
        getLearningStreak,
        getWeeklyStats,
        getActivePaths,
        getCategories,
        getInProgressTopicsWithPaths,
    };

    return (
        <LearningContext.Provider value={value}>
            {children}
        </LearningContext.Provider>
    );
};
