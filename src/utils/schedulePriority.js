// How much a schedule block matters. Level 2 is the default, so blocks saved
// before priorities existed keep their usual look.
export const SCHEDULE_PRIORITIES = [
    { id: 1, label: 'Optional', description: 'Fine to skip' },
    { id: 2, label: 'Should', description: 'Some impact if skipped' },
    { id: 3, label: 'Must', description: 'Most important today' }
];

export const DEFAULT_SCHEDULE_PRIORITY = 2;

export const normalizeSchedulePriority = (value) => {
    const level = Number(value);
    return level === 1 || level === 3 ? level : DEFAULT_SCHEDULE_PRIORITY;
};

export const schedulePriorityLabel = (value) => (
    SCHEDULE_PRIORITIES.find((option) => option.id === normalizeSchedulePriority(value)).label
);

// Class name for a block's visual weight; level 2 needs none.
export const schedulePriorityClass = (value) => {
    const level = normalizeSchedulePriority(value);
    return level === DEFAULT_SCHEDULE_PRIORITY ? '' : `is-priority-${level}`;
};
