import { cookies } from 'next/headers';
import { z } from 'zod';
import { guard, issueCsrf, readBody, upstream, names, setTokens, clearTokens, reply, failure, PortalError } from '@/lib/server';

const loginSchema = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(6).max(256), totpCode: z.string().regex(/^\d{6}$/).optional(), recoveryCode: z.string().min(8).max(32).optional(), turnstileToken: z.string().max(4096).optional() }).strict();
export async function GET(_request: Request, context: { params: Promise<{ action: string }> }) {
  if ((await context.params).action !== 'csrf') return reply({ success: false }, 404);
  return reply({ csrf: await issueCsrf() });
}
export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  try {
    await guard(request);
    const { action } = await context.params;
    const jar = await cookies();
    if (action === 'logout') {
      const access = jar.get(names.access)?.value;
      const refresh = jar.get(names.refresh)?.value;
      try {
        if (access) await upstream('/api/auth/logout', { refreshToken: refresh }, access);
        else if (refresh) {
          const rotated = await upstream('/api/auth/refresh', { refreshToken: refresh });
          const tokens = await rotated.json();
          if (rotated.ok && typeof tokens.accessToken === 'string') await upstream('/api/auth/logout', { refreshToken: tokens.refreshToken }, tokens.accessToken);
        }
      } finally { await clearTokens(); }
      return reply({ success: true });
    }
    if (action !== 'login' && action !== 'refresh') throw new PortalError(404, 'Route unavailable.');
    const refresh = jar.get(names.refresh)?.value;
    if (action === 'refresh' && !refresh) throw new PortalError(401, 'Please sign in again.');
    const parsed = action === 'login' ? loginSchema.safeParse(await readBody(request, 8192)) : null;
    if (parsed && !parsed.success) throw new PortalError(422, 'Check your sign-in details.');
    const response = await upstream(`/api/auth/${action}`, action === 'refresh' ? { refreshToken: refresh } : parsed?.data);
    const data = await response.json();
    if (response.ok && data.success && typeof data.accessToken === 'string' && typeof data.refreshToken === 'string') {
      await setTokens(data.accessToken, data.refreshToken);
      return reply({ success: true });
    }
    if (action === 'refresh' && response.status === 401) await clearTokens();
    if (data.requiresTwoFactor === true) return reply({ success: false, requiresTwoFactor: true });
    if (response.status === 429) throw new PortalError(429, 'Too many attempts. Please try again later.');
    throw new PortalError(response.ok ? 401 : response.status, action === 'login' ? 'Sign-in failed. Check your credentials, account verification and security code.' : 'Your session expired. Please sign in again.');
  } catch (error) { return failure(error); }
}
