// Deployment settings for this copy of Bojji. Nothing here is secret.
//
// authUrl: the Cloudflare Worker from worker/ that completes "Sign in with
// GitHub" (it holds the GitHub App's client secret and hands out the client id
// and app slug). Leave it empty and the hosted app offers only the demo.
export default {
  authUrl: 'https://bojji-auth.souto-victor.workers.dev',
};
