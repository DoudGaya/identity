import type { NextConfig } from 'next';
import path from 'node:path';

const config: NextConfig = {
  turbopack: { root: path.resolve(process.cwd()) },
  devIndicators: false,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(self "https://cdn.usesmileid.com"), microphone=(), geolocation=(self)' },
      { key: 'Cache-Control', value: 'no-store, max-age=0' },
      ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }] : []),
    ] }];
  },
};
export default config;
