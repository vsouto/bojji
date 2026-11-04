// Stores items in a private repo in the user's own GitHub account, using
// only the GitHub REST API (no git binary), so the same code runs in any
// browser and in Node.

import { isItemPath, parse, pathFor, serialize } from './items.js';

const API = 'https://api.github.com';

export class ConflictError extends Error {
  constructor(path) {
    super(`${path} was changed on another device. Reload to get the latest version.`);
    this.path = path;
  }
}

// `token` is a string, or a function returning one (so it can be refreshed).
export function createGitHubStore({ token, owner, repo }) {
  async function request(method, url, body) {
    const bearer = typeof token === 'function' ? await token() : token;
    const res = await fetch(url.startsWith('http') ? url : `${API}${url}`, {
      method,
      headers: {
        Authorization: `Bearer ${bearer}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
      cache: 'no-store',
    });
    if (res.status === 404 && method === 'GET') return null;
    const data = res.status === 204 ? null : await res.json();
    if (!res.ok) {
      const error = new Error(`GitHub ${method} ${url}: ${res.status} ${data?.message ?? ''}`);
      error.status = res.status;
      throw error;
    }
    return data;
  }

  const contents = (path) => `/repos/${owner}/${repo}/contents/${path}`;

  // A stale sha means another device wrote the file since we read it.
  async function write(method, item, sha, body) {
    try {
      return await request(method, contents(pathFor(item)), body);
    } catch (error) {
      if (error.status === 409 || (error.status === 422 && sha)) throw new ConflictError(pathFor(item));
      throw error;
    }
  }

  const createRepo = () => request('POST', '/user/repos', {
    name: repo,
    private: true,
    auto_init: true,
    description: 'Bojji notes and tasks',
  });

  return {
    owner,
    repo,

    // The signed-in account. Works with any token.
    async user() {
      const me = await request('GET', '/user');
      return { login: me.login, name: me.name || me.login };
    },

    // Where this GitHub App is installed for the user (null if nowhere). A user
    // token from a GitHub App only reaches repositories in the installation.
    async installation(appSlug) {
      const { installations = [] } = (await request('GET', '/user/installations?per_page=100')) ?? {};
      const found = installations.find((i) => !appSlug || i.app_slug === appSlug);
      return found ? { id: found.id, selection: found.repository_selection } : null;
    },

    // Whether the data repo exists and the token can see it. A repo outside
    // the installation also reads as 404, so "missing" may mean "not shared".
    async hasRepo() {
      return Boolean(await request('GET', `/repos/${owner}/${repo}`));
    },

    createRepo,

    async ensureRepo() {
      if (await this.hasRepo()) return { created: false };
      await createRepo();
      return { created: true };
    },

    async list() {
      const tree = await request('GET', `/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
      const blobs = (tree?.tree ?? []).filter((entry) => entry.type === 'blob' && isItemPath(entry.path));
      return Promise.all(
        blobs.map(async ({ path, sha }) => {
          const blob = await request('GET', `/repos/${owner}/${repo}/git/blobs/${sha}`);
          return { ...parse(decodeBase64(blob.content)), path, sha };
        }),
      );
    },

    // Pass the sha you read to update an existing item; omit it to create.
    // `touch: false` is a move: the file keeps its `updated` time.
    async save(item, sha, { touch = true } = {}) {
      const verb = !sha ? 'Add' : touch ? 'Update' : 'Move';
      const result = await write('PUT', item, sha, {
        message: `${verb} ${item.type}: ${item.title || item.id}`,
        content: encodeBase64(serialize(item, { touch })),
        ...(sha && { sha }),
      });
      return { ...item, path: pathFor(item), sha: result.content.sha };
    },

    async remove(item, sha) {
      await write('DELETE', item, sha, { message: `Delete ${item.type}: ${item.title || item.id}`, sha });
    },
  };
}

function encodeBase64(text) {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function decodeBase64(base64) {
  const binary = atob(base64.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}
