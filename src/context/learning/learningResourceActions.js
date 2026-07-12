import { useCallback } from 'react';
import { supabase } from '../../services/supabase';
import { PRIMARY_VIDEO_RESOURCE_TITLE } from '../learningUtils';

export const useLearningResourceActions = ({ resources, setResources, user }) => {
    const addResource = useCallback(async (resourceData) => {
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
            const { id: _id, ...dbResource } = newResource;
            const { data, error } = await supabase.from('topic_resources').insert([dbResource]).select().single();
            if (data) {
                setResources(prev => prev.map(r => r.id === tempId ? data : r));
            }
            if (error) console.error("Error adding resource:", error);
        }
    }, [resources, setResources, user]);

    const updateResource = useCallback(async (id, updates) => {
        setResources(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));

        if (user && supabase) {
            const { error } = await supabase.from('topic_resources').update(updates).eq('id', id);
            if (error) console.error("Error updating resource:", error);
        }
    }, [setResources, user]);

    const deleteResource = useCallback(async (id) => {
        setResources(prev => prev.filter(r => r.id !== id));

        if (user && supabase) {
            const { error } = await supabase.from('topic_resources').delete().eq('id', id);
            if (error) console.error("Error deleting resource:", error);
        }
    }, [setResources, user]);

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
    return {
        addResource,
        deleteResource,
        getPrimaryVideoResource,
        syncPrimaryVideoResource,
        updateResource,
    };
};
