/**
 * Common types for Trinity Oil Mills application
 */

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// User Types
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'accountant' | 'retail_staff' | 'staff';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Product Types
export interface Product {
  id: string;
  name: string;
  category: string;
  basePrice: string;
  retailPrice: string;
  gstRate: string;
  unit: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductWithInventory extends Product {
  inventory: {
    currentStock: string;
    reorderLevel: string;
    maxStock: string;
    lastUpdated: Date;
  };
}

// Sales Types
export interface Sale {
  id: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  totalAmount: string;
  taxAmount: string;
  paymentMethod: 'cash' | 'card' | 'upi' | 'bank_transfer';
  status: 'completed' | 'pending' | 'cancelled';
  userId: string;
  createdAt: Date;
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  product: Product;
}

// Financial Types
export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: string;
  date: Date;
  userId: string;
  receiptUrl?: string;
  isRecurring: boolean;
  createdAt: Date;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  grossProfit: number;
  profitMargin: number;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

// Inventory Types
export interface RawMaterial {
  id: string;
  name: string;
  unit: string;
  costPerUnit: string;
  gstRate: string;
  currentStock: string;
  reorderLevel: string;
  supplier?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface InventoryAdjustment {
  id: string;
  productId: string;
  type: 'increase' | 'decrease' | 'correction';
  quantity: string;
  reason: string;
  userId: string;
  createdAt: Date;
}

// Price History Types
export interface PriceHistory {
  id: string;
  productId: string;
  basePrice: string;
  retailPrice: string;
  gstRate: string;
  effectiveDate: string;
  endDate?: string;
  isActive: boolean;
  createdBy: string;
  notes?: string;
  createdAt: Date;
}

export interface RawMaterialPriceHistory {
  id: string;
  rawMaterialId: string;
  costPerUnit: string;
  gstRate: string;
  effectiveDate: string;
  endDate?: string;
  isActive: boolean;
  createdBy: string;
  supplier?: string;
  notes?: string;
  createdAt: Date;
}

// Analytics Types
export interface SalesAnalytics {
  totalSales: number;
  salesCount: number;
  averageOrderValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
  salesTrend: Array<{
    date: string;
    sales: number;
    count: number;
  }>;
}

export interface InventoryAnalytics {
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    currentStock: number;
    reorderLevel: number;
  }>;
  totalValue: number;
  turnoverRate: number;
  deadStock: Product[];
}

// Dashboard Types
export interface DashboardStats {
  todaySales: number;
  todayOrdersCount: number;
  lowStockAlerts: number;
  pendingExpenses: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  topSellingProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentActivities: Array<{
    id: string;
    type: 'sale' | 'expense' | 'inventory' | 'user_action';
    description: string;
    timestamp: Date;
    user?: string;
  }>;
}

// Form Types
export interface ContactForm {
  name: string;
  email: string;
  phone?: string;
  message: string;
  subject?: string;
}

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role?: string;
}

// Utility Types
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  key: string;
  direction: SortOrder;
}

export interface FilterConfig {
  [key: string]: any;
}

export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: any) => React.ReactNode;
}

// Error Types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  stack?: string;
}

// Notification Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

// Configuration Types
export interface AppConfig {
  business: {
    name: string;
    email: string;
    phone: string;
    address: string;
    gstNumber?: string;
  };
  system: {
    currency: string;
    timezone: string;
    dateFormat: string;
    lowStockThreshold: number;
  };
  features: {
    enableInventoryAutomation: boolean;
    enablePriceAlerts: boolean;
    enableEmailNotifications: boolean;
  };
}

export default {};
