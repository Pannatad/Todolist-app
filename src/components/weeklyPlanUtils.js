import { getColorForSubject } from '../constants/subjects';
import { toLocalDateKey } from '../utils/scheduleOccurrences';

const getMonday = (date) => {
    const copy = new Date(date);
    const day = copy.getDay();
    copy.setDate(copy.getDate() - day + (day === 0 ? -6 : 1));
    copy.setHours(0, 0, 0, 0);
    return copy;
};

const formatDuration = (minutes) => {
    if (!minutes) return '0m';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins ? `${hours}h ${mins}m` : `${hours}h`;
};

const formatTime = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const PATH_COLOR_HEX = {
    purple: '#8b5cf6',
    blue: '#3b82f6',
    teal: '#14b8a6',
    emerald: '#10b981',
    amber: '#f59e0b',
    pink: '#ec4899',
    red: '#ef4444',
    indigo: '#6366f1',
};

const getItemColor = (item) => {
    if (item.type === 'learning') {
        const color = PATH_COLOR_HEX[item.pathColor] || '#8b5cf6';
        return { color, bg: `${color}1F`, border: `${color}55` };
    }

    if (item.type === 'schedule' && item.color) {
        return { color: item.color, bg: `${item.color}1F`, border: `${item.color}55` };
    }

    const fallback = getColorForSubject(item.subject || item.category);
    return { color: fallback.color, bg: `${fallback.color}1F`, border: `${fallback.color}55` };
};

const toDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return toLocalDateKey(date);
};

const toTimeInputValue = (value) => {
    if (!value) return '09:00';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '09:00';
    return date.toTimeString().slice(0, 5);
};

export { formatDuration, formatTime, getItemColor, getMonday, toDateInputValue, toTimeInputValue };

