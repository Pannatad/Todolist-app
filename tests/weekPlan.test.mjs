import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ROW_COLORS,
    acceptSuggestion,
    blockMatchesTarget,
    buildHabitWeek,
    buildTargetProgress,
    dismissSuggestion,
    draftFromPreviousWeek,
    findFinishedBlocks,
    formatMinutes,
    getWeekKey,
    getWeekNumber,
    normalizeWeekPlan,
    pickDistinctColors,
    setLoggedMinutes,
    shiftWeekKey,
    targetStep,
} from '../src/utils/weekPlan.js';

const local = (year, month, day, hour = 0, minute = 0) => new Date(year, month - 1, day, hour, minute);
const block = (id, start, duration, extra = {}) => ({ id, title: id, startTime: start.toISOString(), duration, ...extra });
const occurrence = (id, title, start, duration, extra = {}) => ({ id, title, displayTime: start, duration, ...extra });

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

test('only finished matching blocks are suggested, and overlaps become one suggestion', () => {
    const items = [
        occurrence('shell', 'AI deep work', local(2026, 10, 26, 9), 180, { itemKind: 'flexible_shell' }),
        occurrence('course', 'AI course', local(2026, 10, 26, 9), 60),
        occurrence('lunch', 'Lunch', local(2026, 10, 26, 12), 60),
        occurrence('later', 'AI side project', local(2026, 10, 26, 15), 60),
        occurrence('old', 'AI old', local(2026, 10, 26, 7), 30, { archived: true }),
    ];
    const found = findFinishedBlocks(items, 'AI', '2026-10-26', local(2026, 10, 26, 14));
    assert.equal(found.length, 1);
    assert.equal(found[0].minutes, 180);
    assert.equal(found[0].title, 'AI deep work');
    assert.equal(found[0].extraCount, 1);
    assert.equal(found[0].key, '2026-10-26|course+shell');
    assert.equal(findFinishedBlocks(items, 'AI', '2026-10-26', local(2026, 10, 26, 16)).length, 2);
    assert.equal(findFinishedBlocks(items, 'AI', '2026-10-26', local(2026, 10, 26, 8)).length, 0);
});

test('Plan blocks never count as done on their own; only logged time does', () => {
    const plan = normalizeWeekPlan({ weekStart: '2026-10-26', targets: [{ id: 't1', label: 'AI', minutes: 120 }] });
    const scheduleItems = [block('AI daily', local(2026, 10, 26, 9), 120, { recurrence_type: 'daily' })];
    const [progress] = buildTargetProgress({ plan, scheduleItems, now: local(2026, 10, 28, 12) });
    assert.deepEqual(progress.days.map((day) => day.done), [0, 0, 0, 0, 0, 0, 0]);
    assert.deepEqual(progress.days.map((day) => day.status), ['missed', 'missed', 'today', 'open', 'open', 'open', 'open']);
    assert.equal(progress.daysMet, 0);
    // Monday, Tuesday, and today's finished block are offered, newest first.
    assert.deepEqual(progress.suggestions.map((item) => item.dateKey), ['2026-10-28', '2026-10-27', '2026-10-26']);
    assert.ok(progress.suggestions.every((item) => item.minutes === 120));
});

test('confirming a suggestion logs its minutes; skipping just stops asking', () => {
    let plan = normalizeWeekPlan({ weekStart: '2026-10-26', targets: [{ id: 't1', label: 'AI', minutes: 120, logged: { '2026-10-26': 30 } }] });
    const scheduleItems = [block('AI daily', local(2026, 10, 26, 9), 120, { recurrence_type: 'daily' })];
    const now = local(2026, 10, 27, 12);
    let [progress] = buildTargetProgress({ plan, scheduleItems, now });
    const [today, monday] = progress.suggestions;
    assert.equal(today.dateKey, '2026-10-27');
    assert.equal(monday.dateKey, '2026-10-26');

    plan = acceptSuggestion(plan, 't1', monday);
    plan = dismissSuggestion(plan, 't1', today.key);
    [progress] = buildTargetProgress({ plan, scheduleItems, now });
    assert.equal(progress.days[0].done, 150);
    assert.equal(progress.days[0].status, 'met');
    assert.equal(progress.days[1].done, 0);
    assert.equal(progress.suggestions.length, 0);
    assert.deepEqual(normalizeWeekPlan(plan).targets[0].reviewed, [monday.key, today.key]);
});

test('logged minutes meet targets and show partial progress', () => {
    const plan = normalizeWeekPlan({
        weekStart: '2026-10-26',
        targets: [{ id: 's', label: 'Study', minutes: 60, logged: { '2026-10-26': 30, '2026-10-27': 60 } }],
    });
    const [progress] = buildTargetProgress({ plan, now: local(2026, 10, 28, 8) });
    assert.equal(progress.days[0].ratio, 0.5);
    assert.equal(progress.days[0].status, 'missed');
    assert.equal(progress.days[1].status, 'met');
    assert.equal(progress.days[2].status, 'today');
    assert.equal(progress.daysMet, 1);
});

