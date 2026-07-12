const formatStudyTime = (minutes) => {
    if (!minutes) return '0h';
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const getLastStudiedLabel = (lastStudiedAt) => {
    if (!lastStudiedAt) return 'No study log yet';

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const studiedDate = new Date(lastStudiedAt);
    const studiedDay = new Date(studiedDate);
    studiedDay.setHours(0, 0, 0, 0);

    const dayDiff = Math.round((startOfToday - studiedDay) / 86400000);
    if (dayDiff === 0) return 'Studied today';
    if (dayDiff === 1) return 'Studied yesterday';
    if (dayDiff < 7) return `Studied ${dayDiff}d ago`;

    return studiedDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const DASHBOARD_SORT_OPTIONS = [
    { value: 'needs_attention', label: 'Needs Attention' },
    { value: 'progress_desc', label: 'Most Complete' },
    { value: 'progress_asc', label: 'Least Complete' },
    { value: 'recent', label: 'Recently Studied' },
    { value: 'studied_desc', label: 'Most Time Studied' },
    { value: 'name', label: 'Name' },
];

const PINNED_PATHS_STORAGE_KEY = 'learning-pinned-path-ids';

export { DASHBOARD_SORT_OPTIONS, formatStudyTime, getLastStudiedLabel, PINNED_PATHS_STORAGE_KEY };

