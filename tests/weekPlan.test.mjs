import test from 'node:test';
import assert from 'node:assert/strict';
import {
    blockMatchesTarget,
    buildHabitWeek,
    buildTargetProgress,
    draftFromPreviousWeek,
    formatMinutes,
    getWeekKey,
    getWeekNumber,
    measureTargetDay,
    normalizeWeekPlan,
    shiftWeekKey,
} from '../src/utils/weekPlan.js';

const local = (year, month, day, hour = 0, minute = 0) => new Date(year, month - 1, day, hour, minute);
const block = (id, start, duration, extra = {}) => ({ id, title: id, startTime: start.toISOString(), duration, ...extra });
const occurrence = (title, start, duration, extra = {}) => ({ title, displayTime: start, duration, ...extra });

test('weeks start on Monday, including across a year boundary', () => {
    assert.equal(getWeekKey(local(2026, 10, 26, 9)), '2026-10-26');
    assert.equal(getWeekKey(local(2026, 11, 1, 23, 59)), '2026-10-26');
    assert.equal(getWeekKey(local(2027, 1, 1)), '2026-12-28');
    assert.equal(shiftWeekKey('2026-12-28', 1), '2027-01-04');
    assert.equal(shiftWeekKey('2026-10-26', -1), '2026-10-19');
});

test('ISO week numbers', () => {
    assert.equal(getWeekNumber(local(2026, 10, 26)), 44);
    assert.equal(getWeekNumber(local(2026, 12, 28)), 53);
    assert.equal(getWeekNumber(local(2027, 1, 4)), 1);
});

test('a block matches by category or by a whole word in its title', () => {
    assert.equal(blockMatchesTarget({ title: 'AI course' }, 'AI'), true);
    assert.equal(blockMatchesTarget({ title: 'Deep work: ai-agents' }, 'AI'), true);
    assert.equal(blockMatchesTarget({ title: 'Said hello' }, 'AI'), false);
    assert.equal(blockMatchesTarget({ title: 'Maintain bike' }, 'AI'), false);
    assert.equal(blockMatchesTarget({ title: 'Lecture', category: 'Study' }, 'study'), true);
    assert.equal(blockMatchesTarget({ title: 'C++ practice' }, 'C++'), true);
    assert.equal(blockMatchesTarget({ title: 'อ่านหนังสือสอบ' }, 'อ่านหนังสือ'), true);
    assert.equal(blockMatchesTarget({ title: 'Gym' }, ''), false);
});

test('passed time counts as done and time ahead as planned', () => {
    const items = [
        occurrence('AI course', local(2026, 10, 26, 9), 120),
        occurrence('Lunch', local(2026, 10, 26, 12), 60),
        occurrence('AI side project', local(2026, 10, 26, 15), 60),
    ];
    assert.deepEqual(measureTargetDay(items, 'AI', local(2026, 10, 26, 10, 30)), { done: 90, planned: 90 });
    assert.deepEqual(measureTargetDay(items, 'AI', local(2026, 10, 26, 18)), { done: 180, planned: 0 });
    assert.deepEqual(measureTargetDay(items, 'AI', local(2026, 10, 26, 7)), { done: 0, planned: 180 });
});

test('overlapping blocks, like a shell and the block inside it, are not counted twice', () => {
    const items = [
        occurrence('AI deep work', local(2026, 10, 26, 9), 180, { itemKind: 'flexible_shell' }),
        occurrence('AI course', local(2026, 10, 26, 9), 60),
        occurrence('AI reading', local(2026, 10, 26, 11, 30), 60),
    ];
    assert.deepEqual(measureTargetDay(items, 'AI', local(2026, 10, 27)), { done: 210, planned: 0 });
});

test('archived blocks never count', () => {
    const items = [occurrence('AI course', local(2026, 10, 26, 9), 60, { archived: true })];
    assert.deepEqual(measureTargetDay(items, 'AI', local(2026, 10, 27)), { done: 0, planned: 0 });
});

