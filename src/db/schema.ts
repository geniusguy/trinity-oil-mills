import { mysqlTable, varchar, int, decimal, text, timestamp, boolean, json, datetime, date } from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = mysqlTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('retail_staff'), // admin, accountant, retail_staff
  resetToken: varchar('reset_token', { length: 255 }),
  resetTokenExpiry: datetime('reset_token_expiry'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Products table
export const products = mysqlTable('products', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // produced, purchased
  type: varchar('type', { length: 100 }).notNull(), // ground_nut, gingelly, coconut, deepam, castor
  description: text('description'),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(), // GST-exclusive price
  retailPrice: decimal('retail_price', { precision: 10, scale: 2 }).notNull(), // GST-inclusive price for retail
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull().default('5.00'),
  gstIncluded: boolean('gst_included').default(false).notNull(), // true if GST is included in base price
  unit: varchar('unit', { length: 50 }).notNull().default('liters'),
  barcode: varchar('barcode', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Inventory table
export const inventory = mysqlTable('inventory', {
  id: varchar('id', { length: 255 }).primaryKey(),
  productId: varchar('product_id', { length: 255 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('0'),
  minStock: decimal('min_stock', { precision: 10, scale: 2 }).notNull().default('10'),
  maxStock: decimal('max_stock', { precision: 10, scale: 2 }).notNull().default('1000'),
  location: varchar('location', { length: 100 }).default('main_store'),
  batchNumber: varchar('batch_number', { length: 100 }),
  expiryDate: datetime('expiry_date'),
  costPrice: decimal('cost_price', { precision: 10, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Customers table
export const customers = mysqlTable('customers', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 100 }).default('Tamil Nadu'),
  pincode: varchar('pincode', { length: 10 }),
  customerType: varchar('customer_type', { length: 50 }).notNull().default('retail'), // retail, canteen
  gstNumber: varchar('gst_number', { length: 15 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Canteen Addresses table
export const canteenAddresses = mysqlTable('canteen_addresses', {
  id: varchar('id', { length: 255 }).primaryKey(),
  canteenName: varchar('canteen_name', { length: 255 }).notNull(),
  // Delivery Address (current address field)
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).default('Tamil Nadu'),
  pincode: varchar('pincode', { length: 10 }).notNull(),
  // Billing Address (new fields)
  billingAddress: text('billing_address'),
  billingCity: varchar('billing_city', { length: 100 }),
  billingState: varchar('billing_state', { length: 100 }),
  billingPincode: varchar('billing_pincode', { length: 10 }),
  // Contact Information
  // Billing contact details (accounts department)
  contactPerson: varchar('contact_person', { length: 255 }).notNull(),
  mobileNumber: varchar('mobile_number', { length: 15 }).notNull(),
  // Optional billing / delivery specific emails
  // Note: billingEmail column is created via migrations / setup route for backward compatibility
  // and may not be present in all databases; drizzle schema models the core shape and new delivery_email.
  // When present, billingEmail is used for finance, deliveryEmail for day-to-day canteen contact.
  // (Keep these optional in application code.)
  // @ts-ignore - column may be missing in some environments until migration runs
  billingEmail: varchar('billing_email', { length: 255 }),
  // Delivery person email (new)
  // @ts-ignore - column may be missing in some environments until migration runs
  deliveryEmail: varchar('delivery_email', { length: 255 }),
  gstNumber: varchar('gst_number', { length: 15 }).default('33AAAGT0316F1ZT'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Sales table
export const sales = mysqlTable('sales', {
  id: varchar('id', { length: 255 }).primaryKey(),
  customerId: varchar('customer_id', { length: 255 }),
  userId: varchar('user_id', { length: 255 }).notNull(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  saleType: varchar('sale_type', { length: 50 }).notNull().default('retail'), // retail, canteen
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  gstAmount: decimal('gst_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('cash'), // cash, upi, card, canteen_autopayment
  paymentStatus: varchar('payment_status', { length: 50 }).notNull().default('paid'), // paid, pending, failed
  /** Date when credited to account (used when payment_status='paid' / credited). */
  creditedDate: date('credited_date', { mode: 'string' }),
  shipmentStatus: varchar('shipment_status', { length: 50 }).notNull().default('pending'), // pending, shipped, delivered, cancelled
  canteenAddressId: varchar('canteen_address_id', { length: 255 }),
  poNumber: varchar('po_number', { length: 100 }), // Purchase Order number for canteen sales
  poDate: date('po_date'), // Purchase Order date
  modeOfSales: varchar('mode_of_sales', { length: 100 }), // Mode of sales (email, phone, walk-in, etc.)
  keptOnDisplay: boolean('kept_on_display').default(false).notNull(), // only meaningful for canteen orders; default No
  courierWeightOrRs: varchar('courier_weight_or_rs', { length: 50 }), // canteen: courier weight or amount
  mailSentHoDate: date('mail_sent_ho_date'), // canteen: date mailed to HO
  totalBottles: decimal('total_bottles', { precision: 10, scale: 2 }), // supply report: total number of bottles
  totalLiters: decimal('total_liters', { precision: 10, scale: 2 }),   // supply report: total liters
  totalTins: decimal('total_tins', { precision: 10, scale: 2 }),       // supply report: tin-equivalent (15.2 L usable = 1 tin)
  notes: text('notes'),
  /** Optional PDF reference uploaded from canteen POS. */
  referencePdfPath: varchar('reference_pdf_path', { length: 500 }),
  /** Optional original filename for the uploaded PDF. */
  referencePdfOriginalName: varchar('reference_pdf_original_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Invoice reservations (dummy/placeholder invoice sequence slots)
export const invoiceReservations = mysqlTable('invoice_reservations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull(),
  saleType: varchar('sale_type', { length: 50 }).notNull().default('canteen'),
  fyLabel: varchar('fy_label', { length: 16 }),
  status: varchar('status', { length: 20 }).notNull().default('reserved'), // reserved | used | cancelled
  reason: text('reason'),
  linkedSaleId: varchar('linked_sale_id', { length: 255 }),
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Sales Returns / Expiry Write-offs
export const salesReturns = mysqlTable('sales_returns', {
  id: varchar('id', { length: 255 }).primaryKey(),
  saleId: varchar('sale_id', { length: 255 }),
  saleType: varchar('sale_type', { length: 50 }).notNull().default('canteen'), // canteen, retail
  canteenName: varchar('canteen_name', { length: 255 }),
  productName: varchar('product_name', { length: 255 }).notNull(),
  unit: varchar('unit', { length: 50 }).notNull().default('pcs'),
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull(),
  unitPriceExGst: decimal('unit_price_ex_gst', { precision: 12, scale: 2 }).notNull(),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull().default('5.00'),
  returnAmountExGst: decimal('return_amount_ex_gst', { precision: 12, scale: 2 }).notNull(),
  returnGstAmount: decimal('return_gst_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  returnTotalAmount: decimal('return_total_amount', { precision: 12, scale: 2 }).notNull(),
  returnNature: varchar('return_nature', { length: 30 }).notNull().default('sales_return'), // sales_return, expiry
  accountingImpact: varchar('accounting_impact', { length: 30 }).notNull().default('revenue_reversal'), // revenue_reversal, expense_writeoff, both
  reason: text('reason'),
  returnDate: date('return_date', { mode: 'string' }).notNull(),
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Sale Items table
export const saleItems = mysqlTable('sale_items', {
  id: varchar('id', { length: 255 }).primaryKey(),
  saleId: varchar('sale_id', { length: 255 }).notNull(),
  productId: varchar('product_id', { length: 255 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull(),
  gstAmount: decimal('gst_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Orders table (for canteen orders)
export const orders = mysqlTable('orders', {
  id: varchar('id', { length: 255 }).primaryKey(),
  customerId: varchar('customer_id', { length: 255 }).notNull(),
  orderNumber: varchar('order_number', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, confirmed, delivered, cancelled
  subtotal: decimal('subtotal', { precision: 10, scale: 2 }).notNull(),
  gstAmount: decimal('gst_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  deliveryDate: datetime('delivery_date'),
  deliveryAddress: text('delivery_address'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Order Items table
export const orderItems = mysqlTable('order_items', {
  id: varchar('id', { length: 255 }).primaryKey(),
  orderId: varchar('order_id', { length: 255 }).notNull(),
  productId: varchar('product_id', { length: 255 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull(),
  gstAmount: decimal('gst_amount', { precision: 10, scale: 2 }).notNull(),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Order status history (for order status changes)
export const orderStatusHistory = mysqlTable('order_status_history', {
  id: varchar('id', { length: 255 }).primaryKey(),
  orderId: varchar('order_id', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull(),
  notes: text('notes'),
  changedBy: varchar('changed_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Stock Purchases table (product inventory purchases: when & from whom)
export const stockPurchases = mysqlTable('stock_purchases', {
  id: varchar('id', { length: 255 }).primaryKey(),
  productId: varchar('product_id', { length: 255 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  supplierName: varchar('supplier_name', { length: 255 }).notNull(),
  purchaseDate: datetime('purchase_date').notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  notes: text('notes'),
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/** Vendor payments against a stock purchase (one full payment or multiple installments). */
export const stockPurchasePayments = mysqlTable('stock_purchase_payments', {
  id: varchar('id', { length: 255 }).primaryKey(),
  stockPurchaseId: varchar('stock_purchase_id', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paidOn: date('paid_on', { mode: 'string' }).notNull(),
  notes: text('notes'),
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/** Opening vendor payables at 1 Apr for an Indian FY (fy_start_year = April year). */
export const stockPurchaseFyOpening = mysqlTable('stock_purchase_fy_opening', {
  fyStartYear: int('fy_start_year').primaryKey(),
  openingBalancePayable: decimal('opening_balance_payable', { precision: 14, scale: 2 }).notNull().default('0'),
  notes: varchar('notes', { length: 500 }),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/** Supplier master for purchase/vendor records. */
export const suppliers = mysqlTable('suppliers', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  supplierType: varchar('supplier_type', { length: 120 }),
  contactNumber: varchar('contact_number', { length: 30 }),
  email: varchar('email', { length: 255 }),
  createdBy: varchar('created_by', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

export const supplierFyOpeningBalance = mysqlTable('supplier_fy_opening_balance', {
  supplierName: varchar('supplier_name', { length: 255 }).notNull(),
  fyStartYear: int('fy_start_year').notNull(),
  openingBalancePayable: decimal('opening_balance_payable', { precision: 14, scale: 2 }).notNull().default('0'),
  notes: varchar('notes', { length: 500 }),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Production table (for produced oils)
export const production = mysqlTable('production', {
  id: varchar('id', { length: 255 }).primaryKey(),
  productId: varchar('product_id', { length: 255 }).notNull(),
  batchNumber: varchar('batch_number', { length: 100 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  costPerUnit: decimal('cost_per_unit', { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).notNull(),
  productionDate: datetime('production_date').notNull(),
  expiryDate: datetime('expiry_date'),
  qualityCheck: boolean('quality_check').default(false).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Production batches (extended batch tracking)
export const productionBatches = mysqlTable('production_batches', {
  id: varchar('id', { length: 255 }).primaryKey(),
  productionId: varchar('production_id', { length: 255 }).notNull(),
  batchNumber: varchar('batch_number', { length: 100 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Production materials (materials used in production)
export const productionMaterials = mysqlTable('production_materials', {
  id: varchar('id', { length: 255 }).primaryKey(),
  productionId: varchar('production_id', { length: 255 }).notNull(),
  rawMaterialId: varchar('raw_material_id', { length: 255 }).notNull(),
  quantityUsed: decimal('quantity_used', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Quality control (for production batches)
export const qualityControl = mysqlTable('quality_control', {
  id: varchar('id', { length: 255 }).primaryKey(),
  productionId: varchar('production_id', { length: 255 }).notNull(),
  batchId: varchar('batch_id', { length: 255 }),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  notes: text('notes'),
  checkedBy: varchar('checked_by', { length: 255 }),
  checkedAt: datetime('checked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Daily notes / task reminders (calls, follow-ups, etc.)
export const dailyTaskReminders = mysqlTable('daily_task_reminders', {
  id: varchar('id', { length: 255 }).primaryKey(),
  title: varchar('title', { length: 500 }).notNull(),
  reminderOn: datetime('reminder_on'), // when to remind (optional)
  remarks: text('remarks'),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending | done
  userId: varchar('user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Expenses table
export const expenses = mysqlTable('expenses', {
  id: varchar('id', { length: 255 }).primaryKey(),
  category: varchar('category', { length: 100 }).notNull(),
  description: text('description').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('cash'),
  receiptNumber: varchar('receipt_number', { length: 100 }),
  expenseDate: datetime('expense_date').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

/** Courier / shipment costs to canteens (separate from generic expenses + sales courier note). */
export const courierExpenses = mysqlTable('courier_expenses', {
  id: varchar('id', { length: 255 }).primaryKey(),
  courierDate: date('courier_date', { mode: 'string' }).notNull(),
  paidDate: date('paid_date', { mode: 'string' }).notNull(),
  quantity: decimal('quantity', { precision: 12, scale: 2 }).notNull().default('0'),
  cost: decimal('cost', { precision: 12, scale: 2 }).notNull(),
  /** Cost excluding GST (base amount). */
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  /** GST amount for the line. */
  gstAmount: decimal('gst_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  /** Split GST for intra-state bills (CGST). */
  cgstAmount: decimal('cgst_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  /** Split GST for intra-state bills (SGST). */
  sgstAmount: decimal('sgst_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  canteenAddressId: varchar('canteen_address_id', { length: 255 }),
  /** Free-text destination when not using canteen master */
  destinationNote: text('destination_note'),
  notes: text('notes'),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('cash'),
  referenceNo: varchar('reference_no', { length: 100 }),
  /** Optional PDF reference uploaded from courier bill form. */
  referencePdfPath: varchar('reference_pdf_path', { length: 500 }),
  /** Optional original filename for the uploaded PDF. */
  referencePdfOriginalName: varchar('reference_pdf_original_name', { length: 255 }),
  userId: varchar('user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Savings and Investments table
export const savingsInvestments = mysqlTable('savings_investments', {
  id: varchar('id', { length: 255 }).primaryKey(),
  type: varchar('type', { length: 50 }).notNull(), // 'savings', 'investment', 'fixed_deposit', 'mutual_fund', 'stock', 'property', 'gold', 'other'
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currentValue: decimal('current_value', { precision: 15, scale: 2 }),
  investmentDate: datetime('investment_date').notNull(),
  maturityDate: datetime('maturity_date'),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }),
  institution: varchar('institution', { length: 255 }), // Bank, broker, etc.
  accountNumber: varchar('account_number', { length: 100 }),
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'matured', 'closed', 'sold'
  userId: varchar('user_id', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Courier Rates table
export const courierRates = mysqlTable('courier_rates', {
  id: varchar('id', { length: 255 }).primaryKey(),
  destination: varchar('destination', { length: 100 }).notNull(),
  weight: decimal('weight', { precision: 10, scale: 2 }).notNull(),
  rate: decimal('rate', { precision: 10, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Raw Materials table
export const rawMaterials = mysqlTable('raw_materials', {
  id: varchar('id', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull(), // packaging, seeds, chemicals, equipment
  type: varchar('type', { length: 100 }).notNull(), // bottle, cap, tape, groundnut, sesame, etc
  description: text('description'),
  unit: varchar('unit', { length: 50 }).notNull(), // pieces, kg, liters, meters
  costPerUnit: decimal('cost_per_unit', { precision: 10, scale: 2 }).notNull(),
  supplier: varchar('supplier', { length: 255 }),
  minimumStock: decimal('minimum_stock', { precision: 10, scale: 2 }).default('0'),
  currentStock: decimal('current_stock', { precision: 10, scale: 2 }).default('0'),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull().default('18.00'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Production Recipes table - defines what raw materials are needed for each product
export const productionRecipes = mysqlTable('production_recipes', {
  id: varchar('id', { length: 255 }).primaryKey(),
  productId: varchar('product_id', { length: 255 }).notNull(),
  rawMaterialId: varchar('raw_material_id', { length: 255 }).notNull(),
  quantityPerUnit: decimal('quantity_per_unit', { precision: 10, scale: 3 }).notNull(), // How much raw material needed per 1 unit of product
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Raw Material Purchases table
export const rawMaterialPurchases = mysqlTable('raw_material_purchases', {
  id: varchar('id', { length: 255 }).primaryKey(),
  rawMaterialId: varchar('raw_material_id', { length: 255 }).notNull(),
  supplier: varchar('supplier', { length: 255 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).notNull(),
  gstAmount: decimal('gst_amount', { precision: 10, scale: 2 }).notNull(),
  purchaseDate: datetime('purchase_date').notNull(),
  invoiceNumber: varchar('invoice_number', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Product Price History table
export const productPriceHistory = mysqlTable('product_price_history', {
  id: varchar('id', { length: 255 }).primaryKey(),
  productId: varchar('product_id', { length: 255 }).notNull(),
  basePrice: decimal('base_price', { precision: 10, scale: 2 }).notNull(),
  retailPrice: decimal('retail_price', { precision: 10, scale: 2 }).notNull(),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  notes: text('notes'),
});

// Raw Material Price History table
export const rawMaterialPriceHistory = mysqlTable('raw_material_price_history', {
  id: varchar('id', { length: 255 }).primaryKey(),
  rawMaterialId: varchar('raw_material_id', { length: 255 }).notNull(),
  costPerUnit: decimal('cost_per_unit', { precision: 10, scale: 2 }).notNull(),
  gstRate: decimal('gst_rate', { precision: 5, scale: 2 }).notNull(),
  effectiveDate: date('effective_date').notNull(),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  supplier: varchar('supplier', { length: 255 }),
  notes: text('notes'),
});

// Production Cost History table (tracks actual cost at time of production)
export const productionCostHistory = mysqlTable('production_cost_history', {
  id: varchar('id', { length: 255 }).primaryKey(),
  productionId: varchar('production_id', { length: 255 }).notNull(),
  productId: varchar('product_id', { length: 255 }).notNull(),
  rawMaterialId: varchar('raw_material_id', { length: 255 }).notNull(),
  quantityUsed: decimal('quantity_used', { precision: 10, scale: 3 }).notNull(),
  costPerUnit: decimal('cost_per_unit', { precision: 10, scale: 2 }).notNull(),
  totalCost: decimal('total_cost', { precision: 10, scale: 2 }).notNull(),
  productionDate: date('production_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  sales: many(sales),
  expenses: many(expenses),
}));

export const productsRelations = relations(products, ({ many }) => ({
  inventory: many(inventory),
  saleItems: many(saleItems),
  orderItems: many(orderItems),
  production: many(production),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  sales: many(sales),
  orders: many(orders),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  customer: one(customers, {
    fields: [sales.customerId],
    references: [customers.id],
  }),
  user: one(users, {
    fields: [sales.userId],
    references: [users.id],
  }),
  saleItems: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  product: one(products, {
    fields: [saleItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  orderItems: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.productId],
    references: [products.id],
  }),
}));

export const productionRelations = relations(production, ({ one }) => ({
  product: one(products, {
    fields: [production.productId],
    references: [products.id],
  }),
}));

export const expensesRelations = relations(expenses, ({ one }) => ({
  user: one(users, {
    fields: [expenses.userId],
    references: [users.id],
  }),
}));

export const productPriceHistoryRelations = relations(productPriceHistory, ({ one }) => ({
  product: one(products, {
    fields: [productPriceHistory.productId],
    references: [products.id],
  }),
  createdByUser: one(users, {
    fields: [productPriceHistory.createdBy],
    references: [users.id],
  }),
}));

export const rawMaterialPriceHistoryRelations = relations(rawMaterialPriceHistory, ({ one }) => ({
  rawMaterial: one(rawMaterials, {
    fields: [rawMaterialPriceHistory.rawMaterialId],
    references: [rawMaterials.id],
  }),
  createdByUser: one(users, {
    fields: [rawMaterialPriceHistory.createdBy],
    references: [users.id],
  }),
}));

export const productionCostHistoryRelations = relations(productionCostHistory, ({ one }) => ({
  production: one(production, {
    fields: [productionCostHistory.productionId],
    references: [production.id],
  }),
  product: one(products, {
    fields: [productionCostHistory.productId],
    references: [products.id],
  }),
  rawMaterial: one(rawMaterials, {
    fields: [productionCostHistory.rawMaterialId],
    references: [rawMaterials.id],
  }),
}));

// Loans table
export const loans = mysqlTable('loans', {
  id: varchar('id', { length: 255 }).primaryKey(),
  loanName: varchar('loan_name', { length: 255 }).notNull(),
  lenderName: varchar('lender_name', { length: 255 }).notNull(),
  loanType: varchar('loan_type', { length: 100 }).notNull(), // business_loan, personal_loan, equipment_loan, working_capital
  principalAmount: decimal('principal_amount', { precision: 12, scale: 2 }).notNull(),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }).notNull(), // percentage per annum
  tenure: int('tenure').notNull(), // in months
  emiAmount: decimal('emi_amount', { precision: 10, scale: 2 }).notNull(),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  accountNumber: varchar('account_number', { length: 100 }),
  ifscCode: varchar('ifsc_code', { length: 20 }),
  collateral: text('collateral'), // Description of collateral if any
  purpose: text('purpose').notNull(), // Purpose of the loan
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, closed, defaulted
  remainingBalance: decimal('remaining_balance', { precision: 12, scale: 2 }).notNull(),
  nextPaymentDate: date('next_payment_date'),
  notes: text('notes'),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Loan Payments table
export const loanPayments = mysqlTable('loan_payments', {
  id: varchar('id', { length: 255 }).primaryKey(),
  loanId: varchar('loan_id', { length: 255 }).notNull(),
  paymentDate: date('payment_date').notNull(),
  paymentAmount: decimal('payment_amount', { precision: 10, scale: 2 }).notNull(),
  principalAmount: decimal('principal_amount', { precision: 10, scale: 2 }).notNull(),
  interestAmount: decimal('interest_amount', { precision: 10, scale: 2 }).notNull(),
  outstandingBalance: decimal('outstanding_balance', { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('bank_transfer'), // bank_transfer, cash, cheque, upi
  transactionId: varchar('transaction_id', { length: 100 }),
  receiptNumber: varchar('receipt_number', { length: 100 }),
  paymentStatus: varchar('payment_status', { length: 50 }).notNull().default('paid'), // paid, pending, failed
  lateFee: decimal('late_fee', { precision: 10, scale: 2 }).default('0.00'),
  notes: text('notes'),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Loan relations
export const loansRelations = relations(loans, ({ one, many }) => ({
  createdByUser: one(users, {
    fields: [loans.createdBy],
    references: [users.id],
  }),
  payments: many(loanPayments),
}));

export const loanPaymentsRelations = relations(loanPayments, ({ one }) => ({
  loan: one(loans, {
    fields: [loanPayments.loanId],
    references: [loans.id],
  }),
  createdByUser: one(users, {
    fields: [loanPayments.createdBy],
    references: [users.id],
  }),
}));
