import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canHandleLocally,
  generateLocalResponse,
} from '../src/services/localAgentHandler.js';

test('day-summary wording uses the deterministic overview route', () => {
  const overviewRequests = [
    'summarize my today',
    'Summarize my day.',
    'Can you summarize my day?',
    "Give me today's overview",
    'show me a summary of today',
    "what's my day like?",
  ];

  for (const request of overviewRequests) {
    assert.equal(canHandleLocally(request), 'overview', request);
  }

  assert.equal(canHandleLocally('hello there'), null);
});

test('day overview includes only schedule items from today', () => {
  const now = new Date();
  const atDayOffset = (offset, hour) => new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + offset,
    hour,
    0,
    0,
    0,
  ).toISOString();

  const plan = generateLocalResponse('overview', {
    recentSchedule: [
      { title: 'Yesterday event', startTime: atDayOffset(-1, 9) },
      { title: 'Today event', startTime: atDayOffset(0, 10) },
      { title: 'Tomorrow event', startTime: atDayOffset(1, 11) },
    ],
    tasksDueToday: [{ title: 'Today task' }],
    habits: [{ name: 'Drink water', frequency: 'Daily', completedToday: false }],
    dailyHighlights: [{ text: 'Finish the important thing' }],
  });

  const message = plan.actions[0].params.message;
  assert.match(message, /Today event/);
  assert.doesNotMatch(message, /Yesterday event/);
  assert.doesNotMatch(message, /Tomorrow event/);
  assert.match(message, /Today task/);
  assert.match(message, /Drink water/);
  assert.match(message, /Finish the important thing/);
});
