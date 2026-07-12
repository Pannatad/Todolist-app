import { Check, Star, Zap } from 'lucide-react';

const STATUS_CONFIG = {
    not_started: {
        label: 'Not Started',
        dot: 'bg-gray-50 border-2 border-dashed border-gray-300 hover:border-gray-400',
        dotInner: <div className="w-3 h-3 rounded-full bg-gray-300" />,
        textClass: 'text-gray-800',
    },
    in_progress: {
        label: 'In Progress',
        dot: 'bg-amber-50 border border-amber-300 hover:bg-amber-100',
        dotInner: <Zap size={18} className="text-amber-500" />,
        textClass: 'text-gray-800',
        rowHighlight: 'border-l-4 border-l-amber-400 bg-amber-50/30',
    },
    completed: {
        label: 'Completed',
        dot: 'bg-emerald-50 border border-emerald-300 hover:bg-emerald-100',
        dotInner: <Check size={18} className="text-emerald-500" strokeWidth={3} />,
        textClass: 'text-gray-800',
        rowHighlight: 'border-l-4 border-l-emerald-400 bg-emerald-50/20',
    },
    mastered: {
        label: 'Mastered',
        dot: 'bg-yellow-50 border border-yellow-300 hover:bg-yellow-100 shadow-[0_0_10px_rgba(234,179,8,0.15)]',
        dotInner: <Star size={18} className="text-yellow-500 fill-yellow-400" />,
        textClass: 'text-gray-400 line-through',
        rowHighlight: 'ring-1 ring-yellow-300/50 border-yellow-200',
    },
};

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TOPIC_FILTERS = [
    { id: 'all', label: 'All' },
    { id: 'focus', label: 'Focus' },
    { id: 'active', label: 'Active' },
    { id: 'done', label: 'Done' },
];

const VIDEO_URL_PATTERN = /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/watch\?v=|youtube\.com\/shorts\/|youtube\.com\/embed\/|youtu\.be\/|vimeo\.com\/|dailymotion\.com\/video\/)[^\s)]+/i;

const findVideoUrlInText = (value) => {
    if (typeof value !== 'string') return '';
    return value.match(VIDEO_URL_PATTERN)?.[0]?.replace(/[.,;!?]+$/, '') || '';
};

export { DAYS_SHORT, findVideoUrlInText, STATUS_CONFIG, TOPIC_FILTERS };

