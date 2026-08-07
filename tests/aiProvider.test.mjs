import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_AI_PROVIDER,
  normalizeAIProvider,
  getAIProviderRequestOptions,
  getAIProviderLabel
} from '../src/services/aiProvider.js';
import { createGenerativeModel } from '../src/services/generativeClient.js';
import {
  extractConversationText,
  shouldIncludeAgentState,
  shouldUseAgentActionMode
} from '../src/services/agentResponseSchema.js';

test('Local Gemma is the default chat provider', () => {
  assert.equal(DEFAULT_AI_PROVIDER, 'local');
  assert.equal(normalizeAIProvider(undefined), 'local');
  assert.equal(normalizeAIProvider('unknown'), 'local');
});

test('Gemini requests are explicitly routed to the Gemini proxy provider', () => {
  assert.deepEqual(getAIProviderRequestOptions('gemini'), {
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite-preview'
  });
});

test('Local requests are routed to LM Studio without pinning a model id', () => {
  assert.deepEqual(getAIProviderRequestOptions('local'), {
    provider: 'lmstudio',
    fallbackToGemini: false,
    enableThinking: false
  });
  assert.deepEqual(getAIProviderRequestOptions('local', { enableThinking: true }), {
    provider: 'lmstudio',
    fallbackToGemini: false,
    enableThinking: true
  });
});

test('Old Qwen provider setting remains normalized to local', () => {
  assert.equal(normalizeAIProvider('qwen'), 'local');
  assert.deepEqual(getAIProviderRequestOptions('qwen'), {
    provider: 'lmstudio',
    fallbackToGemini: false,
    enableThinking: false
  });
});

test('Provider labels are user-facing and concise', () => {
  assert.equal(getAIProviderLabel('gemini'), 'Gemini');
  assert.equal(getAIProviderLabel('local'), 'Gemma Local');
});

test('Generative client forwards local provider options to the AI proxy', async () => {
  const requests = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (path, init) => {
    requests.push({ path, body: JSON.parse(init.body) });
    return {
      ok: true,
      json: async () => ({ text: 'ok' })
    };
  };

  try {
    const model = createGenerativeModel(getAIProviderRequestOptions('local'));

    await model.generateContent('hello local model');
    await model.startChat({ history: [] }).sendMessage('continue');

    assert.deepEqual(requests.map(request => request.path), [
      '/api/ai/generate',
      '/api/ai/chat'
    ]);

    for (const request of requests) {
      assert.equal(request.body.provider, 'lmstudio');
      assert.equal(request.body.model, undefined);
      assert.equal(request.body.fallbackToGemini, false);
      assert.equal(request.body.enableThinking, false);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('conversation questions stay out of action mode', () => {
  assert.equal(shouldUseAgentActionMode('What is the difference between a task and a habit?'), false);
  assert.equal(shouldUseAgentActionMode('Give me one concrete example of each using exercise.'), false);
  assert.equal(shouldUseAgentActionMode('How do I create a task?'), false);
});

test('explicit app mutations use action mode', () => {
  assert.equal(shouldUseAgentActionMode('Add a task to buy milk tomorrow.'), true);
  assert.equal(shouldUseAgentActionMode('Can you schedule a focus block at 2 PM?'), true);
  assert.equal(shouldUseAgentActionMode('Make it 60 minutes.', { hasPendingAction: true }), true);
});

test('schedule intent chips route shorthand messages into action mode', () => {
  assert.equal(shouldUseAgentActionMode('tutoring prep: 5-5:30 pm', { scheduleIntent: 'add' }), true);
  assert.equal(shouldUseAgentActionMode('the morning block', { scheduleIntent: 'delete' }), true);
  assert.equal(shouldUseAgentActionMode('make it shorter', { scheduleIntent: 'modify' }), true);
  assert.equal(shouldUseAgentActionMode('what should I do this afternoon?', { scheduleIntent: 'ask' }), false);
});

test('scheduling verbs beyond the basics use action mode', () => {
  // Previously fell into conversation mode and silently did nothing.
  assert.equal(shouldUseAgentActionMode('Duplicate my gym session to tomorrow.'), true);
  assert.equal(shouldUseAgentActionMode('Plan my day.'), true);
  assert.equal(shouldUseAgentActionMode('Apply my standard workday to Friday.'), true);
  assert.equal(shouldUseAgentActionMode('Save today as a template called Deep Work.'), true);
  assert.equal(shouldUseAgentActionMode('Change the category of my gym block to Health.'), true);
  assert.equal(shouldUseAgentActionMode('Delete my 3pm meeting.'), true);
  assert.equal(shouldUseAgentActionMode('Add a meeting at 2pm and a call at 4pm.'), true);
  // Verb not at the very start, but clearly a command on app data.
  assert.equal(shouldUseAgentActionMode('For Friday, duplicate my gym block.'), true);
  assert.equal(shouldUseAgentActionMode('I need to reschedule my deep work block to 10am.'), true);
});

test('questions that merely mention actions stay conversational', () => {
  assert.equal(shouldUseAgentActionMode('How do I duplicate an event?'), false);
  assert.equal(shouldUseAgentActionMode('What should I add to my schedule?'), false);
  assert.equal(shouldUseAgentActionMode('Should I move my gym session?'), false);
});

test('generic conversation avoids unnecessary app-state prompt data', () => {
  assert.equal(shouldIncludeAgentState('Explain how sleep supports memory.'), false);
  assert.equal(shouldIncludeAgentState('Tell me more about that.'), false);
  assert.equal(shouldIncludeAgentState('What tasks should I prioritize today?'), true);
  assert.equal(shouldIncludeAgentState('What is on my calendar tomorrow?'), true);
});

test('conversation mode unwraps accidental JSON without exposing action formatting', () => {
  assert.equal(
    extractConversationText('```json\n{"actions":[],"summary":"Thinking is disabled."}\n```'),
    'Thinking is disabled.'
  );
  assert.equal(
    extractConversationText('{"actions":[{"type":"info_response","params":{"message":"Direct answer"}}],"summary":"Fallback"}'),
    'Direct answer'
  );
  assert.equal(extractConversationText('Plain answer'), 'Plain answer');
});
