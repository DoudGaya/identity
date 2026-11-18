import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'node:crypto';
import { portalMode, webOrigin, backendOrigin } from './config';
import { validMutation } from './policy';

export const names = { access: 'nillar_identity_access', refresh: 'nillar_identity_refresh', csrf: 'nillar_identity_csrf', registration:'nillar_identity_registration_user', capture:'nillar_identity_capture', captureId:'nillar_identity_capture_id', invitation:'nillar_identity_pending_invitation' };
const options = () => ({ httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' as const, path: '/' });
export async function setTokens(accessToken: string, refreshToken: string) {
  const jar = await cookies();
  jar.set(names.access, accessToken, { ...options(), maxAge: 900 });
  jar.set(names.refresh, refreshToken, { ...options(), maxAge: 2592000 });
}
export async function clearTokens() {
  const jar = await cookies();
  for (const name of Object.values(names)) jar.set(name, '', { ...options(), maxAge: 0 });
}
export async function issueCsrf() {
  const jar = await cookies();
  const previous = jar.get(names.csrf)?.value;
  const csrf = previous && /^[a-f0-9]{64}$/.test(previous) ? previous : randomBytes(32).toString('hex');
  jar.set(names.csrf, csrf, { ...options(), maxAge: 3600 });
  return csrf;
}
export function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
export class PortalError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function guard(request: Request) {
  if (!['staging', 'live'].includes(portalMode())) throw new PortalError(503, 'Verification is not enabled.');
  if (request.method !== 'GET' && !validMutation(request, webOrigin(), (await cookies()).get(names.csrf)?.value)) throw new PortalError(403, 'Your security check expired. Reload the page and try again.');
}
export async function readBody(request: Request, limit = 32768) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new PortalError(415, 'JSON is required.');
  if (Number(request.headers.get('content-length') ?? 0) > limit) throw new PortalError(413, 'Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) throw new PortalError(400, 'Request body is required.');
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      total += value.length; if (total > limit) { await reader.cancel(); throw new PortalError(413, 'Request is too large.'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch (error) { if (error instanceof PortalError) throw error; throw new PortalError(400, 'Invalid request body.'); }
}
export async function upstream(path: string, body?: unknown, token?: string) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-correlation-id': randomUUID(), 'x-app-source': 'nillar-identity-web' };
  if (token) headers.authorization = `Bearer ${token}`;
  return fetch(`${backendOrigin()}${path}`, { method: body === undefined ? 'GET' : 'POST', headers, body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(25000) });
}
export function failure(error: unknown) {
  return reply({ success: false, error: { message: error instanceof PortalError ? error.message : 'The verification service is unavailable. Please try again.' } }, error instanceof PortalError ? error.status : 502);
}
