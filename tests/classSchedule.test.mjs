import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildClassSchedulePayload,
  classDraftFromItem,
  emptyClassDraft,
  groupClassScheduleItems,
  isUniversityScheduleItem,
  withUniversityScheduleDefaults,
} from '../src/components/uni-board/classSchedule.js';

test('class schedule only includes university schedule items', () => {
  assert.equal(isUniversityScheduleItem({ workspace: 'university' }), true);
  assert.equal(isUniversityScheduleItem({ workspace: 'personal' }), false);
  assert.equal(isUniversityScheduleItem({}), false);
});

test('groups many lecture, tutorial, and lab schedules under one class', () => {
  const grouped = groupClassScheduleItems([
    { id: 'lab', title: 'COMP 1023 Lab', category: 'COMP 1023', startTime: '2026-09-09T06:00:00.000Z' },
    { id: 'lecture', title: 'COMP 1023 Lecture', category: 'COMP 1023', startTime: '2026-09-07T02:00:00.000Z' },
    { id: 'tutorial', title: 'MATH 1012 Tutorial', category: 'MATH 1012', startTime: '2026-09-08T04:00:00.000Z' },
  ]);

  assert.deepEqual(grouped.map((entry) => [entry.name, entry.sessions.length]), [
    ['COMP 1023', 2],
    ['MATH 1012', 1],
  ]);
  assert.equal(grouped[0].sessions[0].id, 'lecture');
});

test('new session titles include the class and selected category', () => {
  const payload = buildClassSchedulePayload({
    ...emptyClassDraft(new Date(2026, 8, 2)),
    className: 'COMP 1023',
    sessionType: 'lab',
    startDate: '2026-09-09',
    startTime: '14:00',
  });

  assert.equal(payload.title, 'COMP 1023 Lab');
  assert.equal(payload.category, 'COMP 1023');
});

test('class schedule form builds a weekly university event', () => {
  const payload = buildClassSchedulePayload({
    ...emptyClassDraft(new Date(2026, 8, 2)),
    title: ' COMP 1023 lecture ',
    course: 'COMP 1023',
    room: 'Room 2404',
    startDate: '2026-09-07',
    startTime: '10:30',
    duration: '90',
    repeatDays: [3, 1],
    endDate: '2026-12-01',
  });

  assert.equal(payload.title, 'COMP 1023 lecture');
  assert.equal(payload.workspace, 'university');
  assert.equal(payload.uniKind, 'event');
  assert.equal(payload.recurrenceType, 'weekly');
  assert.deepEqual(payload.recurrenceDaysOfWeek, [1, 3]);
  assert.equal(payload.duration, 90);
  assert.equal(payload.recurrenceEndDate, '2026-12-01');
});

test('existing classes populate the editor with recurrence details', () => {
  const draft = classDraftFromItem({
    title: 'MATH 1012 tutorial',
    startTime: new Date(2026, 8, 8, 14, 0).toISOString(),
    recurrenceDaysOfWeek: [2],
    recurrenceEndDate: '2026-11-30',
    duration: 50,
    category: 'MATH 1012',
    notes: 'Room 4502',
  });

  assert.equal(draft.title, 'MATH 1012 tutorial');
  assert.equal(draft.startTime, '14:00');
  assert.deepEqual(draft.repeatDays, [2]);
  assert.equal(draft.room, 'Room 4502');
});

test('class schedule additions receive university persistence metadata', () => {
  assert.deepEqual(
    withUniversityScheduleDefaults({ title: 'COMP 1023' }),
    { title: 'COMP 1023', workspace: 'university', uniKind: 'event' },
  );
  assert.equal(withUniversityScheduleDefaults({ uniKind: 'exam' }).uniKind, 'exam');
  assert.equal(withUniversityScheduleDefaults({ uni_kind: 'quiz' }).uniKind, 'quiz');
});
