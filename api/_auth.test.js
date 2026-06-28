import { describe, it, expect } from 'vitest';
import { isNunuEmail, validateDisplayName, remapPickFields } from './_auth.js';

// "Nunu's decree" exemption: in the original crew, only Nunu may leave/delete.
// Nunu is identified by EMAIL (robust to display-name renames). isNunuEmail is
// the pure decision function — given an email and the configured Nunu list, is
// this person exempt?
describe('isNunuEmail', () => {
  const NUNU = 'grantxyzou@gmail.com';

  it('exempts the configured Nunu email', () => {
    expect(isNunuEmail('grantxyzou@gmail.com', NUNU)).toBe(true);
  });

  it('denies anyone else (Desmond / Lawrence)', () => {
    expect(isNunuEmail('desmond@gmail.com', NUNU)).toBe(false);
    expect(isNunuEmail('lawrence@gmail.com', NUNU)).toBe(false);
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(isNunuEmail('  GRANTXYZOU@GMAIL.COM  ', NUNU)).toBe(true);
  });

  it('supports multiple comma-separated Nunu emails', () => {
    const list = 'grantxyzou@gmail.com, xyzou2012@gmail.com';
    expect(isNunuEmail('xyzou2012@gmail.com', list)).toBe(true);
    expect(isNunuEmail('grantxyzou@gmail.com', list)).toBe(true);
    expect(isNunuEmail('desmond@gmail.com', list)).toBe(false);
  });

  it('exempts nobody when the Nunu list is empty/blank', () => {
    expect(isNunuEmail('grantxyzou@gmail.com', '')).toBe(false);
    expect(isNunuEmail('grantxyzou@gmail.com', '   ')).toBe(false);
  });

  it('treats a missing email as not-Nunu', () => {
    expect(isNunuEmail('', NUNU)).toBe(false);
    expect(isNunuEmail(undefined, NUNU)).toBe(false);
  });
});

// validateDisplayName — used when a user renames themselves in a crew. Trims,
// requires non-empty, caps at 20, and forbids "|" (the picks field separator,
// which would corrupt `<setId>|<person>` parsing).
describe('validateDisplayName', () => {
  it('accepts a normal name and returns the trimmed value', () => {
    expect(validateDisplayName('  Grant  ')).toEqual({ ok: true, value: 'Grant' });
  });

  it('rejects empty / whitespace-only', () => {
    expect(validateDisplayName('').ok).toBe(false);
    expect(validateDisplayName('   ').ok).toBe(false);
    expect(validateDisplayName(undefined).ok).toBe(false);
  });

  it('rejects names longer than 20 chars (after trim)', () => {
    expect(validateDisplayName('a'.repeat(21)).ok).toBe(false);
    expect(validateDisplayName('a'.repeat(20)).ok).toBe(true);
  });

  it('rejects a name containing the "|" separator', () => {
    expect(validateDisplayName('Gr|ant').ok).toBe(false);
  });
});

// remapPickFields — given the picks hash field keys, produce [oldField, newField]
// pairs for fields belonging to oldName, re-keyed to newName. Person is the part
// after the LAST "|" (mirrors picks.js toPicks), so setIds may contain "|".
describe('remapPickFields', () => {
  it('remaps only fields belonging to oldName', () => {
    const fields = ['mainstage-fri|Grant', 'cage-sat|Grant', 'mainstage-fri|Desmond'];
    expect(remapPickFields(fields, 'Grant', 'Nunu')).toEqual([
      ['mainstage-fri|Grant', 'mainstage-fri|Nunu'],
      ['cage-sat|Grant', 'cage-sat|Nunu'],
    ]);
  });

  it('returns [] when no field matches oldName', () => {
    expect(remapPickFields(['x|Desmond'], 'Grant', 'Nunu')).toEqual([]);
  });

  it('splits on the LAST separator so setIds containing "|" survive', () => {
    expect(remapPickFields(['weird|set|id|Grant'], 'Grant', 'Nunu')).toEqual([
      ['weird|set|id|Grant', 'weird|set|id|Nunu'],
    ]);
  });

  it('ignores a partial-suffix false match (does not endsWith-trap)', () => {
    // "NotGrant" must not match oldName "Grant"
    expect(remapPickFields(['x|NotGrant'], 'Grant', 'Nunu')).toEqual([]);
  });
});
