---
name: recover-picks
description: Inspect or recover a user's DJ picks in Upstash Redis after a rename/re-key incident. Inspect is read-only; recovery only writes behind an explicit --apply flag.
disable-model-invocation: true
---

# Recover picks

For incidents where a user's picks appear lost — usually after a rename, since
picks are keyed `group:<gid>:picks` field `<setId>|<person>` and status/loc are
keyed by `<person>`. This skill bundles `recover-picks.mjs`, which is
**read-only by default** and only mutates with `--apply`.

## Safety first

1. **Always inspect first** (no flags = no writes). Eyeball the per-person tally
   before doing anything.
2. Recovery does **copy-before-delete** per field, so an interrupted run never
   loses data.
3. It needs prod Redis creds via `--env-file`. The user supplies that file; do
   not create or read secret values yourself.

## Inspect (safe, read-only)

```bash
node --env-file=.env.recovery .claude/skills/recover-picks/recover-picks.mjs \
  --email=<user@example.com>
```

Prints, for each crew the user is in: their `displayName`, the picks tally by
person, and the status/loc key names. This alone usually reveals whether picks
are truly missing or just under a different name (often they're fine — the
"loss" is a stale client, fixed by a reload).

## Recover (writes — only after inspecting)

```bash
node --env-file=.env.recovery .claude/skills/recover-picks/recover-picks.mjs \
  --email=<user@example.com> --from="<OldName>" --to="<NewName>" --apply
```

Re-keys every `<setId>|<OldName>` pick field (split on the LAST `|`) plus the
status/loc entries from `<OldName>` to `<NewName>`. Skips crews with no `<OldName>`
picks. Re-runnable.

## When NOT to use

If inspect shows the picks already present under the user's current name, do
nothing — tell them to reload the app. Don't re-key on a hunch.
