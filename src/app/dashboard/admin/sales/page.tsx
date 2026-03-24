'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StatusBadge, useToast } from '@/components/ui';
import { getQueueCount } from '@/lib/offlineQueue';
import {
  getFinancialYearLabelForDate,
  isDateInFinancialYear,
  parseFinancialYearLabelToStartYear,
} from '@/lib/financialYear';

interface SaleRow {
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
  userName: string;
  customerName?: string;
  canteenName?: string;
  canteenAddress?: string;
  contactPerson?: string;
  mobileNumber?: string;
  poNumber?: string;
  poDate?: string;
  invoiceDate?: string;
  canteenAddressId?: string;
}

export default function AdminSalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [filteredSales, setFilteredSales] = useState<SaleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter and sort states
  const [filters, setFilters] = useState({
    saleType: '',
    paymentMethod: '',
    paymentStatus: '',
    shipmentStatus: '',
    search: '',
    dateFrom: '',
    dateTo: '',
    month: '',
    year: ''
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [availableMonths, setAvailableMonths] = useState<{value: string, label: string}[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRow | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { addToast, ToastContainer } = useToast();
  const [queueCount, setQueueCount] = useState(0);
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
    paymentMethod: ''
  });
  const [canteenAddresses, setCanteenAddresses] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (!['admin', 'retail_staff', 'accountant'].includes(session.user?.role || '')) { router.push('/dashboard'); return; }
  }, [session, status, router]);

  useEffect(() => { 
    if (session?.user && ['admin', 'retail_staff', 'accountant'].includes(session.user.role)) {
      fetchSales(); 
      fetchCanteenAddresses();
    }
  }, [session]);

  useEffect(() => {
    const update = async () => setQueueCount(await getQueueCount());
    update();
    const onUpdate = (e: any) => setQueueCount(e.detail?.count || 0);
    window.addEventListener('offline-queue-update' as any, onUpdate);
    return () => window.removeEventListener('offline-queue-update' as any, onUpdate);
  }, []);

  // Apply filters and sorting whenever sales or filters change
  useEffect(() => {
    applyFiltersAndSort();
  }, [sales, filters, sortBy, sortOrder]);

  const fetchSales = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/sales?limit=100');
      const data = await res.json();
      if (res.ok) {
        setSales(data.sales || []);
        extractAvailableDates(data.sales || []);
      } else setError(data.error || 'Failed to load sales');
    } catch (e) { setError('Network error. Please try again.'); }
    finally { setIsLoading(false); }
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

  // Extract available months and years from sales data
  const extractAvailableDates = (salesData: SaleRow[]) => {
    const months = new Set<string>();
    const years = new Set<string>();
    
    salesData.forEach(sale => {
      const date = new Date(sale.invoiceDate || sale.createdAt);
      const calYear = date.getFullYear().toString();
      const month = `${calYear}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      years.add(getFinancialYearLabelForDate(date));
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
    if (filters.saleType) {
      filtered = filtered.filter(s => s.saleType === filters.saleType);
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
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.invoiceNumber.toLowerCase().includes(searchLower) ||
        s.userName.toLowerCase().includes(searchLower) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchLower)) ||
        (s.canteenName && s.canteenName.toLowerCase().includes(searchLower))
      );
    }

    // Apply date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(s => new Date(s.createdAt) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999); // Include the entire end date
      filtered = filtered.filter(s => new Date(s.createdAt) <= toDate);
    }
    if (filters.month) {
      const [year, month] = filters.month.split('-');
      filtered = filtered.filter(s => {
        const saleDate = new Date(s.createdAt);
        return saleDate.getFullYear() === parseInt(year) && 
               saleDate.getMonth() === parseInt(month) - 1;
      });
    }
    if (filters.year) {
      const fyStart = parseFinancialYearLabelToStartYear(filters.year);
      filtered = filtered.filter(s => {
        const saleDate = new Date(s.invoiceDate || s.createdAt);
        return fyStart !== null && isDateInFinancialYear(saleDate, fyStart);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      const parseInvoiceSequence = (s?: string): number => {
        if (!s) return -1;
        const str = String(s).trim();
        const m = str.match(/^[A-Za-z]\s*(\d+)\s*\/\s*(?:\d{4}-\d{2}|\d{4})$/);
        if (m?.[1]) return Number(m[1]);
        const g = str.match(/\d+/);
        return g ? Number(g[0]) : -1;
      };

      const parsePoSequence = (s?: string): number => {
        if (!s) return -1;
        const str = String(s).trim();
        const m = str.match(/PO-?\s*(\d+)/i);
        if (m?.[1]) return Number(m[1]);
        const g = str.match(/\d+/);
        return g ? Number(g[0]) : -1;
      };
      
      switch (sortBy) {
        case 'invoiceNumber':
          // keep old key for compatibility; sort numerically
          aValue = parseInvoiceSequence(a.invoiceNumber);
          bValue = parseInvoiceSequence(b.invoiceNumber);
          break;
        case 'poNumber':
          // sort PO numerically
          aValue = parsePoSequence(a.poNumber);
          bValue = parsePoSequence(b.poNumber);
          break;
        case 'invoiceDate':
          aValue = new Date(a.invoiceDate || a.createdAt).getTime();
          bValue = new Date(b.invoiceDate || b.createdAt).getTime();
          break;
        case 'poDate':
          aValue = new Date(a.poDate || a.createdAt).getTime();
          bValue = new Date(b.poDate || b.createdAt).getTime();
          break;
        case 'totalAmount':
          aValue = Number(a.totalAmount);
          bValue = Number(b.totalAmount);
          break;
        case 'saleType':
          aValue = a.saleType.toLowerCase();
          bValue = b.saleType.toLowerCase();
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
        case 'customerName':
          aValue = (a.canteenName || a.customerName || '').toLowerCase();
          bValue = (b.canteenName || b.customerName || '').toLowerCase();
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        default:
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
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
      saleType: '',
      paymentMethod: '',
      paymentStatus: '',
      shipmentStatus: '',
      search: '',
      dateFrom: '',
      dateTo: '',
      month: '',
      year: ''
    });
  };

  const handleEditSale = (sale: SaleRow) => {
    setSelectedSale(sale);
    const normalizeDate = (d?: string) => {
      if (!d) return '';
      const str = String(d).trim();
      if (!str) return '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      const dt = new Date(str);
      if (Number.isNaN(dt.getTime())) return '';
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };
    const poDateVal = normalizeDate(sale.poDate);
    const invDateVal = normalizeDate(sale.invoiceDate) || normalizeDate(sale.createdAt);
    setEditForm({
      paymentStatus: sale.paymentStatus,
      shipmentStatus: sale.shipmentStatus || 'walk_in_delivery',
      notes: '',
      invoiceNumber: sale.invoiceNumber,
      poNumber: sale.poNumber || '',
      poDate: poDateVal,
      invoiceDate: invDateVal,
      customerName: sale.canteenName || sale.customerName || '',
      canteenAddressId: sale.canteenAddressId || '',
      paymentMethod: sale.saleType === 'canteen' ? 'credit' : sale.paymentMethod
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleDeleteSale = (sale: SaleRow) => {
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
      
      const response = await fetch(`/api/sales/${selectedSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Sale updated successfully');
        setShowEditModal(false);
        setSelectedSale(null);
        fetchSales(); // Refresh the list
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
        fetchSales(); // Refresh the list
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
      poDate: '',
      invoiceDate: '',
      customerName: '',
      canteenAddressId: '',
      paymentMethod: ''
    });
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedSale(null);
  };

  if (status === 'loading' || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-lg">Loading...</div></div>;
  }
  if (!session || !['admin', 'retail_staff', 'accountant'].includes(session.user?.role || '')) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-lg">Access Denied</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {queueCount > 0 && (
          <div className="mb-4 p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800">
            {queueCount} action(s) pending sync. They will be sent when you’re online.
          </div>
        )}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales</h1>
            <p className="mt-2 text-gray-600">View recent sales and create new ones</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/admin/sales/retail" className="w-full sm:w-auto text-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium">Retail Sales</Link>
            <Link href="/dashboard/admin/sales/canteen" className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">Canteen Sales</Link>
            <Link href="/dashboard/admin/sales/pos" className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium">Create New Sale</Link>
            <Link href="/dashboard" className="w-full sm:w-auto text-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium">Back to Dashboard</Link>
          </div>
        </div>

        {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">{error}</div>}
        {success && <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">{success}</div>}

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Recent Sales</h2>
              <div className="text-sm text-gray-500">
                Showing {filteredSales.length} of {sales.length} sales
              </div>
            </div>
          </div>

          {/* Filters and Search Section */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search by invoice or user..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Sale Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sale Type</label>
                <select
                  value={filters.saleType}
                  onChange={(e) => handleFilterChange('saleType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Types</option>
                  <option value="retail">Retail</option>
                  <option value="canteen">Canteen</option>
                </select>
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
                  <option value="pending">Pending</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="walk_in_delivery">Walk in delivery</option>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Financial year (Apr–Mar)</label>
                <select
                  value={filters.year}
                  onChange={(e) => handleFilterChange('year', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All FY</option>
                  {availableYears.map(year => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Clear Filters
              </button>
            </div>
          </div>
          <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Invoice (number + date) */}
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('invoiceNumber')}
                    title="Sort by invoice number"
                  >
                    <div className="flex items-center gap-1">
                      Invoice No &amp; Date
                      {sortBy === 'invoiceNumber' && (
                        <span className="text-indigo-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>

                  {/* Canteen / Customer */}
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('customerName')}
                    title="Sort by canteen/customer"
                  >
                    <div className="flex items-center gap-1">
                      Canteen / Customer
                      {sortBy === 'customerName' && (
                        <span className="text-indigo-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  
                  {/* Total Amount - Always visible */}
                  <th 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('totalAmount')}
                  >
                    <div className="flex items-center gap-1">
                      Total
                      {sortBy === 'totalAmount' && (
                        <span className="text-indigo-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  
                  {/* Payment & Status - Combined column */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  
                  {/* PO Number & Date */}
                  <th
                    className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('poNumber')}
                    title="Sort by PO number"
                  >
                    <div className="flex items-center gap-1">
                      PO Number &amp; Date
                      {sortBy === 'poNumber' && (
                        <span className="text-indigo-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>

                  {/* Contact */}
                  <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  
                  {/* Shipment - Hidden on mobile, visible on desktop */}
                  <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shipment
                  </th>
                  
                  {/* Actions - Always visible */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    {/* Invoice */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="space-y-1">
                        <div className="font-medium text-indigo-700">{s.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">
                          {new Date((s.invoiceDate || s.createdAt) as any).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </td>
                    
                    {/* Canteen / Customer */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="max-w-44">
                        <div className="font-medium text-gray-900 flex items-center gap-1">
                          {s.saleType === 'canteen' ? '🏢' : '🏪'} {s.canteenName || s.customerName || '—'}
                        </div>
                        {s.canteenAddress && (
                          <div className="text-xs text-gray-500 truncate">
                            {s.canteenAddress}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Total Amount */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="font-semibold text-gray-900">₹{Number(s.totalAmount).toFixed(2)}</div>
                    </td>
                    
                    {/* Payment & Status Combined */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="space-y-1">
                        <div className="text-xs text-gray-600 capitalize font-medium">
                          {s.paymentMethod === 'cash' && '💵'} 
                          {s.paymentMethod === 'upi' && '📱'} 
                          {s.paymentMethod === 'card' && '💳'} 
                          {s.paymentMethod === 'credit' && '🏦'} 
                          {s.paymentMethod === 'canteen_autopayment' && '🏢'} 
                          {s.paymentMethod.replace('_', ' ')}
                        </div>
                        <StatusBadge status={s.paymentStatus} type="payment" size="sm" />
                      </div>
                    </td>
                    
                    {/* PO Number & Date */}
                    <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {s.poNumber ? (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                              📋 {s.poNumber}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No PO</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">PO Date:</span>{' '}
                          {s.poDate ? new Date(s.poDate).toLocaleDateString('en-GB') : '—'}
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="max-w-32">
                        <div className="font-medium">{s.contactPerson || '—'}</div>
                        {s.mobileNumber && (
                          <div className="text-xs text-gray-500">{s.mobileNumber}</div>
                        )}
                      </div>
                    </td>
                    
                    {/* Shipment - Hidden on mobile */}
                    <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        s.shipmentStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                        s.shipmentStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        s.shipmentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {s.shipmentStatus}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="flex flex-col space-y-1">
                        <a 
                          href={`/api/sales/${s.id}/invoice/html`} 
                          target="_blank" 
                          className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                        >
                          📄 Invoice
                        </a>
                        {(s as any).referencePdfPath && (
                          <a
                            href={(s as any).referencePdfPath}
                            target="_blank"
                            rel="noreferrer"
                            className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                          >
                            📎 View Reference PDF
                          </a>
                        )}
                        <button 
                          onClick={() => handleEditSale(s)} 
                          className="text-blue-600 hover:text-blue-900 text-xs font-medium text-left"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteSale(s)} 
                          className="text-red-600 hover:text-red-900 text-xs font-medium text-left"
                        >
                          🗑️ Del
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
                    placeholder={selectedSale.saleType === 'canteen' ? 'e.g., C0000056/2025' : 'e.g., R0000056/2025'}
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: C0001/2024-25 (FY Apr–Mar) for canteen, R0001/2024-25 for retail. Legacy /2026 still accepted.</p>
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
                    placeholder="e.g., PO-2025-001, REQ-123, 56"
                  />
                  <p className="text-xs text-gray-500 mt-1">Customer's Purchase Order number</p>
                </div>

                {/* PO Date */}
                <div>
                  <label htmlFor="poDate" className="block text-sm font-medium text-gray-700 mb-1">
                    PO Date
                  </label>
                  <input
                    id="poDate"
                    type="date"
                    value={editForm.poDate}
                    onChange={(e) => setEditForm({ ...editForm, poDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Purchase Order date (Dated on invoice)</p>
                </div>

                {/* Invoice Date */}
                <div>
                  <label htmlFor="invoiceDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Invoice Date
                  </label>
                  <input
                    id="invoiceDate"
                    type="date"
                    value={editForm.invoiceDate}
                    onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Date shown as Invoice Date on the invoice</p>
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
                    <option value="paid">Paid</option>
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
                  Are you sure you want to delete this sale? This action will:
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
      
      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}


