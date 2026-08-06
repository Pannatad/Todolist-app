import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCompletionReward, getTaskChunkEstimate, normalizeTaskRecord, sanitizeTaskUpdates } from '../src/utils/taskState.js';
import { normalizeProjectRecord, normalizeProjectTask } from '../src/context/projectUtils.js';
import { prioritizeTasks } from '../src/services/agentTools.js';
import { sanitizeActivitySuggestions, sanitizeParsedTask, sanitizeParsedTasks } from '../src/utils/taskParsing.js';

test('nested subtask estimates aggregate and zero subtasks have no estimate', () => {
    assert.equal(getTaskChunkEstimate({ subtasks: [{ title: 'Parent', estimatedTime: 999, difficulty: 'hard', subtasks: [{ title: 'A', estimatedTime: 30 }, { title: 'B', estimatedTime: 45 }] }] }), 75);
    assert.equal(getTaskChunkEstimate({ subtasks: [] }), 0);
});

test('personal normalization strips legacy difficulty recursively', () => {
    const task = normalizeTaskRecord({ id: 1, title: 'Legacy', difficulty: 'hard', subtasks: [{ title: 'Step', difficulty: 'medium', estimatedTime: 999, subtasks: [{ title: 'Nested', difficulty: 'easy', estimatedTime: 45 }] }] });
    assert.equal('difficulty' in task, false);
    assert.equal('difficulty' in task.subtasks[0], false);
    assert.equal('difficulty' in task.subtasks[0].subtasks[0], false);
    assert.equal(task.subtasks[0].estimatedTime, 45);
    assert.equal(getTaskChunkEstimate(task), 45);
});

test('project normalization strips task and nested subtask difficulty while preserving priority', () => {
    const project = normalizeProjectRecord({ id: 'p', tasks: [{ id: 't', title: 'Task', priority: 'High', difficulty: 'Hard', subtasks: [{ title: 'Step', difficulty: 'easy', subtasks: [{ title: 'Nested', difficulty: 'hard' }] }] }] });
    assert.equal('difficulty' in project.tasks[0], false);
    assert.equal('difficulty' in project.tasks[0].subtasks[0], false);
    assert.equal('difficulty' in project.tasks[0].subtasks[0].subtasks[0], false);
    assert.equal(project.tasks[0].priority, 'High');
});

test('project persistence sanitizer strips difficulty recursively', () => {
    const task = normalizeProjectTask({ title: 'Task', priority: 'Medium', difficulty: 'Hard', subtasks: [{ title: 'Step', difficulty: 'easy', subtasks: [{ title: 'Nested', difficulty: 'hard' }] }] });
    assert.equal('difficulty' in task, false);
    assert.equal('difficulty' in task.subtasks[0], false);
    assert.equal('difficulty' in task.subtasks[0].subtasks[0], false);
    assert.equal(task.priority, 'Medium');
});

test('prioritization is invariant to legacy difficulty', () => {
    const base = [{ id: 1, title: 'A', deadline: '2026-08-06T10:00:00Z', estimatedTime: 30 }, { id: 2, title: 'B', deadline: '2026-08-07T10:00:00Z', estimatedTime: 20 }];
    const now = new Date('2026-08-05T10:00:00Z');
    const left = prioritizeTasks({ recentTasks: base.map((task) => ({ ...task, difficulty: 'easy' })) }, { now });
    const right = prioritizeTasks({ recentTasks: base.map((task) => ({ ...task, difficulty: 'hard' })) }, { now });
    assert.deepEqual(left, right);
});

test('completion reward uses fixed base and preserves deadline adjustment', () => {
    assert.equal(calculateCompletionReward({ difficulty: 'hard' }), 10);
    assert.equal(calculateCompletionReward({ difficulty: 'easy', deadline: '2026-08-06T00:00:00Z' }, new Date('2026-08-05T00:00:00Z')), 20);
    assert.equal(calculateCompletionReward({ difficulty: 'hard', deadline: '2026-08-04T00:00:00Z' }, new Date('2026-08-05T00:00:00Z')), 5);
});

test('AI task updates ignore incoming difficulty', () => {
    assert.deepEqual(sanitizeTaskUpdates({ title: 'Updated', difficulty: 'hard' }), { title: 'Updated' });
});

test('image task parsing returns the exact supported task shape', () => {
    assert.deepEqual(sanitizeParsedTask({ title: '  Read  ', difficulty: 'hard', deadline: 'invalid', subject: ' Study ', estimatedTime: '45', extra: true }), {
        title: 'Read', deadline: null, subject: 'Study', estimatedTime: 45,
    });
});

test('image task list sanitization cannot consume activity suggestions', () => {
    assert.deepEqual(sanitizeParsedTasks([{ title: 'Read', difficulty: 'hard', estimatedTime: 20 }]), [{ title: 'Read', deadline: null, subject: null, estimatedTime: 20 }]);
    assert.deepEqual(sanitizeParsedTasks([{ activity: 'Stretch', duration: 10, category: 'Health' }]), []);
});

test('smart activity suggestions preserve their activity shape', () => {
    assert.deepEqual(sanitizeActivitySuggestions([{ activity: ' Stretch ', duration: '10', category: ' Health ', difficulty: 'easy' }]), [{ activity: 'Stretch', duration: 10, category: 'Health' }]);
});
