import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            /* - script-src: 'blob:' is required for tldraw's math engine.
              - connect-src: includes Supabase and WSS for your Lantern Net.
              - img-src: includes blob/data for tldraw asset rendering.
            */
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https://*.tldraw.com; font-src 'self' data: https://*.tldraw.com; worker-src 'self' blob:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.tldraw.com;",
          },
        ],
      },
    ];
  },
};

export default nextConfig;