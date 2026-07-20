import test from 'node:test';
import assert from 'node:assert/strict';

import {
  callLmStudio,
  getLmStudioHealth,
  preferredLocalModel,
  resolveLmStudioModel,
  streamLmStudio,
} from '../server/lmStudioClient.js';

const jsonResponse = (payload, { ok = true, status = 200 } = {}) => ({
  ok,
  status,
  json: async () => payload,
  text: async () => JSON.stringify(payload),
});

const localModelList = {
  data: [
    { id: 'qwen/qwen3-coder-30b' },
    { id: 'google/gemma-4-26b-a4b' },
    { id: 'google/gemma-4-26b-a4b-qat' },
    { id: 'qwen/qwen3.6-35b-a3b' },
  ],
};

test('Gemma 4 26B A4B QAT is preferred over the first visible LM Studio model', async () => {
  assert.equal(
    preferredLocalModel(localModelList.data.map((model) => model.id)),
    'google/gemma-4-26b-a4b-qat',
  );

  const model = await resolveLmStudioModel({}, undefined, {
    fetchImpl: async () => jsonResponse(localModelList),
  });
  assert.equal(model, 'google/gemma-4-26b-a4b-qat');
});

test('schema-constrained JSON is recovered from LM Studio reasoning_content', async () => {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, init });
    if (url.endsWith('/models')) return jsonResponse(localModelList);
    return jsonResponse({
      choices: [{
        message: {
          content: '',
          reasoning_content: '{"actions":[{"type":"info_response","params":{"message":"Ready"},"explanation":"Health check"}],"summary":"Ready"}',
        },
      }],
    });
  };

  const responseFormat = {
    type: 'json_schema',
    json_schema: { name: 'agent_plan', schema: { type: 'object' } },
  };
  const text = await callLmStudio({}, {
    messages: [{ role: 'user', content: 'hello' }],
    responseFormat,
    enableThinking: false,
  }, { fetchImpl });

  assert.equal(JSON.parse(text).summary, 'Ready');
  const completionBody = JSON.parse(requests[1].init.body);
  assert.equal(completionBody.model, 'google/gemma-4-26b-a4b-qat');
  assert.equal(completionBody.enable_thinking, false);
  assert.equal(completionBody.reasoning_effort, 'none');
  assert.equal(completionBody.reasoning_tokens, 0);
  assert.deepEqual(completionBody.response_format, responseFormat);
});

test('thinking mode uses LM Studio reasoning controls without a zero-token cap', async () => {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, init });
    if (url.endsWith('/models')) return jsonResponse(localModelList);
    return jsonResponse({ choices: [{ message: { content: 'Thoughtful answer' } }] });
  };

  const text = await callLmStudio({}, {
    messages: [{ role: 'user', content: 'Think carefully' }],
    enableThinking: true,
  }, { fetchImpl });

  assert.equal(text, 'Thoughtful answer');
  const completionBody = JSON.parse(requests[1].init.body);
  assert.equal(completionBody.enable_thinking, true);
  assert.equal(completionBody.reasoning_effort, 'high');
  assert.equal(completionBody.reasoning_tokens, undefined);
});

test('streaming yields visible content deltas and requests usage metadata', async () => {
  const requests = [];
  const fetchImpl = async (url, init = {}) => {
    requests.push({ url, init });
    if (url.endsWith('/models')) return jsonResponse(localModelList);

    const sse = [
      'data: {"choices":[{"delta":{"content":"Hello"}}]}',
      '',
      'data: {"choices":[{"delta":{"content":" world"}}]}',
      '',
      'data: {"choices":[],"usage":{"total_tokens":12}}',
      '',
      'data: [DONE]',
      '',
    ].join('\n');
    return new Response(sse, { status: 200 });
  };

  const events = [];
  for await (const event of streamLmStudio({}, {
    messages: [{ role: 'user', content: 'hello' }],
    enableThinking: false,
  }, { fetchImpl })) {
    events.push(event);
  }

  assert.deepEqual(events, [
    { type: 'delta', text: 'Hello' },
    { type: 'delta', text: ' world' },
    { type: 'usage', usage: { total_tokens: 12 } },
  ]);
  const completionBody = JSON.parse(requests[1].init.body);
  assert.equal(completionBody.stream, true);
  assert.equal(completionBody.stream_options.include_usage, true);
  assert.equal(completionBody.reasoning_effort, 'none');
});

test('free-form reasoning is never exposed as the answer', async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith('/models')) return jsonResponse(localModelList);
    return jsonResponse({
      choices: [{ message: { content: '', reasoning_content: 'private reasoning' } }],
    });
  };

  await assert.rejects(
    callLmStudio({}, { messages: [{ role: 'user', content: 'hello' }] }, { fetchImpl }),
    /empty final answer/,
  );
});

test('health reports the deterministic Gemma model without loading it', async () => {
  const health = await getLmStudioHealth({}, {
    fetchImpl: async () => jsonResponse(localModelList),
  });

  assert.equal(health.status, 'ready');
  assert.equal(health.reachable, true);
  assert.equal(health.model, 'google/gemma-4-26b-a4b-qat');
});

test('invalid LM Studio configuration is reported as offline instead of throwing', async () => {
  const health = await getLmStudioHealth({ LM_STUDIO_BASE_URL: 'file:///tmp/model' });

  assert.equal(health.status, 'offline');
  assert.equal(health.reachable, false);
  assert.match(health.message, /http or https/);
});
