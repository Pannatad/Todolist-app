import test from 'node:test';
import assert from 'node:assert/strict';
import { formatTaskDueRelative } from '../src/components/taskDueFormat.js';

const now = new Date('2026-08-05T10:00:00Z');

test('future relative due time rounds up days at and above 24 hours', () => {
    assert.equal(formatTaskDueRelative('2026-08-07T09:01:00Z', now), '2d left');
    assert.equal(formatTaskDueRelative('2026-08-06T10:00:00Z', now), '1d left');
});

test('future relative due time rounds up hours below 24 hours', () => {
    assert.equal(formatTaskDueRelative('2026-08-06T04:00:00Z', now), '18h left');
    assert.equal(formatTaskDueRelative('2026-08-05T10:01:00Z', now), '1h left');
});

test('past relative due time rounds up hours and days', () => {
    assert.equal(formatTaskDueRelative('2026-08-05T08:01:00Z', now), 'Overdue by 2h');
    assert.equal(formatTaskDueRelative('2026-08-03T10:59:00Z', now), 'Overdue by 2d');
});

test('missing deadlines retain their non-toggle label', () => {
    assert.equal(formatTaskDueRelative(null, now), 'No due date');
});
