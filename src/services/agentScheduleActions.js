import { upsertOverride, weekdayOverrideKey } from '../utils/scheduleOccurrences.js';

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

// Template blocks are stored as plan_day-style blocks: { title, startTime "HH:MM", duration, category, color }.
export const sanitizeTemplateBlocks = (blocks = []) => (Array.isArray(blocks) ? blocks : [])
    .filter((block) => block?.title && /^\d{1,2}:\d{2}$/.test(block.startTime || ''))
    .map((block) => ({
        title: String(block.title).trim(),
        startTime: block.startTime.padStart(5, '0'),
        duration: Number(block.duration) > 0 ? Number(block.duration) : 60,
        category: block.category || 'Other',
        ...(block.color ? { color: block.color } : {})
    }))
    .sort((left, right) => left.startTime.localeCompare(right.startTime));

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
            color: item.color
        };
    }).filter(Boolean)
);
