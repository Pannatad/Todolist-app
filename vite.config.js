import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';
const DEFAULT_LM_STUDIO_BASE_URL = 'http://localhost:1234/v1';

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

const resolveLmStudioModel = async (env) => {
  if (env.LM_STUDIO_MODEL) return env.LM_STUDIO_MODEL;

  const baseUrl = (env.LM_STUDIO_BASE_URL || DEFAULT_LM_STUDIO_BASE_URL).replace(/\/$/, '');
  const response = await fetch(`${baseUrl}/models`, {
    headers: env.LM_STUDIO_API_KEY
      ? { Authorization: `Bearer ${env.LM_STUDIO_API_KEY}` }
      : {}
  });

  if (!response.ok) {
    throw new Error(`Could not list LM Studio models (${response.status}). Is the LM Studio server running?`);
  }

  const data = await response.json();
  const model = data?.data?.[0]?.id;
  if (!model) {
    throw new Error('LM Studio returned no loaded/visible models. Load your Gemma model or set LM_STUDIO_MODEL.');
  }

  return model;
};

const callLmStudio = async (env, body) => {
  const baseUrl = (env.LM_STUDIO_BASE_URL || DEFAULT_LM_STUDIO_BASE_URL).replace(/\/$/, '');
  const model = await resolveLmStudioModel(env);
  const generationConfig = body.generationConfig || {};

  const response = await fetch(`${baseUrl}/chat/completions`, {
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

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LM Studio request failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || '';
};

const callGeminiGenerate = async (env, body) => {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set on the server.');
  }

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
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
    model: env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
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
  const provider = (body.provider || env.AI_PROVIDER || 'lmstudio').toLowerCase();
  const canUseLocal = !hasNonTextInput(body.contents) || provider === 'lmstudio';

  if (provider === 'gemini') {
    return mode === 'chat' ? callGeminiChat(env, body) : callGeminiGenerate(env, body);
  }

  try {
    if (!canUseLocal) throw new Error('Non-text input requested.');
    return await callLmStudio(env, body);
  } catch (localError) {
    if (env.GEMINI_API_KEY) {
      console.warn('[ai-proxy] LM Studio failed; falling back to Gemini:', localError.message);
      return mode === 'chat' ? callGeminiChat(env, body) : callGeminiGenerate(env, body);
    }
    throw localError;
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
