import test from 'node:test';
import assert from 'node:assert/strict';

import {
  canHandleLocally,
  generateLocalResponse
} from '../src/services/localAgentHandler.js';

test('schedule read questions are handled locally as existing-data queries', () => {
  const readOnlyQuestions = [
    'what is my schedule',
    "what's my schedule today",
    'can you show me my schedule',
    'do I have anything today',
    "what's on my calendar today"
  ];

  for (const question of readOnlyQuestions) {
    assert.equal(canHandleLocally(question), 'scheduleQuery', question);
  }
});

test('schedule creation requests are not treated as read-only schedule queries', () => {
  const creationRequests = [
    'schedule a meeting at 4',
    'add a schedule for gym tonight',
    'block time for writing tomorrow',
    'create an event today'
  ];

  for (const request of creationRequests) {
    assert.notEqual(canHandleLocally(request), 'scheduleQuery', request);
  }
});

test('schedule local response reports existing events without add actions', () => {
  const eventTime = new Date();
  eventTime.setHours(15, 30, 0, 0);

  const response = generateLocalResponse('scheduleQuery', {
    recentSchedule: [
      {
        id: 'event-1',
        title: 'Design review',
        startTime: eventTime.toISOString(),
        duration: 45
      }
    ]
  });

  assert.equal(response.actions.length, 1);
  assert.equal(response.actions[0].type, 'info_response');
  assert.match(response.actions[0].params.message, /Design review/);
  assert.doesNotMatch(JSON.stringify(response), /add_schedule/);
});

