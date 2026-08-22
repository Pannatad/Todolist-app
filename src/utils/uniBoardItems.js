import { getScheduleItemsForDate } from './scheduleOccurrences.js';

const TASK_UNI_KINDS = new Set(['task', 'payment', 'registration', 'meeting', 'report', 'deadline']);
const SCHEDULE_UNI_KINDS = new Set(['exam', 'quiz', 'event']);
const DAY_MS = 24 * 60 * 60 * 1000;
const ALL_AGENDA_BASELINE_DAYS = 365;

const readWorkspace = (record) => record?.workspace ?? 'personal';
const readUniKind = (record) => record?.uniKind ?? record?.uni_kind ?? null;
const readIsMilestone = (record) => record?.isMilestone ?? record?.is_milestone ?? false;
const readCompleted = (record) => Boolean(
    record?.completed === true
    || record?.status === 'completed'
    || record?.status === 'done'
    || record?.status === 'harvested'
    || record?.completedAt
    || record?.completed_at
);

const isUniversityRecord = (record, allowedKinds) => (
    readWorkspace(record) === 'university' && allowedKinds.has(readUniKind(record))
);

const localDate = (year, month, day) => {
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year
        && date.getMonth() === month - 1
        && date.getDate() === day
        ? date
        : null;
};

const parseDate = (value, dateOnlyEnd = false) => {
    if (!value) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : new Date(value);
    }

    if (typeof value === 'string') {
        const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dateOnlyMatch) {
            const date = localDate(
                Number(dateOnlyMatch[1]),
                Number(dateOnlyMatch[2]),
                Number(dateOnlyMatch[3])
            );
            if (!date) return null;
            if (dateOnlyEnd) date.setHours(23, 59, 59, 999);
            return date;
        }
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfDay = (value) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    return date;
};

const endOfDay = (value) => {
    const date = startOfDay(value);
    date.setHours(23, 59, 59, 999);
    return date;
};

const addDays = (value, days) => {
    const date = new Date(value);
    date.setDate(date.getDate() + days);
    return date;
};

const localDateKey = (value) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const itemId = (record) => record?.id ?? '';

const buildItem = (source, record, occursAt, dateKey = null) => ({
    key: `${source}:${itemId(record)}${dateKey ? `:${dateKey}` : ''}`,
    id: itemId(record),
    source,
    title: record?.title ?? '',
    uniKind: readUniKind(record),
    subject: record?.subject ?? record?.category ?? null,
    occursAt: occursAt ? new Date(occursAt) : null,
    completed: readCompleted(record),
    isMilestone: readIsMilestone(record) === true,
    record
});

const compareItems = (left, right) => {
    const leftTime = left.occursAt?.getTime();
    const rightTime = right.occursAt?.getTime();
    if (leftTime === undefined && rightTime !== undefined) return 1;
    if (leftTime !== undefined && rightTime === undefined) return -1;
    if (leftTime !== rightTime) return (leftTime ?? 0) - (rightTime ?? 0);
    if (left.source !== right.source) return left.source === 'task' ? -1 : 1;
    if (String(left.id) !== String(right.id)) return String(left.id).localeCompare(String(right.id));
    return left.title.localeCompare(right.title);
};

const normalizedDays = (value, fallback) => {
    const days = Number(value);
    return Number.isFinite(days) && days > 0 ? Math.floor(days) : fallback;
};

const isAllAgendaDays = (value) => value === 'all' || value === null;

const getAllAgendaDays = (today, taskItems, scheduleRecords) => {
    const knownDates = [
        ...taskItems.map((item) => item.occursAt),
        ...scheduleRecords.map((record) => parseDate(record.startTime ?? record.start_time)),
        ...scheduleRecords.map((record) => parseDate(record.recurrenceEndDate ?? record.recurrence_end_date, true)),
    ].filter((date) => date && date >= today);

    const latestDate = knownDates.reduce((latest, date) => (
        !latest || date > latest ? date : latest
    ), null);
    const baselineEnd = addDays(today, ALL_AGENDA_BASELINE_DAYS - 1);
    if (!latestDate || latestDate <= baselineEnd) return ALL_AGENDA_BASELINE_DAYS;

    return Math.max(
        ALL_AGENDA_BASELINE_DAYS,
        Math.ceil((startOfDay(latestDate).getTime() - today.getTime()) / DAY_MS) + 1,
    );
};

const buildScheduleOccurrences = (records, firstDay, days) => {
    const occurrences = [];
    const seen = new Set();

    for (let offset = 0; offset < days; offset += 1) {
        const date = addDays(firstDay, offset);
        const dateKey = localDateKey(date);
        getScheduleItemsForDate(records, date).forEach((record) => {
            const occursAt = parseDate(record.displayTime ?? record.startTime ?? record.start_time);
            if (!occursAt) return;

            const occurrenceKey = `${itemId(record)}:${dateKey}`;
            if (seen.has(occurrenceKey)) return;
            seen.add(occurrenceKey);
            occurrences.push(buildItem('schedule', record, occursAt, dateKey));
        });
    }

    return occurrences;
};

