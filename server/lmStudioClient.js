const DEFAULT_LM_STUDIO_BASE_URL = 'http://127.0.0.1:1234/v1';
const DEFAULT_LM_STUDIO_MODEL = 'google/gemma-4-26b-a4b-qat';
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;
const DEFAULT_HEALTH_TIMEOUT_MS = 4_000;

const clampTimeout = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1_000), 600_000);
};

const normalizeBaseUrl = (value = DEFAULT_LM_STUDIO_BASE_URL) => {
  const url = new URL(value);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('LM_STUDIO_BASE_URL must use http or https.');
  }
  return url.toString().replace(/\/$/, '');
};

const authorizationHeaders = (env) => env.LM_STUDIO_API_KEY
  ? { Authorization: `Bearer ${env.LM_STUDIO_API_KEY}` }
  : {};

const fetchWithTimeout = async (url, init, timeoutMs, fetchImpl) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`LM Studio timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    }
    throw new Error(`LM Studio is not reachable at ${url}. Start its local server and retry.`);
  } finally {
    clearTimeout(timer);
  }
};

const responseError = async (response, prefix) => {
  const details = (await response.text()).trim().slice(0, 800);
  return new Error(`${prefix} (${response.status})${details ? `: ${details}` : ''}`);
};

const contentToText = (content) => {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n')
    .trim();
};

const contentDeltaToText = (content) => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
};

const jsonFromReasoningFallback = (message, responseFormat) => {
  if (!responseFormat) return '';
  const reasoning = message?.reasoning_content ?? message?.reasoning;
  if (typeof reasoning !== 'string' || !reasoning.trim()) return '';

  const candidate = reasoning.trim();
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    return '';
  }
};

const createRequestBody = (model, body, { stream = false } = {}) => {
  const generationConfig = body.generationConfig || {};
  const enableThinking = Boolean(body.enableThinking);

  return {
    model,
    messages: body.messages,
    temperature: generationConfig.temperature ?? 0.7,
    top_p: generationConfig.topP ?? generationConfig.top_p ?? 0.8,
    top_k: generationConfig.topK ?? generationConfig.top_k ?? 20,
    presence_penalty: generationConfig.presencePenalty ?? generationConfig.presence_penalty ?? 1.5,
    max_tokens: generationConfig.maxOutputTokens ?? generationConfig.max_tokens ?? 1024,
    stream,
    ...(stream ? { stream_options: { include_usage: true } } : {}),
    // Keep both controls for compatibility with model prompt templates and
    // current LM Studio OpenAI-compatible reasoning controls.
    enable_thinking: enableThinking,
    chat_template_kwargs: {
      enable_thinking: enableThinking,
      preserve_thinking: false,
    },
    reasoning_effort: enableThinking ? 'high' : 'none',
    ...(!enableThinking ? { reasoning_tokens: 0 } : {}),
    ...(body.responseFormat ? { response_format: body.responseFormat } : {}),
  };
};

const preferredLocalModel = (modelIds) => modelIds.find((id) => id === DEFAULT_LM_STUDIO_MODEL)
  || modelIds.find((id) => {
    const normalized = id.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized.includes('gemma4')
      && normalized.includes('26b')
      && normalized.includes('a4b')
      && normalized.includes('qat');
  });

const extractModelIds = (payload) => (Array.isArray(payload?.data) ? payload.data : [])
  .map((model) => model?.id)
  .filter(Boolean);

export const listLmStudioModels = async (env, {
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_HEALTH_TIMEOUT_MS,
} = {}) => {
  const baseUrl = normalizeBaseUrl(env.LM_STUDIO_BASE_URL);
  const response = await fetchWithTimeout(
    `${baseUrl}/models`,
    { headers: authorizationHeaders(env) },
    clampTimeout(timeoutMs, DEFAULT_HEALTH_TIMEOUT_MS),
    fetchImpl,
  );

  if (!response.ok) {
    throw await responseError(response, 'Could not list LM Studio models');
  }

  return extractModelIds(await response.json());
};

export const resolveLmStudioModel = async (env, requestedModel, options = {}) => {
  if (requestedModel) return requestedModel;
  if (env.LM_STUDIO_MODEL) return env.LM_STUDIO_MODEL;

  const modelIds = await listLmStudioModels(env, options);
  const preferredModel = preferredLocalModel(modelIds);
  if (preferredModel) return preferredModel;
  if (modelIds.length === 1) return modelIds[0];

  if (!modelIds.length) {
    throw new Error('LM Studio returned no models. Download or load Gemma 4 26B A4B QAT, then retry.');
  }

  throw new Error(`Gemma 4 26B A4B QAT was not found among ${modelIds.length} LM Studio models. Set LM_STUDIO_MODEL to the exact model id.`);
};

export const callLmStudio = async (env, body, {
  fetchImpl = globalThis.fetch,
} = {}) => {
  const baseUrl = normalizeBaseUrl(env.LM_STUDIO_BASE_URL);
  const timeoutMs = clampTimeout(env.LM_STUDIO_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS);
  const model = await resolveLmStudioModel(env, body.model, { fetchImpl });
  const requestBody = createRequestBody(model, body);

  const response = await fetchWithTimeout(
    `${baseUrl}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authorizationHeaders(env),
      },
      body: JSON.stringify(requestBody),
    },
    timeoutMs,
    fetchImpl,
  );

  if (!response.ok) {
    throw await responseError(response, 'LM Studio request failed');
  }

  const payload = await response.json();
  const message = payload?.choices?.[0]?.message;
  const content = contentToText(message?.content);
  if (content) return content;

  // LM Studio can place schema-constrained model output in reasoning_content
  // while returning empty content. Only accept it when it is valid JSON and a
  // schema was explicitly requested, so private free-form reasoning is never
  // exposed to the UI.
  const structuredReasoning = jsonFromReasoningFallback(message, body.responseFormat);
  if (structuredReasoning) return structuredReasoning;

  throw new Error('LM Studio returned an empty final answer. In LM Studio, disable separate reasoning output or retry with thinking disabled.');
};

