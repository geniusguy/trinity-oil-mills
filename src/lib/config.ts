/**
 * Application configuration management for Trinity Oil Mills
 */

import { AppConfig } from '@/types/common';

// Default configuration
const defaultConfig: AppConfig = {
  business: {
    name: 'Trinity Oil Mills',
    email: 'TrintiyOilmills@gmail.com',
    phone: '+919952055660',
    address: 'Trinity Oil Mills, Tamil Nadu, India',
    gstNumber: process.env.NEXT_PUBLIC_GST_NUMBER
  },
  system: {
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    dateFormat: 'DD/MM/YYYY',
    lowStockThreshold: 10
  },
  features: {
    enableInventoryAutomation: true,
    enablePriceAlerts: true,
    enableEmailNotifications: true
  }
};

// Environment-specific overrides
const environmentConfig = {
  development: {
    features: {
      enableInventoryAutomation: false, // Disable automation in dev
      enableEmailNotifications: false  // Disable emails in dev
    }
  },
  production: {
    // Production-specific settings
  },
  test: {
    features: {
      enableInventoryAutomation: false,
      enablePriceAlerts: false,
      enableEmailNotifications: false
    }
  }
};

// Merge configurations
function mergeConfig(base: AppConfig, override: Partial<AppConfig>): AppConfig {
  return {
    business: { ...base.business, ...override.business },
    system: { ...base.system, ...override.system },
    features: { ...base.features, ...override.features }
  };
}

// Get current environment
const currentEnv = process.env.NODE_ENV as keyof typeof environmentConfig || 'development';

// Export merged configuration
export const config = mergeConfig(
  defaultConfig,
  environmentConfig[currentEnv] || {}
);

// Configuration getters for easy access
export const getBusinessConfig = () => config.business;
export const getSystemConfig = () => config.system;
export const getFeatureConfig = () => config.features;

// Feature flags
export const isFeatureEnabled = (feature: keyof AppConfig['features']): boolean => {
  return config.features[feature];
};

// Currency formatter
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: config.system.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numAmount);
};

// Date formatter
export const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: config.system.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(dateObj);
};

// Date and time formatter
export const formatDateTime = (date: Date | string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: config.system.timezone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(dateObj);
};

// Phone number formatter
export const formatPhone = (phone: string): string => {
  // Remove all non-digits
  const cleaned = phone.replace(/\D/g, '');
  
  // Check if it's an Indian number
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  } else if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  
  return phone; // Return original if format not recognized
};

// Email template configuration
export const getEmailConfig = () => ({
  from: config.business.email,
  replyTo: config.business.email,
  templates: {
    welcome: {
      subject: `Welcome to ${config.business.name}`,
      templateId: 'welcome'
    },
    passwordReset: {
      subject: `Password Reset - ${config.business.name}`,
      templateId: 'password-reset'
    },
    orderConfirmation: {
      subject: `Order Confirmation - ${config.business.name}`,
      templateId: 'order-confirmation'
    },
    lowStock: {
      subject: `Low Stock Alert - ${config.business.name}`,
      templateId: 'low-stock'
    }
  }
});

// API configuration
export const getApiConfig = () => ({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  timeout: 30000, // 30 seconds
  retries: 3,
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  }
});

// Database configuration (server-side only)
export const getDatabaseConfig = () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'trinity_oil_mills',
  ssl: process.env.NODE_ENV === 'production',
  connectionLimit: 10,
  acquireTimeout: 60000,
  timeout: 60000
});

// Security configuration
export const getSecurityConfig = () => ({
  jwt: {
    secret: process.env.NEXTAUTH_SECRET,
    expiresIn: '7d'
  },
  bcrypt: {
    saltRounds: 12
  },
  session: {
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60    // 1 day in seconds
  },
  rateLimit: {
    login: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 5 // 5 attempts per window
    },
    api: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100 // 100 requests per window
    }
  }
});

export default config;
