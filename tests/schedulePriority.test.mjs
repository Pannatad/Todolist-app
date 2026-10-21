import test from 'node:test';
import assert from 'node:assert/strict';
import {
    normalizeSchedulePriority,
    schedulePriorityClass,
    schedulePriorityLabel
} from '../src/utils/schedulePriority.js';
import { getScheduleItemsForDate, upsertOverride } from '../src/utils/scheduleOccurrences.js';
import {
    buildDayPlanSchedulePayloads,
    buildTemplateSchedulePayloads,
    occurrencesToMagicTemplateBlocks,
    sanitizeMagicTemplateBlocks
} from '../src/services/magicSchedule.js';

const weeklyGym = (fields = {}) => ({
    id: 'gym',
    title: 'Gym',
    duration: 60,
    start_time: new Date(2026, 9, 5, 18, 0).toISOString(), // Mon Oct 5 2026, 18:00 local
    recurrence_type: 'weekly',
    recurrence_days_of_week: [1],
    priority: 3,
    ...fields
});

test('priority normalizes to 1, 2 or 3 with 2 as the default', () => {
    assert.equal(normalizeSchedulePriority(1), 1);
    assert.equal(normalizeSchedulePriority('3'), 3);
    assert.equal(normalizeSchedulePriority(undefined), 2);
    assert.equal(normalizeSchedulePriority(null), 2);
    assert.equal(normalizeSchedulePriority(7), 2);
    assert.equal(schedulePriorityLabel(3), 'Must');
    assert.equal(schedulePriorityLabel(undefined), 'Should');
    assert.equal(schedulePriorityClass(2), '');
    assert.equal(schedulePriorityClass(1), 'is-priority-1');
});

test('a date override changes priority for that occurrence only', () => {
    const item = weeklyGym();
    item.recurrence_overrides = upsertOverride(item, '2026-10-19', { priority: 1 });

    const [examWeek] = getScheduleItemsForDate([item], new Date(2026, 9, 19));
    const [nextWeek] = getScheduleItemsForDate([item], new Date(2026, 9, 26));

    assert.equal(examWeek.priority, 1);
    assert.equal(examWeek._seriesBase.priority, 3);
    assert.equal(nextWeek.priority, 3);
});

test('template blocks keep priority from saved days through to new schedule items', () => {
    const blocks = occurrencesToMagicTemplateBlocks(getScheduleItemsForDate([weeklyGym()], new Date(2026, 9, 19)));
    assert.equal(blocks[0].priority, 3);

    const [payload] = buildTemplateSchedulePayloads({ id: 't1', version: 1, blocks }, { date: '2026-10-21' });
    assert.equal(payload.priority, 3);

    const [dayPayload] = buildDayPlanSchedulePayloads({
        date: '2026-10-21',
        blocks: [{ title: 'Read', startTime: '12:00', duration: 45, priority: 1 }]
    });
    assert.equal(dayPayload.priority, 1);
});

test('template blocks without a priority get the default', () => {
    const [block] = sanitizeMagicTemplateBlocks([{ title: 'Lunch', startTime: '12:00', duration: 60 }]);
    assert.equal(block.priority, 2);
});
