'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  category: string; // Produced | Purchased
  type: string; // Groundnut | Gingelly | Coconut | Deepam | Castor
  description: string | null;
  basePrice: number;
  retailPrice: number;
  gstRate: number;
  gstIncluded: boolean;
  unit: string;
  barcode: string | null;
  hsnCode: string | null;
  isActive: 0 | 1 | boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function AdminProductsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filter and sort states
  const [filters, setFilters] = useState({
    category: '',
    type: '',
    unit: '',
    status: '',
    search: ''
  });
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const availableTypes = Array.from(new Set(products.map((p) => p.type).filter(Boolean))).sort();
  const availableUnits = Array.from(new Set(products.map((p) => p.unit).filter(Boolean))).sort();

  const tableTopScrollRef = useRef<HTMLDivElement>(null);
  const tableMainScrollRef = useRef<HTMLDivElement>(null);
  const tableScrollSpacerRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const tableScrollSyncing = useRef(false);

  useLayoutEffect(() => {
    const table = tableRef.current;
    const spacer = tableScrollSpacerRef.current;
    if (!table || !spacer) return;
    const syncWidth = () => {
      spacer.style.width = `${table.scrollWidth}px`;
    };
    syncWidth();
    const ro = new ResizeObserver(syncWidth);
    ro.observe(table);
    return () => ro.disconnect();
  }, [filteredProducts.length, isLoading]);

  const onTableTopScroll = () => {
    if (tableScrollSyncing.current) return;
    tableScrollSyncing.current = true;
    const top = tableTopScrollRef.current;
    const main = tableMainScrollRef.current;
    if (top && main) main.scrollLeft = top.scrollLeft;
    requestAnimationFrame(() => {
      tableScrollSyncing.current = false;
    });
  };

  const onTableMainScroll = () => {
    if (tableScrollSyncing.current) return;
    tableScrollSyncing.current = true;
    const top = tableTopScrollRef.current;
    const main = tableMainScrollRef.current;
    if (top && main) top.scrollLeft = main.scrollLeft;
    requestAnimationFrame(() => {
      tableScrollSyncing.current = false;
    });
  };

  const isAdmin = session?.user?.role === 'admin';

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!['admin', 'retail_staff'].includes(session.user?.role || '')) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (pathname !== '/dashboard/admin/products') return;
    if (['admin', 'retail_staff'].includes(session?.user?.role || '')) {
      fetchProducts();
    }
  }, [session, pathname]);

  // Apply filters and sorting whenever products or filters change
  useEffect(() => {
    applyFiltersAndSort();
  }, [products, filters, sortBy, sortOrder]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/products?isActive=true', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok) setProducts(data.products || []);
      else setError(data.error || 'Failed to load products');
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Apply filters and sorting
  const applyFiltersAndSort = () => {
    let filtered = [...products];

    // Apply filters
    if (filters.category) {
      filtered = filtered.filter(p => p.category === filters.category);
    }
    if (filters.type) {
      filtered = filtered.filter(p => p.type === filters.type);
    }
    if (filters.unit) {
      filtered = filtered.filter(p => p.unit === filters.unit);
    }
    if (filters.status) {
      if (filters.status === 'active') {
        filtered = filtered.filter(p => p.isActive);
      } else if (filters.status === 'inactive') {
        filtered = filtered.filter(p => !p.isActive);
      }
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.type.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = Number(a.retailPrice);
          bValue = Number(b.retailPrice);
          break;
        case 'category':
          aValue = a.category.toLowerCase();
          bValue = b.category.toLowerCase();
          break;
        case 'type':
          aValue = a.type.toLowerCase();
          bValue = b.type.toLowerCase();
          break;
        case 'unit':
          aValue = a.unit.toLowerCase();
          bValue = b.unit.toLowerCase();
          break;
        case 'created':
          aValue = new Date(a.createdAt || '').getTime();
          bValue = new Date(b.createdAt || '').getTime();
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredProducts(filtered);
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
      category: '',
      type: '',
      unit: '',
      status: '',
      search: ''
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccess('Product deleted');
        fetchProducts();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !['admin', 'retail_staff'].includes(session.user?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Products</h1>
            <p className="mt-2 text-gray-600">Manage all oil products</p>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span><strong>Base Price (Canteen):</strong> GST Excluded - Used for canteen sales</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  <span><strong>Retail Price:</strong> GST Included - Used for retail sales</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/products/new"
              className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Add Product
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto text-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">{error}</div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">{success}</div>
        )}

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">All Products</h2>
              <div className="text-sm text-gray-500">
                Showing {filteredProducts.length} of {products.length} products
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
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Categories</option>
                  <option value="Produced">Produced</option>
                  <option value="Purchased">Purchased</option>
                </select>
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Types</option>
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Unit Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select
                  value={filters.unit}
                  onChange={(e) => handleFilterChange('unit', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Units</option>
                  {availableUnits.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
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
          <div className="px-4 py-2.5 sm:px-6 border-b border-indigo-100 bg-indigo-50/90 text-xs sm:text-sm text-indigo-950 leading-snug">
            <span className="font-semibold">Edit / Delete</span> are in the{' '}
            <span className="whitespace-nowrap font-medium text-indigo-800">right column</span>. Scroll horizontally
            (strip above or scrollbar under the table).{' '}
            <span className="text-indigo-800/90">Product name stays pinned on the left.</span>
          </div>
          <div
            ref={tableTopScrollRef}
            onScroll={onTableTopScroll}
            className="overflow-x-auto overflow-y-hidden overscroll-x-contain border-b border-gray-200 bg-gray-50"
            style={{ WebkitOverflowScrolling: 'touch' }}
            aria-label="Horizontal scroll for products table (synced)"
          >
            <div ref={tableScrollSpacerRef} className="h-2.5 shrink-0" aria-hidden />
          </div>
          <div
            ref={tableMainScrollRef}
            onScroll={onTableMainScroll}
            className="max-h-[min(75vh,42rem)] overflow-auto overscroll-contain [scrollbar-gutter:auto]"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <table ref={tableRef} className="min-w-max w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_0_0_rgb(229,231,235)]">
                <tr>
                  <th
                    className="sticky top-0 left-0 z-30 bg-gray-50 px-3 py-2 sm:px-4 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap border-r border-gray-200 shadow-[4px_0_12px_-6px_rgba(15,23,42,0.12)] hover:bg-gray-100"
                    onClick={() => handleSortChange('name')}
                  >
                    Name {sortBy === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    className="sticky top-0 z-10 bg-gray-50 px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-gray-100"
                    onClick={() => handleSortChange('category')}
                  >
                    Category {sortBy === 'category' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    className="sticky top-0 z-10 bg-gray-50 px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-gray-100"
                    onClick={() => handleSortChange('type')}
                  >
                    Type {sortBy === 'type' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    Base Price (Canteen)
                  </th>
                  <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    GST Amount
                  </th>
                  <th
                    className="sticky top-0 z-10 bg-gray-50 px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-gray-100"
                    onClick={() => handleSortChange('price')}
                  >
                    Retail Price (GST Inc.) {sortBy === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    GST Rate
                  </th>
                  <th className="sticky top-0 z-10 bg-gray-50 px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    HSN Code
                  </th>
                  <th
                    className="sticky top-0 z-10 bg-gray-50 px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none whitespace-nowrap hover:bg-gray-100"
                    onClick={() => handleSortChange('unit')}
                  >
                    Unit {sortBy === 'unit' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th
                    className="sticky top-0 right-0 z-30 min-w-[8.5rem] bg-indigo-50 px-2 py-2 sm:px-3 sm:py-3 text-left text-xs font-semibold text-indigo-900 uppercase tracking-wide whitespace-nowrap border-l border-indigo-200 shadow-[-4px_0_14px_-6px_rgba(15,23,42,0.15)]"
                    title="Edit, Delete"
                  >
                    Edit / del
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-10 text-center text-sm text-gray-500">
                      No products match your filters.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p) => {
                    const basePrice = Number(p.basePrice || 0);
                    const retailPrice = Number(p.retailPrice || 0);
                    const gstRate = Number(p.gstRate || 0);
                    const gstIncluded = p.gstIncluded;

                    let gstAmount = 0;
                    let actualBasePrice = basePrice;

                    if (gstIncluded) {
                      gstAmount = (retailPrice * gstRate) / (100 + gstRate);
                      actualBasePrice = retailPrice - gstAmount;
                    } else {
                      gstAmount = (basePrice * gstRate) / 100;
                      actualBasePrice = basePrice;
                    }

                    return (
                      <tr key={p.id} className="group hover:bg-gray-50">
                        <td className="sticky left-0 z-20 border-r border-gray-200 bg-white px-3 py-2 sm:px-4 sm:py-4 text-sm text-gray-900 shadow-[4px_0_12px_-8px_rgba(15,23,42,0.1)] group-hover:bg-gray-50 min-w-[12rem] max-w-[18rem]">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{p.name}</span>
                            <span
                              className={`px-2 py-0.5 text-xs rounded-full whitespace-nowrap ${
                                gstIncluded ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {gstIncluded ? 'GST Inc.' : 'GST Exc.'}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700">{p.category}</td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700">{p.type}</td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700">
                          <div className="flex flex-col">
                            <span className="font-medium text-blue-600">₹ {actualBasePrice.toFixed(2)}</span>
                            <span className="text-xs text-gray-500">GST Excluded</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700">₹ {gstAmount.toFixed(2)}</td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700">
                          <div className="flex flex-col">
                            <span className="font-medium text-green-600">₹ {retailPrice.toFixed(2)}</span>
                            <span className="text-xs text-gray-500">GST Included</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700">{gstRate.toFixed(2)}%</td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700">{p.hsnCode || '—'}</td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-sm text-gray-700">{p.unit}</td>
                        <td className="sticky right-0 z-20 border-l border-indigo-100 bg-indigo-50/40 px-2 py-2 sm:px-3 sm:py-3 align-top shadow-[-4px_0_14px_-8px_rgba(15,23,42,0.12)] group-hover:bg-indigo-50/70">
                          <div className="flex flex-col gap-1.5 min-w-[7.25rem]">
                            {isAdmin ? (
                              <>
                                <Link
                                  href={`/dashboard/admin/products/${p.id}`}
                                  className="w-full rounded-md border border-blue-200 bg-white px-2 py-1.5 text-center text-xs font-semibold text-blue-800 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
                                >
                                  Edit
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(p.id)}
                                  className="w-full rounded-md border border-red-200 bg-white px-2 py-1.5 text-center text-xs font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 text-center py-1">Admin only</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}



