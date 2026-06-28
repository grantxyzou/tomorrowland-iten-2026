#!/usr/bin/env node
// PreToolUse(Bash) — ask before a push that targets main (a prod deploy).
//
// pushTargetsMain() parses the command robustly: it finds the real `push`
// SUBCOMMAND (so `git -C x push`, `cd x && git push`, `FOO=1 git push` all count,
// while `git commit -m "push"` does not), then decides the target — an explicit
// `main` refspec, or the current branch when no branch is named. The wrapper
// resolves the current branch via git only when the command is a push.

import { spawnSync } from 'node:child_process';
import { read, out, isMain } from './_io.mjs';

const PH_BRANCH_RE = /(^|:)main$/;

// Does one shell segment run `git push` to main? currentBranch covers the
// no-explicit-branch case (bare `git push` / `git push <remote>`).
function segmentPushesToMain(segment, currentBranch) {
  const toks = segment.trim().split(/\s+/).filter(Boolean);
  let i = 0;
  while (i < toks.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(toks[i])) i++; // env prefix
  if (toks[i] !== 'git') return false;
  i++;
  while (i < toks.length && toks[i].startsWith('-')) { // git global flags
    if (toks[i] === '-C' || toks[i] === '-c') i += 2; else i++;
  }
  if (toks[i] !== 'push') return false;
  i++;
  const positional = [];
  for (; i < toks.length; i++) {
    if (!toks[i].startsWith('-')) positional.push(toks[i]);
  }
  // positional[0] is the remote; positional[1..] are refspecs.
  if (positional.length <= 1) return currentBranch === 'main'; // no branch named
  return positional.slice(1).some((r) => r === 'main' || PH_BRANCH_RE.test(r));
}

export function pushTargetsMain(command, currentBranch) {
  if (!command) return false;
  return command
    .split(/&&|\|\||[;|\n]/)
    .some((seg) => segmentPushesToMain(seg, currentBranch));
}

function currentBranchName() {
  const r = spawnSync('git', ['symbolic-ref', '--short', 'HEAD'], { encoding: 'utf8' });
  return (r.stdout || '').trim();
}

async function main() {
  const raw = await read(process.stdin);
  let cmd = '';
  try { cmd = JSON.parse(raw || '{}')?.tool_input?.command || ''; } catch {}

  // Resolve the branch only when a push is even plausibly involved.
  const branch = /\bpush\b/.test(cmd) ? currentBranchName() : '';

  if (pushTargetsMain(cmd, branch)) {
    out({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason:
          'This push targets main, which triggers a Vercel PRODUCTION deploy. ' +
          'Confirm the change is meant to go live now.',
      },
    });
  }
  out({});
}

if (isMain(import.meta.url)) main();
