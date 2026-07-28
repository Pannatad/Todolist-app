import { getScheduleItemsForDate, toLocalDateKey } from '../utils/scheduleOccurrences.js';

export const TEMPLATE_SCHEMA_VERSION = 2;
export const SCHEDULE_ITEM_KINDS = {
    EVENT: 'event',
    FLEXIBLE_SHELL: 'flexible_shell'
};

const TIME_PATTERN = /^([01]?\d|2[0-3]):([0-5]\d)$/;
const DEFAULT_COLOR = '#6366f1';
const DEFAULT_CATEGORY = 'Other';
const legacyIdPart = (value = '') => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 32) || 'untitled';

export const createScheduleId = (prefix = 'schedule') => {
    const id = globalThis.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${id}`;
};

export const minutesFromTime = (time = '00:00') => {
    const match = String(time).match(TIME_PATTERN);
    if (!match) return null;
    return Number(match[1]) * 60 + Number(match[2]);
};

export const timeFromMinutes = (minutes = 0) => {
    const safe = Math.max(0, Math.min(1439, Math.round(minutes)));
    return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
};

export const getTimelinePreviewGeometry = (
    block,
    { startMinutes = 7 * 60, endMinutes = 22 * 60 } = {}
) => {
    const blockStart = minutesFromTime(block?.startTime);
    const duration = Number(block?.duration);
    const range = Number(endMinutes) - Number(startMinutes);
    if (
        blockStart == null
        || !Number.isFinite(duration)
        || duration <= 0
        || !Number.isFinite(range)
        || range <= 0
    ) return null;

    const visibleStart = Math.max(Number(startMinutes), blockStart);
    const visibleEnd = Math.min(Number(endMinutes), blockStart + duration);
    if (visibleEnd <= visibleStart) return null;

    return {
        left: ((visibleStart - Number(startMinutes)) / range) * 100,
        width: ((visibleEnd - visibleStart) / range) * 100
    };
};

const sanitizeTemplateChild = (child, parentStart, parentEnd, index) => {
    const start = minutesFromTime(child?.startTime);
    const duration = Number(child?.duration);
    if (!child?.title?.trim() || start == null || !Number.isFinite(duration) || duration <= 0) return null;
    const end = start + duration;
    if (start < parentStart || end > parentEnd) return null;

    return {
        id: String(child.id || `legacy-child-${index + 1}-${timeFromMinutes(start).replace(':', '')}-${legacyIdPart(child.title)}`),
        title: String(child.title).trim(),
        startTime: timeFromMinutes(start),
        duration,
        category: child.category || DEFAULT_CATEGORY,
        color: child.color || DEFAULT_COLOR,
        notes: child.notes || ''
    };
};

export const sanitizeMagicTemplateBlocks = (blocks = []) => (
    (Array.isArray(blocks) ? blocks : [])
        .map((block, index) => {
            const start = minutesFromTime(block?.startTime);
            const duration = Number(block?.duration);
            if (!block?.title?.trim() || start == null || !Number.isFinite(duration) || duration <= 0) return null;

            const kind = block.kind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL
                ? SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL
                : SCHEDULE_ITEM_KINDS.EVENT;
            const end = start + duration;
            if (end > 1440) return null;

            const sortedChildren = kind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL
                ? (block.children || [])
                    .map((child, childIndex) => sanitizeTemplateChild(child, start, end, childIndex))
                    .filter(Boolean)
                    .sort((left, right) => left.startTime.localeCompare(right.startTime))
                : [];
            const children = sortedChildren.reduce((accepted, child) => {
                const previous = accepted.at(-1);
                if (!previous) return [child];
                const previousEnd = minutesFromTime(previous.startTime) + Number(previous.duration);
                return minutesFromTime(child.startTime) >= previousEnd ? [...accepted, child] : accepted;
            }, []);

            return {
                id: String(block.id || `legacy-block-${index + 1}-${timeFromMinutes(start).replace(':', '')}-${legacyIdPart(block.title)}`),
                kind,
                title: String(block.title).trim(),
                startTime: timeFromMinutes(start),
                duration,
                category: block.category || DEFAULT_CATEGORY,
                color: block.color || DEFAULT_COLOR,
                notes: block.notes || '',
                children
            };
        })
        .filter(Boolean)
        .sort((left, right) => left.startTime.localeCompare(right.startTime))
);

export const normalizeTemplateRecord = (template = {}) => ({
    ...template,
    schemaVersion: Number(template.schema_version || template.schemaVersion || TEMPLATE_SCHEMA_VERSION),
    version: Number(template.version || 1),
    blocks: sanitizeMagicTemplateBlocks(template.blocks)
});

const dateAtTime = (dateKey, time) => {
    const date = new Date(`${dateKey}T${time}:00`);
    return Number.isNaN(date.getTime()) ? null : date;
};

const firstSelectedDate = (startDate, selectedDays = []) => {
    if (!selectedDays.length) return new Date(startDate);
    for (let offset = 0; offset < 7; offset += 1) {
        const candidate = new Date(startDate);
        candidate.setDate(candidate.getDate() + offset);
        if (selectedDays.includes(candidate.getDay())) return candidate;
    }
    return new Date(startDate);
};

export const buildTemplateSchedulePayloads = (templateInput, options = {}) => {
    const template = normalizeTemplateRecord(templateInput);
    const startDate = new Date(`${options.date || toLocalDateKey(new Date())}T12:00:00`);
    const repeatDays = Array.from(new Set(options.repeatDays || [])).sort();
    const firstDate = firstSelectedDate(startDate, repeatDays);
    const applicationId = options.applicationId || createScheduleId('application');
    const recurrence = repeatDays.length
        ? {
            recurrenceType: 'weekly',
            recurrenceInterval: 1,
            recurrenceDaysOfWeek: repeatDays,
            recurrenceEndDate: options.endDate || null
        }
        : {};
    const payloads = [];

    template.blocks.forEach((block) => {
        const blockDateKey = toLocalDateKey(firstDate);
        const start = dateAtTime(blockDateKey, block.startTime);
        if (!start) return;
        const clientKey = createScheduleId('proposed');
        payloads.push({
            clientKey,
            title: block.title,
            startTime: start.toISOString(),
            duration: block.duration,
            category: block.category,
            color: block.color,
            notes: block.notes,
            itemKind: block.kind,
            sourceTemplateId: template.id || null,
            sourceTemplateVersion: template.version,
            templateBlockId: block.id,
            templateApplicationId: applicationId,
            ...recurrence
        });

        block.children.forEach((child) => {
            const childStart = dateAtTime(blockDateKey, child.startTime);
            if (!childStart) return;
            payloads.push({
                clientKey: createScheduleId('proposed-child'),
                parentClientKey: clientKey,
                title: child.title,
                startTime: childStart.toISOString(),
                duration: child.duration,
                category: child.category,
                color: child.color,
                notes: child.notes,
                itemKind: SCHEDULE_ITEM_KINDS.EVENT,
                sourceTemplateId: template.id || null,
                sourceTemplateVersion: template.version,
                templateBlockId: child.id,
                templateApplicationId: applicationId,
                ...recurrence
            });
        });
    });

    return payloads;
};

const scheduleStart = (item) => new Date(item.displayTime || item.startTime || item.start_time || item.deadline);
const scheduleDuration = (item) => Number(item.duration || item.estimatedTime || item.estimated_time || 60);
const scheduleParentId = (item) => item.parentItemId || item.parent_item_id || null;

export const getScheduleOverlapLayout = (items = []) => {
    const validItems = items
        .map((item, order) => {
            const start = scheduleStart(item);
            const duration = scheduleDuration(item);
            if (Number.isNaN(start.getTime()) || !Number.isFinite(duration) || duration <= 0) return null;
            return {
                item,
                order,
                start: start.getTime(),
                end: start.getTime() + duration * 60000
            };
        })
        .filter(Boolean);
    const parentIds = new Set(validItems.map(({ item }) => scheduleParentId(item)).filter(Boolean).map(String));
    const topLevel = validItems
        .filter(({ item }) => !scheduleParentId(item))
        .sort((left, right) => left.start - right.start || left.end - right.end || left.order - right.order);
    const layout = new Map();
    let group = [];
    let groupEnd = -Infinity;

    const commitGroup = () => {
        if (!group.length) return;
        const laneEnds = [];
        const assigned = group.map((entry) => {
            let laneIndex = laneEnds.findIndex((end) => end <= entry.start);
            if (laneIndex === -1) {
                laneIndex = laneEnds.length;
                laneEnds.push(entry.end);
            } else {
                laneEnds[laneIndex] = entry.end;
            }
            return { entry, laneIndex };
        });
        const laneCount = Math.max(1, laneEnds.length);
        assigned.forEach(({ entry, laneIndex }) => {
            layout.set(String(entry.item.id), { laneIndex, laneCount });
        });
        group = [];
        groupEnd = -Infinity;
    };

    topLevel.forEach((entry) => {
        if (group.length && entry.start >= groupEnd) commitGroup();
        group.push(entry);
        groupEnd = Math.max(groupEnd, entry.end);
    });
    commitGroup();

    validItems.forEach(({ item }) => {
        const linkedParentId = scheduleParentId(item);
        if (!linkedParentId) return;
        const parentLayout = layout.get(String(linkedParentId));
        layout.set(String(item.id), parentLayout || { laneIndex: 0, laneCount: 1 });
    });

    // Keep an explicit default for top-level items that were filtered out of a parent group.
    validItems.forEach(({ item }) => {
        if (!layout.has(String(item.id)) && !parentIds.has(String(item.id))) {
            layout.set(String(item.id), { laneIndex: 0, laneCount: 1 });
        }
    });

    return Object.fromEntries(layout);
};

const intervalFor = (item, source, dateKey) => {
    const start = scheduleStart(item);
    if (Number.isNaN(start.getTime())) return null;
    const duration = scheduleDuration(item);
    return {
        id: item.id || item.clientKey,
        source,
        item,
        dateKey,
        start: start.getTime(),
        end: start.getTime() + duration * 60000
    };
};

const isTimedTask = (task) => {
    if (!task?.deadline) return false;
    const date = new Date(task.deadline);
    return !Number.isNaN(date.getTime()) && (date.getHours() !== 0 || date.getMinutes() !== 0);
};

const getDatesInRange = (startDate, endDate, maxDays = 56) => {
    const dates = [];
    const cursor = new Date(startDate);
    cursor.setHours(12, 0, 0, 0);
    const end = endDate ? new Date(`${endDate}T12:00:00`) : null;
    while (dates.length < maxDays && (!end || cursor <= end)) {
        dates.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
};

const topLevelBlockingOccurrences = (items, date) => {
    const parentIds = new Set(items.filter((item) => item.item_kind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL
        || item.itemKind === SCHEDULE_ITEM_KINDS.FLEXIBLE_SHELL).map((item) => String(item.id)));
    return getScheduleItemsForDate(items, date).filter((item) => {
        const parentId = item.parent_item_id || item.parentItemId;
        return !parentId || !parentIds.has(String(parentId));
    });
};

export const detectScheduleConflicts = ({
    proposedItems = [],
    scheduleItems = [],
    tasks = [],
    startDate,
    endDate,
    maxDays = 56
}) => {
    if (!proposedItems.length) return [];
    const first = startDate || toLocalDateKey(proposedItems[0].startTime);
    const dates = getDatesInRange(new Date(`${first}T12:00:00`), endDate, maxDays);
    const conflicts = [];

    dates.forEach((date) => {
        const dateKey = toLocalDateKey(date);
        const proposedOccurrences = topLevelBlockingOccurrences(
            proposedItems.map((item) => ({
                ...item,
                id: item.clientKey,
                start_time: item.startTime,
                recurrence_type: item.recurrenceType || 'none',
                recurrence_days_of_week: item.recurrenceDaysOfWeek || [],
                recurrence_end_date: item.recurrenceEndDate || null,
                item_kind: item.itemKind,
                parent_item_id: item.parentClientKey
            })),
            date
        ).map((item) => intervalFor(item, 'template', dateKey)).filter(Boolean);

        const existingIntervals = topLevelBlockingOccurrences(scheduleItems, date)
            .map((item) => intervalFor(item, 'schedule', dateKey))
            .filter(Boolean);
        const taskIntervals = tasks
            .filter((task) => isTimedTask(task) && toLocalDateKey(task.deadline) === dateKey)
            .map((task) => intervalFor(task, 'task', dateKey))
            .filter(Boolean);

        proposedOccurrences.forEach((proposed) => {
            [...existingIntervals, ...taskIntervals].forEach((existing) => {
                if (proposed.start < existing.end && proposed.end > existing.start) {
                    conflicts.push({
                        id: `${dateKey}-${proposed.id}-${existing.source}-${existing.id}`,
                        dateKey,
                        proposed,
                        existing,
                        canReplace: existing.source === 'schedule'
                    });
                }
            });
        });
    });

    return conflicts;
};

export const removeConflictingProposals = (proposedItems, conflicts) => {
    const blockedKeys = new Set(conflicts.map((conflict) => String(conflict.proposed.id)));
    const blockedParents = new Set(
        proposedItems
            .filter((item) => blockedKeys.has(String(item.clientKey)))
            .map((item) => String(item.clientKey))
    );
    return proposedItems.filter((item) => (
        !blockedKeys.has(String(item.clientKey))
        && (!item.parentClientKey || !blockedParents.has(String(item.parentClientKey)))
    ));
};

const shiftTemplateItemsPastConflicts = (proposedItems, conflicts, stepMinutes) => {
    if (!conflicts.length) return proposedItems;
    const shifts = new Map();

    conflicts.forEach((conflict) => {
        const key = String(conflict.proposed.id);
        const required = Math.ceil((conflict.existing.end - conflict.proposed.start) / 60000 / stepMinutes) * stepMinutes;
        shifts.set(key, Math.max(shifts.get(key) || 0, required));
    });

    const parentShift = new Map();
    proposedItems.forEach((item) => {
        if (shifts.has(String(item.clientKey))) parentShift.set(String(item.clientKey), shifts.get(String(item.clientKey)));
    });

    return proposedItems.map((item) => {
        const shift = shifts.get(String(item.clientKey)) || parentShift.get(String(item.parentClientKey)) || 0;
        if (!shift) return item;
        const start = new Date(item.startTime);
        start.setMinutes(start.getMinutes() + shift);
        return { ...item, startTime: start.toISOString() };
    });
};

export const autoFitTemplateItems = (
    proposedItems,
    conflicts,
    stepMinutes = 15,
    context = {}
) => {
    let fitted = proposedItems;
    let remaining = conflicts;
    const canRecheck = Array.isArray(context.scheduleItems) || Array.isArray(context.tasks);
    const seenPlacements = new Set();

    for (let attempt = 0; attempt < 48 && remaining.length; attempt += 1) {
        const placementKey = fitted.map((item) => `${item.clientKey}:${item.startTime}`).join('|');
        if (seenPlacements.has(placementKey)) break;
        seenPlacements.add(placementKey);

        const shifted = shiftTemplateItemsPastConflicts(fitted, remaining, stepMinutes);
        const changed = shifted.some((item, index) => item.startTime !== fitted[index]?.startTime);
        fitted = shifted;
        if (!changed || !canRecheck) break;

        remaining = detectScheduleConflicts({
            proposedItems: fitted,
            scheduleItems: context.scheduleItems || [],
            tasks: context.tasks || [],
            startDate: context.startDate,
            endDate: context.endDate,
            maxDays: context.maxDays
        });
    }

    return fitted;
};

const previousDateKey = (dateKey) => {
    const date = new Date(`${dateKey}T12:00:00`);
    date.setDate(date.getDate() - 1);
    return toLocalDateKey(date);
};

export const buildFutureTemplateUpdateSteps = ({
    template,
    applicationItems = [],
    cutoffDate
}) => {
    if (!template || !applicationItems.length || !cutoffDate) return [];
    const normalized = normalizeTemplateRecord(template);
    const childBlockIds = new Set(normalized.blocks.flatMap((block) => (
        (block.children || []).map((child) => String(child.id))
    )));
    const retained = applicationItems.filter((item) => {
        const linkedParent = item.parentItemId || item.parent_item_id;
        const blockId = item.templateBlockId || item.template_block_id;
        const looksLikeDetachedChild = !linkedParent && blockId && childBlockIds.has(String(blockId));
        return !looksLikeDetachedChild;
    });
    if (!retained.length) return [];

    const recurringBase = retained.find((item) => (
        (item.recurrenceType || item.recurrence_type || 'none') !== 'none'
    ));
    const repeatDays = recurringBase
        ? recurringBase.recurrenceDaysOfWeek || recurringBase.recurrence_days_of_week || []
        : [];
    const endDate = recurringBase
        ? recurringBase.recurrenceEndDate || recurringBase.recurrence_end_date || null
        : null;
    const applicationId = retained[0].templateApplicationId
        || retained[0].template_application_id
        || createScheduleId('application');
    const proposals = buildTemplateSchedulePayloads(normalized, {
        date: cutoffDate,
        repeatDays,
        endDate,
        applicationId
    });
    const oldByBlockId = new Map(retained.map((item) => [
        String(item.templateBlockId || item.template_block_id || ''),
        item
    ]));

    const steps = [];
    retained.forEach((item) => {
        const seriesType = item.recurrenceType || item.recurrence_type || 'none';
        const startKey = toLocalDateKey(item.startTime || item.start_time);
        if (seriesType !== 'none' && startKey < cutoffDate) {
            steps.push({
                type: 'update',
                id: item.id,
                updates: { recurrenceEndDate: previousDateKey(cutoffDate) },
                before: item
            });
        } else if (startKey >= cutoffDate) {
            steps.push({ type: 'delete', item });
        }
    });

    proposals.forEach((proposal) => {
        const old = oldByBlockId.get(String(proposal.templateBlockId || ''));
        steps.push({
            type: 'create',
            payload: {
                ...proposal,
                recurrenceOverrides: old?.recurrenceOverrides || old?.recurrence_overrides || {},
                recurrenceExceptions: (old?.recurrenceExceptions || old?.recurrence_exceptions || [])
                    .filter((dateKey) => dateKey >= cutoffDate)
            }
        });
    });
    return steps;
};
