/**
 * YouTube Playlist Service
 * Parses YouTube playlist URLs and extracts video titles.
 * Uses RSS feeds (no API key) + optional YouTube Data API for durations.
 */
import { log } from '../utils/log.js';

const YT_API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;

/**
 * Extracts the playlist ID from various YouTube URL formats.
 * @param {string} url - YouTube playlist URL
 * @returns {string|null} - Playlist ID or null
 */
const extractPlaylistId = (url) => {
    try {
        const urlObj = new URL(url);
        // Handle youtube.com/playlist?list=PLxxxxxx
        if (urlObj.searchParams.has('list')) {
            return urlObj.searchParams.get('list');
        }
        // Handle youtu.be or other formats with list param
        const match = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    } catch {
        // Try regex fallback for malformed URLs
        const match = url.match(/list=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }
};

/**
 * Fetches full playlist videos using the YouTube Data API.
 * Supports pagination up to 200 videos.
 * @param {string} playlistId - The playlist ID
 * @returns {Promise<Array>} - Array of { title, videoUrl, videoId }
 */
const fetchFromAPI = async (playlistId) => {
    let videos = [];
    let nextPageToken = '';
    
    try {
        do {
            const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${YT_API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            
            if (!response.ok) {
                console.warn('YouTube API playlist fetch failed', await response.text());
                return []; // Fall back to RSS
            }
            
            const data = await response.json();
            
            data.items?.forEach(item => {
                const title = item.snippet?.title;
                const videoId = item.snippet?.resourceId?.videoId;
                if (title && videoId && title !== 'Private video' && title !== 'Deleted video') {
                    videos.push({
                        title,
                        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                        videoId,
                    });
                }
            });
            
            nextPageToken = data.nextPageToken;
            // Hard cap at 200 videos to keep things manageable
        } while (nextPageToken && videos.length < 200);
        
        return videos;
    } catch (error) {
        console.warn('YouTube API fetch error:', error);
        return [];
    }
};

/**
 * Fetches playlist video titles using YouTube's RSS/Atom feed.
 * This approach doesn't require an API key.
 * Note: YouTube RSS feeds only return the latest ~15 videos.
 * @param {string} playlistId - The playlist ID
 * @returns {Promise<Array>} - Array of { title, videoUrl, videoId }
 */
const fetchFromRSS = async (playlistId) => {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;

    // Use a CORS proxy to fetch the RSS feed from the browser
    const corsProxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`,
        `https://corsproxy.io/?${encodeURIComponent(feedUrl)}`,
    ];

    for (const proxyUrl of corsProxies) {
        try {
            const response = await fetch(proxyUrl, {
                signal: AbortSignal.timeout(10000)
            });

            if (!response.ok) continue;

            const text = await response.text();

            // Parse the XML/Atom feed
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(text, 'text/xml');

            const entries = xmlDoc.querySelectorAll('entry');
            if (entries.length === 0) continue;

            const videos = [];
            entries.forEach((entry) => {
                const title = entry.querySelector('title')?.textContent?.trim();
                const videoId = entry.querySelector('videoId')?.textContent?.trim() ||
                    entry.querySelector('id')?.textContent?.split(':').pop();

                if (title && videoId) {
                    videos.push({
                        title,
                        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
                        videoId,
                    });
                }
            });

            if (videos.length > 0) return videos;
        } catch (error) {
            console.warn(`CORS proxy failed: ${proxyUrl}`, error.message);
            continue;
        }
    }

    return [];
};

/**
 * Fallback: Use noembed.com to get individual video info.
 * This is slower but reliable for smaller playlists.
 * @param {string} videoUrl - YouTube video URL
 * @returns {Promise<Object|null>} - { title, videoUrl }
 */
const _fetchVideoInfo = async (videoUrl) => {
    try {
        const response = await fetch(
            `https://noembed.com/embed?url=${encodeURIComponent(videoUrl)}`,
            { signal: AbortSignal.timeout(5000) }
        );
        const data = await response.json();
        return data.title ? { title: data.title, videoUrl } : null;
    } catch {
        return null;
    }
};

/**
 * Strips common prefixes from video titles.
 * Many creators prefix every video with the playlist/course name, e.g.:
 *   "React Course - Lecture 1 - Intro" → "Lecture 1 - Intro"
 *   "CS50 2024 | Lecture 0 - Scratch" → "Lecture 0 - Scratch"
 * This function detects and removes such shared prefixes.
 * @param {Array} videos - Array of { title, videoUrl, videoId }
 * @returns {Array} - Same array with cleaned titles
 */
const cleanVideoTitles = (videos) => {
    if (videos.length < 2) return videos;

    const titles = videos.map(v => v.title);
    const separators = [' - ', ' | ', ': ', ' — ', ' – ', '| '];

    // Find the longest common prefix that ends at a separator
    let bestPrefix = '';
    for (const sep of separators) {
        // Split each title by the separator and check if they share a common first part
        const parts = titles.map(t => t.split(sep));
        // Only consider if all titles have this separator
        if (parts.every(p => p.length >= 2)) {
            const firstParts = parts.map(p => p[0]);
            // Check if all first parts are the same
            if (firstParts.every(p => p === firstParts[0])) {
                const candidate = firstParts[0] + sep;
                if (candidate.length > bestPrefix.length) {
                    bestPrefix = candidate;
                }
            }
        }
    }

    // If we found a shared prefix, strip it
    if (bestPrefix.length > 0) {
        log(`Stripping common prefix: "${bestPrefix}"`);
        return videos.map(v => ({
            ...v,
            title: v.title.startsWith(bestPrefix)
                ? v.title.slice(bestPrefix.length).trim()
                : v.title,
        }));
    }

    return videos;
};

/**
 * Parses an ISO 8601 duration string (e.g., "PT1H2M10S") into minutes.
 * @param {string} duration - ISO 8601 duration
 * @returns {number} - Duration in minutes
 */
const parseDurationToMinutes = (duration) => {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);

    return hours * 60 + minutes + Math.round(seconds / 60);
};

