import { describe, it, expect } from 'vitest';
import { pushTargetsMain } from './confirm-push-main.mjs';
import { shouldBlockSecret } from './block-secret-edits.mjs';
import { classifyResult } from './test-on-api-edit.mjs';
import { editKeepsPlaceholder } from './guard-sw-version.mjs';

describe('pushTargetsMain', () => {
  it('asks for an explicit push to main', () => {
    expect(pushTargetsMain('git push origin main', 'feature')).toBe(true);
  });
  it('catches git -C <path> push origin main', () => {
    expect(pushTargetsMain('git -C /repo push origin main', 'feature')).toBe(true);
  });
  it('catches a chained `cd x && git push origin main`', () => {
    expect(pushTargetsMain('cd x && git push origin main', 'feature')).toBe(true);
  });
  it('catches an env-prefixed push to main', () => {
    expect(pushTargetsMain('FOO=1 git push origin main', 'feature')).toBe(true);
  });
  it('asks for a bare `git push` while on main', () => {
    expect(pushTargetsMain('git push', 'main')).toBe(true);
  });
  it('asks for `git push origin` (no branch) while on main', () => {
    expect(pushTargetsMain('git push origin', 'main')).toBe(true);
  });
  it('does NOT ask for a push to a feature branch', () => {
    expect(pushTargetsMain('git push origin feature', 'feature')).toBe(false);
  });
  it('does NOT ask for a bare push while on a feature branch', () => {
    expect(pushTargetsMain('git push', 'feature')).toBe(false);
  });
  it('does NOT misfire on `git commit -m "push to main"`', () => {
    expect(pushTargetsMain('git commit -m "push to main"', 'main')).toBe(false);
  });
  it('does NOT misfire on a non-git command', () => {
    expect(pushTargetsMain('echo git push origin main', 'main')).toBe(false);
  });
});

describe('shouldBlockSecret', () => {
  it.each([
    '/p/.env',
    '/p/.env.local',
    '/p/.envrc',
    '/p/.env_prod',
    '/p/.ENV',
    '/p/.env.recovery',
    '/p/.vercel/project.json',
    '/p/secrets.recovery',
  ])('blocks %s', (fp) => {
    expect(shouldBlockSecret(fp)).toBe(true);
  });

  it.each([
    '/p/.env.example',
    '/p/src/App.jsx',
    '/p/foo.env',
    '/p/README.md',
  ])('allows %s', (fp) => {
    expect(shouldBlockSecret(fp)).toBe(false);
  });
});

describe('classifyResult', () => {
  it('passes when status is 0', () => {
    expect(classifyResult({ status: 0 })).toBe('ok');
  });
  it('blocks when status is a non-zero number', () => {
    expect(classifyResult({ status: 1 })).toBe('block');
  });
  it('treats a null status (spawn failure) as tooling, not a test failure', () => {
    expect(classifyResult({ status: null, error: new Error('ENOENT') })).toBe('tooling');
  });
  it('treats a timeout signal as tooling', () => {
    expect(classifyResult({ status: null, signal: 'SIGTERM' })).toBe('tooling');
  });
});

describe('editKeepsPlaceholder', () => {
  const PH = '__BUILD_ID__';
  it('false when a Write drops the placeholder', () => {
    expect(editKeepsPlaceholder('Write', { content: "const VERSION = 'v4';" }, '')).toBe(false);
  });
  it('true when a Write keeps the placeholder', () => {
    expect(editKeepsPlaceholder('Write', { content: `const VERSION = '${PH}';` }, '')).toBe(true);
  });
  it('false when an Edit strips the only placeholder', () => {
    const cur = `const VERSION = '${PH}';`;
    expect(editKeepsPlaceholder('Edit', { old_string: PH, new_string: 'v4' }, cur)).toBe(false);
  });
  it('true when an Edit leaves the placeholder intact', () => {
    const cur = `const VERSION = '${PH}';`;
    expect(editKeepsPlaceholder('Edit', { old_string: 'VERSION', new_string: 'VER' }, cur)).toBe(true);
  });
});
