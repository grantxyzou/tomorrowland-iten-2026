# Tomorrowland 2026 — crew planning PWA

Vite + React 18 SPA. Vercel serverless functions (`api/*.js`, auto-routed).
Upstash Redis for all shared state. Google OAuth (auth-code redirect at `/api/oauth`).

## Commands
- `npm run dev` — local dev (Vite; service worker does NOT register in dev)
- `npm run build` — `vite build` + `node scripts/stamp-sw.mjs` (stamps the SW
  with the deploy's git SHA so the PWA detects updates — don't drop the stamp step)
- `npm test` — `vitest run` (tests are `api/**/*.test.js`, node env)

## Identity & data model (the thing that bites you)
- A user has ONE global display name: `session.person`, set at login in
  `api/_auth.js` (`resolvePersonName`). Renaming is global, not per-crew.
- Picks live in `group:<gid>:picks` as hash fields `<setId>|<person>` (split on
  the LAST `|`). `:status` and `:loc` are keyed by `<person>`.
- Membership: `group:<gid>:members[<email>]` = JSON {displayName,color,role,joinedAt};
  `user:<email>:groups` = set of gids; `joincode:<CODE>` → gid (30d TTL).
- Identify people by EMAIL, not display name — display names are user-set and
  often placeholders.

## Crews (groups)
- The original crew is `gid:'ldg'` (display name "The Budhole").
- Only `ldg` shows the Itinerary tab — gated on `activeGroupId === 'ldg'` in `App.jsx`.
- "Nunu" gate (server-enforced): non-Nunu members of `ldg` are blocked from
  leave/delete. Nunu = `NUNU_EMAILS` env (default grantxyzou@gmail.com).

## PWA / freshness
- `public/sw.js` is network-first for navigation/`/api/picks`, SWR for hashed
  assets; `skipWaiting` + `clients.claim`. VERSION is `__BUILD_ID__`, stamped per
  deploy. `src/main.jsx` reloads once on `controllerchange` so a warm PWA picks
  up new deploys without a force-quit.

## Deploy / ops gotchas
- Public alias: `tomorrowland-iten-2026.vercel.app`. Deployment-Protection (SSO)
  guards the raw deployment / `-projects` URLs — always test on the alias, and
  OAuth `redirect_uri` must match the alias (not a deployment URL).
- `vercel logs` needs `--since` for historical (positional deploy arg only streams).
- Required env: GOOGLE_CLIENT_ID/SECRET, SESSION_SECRET, UPSTASH_REDIS_REST_URL/TOKEN,
  NUNU_EMAILS. Never commit secrets.
- Known: local-dev sign-in is currently broken (prod OAuth works).
