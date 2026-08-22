const MINUTES_PER_DAY = 24 * 60;

const clampTimeValue = (value) => Math.max(0, Math.min(MINUTES_PER_DAY - 1, Number(value) || 0));

const getCurrentTimeValue = (date = new Date()) => (
    (date.getHours() * 60) + date.getMinutes()
);

const timeValueToInput = (value) => {
    const minutes = clampTimeValue(value);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const timeInputToValue = (value) => {
    const [hours, minutes] = String(value || '').split(':').map(Number);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
    return clampTimeValue((hours * 60) + minutes);
};

const formatShortTimeValue = (value) => {
    const minutes = clampTimeValue(value);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    return `${hours}:${String(remainder).padStart(2, '0')}`;
};

const formatTimeValue = (value) => {
    const minutes = clampTimeValue(value);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    const meridiem = hours >= 12 ? 'PM' : 'AM';
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${String(remainder).padStart(2, '0')} ${meridiem}`;
};

export {
    formatShortTimeValue,
    formatTimeValue,
    getCurrentTimeValue,
    timeInputToValue,
    timeValueToInput,
};
