'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getFinancialYearLabelForDate,
  isDateInFinancialYear,
  parseFinancialYearLabelToStartYear,
} from '@/lib/financialYear';

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
  userName: string;
  customerName?: string;
  canteenName?: string;
  canteenAddress?: string;
  contactPerson?: string;
  mobileNumber?: string;
  poNumber?: string;
  canteenAddressId?: string;
  modeOfSales?: string;
}

export default function RetailSalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter and sort states
  const [filters, setFilters] = useState({
    search: '',
    paymentMethod: '',
    paymentStatus: '',
    shipmentStatus: '',
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
    customerName: '',
    canteenAddressId: '',
    paymentMethod: '',
    modeOfSales: ''
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

  // Fetch retail sales
  useEffect(() => {
    if (session?.user && ['admin', 'retail_staff', 'accountant'].includes(session.user.role)) {
      fetchRetailSales();
    }
  }, [session]);

  const fetchRetailSales = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sales?category=retail&limit=100');
      const data = await response.json();
      
      if (response.ok) {
        setSales(data.sales);
        extractAvailableDates(data.sales);
      } else {
        setError(data.error || 'Failed to fetch retail sales');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Extract available months and years from sales data
  const extractAvailableDates = (salesData: Sale[]) => {
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
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.invoiceNumber.toLowerCase().includes(searchLower) ||
        s.userName.toLowerCase().includes(searchLower) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchLower))
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

    // Apply date filters
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(s => new Date(s.createdAt) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
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
      
      switch (sortBy) {
        case 'invoiceNumber':
          aValue = a.invoiceNumber.toLowerCase();
          bValue = b.invoiceNumber.toLowerCase();
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
      search: '',
      paymentMethod: '',
      paymentStatus: '',
      shipmentStatus: '',
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
    
    setEditForm({
      paymentStatus: sale.paymentStatus,
      shipmentStatus: sale.shipmentStatus || 'walk_in_delivery', // Default to walk in delivery
      notes: '',
      invoiceNumber: sale.invoiceNumber,
      poNumber: sale.poNumber || '',
      customerName: sale.customerName || '',
      canteenAddressId: sale.canteenAddressId || '',
      paymentMethod: sale.paymentMethod
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
        fetchRetailSales(); // Refresh the list
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
        fetchRetailSales(); // Refresh the list
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
      paymentMethod: ''
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
              <h1 className="text-3xl font-bold text-gray-900">Retail Sales</h1>
              <p className="mt-2 text-gray-600">Manage retail store sales and invoices</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Link
                href="/dashboard/admin/sales/pos"
                className="w-full sm:w-auto text-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                New Retail Sale
              </Link>
              <span className="text-sm text-gray-700">
                Welcome, {session.user?.name} (Admin)
              </span>
              <Link
                href="/dashboard/admin/sales"
                className="w-full sm:w-auto text-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                All Sales
              </Link>
              <Link
                href="/dashboard/admin/sales/canteen"
                className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Canteen Sales
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
                placeholder="Invoice, customer..."
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

            {/* Financial year (India Apr–Mar) */}
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
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Sales Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Retail Sales ({filteredSales.length})</h2>
          </div>
          
          <div className="overflow-x-auto shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {/* Invoice - Always visible */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  
                  {/* Customer - Always visible */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  
                  {/* Amount - Always visible */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  
                  {/* Payment Combined - Always visible */}
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment
                  </th>
                  
                  {/* Date - Hidden on mobile, visible on tablet+ */}
                  <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
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
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    {/* Invoice */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="font-medium text-indigo-700">{sale.invoiceNumber}</div>
                    </td>
                    
                    {/* Customer */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center">
                        <span className="text-gray-900">
                          {sale.customerName ? `👤 ${sale.customerName}` : '🚶 Walk-in'}
                        </span>
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
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sale.paymentMethod === 'cash' ? '💵 Cash' :
                           sale.paymentMethod === 'upi' ? '📱 UPI' :
                           sale.paymentMethod === 'card' ? '💳 Card' :
                           sale.paymentMethod}
                        </span>
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            sale.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            sale.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {sale.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </td>
                    
                    {/* Date - Hidden on mobile */}
                    <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div>{new Date(sale.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">{new Date(sale.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    </td>
                    
                    {/* Shipment - Hidden on mobile */}
                    <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        sale.shipmentStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                        sale.shipmentStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        sale.shipmentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
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
                    placeholder="e.g., R0000056/2025"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: C0001/2024-25 (FY) for canteen, R0001/2024-25 for retail. Legacy /2026 still accepted.</p>
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

                {/* Customer Name */}
                <div>
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name
                  </label>
                  <input
                    id="customerName"
                    type="text"
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter customer name..."
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
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
    </div>
  );
}
