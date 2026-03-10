import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Tell Webpack to leave the transformers library alone!
  serverExternalPackages: ['@huggingface/transformers'],
};

export default nextConfig;