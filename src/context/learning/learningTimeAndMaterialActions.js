import { supabase } from '../../services/supabase';

export const createLearningTimeAndMaterialActions = ({
    setTimeLogs,
    timeLogs,
    topics,
    updateTopic,
    user,
}) => {
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
            const { id: _id, ...dbLog } = newLog;
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
    return {
        deleteMaterial,
        deleteTimeLog,
        getMaterialSignedUrl,
        getMaterialUrl,
        logTime,
        uploadMaterial,
    };
};
