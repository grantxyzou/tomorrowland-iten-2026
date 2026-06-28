#!/usr/bin/env node
// PostToolUse(Edit|Write) — run the API test suite after any api/*.js edit.
//
// classifyResult() distinguishes a real test failure (numeric non-zero exit ->
// 'block') from a tooling/spawn problem (null status, spawn error, or a timeout
// kill -> 'tooling'). A tooling problem must NOT be reported as a test failure,
// or every api edit gets blocked with an empty reason when e.g. vitest is missing.

import { spawnSync } from 'node:child_process';
import { read, out, isMain } from './_io.mjs';

export function isApiSrc(fp) {
  return /(^|\/)api\/[^/]+\.js$/.test(fp) && !/\.test\.js$/.test(fp);
}

export function classifyResult({ status } = {}) {
  if (typeof status === 'number') return status === 0 ? 'ok' : 'block';
  return 'tooling'; // null status / spawn error / killed by timeout signal
}

async function main() {
  const raw = await read(process.stdin);
  let fp = '';
  try { fp = JSON.parse(raw || '{}')?.tool_input?.file_path || ''; } catch {}

  if (!isApiSrc(fp)) out({});

  const cwd = process.env.CLAUDE_PROJECT_DIR || process.cwd();
  const r = spawnSync('npx', ['vitest', 'run', 'api/'], { encoding: 'utf8', cwd, timeout: 120000 });
  const verdict = classifyResult(r);

  if (verdict === 'block') {
    const log = (r.stdout || '') + (r.stderr || '');
    out({ decision: 'block', reason: `API tests failed after editing ${fp}:\n\n${log.slice(-2000)}` });
  }
  if (verdict === 'tooling') {
    // Surface to stderr but do NOT block — this is an environment problem, not a test failure.
    process.stderr.write(`[test-on-api-edit] could not run vitest (${r.error?.code || r.signal || 'unknown'}); skipping.\n`);
  }
  out({});
}

if (isMain(import.meta.url)) main();
