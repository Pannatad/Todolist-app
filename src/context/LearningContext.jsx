import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../services/supabase';
import { toLocalDateKey } from '../utils/scheduleOccurrences';

// Default limit if not configured
const DEFAULT_MAX_PATHS = 3;
const PRIMARY_VIDEO_RESOURCE_TITLE = 'Primary video';

const LearningContext = createContext();

const readStoredJson = (key, fallback = []) => {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
        console.error(`Failed to parse ${key}:`, error);
        return fallback;
    }
};

const sanitizeTopicPayload = (topicData = {}) => {
    const { primary_video_url, ...topicPayload } = topicData;
    return {
        primaryVideoUrl: typeof primary_video_url === 'string' ? primary_video_url.trim() : '',
        topicPayload,
    };
};

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
        } catch (e) {
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
                return data;
            }
            if (error) console.error("Error adding learning path:", error);
        }

        return newPath;
    };

    const updateLearningPath = async (id, updates) => {
        const updatedData = { ...updates, updated_at: new Date().toISOString() };
        setLearningPaths(prev => prev.map(p => p.id === id ? { ...p, ...updatedData } : p));

        if (user && supabase) {
            const { error } = await supabase.from('learning_paths').update(updatedData).eq('id', id);
            if (error) console.error("Error updating learning path:", error);
        }

        return { id, ...updatedData };
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
            try {
                if (pathTopicIds.length > 0) {
                    await supabase.from('topic_resources').delete().in('topic_id', pathTopicIds);
                    await supabase.from('topic_time_logs').delete().in('topic_id', pathTopicIds);
                    await supabase.from('learning_topics').delete().in('id', pathTopicIds);
                }

                const { error } = await supabase.from('learning_paths').delete().eq('id', id);
                if (error) console.error("Error deleting learning path:", error);
            } catch (error) {
                console.error("Error deleting learning path:", error);
            }
        }
    };

    const archiveLearningPath = async (id) => {
        await updateLearningPath(id, { archived: true });
    };

    const restoreLearningPath = async (id) => {
        await updateLearningPath(id, { archived: false });
    };

    // ── Topic CRUD ─────────────────────────────────────────
    const addTopic = async (topicData) => {
        const { primaryVideoUrl, topicPayload } = sanitizeTopicPayload(topicData);
        const pathTopics = topics.filter(t => t.learning_path_id === topicPayload.learning_path_id);
        const newTopic = {
            ...topicPayload,
            id: user ? undefined : `local-${Date.now()}`,
            user_id: user?.id,
            status: topicPayload.status || 'not_started',
            section: topicPayload.section || 'future',
            difficulty: topicPayload.difficulty || 'beginner',
            estimated_time: topicPayload.estimated_time || 0,
            actual_time: 0,
            notes: topicPayload.notes || '',
            exercise_completed: false,
            revision_completed: false,
            prerequisite_topic_ids: topicPayload.prerequisite_topic_ids || [],
            display_order: pathTopics.length,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const tempId = `temp-${Date.now()}`;
        setTopics(prev => [...prev, { ...newTopic, id: user ? tempId : newTopic.id }]);

        let createdTopic = newTopic;

        if (user && supabase) {
            const { id, ...dbTopic } = newTopic;
            const { data, error } = await supabase.from('learning_topics').insert([dbTopic]).select().single();
            if (data) {
                setTopics(prev => prev.map(t => t.id === tempId ? data : t));
                createdTopic = data;
            }
            if (error) console.error("Error adding topic:", error);
        }

        if (primaryVideoUrl && createdTopic?.id) {
            await syncPrimaryVideoResource(createdTopic.id, primaryVideoUrl);
        }

        return createdTopic;
    };

    const addTopicsBatch = async (topicsArray) => {
        const pathId = topicsArray[0]?.learning_path_id;
        if (!pathId) return;

        const existingCount = topics.filter(t => t.learning_path_id === pathId).length;
        const now = new Date().toISOString();
        const sanitizedTopics = topicsArray.map((topicData) => sanitizeTopicPayload(topicData));

        const newTopics = sanitizedTopics.map(({ topicPayload }, index) => ({
            ...topicPayload,
            id: user ? undefined : `local-${Date.now()}-${index}`,
            user_id: user?.id,
            status: topicPayload.status || 'not_started',
            section: topicPayload.section || 'future',
            difficulty: topicPayload.difficulty || 'beginner',
            estimated_time: topicPayload.estimated_time || 0,
            actual_time: 0,
            notes: topicPayload.notes || '',
            exercise_completed: false,
            revision_completed: false,
            prerequisite_topic_ids: topicPayload.prerequisite_topic_ids || [],
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

        let createdTopics = tempTopics;

        if (user && supabase) {
            try {
                const dbTopics = newTopics.map(({ id, ...rest }) => rest);
                const { data, error } = await supabase.from('learning_topics').insert(dbTopics).select();
                if (data) {
                    createdTopics = data;
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

        await Promise.all(
            createdTopics.map((topic, index) => {
                const primaryVideoUrl = sanitizedTopics[index]?.primaryVideoUrl;
                if (!primaryVideoUrl || !topic?.id || String(topic.id).startsWith('temp-')) {
                    return Promise.resolve();
                }
                return syncPrimaryVideoResource(topic.id, primaryVideoUrl);
            })
        );

        return createdTopics;
    };

    const updateTopic = async (id, updates) => {
        const { topicPayload } = sanitizeTopicPayload(updates);
        const updatedData = { ...topicPayload, updated_at: new Date().toISOString() };
        setTopics(prev => prev.map(t => t.id === id ? { ...t, ...updatedData } : t));

        if (user && supabase) {
            const { error } = await supabase.from('learning_topics').update(updatedData).eq('id', id);
            if (error) console.error("Error updating topic:", error);
        }

        const currentTopic = topics.find((topic) => topic.id === id);
        return currentTopic ? { ...currentTopic, ...updatedData } : { id, ...updatedData };
    };

    const deleteTopic = async (id) => {
        setTopics(prev => prev.filter(t => t.id !== id));
        setResources(prev => prev.filter(r => r.topic_id !== id));
        setTimeLogs(prev => prev.filter(l => l.topic_id !== id));

        if (user && supabase) {
            try {
                await supabase.from('topic_resources').delete().eq('topic_id', id);
                await supabase.from('topic_time_logs').delete().eq('topic_id', id);
                const { error } = await supabase.from('learning_topics').delete().eq('id', id);
                if (error) console.error("Error deleting topic:", error);
            } catch (error) {
                console.error("Error deleting topic:", error);
            }
        }
    };

    const updateTopicStatus = async (id, newStatus) => {
        const updates = { status: newStatus };

        if (newStatus === 'completed') {
            updates.completed_at = new Date().toISOString();
            updates.mastered_at = null;
        } else if (newStatus === 'mastered') {
            updates.completed_at = topics.find((topic) => topic.id === id)?.completed_at || new Date().toISOString();
            updates.mastered_at = new Date().toISOString();
        }
        // Reset exercise/revision when going back from completed
        if (newStatus !== 'completed' && newStatus !== 'mastered') {
            updates.exercise_completed = false;
            updates.revision_completed = false;
            updates.completed_at = null;
            updates.mastered_at = null;
        }

        await updateTopic(id, updates);
    };

    const cycleTopicStatus = async (id) => {
        const topic = topics.find(t => t.id === id);
        if (!topic) return { ok: false, reason: 'Topic not found.' };

        const statusOrder = ['not_started', 'in_progress', 'completed', 'mastered'];
        const currentIndex = statusOrder.indexOf(topic.status);
        const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

        // Block mastered if exercise or revision not done
        if (nextStatus === 'mastered' && (!topic.exercise_completed || !topic.revision_completed)) {
            return {
                ok: false,
                reason: 'Complete both exercise and revision before marking this topic as mastered.',
            };
        }

        await updateTopicStatus(id, nextStatus);
        return { ok: true, status: nextStatus };
    };

    const toggleExerciseCompleted = async (id) => {
        const topic = topics.find(t => t.id === id);
        if (!topic || topic.status !== 'completed') return;

        const newVal = !topic.exercise_completed;
        await updateTopic(id, { exercise_completed: newVal });

        // Auto-advance to mastered if both done
        if (newVal && topic.revision_completed) {
            await updateTopicStatus(id, 'mastered');
        }
    };

    const toggleRevisionCompleted = async (id) => {
        const topic = topics.find(t => t.id === id);
        if (!topic || topic.status !== 'completed') return;

        const newVal = !topic.revision_completed;
        await updateTopic(id, { revision_completed: newVal });

        // Auto-advance to mastered if both done
        if (newVal && topic.exercise_completed) {
            await updateTopicStatus(id, 'mastered');
        }
    };

    const moveTopicToSection = async (id, newSection) => {
        await updateTopic(id, { section: newSection });
    };

    const toggleTopicFocus = async (id) => {
        const topic = topics.find((item) => item.id === id);
        if (!topic) return;

        const nextSection = topic.section === 'current_focus' ? 'future' : 'current_focus';
        await moveTopicToSection(id, nextSection);
        return nextSection;
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

    const getPrimaryVideoResource = useCallback((topicId) => {
        return resources.find((resource) =>
            resource.topic_id === topicId &&
            resource.resource_type === 'video' &&
            (
                resource.title === PRIMARY_VIDEO_RESOURCE_TITLE ||
                !resources.some((candidate) =>
                    candidate.topic_id === topicId &&
                    candidate.resource_type === 'video' &&
                    candidate.title === PRIMARY_VIDEO_RESOURCE_TITLE
                )
            )
        ) || null;
    }, [resources]);

    const syncPrimaryVideoResource = useCallback(async (topicId, rawUrl) => {
        const url = typeof rawUrl === 'string' ? rawUrl.trim() : '';
        const existingResource = getPrimaryVideoResource(topicId);

        if (!url) {
            if (existingResource) {
                await deleteResource(existingResource.id);
            }
            return null;
        }

        if (existingResource) {
            await updateResource(existingResource.id, {
                title: PRIMARY_VIDEO_RESOURCE_TITLE,
                url,
                resource_type: 'video',
            });
            return existingResource.id;
        }

        await addResource({
            topic_id: topicId,
            title: PRIMARY_VIDEO_RESOURCE_TITLE,
            url,
            resource_type: 'video',
        });
        return null;
    }, [addResource, deleteResource, getPrimaryVideoResource, updateResource]);

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
                return data;
            }
            if (error) console.error("Error logging time:", error);
        }

        return newLog;
    };

    const deleteTimeLog = async (logId) => {
        const logToDelete = timeLogs.find((log) => log.id === logId);
        if (!logToDelete) return;

        setTimeLogs((prev) => prev.filter((log) => log.id !== logId));

        const remainingTopicMinutes = timeLogs
            .filter((log) => log.topic_id === logToDelete.topic_id && log.id !== logId)
            .reduce((sum, log) => sum + (log.duration_minutes || 0), 0);

        await updateTopic(logToDelete.topic_id, { actual_time: remainingTopicMinutes });

        if (user && supabase) {
            const { error } = await supabase.from('topic_time_logs').delete().eq('id', logId);
            if (error) console.error('Error deleting time log:', error);
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

    const getTopicTimeLogs = useCallback((topicId) => {
        return timeLogs
            .filter((log) => log.topic_id === topicId)
            .sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at));
    }, [timeLogs]);

    const getPathProgress = useCallback((pathId) => {
        const pathTopics = topics.filter(t => t.learning_path_id === pathId);
        if (pathTopics.length === 0) return 0;
        const completed = pathTopics.filter(t => t.status === 'completed' || t.status === 'mastered').length;
        return Math.round((completed / pathTopics.length) * 100);
    }, [topics]);

    const getPathEstimatedTime = useCallback((pathId) => {
        return topics
            .filter((topic) => topic.learning_path_id === pathId)
            .reduce((sum, topic) => sum + (topic.estimated_time || 0), 0);
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

    // ── Path Dependency / Concurrent Limit ─────────────
    const getActiveInProgressPathCount = useCallback(() => {
        const activePaths = learningPaths.filter((path) => !path.archived);
        return activePaths.filter((path) => {
            const pathTopics = topics.filter((topic) => topic.learning_path_id === path.id);
            if (pathTopics.length === 0) return false;

            const hasStartedTopic = pathTopics.some((topic) => topic.status !== 'not_started');
            const hasIncompleteTopic = pathTopics.some((topic) => topic.status !== 'completed' && topic.status !== 'mastered');

            return hasStartedTopic && hasIncompleteTopic;
        }).length;
    }, [learningPaths, topics]);

    const canStartNewPath = useCallback(() => {
        return getActiveInProgressPathCount() < maxConcurrentPaths;
    }, [getActiveInProgressPathCount, maxConcurrentPaths]);

    // ── Timetable Helpers ──────────────────────────────
    const getTimetableForDay = useCallback((dayOfWeek, date = null) => {
        // Returns all timetable entries across active paths for a given day (0=Sun...6=Sat)
        // If date is provided, also filters by startDate/endDate range
        const activePaths = learningPaths.filter(p => !p.archived);
        const entries = [];
        const dateStr = date ? toLocalDateKey(date) : null;

        activePaths.forEach(path => {
            const timetable = path.timetable || [];
            timetable.forEach(slot => {
                if (slot.day !== dayOfWeek) return;

                // Check date range if present
                if (dateStr) {
                    if (slot.startDate && dateStr < slot.startDate) return;
                    if (slot.endDate && dateStr > slot.endDate) return;
                }

                entries.push({
                    ...slot,
                    pathId: path.id,
                    pathName: path.name,
                    pathIcon: path.icon,
                    pathColor: path.color,
                });
            });
        });
        return entries;
    }, [learningPaths]);

    const getAllTimetableEntries = useCallback(() => {
        const activePaths = learningPaths.filter(p => !p.archived);
        const entries = [];
        activePaths.forEach(path => {
            const timetable = path.timetable || [];
            timetable.forEach(slot => {
                entries.push({
                    ...slot,
                    pathId: path.id,
                    pathName: path.name,
                    pathIcon: path.icon,
                    pathColor: path.color,
                });
            });
        });
        return entries;
    }, [learningPaths]);

    // ── File Upload Helpers (Supabase Storage) ─────────
    const uploadMaterial = async (topicId, file) => {
        if (!user || !supabase) return null;

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = `${user.id}/${topicId}/${fileName}`;

        const { data, error } = await supabase.storage
            .from('learning-materials')
            .upload(filePath, file);

        if (error) {
            console.error('Error uploading material:', error);
            return null;
        }

        return {
            file_path: data.path,
            file_size: file.size,
            file_type: file.type || fileExt,
        };
    };

    const deleteMaterial = async (filePath) => {
        if (!user || !supabase || !filePath) return;

        const { error } = await supabase.storage
            .from('learning-materials')
            .remove([filePath]);

        if (error) console.error('Error deleting material:', error);
    };

    const getMaterialUrl = (filePath) => {
        if (!supabase || !filePath) return null;

        const { data } = supabase.storage
            .from('learning-materials')
            .getPublicUrl(filePath);

        return data?.publicUrl || null;
    };

    const getMaterialSignedUrl = async (filePath) => {
        if (!supabase || !filePath) return null;

        const { data, error } = await supabase.storage
            .from('learning-materials')
            .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (error) {
            console.error('Error getting signed URL:', error);
            return null;
        }
        return data?.signedUrl || null;
    };

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

        // Settings
        maxConcurrentPaths,
        setMaxConcurrentPaths,

        // Path operations
        addLearningPath,
        updateLearningPath,
        deleteLearningPath,
        archiveLearningPath,
        restoreLearningPath,

        // Topic operations
        addTopic,
        addTopicsBatch,
        updateTopic,
        deleteTopic,
        updateTopicStatus,
        cycleTopicStatus,
        moveTopicToSection,
        toggleTopicFocus,
        reorderTopics,
        toggleExerciseCompleted,
        toggleRevisionCompleted,

        // Resource operations
        addResource,
        updateResource,
        deleteResource,

        // Time tracking
        logTime,
        deleteTimeLog,

        // File operations
        uploadMaterial,
        deleteMaterial,
        getMaterialUrl,
        getMaterialSignedUrl,

        // Computed
        getTopicsByPath,
        getTopicsBySection,
        getResourcesByTopic,
        getTopicTimeLogs,
        getPathProgress,
        getPathEstimatedTime,
        getPathTotalTime,
        getTopicTotalTime,
        getCurrentFocusTopics,
        getLearningStreak,
        getWeeklyStats,
        getActivePaths,
        getCategories,
        getInProgressTopicsWithPaths,
        getActiveInProgressPathCount,
        canStartNewPath,
        getTimetableForDay,
        getAllTimetableEntries,
        getPrimaryVideoResource,
        syncPrimaryVideoResource,
    };

    return (
        <LearningContext.Provider value={value}>
            {children}
        </LearningContext.Provider>
    );
};
