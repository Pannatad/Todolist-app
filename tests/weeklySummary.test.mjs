import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklySummary, parseWeeklyDate } from '../src/utils/weeklySummary.js';
import { timeLabel, timeRange } from '../src/components/weekly/weeklyFormat.js';

const local = (year, month, day, hour = 0, minute = 0) => new Date(year, month - 1, day, hour, minute);
const now = local(2026, 10, 8, 12);
const task = (id, deadline, extra = {}) => ({ id, title: id, deadline, status: 'growing', ...extra });
const event = (id, start, extra = {}) => ({ id, title: id, startTime: start, duration: 60, ...extra });
const taskIds = (model) => model.taskGroups.flatMap((group) => group.items.map((item) => item.record.id));

test('week includes Monday midnight and Sunday night, excluding both neighboring weeks', () => {
  const model = buildWeeklySummary({ now, tasks: [
    task('previous', local(2026, 10, 4, 23, 59)),
    task('monday', local(2026, 10, 5)),
    task('sunday', local(2026, 10, 11, 23, 59)),
    task('next', local(2026, 10, 12)),
  ] });
  assert.deepEqual(taskIds(model), ['monday', 'sunday']);
  assert.equal(model.weekStart.getDate(), 5);
  assert.equal(model.weekEnd.getDate(), 12);
  assert.equal(model.days.length, 7);
  assert.equal(model.days.filter((day) => day.isToday)[0].dateKey, '2026-10-08');
});

test('Sunday remains in the ending week, Monday starts a new week, including across years', () => {
  assert.equal(buildWeeklySummary({ now: local(2026, 10, 11, 23, 59) }).days[0].dateKey, '2026-10-05');
  assert.equal(buildWeeklySummary({ now: local(2026, 10, 12) }).days[0].dateKey, '2026-10-12');
  const model = buildWeeklySummary({ now: local(2027, 1, 1) });
  assert.deepEqual(model.days.map((day) => day.dateKey), ['2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03']);
});

test('date-only deadlines use local dates and remain due through the end of their day', () => {
  const model = buildWeeklySummary({ now, tasks: [task('today', '2026-10-08'), task('past', '2026-10-05')] });
  const entries = model.taskGroups.flatMap((group) => group.items);
  assert.equal(entries.find((item) => item.record.id === 'today').isOverdue, false);
  assert.equal(entries.find((item) => item.record.id === 'today').occursAt.getHours(), 23);
  assert.equal(entries.find((item) => item.record.id === 'today').dateOnly, true);
  assert.equal(entries.find((item) => item.record.id === 'past').isOverdue, true);
  assert.equal(parseWeeklyDate('2026-10-08').getDate(), 8);
});

test('invalid, missing, and archived deadlines are excluded; completion representations are counted consistently', () => {
  const model = buildWeeklySummary({ now, tasks: [
    task('no-date', null), task('invalid', 'not a date'), task('invalid-calendar-day', '2026-02-31'),
    task('archived', '2026-10-08', { archived: true }),
    task('active', '2026-10-08'), task('boolean', '2026-10-08', { completed: true }),
    task('status', '2026-10-08', { status: 'done' }), task('timestamp', '2026-10-08', { completed_at: '2026-10-07' }),
  ] });
  assert.equal(model.taskCount, 4);
  assert.equal(model.unfinishedTaskCount, 1);
  assert.equal(parseWeeklyDate('2026-02-31'), null);
});

test('all dated tasks are available beyond the compact UI limit, without mutating input', () => {
  const tasks = Array.from({ length: 12 }, (_, index) => task(`task-${index}`, local(2026, 10, 9, 23 - index)));
  const before = tasks.map((item) => ({ ...item }));
  const model = buildWeeklySummary({ now, tasks });
  assert.equal(model.taskCount, 12);
  assert.equal(taskIds(model)[0], 'task-11');
  assert.deepEqual(tasks, before);
});

test('weekly recurring schedules honor exceptions, date overrides, and recurrence endings', () => {
  const model = buildWeeklySummary({ now, scheduleItems: [event('class', local(2026, 9, 28, 9), {
    recurrence_type: 'weekly', recurrence_days_of_week: [1, 3, 5], recurrence_end_date: '2026-10-09',
    recurrence_exceptions: ['2026-10-07'], recurrence_overrides: { '2026-10-09': { title: 'Moved class', startTime: '11:30', duration: 90 } },
  })] });
  assert.equal(model.commitmentCount, 2);
  assert.equal(model.days[2].items.length, 0);
  const friday = model.days[4].items[0];
  assert.equal(friday.title, 'Moved class');
  assert.equal(friday.occursAt.getHours(), 11);
  assert.equal(friday.occursAt.getMinutes(), 30);
  assert.equal(friday.endsAt - friday.occursAt, 90 * 60000);
  assert.equal(friday.record._occurrenceDate, '2026-10-09');
});

