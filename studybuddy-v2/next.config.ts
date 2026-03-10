import type { NextConfig } from 'next';

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true, // Bypass type checking on Vercel
  },
  eslint: {
    ignoreDuringBuilds: true, // Bypass linting on Vercel
  },
  experimental: {
    webpackMemoryOptimizations: true,
    // Helps isolate the build process to prevent leaks
    webpackBuildWorker: true,
  }
};

export default nextConfig;