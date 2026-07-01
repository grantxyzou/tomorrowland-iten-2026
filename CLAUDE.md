# Tomorrowland 2026 — crew planning PWA

Vite + React 18 SPA. Vercel serverless functions (`api/*.js`, auto-routed).
Upstash Redis for all shared state. Google OAuth (auth-code redirect at `/api/oauth`).

## Commands
- `npm run dev` — local dev (Vite on :5173; service worker does NOT register in dev).
  For sign-in to work locally you also need the API running: in a second terminal run
  `vercel dev --listen 3210` (Vite proxies `/api/*` to it), `vercel env pull` once for
  secrets, and register `http://localhost:5173/api/oauth` as an Authorized redirect URI
  on the Google OAuth client. Use Chrome/Firefox locally — Safari drops `Secure` cookies
  on http://localhost.
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

## Tab headers (shared shell — the thing that bites you)
- Both tabs render ONE shared shell, `src/components/TabHeader.jsx`: a full-bleed
  gradient banner (height `HERO_H`, theme.js) with the identity strip (kicker ·
  crew · DEPARTURE IN · countdown) overlaid. Bodies are tab-specific:
  `itinerary/SkyHeader.jsx` (sky+clock) / `lineup/ConscienciaHeader.jsx` (wordmark).
  Keep them aligned by editing the shell, not per-tab. The banner just scrolls away
  with the page (no sticky/collapsing behavior anymore).
- Countdown is ONE helper — `src/lib/countdown.js` `countdownLabel()` (uppercase
  `14 DAYS`). Don't reintroduce a second per-tab copy (that caused the old casing drift).
- Header type/size/height come from theme.js tokens (`HERO_H`, `hdr*`) — reference
  them, don't hand-set fontSize/height in the headers.
- Tab switch motion: only the banner BODY cross-fades (`fx-fade` on the body in
  TabHeader); the identity strip must NOT fade. Opacity cascades, so anything that
  must stay still cannot be under a fading ancestor.
- The tab SWITCHER lives in the BOTTOM bar, not the top: `lineup/TabPills.jsx` is a
  shared pill switcher (Itinerary/Lineup, styled like the account/day pills) rendered
  as the top row of BOTH bottom bars (`TripBar.jsx` + the Itinerary bar in
  `ItineraryTab.jsx`). App owns `activeTab`/`visibleTabs` and passes
  `{tabs, activeTab, onSelectTab}` down to both tabs. TabPills renders nothing when
  `tabs.length < 2` (non-`ldg` crews have only Lineup). Keep `role=tab` /
  `id="tab-<id>"` / `aria-controls="tabpanel"` so it still pairs with `<main>`.

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
- Local-dev sign-in works via `vercel dev` + the localhost redirect URI (see Commands).
  `api/oauth.js` `redirectUri()` uses http for localhost, https everywhere else.
