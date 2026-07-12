import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_GEMINI_MODEL = 'gemini-3.1-flash-lite-preview';

export const sendJson = (res, status, payload) => {
  res.status(status).json(payload);
};

const callGeminiGenerate = async (body) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set on the server.');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: body.model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
    ...(body.systemInstruction ? { systemInstruction: body.systemInstruction } : {})
  });

  const result = await model.generateContent(body.contents);
  const response = await result.response;
  return response.text();
};

const callGeminiChat = async (body) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set on the server.');
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({
    model: body.model || process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL,
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

export const callAI = async (body, mode) => {
  const provider = (body.provider || process.env.AI_PROVIDER || 'gemini').toLowerCase();

  if (provider !== 'gemini' && body.fallbackToGemini === false) {
    throw new Error('Local AI providers are only available from the local Vite dev server.');
  }

  return mode === 'chat' ? callGeminiChat(body) : callGeminiGenerate(body);
};

export const handleAIRequest = async (req, res, mode) => {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  try {
    const text = await callAI(req.body || {}, mode);
    sendJson(res, 200, { text });
  } catch (error) {
    console.error(`[ai-api] ${mode} failed:`, error);
    sendJson(res, 500, { error: error.message || 'AI request failed' });
  }
};
/* global process */
