import test from 'node:test';
import assert from 'node:assert/strict';
import {
    getOverrideForDate,
    getScheduleItemsForDate,
    upsertOverride,
    weekdayOverrideKey
} from '../src/utils/scheduleOccurrences.js';

const dailyBlock = (overrides = {}) => ({
    id: 'evt-1',
    title: 'Deep work',
    category: 'Work',
    color: '#6366f1',
    duration: 240,
    start_time: new Date(2026, 6, 1, 8, 30).toISOString(), // Jul 1 2026, 08:30 local
    recurrence_type: 'daily',
    recurrence_overrides: overrides
});

// Mon Jul 20 2026
const monday = new Date(2026, 6, 20, 7, 0);

test('weekday override applies to every matching weekday', () => {
    const item = dailyBlock({ [weekdayOverrideKey(1)]: { title: 'Push day' } });
    const [occurrence] = getScheduleItemsForDate([item], monday);
    assert.equal(occurrence.title, 'Push day');
    assert.equal(occurrence._seriesTitle, 'Deep work');
    assert.equal(occurrence._hasOverride, true);
});

test('date override wins over weekday override', () => {
    const item = dailyBlock({
        [weekdayOverrideKey(1)]: { title: 'Push day' },
        '2026-07-20': { title: 'Full AI practice', duration: 180 }
    });
    const [occurrence] = getScheduleItemsForDate([item], monday);
    assert.equal(occurrence.title, 'Full AI practice');
    assert.equal(occurrence.duration, 180);
});

test('startTime override shifts the occurrence display time', () => {
    const item = dailyBlock({ '2026-07-20': { startTime: '09:30' } });
    const [occurrence] = getScheduleItemsForDate([item], monday);
    assert.equal(occurrence.displayTime.getHours(), 9);
    assert.equal(occurrence.displayTime.getMinutes(), 30);
});

test('days without overrides keep series values', () => {
    const item = dailyBlock({ '2026-07-20': { title: 'Full AI practice' } });
    const tuesday = new Date(2026, 6, 21, 7, 0);
    const [occurrence] = getScheduleItemsForDate([item], tuesday);
    assert.equal(occurrence.title, 'Deep work');
    assert.equal(occurrence._hasOverride, false);
});

test('upsertOverride adds, replaces, and clears keys', () => {
    const item = dailyBlock();
    const added = upsertOverride(item, '2026-07-20', { title: 'Light work' });
    assert.deepEqual(added, { '2026-07-20': { title: 'Light work' } });

    const cleared = upsertOverride({ ...item, recurrence_overrides: added }, '2026-07-20', {});
    assert.deepEqual(cleared, {});
});

test('getOverrideForDate merges weekday and date overrides', () => {
    const item = dailyBlock({
        [weekdayOverrideKey(1)]: { title: 'Push day', color: '#ef4444' },
        '2026-07-20': { title: 'Deload day' }
    });
    const merged = getOverrideForDate(item, monday);
    assert.equal(merged.title, 'Deload day');
    assert.equal(merged.color, '#ef4444');
});
