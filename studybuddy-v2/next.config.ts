import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Tell Webpack to leave the transformers library alone!
  experimental: {
    serverComponentsExternalPackages: ['@huggingface/transformers'],
  },
};

export default nextConfig;