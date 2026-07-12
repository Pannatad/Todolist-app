const DEFAULT_MAX_PATHS = 3;
const PRIMARY_VIDEO_RESOURCE_TITLE = 'Primary video';

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

export { DEFAULT_MAX_PATHS, PRIMARY_VIDEO_RESOURCE_TITLE, readStoredJson, sanitizeTopicPayload };
