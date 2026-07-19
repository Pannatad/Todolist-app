import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildPlanDayPayloads,
    occurrencesToTemplateBlocks,
    resolveTemplate,
    sanitizeTemplateBlocks
} from '../src/services/agentScheduleActions.js';

test('sanitizeTemplateBlocks drops invalid blocks, pads times, and sorts', () => {
    const blocks = sanitizeTemplateBlocks([
        { title: 'Gym', startTime: '15:30', duration: 90, category: 'Health' },
        { title: 'Deep work', startTime: '8:30', duration: 240 },
        { title: 'No time' },
        { startTime: '10:00' }
    ]);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].title, 'Deep work');
    assert.equal(blocks[0].startTime, '08:30');
    assert.equal(blocks[1].title, 'Gym');
});

test('resolveTemplate matches by id, exact name, then partial name', () => {
    const templates = [
        { id: 1, name: 'Standard workday' },
        { id: 2, name: 'Gym day' }
    ];
    assert.equal(resolveTemplate(templates, { templateId: 2 }).name, 'Gym day');
    assert.equal(resolveTemplate(templates, { name: 'standard workday' }).id, 1);
    assert.equal(resolveTemplate(templates, { name: 'workday' }).id, 1);
    assert.equal(resolveTemplate(templates, { name: 'unknown' }), null);
});

test('template blocks expand into schedule payloads on a target date', () => {
    const payloads = buildPlanDayPayloads({
        date: '2026-07-21',
        blocks: [{ title: 'Deep work', startTime: '08:30', duration: 240, category: 'Work' }]
    });
    assert.equal(payloads.length, 1);
    const start = new Date(payloads[0].startTime);
    assert.equal(start.getHours(), 8);
    assert.equal(start.getMinutes(), 30);
    assert.equal(payloads[0].duration, 240);
});

test('occurrencesToTemplateBlocks captures displayed titles and times', () => {
    const blocks = occurrencesToTemplateBlocks([
        { title: 'Push day', displayTime: new Date(2026, 6, 20, 15, 30), duration: 90, category: 'Health', color: '#22c55e' },
        { title: 'Deep work', startTime: new Date(2026, 6, 20, 8, 30).toISOString(), duration: 240 }
    ]);
    assert.equal(blocks.length, 2);
    assert.deepEqual(blocks.map((block) => block.startTime), ['08:30', '15:30']);
    assert.equal(blocks[1].color, '#22c55e');
});