test('setting logged minutes replaces the day value and zero removes it', () => {
    let plan = normalizeWeekPlan({ weekStart: '2026-10-26', targets: [{ id: 'a', label: 'AI', minutes: 120 }, { id: 'b', label: 'Study', minutes: 60 }] });
    plan = setLoggedMinutes(plan, 'a', '2026-10-26', 45);
    plan = setLoggedMinutes(plan, 'a', '2026-10-26', 90);
    assert.deepEqual(plan.targets[0].logged, { '2026-10-26': 90 });
    assert.equal(plan.targets[1].logged, undefined);
    plan = setLoggedMinutes(plan, 'a', '2026-10-26', 0);
    assert.equal(plan.targets[0].logged, undefined);
});

test('every target gets its own color and keeps it', () => {
    const plan = normalizeWeekPlan({
        weekStart: '2026-10-26',
        targets: [
            { id: 'a', label: 'AI', minutes: 60, color: '#FF9500' },
            { id: 'b', label: 'Study', minutes: 60 },
            { id: 'c', label: 'Read', minutes: 30, color: '#ff9500' },
        ],
    });
    const colors = plan.targets.map((target) => target.color);
    assert.equal(colors[0], '#ff9500');
    assert.equal(new Set(colors).size, 3);
    assert.deepEqual(normalizeWeekPlan(plan).targets.map((target) => target.color), colors);
});

test('distinct colors keep free preferences and avoid taken ones', () => {
    assert.deepEqual(pickDistinctColors(['#34c759', '#34c759', 'teal'], ['#007aff']), ['#34c759', '#ff9500', '#af52de']);
    assert.equal(new Set(pickDistinctColors(Array(ROW_COLORS.length).fill(null))).size, ROW_COLORS.length);
    // A later item's own free color is kept before earlier clashing items are reassigned.
    assert.deepEqual(pickDistinctColors(['#007aff', '#ff9500'], ['#007aff']), ['#34c759', '#ff9500']);
});

test('plans are cleaned: blank targets dropped, logged and reviewed tidied', () => {
    const plan = normalizeWeekPlan({
        week_start: '2026-10-26',
        targets: [
            { label: 'AI', minutes: 120, logged: { '2026-10-27': '30', bad: 10, '2026-10-28': -5 }, reviewed: ['k1', 'k1', 4] },
            { label: '', minutes: 30 },
            { label: 'Gym', minutes: 0 },
        ],
    });
    assert.equal(plan.weekStart, '2026-10-26');
    assert.deepEqual(plan.targets.map((target) => target.label), ['AI']);
    assert.deepEqual(plan.targets[0].logged, { '2026-10-27': 30 });
    assert.deepEqual(plan.targets[0].reviewed, ['k1']);
});

test('a new week copies targets and colors, with nothing logged or reviewed', () => {
    const previous = normalizeWeekPlan({
        weekStart: '2026-10-19',
        targets: [{ id: 'a', label: 'AI', minutes: 120, color: '#af52de', logged: { '2026-10-20': 60 }, reviewed: ['x'] }],
    });
    const draft = draftFromPreviousWeek(previous, '2026-10-26');
    assert.equal(draft.weekStart, '2026-10-26');
    assert.deepEqual(draft.targets.map((target) => [target.label, target.minutes, target.color]), [['AI', 120, '#af52de']]);
    assert.notEqual(draft.targets[0].id, 'a');
    assert.equal(draft.targets[0].logged, undefined);
    assert.equal(draft.targets[0].reviewed, undefined);
    assert.deepEqual(draftFromPreviousWeek(null, '2026-10-26').targets, []);
});

test('habit week reads logs, partial counts, and unscheduled days', () => {
    const logs = {
        'h_2026-10-26': { completed: true },
        'h_2026-10-28': { completed: false, value: 2 },
    };
    const week = buildHabitWeek({
        habit: { id: 'h', type: 'count', target: 4 },
        weekStart: '2026-10-26',
        getLog: (id, key) => logs[`${id}_${key}`],
        isScheduled: (_habit, date) => date.getDay() !== 0,
        now: local(2026, 10, 28, 9),
    });
    assert.deepEqual(week.map((day) => day.status), ['met', 'missed', 'today', 'open', 'open', 'open', 'off']);
    assert.equal(week[2].ratio, 0.5);
});

test('minutes format', () => {
    assert.equal(formatMinutes(0), '0m');
    assert.equal(formatMinutes(45), '45m');
    assert.equal(formatMinutes(120), '2h');
    assert.equal(formatMinutes(90), '1h 30m');
});

test('one tap is 15 minutes, or 30 for targets of 2 hours or more', () => {
    assert.equal(targetStep(30), 15);
    assert.equal(targetStep(60), 15);
    assert.equal(targetStep(90), 15);
    assert.equal(targetStep(120), 30);
    assert.equal(targetStep(300), 30);
});
