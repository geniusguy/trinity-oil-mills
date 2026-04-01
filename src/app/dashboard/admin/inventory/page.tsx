'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getQueueCount } from '@/lib/offlineQueue';
import { tinEquivalentForCanteenLine, CANTEEN_LITERS_PER_TIN } from '@/lib/canteenSupply';

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

interface SaleRow {
  id: string;
  invoiceDate?: string | null;
  createdAt?: string | null;
  totalTins?: number | string | null;
  totalLiters?: number | string | null;
}

interface SaleReportItem {
  productId?: string;
  productName?: string;
  quantity?: number;
}

interface SaleReportRow {
  invoiceDate?: string | null;
  createdAt?: string | null;
  items?: SaleReportItem[];
}

interface StockPurchaseRow {
  productId?: string;
  quantity?: number | string;
  purchaseDate?: string | null;
}

interface SalesReturnRow {
  productName?: string;
  unit?: string;
  quantity?: number | string;
  returnDate?: string | null;
  returnNature?: string;
  accountingImpact?: string;
}

function fmtTinEquiv(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

/** Tin-equivalent on hand (qty × pack liters ÷ 15.2 L), same as canteen invoices. */
function tinsEquivForRow(i: InventoryRow): number | null {
  return tinEquivalentForCanteenLine(Number(i.quantity), i.productName, i.unit, i.productId);
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
    status: '',
    stockLevel: ''
  });
  const [sortBy, setSortBy] = useState('productName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [queueCount, setQueueCount] = useState(0);
  const [salesRows, setSalesRows] = useState<SaleRow[]>([]);
  const [salesWithItems, setSalesWithItems] = useState<SaleReportRow[]>([]);
  const [stockPurchases, setStockPurchases] = useState<StockPurchaseRow[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturnRow[]>([]);
  const [fyFilter, setFyFilter] = useState<string>('all');

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

  const totalTinEquivFiltered = useMemo(() => {
    let s = 0;
    for (const i of filteredItems) {
      const t = tinsEquivForRow(i);
      if (t != null && Number.isFinite(t)) s += t;
    }
    return s;
  }, [filteredItems]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const [invRes, salesRes, purchasesRes, returnsRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/sales?category=canteen&limit=5000'),
        fetch('/api/stock-purchases?limit=5000'),
        fetch('/api/sales-returns?limit=5000'),
      ]);
      const salesRptRes = await fetch(`/api/reports/sales?startDate=2000-01-01&endDate=${new Date().toISOString().slice(0, 10)}`);
      const invData = await invRes.json();
      const salesData = await salesRes.json();
      const purchasesData = await purchasesRes.json();
      const returnsData = await returnsRes.json();
      const salesRptData = await salesRptRes.json();
      if (invRes.ok) setItems(invData.inventory || []);
      else setError(invData.error || 'Failed to load inventory');
      if (salesRes.ok) setSalesRows(Array.isArray(salesData.sales) ? salesData.sales : []);
      if (purchasesRes.ok) setStockPurchases(Array.isArray(purchasesData.purchases) ? purchasesData.purchases : []);
      if (returnsRes.ok) {
        setSalesReturns(
          Array.isArray(returnsData.returns)
            ? returnsData.returns.map((r: any) => ({
                productName: r.productName,
                unit: r.unit,
                quantity: r.quantity,
                returnDate: r.returnDate,
                returnNature: r.returnNature,
                accountingImpact: r.accountingImpact,
              }))
            : []
        );
      }
      if (salesRptRes.ok) setSalesWithItems(Array.isArray(salesRptData?.data?.sales) ? salesRptData.data.sales : []);
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
        item.unit.toLowerCase().includes(searchLower)
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
    if (filters.stockLevel) {
      filtered = filtered.filter(item => {
        const qty = Number(item.quantity);
        
        switch (filters.stockLevel) {
          case 'normal':
            return qty > 0;
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
        case 'tinsEquiv': {
          const ta = tinsEquivForRow(a);
          const tb = tinsEquivForRow(b);
          aValue = ta ?? -1;
          bValue = tb ?? -1;
          break;
        }
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

    // Always pin TOM Castor/Castrol oil to top.
    const isPinned = (row: InventoryRow) => {
      const n = String(row.productName || '').toLowerCase();
      return n.includes('tom') && (n.includes('castor') || n.includes('castrol'));
    };
    filtered.sort((a, b) => {
      const ap = isPinned(a) ? 0 : 1;
      const bp = isPinned(b) ? 0 : 1;
      return ap - bp;
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
      status: '',
      stockLevel: ''
    });
  };

  // Get unique values for filter options
  const getUniqueValues = (key: keyof InventoryRow) => {
    return [...new Set(items.map(item => item[key]).filter(Boolean))];
  };

  const fyForDate = (dateLike?: string | null) => {
    const d = new Date(String(dateLike || ''));
    if (Number.isNaN(d.getTime())) return null;
    const y = d.getFullYear();
    const m = d.getMonth();
    const start = m >= 3 ? y : y - 1;
    return start;
  };

  const fySummaryRows = useMemo(() => {
    const toNum = (v: unknown) => Number(v || 0);
    const sales = salesRows || [];
    const fySet = new Set<number>();
    for (const s of sales) {
      const fy = fyForDate(s.invoiceDate || s.createdAt || null);
      if (fy != null) fySet.add(fy);
    }
    const fyYears = Array.from(fySet).sort((a, b) => b - a);
    const selectedFyYears = fyFilter === 'all' ? fyYears : [/^\d{4}$/.test(fyFilter) ? Number(fyFilter) : null].filter((v): v is number => v != null);

    const availableStockTins = totalTinEquivFiltered;
    return selectedFyYears.map((fy) => {
      const inFy = sales.filter((s) => fyForDate(s.invoiceDate || s.createdAt || null) === fy);
      const beforeFy = sales.filter((s) => {
        const v = fyForDate(s.invoiceDate || s.createdAt || null);
        return v != null && v < fy;
      });
      const soldTins = inFy.reduce((sum, s) => {
        const tt = toNum(s.totalTins);
        if (tt > 0) return sum + tt;
        const liters = toNum(s.totalLiters);
        return sum + (liters > 0 ? liters / CANTEEN_LITERS_PER_TIN : 0);
      }, 0);
      const prevSoldTins = beforeFy.reduce((sum, s) => {
        const tt = toNum(s.totalTins);
        if (tt > 0) return sum + tt;
        const liters = toNum(s.totalLiters);
        return sum + (liters > 0 ? liters / CANTEEN_LITERS_PER_TIN : 0);
      }, 0);
      return {
        fy,
        fyLabel: `${fy}-${String(fy + 1).slice(-2)}`,
        invoiceCount: inFy.length,
        soldTins,
        prevSoldTins,
        availableStockTins,
      };
    });
  }, [salesRows, fyFilter, totalTinEquivFiltered]);

  const reconciliationByProductId = useMemo(() => {
    const map = new Map<string, { purchased: number; consumed: number }>();
    const add = (id: string, key: 'purchased' | 'consumed', qty: number) => {
      const pid = String(id || '').trim();
      if (!pid || !Number.isFinite(qty)) return;
      const rec = map.get(pid) || { purchased: 0, consumed: 0 };
      rec[key] += qty;
      map.set(pid, rec);
    };
    const normalizeId = (id?: string | null) => {
      const v = String(id || '').trim();
      if (v === '55336' || v === '68539') return 'castor-200ml';
      return v;
    };
    const dateInSelectedFy = (d?: string | null) => {
      if (fyFilter === 'all') return true;
      const fy = /^\d{4}$/.test(fyFilter) ? Number(fyFilter) : null;
      if (fy == null) return true;
      const dt = new Date(String(d || ''));
      if (Number.isNaN(dt.getTime())) return false;
      const start = new Date(fy, 3, 1).getTime();
      const end = new Date(fy + 1, 2, 31, 23, 59, 59, 999).getTime();
      const t = dt.getTime();
      return t >= start && t <= end;
    };

    // Purchases movement
    for (const r of stockPurchases) {
      if (!dateInSelectedFy(r.purchaseDate)) continue;
      add(normalizeId(r.productId), 'purchased', Number(r.quantity || 0));
    }

    // Sold / consumed movement from sales items
    const detectSizeKey = (nameLike: string) => {
      const n = nameLike.toLowerCase();
      if (n.includes('5l') || n.includes('5 l') || n.includes('5 liter')) return '5l';
      if (n.includes('1l') || n.includes('1 l') || n.includes('1 liter')) return '1l';
      if (n.includes('500ml') || n.includes('500 ml')) return '500ml';
      if (/\b200\D*ml\b/.test(n)) return '200ml';
      return null;
    };
    for (const sale of salesWithItems) {
      if (!dateInSelectedFy(sale.invoiceDate || sale.createdAt)) continue;
      for (const it of sale.items || []) {
        const qty = Number(it.quantity || 0);
        const pid = normalizeId(it.productId);
        if (pid && qty > 0) add(pid, 'consumed', qty);

        // Packaging consumption rules: for each bottle sold, deduct 1 bottle + 1 inner cap + 1 front label + 1 back label.
        const size = detectSizeKey(String(it.productName || ''));
        if (size && qty > 0) {
          add(`pack_pet_bottle_${size}`, 'consumed', qty);
          add(`pack_inner_cap_${size}`, 'consumed', qty);
          add(`pack_flip_top_cap_${size}_green`, 'consumed', qty);
          add(`pack_front_label_${size}`, 'consumed', qty);
          add(`pack_back_label_${size}`, 'consumed', qty);
        }
      }
    }
    const normText = (s?: string | null) =>
      String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const itemsByNorm = new Map<string, string>();
    for (const inv of items) {
      const k = `${normText(inv.productName)}|${normText(inv.unit)}`;
      if (!itemsByNorm.has(k)) itemsByNorm.set(k, normalizeId(inv.productId));
    }
    for (const rt of salesReturns) {
      if (!dateInSelectedFy(rt.returnDate)) continue;
      const qty = Number(rt.quantity || 0);
      if (!(qty > 0)) continue;
      const name = String(rt.productName || '').toLowerCase();
      const unit = String(rt.unit || '').toLowerCase();
      let pid = '';
      if (name.includes('castor') && (name.includes('200') || unit.includes('200'))) {
        pid = 'castor-200ml';
      } else {
        const k = `${normText(rt.productName)}|${normText(rt.unit)}`;
        pid = itemsByNorm.get(k) || '';
      }
      if (pid) {
        const nature = String(rt.returnNature || '').toLowerCase();
        const impact = String(rt.accountingImpact || '').toLowerCase();
        const isWriteOff = nature === 'expiry' || impact === 'expense_writeoff';
        if (isWriteOff) add(pid, 'consumed', qty);
        else add(pid, 'purchased', qty);
      }
    }
    return map;
  }, [salesWithItems, stockPurchases, salesReturns, items, fyFilter]);

  const reconciliationTotals = useMemo(() => {
    let purchased = 0;
    let consumed = 0;
    let present = 0;
    for (const i of filteredItems) {
      const mv = reconciliationByProductId.get(String(i.productId)) || { purchased: 0, consumed: 0 };
      purchased += Number(mv.purchased || 0);
      consumed += Number(mv.consumed || 0);
      present += Number(i.quantity || 0);
    }
    const expected = purchased - consumed;
    const variance = present - expected;
    return { purchased, consumed, expected, present, variance };
  }, [filteredItems, reconciliationByProductId]);

  const returnsSummaryRows = useMemo(() => {
    const rows = salesReturns || [];
    const out = new Map<string, { productName: string; unit: string; quantity: number }>();
    const inSelectedFy = (d?: string | null) => {
      if (fyFilter === 'all') return true;
      const fy = /^\d{4}$/.test(fyFilter) ? Number(fyFilter) : null;
      if (fy == null) return true;
      const dt = new Date(String(d || ''));
      if (Number.isNaN(dt.getTime())) return false;
      const start = new Date(fy, 3, 1).getTime();
      const end = new Date(fy + 1, 2, 31, 23, 59, 59, 999).getTime();
      const t = dt.getTime();
      return t >= start && t <= end;
    };
    for (const r of rows) {
      if (!inSelectedFy(r.returnDate)) continue;
      const name = String(r.productName || 'Unknown Product').trim();
      const unit = String(r.unit || '').trim();
      const key = `${name}__${unit}`;
      const qty = Number(r.quantity || 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const prev = out.get(key);
      if (prev) prev.quantity += qty;
      else out.set(key, { productName: name, unit, quantity: qty });
    }
    return Array.from(out.values()).sort((a, b) => b.quantity - a.quantity);
  }, [salesReturns, fyFilter]);


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
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-medium text-gray-900">Inventory Overview</h2>
              <div className="text-sm text-gray-500 flex flex-col sm:items-end gap-2">
                <span>
                  Showing {filteredItems.length} of {items.length} items
                </span>
                <span className="text-indigo-700 font-medium">
                  Total tin equivalent (filtered): {fmtTinEquiv(totalTinEquivFiltered)} tins
                  <span className="text-gray-500 font-normal"> ({CANTEEN_LITERS_PER_TIN} L = 1 tin)</span>
                </span>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-600">FY:</label>
                  <select
                    value={fyFilter}
                    onChange={(e) => setFyFilter(e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white"
                  >
                    <option value="all">All FY</option>
                    {Array.from(new Set((salesRows || []).map((s) => fyForDate(s.invoiceDate || s.createdAt || null)).filter((v): v is number => v != null)))
                      .sort((a, b) => b - a)
                      .map((fy) => (
                        <option key={fy} value={String(fy)}>
                          {fy}-{String(fy + 1).slice(-2)}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2">
                <p className="text-xs text-blue-700">Purchased Qty</p>
                <p className="text-lg font-semibold text-blue-900">{reconciliationTotals.purchased.toFixed(2)}</p>
              </div>
              <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2">
                <p className="text-xs text-amber-700">Sold/Consumed Qty</p>
                <p className="text-lg font-semibold text-amber-900">{reconciliationTotals.consumed.toFixed(2)}</p>
              </div>
              <div className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2">
                <p className="text-xs text-indigo-700">Expected Stock</p>
                <p className="text-lg font-semibold text-indigo-900">{reconciliationTotals.expected.toFixed(2)}</p>
              </div>
              <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                <p className="text-xs text-gray-700">Present Stock</p>
                <p className="text-lg font-semibold text-gray-900">{reconciliationTotals.present.toFixed(2)}</p>
              </div>
              <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2">
                <p className="text-xs text-emerald-700">Variance (Present - Expected)</p>
                <p className="text-lg font-semibold text-emerald-900">{reconciliationTotals.variance.toFixed(2)}</p>
              </div>
            </div>
            <h3 className="text-sm font-semibold text-gray-800 mb-2">FY Stock & Sold Tins Summary</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-2 text-left">FY</th>
                    <th className="py-2 text-right">Total Invoices</th>
                    <th className="py-2 text-right">Sold Tins (FY)</th>
                    <th className="py-2 text-right">Previous Sold Tins</th>
                    <th className="py-2 text-right">Available Stock Tins</th>
                  </tr>
                </thead>
                <tbody>
                  {fySummaryRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-3 text-gray-500">No FY sales data available.</td>
                    </tr>
                  ) : (
                    fySummaryRows.map((r) => (
                      <tr key={r.fy} className="border-b border-gray-100">
                        <td className="py-2 font-medium text-gray-900">{r.fyLabel}</td>
                        <td className="py-2 text-right">{r.invoiceCount}</td>
                        <td className="py-2 text-right">{fmtTinEquiv(r.soldTins)}</td>
                        <td className="py-2 text-right">{fmtTinEquiv(r.prevSoldTins)}</td>
                        <td className="py-2 text-right font-semibold text-indigo-700">{fmtTinEquiv(r.availableStockTins)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Returns Stock (Separate)</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-600">
                    <th className="py-2 text-left">Product</th>
                    <th className="py-2 text-left">Unit</th>
                    <th className="py-2 text-right">Returned Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {returnsSummaryRows.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-3 text-gray-500">No returns found for selected FY.</td>
                    </tr>
                  ) : (
                    returnsSummaryRows.map((r) => (
                      <tr key={`${r.productName}-${r.unit}`} className="border-b border-gray-100">
                        <td className="py-2 text-gray-900">{r.productName}</td>
                        <td className="py-2 text-gray-700">{r.unit || '-'}</td>
                        <td className="py-2 text-right font-semibold text-emerald-700">{r.quantity.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
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
                  <option value="normal">Normal Stock</option>
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
                      Live Stock
                      {sortBy === 'quantity' && (
                        <span className="text-indigo-600">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSortChange('tinsEquiv')}
                    title="Pack size from product name + unit; liters ÷ 15.2 L per tin (same as canteen invoice totals)"
                  >
                    <div className="flex flex-col gap-0.5 items-start">
                      <span className="flex items-center gap-1">
                        No. of Tins (equiv.)
                        {sortBy === 'tinsEquiv' && (
                          <span className="text-indigo-600">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </span>
                      <span className="text-[10px] font-normal text-gray-400 normal-case">15.2 L = 1 tin</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purchased</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sold/Consumed</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expected</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((i) => {
                  const tinsEq = tinsEquivForRow(i);
                  
                  // Determine stock level and styling
                  let stockLevel = 'normal';
                  let stockClass = 'text-gray-700';
                  let stockBadge = '';
                  
                  const movement = reconciliationByProductId.get(String(i.productId)) || { purchased: 0, consumed: 0 };
                  const expected = Number(movement.purchased || 0) - Number(movement.consumed || 0);
                  const quantity = expected;
                  if (quantity <= 0) {
                    stockLevel = 'out';
                    stockClass = 'text-red-600 font-semibold';
                    stockBadge = 'bg-red-100 text-red-800';
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
                          <span className={stockClass}>{quantity.toFixed(2)}</span>
                          {stockBadge && (
                            <span className={`px-2 py-1 text-xs rounded-full ${stockBadge}`}>
                              {stockLevel === 'out' ? 'Out' : 'Normal'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 tabular-nums">
                        {tinsEq != null ? fmtTinEquiv(tinsEq) : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{Number(movement.purchased).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{Number(movement.consumed).toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{expected.toFixed(2)}</td>
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