/**
 * Fetches video durations from the YouTube Data API if an API key is available.
 * @param {Array} videos - Array of { title, videoUrl, videoId }
 * @returns {Promise<Array>} - Videos with added estimated_time
 */
const fetchVideoDurations = async (videos) => {
    if (!YT_API_KEY || videos.length === 0) return videos;

    try {
        const videoIds = videos.map(v => v.videoId).join(',');
        const response = await fetch(
            `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${videoIds}&key=${YT_API_KEY}`,
            { signal: AbortSignal.timeout(10000) }
        );

        if (!response.ok) {
            console.warn('YouTube API duration fetch failed', await response.text());
            return videos; // Fallback to no duration
        }

        const data = await response.json();

        // Map durations back to videos
        const durationMap = {};
        data.items?.forEach(item => {
            durationMap[item.id] = parseDurationToMinutes(item.contentDetails.duration);
        });

        return videos.map(v => ({
            ...v,
            estimated_time: durationMap[v.videoId] || 0
        }));
    } catch (error) {
        console.warn('Error fetching video durations:', error);
        return videos; // Fallback to no duration
    }
};

/**
 * Main entry point: parses a YouTube playlist URL and returns video titles.
 * @param {string} url - YouTube playlist URL
 * @returns {Promise<{ videos: Array, error: string|null }>}
 */
export const parseYouTubePlaylist = async (url) => {
    // Validate URL
    if (!url || !url.trim()) {
        return { videos: [], error: 'Please enter a YouTube playlist URL.' };
    }

    const playlistId = extractPlaylistId(url);
    if (!playlistId) {
        return {
            videos: [],
            error: 'Could not find a playlist ID in the URL. Make sure the URL contains "list=..." parameter.'
        };
    }

    log(`Parsing YouTube playlist: ${playlistId}`);

    let videos = [];

    // 1. Try API first (can fetch >15 videos)
    if (YT_API_KEY) {
        log('Using YouTube API');
        videos = await fetchFromAPI(playlistId);
    }

    // 2. Try RSS feed fallback (fastest, no API key needed, but max 15)
    if (videos.length === 0) {
        log('Using RSS fallback');
        videos = await fetchFromRSS(playlistId);
    }

    if (videos.length > 0) {
        log(`Found ${videos.length} videos`);
        const cleaned = cleanVideoTitles(videos);
        // Fetch durations
        const withDurations = await fetchVideoDurations(cleaned);
        return { videos: withDurations, error: null };
    }

    // If RSS returned empty, it might be a private playlist or there's a CORS issue
    return {
        videos: [],
        error: 'Could not fetch playlist videos. Make sure the playlist is public and the URL is correct. YouTube RSS feeds may be temporarily unavailable.',
    };
};

/**
 * Validates if a string looks like a YouTube URL.
 * @param {string} url - Potential YouTube URL
 * @returns {boolean}
 */
export const isYouTubeUrl = (url) => {
    try {
        const urlObj = new URL(url);
        return (
            urlObj.hostname.includes('youtube.com') ||
            urlObj.hostname.includes('youtu.be')
        );
    } catch {
        return false;
    }
};

export default { parseYouTubePlaylist, isYouTubeUrl };
