import type { NextConfig } from 'next';

// Suppress dotenv warnings during build
process.env.DOTENV_CONFIG_QUIET = 'true';

const config: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Security: Remove powered-by header
  poweredByHeader: false,
  
  // Allow cross-origin requests from api.trinityoil.in in development
  allowedDevOrigins: ['https://api.trinityoil.in', 'http://api.trinityoil.in'],
  
  // Redirect old Add Stock URL to new route (avoids 404 with hyphen segment)
  async redirects() {
    return [
      { source: '/dashboard/admin/stock-purchases', destination: '/dashboard/admin/purchases', permanent: false },
    ];
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=(), payment=()',
          },
          {
            key: 'X-Powered-By',
            value: '', // Remove X-Powered-By header
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-src 'none'",
              "object-src 'none'",
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },
  
  // Temporarily disable PWA to fix webpack chunking issues
  // experimental: {
  //   esmExternals: false,
  // },
};

export default config;
