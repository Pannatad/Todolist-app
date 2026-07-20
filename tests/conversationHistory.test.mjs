import test from 'node:test';
import assert from 'node:assert/strict';

import { getConversationWindowPlan } from '../src/services/conversationHistory.js';

test('short conversations remain verbatim without a summary request', () => {
  assert.deepEqual(getConversationWindowPlan(20), {
    targetSummaryCount: 0,
    nextSummaryStart: 0,
    nextSummaryEnd: 0,
    recentStart: 0,
    recentCount: 20
  });
});

test('conversation history is summarized in batches and remains bounded', () => {
  assert.deepEqual(getConversationWindowPlan(29), {
    targetSummaryCount: 0,
    nextSummaryStart: 0,
    nextSummaryEnd: 0,
    recentStart: 0,
    recentCount: 29
  });

  assert.deepEqual(getConversationWindowPlan(30), {
    targetSummaryCount: 10,
    nextSummaryStart: 0,
    nextSummaryEnd: 10,
    recentStart: 10,
    recentCount: 20
  });

  assert.deepEqual(getConversationWindowPlan(100, 70), {
    targetSummaryCount: 80,
    nextSummaryStart: 70,
    nextSummaryEnd: 80,
    recentStart: 80,
    recentCount: 20
  });
});
