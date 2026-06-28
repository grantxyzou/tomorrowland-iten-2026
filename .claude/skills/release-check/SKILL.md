---
name: release-check
description: Pre-deploy checklist for Tomorrowland 2026 — verifies the build, the service-worker stamp, and the right URLs/OAuth before a production push. Run before deploying.
disable-model-invocation: true
---

# Release check

Repeatable pre-deploy verification for this app. The gotchas below each cost
real debugging time at least once — run through them before pushing to `main`
(which auto-deploys to Vercel production).

## 1. Build is clean and the SW is stamped

```bash
npm test          # vitest run — api/*.test.js must pass
npm run build     # vite build + scripts/stamp-sw.mjs
grep -c '__BUILD_ID__' dist/sw.js   # MUST be 0 — placeholder was replaced
grep -m1 "const VERSION" dist/sw.js # should show a SHA/timestamp, not __BUILD_ID__
```

If `dist/sw.js` still contains `__BUILD_ID__`, the stamp step didn't run and the
PWA will serve a stale build. Fix before deploying.

## 2. Test on the ALIAS, never the deployment URL

- Public alias: **`tomorrowland-iten-2026.vercel.app`**.
- Raw deployment URLs and `*-projects.vercel.app` are behind Deployment
  Protection (SSO) and will 302 — synthetic checks against them are meaningless.
- Google OAuth `redirect_uri` must match the **alias**. Testing sign-in on a
  deployment URL produces `redirect_uri_mismatch`.

## 3. After deploy, verify

```bash
# historical logs need --since (the positional deploy arg only streams)
vercel logs --environment production --no-branch --since 1h -x
```

- Open the installed PWA on a phone, background it, reopen → it should
  auto-reload once to the new build (no force-quit). No reload loop.
- Live data (a pick toggle / crewmate change) appears within ~5s.

## 4. Secrets / env

Required in Vercel prod: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`SESSION_SECRET`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`,
`NUNU_EMAILS`. Never commit these — set them in the Vercel dashboard. The user
sets secret values themselves; do not enter them.