test('fixed schedule includes personal and university events and timed children, excluding flexible shells and invalid records', () => {
  const model = buildWeeklySummary({ now, scheduleItems: [
    event('personal', local(2026, 10, 6, 9)),
    event('class', local(2026, 10, 6, 10), { workspace: 'university', uniKind: 'event', classId: 'comp' }),
    event('shell', local(2026, 10, 6, 12), { item_kind: 'flexible_shell' }),
    event('child', local(2026, 10, 6, 12), { parent_item_id: 'shell', item_kind: 'event' }),
    event('invalid', 'bad date'), event('outside', local(2026, 10, 12, 9)),
  ] });
  assert.equal(model.commitmentCount, 3);
  assert.deepEqual(model.days[1].items.map((item) => item.record.id), ['personal', 'class', 'child']);
});

test('milestones include unmarked exams, quizzes and university events, but exclude personal events, routine classes and completed exams', () => {
  const model = buildWeeklySummary({ now, scheduleItems: [
    event('exam', local(2026, 10, 9, 10), { workspace: 'university', uni_kind: 'exam', class_id: 'comp' }),
    event('quiz', local(2026, 10, 10, 10), { workspace: 'university', uniKind: 'quiz' }),
    event('event', local(2026, 10, 11, 10), { workspace: 'university', uniKind: 'event' }),
    event('lecture', local(2026, 10, 12, 10), { workspace: 'university', uniKind: 'event', classId: 'comp' }),
    event('personal', local(2026, 10, 12, 12)),
    event('done', local(2026, 10, 13, 10), { workspace: 'university', uniKind: 'exam', completed: true }),
    event('marked-class-event', local(2026, 10, 14, 10), { workspace: 'university', uniKind: 'event', classId: 'comp', isMilestone: true }),
  ] });
  assert.deepEqual(model.milestones.map((item) => item.record.id), ['exam', 'quiz', 'event', 'marked-class-event']);
  assert.equal(model.milestones[0].daysAway, 1);
});

test('milestone horizon includes today through day 13, excludes past times and day 14, and includes marked deadlines', () => {
  const model = buildWeeklySummary({ now, tasks: [
    task('marked-deadline', '2026-10-21', { workspace: 'university', is_milestone: true }),
    task('plain-task', '2026-10-21', { workspace: 'university' }),
    task('completed', '2026-10-21', { workspace: 'university', isMilestone: true, completed: true }),
  ], scheduleItems: [
    event('past', local(2026, 10, 8, 11), { workspace: 'university', uniKind: 'exam' }),
    event('today', local(2026, 10, 8, 13), { workspace: 'university', uniKind: 'exam' }),
    event('last', local(2026, 10, 21, 23, 59), { workspace: 'university', uniKind: 'event' }),
    event('outside', local(2026, 10, 22), { workspace: 'university', uniKind: 'exam' }),
  ] });
  assert.deepEqual(model.milestones.map((item) => item.record.id), ['today', 'last', 'marked-deadline']);
  assert.equal(model.milestones.at(-1).daysAway, 13);
});

test('milestone recurrence also respects occurrence exceptions and no result is capped', () => {
  const model = buildWeeklySummary({ now, scheduleItems: [event('exam', local(2026, 10, 8, 13), {
    workspace: 'university', uniKind: 'exam', recurrenceType: 'daily', recurrenceExceptions: ['2026-10-09'],
  })] });
  assert.equal(model.milestones.length, 13);
  assert.equal(model.milestones.some((item) => item.dateKey === '2026-10-09'), false);
});

test('overnight commitments appear once on their start day with their real end time', () => {
  const model = buildWeeklySummary({ now, scheduleItems: [event('overnight', local(2026, 10, 10, 23, 30), { duration: 120 })] });
  assert.equal(model.commitmentCount, 1);
  assert.equal(model.days[5].items[0].endsAt.getDate(), 11);
  assert.equal(model.days[6].items.length, 0);
});

test('midnight renders as a valid 00:00 input time and overnight ranges identify the next day', () => {
  assert.equal(timeLabel(local(2026, 10, 11)), '00:00');
  assert.equal(timeRange({ occursAt: local(2026, 10, 10, 23), endsAt: local(2026, 10, 11), dateKey: '2026-10-10' }), '23:00–00:00 (+1 day)');
});

test('calendar-day milestone distance is stable across daylight-saving transitions', () => {
  const model = buildWeeklySummary({ now: local(2026, 11, 1, 12), scheduleItems: [event('exam', local(2026, 11, 2, 9), { workspace: 'university', uniKind: 'exam' })] });
  assert.equal(model.milestones[0].daysAway, 1);
});
