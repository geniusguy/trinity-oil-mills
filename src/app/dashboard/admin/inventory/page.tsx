'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQueueCount } from '@/lib/offlineQueue';

interface InventoryRow {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  location: string;
  category?: string;
  type?: string;
  status?: string;
}

export default function AdminInventoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Enhanced filter and sort states
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    type: '',
    unit: '',
    location: '',
    status: '',
    stockLevel: ''
  });
  const [sortBy, setSortBy] = useState('productName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [queueCount, setQueueCount] = useState(0);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { router.push('/login'); return; }
    if (!['admin', 'retail_staff'].includes(session.user?.role || '')) { router.push('/dashboard'); return; }
  }, [session, status, router]);

  useEffect(() => { if (['admin', 'retail_staff'].includes(session?.user?.role || '')) fetchItems(); }, [session]);

  useEffect(() => {
    const update = async () => setQueueCount(await getQueueCount());
    update();
    const onUpdate = (e: any) => setQueueCount(e.detail?.count || 0);
    window.addEventListener('offline-queue-update' as any, onUpdate);
    return () => window.removeEventListener('offline-queue-update' as any, onUpdate);
  }, []);

  // Apply filters and sorting whenever items or filters change
  useEffect(() => {
    applyFiltersAndSort();
  }, [items, filters, sortBy, sortOrder]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/inventory');
      const data = await res.json();
      if (res.ok) setItems(data.inventory || []);
      else setError(data.error || 'Failed to load inventory');
    } catch (e) {
      setError('Network error. Please try again.');
    } finally { setIsLoading(false); }
  };

  // Apply filters and sorting
  const applyFiltersAndSort = () => {
    let filtered = [...items];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(item => 
        item.productName.toLowerCase().includes(searchLower) ||
        item.unit.toLowerCase().includes(searchLower) ||
        item.location.toLowerCase().includes(searchLower)
      );
    }
    if (filters.category) {
      filtered = filtered.filter(item => item.category === filters.category);
    }
    if (filters.type) {
      filtered = filtered.filter(item => item.type === filters.type);
    }
    if (filters.unit) {
      filtered = filtered.filter(item => item.unit === filters.unit);
    }
    if (filters.location) {
      filtered = filtered.filter(item => item.location === filters.location);
    }
    if (filters.stockLevel) {
      filtered = filtered.filter(item => {
        const qty = Number(item.quantity);
        const minStock = Number(item.minStock);
        const maxStock = Number(item.maxStock);
        
        switch (filters.stockLevel) {
          case 'low':
            return qty <= minStock;
          case 'normal':
            return qty > minStock && qty <= maxStock;
          case 'high':
            return qty > maxStock;
          case 'out':
            return qty === 0;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'productName':
          aValue = a.productName.toLowerCase();
          bValue = b.productName.toLowerCase();
          break;
        case 'unit':
          aValue = a.unit.toLowerCase();
          bValue = b.unit.toLowerCase();
          break;
        case 'quantity':
          aValue = Number(a.quantity);
          bValue = Number(b.quantity);
          break;
        case 'minStock':
          aValue = Number(a.minStock);
          bValue = Number(b.minStock);
          break;
        case 'maxStock':
          aValue = Number(a.maxStock);
          bValue = Number(b.maxStock);
          break;
        case 'location':
          aValue = a.location.toLowerCase();
          bValue = b.location.toLowerCase();
          break;
        case 'category':
          aValue = (a.category || '').toLowerCase();
          bValue = (b.category || '').toLowerCase();
          break;
        case 'type':
          aValue = (a.type || '').toLowerCase();
          bValue = (b.type || '').toLowerCase();
          break;
        default:
          aValue = a.productName.toLowerCase();
          bValue = b.productName.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredItems(filtered);
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
      category: '',
      type: '',
      unit: '',
      location: '',
      status: '',
      stockLevel: ''
    });
  };

  // Get unique values for filter options
  const getUniqueValues = (key: keyof InventoryRow) => {
    return [...new Set(items.map(item => item[key]).filter(Boolean))];
  };


  if (status === 'loading' || isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-lg">Loading...</div></div>;
  }
  if (!session || !['admin', 'retail_staff'].includes(session.user?.role || '')) {
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
            <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
            <p className="mt-2 text-gray-600">Monitor stock levels, track inventory, and manage warehouse operations</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/admin/products" className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">Products</Link>
            <Link href="/dashboard" className="w-full sm:w-auto text-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium">Back to Dashboard</Link>
          </div>
        </div>

        {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">{error}</div>}
        {success && <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">{success}</div>}

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">Inventory Overview</h2>
              <div className="text-sm text-gray-500">
                Showing {filteredItems.length} of {items.length} items
              </div>
            </div>
          </div>

          {/* Enhanced Filters and Search Section */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {/* Search */}
              <div className="md:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  placeholder="Search products, units, or locations..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
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
                  {getUniqueValues('unit').map(unit => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <select
                  value={filters.location}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Locations</option>
                  {getUniqueValues('location').map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              {/* Stock Level Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Level</label>
                <select
                  value={filters.stockLevel}
                  onChange={(e) => handleFilterChange('stockLevel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All Levels</option>
                  <option value="out">Out of Stock</option>
                  <option value="low">Low Stock</option>
                  <option value="normal">Normal Stock</option>
                  <option value="high">High Stock</option>
                </select>
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
                  {getUniqueValues('category').map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
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
                  {getUniqueValues('type').map(type => (
                    <option key={type} value={type}>{type}</option>
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('productName')}
                  >
                    <div className="flex items-center gap-1">
                      Product
                      {sortBy === 'productName' && (
                        <span className="text-indigo-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('unit')}
                  >
                    <div className="flex items-center gap-1">
                      Unit
                      {sortBy === 'unit' && (
                        <span className="text-indigo-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('quantity')}
                  >
                    <div className="flex items-center gap-1">
                      Current Stock
                      {sortBy === 'quantity' && (
                        <span className="text-indigo-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('minStock')}
                  >
                    <div className="flex items-center gap-1">
                      Min Stock
                      {sortBy === 'minStock' && (
                        <span className="text-indigo-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('maxStock')}
                  >
                    <div className="flex items-center gap-1">
                      Max Stock
                      {sortBy === 'maxStock' && (
                        <span className="text-indigo-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('location')}
                  >
                    <div className="flex items-center gap-1">
                      Location
                      {sortBy === 'location' && (
                        <span className="text-indigo-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((i) => {
                  const quantity = Number(i.quantity);
                  const minStock = Number(i.minStock);
                  const maxStock = Number(i.maxStock);
                  
                  // Determine stock level and styling
                  let stockLevel = 'normal';
                  let stockClass = 'text-gray-700';
                  let stockBadge = '';
                  
                  if (quantity === 0) {
                    stockLevel = 'out';
                    stockClass = 'text-red-600 font-semibold';
                    stockBadge = 'bg-red-100 text-red-800';
                  } else if (quantity <= minStock) {
                    stockLevel = 'low';
                    stockClass = 'text-orange-600 font-semibold';
                    stockBadge = 'bg-orange-100 text-orange-800';
                  } else if (quantity > maxStock) {
                    stockLevel = 'high';
                    stockClass = 'text-blue-600 font-semibold';
                    stockBadge = 'bg-blue-100 text-blue-800';
                  }

                  return (
                    <tr key={i.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {i.productName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                          {i.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <span className={stockClass}>{quantity}</span>
                          {stockBadge && (
                            <span className={`px-2 py-1 text-xs rounded-full ${stockBadge}`}>
                              {stockLevel === 'out' ? 'Out' : stockLevel === 'low' ? 'Low' : stockLevel === 'high' ? 'High' : 'Normal'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{minStock}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{maxStock}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                          {i.location}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <InlineAdjust id={i.id} onDone={() => { setSuccess('Inventory updated'); fetchItems(); }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function InlineAdjust({ id, onDone }: { id: string; onDone: () => void }) {
  const [qty, setQty] = useState('');
  const [delta, setDelta] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showControls, setShowControls] = useState(false);

  const setQuantity = async () => {
    try {
      setLoading(true); setErr('');
      const res = await fetch('/api/inventory', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventoryId: id, quantity: Number(qty) }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Failed'); return; }
      setQty(''); onDone();
    } catch (e) { setErr('Failed'); } finally { setLoading(false); }
  };
  
  const applyDelta = async () => {
    try {
      setLoading(true); setErr('');
      const res = await fetch('/api/inventory/adjustment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ inventoryId: id, delta: Number(delta) }) });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || 'Failed'); return; }
      setDelta(''); onDone();
    } catch (e) { setErr('Failed'); } finally { setLoading(false); }
  };

  return (
    <div className="flex items-center gap-2">
      {!showControls ? (
        <button
          onClick={() => setShowControls(true)}
          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded-md font-medium"
        >
          Adjust
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <input 
              placeholder="Set qty" 
              value={qty} 
              onChange={(e) => setQty(e.target.value)} 
              className="w-20 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500" 
            />
            <button 
              onClick={setQuantity} 
              disabled={loading || !qty} 
              className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded disabled:opacity-50"
            >
              {loading ? '...' : 'Set'}
            </button>
          </div>
          <div className="flex items-center gap-1">
            <input 
              placeholder="+/-" 
              value={delta} 
              onChange={(e) => setDelta(e.target.value)} 
              className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500" 
            />
            <button 
              onClick={applyDelta} 
              disabled={loading || !delta} 
              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded disabled:opacity-50"
            >
              {loading ? '...' : 'Adj'}
            </button>
          </div>
          <button
            onClick={() => {
              setShowControls(false);
              setQty('');
              setDelta('');
              setErr('');
            }}
            className="px-2 py-1 bg-gray-500 hover:bg-gray-600 text-white text-xs rounded"
          >
            ✕
          </button>
          {err && <span className="text-red-600 text-xs">{err}</span>}
        </div>
      )}
    </div>
  );
}



