import { createHash, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { networkInterfaces } from 'node:os';
import { extname, join, normalize, resolve } from 'node:path';
import { loadEnv } from 'vite';
import { handleAIRequest } from './aiGateway.js';

const root = process.cwd();
const distRoot = resolve(root, 'dist');
const env = { ...loadEnv('production', root, ''), ...process.env };
const lanEnabled = env.APP_LAN_ACCESS === 'true';
const host = lanEnabled ? '0.0.0.0' : '127.0.0.1';
const port = Math.min(Math.max(Number.parseInt(env.APP_PORT || '4173', 10) || 4173, 1024), 65535);
const accessToken = env.APP_ACCESS_TOKEN || '';

if (!existsSync(join(distRoot, 'index.html'))) {
  throw new Error('Production build not found. Run npm run build before npm run serve:local.');
}
if (lanEnabled && accessToken.length < 16) {
  throw new Error('APP_ACCESS_TOKEN must contain at least 16 characters when APP_LAN_ACCESS=true.');
}

const MIME_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const tokenHash = (value) => createHash('sha256').update(String(value)).digest();
const tokenMatches = (candidate) => {
  if (!accessToken || !candidate) return false;
  return timingSafeEqual(tokenHash(candidate), tokenHash(accessToken));
};

const cookieToken = (req) => {
  const cookie = String(req.headers.cookie || '');
  const match = cookie.match(/(?:^|;\s*)local_app_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
};

const authorizeLanRequest = (req, res, requestUrl) => {
  if (!lanEnabled) return true;
  const queryToken = requestUrl.searchParams.get('token');
  if (tokenMatches(queryToken)) {
    res.statusCode = 302;
    res.setHeader('Set-Cookie', `local_app_token=${encodeURIComponent(queryToken)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`);
    res.setHeader('Location', requestUrl.pathname || '/');
    res.end();
    return false;
  }
  if (tokenMatches(cookieToken(req))) return true;

  res.statusCode = 401;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(`<!doctype html><html><meta name="viewport" content="width=device-width"><title>Local app access</title><body style="font-family:system-ui;max-width:38rem;margin:4rem auto;padding:1rem"><h1>Access token required</h1><p>Open this address once with <code>?token=YOUR_APP_ACCESS_TOKEN</code>. The token is saved in an HttpOnly cookie for one day.</p></body></html>`);
  return false;
};

const serveStatic = (req, res, requestUrl) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.statusCode = 405;
    res.end('Method not allowed');
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(requestUrl.pathname);
  } catch {
    res.statusCode = 400;
    res.end('Invalid URL');
    return;
  }

  const relative = normalize(pathname).replace(/^[/\\]+/, '');
  let filePath = resolve(distRoot, relative || 'index.html');
  if (!filePath.startsWith(`${distRoot}/`) && filePath !== join(distRoot, 'index.html')) {
    res.statusCode = 403;
    res.end('Forbidden');
    return;
  }
  if (!existsSync(filePath) || !statSync(filePath).isFile()) filePath = join(distRoot, 'index.html');

  res.statusCode = 200;
  res.setHeader('Content-Type', MIME_TYPES[extname(filePath).toLowerCase()] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Cache-Control', filePath.includes(`${join(distRoot, 'assets')}/`)
    ? 'public, max-age=31536000, immutable'
    : 'no-cache');
  if (req.method === 'HEAD') {
    res.end();
    return;
  }
  createReadStream(filePath).pipe(res);
};

const server = (await import('node:http')).createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  if (!authorizeLanRequest(req, res, requestUrl)) return;

  try {
    if (await handleAIRequest(env, req, res)) return;
    serveStatic(req, res, requestUrl);
  } catch (error) {
    console.error('[local-app] request failed:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Local app request failed.' }));
    } else {
      res.end();
    }
  }
});

server.listen(port, host, () => {
  console.log(`Local production app: http://127.0.0.1:${port}/`);
  if (lanEnabled) {
    const addresses = Object.values(networkInterfaces())
      .flat()
      .filter((entry) => entry?.family === 'IPv4' && !entry.internal)
      .map((entry) => `http://${entry.address}:${port}/?token=YOUR_APP_ACCESS_TOKEN`);
    for (const address of addresses) console.log(`Phone: ${address}`);
  }
});

const shutdown = () => server.close(() => process.exit(0));
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
