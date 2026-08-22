export const TASK_KINDS = [
  { value: 'task', label: 'Task' },
  { value: 'payment', label: 'Payment' },
  { value: 'registration', label: 'Registration' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'report', label: 'Report' },
  { value: 'deadline', label: 'Deadline' },
];

export const SCHEDULE_KINDS = [
  { value: 'exam', label: 'Exam' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'event', label: 'Event' },
];

export const ALL_KINDS = [...TASK_KINDS, ...SCHEDULE_KINDS];

export const AGENDA_RANGE_OPTIONS = [
  { id: '7', label: '7 days', days: 7 },
  { id: '14', label: '14 days', days: 14 },
  { id: 'month', label: '1 month', days: 30 },
  { id: 'all', label: 'All', days: 'all' },
];

export const KIND_LABELS = Object.fromEntries(ALL_KINDS.map((kind) => [kind.value, kind.label]));

export const getKindLabel = (kind) => KIND_LABELS[kind] || 'University item';

export const isScheduleKind = (kind) => SCHEDULE_KINDS.some((option) => option.value === kind);

export const getRecordValue = (record, ...keys) => {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null) return record[key];
  }
  return '';
};
