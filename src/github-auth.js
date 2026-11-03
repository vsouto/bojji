// "Sign in with GitHub" for the browser, built on a GitHub App.
//
// The browser never sees the app's client secret: the authorization code is
// traded for tokens by a tiny stateless Worker (see worker/), which also
// refreshes them. A user token from a GitHub App only reaches repositories
// where the user installed the app, so Bojji can only touch the data repo.
//
// Where the session lives: localStorage. A notes app is opened many times a
// day on phones and laptops, and losing the sign-in on every reload (memory)
// or every tab (sessionStorage) would push people back to the demo. The token
// is scoped to one repository by the installation, the app loads no
// third-party scripts, and "Sign out" revokes the token at GitHub, not just
// locally. Tokens keep GitHub's default expiry (8 hours) and are refreshed on
// demand, so a leaked access token is short-lived.

const GITHUB = 'https://github.com';
const SESSION_KEY = 'bojji.session';
const FLOW_KEY = 'bojji.oauth'; // the in-flight flow (state + PKCE verifier), per tab

export class AuthError extends Error {}

export function createAuth({ authUrl, redirectUri, storage = localStorage, session = sessionStorage } = {}) {
  authUrl = authUrl?.replace(/\/$/, '');
  let config = null;
  let refreshing = null; // one refresh at a time: a refresh token works only once

  async function call(path, body) {
    let res;
    try {
      res = await fetch(`${authUrl}${path}`, {
        method: body ? 'POST' : 'GET',
        headers: body && { 'Content-Type': 'application/json' },
        body: body && JSON.stringify(body),
      });
    } catch {
      throw new AuthError('Couldn’t reach the sign-in service.');
    }
    const data = res.status === 204 ? null : await res.json().catch(() => null);
    if (!res.ok) throw new AuthError(data?.error_description ?? data?.error ?? `Sign-in service error (${res.status})`);
    return data;
  }

  const read = (store, key) => { try { return JSON.parse(store.getItem(key)); } catch { return null; } };
  const write = (store, key, value) => { try { value == null ? store.removeItem(key) : store.setItem(key, JSON.stringify(value)); } catch {} };

  function save(tokens) {
    const now = Date.now();
    const current = {
      token: tokens.access_token,
      // Non-expiring tokens (expiry disabled in the app settings) have no expires_in.
      expires: tokens.expires_in ? now + tokens.expires_in * 1e3 : null,
      refresh: tokens.refresh_token ?? null,
      refreshExpires: tokens.refresh_token_expires_in ? now + tokens.refresh_token_expires_in * 1e3 : null,
    };
    write(storage, SESSION_KEY, current);
    return current;
  }

  const random = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  async function challenge(verifier) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  return {
    get enabled() { return Boolean(authUrl); },

    // Client id and app slug come from the Worker, so the app has one setting: the Worker URL.
    async config() {
      return (config ??= await call('/config'));
    },

    // Sends the browser to GitHub. Returns only if navigation fails.
    async signIn() {
      const { client_id } = await this.config();
      const verifier = random(), state = random();
      write(session, FLOW_KEY, { state, verifier, redirectUri });
      const params = new URLSearchParams({
        client_id, redirect_uri: redirectUri, state,
        code_challenge: await challenge(verifier), code_challenge_method: 'S256',
      });
      location.assign(`${GITHUB}/login/oauth/authorize?${params}`);
    },

    // Sends the browser to install the app. With "Request user authorization
    // during installation" on, GitHub comes back to the app's first callback
    // URL with a fresh code, so handleRedirect() signs the user in again.
    async install() {
      const { app_slug } = await this.config();
      const state = random();
      write(session, FLOW_KEY, { state, install: true });
      location.assign(`${GITHUB}/apps/${app_slug}/installations/new?state=${state}`);
    },

    // Call once at boot. Completes a sign-in if the URL carries GitHub's
    // answer, and cleans the URL either way. Resolves to true when a new
    // session was stored, false when there was nothing to do, or throws.
    async handleRedirect() {
      const url = new URL(location.href);
      const code = url.searchParams.get('code'), error = url.searchParams.get('error');
      const returned = url.searchParams.get('state'), setup = url.searchParams.get('setup_action');
      if (!code && !error) return false;
      for (const key of ['code', 'state', 'error', 'error_description', 'error_uri', 'installation_id', 'setup_action']) url.searchParams.delete(key);
      history.replaceState(null, '', url);
      const flow = read(session, FLOW_KEY);
      write(session, FLOW_KEY, null);
      if (error) throw new AuthError(error === 'access_denied' ? 'Sign-in was cancelled.' : url.searchParams.get('error_description') || error);
      // The state must be ours. GitHub's docs don't promise that an install
      // with authorization echoes the state back, so an install return is also
      // accepted without one, but only in the tab that started that install.
      const ours = flow && ((flow.verifier && returned === flow.state) || (flow.install && setup && (!returned || returned === flow.state)));
      if (!ours) throw new AuthError('This sign-in link is stale. Please try again.');
      const tokens = await call('/token', { code, redirect_uri: flow.redirectUri ?? redirectUri, code_verifier: flow.verifier });
      save(tokens);
      return true;
    },

    // The stored session, or null when there is none or it can no longer be refreshed.
    session() {
      const s = read(storage, SESSION_KEY);
      if (!s?.token) return null;
      const expired = s.expires && s.expires < Date.now();
      if (expired && (!s.refresh || (s.refreshExpires && s.refreshExpires < Date.now()))) return null;
      return s;
    },

    // A valid access token, refreshed when it is about to expire.
    async token() {
      const s = this.session();
      if (!s) throw new AuthError('Signed out.');
      if (!s.expires || s.expires - Date.now() > 6e4) return s.token;
      refreshing ??= call('/refresh', { refresh_token: s.refresh })
        .then((tokens) => save(tokens).token)
        .catch(() => {
          write(storage, SESSION_KEY, null);
          throw new AuthError('Your session expired. Please sign in again.');
        })
        .finally(() => { refreshing = null; });
      return refreshing;
    },

    async signOut() {
      const s = read(storage, SESSION_KEY);
      write(storage, SESSION_KEY, null);
      if (s?.token && authUrl) await call('/signout', { token: s.token }).catch(() => {});
    },
  };
}
