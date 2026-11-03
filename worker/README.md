# Bojji sign-in service

"Sign in with GitHub" for the hosted Bojji. It has two parts:

- **The Bojji GitHub App.** It asks only for **Contents: read and write** (plus the mandatory **Metadata: read**). A GitHub App user token reaches only the repositories where the user installed the app, so Bojji can touch the data repository and nothing else.
- **This Worker** (`worker.js`). It is a stateless Cloudflare Worker that keeps the app's client secret, trades the sign-in code for tokens, refreshes them, and revokes them on sign-out. It stores nothing and only answers the origins in `ALLOWED_ORIGINS`.

The browser keeps the user's token in `localStorage`. Tokens expire after 8 hours and are refreshed through the Worker. Notes and tasks go straight from the browser to the GitHub API and never pass through the Worker.

## How a new user gets in

1. They click **Sign in with GitHub** and approve Bojji on GitHub.
2. If Bojji isn't installed yet, the app shows two steps. First they create the private `bojji-data` repository with a prefilled github.com/new link. Then they install Bojji and pick **Only select repositories** with `bojji-data`.
3. GitHub returns to the app, which signs them in again, finds the repository and opens it.

If the app is already installed but the repository isn't shared with it, the setup screen links to the installation's settings page. The user can choose a different repository name on the setup screen, or later behind their name in the sidebar. The choice is stored per GitHub login in that browser.

## Set it up

You need a Cloudflare account and the GitHub account that will own the app.

1. **Register the GitHub App.** Run `npm start`, open http://localhost:5173/register-app.html and click **Create the GitHub App**. Review the settings on GitHub and confirm. GitHub sends you back to `/registered`, where the local server turns its one-hour code into the app's credentials, saves them in `.bojji-app.json` at the repo root (gitignored, mode 600) and opens Bojji. From then on `npm start` runs this Worker in-process at `/auth`, so **Sign in with GitHub** works locally right away.

   `.bojji-app.json` holds the `client_secret`: keep it private and never commit it. `github-app-manifest.json` has the settings: public app, Contents write, Metadata read, no webhook, "Request user authorization during installation" on, and callback URLs for the hosted app and localhost. Edit the URLs first if you host Bojji elsewhere.

   To register by hand instead, use the same values at https://github.com/settings/apps/new. Leave **Expire user authorization tokens** on, turn webhooks off, and select **Request user authorization (OAuth) during installation**.

2. **Configure the Worker.** In `wrangler.toml`, set `GITHUB_CLIENT_ID` and `GITHUB_APP_SLUG` from `.bojji-app.json` (`client_id` and `slug`). Set `ALLOWED_ORIGINS` to where Bojji runs, as origins without a path.

3. **Deploy it** from this folder:

   ```bash
   npx wrangler login
   npx wrangler secret put GITHUB_CLIENT_SECRET   # paste client_secret from .bojji-app.json
   npx wrangler deploy
   ```

   Wrangler prints the Worker URL, for example `https://bojji-auth.<you>.workers.dev`.

4. **Point the app at it.** Put that URL in `public/config.js` as `authUrl` and publish the site. Locally you don't need it: the in-process Worker at `/auth` is used. To test the deployed one locally, run `BOJJI_AUTH_URL=<worker url> npm start`.

## Test

```bash
node worker/test.mjs   # the Worker against a fake GitHub, no network
```
