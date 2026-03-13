import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['tldraw'],
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; " +
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob:; " +
              "style-src 'self' 'unsafe-inline'; " +
              "img-src 'self' blob: data: https://*.tldraw.com https://grainy-gradients.vercel.app; " +
              "font-src 'self' data: https://*.tldraw.com; " +
              "worker-src 'self' blob:; " +
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.tldraw.com; " +
              "object-src 'none';"
          },
        ],
      },
    ];
  },
};

export default nextConfig;