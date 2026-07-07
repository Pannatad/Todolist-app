import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const DEFAULT_LM_STUDIO_BASE_URL = 'http://localhost:1234/v1';
const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const DEFAULT_OLLAMA_MODEL = 'gemma4:e2b';

const getLmStudioHelpMessage = (baseUrl) =>
  `LM Studio is not reachable at ${baseUrl}. Start LM Studio's local server, load your Gemma model, and confirm the server URL matches LM_STUDIO_BASE_URL.`;

const getOllamaHelpMessage = (baseUrl) =>
  `Ollama is not reachable at ${baseUrl}. Start Ollama or set OLLAMA_BASE_URL to the running local model server.`;

const readJsonBody = async (req) => new Promise((resolve, reject) => {
  let raw = '';
  req.on('data', chunk => {
    raw += chunk;
  });
  req.on('end', () => {
    try {
      resolve(raw ? JSON.parse(raw) : {});
    } catch (error) {
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

const textFromGeminiParts = (parts = []) => parts
  .map(part => part?.text || '')
  .filter(Boolean)
  .join('\n');

const hasNonTextInput = (contents) => Array.isArray(contents)
  && contents.some(part => part?.inlineData || part?.inline_data);

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
        image_url: {
          url: `data:${inlineData.mimeType};base64,${inlineData.data}`
        }
      });
    } else if (inlineData) {
      throw new Error('This local LM Studio path only supports text and image inputs. Use Gemini fallback for PDFs or other files.');
    }
  }

  return blocks.length === 1 && blocks[0].type === 'text' ? blocks[0].text : blocks;
};

const toOpenAIMessages = ({ systemInstruction, history = [], message, contents }) => {
  const messages = [];

  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }

  for (const item of history) {
    messages.push({
      role: item.role === 'model' ? 'assistant' : item.role,
      content: textFromGeminiParts(item.parts)
    });
  }

  if (message != null) {
    messages.push({ role: 'user', content: message });
  } else {
    messages.push({ role: 'user', content: toOpenAIContent(contents) });
  }

  return messages;
};

const textFromLocalContent = (content) => {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content || '');

  const text = content
    .filter(part => part?.type === 'text')
    .map(part => part.text)
    .filter(Boolean)
    .join('\n');

  if (text) return text;
  throw new Error('Ollama fallback currently supports text-only prompts.');
};

const toOllamaMessages = (body) => toOpenAIMessages(body).map(item => ({
  role: item.role,
  content: textFromLocalContent(item.content)
}));

const resolveLmStudioModel = async (env, requestedModel) => {
  if (requestedModel) return requestedModel;
  if (env.LM_STUDIO_MODEL) return env.LM_STUDIO_MODEL;

  const baseUrl = (env.LM_STUDIO_BASE_URL || DEFAULT_LM_STUDIO_BASE_URL).replace(/\/$/, '');
  let response;

  try {
    response = await fetch(`${baseUrl}/models`, {
      headers: env.LM_STUDIO_API_KEY
        ? { Authorization: `Bearer ${env.LM_STUDIO_API_KEY}` }
        : {}
    });
  } catch {
    throw new Error(getLmStudioHelpMessage(baseUrl));
  }

  if (!response.ok) {
    throw new Error(`Could not list LM Studio models (${response.status}). Is the LM Studio server running?`);
  }

  const data = await response.json();
  const model = data?.data?.[0]?.id;
  if (!model) {
    throw new Error('LM Studio returned no loaded/visible models. Load your local model or set LM_STUDIO_MODEL.');
  }

  return model;
};

const callLmStudio = async (env, body) => {
  const baseUrl = (env.LM_STUDIO_BASE_URL || DEFAULT_LM_STUDIO_BASE_URL).replace(/\/$/, '');
  const model = await resolveLmStudioModel(env, body.model);
  const generationConfig = body.generationConfig || {};

  let response;

  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.LM_STUDIO_API_KEY ? { Authorization: `Bearer ${env.LM_STUDIO_API_KEY}` } : {})
      },
      body: JSON.stringify({
        model,
        messages: toOpenAIMessages(body),
        temperature: generationConfig.temperature ?? 0.4,
        top_p: generationConfig.topP ?? generationConfig.top_p,
        max_tokens: generationConfig.maxOutputTokens ?? generationConfig.max_tokens ?? 2048
      })
    });
  } catch {
    throw new Error(getLmStudioHelpMessage(baseUrl));
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LM Studio request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
};

