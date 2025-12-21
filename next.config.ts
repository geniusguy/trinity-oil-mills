import type { NextConfig } from 'next';

const config: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Temporarily disable PWA to fix webpack chunking issues
  // experimental: {
  //   esmExternals: false,
  // },
};

export default config;