const buildDirectScheduleItems = (records) => records
    .filter((record) => (record?.recurrenceType || record?.recurrence_type || 'none') === 'none')
    .map((record) => {
        const occursAt = parseDate(record?.startTime ?? record?.start_time);
        return occursAt ? buildItem('schedule', record, occursAt, localDateKey(occursAt)) : null;
    })
    .filter(Boolean);

const uniqueItems = (items) => [...new Map(items.map((item) => [item.key, item])).values()];

const itemDateKey = (item) => item.occursAt ? localDateKey(item.occursAt) : null;

export const buildUniBoardViewModel = ({
    tasks = [],
    scheduleItems = [],
    now = new Date(),
    agendaDays = 14,
    milestoneDays = 120
} = {}) => {
    const current = parseDate(now) || new Date();
    const today = startOfDay(current);
    const todayKey = localDateKey(today);
    const milestoneLength = normalizedDays(milestoneDays, 120);

    const universityTasks = tasks.filter((task) => isUniversityRecord(task, TASK_UNI_KINDS));
    const universitySchedules = scheduleItems.filter((item) => isUniversityRecord(item, SCHEDULE_UNI_KINDS));
    const taskItems = universityTasks.map((task) => buildItem(
        'task',
        task,
        parseDate(task.deadline, true),
        parseDate(task.deadline, true) ? localDateKey(parseDate(task.deadline, true)) : null
    ));
    const agendaLength = isAllAgendaDays(agendaDays)
        ? getAllAgendaDays(today, taskItems, universitySchedules)
        : normalizedDays(agendaDays, 14);
    const agendaEnd = endOfDay(addDays(today, agendaLength - 1));
    const milestoneEnd = endOfDay(addDays(today, milestoneLength - 1));
    const scheduleItemsExpanded = buildScheduleOccurrences(
        universitySchedules,
        today,
        Math.max(agendaLength, milestoneLength, 7)
    );
    const futureScheduleItems = uniqueItems([
        ...scheduleItemsExpanded,
        ...buildDirectScheduleItems(universitySchedules)
    ]);

    const incompleteTasks = taskItems.filter((item) => !item.completed);
    const incompleteScheduleItems = scheduleItemsExpanded.filter((item) => !item.completed);

    const nextUp = [...incompleteTasks, ...futureScheduleItems]
        .filter((item) => !item.completed && item.occursAt && item.occursAt >= current)
        .sort(compareItems)

    const agendaByDate = new Map();
    const addToAgenda = (item, dateKey) => {
        if (!dateKey || dateKey < todayKey || dateKey > localDateKey(agendaEnd)) return;
        const group = agendaByDate.get(dateKey) || {
            dateKey,
            date: startOfDay(item.occursAt),
            items: []
        };
        group.items.push(item);
        agendaByDate.set(dateKey, group);
    };

    incompleteTasks.forEach((item) => {
        const dateKey = itemDateKey(item);
        if (item.occursAt && item.occursAt >= current && item.occursAt <= agendaEnd) addToAgenda(item, dateKey);
    });
    incompleteScheduleItems
        .filter((item) => item.occursAt >= current && item.occursAt <= agendaEnd)
        .forEach((item) => addToAgenda(item, itemDateKey(item)));

    const agendaGroups = [...agendaByDate.values()]
        .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
        .map((group) => ({
            ...group,
            items: group.items.sort(compareItems)
        }));

    const outstandingTasks = incompleteTasks.sort((left, right) => {
        const leftOverdue = Boolean(left.occursAt && left.occursAt < current);
        const rightOverdue = Boolean(right.occursAt && right.occursAt < current);
        if (leftOverdue !== rightOverdue) return leftOverdue ? -1 : 1;
        if (left.occursAt && right.occursAt) return compareItems(left, right);
        if (left.occursAt) return -1;
        if (right.occursAt) return 1;
        return compareItems(left, right);
    });

    const assessments = futureScheduleItems
        .filter((item) => !item.completed && ['exam', 'quiz'].includes(item.uniKind) && item.occursAt > current)
        .sort(compareItems);

    const milestones = [...incompleteTasks, ...incompleteScheduleItems]
        .filter((item) => item.occursAt
            && item.occursAt >= current
            && item.occursAt <= milestoneEnd
            && (item.isMilestone || (item.source === 'schedule' && item.uniKind === 'exam')))
        .sort(compareItems)
        .slice(0, 6);

    return {
        nextUp,
        agendaGroups,
        outstandingTasks,
        assessments,
        milestones
    };
};
