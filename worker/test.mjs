// Exercises the Worker in Node with a fake GitHub, no network needed:
//   node worker/test.mjs

import assert from 'node:assert/strict';
import worker from './worker.js';

const env = {
  GITHUB_CLIENT_ID: 'Iv1.test',
  GITHUB_CLIENT_SECRET: 'shh',
  GITHUB_APP_SLUG: 'bojji-test',
  ALLOWED_ORIGINS: 'https://vsouto.github.io, http://localhost:5173/',
};
const ORIGIN = 'http://localhost:5173';
const calls = [];
globalThis.fetch = async (url, init) => {
  const body = init.body ? JSON.parse(init.body) : null;
  calls.push({ url, method: init.method, headers: init.headers, body });
  if (url.endsWith('/login/oauth/access_token')) {
    if (body.code === 'bad') return Response.json({ error: 'bad_verification_code', error_description: 'The code passed is incorrect or expired.' });
    return Response.json({ access_token: 'ghu_x', token_type: 'bearer', scope: '', expires_in: 28800, refresh_token: 'ghr_x', refresh_token_expires_in: 15897600 });
  }
  if (url.includes('/applications/') && init.method === 'DELETE') return new Response(null, { status: 204 });
  throw new Error(`unexpected fetch ${url}`);
};

const req = (path, { method = 'POST', origin = ORIGIN, body } = {}) => worker.fetch(new Request(`https://auth.test${path}`, {
  method, headers: { ...(origin && { Origin: origin }), 'Content-Type': 'application/json' }, body: body && JSON.stringify(body),
}), env);

let res = await req('/config', { method: 'GET', origin: 'https://evil.example' });
assert.equal(res.status, 403);
res = await req('/config', { method: 'GET', origin: null });
assert.equal(res.status, 403);
console.log('- unknown or missing origin is refused');

res = await req('/config', { method: 'OPTIONS' });
assert.equal(res.status, 204);
assert.equal(res.headers.get('Access-Control-Allow-Origin'), ORIGIN);
console.log('- preflight from an allowed origin passes');

res = await req('/config', { method: 'GET' });
assert.deepEqual(await res.json(), { client_id: 'Iv1.test', app_slug: 'bojji-test' });
console.log('- /config exposes client id and slug only');

res = await req('/token', { body: { code: 'abc', redirect_uri: `${ORIGIN}/`, code_verifier: 'v' } });
assert.equal(res.status, 200);
let data = await res.json();
assert.equal(data.access_token, 'ghu_x');
assert.equal(data.refresh_token, 'ghr_x');
assert.equal(data.scope, undefined);
let sent = calls.at(-1).body;
assert.deepEqual(sent, { client_id: 'Iv1.test', client_secret: 'shh', code: 'abc', redirect_uri: `${ORIGIN}/`, code_verifier: 'v' });
console.log('- /token adds the secret and forwards code, redirect_uri and PKCE verifier');

res = await req('/token', { body: { code: 'bad' } });
assert.equal(res.status, 400);
assert.equal((await res.json()).error, 'bad_verification_code');
console.log('- GitHub errors come back as 400 with GitHub’s description');

res = await req('/refresh', { body: { refresh_token: 'ghr_old' } });
assert.equal(res.status, 200);
assert.deepEqual(calls.at(-1).body, { client_id: 'Iv1.test', client_secret: 'shh', grant_type: 'refresh_token', refresh_token: 'ghr_old' });
console.log('- /refresh uses grant_type=refresh_token');

res = await req('/signout', { body: { token: 'ghu_x' } });
assert.equal(res.status, 204);
const revoke = calls.at(-1);
assert.equal(revoke.method, 'DELETE');
assert.ok(revoke.url.endsWith('/applications/Iv1.test/token'));
assert.equal(revoke.headers.Authorization, `Basic ${btoa('Iv1.test:shh')}`);
console.log('- /signout revokes the token at GitHub with basic auth');

res = await req('/token', { body: {} });
assert.equal(res.status, 400);
res = await req('/nope', { body: {} });
assert.equal(res.status, 404);
res = await req('/token', { method: 'GET' });
assert.equal(res.status, 404);
console.log('- bad bodies and unknown routes are rejected');

console.log('\nWorker tests passed.');
