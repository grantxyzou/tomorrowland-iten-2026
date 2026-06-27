#!/usr/bin/env node
// One-off migration: copy existing global Redis data into group:ldg:* namespace.
// Safe to run multiple times — writes are idempotent (hset / set overwrite).
//
// Usage:
//   node --env-file=.env scripts/migrate-to-groups.js          # live
//   node --env-file=.env scripts/migrate-to-groups.js --dry-run
//
// Or export env vars manually:
//   UPSTASH_REDIS_REST_URL=... UPSTASH_REDIS_REST_TOKEN=... ALLOWED_EMAILS=... \
//     node scripts/migrate-to-groups.js
//
// After running, verify with:
//   curl -H "Authorization: Bearer $TOKEN" "$URL/hgetall/group:ldg:members"
//   curl -H "Authorization: Bearer $TOKEN" "$URL/smembers/user:<email>:groups"

import crypto from 'crypto';
import { Redis } from '@upstash/redis';

// ── Config ───────────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');
const G0_ID   = 'ldg';
const G0_NAME = 'The Budhole';

// Person colours matching src/components/lineup/theme.js PERSON_COLORS
const PERSON_COLORS = {
  Grant:   '#e9b949',
  Desmond: '#8fb6ff',
  Lawrence:'#e23b3b',
};

// ── Redis ────────────────────────────────────────────────────────────────────
const REDIS_URL   = process.env.UPSTASH_REDIS_REST_URL   || process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

if (!REDIS_URL || !REDIS_TOKEN) {
  console.error('❌  Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN');
  process.exit(1);
}

const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });

// ── Helpers ───────────────────────────────────────────────────────────────────
const log = (msg) => console.log(msg);
const ok  = (msg) => console.log(`  ✓ ${msg}`);
const dry = (msg) => console.log(`  ~ ${msg}`);

async function write(label, fn) {
  if (DRY_RUN) { dry(label); return; }
  await fn();
  ok(label);
}

// "email:Person,email:Person" → [{ email, person }]
function parseAllowedEmails(raw) {
  const result = [];
  for (const pair of (raw || '').split(',')) {
    const i = pair.lastIndexOf(':');
    if (i === -1) continue;
    const email  = pair.slice(0, i).trim().toLowerCase();
    const person = pair.slice(i + 1).trim();
    if (email && person) result.push({ email, person });
  }
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  if (DRY_RUN) log('\n🔍  DRY-RUN — nothing will be written to Redis\n');
  else         log('\n🚀  LIVE — writing to Redis\n');

  // 1. Parse member list from ALLOWED_EMAILS
  const members = parseAllowedEmails(process.env.ALLOWED_EMAILS);
  if (members.length === 0) {
    console.error('❌  ALLOWED_EMAILS is empty or unset — aborting');
    process.exit(1);
  }
  log(`Members: ${members.map(m => `${m.person} <${m.email}>`).join(', ')}`);

  const createdBy  = members[0].email;
  const createdAt  = Date.now();

  // 2. Write group meta
  log('\n── group meta ──');
  await write(
    `SET group:${G0_ID}:meta  { id, name:"${G0_NAME}", createdBy, createdAt }`,
    () => redis.set(`group:${G0_ID}:meta`, JSON.stringify({
      id: G0_ID, name: G0_NAME, createdBy, createdAt,
    }))
  );

  // 3. Write member records
  log('\n── members ──');
  for (const { email, person } of members) {
    const color = PERSON_COLORS[person] || '#888888';
    await write(
      `HSET group:${G0_ID}:members  ${email}  { displayName:"${person}", color:"${color}", role:"admin" }`,
      () => redis.hset(`group:${G0_ID}:members`, {
        [email]: JSON.stringify({ displayName: person, color, role: 'admin', joinedAt: createdAt }),
      })
    );
    await write(
      `SADD user:${email}:groups  ${G0_ID}`,
      () => redis.sadd(`user:${email}:groups`, G0_ID)
    );
  }

  // 4. Copy picks (field format unchanged: "<setId>|<person>")
  log('\n── picks ──');
  const picks = await redis.hgetall('picks');
  const picksCount = Object.keys(picks || {}).length;
  if (picksCount > 0) {
    log(`  Found ${picksCount} pick field(s) in global "picks" hash`);
    await write(
      `HSET group:${G0_ID}:picks  (${picksCount} fields)`,
      () => redis.hset(`group:${G0_ID}:picks`, picks)
    );
  } else {
    log('  No picks to copy (empty or missing global hash)');
  }

  // 5. Copy crew_status
  log('\n── crew_status → group:ldg:status ──');
  const status = await redis.hgetall('crew_status');
  const statusCount = Object.keys(status || {}).length;
  if (statusCount > 0) {
    log(`  Found ${statusCount} status field(s)`);
    await write(
      `HSET group:${G0_ID}:status  (${statusCount} fields) + EXPIRE 4h`,
      async () => {
        await redis.hset(`group:${G0_ID}:status`, status);
        await redis.expire(`group:${G0_ID}:status`, 60 * 60 * 4);
      }
    );
  } else {
    log('  No statuses to copy');
  }

  // 6. Copy crew_loc
  log('\n── crew_loc → group:ldg:loc ──');
  const locs = await redis.hgetall('crew_loc');
  const locCount = Object.keys(locs || {}).length;
  if (locCount > 0) {
    log(`  Found ${locCount} location pin(s)`);
    await write(
      `HSET group:${G0_ID}:loc  (${locCount} fields) + EXPIRE 4h`,
      async () => {
        await redis.hset(`group:${G0_ID}:loc`, locs);
        await redis.expire(`group:${G0_ID}:loc`, 60 * 60 * 4);
      }
    );
  } else {
    log('  No location pins to copy');
  }

  // 7. Mint join code for g0
  log('\n── join code ──');
  const code = crypto.randomBytes(4).toString('hex').toUpperCase();
  await write(
    `SET joincode:${code}  ${G0_ID}`,
    () => redis.set(`joincode:${code}`, G0_ID)
  );
  log(`\n  Join link: /join/${code}  (share this with the crew)`);

  log('\n✅  Migration complete.\n');
  if (!DRY_RUN) {
    log('Old global keys (picks, crew_status, crew_loc) are untouched.');
    log('Verify the new keys, then delete the old ones when ready:\n');
    log('  redis.del("picks", "crew_status", "crew_loc")\n');
  }
}

main().catch(err => {
  console.error('❌  Migration failed:', err);
  process.exit(1);
});
