// Bojji sign-in service: a stateless Cloudflare Worker that finishes GitHub's
// OAuth web flow for the Bojji GitHub App. The browser cannot hold the app's
// client secret, so it sends the authorization code here and gets tokens back.
//
// It stores nothing and logs nothing about users. Every request must come from
// an allowed origin (the hosted app, and localhost for development).
//
//   GET  /config   -> { client_id, app_slug }
//   POST /token    { code, redirect_uri, code_verifier? } -> GitHub's token response
//   POST /refresh  { refresh_token }                       -> GitHub's token response
//   POST /signout  { token }                               -> 204, token revoked at GitHub
//
// Environment (wrangler.toml [vars] and `wrangler secret put`):
//   GITHUB_CLIENT_ID, GITHUB_APP_SLUG, ALLOWED_ORIGINS (comma-separated), GITHUB_CLIENT_SECRET (secret)

const GITHUB = 'https://github.com';
const API = 'https://api.github.com';

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') ?? '';
    const allowed = (env.ALLOWED_ORIGINS ?? '').split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      Vary: 'Origin',
    };
    const json = (status, body) => new Response(body == null ? null : JSON.stringify(body), {
      status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    });
    const fail = (status, error, description) => json(status, { error, error_description: description });

    if (!allowed.includes(origin)) return new Response('Forbidden origin', { status: 403 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const { pathname } = new URL(request.url);
    if (request.method === 'GET' && pathname === '/config') {
      return json(200, { client_id: env.GITHUB_CLIENT_ID, app_slug: env.GITHUB_APP_SLUG });
    }
    if (request.method !== 'POST') return fail(404, 'not_found', 'Unknown endpoint.');

    let body;
    try { body = await request.json(); } catch { return fail(400, 'bad_request', 'Expected a JSON body.'); }

    // Exchange a code, or a refresh token, for tokens. GitHub answers 200 even
    // on failure, with an `error` field, so pass its status through by content.
    const exchange = async (params) => {
      const res = await fetch(`${GITHUB}/login/oauth/access_token`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, ...params }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) return fail(400, data.error ?? 'github_error', data.error_description ?? `GitHub answered ${res.status}.`);
      const { access_token, token_type, expires_in, refresh_token, refresh_token_expires_in } = data;
      return json(200, { access_token, token_type, expires_in, refresh_token, refresh_token_expires_in });
    };

    if (pathname === '/token') {
      if (!body.code) return fail(400, 'bad_request', 'Missing code.');
      return exchange({ code: body.code, redirect_uri: body.redirect_uri, ...(body.code_verifier && { code_verifier: body.code_verifier }) });
    }
    if (pathname === '/refresh') {
      if (!body.refresh_token) return fail(400, 'bad_request', 'Missing refresh_token.');
      return exchange({ grant_type: 'refresh_token', refresh_token: body.refresh_token });
    }
    if (pathname === '/signout') {
      if (!body.token) return fail(400, 'bad_request', 'Missing token.');
      const res = await fetch(`${API}/applications/${env.GITHUB_CLIENT_ID}/token`, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          'User-Agent': 'bojji-auth',
        },
        body: JSON.stringify({ access_token: body.token }),
      });
      // 404 means it was already revoked; both are a successful sign-out.
      if (res.status === 204 || res.status === 404) return json(204, null);
      return fail(502, 'github_error', `GitHub answered ${res.status} while revoking the token.`);
    }
    return fail(404, 'not_found', 'Unknown endpoint.');
  },
};
