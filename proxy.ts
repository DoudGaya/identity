import { NextRequest, NextResponse } from 'next/server';
import { dashboardRoute } from './lib/console/routes';

export function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== 'production';
  let uploadOrigin = '';
  try {
    const url = new URL(process.env.IDENTITY_UPLOAD_ORIGIN ?? '');
    if (url.protocol === 'https:') uploadOrigin = url.origin;
  } catch { /* No upload origin configured. */ }
  const csp = [
    "default-src 'self'", `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${dev ? "'unsafe-eval'" : ''} https://challenges.cloudflare.com`,
    `style-src 'self' 'unsafe-inline'`, "img-src 'self' data: blob:", "font-src 'self'",
    `connect-src 'self' ${uploadOrigin} https://challenges.cloudflare.com ${dev ? 'ws://127.0.0.1:3002 ws://localhost:3002' : ''}`,
    'frame-src https://challenges.cloudflare.com https://cdn.usesmileid.com', "object-src 'none'", "base-uri 'self'", "form-action 'self'", "frame-ancestors 'none'",
  ].join('; ');
  const headers = new Headers(request.headers);
  headers.set('x-nonce', nonce);
  headers.set('Content-Security-Policy', csp);
  const path = request.nextUrl.pathname;
  const unknownDashboard = path.startsWith('/dashboard/') && !dashboardRoute(path.slice('/dashboard/'.length).split('/').filter(Boolean));
  const response = unknownDashboard
    ? NextResponse.rewrite(new URL('/__identity_page_unavailable', request.url), { status: 404, request: { headers } })
    : NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'] };
