import { beforeEach, describe, expect, it, vi } from 'vitest';
const { jar, set } = vi.hoisted(() => ({ jar: new Map<string, string>(), set: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: (key: string) => jar.has(key) ? { value: jar.get(key) } : undefined, set }) }));
import { POST as authPost } from '@/app/api/auth/[action]/route';
import { POST as gatewayPost, GET as gatewayGet } from '@/app/api/identity/[...path]/route';

const origin = 'http://127.0.0.1:3002'; const csrf = 'a'.repeat(64);
function request(path: string, body: unknown = {}, source = origin) { return new Request(`${origin}${path}`, { method: 'POST', headers: { origin: source, 'content-type': 'application/json', 'x-csrf-token': csrf }, body: JSON.stringify(body) }); }
beforeEach(() => {
  vi.restoreAllMocks(); vi.stubEnv('NODE_ENV', 'test'); vi.stubEnv('IDENTITY_PORTAL_MODE', 'staging'); vi.stubEnv('IDENTITY_WEB_ORIGIN', origin); vi.stubEnv('IDENTITY_BACKEND_URL', 'http://127.0.0.1:3000');
  jar.clear(); jar.set('nillar_identity_csrf', csrf); set.mockReset();
});
describe('server boundary', () => {
  it('keeps login credentials out of browser JSON and sets HttpOnly tokens', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, accessToken: 'access-secret', refreshToken: 'refresh-secret', token: 'access-secret', user: { bvn: '12345678901' } })));
    const result = await authPost(request('/api/auth/login', { identifier: 'synthetic@example.test', password: 'synthetic-pass' }), { params: Promise.resolve({ action: 'login' }) });
    expect(await result.json()).toEqual({ success: true });
    expect(set).toHaveBeenCalledWith('nillar_identity_access', 'access-secret', expect.objectContaining({ httpOnly: true, sameSite: 'strict', maxAge: 900 }));
  });
  it('does not create a session before MFA succeeds', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: false, requiresTwoFactor: true })));
    const result = await authPost(request('/api/auth/login', { identifier: 'synthetic@example.test', password: 'synthetic-pass' }), { params: Promise.resolve({ action: 'login' }) });
    expect((await result.json()).requiresTwoFactor).toBe(true); expect(set).not.toHaveBeenCalled();
  });
  it('rejects foreign-origin mutations without calling the backend', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const result = await authPost(request('/api/auth/login', {}, 'https://evil.test'), { params: Promise.resolve({ action: 'login' }) });
    expect(result.status).toBe(403); expect(fetch).not.toHaveBeenCalled();
  });
  it('blocks all backend actions in demo mode', async () => {
    vi.stubEnv('IDENTITY_PORTAL_MODE', 'preview'); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const result = await gatewayPost(request('/api/identity/sessions'), { params: Promise.resolve({ path: ['sessions'] }) });
    expect(result.status).toBe(503); expect(fetch).not.toHaveBeenCalled();
  });
  it('blocks financial paths even when authenticated', async () => {
    jar.set('nillar_identity_access', 'access-secret'); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const result = await gatewayPost(request('/api/identity/banking/transfers'), { params: Promise.resolve({ path: ['banking', 'transfers'] }) });
    expect(result.status).toBe(404); expect(fetch).not.toHaveBeenCalled();
  });
  it('requires authentication for session reads', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const result = await gatewayGet(new Request(`${origin}/api/identity/sessions/session-1234`), { params: Promise.resolve({ path: ['sessions', 'session-1234'] }) });
    expect(result.status).toBe(401); expect(fetch).not.toHaveBeenCalled();
  });
  it('rotates refresh cookies without exposing tokens', async () => {
    jar.set('nillar_identity_refresh', 'old-refresh');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ success: true, accessToken: 'new-access', refreshToken: 'new-refresh' })));
    const result = await authPost(request('/api/auth/refresh'), { params: Promise.resolve({ action: 'refresh' }) });
    expect(await result.json()).toEqual({ success: true }); expect(set).toHaveBeenCalledWith('nillar_identity_refresh', 'new-refresh', expect.objectContaining({ httpOnly: true }));
  });
  it('rejects oversized login bodies before forwarding', async () => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const result = await authPost(request('/api/auth/login', { identifier: 'a'.repeat(9000) }), { params: Promise.resolve({ action: 'login' }) });
    expect(result.status).toBe(413); expect(fetch).not.toHaveBeenCalled();
  });
});
