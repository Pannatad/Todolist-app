import {
    getScheduleItemsForDate,
    isRecurringScheduleItem,
    upsertOverride,
    toLocalDateKey,
    weekdayOverrideKey
} from '../utils/scheduleOccurrences.js';
import { sanitizeMagicTemplateBlocks } from './magicSchedule.js';

export const SCHEDULE_ASSISTANT_WRITE_ACTIONS = new Set([
    'add_schedule',
    'edit_schedule',
    'delete_schedule',
    'duplicate_schedule',
    'override_schedule_day',
    'plan_day',
    'save_template',
    'apply_template',
    'delete_template'
]);

export const isScheduleAssistantWriteAction = (actionType) => (
    SCHEDULE_ASSISTANT_WRITE_ACTIONS.has(actionType)
);

// The model emits local wall-clock times ("2026-07-19T08:30:00"). JS parses that as UTC,
// so rebuild it from local components before storing as ISO.
export const normalizeAgentStartTime = (startTime) => {
    if (!startTime) return startTime;
    if (startTime.includes('Z') || /[+-]\d{2}:\d{2}$/.test(startTime)) return startTime;
    const match = startTime.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return startTime;
    const [, year, month, day, hour, minute] = match.map(Number);
    return new Date(year, month - 1, day, hour, minute).toISOString();
};

export const buildSchedulePayload = (params = {}) => {
    const payload = {
        title: params.title,
        startTime: normalizeAgentStartTime(params.startTime),
        duration: params.duration || 60,
        category: params.category || 'Other'
    };
    if (params.color) payload.color = params.color;
    if (params.notes) payload.notes = params.notes;
    if (params.itemKind) payload.itemKind = params.itemKind;
    if (params.parentItemId) payload.parentItemId = params.parentItemId;
    if (params.sourceTemplateId) payload.sourceTemplateId = params.sourceTemplateId;
    if (params.sourceTemplateVersion) payload.sourceTemplateVersion = params.sourceTemplateVersion;
    if (params.templateBlockId) payload.templateBlockId = params.templateBlockId;
    if (params.templateApplicationId) payload.templateApplicationId = params.templateApplicationId;
    if (params.recurrenceType && params.recurrenceType !== 'none') {
        payload.recurrenceType = params.recurrenceType;
        payload.recurrenceInterval = params.recurrenceInterval || 1;
        payload.recurrenceDaysOfWeek = params.recurrenceDaysOfWeek || [];
        payload.recurrenceEndDate = params.recurrenceEndDate || null;
    }
    return payload;
};

// override_schedule_day: customize one date (params.date) or every weekday
// (params.weekday 0-6) of a recurring item; params.clear removes the customization.
export const buildOverrideUpdates = (item, params = {}) => {
    const key = params.date || (params.weekday !== undefined ? weekdayOverrideKey(Number(params.weekday)) : null);
    if (!key) return null;
    return {
        recurrenceOverrides: upsertOverride(item, key, params.clear ? {} : params.updates || {})
    };
};

export const buildDuplicatePayload = (item, params = {}) => buildSchedulePayload({
    title: params.title || item.title,
    startTime: params.startTime,
    duration: params.duration || item.duration,
    category: params.category || item.category,
    color: params.color || item.color,
    notes: item.notes
});

export const buildPlanDayPayloads = (params = {}) => (params.blocks || [])
    .filter((block) => block?.title && /^\d{1,2}:\d{2}$/.test(block.startTime || ''))
    .map((block) => buildSchedulePayload({
        ...block,
        startTime: `${params.date}T${block.startTime.padStart(5, '0')}:00`
    }));

const normalizedTitle = (value) => String(value || '').trim().toLowerCase();
const recurrenceType = (item) => item?.recurrenceType || item?.recurrence_type || 'none';

const actionTargetTitles = (params = {}) => [
    params.existingTitle,
    params.targetTitle,
    params.originalTitle,
    params.eventTitle,
    params.title
].map(normalizedTitle).filter(Boolean);