export async function* streamLmStudio(env, body, {
  fetchImpl = globalThis.fetch,
  signal,
} = {}) {
  const baseUrl = normalizeBaseUrl(env.LM_STUDIO_BASE_URL);
  const timeoutMs = clampTimeout(env.LM_STUDIO_REQUEST_TIMEOUT_MS, DEFAULT_REQUEST_TIMEOUT_MS);
  const model = await resolveLmStudioModel(env, body.model, { fetchImpl });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  let response;
  try {
    response = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authorizationHeaders(env),
      },
      body: JSON.stringify(createRequestBody(model, body, { stream: true })),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw await responseError(response, 'LM Studio streaming request failed');
    }
    if (!response.body) {
      throw new Error('LM Studio returned no streaming response body.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let receivedText = false;

    try {
      while (true) {
        const { value, done } = await reader.read();
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
        const lines = buffer.split(/\r?\n/);
        buffer = done ? '' : lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;

          let packet;
          try {
            packet = JSON.parse(data);
          } catch {
            continue;
          }

          const text = contentDeltaToText(packet?.choices?.[0]?.delta?.content);
          if (text) {
            receivedText = true;
            yield { type: 'delta', text };
          }
          if (packet?.usage) yield { type: 'usage', usage: packet.usage };
        }

        if (done) break;
      }
    } finally {
      reader.releaseLock();
    }

    if (!receivedText) {
      throw new Error('LM Studio returned an empty streamed answer. Retry with thinking disabled or a larger output limit.');
    }
  } catch (error) {
    if (controller.signal.aborted) {
      if (signal?.aborted) throw new DOMException('The request was cancelled.', 'AbortError');
      throw new Error(`LM Studio timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}

export const getLmStudioHealth = async (env, options = {}) => {
  let baseUrl = env.LM_STUDIO_BASE_URL || DEFAULT_LM_STUDIO_BASE_URL;

  try {
    baseUrl = normalizeBaseUrl(baseUrl);
    const models = await listLmStudioModels(env, options);
    const model = env.LM_STUDIO_MODEL || preferredLocalModel(models) || null;
    if (!model) {
      return {
        status: 'needs_model',
        reachable: true,
        baseUrl,
        model: null,
        modelCount: models.length,
        message: 'LM Studio is running, but Gemma 4 26B A4B QAT is not available.',
      };
    }

    return {
      status: 'ready',
      reachable: true,
      baseUrl,
      model,
      modelCount: models.length,
      message: `Ready to use ${model}.`,
    };
  } catch (error) {
    return {
      status: 'offline',
      reachable: false,
      baseUrl,
      model: null,
      modelCount: 0,
      message: error.message,
    };
  }
};

export {
  DEFAULT_HEALTH_TIMEOUT_MS,
  DEFAULT_LM_STUDIO_BASE_URL,
  DEFAULT_LM_STUDIO_MODEL,
  DEFAULT_REQUEST_TIMEOUT_MS,
  contentToText,
  contentDeltaToText,
  createRequestBody,
  jsonFromReasoningFallback,
  normalizeBaseUrl,
  preferredLocalModel,
};
