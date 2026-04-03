'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatFinancialYearLabel, getFinancialYearStartYear } from '@/lib/financialYear';
import Link from 'next/link';

type PaymentRow = {
  paymentId: string;
  amount: number | string;
  paidOn: string;
  notes: string | null;
  createdAt?: string;

  stockPurchaseId: string;
  purchaseDate: string;
  supplierName: string;
  invoiceNumber: string | null;
  productName: string | null;
  unit: string | null;

  fyStartYear: number | string;
  monthKey: string; // YYYY-MM
};

export default function PurchasePaymentsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const initialFyLabel = useMemo(() => {
    // Default to "current FY" so users land on a useful filter immediately.
    const now = new Date();
    const startYear = getFinancialYearStartYear(now);
    return formatFinancialYearLabel(startYear);
  }, []);

  const [filters, setFilters] = useState({
    fy: initialFyLabel,
    month: '',
    search: '',
  });
  const [searchDraft, setSearchDraft] = useState('');

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [availableFys, setAvailableFys] = useState<{ value: string; label: string }[]>([]);
  const [availableMonths, setAvailableMonths] = useState<{ value: string; label: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const historyTopScrollRef = useRef<HTMLDivElement>(null);
  const historyMainScrollRef = useRef<HTMLDivElement>(null);
  const historyScrollSpacerRef = useRef<HTMLDivElement>(null);
  const historyTableRef = useRef<HTMLTableElement>(null);
  const historyScrollSyncing = useRef(false);

  useLayoutEffect(() => {
    const table = historyTableRef.current;
    const spacer = historyScrollSpacerRef.current;
    if (!table || !spacer) return;

    const syncWidth = () => {
      spacer.style.width = `${table.scrollWidth}px`;
    };

    syncWidth();
    const ro = new ResizeObserver(syncWidth);
    ro.observe(table);
    return () => ro.disconnect();
  }, [payments.length]);

  const onHistoryTopScroll = () => {
    if (historyScrollSyncing.current) return;
    historyScrollSyncing.current = true;

    const top = historyTopScrollRef.current;
    const main = historyMainScrollRef.current;
    if (top && main) main.scrollLeft = top.scrollLeft;

    requestAnimationFrame(() => {
      historyScrollSyncing.current = false;
    });
  };

  const onHistoryMainScroll = () => {
    if (historyScrollSyncing.current) return;
    historyScrollSyncing.current = true;

    const top = historyTopScrollRef.current;
    const main = historyMainScrollRef.current;
    if (top && main) top.scrollLeft = main.scrollLeft;

    requestAnimationFrame(() => {
      historyScrollSyncing.current = false;
    });
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!['admin', 'retail_staff', 'accountant'].includes((session.user as any)?.role || '')) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  // Debounce search so we don't fire a request for every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchDraft.trim() }));
    }, 350);
    return () => window.clearTimeout(t);
  }, [searchDraft]);

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        setIsLoading(true);
        setError('');

        const params = new URLSearchParams();
        if (filters.fy) params.set('fy', filters.fy);
        if (filters.month) params.set('month', filters.month);
        if (filters.search) params.set('search', filters.search);

        const res = await fetch(`/api/stock-purchase-payments?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load payments');
          return;
        }

        setPayments(Array.isArray(data.payments) ? data.payments : []);
        setAvailableFys(Array.isArray(data.availableFys) ? data.availableFys : []);
        setAvailableMonths(Array.isArray(data.availableMonths) ? data.availableMonths : []);
      } catch {
        setError('Network error loading payments');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPayments();
  }, [filters.fy, filters.month, filters.search]);

  const monthLabelMap = useMemo(() => {
    return new Map(availableMonths.map((m) => [m.value, m.label]));
  }, [availableMonths]);

  const totals = useMemo(() => {
    const totalAmount = payments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
    return {
      count: payments.length,
      totalAmount,
    };
  }, [payments]);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(n);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || !['admin', 'retail_staff', 'accountant'].includes((session.user as any)?.role || '')) {
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
            <h1 className="text-3xl font-bold text-gray-900">Payments Made (Purchases)</h1>
            <p className="mt-2 text-gray-600">Track all vendor payments recorded against stock purchases.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/purchases"
              className="w-full sm:w-auto text-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Purchases
            </Link>
          </div>
        </div>

        {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">{error}</div>}

        {/* Filters */}
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Filters</h2>
            <p className="text-sm text-gray-500 mt-1">Use FY + Month + Search to narrow down payments.</p>
          </div>

          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">FY</label>
                <select
                  value={filters.fy}
                  onChange={(e) => setFilters((f) => ({ ...f, fy: e.target.value, month: '' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All FY</option>
                  {availableFys.map((fy) => (
                    <option key={fy.value} value={fy.value}>
                      {fy.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                <select
                  value={filters.month}
                  onChange={(e) => setFilters((f) => ({ ...f, month: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={!availableMonths.length}
                >
                  <option value="">All Months</option>
                  {availableMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Supplier, invoice, payment id, notes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setSearchDraft('');
                  setFilters({ fy: initialFyLabel, month: '', search: '' });
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Reset
              </button>

              <div className="text-sm text-gray-700">
                {totals.count} payments • Total {formatCurrency(totals.totalAmount)}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">All Payments</h2>
            <p className="text-xs text-gray-500 mt-2">Use the bar above or below the table to scroll sideways.</p>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500">Loading payments...</div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No payments found for these filters.</div>
          ) : (
            <>
              <div
                ref={historyTopScrollRef}
                onScroll={onHistoryTopScroll}
                className="overflow-x-auto overflow-y-hidden overscroll-x-contain -mx-1 px-1 sm:mx-0 sm:px-0 border-b border-gray-200 bg-gray-50"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <div ref={historyScrollSpacerRef} className="h-2.5 shrink-0" aria-hidden />
              </div>

              <div
                ref={historyMainScrollRef}
                onScroll={onHistoryMainScroll}
                className="max-h-[min(75vh,42rem)] overflow-auto overscroll-contain -mx-1 px-1 sm:mx-0 sm:px-0"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                <table ref={historyTableRef} className="min-w-max w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_0_0_rgb(229,231,235)]">
                    <tr>
                      <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Paid On
                      </th>
                      <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        FY
                      </th>
                      <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Month
                      </th>
                      <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Supplier
                      </th>
                      <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Product
                      </th>
                      <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Invoice
                      </th>
                      <th className="px-3 py-2 sm:px-6 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Amount
                      </th>
                      <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Notes
                      </th>
                      <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Purchase Date
                      </th>
                      <th className="px-3 py-2 sm:px-6 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                        Payment Id
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((p) => (
                      <tr key={p.paymentId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-gray-700">
                          {formatDate(p.paidOn)}
                        </td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-gray-700">
                          {Number.isFinite(Number(p.fyStartYear)) ? formatFinancialYearLabel(Number(p.fyStartYear)) : '—'}
                        </td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-gray-700">
                          {p.monthKey ? monthLabelMap.get(p.monthKey) || p.monthKey : '—'}
                        </td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-gray-700">
                          {p.supplierName || '—'}
                        </td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-gray-700">
                          {(p.productName || '—') + (p.unit ? ` (${p.unit})` : '')}
                        </td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-gray-700">
                          {p.invoiceNumber || '—'}
                        </td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-gray-800 text-right font-medium">
                          {formatCurrency(Number(p.amount || 0))}
                        </td>
                        <td
                          className="px-3 py-2 sm:px-6 sm:py-4 text-gray-700 max-w-[12rem] sm:max-w-xs truncate"
                          title={p.notes || ''}
                        >
                          {p.notes || '—'}
                        </td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-gray-700">
                          {p.purchaseDate ? formatDate(p.purchaseDate) : '—'}
                        </td>
                        <td className="px-3 py-2 sm:px-6 sm:py-4 whitespace-nowrap text-gray-700">
                          {p.paymentId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

