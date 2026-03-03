import { NextRequest, NextResponse } from 'next/server';
import validator from 'validator';
import crypto from 'crypto';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Security headers middleware
export function setSecurityHeaders(response: NextResponse): NextResponse {
  // Set security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none';"
  );
  
  // Strict Transport Security (HTTPS only)
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  return response;
}

// Get client IP address
export function getClientIP(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const remoteAddr = req.headers.get('x-remote-addr');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  if (remoteAddr) {
    return remoteAddr;
  }
  
  return 'unknown';
}

// Security logging
export function logSecurityEvent(
  event: string,
  details: any,
  req: NextRequest,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    ip: getClientIP(req),
    userAgent: req.headers.get('user-agent'),
    url: req.url,
    method: req.method,
    details,
  };
  
  // In production, send to security monitoring system
  console.log(`[SECURITY ${severity.toUpperCase()}]`, logEntry);
  
  // For critical events, you might want to send alerts
  if (severity === 'critical') {
    // Send alert to security team
    console.error('CRITICAL SECURITY EVENT:', logEntry);
  }
}

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

