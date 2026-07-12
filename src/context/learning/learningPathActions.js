import { supabase } from '../../services/supabase';

export const createLearningPathActions = ({
    learningPaths,
    resources,
    setLearningPaths,
    setResources,
    setTimeLogs,
    setTopics,
    timeLogs,
    topics,
    user,
}) => {
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
    return {
        addLearningPath,
        archiveLearningPath,
        deleteLearningPath,
        restoreLearningPath,
        updateLearningPath,
    };
};

