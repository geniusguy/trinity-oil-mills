import type { NextConfig } from 'next';

// Suppress dotenv warnings during build
process.env.DOTENV_CONFIG_QUIET = 'true';

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
