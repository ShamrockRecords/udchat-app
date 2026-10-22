# UDChat - Group text chat with automatic translation

Official site: https://chat.udtalk.jp

UDChat uses Express, EJS, Socket.IO, Firebase Authentication and Firestore. There is no frontend build step. See [the Japanese README](README.md) for full deployment and maintenance notes.

## Local setup

Use **Node.js 24.22.1 or a later 24.x release** and **npm 11.x** (`nvm install` / `nvm use` reads `.nvmrc`). `engine-strict` rejects dependency installation on unsupported runtimes. This minimum addresses the [October 2026 Node.js security release](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases).

```sh
npm ci
cp .env.example .env
# Fill in the Firebase settings; do not overwrite an existing .env.
npm start
```

Open `http://localhost:3000`.

```sh
npm run check
npm test
npm audit
```

Tests use fixture data, never production Firebase or translation services. Verify real email delivery, OAuth providers, Firestore permissions/indexes and translation on staging.

## Configuration

[.env.example](.env.example) lists the current variables. Keep credentials out of Git.

- Set `ROOT_URL` to the public origin. HTTPS is required in production.
- Set `SESSION_SECRET` to a stable random string of at least 32 bytes. Production refuses to start without it. Development generates a temporary value if omitted.
- Set `FIREBASE_API_KEY` for server-side Firebase Authentication REST calls. Do not use a browser HTTP referrer-restricted key here.
- Set `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID` and `FIREBASE_APP_ID` for browser authentication.
- Set `FIREBASE_ADMINSDK_project_id`, `FIREBASE_ADMINSDK_client_email` and `FIREBASE_ADMINSDK_private_key` from a Firebase service account. Both real newlines and literal `\n` escapes are supported in the private key.
- `OPENED_FIREBASE_API_KEY` optionally enables Facebook / X (Twitter) popup login. Configure providers and authorized domains in Firebase.
- `GOOGLE_CLOUD_TRANSLATION_API_KEY` optionally enables translation. An empty key disables translation. Restrict browser keys to the application's HTTP referrers and required APIs.

Previously used storage, messaging, measurement and additional service-account metadata variables can remain configured but are no longer read.

## Heroku

Configure `NODE_ENV=production`, HTTPS `ROOT_URL`, `SESSION_SECRET` and the Firebase values in Config Vars **before deploying**. Use the Node.js buildpack and a supported stack. Heroku assigns `PORT`; do not set it manually. `Procfile` starts `node ./bin/www`.

Run **one web dyno with one Node.js process**. Socket.IO presence/broadcasts and rate limits are local to that process. Multiple dynos require a shared Socket.IO adapter, sticky sessions for HTTP polling, and a shared rate-limit store.

Firebase identity is verified from a 14-day HttpOnly/Secure/SameSite=Lax session cookie. Locale and CSRF tokens use a small signed cookie; no password or identity is stored there. Cookie contents are not encrypted. A stable `SESSION_SECRET` preserves those settings across restarts.

Chat connection grants expire after 14 hours, including idle receivers. Passcode changes and deletion through the app immediately disconnect existing participants. Restoring a previous passcode does not revive old grants; name-only edits keep connections. An optional `accessRevision` field is saved on room edits; no data migration is required. Reopen the chat when access expires and reload tabs opened before deployment. Browser connections must have the same Origin as `ROOT_URL`; non-browser connections still require a signed grant. Signup/reset emails share an IP limit of 30 requests per 15 minutes, counting successes too.

Rebuild and deploy to update Node.js; restarting a dyno alone does not update the runtime. Check the build log and `heroku run --no-tty --app <app-name> 'node --version'` for 24.22.1 or a later 24.x release.

`/healthz` checks process liveness, not Firebase connectivity. `SIGTERM` stops new chat work, waits for active operations, and closes connections with a 25-second deadline.

Before production deployment, test email login/signup/verification/reset, social login, room creation/edit/deletion, guest passcodes, two-browser messaging, translation enabled/disabled, CSV export and reconnecting after a restart on staging.

The existing Firestore schema is preserved. Deleting a room still deletes only its metadata, not all stored messages. Data retention, Firestore rules and indexes must be reviewed separately; rules and indexes are not present in this repository.

## Dependency maintenance

The 2026-10-22 update uses Express 5.3.0, EJS 7.0.2, dotenv 18.0.8 and Firebase Admin 14.5.0, with updated transitive dependencies. Server code uses the modular Firebase app/auth/firestore entry points. Obsolete UUID overrides were removed. Browser assets use Bootstrap 5.3.8, jQuery 4.0.0 and Firebase JS 13.1.0 with pinned versions and SRI hashes. Existing templates, styling and continuous speech input are preserved.

GitHub Actions uses `.nvmrc`, runs syntax/regression checks and audits all dependencies, failing on known low-or-higher vulnerabilities. An audit with zero findings does not guarantee application or cloud configuration security.

The production Firestore rules read on 2026-10-22 deny all client reads/writes. Admin SDK access uses IAM and still requires server-side authorization. Direct Firebase Console edits bypass the app's immediate socket revocation; restart the app to disconnect existing participants after such edits.

References: [Heroku Node.js support](https://devcenter.heroku.com/articles/nodejs-support), [dyno shutdown](https://devcenter.heroku.com/articles/dyno-shutdown-behavior), [Firebase session cookies](https://firebase.google.com/docs/auth/admin/manage-cookies), [Authentication REST API](https://firebase.google.com/docs/reference/rest/auth).
