import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveChatRenderMode } from '../src/services/chatRenderMode.js';

test('ordinary conversation never becomes a structured habit card from its wording', () => {
  const answer = 'I do not need habit trackers; you can just talk to me naturally.';
  assert.match(answer, /habit/i);
  assert.equal(resolveChatRenderMode(undefined), 'plain');
  assert.equal(resolveChatRenderMode(null), 'plain');
});

test('structured cards require an explicit deterministic render hint', () => {
  assert.equal(resolveChatRenderMode('habits'), 'habits');
  assert.equal(resolveChatRenderMode('schedule'), 'schedule');
  assert.equal(resolveChatRenderMode('overview'), 'overview');
  assert.equal(resolveChatRenderMode('made-up-mode'), 'plain');
});
