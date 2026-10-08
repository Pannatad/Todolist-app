import { toLocalDateKey } from '../../utils/scheduleOccurrences.js';

export const shortDate = (date) => date.toLocaleDateString([], { day: 'numeric', month: 'short' });
export const dayLabel = (date) => date.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
export const timeLabel = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export const weekLabel = (start, end) => {
  const sunday = new Date(end);
  sunday.setDate(sunday.getDate() - 1);
  return `${shortDate(start)} – ${shortDate(sunday)}${start.getFullYear() !== sunday.getFullYear() ? ` · ${start.getFullYear()}–${sunday.getFullYear()}` : ` · ${start.getFullYear()}`}`;
};
export const timeRange = (entry) => `${timeLabel(entry.occursAt)}–${timeLabel(entry.endsAt)}${entry.dateKey !== toLocalDateKey(entry.endsAt) ? ' (+1 day)' : ''}`;
export const kindLabel = (kind) => ({ exam: 'Exam', quiz: 'Quiz', event: 'Event', deadline: 'Deadline', report: 'Report', payment: 'Payment', registration: 'Registration', meeting: 'Meeting', task: 'Deadline' })[kind] || 'Milestone';