const localDateAfterDays = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toLocalDateKey(date);
};

const inferredRequestDate = (requestText = '') => {
    const text = String(requestText).toLowerCase();
    if (/\btomorrow\b/.test(text)) return localDateAfterDays(1);
    if (/\b(today|tonight)\b/.test(text)) return localDateAfterDays(0);
    return null;
};

const cancellationTitle = (value) => ['cancelled', 'canceled'].includes(normalizedTitle(value));

// Some local models still express a removal as an edit that renames the block
// "Cancelled". Convert that narrow, unambiguous mistake before it reaches the
// schedule executor. Intentional renames remain edits unless the request itself
// contains a removal/cancellation verb.
export const normalizeScheduleAssistantActions = (actions = [], requestText = '') => {
    const removalIntent = /\b(remove|delete|clear|cancel|cancellation)\b/i.test(String(requestText));
    if (!removalIntent) return actions;

    const fallbackDate = inferredRequestDate(requestText);
    const resolveDate = (value) => {
        const normalized = normalizedTitle(value);
        if (normalized === 'tomorrow') return localDateAfterDays(1);
        if (normalized === 'today' || normalized === 'tonight') return localDateAfterDays(0);
        return value;
    };
    return actions.map((action) => {
        if (action?.type === 'delete_schedule') {
            const params = action.params || {};
            return {
                ...action,
                params: {
                    ...params,
                    date: resolveDate(params.date) || ((!params.dates || !params.dates.length) ? fallbackDate : undefined),
                    dates: Array.isArray(params.dates) ? params.dates.map(resolveDate) : params.dates
                }
            };
        }
        if (action?.type !== 'edit_schedule') return action;
        const params = action.params || {};
        const updates = params.updates || {};
        const title = updates.title ?? params.title;
        if (!cancellationTitle(title)) return action;

        const existingTitle = params.existingTitle || params.targetTitle || params.originalTitle || params.eventTitle;
        return {
            ...action,
            type: 'delete_schedule',
            params: {
                ...params,
                title: cancellationTitle(params.title) ? existingTitle : (existingTitle || params.title),
                date: resolveDate(params.date) || fallbackDate || undefined,
                dates: Array.isArray(params.dates) ? params.dates.map(resolveDate) : params.dates,
                updates: undefined
            },
            explanation: 'Remove the schedule block instead of renaming it.'
        };
    });
};

export const resolveScheduleAssistantTarget = (items = [], params = {}) => {
    if (params.eventId != null) {
        const byId = items.find((item) => String(item.id) === String(params.eventId));
        if (byId) return byId;
    }

    const titles = actionTargetTitles(params);
    if (!titles.length) return null;
    const datedItems = params.date ? getScheduleItemsForDate(items, params.date) : items;
    const exact = datedItems.find((item) => (
        titles.includes(normalizedTitle(item.title))
        || titles.includes(normalizedTitle(item._seriesTitle))
    ));
    if (exact) {
        return items.find((item) => String(item.id) === String(exact.id)) || exact;
    }

    const partialMatches = datedItems.filter((item) => titles.some((title) => (
        normalizedTitle(item.title).includes(title)
        || title.includes(normalizedTitle(item.title))
        || normalizedTitle(item._seriesTitle).includes(title)
    )));
    if (partialMatches.length !== 1) return null;
    return items.find((item) => String(item.id) === String(partialMatches[0].id))
        || partialMatches[0];
};

