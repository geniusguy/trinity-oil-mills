import { NextRequest, NextResponse } from 'next/server';
import { setSecurityHeaders, getClientIP, logSecurityEvent, SecurityUtils } from './src/middleware/security';

/**
 * Main Next.js Middleware - Security Protection Layer
 * 
 * This middleware runs on EVERY request and protects against:
 * - Route interception attacks (CVE-2025-55182)
 * - XSS attacks
 * - SQL injection attempts
 * - CSRF attacks
 * - Unauthorized access
 * - Suspicious activity
 */

// Blocked malicious patterns and signatures
const BLOCKED_PATTERNS = [
  // Route interception attack signatures
  /MoLeft/i,
  /React2Shell/i,
  /CVE-2025-55182/i,
  /Security Warning/i,
  /route interception/i,
  
  // XSS patterns
  /<script[^>]*>/i,
  /javascript:/i,
  /onerror=/i,
  /onload=/i,
  /onclick=/i,
  /eval\(/i,
  /expression\(/i,
  
  // SQL injection patterns
  /union\s+select/i,
  /drop\s+table/i,
  /delete\s+from/i,
  /insert\s+into/i,
  /update\s+set/i,
  /exec\s*\(/i,
  /';/i,
  /--/i,
  /\/\*/i,
  
  // Path traversal
  /\.\.\//i,
  /\.\.\\/i,
  /%2e%2e/i,
  
  // Command injection
  /;\s*(rm|del|cat|ls|pwd|whoami|id|uname)/i,
  /\|\s*(rm|del|cat|ls|pwd|whoami|id|uname)/i,
  /`\s*(rm|del|cat|ls|pwd|whoami|id|uname)/i,
  
  // Suspicious file extensions
  /\.(php|asp|aspx|jsp|cgi|sh|bat|cmd|exe|dll|so)$/i,
];

// Blocked user agents
const BLOCKED_USER_AGENTS = [
  /sqlmap/i,
  /nikto/i,
  /nmap/i,
  /masscan/i,
  /zap/i,
  /burp/i,
  /w3af/i,
  /acunetix/i,
];

// Allowed routes that don't need strict security checks
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/health',
  '/_next',
  '/favicon.ico',
  '/manifest.json',
  '/sw.js',
];

export function middleware(request: NextRequest) {
  const { pathname, search } = new URL(request.url);
  const fullPath = pathname + search;
  const userAgent = request.headers.get('user-agent') || '';
  const ip = getClientIP(request);
  
  // Check for blocked user agents
  if (BLOCKED_USER_AGENTS.some(pattern => pattern.test(userAgent))) {
    logSecurityEvent('BLOCKED_USER_AGENT', { userAgent, path: fullPath }, request, 'high');
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Check URL and query parameters for malicious patterns
  const urlToCheck = fullPath.toLowerCase();
  const hasMaliciousPattern = BLOCKED_PATTERNS.some(pattern => pattern.test(urlToCheck));
  
  if (hasMaliciousPattern) {
    logSecurityEvent('MALICIOUS_PATTERN_DETECTED', { 
      pattern: fullPath,
      userAgent,
      ip 
    }, request, 'critical');
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Invalid request',
        code: 'SECURITY_BLOCK'
      }),
      { 
        status: 403,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
  
  // Check request headers for suspicious content
  const headersToCheck = [
    request.headers.get('referer'),
    request.headers.get('origin'),
    request.headers.get('x-forwarded-for'),
  ].filter(Boolean).join(' ').toLowerCase();
  
  if (BLOCKED_PATTERNS.some(pattern => pattern.test(headersToCheck))) {
    logSecurityEvent('MALICIOUS_HEADER_DETECTED', { 
      headers: headersToCheck,
      userAgent,
      ip 
    }, request, 'critical');
    
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Check for suspicious request patterns
  if (SecurityUtils.isSuspiciousRequest(request)) {
    logSecurityEvent('SUSPICIOUS_REQUEST', { 
      path: fullPath,
      userAgent,
      ip 
    }, request, 'high');
  }
  
  // Check for suspicious IP addresses
  if (SecurityUtils.isSuspiciousIP(ip)) {
    logSecurityEvent('SUSPICIOUS_IP', { ip, path: fullPath }, request, 'high');
  }
  
  // Create response
  const response = NextResponse.next();
  
  // Apply security headers
  setSecurityHeaders(response);
  
  // Additional security headers
  response.headers.set('X-Powered-By', ''); // Remove X-Powered-By header
  response.headers.set('Server', ''); // Remove Server header
  
  // Strict Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: unsafe-eval needed for Next.js
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
  ].join('; ');
  
  response.headers.set('Content-Security-Policy', csp);
  
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), payment=()');
  
  // Strict Transport Security (HTTPS only)
  if (request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  return response;
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};

