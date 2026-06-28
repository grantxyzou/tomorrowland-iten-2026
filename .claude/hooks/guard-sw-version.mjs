#!/usr/bin/env node
// PreToolUse(Edit|Write on public/sw.js) — PREVENT removal of the per-deploy
// version stamp. It must be PreToolUse: the fix relies on `const VERSION =
// '__BUILD_ID__'` surviving so scripts/stamp-sw.mjs can replace it per deploy.
// A PostToolUse hook could only nag after the placeholder was already gone;
// here we predict the resulting file and deny the write if it drops __BUILD_ID__.

import { readFileSync } from 'node:fs';
import { read, out, isMain } from './_io.mjs';

const PLACEHOLDER = '__BUILD_ID__';

// Would the proposed Write/Edit leave the placeholder intact? (true => allow)
export function editKeepsPlaceholder(toolName, toolInput = {}, currentContents = '') {
  if (toolName === 'Write') {
    return String(toolInput.content ?? '').includes(PLACEHOLDER);
  }
  if (toolName === 'Edit') {
    const oldS = String(toolInput.old_string ?? '');
    const newS = String(toolInput.new_string ?? '');
    const predicted = toolInput.replace_all
      ? currentContents.split(oldS).join(newS)
      : currentContents.replace(oldS, newS); // first occurrence, matching Edit semantics
    return predicted.includes(PLACEHOLDER);
  }
  return true; // other tools aren't our concern
}

async function main() {
  const raw = await read(process.stdin);
  let toolName = '', toolInput = {};
  try {
    const j = JSON.parse(raw || '{}');
    toolName = j?.tool_name || '';
    toolInput = j?.tool_input || {};
  } catch {}

  const fp = toolInput.file_path || '';
  if (!/(^|\/)public\/sw\.js$/.test(fp)) out({});

  // Read the current file to predict an Edit's result. If it can't be read,
  // only a Write is assessable; allow an Edit we can't evaluate.
  let cur = null;
  try { cur = readFileSync(fp, 'utf8'); } catch {}
  if (toolName === 'Edit' && cur === null) out({});

  if (!editKeepsPlaceholder(toolName, toolInput, cur ?? '')) {
    out({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          'This edit would remove the `__BUILD_ID__` placeholder from public/sw.js. ' +
          'scripts/stamp-sw.mjs replaces it per deploy so the SW bytes change and the ' +
          'PWA detects updates. Keep `const VERSION = \'__BUILD_ID__\';` — a hardcoded ' +
          'version reintroduces the stale-build bug.',
      },
    });
  }
  out({});
}

if (isMain(import.meta.url)) main();
