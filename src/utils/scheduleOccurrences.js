const DAY_IN_MS = 24 * 60 * 60 * 1000;

const isDateOnlyString = (value) => (
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
);

const parseInputDate = (value, endOfDay = false) => {
    if (!value) {
        return null;
    }

    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : new Date(value);
    }

    if (isDateOnlyString(value)) {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(
            year,
            month - 1,
            day,
            endOfDay ? 23 : 12,
            endOfDay ? 59 : 0,
            endOfDay ? 59 : 0,
            endOfDay ? 999 : 0
        );
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const startOfLocalDay = (value) => {
    const date = parseInputDate(value);
    if (!date) {
        return null;
    }

    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
};

const toMonthIndex = (date) => date.getFullYear() * 12 + date.getMonth();

const getRecurrenceType = (item) => item?.recurrence_type || item?.recurrenceType || 'none';
const getRecurrenceOverrides = (item) => item?.recurrence_overrides || item?.recurrenceOverrides || {};
const getRecurrenceInterval = (item) => {
    const value = Number(item?.recurrence_interval ?? item?.recurrenceInterval ?? 1);
    return Number.isFinite(value) && value > 0 ? value : 1;
};
const getRecurrenceDays = (item) => item?.recurrence_days_of_week || item?.recurrenceDaysOfWeek || [];
const getRecurrenceExceptions = (item) => item?.recurrence_exceptions || item?.recurrenceExceptions || [];
const getRecurrenceEndDate = (item) => parseInputDate(item?.recurrence_end_date ?? item?.recurrenceEndDate, true);

export const toLocalDateKey = (value) => {
    const date = parseInputDate(value);
    if (!date) {
        return '';
    }

    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
};

export const isSameLocalDate = (left, right) => (
    Boolean(left) && Boolean(right) && toLocalDateKey(left) === toLocalDateKey(right)
);

export const getScheduleItemStartDate = (item) => (
    parseInputDate(item?.startTime || item?.start_time || item?.deadline)
);

export const isRecurringScheduleItem = (item) => getRecurrenceType(item) !== 'none';

export const doesScheduleItemOccurOnDate = (item, targetDate) => {
    const originalStart = getScheduleItemStartDate(item);
    const targetDay = startOfLocalDay(targetDate);

    if (!originalStart || !targetDay) {
        return false;
    }

    const originalDay = startOfLocalDay(originalStart);
    const targetDateKey = toLocalDateKey(targetDay);
    const exceptions = getRecurrenceExceptions(item);

    if (exceptions.includes(targetDateKey)) {
        return false;
    }

    if (targetDay < originalDay) {
        return false;
    }

    const endDate = getRecurrenceEndDate(item);
    if (endDate && targetDay > startOfLocalDay(endDate)) {
        return false;
    }

    const recurrenceType = getRecurrenceType(item);
    if (recurrenceType === 'none') {
        return isSameLocalDate(originalDay, targetDay);
    }

    if (isSameLocalDate(originalDay, targetDay)) {
        return true;
    }

    const interval = getRecurrenceInterval(item);
    const daysDiff = Math.floor((targetDay - originalDay) / DAY_IN_MS);

    switch (recurrenceType) {
        case 'daily':
            return daysDiff % interval === 0;
        case 'weekly': {
            const daysOfWeek = getRecurrenceDays(item);
            const weeksDiff = Math.floor(daysDiff / 7);

            if (daysOfWeek.length > 0) {
                return daysOfWeek.includes(targetDay.getDay()) && weeksDiff % interval === 0;
            }

            return targetDay.getDay() === originalDay.getDay() && weeksDiff % interval === 0;
        }
        case 'monthly': {
            const monthsDiff = toMonthIndex(targetDay) - toMonthIndex(originalDay);
            return monthsDiff > 0 && monthsDiff % interval === 0 && targetDay.getDate() === originalDay.getDate();
        }
        case 'yearly': {
            const yearsDiff = targetDay.getFullYear() - originalDay.getFullYear();
            return yearsDiff > 0 &&
                yearsDiff % interval === 0 &&
                targetDay.getMonth() === originalDay.getMonth() &&
                targetDay.getDate() === originalDay.getDate();
        }
        case 'custom': {
            const daysOfWeek = getRecurrenceDays(item);
            const weeksDiff = Math.floor(daysDiff / 7);

            if (daysOfWeek.length > 0) {
                return daysOfWeek.includes(targetDay.getDay()) && weeksDiff % interval === 0;
            }

            return false;
        }
        default:
            return false;
    }
};

export const weekdayOverrideKey = (dayIndex) => `weekday-${dayIndex}`;

const OVERRIDE_FIELDS = ['title', 'category', 'color', 'notes', 'duration', 'startTime'];

const sanitizeOverride = (override = {}) => Object.fromEntries(
    OVERRIDE_FIELDS
        .map((field) => [field, override[field]])
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
);

// Overrides customize one occurrence (date key "YYYY-MM-DD") or every occurrence on a
// weekday (key "weekday-0".."weekday-6") without touching the recurring series itself.
// A date override wins over a weekday override.
export const getOverrideForDate = (item, targetDate) => {
    const overrides = getRecurrenceOverrides(item);
    const targetDay = startOfLocalDay(targetDate);
    if (!targetDay || !overrides || typeof overrides !== 'object') return null;

    const merged = {
        ...sanitizeOverride(overrides[weekdayOverrideKey(targetDay.getDay())]),
        ...sanitizeOverride(overrides[toLocalDateKey(targetDay)])
    };

    return Object.keys(merged).length ? merged : null;
};

export const upsertOverride = (item, key, override) => {
    const next = { ...getRecurrenceOverrides(item) };
    const cleaned = sanitizeOverride(override);
    if (Object.keys(cleaned).length) {
        next[key] = cleaned;
    } else {
        delete next[key];
    }
    return next;
};

export const getScheduleOccurrenceStart = (item, targetDate) => {
    const originalStart = getScheduleItemStartDate(item);
    const occurrenceDate = parseInputDate(targetDate);

    if (!originalStart || !occurrenceDate) {
        return null;
    }

    const occurrence = new Date(occurrenceDate);
    occurrence.setHours(
        originalStart.getHours(),
        originalStart.getMinutes(),
        originalStart.getSeconds(),
        originalStart.getMilliseconds()
    );

    return occurrence;
};

export const getScheduleItemsForDate = (items = [], targetDate) => (
    items
        .filter((item) => doesScheduleItemOccurOnDate(item, targetDate))
        .map((item) => {
            let displayTime = getScheduleOccurrenceStart(item, targetDate);
            const override = getOverrideForDate(item, targetDate);

            if (override?.startTime && /^\d{2}:\d{2}$/.test(override.startTime) && displayTime) {
                const [hours, minutes] = override.startTime.split(':').map(Number);
                displayTime = new Date(displayTime);
                displayTime.setHours(hours, minutes, 0, 0);
            }

            return {
                ...item,
                ...(override ? {
                    title: override.title ?? item.title,
                    category: override.category ?? item.category,
                    color: override.color ?? item.color,
                    notes: override.notes ?? item.notes,
                    duration: override.duration ?? item.duration
                } : null),
                displayTime,
                _occurrenceDate: toLocalDateKey(targetDate),
                _seriesTitle: item.title,
                _seriesBase: {
                    title: item.title,
                    category: item.category,
                    color: item.color,
                    notes: item.notes,
                    duration: item.duration
                },
                _hasOverride: Boolean(override),
                isRecurring: isRecurringScheduleItem(item) && !isSameLocalDate(getScheduleItemStartDate(item), targetDate)
            };
        })
        .sort((left, right) => (left.displayTime?.getTime() || 0) - (right.displayTime?.getTime() || 0))
);
