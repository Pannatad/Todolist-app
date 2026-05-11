import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_AI_PROVIDER,
  normalizeAIProvider,
  getAIProviderRequestOptions,
  getAIProviderLabel
} from '../src/services/aiProvider.js';
import { createGenerativeModel } from '../src/services/generativeClient.js';

test('Gemini is the default chat provider', () => {
  assert.equal(DEFAULT_AI_PROVIDER, 'gemini');
  assert.equal(normalizeAIProvider(undefined), 'gemini');
  assert.equal(normalizeAIProvider('unknown'), 'gemini');
});

test('Gemini requests are explicitly routed to the Gemini proxy provider', () => {
  assert.deepEqual(getAIProviderRequestOptions('gemini'), {
    provider: 'gemini',
    model: 'gemini-3.1-flash-lite-preview'
  });
});

test('Qwen requests are routed to LM Studio with the local Qwen model id', () => {
  assert.deepEqual(getAIProviderRequestOptions('qwen'), {
    provider: 'lmstudio',
    model: 'qwen/qwen3.6-35b-a3b',
    fallbackToGemini: false
  });
});

test('Provider labels are user-facing and concise', () => {
  assert.equal(getAIProviderLabel('gemini'), 'Gemini');
  assert.equal(getAIProviderLabel('qwen'), 'Qwen Local');
});

test('Generative client forwards Qwen provider options to the AI proxy', async () => {
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
    const model = createGenerativeModel(getAIProviderRequestOptions('qwen'));

    await model.generateContent('hello qwen');
    await model.startChat({ history: [] }).sendMessage('continue');

    assert.deepEqual(requests.map(request => request.path), [
      '/api/ai/generate',
      '/api/ai/chat'
    ]);

    for (const request of requests) {
      assert.equal(request.body.provider, 'lmstudio');
      assert.equal(request.body.model, 'qwen/qwen3.6-35b-a3b');
      assert.equal(request.body.fallbackToGemini, false);
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});
