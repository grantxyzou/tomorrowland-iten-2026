// One-off recovery for picks orphaned by a rename/re-key.
//
//   Inspect (read-only, safe):
//     node --env-file=.env.recovery .claude/skills/recover-picks/recover-picks.mjs --email=user@example.com
//
//   Apply the re-key (writes) once you've eyeballed the inspect output:
//     node --env-file=.env.recovery .claude/skills/recover-picks/recover-picks.mjs \
//       --email=user@example.com --from="Old Name" --to="New Name" --apply
//
// Reads UPSTASH_REDIS_REST_URL/TOKEN (or KV_*) from the env (--env-file).
// Picks fields are `<setId>|<person>` (split on the LAST `|`); status/loc/trash
// are keyed by <person>. Run from the project root so @upstash/redis resolves.

import { Redis } from '@upstash/redis';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const m = a.match(/^--([^=]+)=?(.*)$/); return m ? [m[1], m[2] === '' ? true : m[2]] : [a, true];
}));
const EMAIL = String(args.email || '').toLowerCase();
const APPLY = !!args.apply;
// Require a real string value: `--from=` / `--to=` parse to boolean true, which
// would otherwise coerce to the literal person name "true" and corrupt data.
const FROM = typeof args.from === 'string' && args.from !== '' ? args.from : null;
const TO   = typeof args.to   === 'string' && args.to   !== '' ? args.to   : null;
const SEP = '|';

if (!EMAIL) { console.error('Pass --email=<address>'); process.exit(1); }

if (APPLY) {
  if (!FROM || !TO) { console.error('--apply requires --from=<old> and --to=<new> (both non-empty)'); process.exit(1); }
  // Copy-before-delete on the SAME field would delete the data it meant to keep.
  if (FROM === TO) { console.error('--from and --to are identical; nothing to re-key'); process.exit(1); }
}

const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL  || process.env.KV_REST_API_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
});

const personOf = (field) => field.slice(field.lastIndexOf(SEP) + 1);

async function main() {
  const gids = (await redis.smembers(`user:${EMAIL}:groups`)) || [];
  console.log(`\nuser ${EMAIL} is in crews: ${gids.join(', ') || '(none)'}\n`);

  for (const gid of gids) {
    const metaRaw = await redis.get(`group:${gid}:meta`);
    const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : (metaRaw || {});
    const membersFlat = (await redis.hgetall(`group:${gid}:members`)) || {};
    const myRaw = membersFlat[EMAIL];
    const me = myRaw ? (typeof myRaw === 'string' ? JSON.parse(myRaw) : myRaw) : null;

    const picksFlat = (await redis.hgetall(`group:${gid}:picks`)) || {};
    const tally = {};
    for (const f of Object.keys(picksFlat)) {
      const p = personOf(f); tally[p] = (tally[p] || 0) + 1;
    }
    const statusFlat = (await redis.hgetall(`group:${gid}:status`)) || {};
    const locFlat = (await redis.hgetall(`group:${gid}:loc`)) || {};

    console.log(`── ${gid}  "${meta.name || ''}"  (my displayName: ${me?.displayName ?? 'NOT A MEMBER'})`);
    console.log(`   picks by person: ${JSON.stringify(tally)}`);
    console.log(`   status names: ${Object.keys(statusFlat).join(', ') || '-'} | loc names: ${Object.keys(locFlat).join(', ') || '-'}`);

    if (APPLY && FROM && TO) {
      if (!Object.keys(tally).includes(FROM)) { console.log(`   [apply] no '${FROM}' picks here — skip`); continue; }
      let moved = 0;
      for (const f of Object.keys(picksFlat)) {
        if (personOf(f) !== FROM) continue;
        const newF = f.slice(0, f.lastIndexOf(SEP) + 1) + TO;
        await redis.hset(`group:${gid}:picks`, { [newF]: picksFlat[f] });
        await redis.hdel(`group:${gid}:picks`, f);
        moved++;
      }
      // status/loc carry a single value per person — don't clobber an existing
      // target. If TO already has one, keep it and just retire the old FROM entry.
      if (statusFlat[FROM] != null) {
        if (statusFlat[TO] != null) console.log(`   [apply] '${TO}' already has a status — keeping it, not overwriting`);
        else await redis.hset(`group:${gid}:status`, { [TO]: statusFlat[FROM] });
        await redis.hdel(`group:${gid}:status`, FROM);
      }
      if (locFlat[FROM] != null) {
        if (locFlat[TO] != null) console.log(`   [apply] '${TO}' already has a location — keeping it, not overwriting`);
        else await redis.hset(`group:${gid}:loc`, { [TO]: locFlat[FROM] });
        await redis.hdel(`group:${gid}:loc`, FROM);
      }
      console.log(`   [apply] moved ${moved} pick fields '${FROM}' → '${TO}'`);
    }
  }
  console.log(`\n${APPLY ? 'APPLIED' : 'INSPECT ONLY (no writes). Re-run with --from/--to/--apply to recover.'}\n`);
}
main().catch(e => { console.error(e); process.exit(1); });
