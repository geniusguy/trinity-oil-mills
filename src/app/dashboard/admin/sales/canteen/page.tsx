'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Sale {
  id: string;
  invoiceNumber: string;
  saleType: string;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  shipmentStatus: string;
  createdAt: string;
  invoiceDate?: string;
  userName: string;
  customerName?: string;
  canteenName?: string;
  canteenAddress?: string;
  contactPerson?: string;
  mobileNumber?: string;
  canteenContact?: string;
  canteenMobile?: string;
  poNumber?: string;
  poDate?: string;
  canteenAddressId?: string;
  modeOfSales?: string;
}

interface CanteenAddress {
  id: string;
  canteenName: string;
  address: string;
  contactPerson: string;
  mobileNumber: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
}

export default function CanteenSalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [canteenAddresses, setCanteenAddresses] = useState<CanteenAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter and sort states
  const [filters, setFilters] = useState({
    search: '',
    paymentMethod: '',
    paymentStatus: '',
    shipmentStatus: '',
    canteenId: '',
    dateFrom: '',
    dateTo: '',
    month: '',
    year: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [availableMonths, setAvailableMonths] = useState<{value: string, label: string}[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    paymentStatus: '',
    shipmentStatus: '',
    notes: '',
    invoiceNumber: '',
    poNumber: '',
    poDate: '',
    invoiceDate: '',
    customerName: '',
    canteenAddressId: '',
    paymentMethod: '',
    modeOfSales: '',
    customerEmail: ''
  });

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session) {
      router.push('/login');
      return;
    }
    if (!['admin', 'retail_staff', 'accountant'].includes(session.user?.role || '')) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  // Fetch canteen sales and addresses
  useEffect(() => {
    if (session?.user && ['admin', 'retail_staff', 'accountant'].includes(session.user.role)) {
      fetchCanteenSales();
      fetchCanteenAddresses();
    }
  }, [session]);

  const fetchCanteenSales = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sales?category=canteen&limit=100');
      const data = await response.json();
      
      if (response.ok) {
        setSales(data.sales);
        extractAvailableDates(data.sales);
      } else {
        setError(data.error || 'Failed to fetch canteen sales');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCanteenAddresses = async () => {
    try {
      const response = await fetch('/api/canteen-addresses');
      const data = await response.json();
      setCanteenAddresses(data.addresses || []);
    } catch (error) {
      console.error('Error fetching canteen addresses:', error);
    }
  };

  // Extract available months and years from sales data (use PO Date when present)
  const extractAvailableDates = (salesData: Sale[]) => {
    const months = new Set<string>();
    const years = new Set<string>();
    
    salesData.forEach(sale => {
      const date = sale.poDate ? new Date(sale.poDate) : new Date(sale.createdAt);
      const year = date.getFullYear().toString();
      const month = `${year}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      years.add(year);
      months.add(month);
    });
    
    // Convert months to labeled options
    const monthOptions = Array.from(months)
      .sort((a, b) => b.localeCompare(a)) // Sort newest first
      .map(monthValue => {
        const [year, month] = monthValue.split('-');
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = monthNames[parseInt(month) - 1];
        return {
          value: monthValue,
          label: `${monthName} ${year}`
        };
      });
    
    const yearOptions = Array.from(years).sort((a, b) => b.localeCompare(a)); // Sort newest first
    
    setAvailableMonths(monthOptions);
    setAvailableYears(yearOptions);
  };

  // Apply filters and sorting
  const applyFiltersAndSort = () => {
    let filtered = [...sales];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.invoiceNumber.toLowerCase().includes(searchLower) ||
        s.userName.toLowerCase().includes(searchLower) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchLower)) ||
        (s.canteenName && s.canteenName.toLowerCase().includes(searchLower))
      );
    }
    if (filters.paymentMethod) {
      filtered = filtered.filter(s => s.paymentMethod === filters.paymentMethod);
    }
    if (filters.paymentStatus) {
      filtered = filtered.filter(s => s.paymentStatus === filters.paymentStatus);
    }
    if (filters.shipmentStatus) {
      filtered = filtered.filter(s => s.shipmentStatus === filters.shipmentStatus);
    }
    if (filters.canteenId) {
      filtered = filtered.filter(s => s.canteenAddressId === filters.canteenId);
    }

    // Use PO Date as main date when present (for filtering/sorting)
    const getSaleDate = (s: Sale) => (s.poDate ? new Date(s.poDate) : new Date(s.createdAt));

    // Apply date filters (by PO Date when present)
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(s => getSaleDate(s) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => getSaleDate(s) <= toDate);
    }
    if (filters.month) {
      const [year, month] = filters.month.split('-');
      filtered = filtered.filter(s => {
        const saleDate = getSaleDate(s);
        return saleDate.getFullYear() === parseInt(year) && 
               saleDate.getMonth() === parseInt(month) - 1;
      });
    }
    if (filters.year) {
      filtered = filtered.filter(s => getSaleDate(s).getFullYear() === parseInt(filters.year));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      const parseInvoiceSequence = (s?: string): number => {
        if (!s) return -1;
        const str = String(s).trim();
        // Prefer patterns like C0001/2026 or R0123/2026
        const m = str.match(/^[A-Za-z]\s*(\d+)\s*\/\s*\d{4}$/);
        if (m?.[1]) return Number(m[1]);
        // Fallback: take first numeric group
        const g = str.match(/\d+/);
        return g ? Number(g[0]) : -1;
      };

      const parsePoSequence = (s?: string): number => {
        if (!s) return -1;
        const str = String(s).trim();
        // Prefer patterns like PO-71 / 25-26
        const m = str.match(/PO-?\s*(\d+)/i);
        if (m?.[1]) return Number(m[1]);
        const g = str.match(/\d+/);
        return g ? Number(g[0]) : -1;
      };
      
      switch (sortBy) {
        case 'invoiceNumber':
          aValue = a.invoiceNumber.toLowerCase();
          bValue = b.invoiceNumber.toLowerCase();
          break;
        case 'invoiceNumberNumeric':
          aValue = parseInvoiceSequence(a.invoiceNumber);
          bValue = parseInvoiceSequence(b.invoiceNumber);
          break;
        case 'canteenName':
          aValue = (a.canteenName || '').toLowerCase();
          bValue = (b.canteenName || '').toLowerCase();
          break;
        case 'totalAmount':
          aValue = Number(a.totalAmount);
          bValue = Number(b.totalAmount);
          break;
        case 'paymentMethod':
          aValue = a.paymentMethod.toLowerCase();
          bValue = b.paymentMethod.toLowerCase();
          break;
        case 'paymentStatus':
          aValue = a.paymentStatus.toLowerCase();
          bValue = b.paymentStatus.toLowerCase();
          break;
        case 'shipmentStatus':
          aValue = a.shipmentStatus.toLowerCase();
          bValue = b.shipmentStatus.toLowerCase();
          break;
        case 'poNumber':
          aValue = (a.poNumber || '').toLowerCase();
          bValue = (b.poNumber || '').toLowerCase();
          break;
        case 'poNumberNumeric':
          aValue = parsePoSequence(a.poNumber);
          bValue = parsePoSequence(b.poNumber);
          break;
        case 'poDate':
          aValue = (a.poDate ? new Date(a.poDate) : new Date(a.createdAt)).getTime();
          bValue = (b.poDate ? new Date(b.poDate) : new Date(b.createdAt)).getTime();
          break;
        case 'modeOfSales':
          aValue = (a.modeOfSales || '').toLowerCase();
          bValue = (b.modeOfSales || '').toLowerCase();
          break;
        case 'invoiceDate':
          aValue = (a.invoiceDate ? new Date(a.invoiceDate) : new Date(a.createdAt)).getTime();
          bValue = (b.invoiceDate ? new Date(b.invoiceDate) : new Date(b.createdAt)).getTime();
          break;
        case 'contact':
          aValue = ((a.canteenContact ?? a.contactPerson) || '').toLowerCase();
          bValue = ((b.canteenContact ?? b.contactPerson) || '').toLowerCase();
          break;
        case 'createdAt':
          aValue = (a.poDate ? new Date(a.poDate) : new Date(a.createdAt)).getTime();
          bValue = (b.poDate ? new Date(b.poDate) : new Date(b.createdAt)).getTime();
          break;
        default:
          aValue = (a.poDate ? new Date(a.poDate) : new Date(a.createdAt)).getTime();
          bValue = (b.poDate ? new Date(b.poDate) : new Date(b.createdAt)).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredSales(filtered);
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle sort change
  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      paymentMethod: '',
      paymentStatus: '',
      shipmentStatus: '',
      canteenId: '',
      dateFrom: '',
      dateTo: '',
      month: '',
      year: ''
    });
  };

  // Apply filters when sales or filters change
  useEffect(() => {
    applyFiltersAndSort();
  }, [sales, filters, sortBy, sortOrder]);

  const handleEditSale = (sale: Sale) => {
    setSelectedSale(sale);
    
    // Parse mode of sales and email
    let modeOfSales = sale.modeOfSales || '';
    let customerEmail = '';
    
    if (sale.modeOfSales && sale.modeOfSales.startsWith('email:')) {
      modeOfSales = 'email';
      customerEmail = sale.modeOfSales.split(':')[1] || '';
    }
    
    // Normalize dates from API (can be Date string with timezone) to YYYY-MM-DD for <input type="date">
    const normalizeDate = (d?: string) => {
      if (!d) return '';
      const str = String(d).trim();
      if (!str) return '';
      // If it's already YYYY-MM-DD, keep it
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      const dt = new Date(str);
      if (Number.isNaN(dt.getTime())) return '';
      // Format using local timezone to avoid "one day before" issues
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    setEditForm({
      paymentStatus: sale.paymentStatus,
      shipmentStatus: sale.shipmentStatus || 'pending', // Default to pending for canteen
      notes: '',
      invoiceNumber: sale.invoiceNumber,
      poNumber: sale.poNumber || '',
      poDate: normalizeDate(sale.poDate),
      invoiceDate: normalizeDate(sale.invoiceDate),
      customerName: sale.canteenName || sale.customerName || '',
      canteenAddressId: sale.canteenAddressId || '', // Use the actual canteen address ID from sale
      paymentMethod: sale.saleType === 'canteen' ? 'credit' : sale.paymentMethod, // Auto credit for canteen
      modeOfSales: modeOfSales,
      customerEmail: customerEmail
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleDeleteSale = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDeleteModal(true);
    setError('');
    setSuccess('');
  };

  const updateSale = async () => {
    if (!selectedSale) return;

    try {
      setIsUpdating(true);
      setError('');
      
      // Prepare data for update
      const updateData = { ...editForm };
      
      // Combine mode of sales with email if it's an email order
      if (editForm.modeOfSales === 'email' && editForm.customerEmail) {
        updateData.modeOfSales = `email:${editForm.customerEmail}`;
      }
      
      console.log('Updating sale with data:', updateData); // Debug log
      
      const response = await fetch(`/api/sales/${selectedSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Sale updated successfully');
        setShowEditModal(false);
        setSelectedSale(null);
        fetchCanteenSales(); // Refresh the list
      } else {
        setError(data.error || 'Failed to update sale');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteSale = async () => {
    if (!selectedSale) return;

    try {
      setIsDeleting(true);
      setError('');
      
      const response = await fetch(`/api/sales/${selectedSale.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Sale deleted successfully');
        setShowDeleteModal(false);
        setSelectedSale(null);
        fetchCanteenSales(); // Refresh the list
      } else {
        setError(data.error || 'Failed to delete sale');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedSale(null);
    setEditForm({ 
      paymentStatus: '', 
      shipmentStatus: '', 
      notes: '',
      invoiceNumber: '',
      poNumber: '',
      customerName: '',
      canteenAddressId: '',
      paymentMethod: '',
      modeOfSales: ''
    });
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedSale(null);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !['admin', 'retail_staff', 'accountant'].includes(session.user?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Canteen Sales</h1>
              <p className="mt-2 text-gray-600">Manage canteen sales and deliveries</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Link
                href="/dashboard/admin/sales/pos?type=canteen"
                className="w-full sm:w-auto text-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                New Canteen Sale
              </Link>
              <Link
                href="/dashboard/admin/canteen-addresses"
                className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Manage Addresses
              </Link>
              <span className="text-sm text-gray-700">
                Welcome, {session.user?.name}
              </span>
              <Link
                href="/dashboard/admin/sales"
                className="w-full sm:w-auto text-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                All Sales
              </Link>
              <Link
                href="/dashboard/admin/sales/retail"
                className="w-full sm:w-auto text-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Retail Sales
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Filters & Search</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Invoice, customer, canteen..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="credit">Credit</option>
                <option value="canteen_autopayment">Canteen Auto</option>
              </select>
            </div>

            {/* Payment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Status</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Shipment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipment Status</label>
              <select
                value={filters.shipmentStatus}
                onChange={(e) => handleFilterChange('shipmentStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Status</option>
                <option value="courier">Courier</option>
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="walk_in_delivery">Walk in delivery</option>
              </select>
            </div>

            {/* Canteen Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canteen</label>
              <select
                value={filters.canteenId}
                onChange={(e) => handleFilterChange('canteenId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Canteens</option>
                {canteenAddresses.map(addr => (
                  <option key={addr.id} value={addr.id}>
                    {addr.canteenName}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Month Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={filters.month}
                onChange={(e) => handleFilterChange('month', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Months</option>
                {availableMonths.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Year Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Years</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Sorting is available by clicking the table headers below */}
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Canteen Sales ({filteredSales.length})</h2>
          </div>
          
          <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Invoice - Always visible */}
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('invoiceNumberNumeric')}
                    title="Sort by invoice number (numeric)"
                  >
                    Invoice
                    {sortBy === 'invoiceNumberNumeric' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Canteen - Always visible */}
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('canteenName')}
                    title="Sort by canteen name"
                  >
                    Canteen
                    {sortBy === 'canteenName' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Amount - Always visible */}
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('totalAmount')}
                    title="Sort by total amount"
                  >
                    Total
                    {sortBy === 'totalAmount' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Payment Combined - Always visible */}
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('paymentStatus')}
                    title="Sort by payment status"
                  >
                    Payment
                    {sortBy === 'paymentStatus' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>

                  {/* PO Number & Date - Visible on tablet+ */}
                  <th
                    className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('poNumberNumeric')}
                    title="Sort by PO number (numeric)"
                  >
                    PO Number &amp; Date
                    {sortBy === 'poNumberNumeric' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Contact - Hidden on mobile, visible on desktop */}
                  <th
                    className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('contact')}
                    title="Sort by contact name"
                  >
                    Contact
                    {sortBy === 'contact' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Shipment - Hidden on mobile, visible on desktop */}
                  <th
                    className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('shipmentStatus')}
                    title="Sort by shipment status"
                  >
                    Shipment
                    {sortBy === 'shipmentStatus' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Actions - Always visible */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    {/* Invoice */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="space-y-1">
                        <div className="font-medium text-indigo-700">{sale.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">
                          {new Date((sale.invoiceDate || sale.createdAt) as any).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </td>
                    
                    {/* Canteen */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="max-w-32">
                        <div className="font-medium text-gray-900 flex items-center">
                          🏢 {sale.canteenName || 'Unknown'}
                        </div>
                        {sale.canteenAddress && (
                          <div className="text-xs text-gray-500 truncate">
                            {sale.canteenAddress}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Total Amount */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="font-semibold text-gray-900">₹{Number(sale.totalAmount).toFixed(2)}</div>
                    </td>
                    
                    {/* Payment Combined */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          sale.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' :
                          sale.paymentMethod === 'upi' ? 'bg-blue-100 text-blue-800' :
                          sale.paymentMethod === 'card' ? 'bg-purple-100 text-purple-800' :
                          sale.paymentMethod === 'credit' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sale.paymentMethod === 'cash' ? '💵 Cash' :
                           sale.paymentMethod === 'upi' ? '📱 UPI' :
                           sale.paymentMethod === 'card' ? '💳 Card' :
                           sale.paymentMethod === 'credit' ? '🏦 Credit' :
                           sale.paymentMethod}
                        </span>
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            sale.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            sale.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {sale.paymentStatus === 'paid'
                              ? 'Credited to our account'
                              : sale.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* PO Number & Date - Hidden on mobile */}
                    <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {sale.poNumber ? (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                              📋 {sale.poNumber}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No PO</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">PO Date:</span>{' '}
                          {sale.poDate ? new Date(sale.poDate).toLocaleDateString('en-GB') : '—'}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">Invoice Date:</span>{' '}
                          {new Date((sale.invoiceDate || sale.createdAt) as any).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </td>
                    
                    {/* Contact - from canteen (canteenContact/canteenMobile) or fallback */}
                    <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="max-w-28">
                        <div className="font-medium">{(sale.canteenContact ?? sale.contactPerson) || 'N/A'}</div>
                        {(sale.canteenMobile ?? sale.mobileNumber) && (
                          <div className="text-xs text-gray-500">{sale.canteenMobile ?? sale.mobileNumber}</div>
                        )}
                      </div>
                    </td>
                    
                    {/* Shipment - Hidden on mobile */}
                    <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        sale.shipmentStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                        sale.shipmentStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        sale.shipmentStatus === 'courier' ? 'bg-indigo-100 text-indigo-800' :
                        sale.shipmentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        sale.shipmentStatus === 'walk_in_delivery' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {sale.shipmentStatus}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col space-y-1">
                        <a 
                          href={`/api/sales/${sale.id}/invoice/html`} 
                          target="_blank" 
                          className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                        >
                          📄 Invoice
                        </a>
                        <button 
                          onClick={() => handleEditSale(sale)} 
                          className="text-blue-600 hover:text-blue-900 text-xs font-medium text-left"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteSale(sale)} 
                          className="text-red-600 hover:text-red-900 text-xs font-medium text-left"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Sale Modal */}
      {showEditModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Sale - {selectedSale.invoiceNumber}
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">Enhanced v2.0</span>
              </h3>
              
              <div className="space-y-4">
                {/* Invoice Number */}
                <div>
                  <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    id="invoiceNumber"
                    type="text"
                    value={editForm.invoiceNumber}
                    onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., C0000056/2025"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: C0001/2026 for canteen, R0001/2026 for retail</p>
                </div>

                {/* PO Number */}
                <div>
                  <label htmlFor="poNumber" className="block text-sm font-medium text-gray-700 mb-1">
                    PO Number (Customer Reference)
                  </label>
                  <input
                    id="poNumber"
                    type="text"
                    value={editForm.poNumber}
                    onChange={(e) => setEditForm({ ...editForm, poNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., PO-2025-001, REQ-123, 56-2025"
                  />
                  <p className="text-xs text-gray-500 mt-1">Customer's Purchase Order number</p>
                </div>

                {/* PO Date */}
                <div>
                  <label htmlFor="poDate" className="block text-sm font-medium text-gray-700 mb-1">
                    PO Date (Optional)
                  </label>
                  <input
                    id="poDate"
                    type="date"
                    value={editForm.poDate}
                    onChange={(e) => setEditForm({ ...editForm, poDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Purchase Order Date - appears as "Dated: [selected date]" on invoice</p>
                </div>

                {/* Invoice Date */}
                <div>
                  <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Date (Optional)
                  </label>
                  <input
                    id="invoiceDate"
                    type="date"
                    value={editForm.invoiceDate}
                    onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Invoice Date used when generating the invoice; defaults to created date if empty.</p>
                </div>

                {/* Mode of Sales */}
                <div>
                  <label htmlFor="modeOfSales" className="block text-sm font-medium text-gray-700 mb-1">
                    Mode of Sales
                  </label>
                  <select
                    id="modeOfSales"
                    value={editForm.modeOfSales}
                    onChange={(e) => {
                      setEditForm({ ...editForm, modeOfSales: e.target.value });
                      if (e.target.value !== 'email') {
                        setEditForm(prev => ({ ...prev, customerEmail: '' }));
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select mode...</option>
                    <option value="email">📧 Email Order</option>
                    <option value="phone">📞 Phone Order</option>
                    <option value="whatsapp">📱 WhatsApp Order</option>
                    <option value="walk_in">🚶 Walk-in Order</option>
                    <option value="online">💻 Online Order</option>
                  </select>
                  
                  {/* Email Input - Shows only when Email Order is selected */}
                  {editForm.modeOfSales === 'email' && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Email Address
                      </label>
                      <input
                        type="email"
                        value={editForm.customerEmail}
                        onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                        placeholder="customer@example.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">How the order was received</p>
                </div>

                {/* Customer/Canteen Selection */}
                <div>
                  <label htmlFor="canteenAddressId" className="block text-sm font-medium text-gray-700 mb-1">
                    {selectedSale?.saleType === 'canteen' ? 'Select Canteen' : 'Customer Name'}
                  </label>
                  {selectedSale?.saleType === 'canteen' ? (
                    <select
                      id="canteenAddressId"
                      value={editForm.canteenAddressId}
                      onChange={(e) => setEditForm({ ...editForm, canteenAddressId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Choose canteen...</option>
                      {canteenAddresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.canteenName} - {address.contactPerson}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="customerName"
                      type="text"
                      value={editForm.customerName}
                      onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter customer name..."
                    />
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  {selectedSale?.saleType === 'canteen' ? (
                    <div className="space-y-2">
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span className="text-orange-800 font-medium">Auto Credit Payment</span>
                        </div>
                        <p className="text-sm text-orange-600 mt-1">
                          Canteen orders are automatically processed on credit terms
                        </p>
                      </div>
                      <select
                        id="paymentMethod"
                        value={editForm.paymentMethod}
                        onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="credit">Credit (Default)</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                      </select>
                    </div>
                  ) : (
                    <select
                      id="paymentMethod"
                      value={editForm.paymentMethod}
                      onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="credit">Credit</option>
                    </select>
                  )}
                </div>

                <div>
                  <label htmlFor="paymentStatus" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status
                  </label>
                  <select
                    id="paymentStatus"
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Credited to our account</option>
                    <option value="partial">Partial</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="shipmentStatus" className="block text-sm font-medium text-gray-700 mb-1">
                    Shipment Status
                  </label>
                  <select
                    id="shipmentStatus"
                    value={editForm.shipmentStatus}
                    onChange={(e) => setEditForm({ ...editForm, shipmentStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="courier">Courier</option>
                    <option value="walk_in_delivery">Walk in delivery</option>
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    rows={3}
                    placeholder="Add any notes about this sale..."
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={updateSale}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Update Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Sale Modal */}
      {showDeleteModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Delete Sale - {selectedSale.invoiceNumber}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to delete this canteen sale? This action will:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
                  <li>Remove the sale record</li>
                  <li>Restore inventory quantities</li>
                  <li>Delete all associated sale items</li>
                </ul>
                <p className="text-sm font-medium text-red-600">
                  This action cannot be undone!
                </p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSale}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
