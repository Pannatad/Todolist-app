import {
  CalendarDays,
  CircleHelp,
  ClipboardCheck,
  ClipboardList,
  CreditCard,
  FileText,
  GraduationCap,
  Users,
  Clock3,
} from 'lucide-react';
import { getKindLabel, getRecordValue } from './constants.js';

const pad = (value) => String(value).padStart(2, '0');
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const ITEM_ICONS = {
  task: ClipboardList,
  payment: CreditCard,
  registration: ClipboardCheck,
  meeting: Users,
  report: FileText,
  deadline: Clock3,
  exam: GraduationCap,
  quiz: CircleHelp,
  event: CalendarDays,
};

export const asDate = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const toDatetimeLocalValue = (value) => {
  const date = asDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export const toIso = (value) => {
  const date = asDate(value);
  return date ? date.toISOString() : '';
};

export const formatTime = (value) => {
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date) : 'No time';
};

export const formatShortDate = (value) => {
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date) : 'No date';
};

export const formatAgendaDate = (value) => {
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date) : 'No date';
};

export const formatLongDate = (value) => {
  const date = asDate(value);
  return date ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(date) : 'No date';
};

export const formatDateTime = (value) => {
  const date = asDate(value);
  return date ? `${formatShortDate(date)} · ${formatTime(date)}` : 'Unscheduled';
};

export const formatTimeRemaining = (value, now = new Date()) => {
  const date = asDate(value);
  const current = asDate(now);
  if (!date || !current) return 'No date';

  const remainingMs = date.getTime() - current.getTime();
  if (remainingMs <= 0) return 'Due now';

  if (remainingMs < HOUR_MS) {
    const minutes = Math.max(1, Math.ceil(remainingMs / MINUTE_MS));
    return `${minutes} min left`;
  }

  if (remainingMs < DAY_MS) {
    const hours = Math.ceil(remainingMs / HOUR_MS);
    return `${hours} hr${hours === 1 ? '' : 's'} left`;
  }

  const currentDay = new Date(current);
  currentDay.setHours(0, 0, 0, 0);
  const targetDay = new Date(date);
  targetDay.setHours(0, 0, 0, 0);
  const days = Math.max(1, Math.round((targetDay.getTime() - currentDay.getTime()) / DAY_MS));
  return `${days} day${days === 1 ? '' : 's'} left`;
};

export const formatDaysRemaining = (value, now = new Date()) => {
  const date = asDate(value);
  const current = asDate(now);
  if (!date || !current) return 'No date';

  const currentDay = new Date(current);
  currentDay.setHours(0, 0, 0, 0);
  const targetDay = new Date(date);
  targetDay.setHours(0, 0, 0, 0);
  const days = Math.round((targetDay.getTime() - currentDay.getTime()) / DAY_MS);

  if (days <= 0) return 'Today';
  return `${days} day${days === 1 ? '' : 's'} left`;
};

export const getItemKind = (item) => String(
  item?.uniKind
  || getRecordValue(item?.record, 'uniKind', 'uni_kind', 'kind', 'itemKind', 'item_kind')
  || (item?.source === 'schedule' ? 'event' : 'task'),
).toLowerCase();

export const getItemIcon = (item) => ITEM_ICONS[getItemKind(item)] || CalendarDays;

export const getItemSubject = (item) => getRecordValue(
  item?.record,
  'subject',
  'category',
) || item?.subject || 'University';

export const getItemNotes = (item) => getRecordValue(item?.record, 'description', 'notes', 'details');

export const itemLabel = (item) => getKindLabel(getItemKind(item));

export const sameDay = (left, right) => {
  const a = asDate(left);
  const b = asDate(right);
  return Boolean(a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate());
};
