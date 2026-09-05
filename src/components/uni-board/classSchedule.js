export const isUniversityScheduleItem = (item) => item?.workspace === 'university';

export const withUniversityScheduleDefaults = (item = {}) => ({
  ...item,
  workspace: 'university',
  uniKind: item.uniKind ?? item.uni_kind ?? 'event',
});

export const CLASS_WEEKDAYS = [
  { value: 1, label: 'M', name: 'Monday' },
  { value: 2, label: 'T', name: 'Tuesday' },
  { value: 3, label: 'W', name: 'Wednesday' },
  { value: 4, label: 'T', name: 'Thursday' },
  { value: 5, label: 'F', name: 'Friday' },
  { value: 6, label: 'S', name: 'Saturday' },
  { value: 0, label: 'S', name: 'Sunday' },
];

export const CLASS_SESSION_TYPES = [
  { value: 'lecture', label: 'Lecture' },
  { value: 'tutorial', label: 'Tutorial' },
  { value: 'lab', label: 'Lab' },
  { value: 'other', label: 'Other' },
];

const pad = (value) => String(value).padStart(2, '0');

export const toLocalDateInput = (value = new Date()) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const emptyClassDraft = (date = new Date()) => ({
  title: '',
  className: '',
  sessionType: 'lecture',
  course: '',
  room: '',
  startDate: toLocalDateInput(date),
  startTime: '09:00',
  duration: 60,
  repeatDays: [date.getDay()],
  endDate: '',
  color: '#6366f1',
});

export const classDraftFromItem = (item) => {
  const start = new Date(item?.startTime || item?.start_time);
  const repeatDays = item?.recurrenceDaysOfWeek || item?.recurrence_days_of_week || [];
  const title = item?.title || '';
  const sessionType = CLASS_SESSION_TYPES.find((type) => title.toLowerCase().includes(type.value))?.value || 'other';
  return {
    title,
    className: item?.category || item?.subject || '',
    sessionType,
    course: item?.category || item?.subject || '',
    room: item?.notes || '',
    startDate: toLocalDateInput(start),
    startTime: Number.isNaN(start.getTime()) ? '09:00' : `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    duration: Number(item?.duration) || 60,
    repeatDays: repeatDays.length ? repeatDays : [start.getDay()],
    endDate: item?.recurrenceEndDate || item?.recurrence_end_date || '',
    color: item?.color || '#6366f1',
  };
};

export const buildClassSchedulePayload = (draft) => ({
  title: draft.title?.trim() || `${draft.className.trim()} ${CLASS_SESSION_TYPES.find((type) => type.value === draft.sessionType)?.label || 'Class'}`,
  startTime: new Date(`${draft.startDate}T${draft.startTime}`).toISOString(),
  duration: Math.max(5, Number(draft.duration) || 60),
  category: draft.className?.trim() || draft.course?.trim() || 'University',
  subject: draft.className?.trim() || draft.course?.trim() || 'University',
  notes: draft.room.trim() || null,
  color: draft.color,
  recurrenceType: draft.repeatDays.length ? 'weekly' : 'none',
  recurrenceInterval: 1,
  recurrenceDaysOfWeek: [...draft.repeatDays].sort((left, right) => left - right),
  recurrenceEndDate: draft.repeatDays.length && draft.endDate ? draft.endDate : null,
  workspace: 'university',
  uniKind: 'event',
});

export const groupClassScheduleItems = (items = []) => {
  const groups = new Map();
  items.forEach((item) => {
    const className = item.category || item.subject || 'University';
    if (!groups.has(className)) groups.set(className, []);
    groups.get(className).push(item);
  });
  return [...groups.entries()]
    .map(([name, sessions]) => ({
      name,
      sessions: [...sessions].sort((left, right) => new Date(left.startTime || left.start_time) - new Date(right.startTime || right.start_time)),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
};
