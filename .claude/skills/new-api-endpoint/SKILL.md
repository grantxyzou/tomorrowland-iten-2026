---
name: new-api-endpoint
description: Scaffold a new Vercel serverless endpoint (api/<name>.js) following this project's conventions — group-namespaced Redis keys, the requireMembership gate, and a matching vitest stub. Use when adding an API route.
disable-model-invocation: true
---

# New API endpoint

Stamps a new `api/<name>.js` that matches the existing endpoints (`picks.js`,
`groups.js`, `status.js`). Vercel auto-serves `api/<name>.js` at `/api/<name>` —
no routing config needed.

## Conventions to follow (from the existing endpoints)

- Init Redis once at module scope from `UPSTASH_REDIS_REST_URL/TOKEN`
  (fall back to `KV_*`).
- The group is chosen by the `g` query param, defaulting to `'ldg'` (the
  original crew). Constant: `const G0_ID = 'ldg'`.
- **Every read and write goes through `requireMembership(req, res, gid, redis)`**
  from `./_auth.js`. It responds with 401/403 itself and returns falsy when the
  caller is not allowed — so `if (!mem) return;` and never skip it.
- All keys are group-namespaced: `group:<gid>:<thing>`. Never a bare key.
- Wrap the handler body in try/catch and return JSON.

## Template — `api/<name>.js`

```js
// Vercel Serverless Function — <one-line purpose>.
// Auto-served at /api/<name>.
//
// Storage: group:<gid>:<thing>  (describe the shape)

import { Redis } from '@upstash/redis';
import { requireMembership } from './_auth.js';

const G0_ID = 'ldg';

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL  || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  try {
    const gid = req.query?.g || G0_ID;
    const KEY = `group:${gid}:<thing>`;

    const mem = await requireMembership(req, res, gid, redis);
    if (!mem) return; // requireMembership already sent 401/403

    if (req.method === 'GET') {
      const data = await redis.hgetall(KEY);
      return res.status(200).json({ data: data || {} });
    }

    if (req.method === 'POST') {
      // const person = mem.person; // identify writes by the session person
      // ...mutate group:<gid>:<thing> here...
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'internal error' });
  }
}
```

## Template — `api/<name>.test.js` (pure logic only)

Vitest runs in a node env over `api/**/*.test.js`. The existing `_auth.test.js`
tests **pure exported helpers**, not the HTTP handler. Extract any non-trivial
transform into a pure function and test that:

```js
import { describe, it, expect } from 'vitest';
import { transformThing } from './<name>.js'; // export the pure helper

describe('<name> transform', () => {
  it('does the thing for a normal input', () => {
    expect(transformThing(/* in */)).toEqual(/* out */);
  });
});
```

## After scaffolding

- If the endpoint touches picks/identity keys, run the **redis-keying-reviewer**
  subagent. If it adds an auth/authz path, run **auth-security-reviewer**.
- `npm test` must pass (the PostToolUse hook also runs it on api/ edits).
