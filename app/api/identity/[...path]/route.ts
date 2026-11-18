import { cookies } from 'next/headers';
import { allowedRoute, uploadAllowed } from '@/lib/policy';
import { backendOrigin } from '@/lib/config';
import { guard, names, readBody, reply, failure, PortalError } from '@/lib/server';
import { envelopeSchema } from '@/lib/contracts';
import { randomUUID } from 'node:crypto';

async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    await guard(request);
    const path = (await context.params).path.join('/');
    if (!allowedRoute(request.method, path)) throw new PortalError(404, 'Route unavailable.');
    const jar = await cookies();
    const captureId = jar.get(names.captureId)?.value;
    const scoped = captureId && (path === `sessions/${captureId}` || path.startsWith(`sessions/${captureId}/`));
    const token = scoped ? jar.get(names.capture)?.value : jar.get(names.access)?.value;
    if (!token) throw new PortalError(401, 'Please sign in again.');
    const headers: Record<string, string> = { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'x-correlation-id': randomUUID() };
    const key = request.headers.get('idempotency-key');
    if (key) {
      if (!/^[A-Za-z0-9._:-]{8,128}$/.test(key)) throw new PortalError(400, 'Invalid request reference.');
      headers['idempotency-key'] = key;
    }
    const response = await fetch(`${backendOrigin()}/api/v1/identity/${path}`, { method: request.method, headers, body: request.method === 'GET' ? undefined : JSON.stringify(await readBody(request, path.endsWith('/biometrics') ? 1_500_000 : 32768)), redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(path.endsWith('/biometrics') ? 45000 : 30000) });
    const result = envelopeSchema.safeParse(await response.json());
    if (!result.success) throw new PortalError(502, 'Unexpected verification response.');
    if (result.data.success && result.data.data.upload && !uploadAllowed(result.data.data.upload.uploadUrl, process.env.IDENTITY_UPLOAD_ORIGIN ?? '')) throw new PortalError(503, 'Secure document storage is not configured for this portal.');
    return reply(result.data, response.status);
  } catch (error) { return failure(error); }
}
export { handle as GET, handle as POST };