test('week progress marks met, missed, today, planned, and open days', () => {
    const plan = normalizeWeekPlan({ weekStart: '2026-10-26', targets: [{ id: 't1', label: 'AI', minutes: 120 }] });
    const scheduleItems = [
        block('AI daily', local(2026, 10, 26, 9), 120, { recurrence_type: 'daily', recurrence_exceptions: ['2026-10-27'] }),
        block('AI extra', local(2026, 10, 30, 14), 60),
    ];
    const [progress] = buildTargetProgress({ plan, scheduleItems, now: local(2026, 10, 28, 10) });
    assert.deepEqual(progress.days.map((day) => day.status), ['met', 'missed', 'today', 'planned', 'planned', 'planned', 'planned']);
    assert.equal(progress.today.done, 60);
    assert.equal(progress.today.planned, 60);
    assert.equal(progress.days[4].planned, 180);
    assert.equal(progress.daysMet, 1);
});

test('a target with no matching blocks stays open ahead and missed behind', () => {
    const plan = normalizeWeekPlan({ weekStart: '2026-10-26', targets: [{ label: 'Study', minutes: 60 }] });
    const [progress] = buildTargetProgress({ plan, scheduleItems: [], now: local(2026, 10, 27, 8) });
    assert.deepEqual(progress.days.map((day) => day.status), ['missed', 'today', 'open', 'open', 'open', 'open', 'open']);
});

test('plans are cleaned: blank targets and tasks dropped, limits applied', () => {
    const plan = normalizeWeekPlan({
        week_start: '2026-10-26',
        theme: '  Ship   the AI app ',
        build_habit_id: 'h1',
        targets: [{ label: 'AI', minutes: 120 }, { label: '', minutes: 30 }, { label: 'Gym', minutes: 0 }],
        key_tasks: [{ title: 'One' }, { title: ' ' }, { title: 'Two', done: true }, { title: 'Three' }, { title: 'Four' }],
    });
    assert.equal(plan.weekStart, '2026-10-26');
    assert.equal(plan.theme, 'Ship the AI app');
    assert.equal(plan.buildHabitId, 'h1');
    assert.deepEqual(plan.targets.map((target) => target.label), ['AI']);
    assert.deepEqual(plan.keyTasks.map((task) => [task.title, task.done]), [['One', false], ['Two', true], ['Three', false]]);
});

test('a new week copies habits and targets and carries unfinished key tasks', () => {
    const previous = normalizeWeekPlan({
        weekStart: '2026-10-19',
        theme: 'Old direction',
        buildHabitId: 'read',
        breakHabitId: 'phone',
        targets: [{ id: 'a', label: 'AI', minutes: 120 }],
        keyTasks: [{ id: 'k1', title: 'Done thing', done: true }, { id: 'k2', title: 'Open thing' }],
    });
    const draft = draftFromPreviousWeek(previous, '2026-10-26');
    assert.equal(draft.weekStart, '2026-10-26');
    assert.equal(draft.theme, '');
    assert.equal(draft.buildHabitId, 'read');
    assert.equal(draft.breakHabitId, 'phone');
    assert.deepEqual(draft.targets.map((target) => [target.label, target.minutes]), [['AI', 120]]);
    assert.notEqual(draft.targets[0].id, 'a');
    assert.deepEqual(draft.keyTasks.map((task) => task.title), ['Open thing']);
    assert.deepEqual(draftFromPreviousWeek(null, '2026-10-26').targets, []);
});

test('habit week reads logs into day states', () => {
    const logs = { 'h_2026-10-26': { completed: true }, 'h_2026-10-28': { completed: true } };
    const week = buildHabitWeek({
        habit: { id: 'h' },
        weekStart: '2026-10-26',
        getLog: (id, key) => logs[`${id}_${key}`],
        now: local(2026, 10, 28, 9),
    });
    assert.deepEqual(week.map((day) => day.status), ['met', 'missed', 'met', 'open', 'open', 'open', 'open']);
});

test('minutes format', () => {
    assert.equal(formatMinutes(0), '0m');
    assert.equal(formatMinutes(45), '45m');
    assert.equal(formatMinutes(120), '2h');
    assert.equal(formatMinutes(90), '1h 30m');
});
