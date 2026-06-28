// Shared IO glue for the Claude Code hook scripts.
//
// Each hook reads a JSON tool-call from stdin and writes a JSON decision to
// stdout. These three helpers were copy-pasted across every hook; centralising
// them keeps the stdin/stdout/exit contract in one place. `isMain` lets a hook
// export its pure decision functions for unit testing while only running the
// stdin→stdout flow when executed directly (not when imported by a test).

import { pathToFileURL } from 'node:url';

export function read(stream) {
  return new Promise((res) => {
    let d = '';
    stream.on('data', (c) => (d += c));
    stream.on('end', () => res(d));
    stream.on('error', () => res(''));
  });
}

export function out(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

// True when this module's file is the entry point (node X.mjs), false when it
// was imported. Guards the main() call so importing for tests has no side effect.
export function isMain(metaUrl) {
  return !!process.argv[1] && metaUrl === pathToFileURL(process.argv[1]).href;
}