const resolveOllamaModel = async (env, requestedModel) => {
  if (requestedModel) return requestedModel;
  if (env.OLLAMA_MODEL) return env.OLLAMA_MODEL;
  if (env.LOCAL_LLM_MODEL) return env.LOCAL_LLM_MODEL;

  const baseUrl = (env.OLLAMA_BASE_URL || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, '');
  let response;

  try {
    response = await fetch(`${baseUrl}/api/tags`);
  } catch {
    throw new Error(getOllamaHelpMessage(baseUrl));
  }

  if (!response.ok) {
    throw new Error(`Could not list Ollama models (${response.status}).`);
  }

  const data = await response.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  const modelNames = models
    .map(model => model.name || model.model)
    .filter(Boolean);

  return modelNames.find(name => name.toLowerCase().startsWith('gemma4'))
    || modelNames.find(name => name.toLowerCase().startsWith('gemma'))
    || modelNames[0]
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
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: toOllamaMessages(body),
        stream: false,
        think: false,
        options: {
          temperature: generationConfig.temperature ?? 0.4,
          top_p: generationConfig.topP ?? generationConfig.top_p,
          num_predict: generationConfig.maxOutputTokens ?? generationConfig.max_tokens ?? 2048
        }
      })
    });
  } catch {
    throw new Error(getOllamaHelpMessage(baseUrl));
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data?.message?.content || data?.response || '';
};

const callGeminiGenerate = async (env, body) => {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set on the server.');
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: body.model || env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    ...(body.systemInstruction ? { systemInstruction: body.systemInstruction } : {})
  });

  const result = await model.generateContent(body.contents);
  const response = await result.response;
  return response.text();
};

const callGeminiChat = async (env, body) => {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set on the server.');
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: body.model || env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    ...(body.systemInstruction ? { systemInstruction: body.systemInstruction } : {})
  });
  const chat = model.startChat({
    history: body.history || [],
    generationConfig: body.generationConfig || {}
  });
  const result = await chat.sendMessage(body.message);
  const response = await result.response;
  return response.text();
};

const callAI = async (env, body, mode) => {
  const provider = (body.provider || env.AI_PROVIDER || 'gemini').toLowerCase();
  const canUseLocal = !hasNonTextInput(body.contents) || provider === 'lmstudio';

  if (provider === 'gemini') {
    return mode === 'chat' ? callGeminiChat(env, body) : callGeminiGenerate(env, body);
  }

  try {
    if (!canUseLocal) throw new Error('Non-text input requested.');
    return await callLmStudio(env, body);
  } catch (lmStudioError) {
    try {
      console.warn('[ai-proxy] LM Studio failed; trying Ollama:', lmStudioError.message);
      return await callOllama(env, body);
    } catch (ollamaError) {
      if (body.fallbackToGemini !== false && env.GEMINI_API_KEY) {
        console.warn('[ai-proxy] Local providers failed; falling back to Gemini:', {
          lmStudio: lmStudioError.message,
          ollama: ollamaError.message
        });
        return mode === 'chat' ? callGeminiChat(env, body) : callGeminiGenerate(env, body);
      }

      throw new Error(`Local model failed. LM Studio: ${lmStudioError.message} Ollama: ${ollamaError.message}`);
    }
  }
};

const aiProxyPlugin = (env) => ({
  name: 'local-ai-proxy',
  configureServer(server) {
    server.middlewares.use('/api/ai/generate', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }

      try {
        const body = await readJsonBody(req);
        const text = await callAI(env, body, 'generate');
        sendJson(res, 200, { text });
      } catch (error) {
        console.error('[ai-proxy] generate failed:', error);
        sendJson(res, 500, { error: error.message || 'AI request failed' });
      }
    });

    server.middlewares.use('/api/ai/chat', async (req, res) => {
      if (req.method !== 'POST') {
        sendJson(res, 405, { error: 'Method not allowed' });
        return;
      }

      try {
        const body = await readJsonBody(req);
        const text = await callAI(env, body, 'chat');
        sendJson(res, 200, { text });
      } catch (error) {
        console.error('[ai-proxy] chat failed:', error);
        sendJson(res, 500, { error: error.message || 'AI request failed' });
      }
    });
  }
});

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
  plugins: [
    react(),
    aiProxyPlugin(env)
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return undefined;
          }

          if (id.includes('react') || id.includes('scheduler')) {
            return 'vendor-react';
          }

          if (id.includes('framer-motion')) {
            return 'vendor-motion';
          }

          if (id.includes('lucide-react')) {
            return 'vendor-icons';
          }

          if (id.includes('@supabase')) {
            return 'vendor-supabase';
          }

          return 'vendor-misc';
        }
      }
    }
  },
  server: {
    host: true
  }
}
})
