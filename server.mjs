// Local dev server. It serves the app the way GitHub Pages does, offers a
// dev-only "Continue as <you>" with your GitHub CLI token, and, once the GitHub
// App is registered (credentials in .bojji-app.json, gitignored), runs the
// sign-in Worker from worker/ at /auth so real sign-in works locally too.
// It only listens on localhost.

import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import worker from './worker/worker.js';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT ?? 5173);
const ROOT = import.meta.dirname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();
const APP_FILE = join(ROOT, '.bojji-app.json');
const ORIGIN = `http://localhost:${PORT}`;
const loadApp = () => readFile(APP_FILE, 'utf8').then(JSON.parse, () => null);
const readBody = async (req) => { const parts = []; for await (const part of req) parts.push(part); return Buffer.concat(parts); };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/session') {
    try {
      const [owner, name] = gh('api', 'user', '--jq', '.login + "\\n" + (.name // "")').split('\n');
      // Development shortcut: the browser gets your GitHub CLI token, so the app
      // works locally without a GitHub App. The hosted app signs in for real
      // through the Worker in worker/; BOJJI_AUTH_URL points a local copy at one.
      const session = { token: gh('auth', 'token'), owner, name, repo: process.env.BOJJI_REPO ?? 'bojji-data', authUrl: process.env.BOJJI_AUTH_URL ?? ((await loadApp()) ? `${ORIGIN}/auth` : '') };
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(session));
    } catch {
      res.writeHead(401).end('Run `gh auth login` first.');
    }
    return;
  }

  // The sign-in Worker, run in-process with the locally saved app credentials.
  if (url.pathname.startsWith('/auth/')) {
    const app = await loadApp();
    if (!app) return res.writeHead(503).end('Register the GitHub App first: /register-app.html');
    const env = { GITHUB_CLIENT_ID: app.client_id, GITHUB_CLIENT_SECRET: app.client_secret, GITHUB_APP_SLUG: app.slug, ALLOWED_ORIGINS: ORIGIN };
    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await readBody(req);
    // Browsers leave out Origin on same-origin GETs; cross-origin requests always carry it.
    const headers = { ...req.headers, origin: req.headers.origin ?? ORIGIN };
    const request = new Request(`${ORIGIN}${url.pathname.slice('/auth'.length)}`, { method: req.method, headers, body });
    const answer = await worker.fetch(request, env);
    res.writeHead(answer.status, Object.fromEntries(answer.headers));
    return res.end(Buffer.from(await answer.arrayBuffer()));
  }

  // After registering the GitHub App from /register-app.html, GitHub sends a
  // one-hour code. The landing page checks its state and posts the code here;
  // the server turns it into credentials, saves them, and the page opens the app.
  if (url.pathname === '/api/register-app' && req.method === 'POST') {
    try {
      const { code } = JSON.parse(await readBody(req));
      const conv = await fetch(`https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`, {
        method: 'POST', headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'bojji-local' },
      });
      const app = await conv.json();
      if (!conv.ok) return res.writeHead(conv.status, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: app.message ?? 'GitHub refused the code.' }));
      const saved = { id: app.id, slug: app.slug, client_id: app.client_id, client_secret: app.client_secret, html_url: app.html_url };
      await writeFile(APP_FILE, JSON.stringify(saved, null, 2) + '\n', { mode: 0o600 });
      return res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ slug: app.slug, html_url: app.html_url }));
    } catch (error) {
      return res.writeHead(500, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: error.message }));
    }
  }

  // The site root is public/, with src/ mounted beside it, matching the GitHub Pages build.
  // The two files for registering the GitHub App are served from worker/ (local only).
  const path = url.pathname === '/' ? '/index.html' : url.pathname === '/registered' ? '/register-app.html' : url.pathname;
  const REGISTER = ['/register-app.html', '/github-app-manifest.json'];
  const base = path.startsWith('/src/') ? ROOT : REGISTER.includes(path) ? join(ROOT, 'worker') : join(ROOT, 'public');
  const file = normalize(join(base, path));
  const inside = (dir) => file.startsWith(join(ROOT, dir));
  if (!(inside('public') || inside('src') || (REGISTER.includes(path) && inside('worker')))) return res.writeHead(404).end();
  try {
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end();
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Bojji running at http://localhost:${PORT}`));
