'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
  badge?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
  roles?: string[];
}

// Organized navigation structure with logical groupings
const navigationSections: NavSection[] = [
  // DASHBOARD
  {
    title: '',
    items: [
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
          </svg>
        )
      },
      {
        name: 'Daily Notes / Tasks',
        href: '/dashboard/admin/daily-notes',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff'],
      }
    ]
  },

  // SALES & ORDERS
  {
    title: 'Sales & Orders',
    items: [
      {
        name: 'New Sale',
        href: '/dashboard/admin/sales/pos',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff'],
        badge: 'POS'
      },
      {
        name: 'Sales History',
        href: '/dashboard/admin/sales',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Bulk Invoice Downloader',
        href: '/dashboard/admin/sales/bulk-invoice-download',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 002 2h12a2 2 0 002-2M12 4v10m0 0l4-4m-4 4l-4-4" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Reserved Dummy Invoices',
        href: '/dashboard/admin/sales/dummy-invoices',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        roles: ['admin', 'accountant']
      },
      {
        name: 'Retail Sales',
        href: '/dashboard/admin/sales/retail',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Canteen Sales',
        href: '/dashboard/admin/sales/canteen',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h4a1 1 0 011 1v5m-6 0h6" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Canteen Sales Register',
        href: '/dashboard/admin/sales/canteen-register',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h18M3 10h18M3 15h18M3 20h18" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Canteen-wise Sales',
        href: '/dashboard/admin/sales/canteen-wise',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18M7 7v10m10-10v10" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Material Balance Sheet',
        href: '/dashboard/admin/sales/material-balance',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Supplied Details',
        href: '/dashboard/admin/sales/supplied-details',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2a4 4 0 014-4h6M9 17H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 11l2-2 2 2m-2-2v8" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff'],
      },
      {
        name: 'Canteen Addresses',
        href: '/dashboard/admin/canteen-addresses',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        roles: ['admin', 'retail_staff']
      }
    ],
    roles: ['admin', 'accountant', 'retail_staff']
  },

  // INVENTORY & PRODUCTS
  {
    title: 'Inventory & Products',
    items: [
      {
        name: 'Oil Products',
        href: '/dashboard/admin/products',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
        roles: ['admin', 'retail_staff']
      },
      {
        name: 'Stock Levels',
        href: '/dashboard/admin/inventory',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Stock Audit (Temp)',
        href: '/dashboard/admin/inventory-stock-audit',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Add Stock / Purchases',
        href: '/dashboard/admin/purchases',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Supplier Master',
        href: '/dashboard/admin/suppliers',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V4H2v16h5m10 0v-2a4 4 0 00-8 0v2m8 0H9m8-8a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Payments Made',
        href: '/dashboard/admin/purchase-payments',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 14h7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 8v8" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M23 11l-3-3-3 3" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Oil Purchase Volume',
        href: '/dashboard/admin/oil-purchase-volume',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Raw Materials',
        href: '/dashboard/admin/raw-materials',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V7a2 2 0 00-2-2h-3V3a1 1 0 00-1-1h-4a1 1 0 00-1 1v2H6a2 2 0 00-2 2v6m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4m5 0a3 3 0 006 0" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff']
      },
      {
        name: 'Price Management',
        href: '/dashboard/admin/price-management',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        ),
        roles: ['admin', 'accountant']
      },
      {
        name: 'Price List',
        href: '/api/price-list/html',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff'],
        badge: 'PRINT'
      }
    ],
    roles: ['admin', 'accountant', 'retail_staff']
  },

  // FINANCES
  {
    title: 'Financial Management',
    items: [
      // Daily Operations
      {
        name: 'Daily Expenses',
        href: '/dashboard/admin/expenses',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'Track daily business expenses'
      },
      {
        name: 'Courier Expenses',
        href: '/dashboard/admin/courier-expenses',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
      },
      {
        name: 'Credited to Account',
        href: '/dashboard/admin/credited-to-account',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'Payments credited to account'
      },
      {
        name: 'Vendor Payment Reference',
        href: '/dashboard/admin/vendor-payment-reference',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h10M7 14h7" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 8v8" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff'],
        description: 'Separate vendor payment reference sheet',
      },
      {
        name: 'Sales Returns / Expiry',
        href: '/dashboard/admin/sales-returns',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h7V3m0 0l-4 4m4-4l4 4M21 14h-7v7m0 0l4-4m-4 4l-4-4" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'Returns, expiry write-off, P&L adjustment'
      },
      {
        name: 'Resent Fresh Bottles',
        href: '/dashboard/admin/sales-return-resent',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-3-6.708M21 3v6h-6" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h10v10H7z" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'Expired returns replacements (stock deduction)'
      },
      {
        name: 'Loan Management',
        href: '/dashboard/admin/loan-management',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'Manage business loans and financing'
      },
      
      // Asset Valuation (New Section)
      {
        name: 'Total Stock Value',
        href: '/dashboard/admin/stock-value',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'Current inventory valuation & analytics'
      },
      {
        name: 'Savings & Investments',
        href: '/dashboard/admin/savings-investments',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'Track financial portfolio & investments'
      },
      {
        name: 'Book Value',
        href: '/dashboard/admin/book-value',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h4a1 1 0 011 1v5m-6 0h6" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'Company net worth & balance sheet'
      },
      
      // Reports & Analysis
      {
        name: 'Financial Reports',
        href: '/dashboard/admin/financial-statements',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'P&L, Balance Sheet, Cash Flow'
      },
      {
        name: 'Historical P&L',
        href: '/dashboard/admin/historical-pnl',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'Historical profit & loss trends'
      },
      {
        name: 'GST Reports',
        href: '/dashboard/admin/gst-collection',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 8h6m-5 0a3 3 0 110 6H9l3 3-3-3h1m1 0V4.5a.5.5 0 00-1 0v7a.5.5 0 001 0z" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'GST collection and compliance'
      },
      {
        name: 'GST Input Reconciliation',
        href: '/dashboard/admin/gst-input-reconciliation',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m-7 4h8m-9 4h10M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'GST input split and reconciliation'
      },
      {
        name: 'Cost Calculator',
        href: '/dashboard/admin/production-cost-calculator',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        ),
        roles: ['admin', 'accountant', 'retail_staff'],
        description: 'Production cost calculation tool'
      }
    ],
    roles: ['admin', 'accountant']
  },

  {
    title: 'Canteen credit',
    items: [
      {
        name: 'Invoice → Credit days',
        href: '/dashboard/admin/canteen-credit-days',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        ),
        roles: ['admin', 'accountant'],
        description: 'Canteen name, invoice vs credited date, days between',
      },
    ],
    roles: ['admin', 'accountant'],
  },

  // ANALYTICS & REPORTS
  {
    title: 'Analytics & Reports',
    items: [
      {
        name: 'Business Analytics',
        href: '/dashboard/admin/analytics',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        ),
        roles: ['admin', 'accountant']
      },
      {
        name: 'Summary Reports',
        href: '/dashboard/admin/reports',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
        roles: ['admin', 'accountant']
      }
    ],
    roles: ['admin', 'accountant']
  },

  // SYSTEM & SETTINGS
  {
    title: 'System & Settings',
    items: [
      {
        name: 'Auto Inventory',
        href: '/dashboard/admin/inventory-automation',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
        roles: ['admin']
      },
      {
        name: 'Staff Management',
        href: '/dashboard/admin/users',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
          </svg>
        ),
        roles: ['admin']
      },
      {
        name: 'Help & Documentation',
        href: '/dashboard/admin/documentation',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ),
        roles: ['admin']
      },
      {
        name: 'Database Setup',
        href: '/dashboard/admin/setup/database',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s8-1.79-8-4" />
          </svg>
        ),
        roles: ['admin'],
        badge: 'SETUP'
      },
      {
        name: 'Database Backup',
        href: '/dashboard/admin/database-backup',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16a2 2 0 002 2h12a2 2 0 002-2M12 4v10m0 0l4-4m-4 4l-4-4" />
          </svg>
        ),
        roles: ['admin'],
        badge: 'SQL'
      }
    ],
    roles: ['admin']
  }
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, isCollapsed = false, onToggleCollapse }) => {
  const pathname = usePathname();
  const { data: session } = useSession();

  const filteredSections = navigationSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => 
        !item.roles || (session?.user?.role && item.roles.includes(session.user.role))
      )
    }))
    .filter(section => 
      section.items.length > 0 && 
      (!section.roles || (session?.user?.role && section.roles.includes(session.user.role)))
    );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 ${isCollapsed ? 'w-20' : 'w-64'} bg-gradient-to-b from-white to-gray-50 shadow-xl border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center justify-between border-b border-gray-200 ${isCollapsed ? 'h-20 px-4' : 'h-24 px-6'}`}>
            <div className={`flex items-center ${isCollapsed ? 'flex-col gap-1' : 'gap-3'}`}>
              <div className="flex-shrink-0">
                <img 
                  src="/Trinity-Oil-favicon-152x152.png" 
                  alt="Trinity Oil Mills" 
                  className={`object-contain ${isCollapsed ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg shadow-sm`}
                />
              </div>
              {!isCollapsed && (
                <div>
                  <h1 className="text-lg font-bold text-gray-900">TOM</h1>
                  <p className="text-xs text-gray-600">management</p>
                </div>
              )}
              {isCollapsed && (
                <div className="text-xs font-semibold text-gray-700 text-center leading-tight">
                  TOM
                </div>
              )}
            </div>
            
            {/* Collapse/Expand Button */}
            <div className="flex gap-1">
              {onToggleCollapse && (
                <button
                  onClick={onToggleCollapse}
                  className="hidden lg:flex p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isCollapsed ? (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    )}
                  </svg>
                </button>
              )}
              <button
                onClick={onClose}
                className="lg:hidden p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                title="Close Sidebar"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className={`flex-1 py-4 overflow-y-auto ${isCollapsed ? 'px-2' : 'px-4'}`}>
            <div className="space-y-6">
              {filteredSections.map((section, sectionIndex) => (
                <div key={section.title || sectionIndex}>
                  {/* Section Header */}
                  {!isCollapsed && section.title && (
                    <div className="px-2 mb-3">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {section.title}
                      </h3>
                    </div>
                  )}
                  
                  {/* Section Items */}
                  <div className={`space-y-1 ${section.title && !isCollapsed ? 'pl-2' : ''}`}>
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          className={`group flex items-center text-sm font-medium rounded-lg transition-all duration-200 relative ${
                            isCollapsed ? 'px-2 py-3 justify-center' : 'px-3 py-2.5'
                          } ${
                            isActive
                              ? 'bg-green-100 text-green-800 shadow-sm border-l-4 border-green-600'
                              : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
                          }`}
                          onClick={onClose}
                          title={isCollapsed ? item.name : undefined}
                        >
                          <span className={`${isActive ? 'text-green-700' : 'text-gray-400 group-hover:text-gray-500'} ${
                            isCollapsed ? '' : 'mr-3'
                          } transition-colors flex-shrink-0`}>
                            {item.icon}
                          </span>
                          {!isCollapsed && (
                            <span className="truncate flex-1">{item.name}</span>
                          )}
                          {!isCollapsed && item.badge && (
                            <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                              item.badge === 'POS'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {item.badge}
                            </span>
                          )}
                          {isCollapsed && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                              {item.name}
                              {item.badge && ` (${item.badge})`}
                            </div>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                  
                  {/* Section Divider */}
                  {!isCollapsed && sectionIndex < filteredSections.length - 1 && (
                    <div className="border-t border-gray-200 mt-4 pt-4" />
                  )}
                </div>
              ))}
            </div>
          </nav>

          {/* User info */}
          <div className={`border-t border-gray-200 ${isCollapsed ? 'p-2' : 'p-4'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : ''} group relative`}>
              <div className="flex-shrink-0">
                <div className={`bg-green-800 rounded-full flex items-center justify-center ${isCollapsed ? 'w-10 h-10' : 'w-8 h-8'}`}>
                  <span className={`text-white font-medium ${isCollapsed ? 'text-sm' : 'text-sm'}`}>
                    {session?.user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
              {!isCollapsed && (
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-700">{session?.user?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{session?.user?.role}</p>
                </div>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                  {session?.user?.name || 'User'} ({session?.user?.role || 'staff'})
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};