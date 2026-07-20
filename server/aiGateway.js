import { callLmStudio, getLmStudioHealth, streamLmStudio } from './lmStudioClient.js';

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'gemma4:e2b';
const MAX_AI_REQUEST_BYTES = 10 * 1024 * 1024;

const readJsonBody = async (req) => new Promise((resolve, reject) => {
  let raw = '';
  let bytes = 0;
  let tooLarge = false;
  req.on('data', (chunk) => {
    bytes += chunk.length;
    if (bytes > MAX_AI_REQUEST_BYTES) {
      tooLarge = true;
      raw = '';
      return;
    }
    if (!tooLarge) raw += chunk;
  });
  req.on('end', () => {
    if (tooLarge) {
      const error = new Error('AI request is too large. Use a smaller image or document.');
      error.statusCode = 413;
      reject(error);
      return;
    }
    try {
      resolve(raw ? JSON.parse(raw) : {});
    } catch (error) {
      error.statusCode = 400;
      reject(error);
    }
  });
  req.on('error', reject);
});

const sendJson = (res, status, payload) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const startNdjson = (res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
};

const sendNdjson = (res, payload) => {
  if (!res.writableEnded) res.write(`${JSON.stringify(payload)}\n`);
};

const textFromGeminiParts = (parts = []) => parts
  .map((part) => part?.text || '')
  .filter(Boolean)
  .join('\n');

const toOpenAIContent = (contents) => {
  if (typeof contents === 'string') return contents;
  if (!Array.isArray(contents)) return String(contents || '');

  const blocks = [];
  for (const part of contents) {
    if (part?.text) {
      blocks.push({ type: 'text', text: part.text });
      continue;
    }

    const inlineData = part?.inlineData || part?.inline_data;
    if (inlineData?.data && inlineData?.mimeType?.startsWith('image/')) {
      blocks.push({
        type: 'image_url',
        image_url: { url: `data:${inlineData.mimeType};base64,${inlineData.data}` },
      });
    } else if (inlineData) {
      throw new Error('Local model input supports images; PDFs must be converted to text first.');
    }
  }

  return blocks.length === 1 && blocks[0].type === 'text' ? blocks[0].text : blocks;
};

const toOpenAIMessages = ({ systemInstruction, history = [], message, contents }) => {
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });

  for (const item of history) {
    messages.push({
      role: item.role === 'model' ? 'assistant' : item.role,
      content: textFromGeminiParts(item.parts),
    });
  }

  messages.push({
    role: 'user',
    content: message != null ? toOpenAIContent(message) : toOpenAIContent(contents),
  });
  return messages;
};

const textFromLocalContent = (content) => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content || '');
  const text = content
    .filter((part) => part?.type === 'text')
    .map((part) => part.text)
    .filter(Boolean)
    .join('\n');
  if (text) return text;
  throw new Error('Ollama fallback currently supports text-only prompts.');
};

const toOllamaMessages = (body) => toOpenAIMessages(body).map((item) => ({
  role: item.role,
  content: textFromLocalContent(item.content),
}));

const resolveOllamaModel = async (env, requestedModel) => {
  if (requestedModel) return requestedModel;
  if (env.OLLAMA_MODEL) return env.OLLAMA_MODEL;
  if (env.LOCAL_LLM_MODEL) return env.LOCAL_LLM_MODEL;

  const baseUrl = (env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, '');
  let response;
  try {
    response = await fetch(`${baseUrl}/api/tags`);
  } catch {
    throw new Error(`Ollama is not reachable at ${baseUrl}.`);
  }
  if (!response.ok) throw new Error(`Could not list Ollama models (${response.status}).`);

  const data = await response.json();
  const names = (Array.isArray(data?.models) ? data.models : [])
    .map((model) => model.name || model.model)
    .filter(Boolean);
  return names.find((name) => name.toLowerCase().startsWith('gemma4'))
    || names.find((name) => name.toLowerCase().startsWith('gemma'))
    || names[0]
    || DEFAULT_OLLAMA_MODEL;
};

const callOllama = async (env, body) => {
  const baseUrl = (env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, '');
  const model = await resolveOllamaModel(env, body.model);
  const generationConfig = body.generationConfig || {};
  let response;
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: toOllamaMessages(body),
        stream: false,
        think: false,
        options: {
          temperature: generationConfig.temperature ?? 0.4,
          top_p: generationConfig.topP ?? generationConfig.top_p,
          num_predict: generationConfig.maxOutputTokens ?? generationConfig.max_tokens ?? 2048,
        },
      }),
    });
  } catch {
    throw new Error(`Ollama is not reachable at ${baseUrl}.`);
  }
  if (!response.ok) throw new Error(`Ollama request failed (${response.status}): ${await response.text()}`);
  const data = await response.json();
  return data?.message?.content || data?.response || '';
};

