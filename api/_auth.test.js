import { describe, it, expect } from 'vitest';
import { isNunuEmail } from './_auth.js';

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
