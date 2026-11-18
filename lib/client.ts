'use client';
import { envelopeSchema, type IdentityData } from './contracts';
let csrfPromise: Promise<string> | null = null;
let refreshPromise: Promise<void> | null = null;
export class ClientError extends Error { constructor(message: string, public status: number, public reference?: string) { super(message); } }
export async function csrf() {
  if (!csrfPromise) csrfPromise = fetch('/api/auth/csrf', { cache: 'no-store', credentials: 'same-origin' }).then(async response => {
    const data = await response.json();
    if (!response.ok || typeof data.csrf !== 'string') throw new Error('Security check unavailable. Reload and try again.');
    return data.csrf as string;
  }).catch(error => { csrfPromise = null; throw error; });
  return csrfPromise;
}
export async function authRequest(action: 'login' | 'refresh' | 'logout', body: unknown = {}) {
  const response = await fetch(`/api/auth/${action}`, { method: 'POST', credentials: 'same-origin', cache: 'no-store', headers: { 'content-type': 'application/json', 'x-csrf-token': await csrf() }, body: JSON.stringify(body) });
  const data = await response.json();
  if (response.status === 403) csrfPromise = null;
  if (!response.ok) throw new ClientError(data.error?.message ?? 'Please try again.', response.status);
  return data as { success: boolean; requiresTwoFactor?: boolean };
}
export async function refresh() {
  if (!refreshPromise) refreshPromise = authRequest('refresh').then(() => undefined).finally(() => { refreshPromise = null; });
  return refreshPromise;
}
export async function identityRequest(path: string, body?: unknown, key?: string, retried = false): Promise<IdentityData> {
  const headers: Record<string, string> = {};
  if (body !== undefined) { headers['content-type'] = 'application/json'; headers['x-csrf-token'] = await csrf(); }
  if (key) headers['Idempotency-Key'] = key;
  const response = await fetch(`/api/identity/${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', headers, body: body === undefined ? undefined : JSON.stringify(body) });
  if (response.status === 401 && !retried) { await refresh(); return identityRequest(path, body, key, true); }
  const raw = await response.json();
  if (response.status === 403) csrfPromise = null;
  if (!response.ok) throw new ClientError(raw.error?.message ?? 'We couldn’t save this step. Please try again.', response.status, raw.correlationId);
  const parsed = envelopeSchema.safeParse(raw);
  if (!parsed.success || !parsed.data.success) throw new ClientError('Unexpected verification response. Please try again.', 502);
  return parsed.data.data;
}
