import { isScheduleKind } from './constants.js';

export const buildUniversityItemInput = (draft) => {
  const subject = draft.course.trim() || 'University';
  const schedule = isScheduleKind(draft.kind);
  return {
    source: schedule ? 'schedule' : 'task',
    payload: schedule ? {
      title: draft.title.trim(),
      startTime: new Date(draft.when).toISOString(),
      duration: Number(draft.duration) || 60,
      category: subject,
      subject,
      notes: draft.notes.trim() || null,
      description: draft.notes.trim() || null,
      workspace: 'university',
      uniKind: draft.kind,
      isMilestone: Boolean(draft.isMilestone || draft.kind === 'exam'),
    } : {
      title: draft.title.trim(),
      deadline: draft.when || null,
      subject,
      description: draft.notes.trim() || null,
      workspace: 'university',
      uniKind: draft.kind,
      isMilestone: Boolean(draft.isMilestone),
    },
  };
};
