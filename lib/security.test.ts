import { describe, expect, it } from 'vitest';
import { allowedRoute, validMutation, uploadAllowed } from './policy';
import { displayStatus, envelopeSchema, validateDocument, type Session } from './contracts';

describe('browser gateway security boundary', () => {
  it('permits only explicit identity methods and paths', () => {
    expect(allowedRoute('POST', 'sessions')).toBe(true);
    expect(allowedRoute('GET', 'sessions/session-1234')).toBe(true);
    expect(allowedRoute('POST', 'sessions/session-1234/attributes')).toBe(true);
    for (const path of ['banking/transfers', '../sessions', 'sessions/session-1234/../../wallet', 'sessions/session-1234/attributes/extra', 'sessions/session-1234/consent?x=1', 'internal/identity/evidence/scans', 'sessions/https://evil.test', 'wallet/withdraw']) expect(allowedRoute('POST', path)).toBe(false);
    expect(allowedRoute('DELETE', 'sessions/session-1234')).toBe(false);
    expect(allowedRoute('GET', 'sessions/session-1234/attributes')).toBe(false);
  });
  it('requires exact scheme and origin plus a matching CSRF token', () => {
    const token = 'a'.repeat(64); const origin = 'https://identity.nillar.com';
    const request = (from: string, csrf = token, site = 'same-origin') => new Request(`${origin}/api/auth/login`, { method: 'POST', headers: { origin: from, 'x-csrf-token': csrf, 'sec-fetch-site': site } });
    expect(validMutation(request(origin), origin, token)).toBe(true);
    expect(validMutation(request('http://identity.nillar.com'), origin, token)).toBe(false);
    expect(validMutation(request('https://evil.test'), origin, token)).toBe(false);
    expect(validMutation(request(origin, 'b'.repeat(64)), origin, token)).toBe(false);
    expect(validMutation(request(origin, token, 'cross-site'), origin, token)).toBe(false);
    expect(validMutation(request(origin), origin)).toBe(false);
  });
  it('rejects lookalike, credential-bearing, insecure and unconfigured upload destinations', () => {
    const origin = 'https://private-test.s3.eu-west-1.amazonaws.com';
    expect(uploadAllowed(`${origin}/identity/quarantine/test?signature=fake`, origin)).toBe(true);
    for (const url of ['http://private-test.s3.eu-west-1.amazonaws.com/file', `${origin}.evil.test/file`, 'https://user:password@private-test.s3.eu-west-1.amazonaws.com/file', `${origin}/file#fragment`]) expect(uploadAllowed(url, origin)).toBe(false);
    expect(uploadAllowed(`${origin}/file`, '')).toBe(false);
  });
});
describe('document validation and honest status reporting', () => {
  const now = new Date('2026-10-09T12:00:00Z'); const file = { type: 'application/pdf', size: 2000 };
  it('rejects stale, invalid and future dates and unsupported files', () => {
    expect(validateDocument(file, '2026-10-01', now)).toBeNull();
    expect(validateDocument(file, '2026-07-11', now)).toBeNull();
    expect(validateDocument(file, '2026-07-10', now)).not.toBeNull();
    expect(validateDocument(file, '2026-02-31', now)).not.toBeNull();
    expect(validateDocument(file, '2026-10-10', now)).not.toBeNull();
    expect(validateDocument({ ...file, size: 11 * 1024 * 1024 }, '2026-10-01', now)).not.toBeNull();
    expect(validateDocument({ type: 'text/html', size: 20 }, '2026-10-01', now)).not.toBeNull();
    expect(validateDocument({ ...file, size: 0 }, '2026-10-01', now)).not.toBeNull();
  });
  it('describes only the required verification checks as complete', () => {
    const session = { status: 'VERIFIED' } as Session;
    expect(displayStatus(session, null).detail).toContain('required verification checks');
    expect(displayStatus(session, null).detail).not.toMatch(/residence|address/);
    expect(displayStatus({ ...session, status: 'REJECTED' }, null).tone).toBe('error');
  });
  it('strips unexpected sensitive fields from backend responses', () => {
    const result = envelopeSchema.parse({ success: true, data: { status: 'CAPTURED', bvn: '12345678901', accessToken: 'secret', rawAddress: 'private' }, correlationId: 'test', refreshToken: 'secret' });
    expect(JSON.stringify(result)).not.toMatch(/secret|12345678901|private/);
  });
});