const getGeminiModel = async (env, body) => {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not set on the server.');
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({
    model: body.model || env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    ...(body.systemInstruction ? { systemInstruction: body.systemInstruction } : {}),
  });
};

const callGeminiGenerate = async (env, body) => {
  const model = await getGeminiModel(env, body);
  const result = await model.generateContent(body.contents);
  return (await result.response).text();
};

const callGeminiChat = async (env, body) => {
  const model = await getGeminiModel(env, body);
  const chat = model.startChat({
    history: body.history || [],
    generationConfig: body.generationConfig || {},
  });
  const result = await chat.sendMessage(body.message);
  return (await result.response).text();
};

const callAI = async (env, body, mode) => {
  const provider = (body.provider || env.AI_PROVIDER || 'gemini').toLowerCase();
  if (provider === 'gemini') {
    return mode === 'chat' ? callGeminiChat(env, body) : callGeminiGenerate(env, body);
  }
  if (provider === 'lmstudio' || provider === 'local' || provider === 'qwen') {
    return callLmStudio(env, { ...body, messages: toOpenAIMessages(body) });
  }
  if (provider === 'ollama') return callOllama(env, body);
  throw new Error(`Unsupported AI provider: ${provider}`);
};

const streamAI = async function* (env, body, { signal } = {}) {
  const provider = (body.provider || env.AI_PROVIDER || 'gemini').toLowerCase();
  if (provider === 'lmstudio' || provider === 'local' || provider === 'qwen') {
    yield* streamLmStudio(env, { ...body, messages: toOpenAIMessages(body) }, { signal });
    return;
  }
  const text = await callAI(env, body, 'chat');
  if (text) yield { type: 'delta', text };
};

export const handleAIRequest = async (env, req, res) => {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const path = requestUrl.pathname;
  if (!path.startsWith('/api/ai/')) return false;

  if (path === '/api/ai/health') {
    if (req.method !== 'GET') sendJson(res, 405, { error: 'Method not allowed' });
    else {
      const provider = (requestUrl.searchParams.get('provider') || env.AI_PROVIDER || 'gemini').toLowerCase();
      if (['lmstudio', 'local', 'qwen'].includes(provider)) {
        sendJson(res, 200, await getLmStudioHealth(env));
      } else {
        sendJson(res, 200, {
          status: env.GEMINI_API_KEY ? 'ready' : 'needs_key',
          reachable: Boolean(env.GEMINI_API_KEY),
          model: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
          message: env.GEMINI_API_KEY ? 'Gemini is configured.' : 'GEMINI_API_KEY is not set.',
        });
      }
    }
    return true;
  }

  if (!['/api/ai/generate', '/api/ai/chat', '/api/ai/stream'].includes(path)) {
    sendJson(res, 404, { error: 'AI route not found' });
    return true;
  }
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return true;
  }

  if (path === '/api/ai/stream') {
    const controller = new AbortController();
    req.on('aborted', () => controller.abort());
    try {
      const body = await readJsonBody(req);
      startNdjson(res);
      for await (const event of streamAI(env, body, { signal: controller.signal })) {
        sendNdjson(res, event);
      }
      sendNdjson(res, { type: 'done' });
      res.end();
    } catch (error) {
      if (error?.name !== 'AbortError') console.error('[ai-gateway] stream failed:', error);
      if (!res.headersSent) sendJson(res, error.statusCode || 500, { error: error.message || 'AI streaming request failed' });
      else {
        if (error?.name !== 'AbortError') sendNdjson(res, { type: 'error', error: error.message || 'AI streaming request failed' });
        res.end();
      }
    }
    return true;
  }

  try {
    const body = await readJsonBody(req);
    const text = await callAI(env, body, path.endsWith('/chat') ? 'chat' : 'generate');
    sendJson(res, 200, { text });
  } catch (error) {
    console.error(`[ai-gateway] ${path} failed:`, error);
    sendJson(res, error.statusCode || 500, { error: error.message || 'AI request failed' });
  }
  return true;
};

export { MAX_AI_REQUEST_BYTES, toOpenAIContent, toOpenAIMessages };
