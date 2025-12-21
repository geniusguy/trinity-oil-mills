/**
 * Production-ready logging utility for Trinity Oil Mills
 * Replaces console.log statements with structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  userId?: string;
  action?: string;
  ip?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    return levels[level] >= levels[this.logLevel];
  }

  private formatLog(level: LogLevel, message: string, data?: any, context?: Partial<LogEntry>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      ...context
    };
  }

  private write(logEntry: LogEntry) {
    if (!this.shouldLog(logEntry.level)) return;

    if (this.isDevelopment) {
      // Development: Pretty console output
      const color = {
        debug: '\x1b[36m',
        info: '\x1b[32m',
        warn: '\x1b[33m',
        error: '\x1b[31m'
      }[logEntry.level];
      
      console.log(
        `${color}[${logEntry.level.toUpperCase()}]\x1b[0m ${logEntry.timestamp} - ${logEntry.message}`,
        logEntry.data ? logEntry.data : ''
      );
    } else {
      // Production: Structured JSON logging
      console.log(JSON.stringify(logEntry));
    }
  }

  debug(message: string, data?: any, context?: Partial<LogEntry>) {
    this.write(this.formatLog('debug', message, data, context));
  }

  info(message: string, data?: any, context?: Partial<LogEntry>) {
    this.write(this.formatLog('info', message, data, context));
  }

  warn(message: string, data?: any, context?: Partial<LogEntry>) {
    this.write(this.formatLog('warn', message, data, context));
  }

  error(message: string, error?: Error | any, context?: Partial<LogEntry>) {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;

    this.write(this.formatLog('error', message, errorData, context));
  }

  // Specific logging methods for common use cases
  apiRequest(method: string, url: string, userId?: string, ip?: string) {
    this.info(`API Request: ${method} ${url}`, undefined, {
      action: 'api_request',
      userId,
      ip
    });
  }

  apiResponse(method: string, url: string, status: number, duration: number, userId?: string) {
    this.info(`API Response: ${method} ${url} - ${status} (${duration}ms)`, undefined, {
      action: 'api_response',
      userId,
      data: { status, duration }
    });
  }

  userAction(action: string, userId: string, details?: any, ip?: string) {
    this.info(`User Action: ${action}`, details, {
      action: 'user_action',
      userId,
      ip
    });
  }

  businessEvent(event: string, data?: any, userId?: string) {
    this.info(`Business Event: ${event}`, data, {
      action: 'business_event',
      userId
    });
  }

  securityEvent(event: string, data?: any, ip?: string) {
    this.warn(`Security Event: ${event}`, data, {
      action: 'security_event',
      ip
    });
  }

  systemError(error: Error | string, context?: any) {
    const message = error instanceof Error ? error.message : error;
    this.error(`System Error: ${message}`, error, {
      action: 'system_error',
      data: context
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Helper function to replace console.log in development
export const devLog = (message: string, data?: any) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug(message, data);
  }
};

// Middleware helper for API request logging
export const logApiRequest = (request: Request, userId?: string) => {
  const url = new URL(request.url);
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown';
  
  logger.apiRequest(request.method, url.pathname, userId, ip);
  
  return {
    startTime: Date.now(),
    logResponse: (status: number) => {
      const duration = Date.now() - Date.now();
      logger.apiResponse(request.method, url.pathname, status, duration, userId);
    }
  };
};

export default logger;
