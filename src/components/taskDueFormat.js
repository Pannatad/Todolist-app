const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export const formatTaskDueAbsolute = (value, completed = false, now = new Date()) => {
    if (!value) return 'No due date';
    const due = new Date(value);
    const today = due.toDateString() === now.toDateString();
    const date = today
        ? `Today, ${due.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`
        : due.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return !completed && due < now && !today ? `Overdue · ${date}` : date;
};

export const formatTaskDueRelative = (value, now = new Date()) => {
    if (!value) return 'No due date';
    const difference = new Date(value).getTime() - now.getTime();
    const magnitude = Math.abs(difference);
    const amount = magnitude >= DAY_MS
        ? `${Math.ceil(magnitude / DAY_MS)}d`
        : `${Math.max(1, Math.ceil(magnitude / HOUR_MS))}h`;
    return difference < 0 ? `Overdue by ${amount}` : `${amount} left`;
};
