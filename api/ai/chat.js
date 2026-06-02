import { handleAIRequest } from './_shared.js';

export default async function handler(req, res) {
  await handleAIRequest(req, res, 'chat');
}
