import { NextRequest } from 'next/server';

// Security event and severity types (for audit logs)
export type SecurityEventType =
  | 'login_success'
  | 'login_failure'
  | 'logout'
  | 'password_reset'
  | 'password_change'
  | 'suspicious_activity'
  | 'rate_limit_exceeded'
  | 'unauthorized_access';

export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

// Security configuration
export const securityConfig = {
  // Rate limiting
  rateLimits: {
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000,
    },
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 5,
    },
    passwordReset: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 3,
    },
    registration: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5,
    },
  },
  
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxLength: 128,
  },
  
  // Session configuration
  session: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: true, // HTTPS only
    httpOnly: true, // No JavaScript access
    sameSite: 'strict' as const,
  },
  
  // JWT configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-key',
    expiresIn: '24h',
    algorithm: 'HS256' as const,
  },
  
  // CORS configuration
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://trinityoilmills.com', 'https://www.trinityoilmills.com']
      : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  },
  
  // Security headers
  headers: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'"
    ].join('; '),
  },
  
  // Input validation
  validation: {
    maxStringLength: 1000,
    maxArrayLength: 100,
    maxObjectDepth: 10,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxFileSize: 5 * 1024 * 1024, // 5MB
  },
  
  // Encryption
  encryption: {
    algorithm: 'aes-256-gcm',
    keyLength: 32,
    ivLength: 16,
  },
  
  // Security monitoring
  monitoring: {
    logFailedLogins: true,
    logSuspiciousActivity: true,
    alertThresholds: {
      failedLogins: 10,
      suspiciousRequests: 50,
      rateLimitHits: 100,
    },
  },
};

// Security utilities
export class SecurityUtils {
  // Check if IP is suspicious
  static isSuspiciousIP(ip: string): boolean {
    // In production, integrate with threat intelligence feeds
    const suspiciousIPs: string[] = [];
    return suspiciousIPs.includes(ip);
  }
  
  // Check if request is suspicious
  static isSuspiciousRequest(req: NextRequest): boolean {
    const userAgent = req.headers.get('user-agent') || '';
    const url = req.url;
    
    // Check for common attack patterns
    const suspiciousPatterns = [
      /script\s*:/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /<script/i,
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
    ];
    
    return suspiciousPatterns.some(pattern => 
      pattern.test(userAgent) || pattern.test(url)
    );
  }
}