const timeOnly = (value) => {
    if (!value) return undefined;
    const direct = String(value).match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
    if (direct) return `${String(Number(direct[1])).padStart(2, '0')}:${direct[2]}`;
    const date = new Date(normalizeAgentStartTime(String(value)));
    if (Number.isNaN(date.getTime())) return undefined;
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

export const sanitizeScheduleAssistantUpdates = (updates = {}, { occurrence = false } = {}) => {
    const clean = {};
    ['title', 'category', 'color', 'notes', 'itemKind'].forEach((field) => {
        if (updates[field] !== undefined) clean[field] = updates[field];
    });
    if (updates.duration !== undefined && Number.isFinite(Number(updates.duration)) && Number(updates.duration) > 0) {
        clean.duration = Number(updates.duration);
    }
    if (updates.startTime !== undefined) {
        const startTime = occurrence ? timeOnly(updates.startTime) : normalizeAgentStartTime(updates.startTime);
        if (startTime) clean.startTime = startTime;
    }
    if (!occurrence) {
        ['recurrenceType', 'recurrenceInterval', 'recurrenceDaysOfWeek', 'recurrenceEndDate'].forEach((field) => {
            if (updates[field] !== undefined) clean[field] = updates[field];
        });
        if (Object.prototype.hasOwnProperty.call(updates, 'parentItemId')) {
            clean.parentItemId = updates.parentItemId;
        }
    }
    return clean;
};

const expandedScopes = (params = {}) => {
    if (Array.isArray(params.dates) && params.dates.length) {
        return params.dates.map((date) => ({ ...params, date, dates: undefined }));
    }
    if (Array.isArray(params.weekdays) && params.weekdays.length) {
        return params.weekdays.map((weekday) => ({ ...params, weekday, weekdays: undefined }));
    }
    return [params];
};

// Resolve delete requests separately from edits. A request such as "remove my
// schedule tomorrow" has no single event id, so it means all occurrences on
// that date. When a recurring item is targeted, keep the series and remove
// only the requested occurrence.
export const resolveScheduleAssistantDeleteTargets = (items = [], params = {}) => {
    const targets = [];
    const unresolved = [];
    const seen = new Set();

    expandedScopes(params).forEach((scope) => {
        const hasIdentity = scope.eventId != null || actionTargetTitles(scope).length > 0;
        let candidates = [];

        if (hasIdentity) {
            const target = resolveScheduleAssistantTarget(items, scope);
            if (target) candidates = [target];
        } else if (scope.date) {
            // No title/id + a date is an intentional "clear this day" request.
            candidates = getScheduleItemsForDate(items, scope.date);
        }

        if (!candidates.length) {
            unresolved.push({
                scope,
                reason: scope.date
                    ? 'No schedule blocks were found for that date.'
                    : 'The schedule block to delete could not be found.'
            });
            return;
        }

        candidates.forEach((item) => {
            const occurrenceDate = scope.date && isRecurringScheduleItem(item)
                ? scope.date
                : undefined;
            const key = `${String(item.id)}:${occurrenceDate || 'series'}`;
            if (seen.has(key)) return;
            seen.add(key);
            targets.push({ item, options: occurrenceDate ? { occurrenceDate } : undefined });
        });
    });

    return { targets, unresolved };
};

export const buildScheduleAssistantMutationPlan = (actions = [], items = []) => {
    const projected = new Map(items.map((item) => [String(item.id), item]));
    const steps = [];
    const unresolved = [];

    const findProjectedTarget = (params) => {
        const resolved = resolveScheduleAssistantTarget([...projected.values()], params);
        return resolved ? projected.get(String(resolved.id)) || resolved : null;
    };

    const queueOverride = (action, params, existing) => {
        const updates = sanitizeScheduleAssistantUpdates(params.updates || params, { occurrence: true });
        if (!params.clear && !Object.keys(updates).length) {
            unresolved.push({ action, reason: 'The occurrence change had no usable fields.' });
            return;
        }
        const overrideUpdates = buildOverrideUpdates(existing, { ...params, updates });
        if (!overrideUpdates) {
            unresolved.push({ action, reason: 'The occurrence change needs a date or weekday.' });
            return;
        }
        steps.push({ type: 'update', id: existing.id, updates: overrideUpdates, before: existing });
        projected.set(String(existing.id), {
            ...existing,
            recurrenceOverrides: overrideUpdates.recurrenceOverrides,
            recurrence_overrides: overrideUpdates.recurrenceOverrides
        });
    };

    for (const action of actions) {
        const params = action.params || {};
        if (action.type === 'add_schedule') {
            const payload = buildSchedulePayload(params);
            if (!payload.title || !payload.startTime || Number.isNaN(new Date(payload.startTime).getTime())) {
                unresolved.push({ action, reason: 'The new schedule block is missing a valid title or time.' });
            } else {
                steps.push({ type: 'create', payload });
            }
        }
        if (action.type === 'plan_day') {
            const payloads = buildPlanDayPayloads(params);
            if (!payloads.length) {
                unresolved.push({ action, reason: 'The proposed day plan did not contain valid blocks.' });
            } else {
                payloads.forEach((payload) => steps.push({ type: 'create', payload }));
            }
        }
        if (action.type === 'edit_schedule') {
            expandedScopes(params).forEach((scope) => {
                const existing = findProjectedTarget(scope);
                if (!existing) {
                    unresolved.push({ action, reason: 'The schedule block to edit could not be found.' });
                    return;
                }
                if (recurrenceType(existing) !== 'none' && (scope.date || scope.weekday !== undefined)) {
                    queueOverride(action, scope, existing);
                    return;
                }
                const updates = sanitizeScheduleAssistantUpdates(scope.updates || scope);
                if (!Object.keys(updates).length) {
                    unresolved.push({ action, reason: 'The schedule edit had no usable fields.' });
                    return;
                }
                steps.push({ type: 'update', id: existing.id, updates, before: existing });
                projected.set(String(existing.id), { ...existing, ...updates });
            });
        }
        if (action.type === 'override_schedule_day') {
            expandedScopes(params).forEach((scope) => {
                const existing = findProjectedTarget(scope);
                if (!existing) {
                    unresolved.push({ action, reason: 'The recurring schedule block to customize could not be found.' });
                    return;
                }
                if (!isRecurringScheduleItem(existing)) {
                    unresolved.push({ action, reason: 'A day override requires a recurring schedule block.' });
                    return;
                }
                queueOverride(action, scope, existing);
            });
        }
        if (action.type === 'delete_schedule') {
            const resolution = resolveScheduleAssistantDeleteTargets([...projected.values()], params);
            resolution.unresolved.forEach(({ reason }) => unresolved.push({ action, reason }));
            resolution.targets.forEach(({ item, options }) => {
                const existing = projected.get(String(item.id)) || item;
                steps.push({ type: 'delete', item: existing, options });
            });
        }
        if (action.type === 'duplicate_schedule') {
            const existing = findProjectedTarget(params);
            const payload = existing && buildDuplicatePayload(existing, params);
            if (!existing || !payload.startTime || Number.isNaN(new Date(payload.startTime).getTime())) {
                unresolved.push({ action, reason: 'The schedule block to duplicate or its new time could not be resolved.' });
            } else {
                steps.push({ type: 'create', payload });
            }
        }
    }

    return { steps, unresolved };
};

// Keep the action layer on the same V2 normalizer as the visual editor.
export const sanitizeTemplateBlocks = sanitizeMagicTemplateBlocks;

export const resolveTemplate = (templates = [], params = {}) => {
    if (params.templateId != null) {
        const byId = templates.find((template) => String(template.id) === String(params.templateId));
        if (byId) return byId;
    }
    if (params.name) {
        const query = String(params.name).trim().toLowerCase();
        return templates.find((template) => template.name.toLowerCase() === query)
            || templates.find((template) => template.name.toLowerCase().includes(query))
            || null;
    }
    return null;
};

// Turn a day's occurrences into template blocks, e.g. "save today as a template".
export const occurrencesToTemplateBlocks = (occurrences = []) => sanitizeTemplateBlocks(
    occurrences.map((item) => {
        const start = item.displayTime ? new Date(item.displayTime) : new Date(item.startTime || item.start_time);
        if (Number.isNaN(start.getTime())) return null;
        return {
            title: item.title,
            startTime: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
            duration: item.duration || 60,
            category: item.category || 'Other',
            color: item.color,
            kind: item.itemKind || item.item_kind || 'event'
        };
    }).filter(Boolean)
);
