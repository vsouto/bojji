// Local dev server. It serves the app and stands in for the future
// "Sign in with GitHub" step by handing the browser your GitHub CLI token.
// It only listens on localhost. Without it (e.g. on GitHub Pages) the app
// runs as a demo on sample data.

import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';

const PORT = Number(process.env.PORT ?? 5173);
const ROOT = import.meta.dirname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.txt': 'text/plain' };

const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim();

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === '/api/session') {
    try {
      const [owner, name] = gh('api', 'user', '--jq', '.login + "\\n" + (.name // "")').split('\n');
      const session = { token: gh('auth', 'token'), owner, name, repo: process.env.BOJJI_REPO ?? 'bojji-data' };
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(session));
    } catch {
      res.writeHead(401).end('Run `gh auth login` first.');
    }
    return;
  }

  // The site root is public/, with src/ mounted beside it, matching the GitHub Pages build.
  const path = url.pathname === '/' ? '/index.html' : url.pathname;
  const base = path.startsWith('/src/') ? ROOT : join(ROOT, 'public');
  const file = normalize(join(base, path));
  if (!file.startsWith(join(ROOT, 'public')) && !file.startsWith(join(ROOT, 'src'))) return res.writeHead(404).end();
  try {
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
}).listen(PORT, '127.0.0.1', () => console.log(`Bojji running at http://localhost:${PORT}`));
