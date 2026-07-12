import { supabase } from '../../services/supabase';
import { sanitizeTopicPayload } from '../learningUtils';

export const createLearningTopicActions = ({
    setResources,
    setTimeLogs,
    setTopics,
    syncPrimaryVideoResource,
    topics,
    user,
}) => {
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
            const { id: _id, ...dbTopic } = newTopic;
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
                const dbTopics = newTopics.map((topic) => {
                    const dbTopic = { ...topic };
                    delete dbTopic.id;
                    return dbTopic;
                });
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

        let nextStatus = 'not_started';

        if (topic.status === 'not_started') {
            nextStatus = 'in_progress';
        } else if (topic.status === 'in_progress') {
            nextStatus = 'completed';
        } else if (topic.status === 'completed') {
            nextStatus = 'in_progress';
        } else if (topic.status === 'mastered') {
            nextStatus = 'completed';
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
    return {
        addTopic,
        addTopicsBatch,
        cycleTopicStatus,
        deleteTopic,
        moveTopicToSection,
        reorderTopics,
        toggleExerciseCompleted,
        toggleRevisionCompleted,
        toggleTopicFocus,
        updateTopic,
        updateTopicStatus,
    };
};
