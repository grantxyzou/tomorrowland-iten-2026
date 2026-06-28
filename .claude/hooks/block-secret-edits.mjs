#!/usr/bin/env node
// PreToolUse(Edit|Write) — refuse to write secret-bearing files.
//
// Context: a `.env.recovery` holding ALL prod secrets nearly got committed. This
// denies edits to any .env* (except the safe .env.example), the .vercel/ dir, and
// anything named *.recovery. Matching is case-insensitive (macOS APFS is
// case-insensitive, so `.ENV` would otherwise slip through and hit `.env`) and
// covers `.envrc` / `.env_prod`, matching the stated "any .env*" scope.

import { basename } from 'node:path';
import { read, out, isMain } from './_io.mjs';

export function shouldBlockSecret(filePath) {
  if (!filePath) return false;
  const name = basename(filePath).toLowerCase();
  const fp = filePath.toLowerCase();
  const isEnv = name.startsWith('.env') && name !== '.env.example';
  const isVercel = /(^|\/)\.vercel\//.test(fp);
  const isRecovery = name.endsWith('.recovery');
  return isEnv || isVercel || isRecovery;
}

async function main() {
  const raw = await read(process.stdin);
  let fp = '';
  try { fp = JSON.parse(raw || '{}')?.tool_input?.file_path || ''; } catch {}

  if (shouldBlockSecret(fp)) {
    out({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `Refusing to write "${basename(fp)}": it holds or shadows production secrets. ` +
          `Edit .env.example instead, or ask the user to change secrets themselves ` +
          `(GOOGLE_CLIENT_SECRET / SESSION_SECRET / UPSTASH_* must never be committed).`,
      },
    });
  }
  out({});
}

if (isMain(import.meta.url)) main();
