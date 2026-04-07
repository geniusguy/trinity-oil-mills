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

type SupplierOption = { id: string; name: string };

type PurchaseDueRow = {
  id: string;
  purchaseDate: string;
  invoiceNumber: string | null;
  productName: string | null;
  unit: string | null;
  totalAmount: number | null;
  totalPaid: number;
  balanceDue: number | null;
};

type DueSortKey = 'purchaseDate' | 'invoiceNumber' | 'productName' | 'totalAmount' | 'totalPaid' | 'balanceDue';

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
  const [success, setSuccess] = useState('');

  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [duePurchases, setDuePurchases] = useState<PurchaseDueRow[]>([]);
  const [dueLoading, setDueLoading] = useState(false);

  const [showVendorModal, setShowVendorModal] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    supplierName: '',
    paidOn: new Date().toISOString().slice(0, 10),
    totalAmount: '',
    notes: '',
  });
  const [vendorFyScope, setVendorFyScope] = useState<string>('all');
  const [openingBalancePayable, setOpeningBalancePayable] = useState(0);
  const [openingBalanceDraft, setOpeningBalanceDraft] = useState('');
  const [openingBalanceNotes, setOpeningBalanceNotes] = useState('');
  const [openingBalanceLoading, setOpeningBalanceLoading] = useState(false);
  const [openingBalanceSaving, setOpeningBalanceSaving] = useState(false);
  const [dueSortBy, setDueSortBy] = useState<DueSortKey>('purchaseDate');
  const [dueSortOrder, setDueSortOrder] = useState<'asc' | 'desc'>('asc');
  const [allocations, setAllocations] = useState<Record<string, string>>({});
  const [vendorSaving, setVendorSaving] = useState(false);

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
        setSuccess('');

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

  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const res = await fetch('/api/suppliers');
        const data = await res.json();
        if (res.ok) {
          setSuppliers((data.suppliers || []).map((s: any) => ({ id: String(s.id), name: String(s.name) })));
        }
      } catch {}
    };
    if (['admin', 'retail_staff', 'accountant'].includes((session?.user as any)?.role || '')) {
      loadSuppliers();
    }
  }, [session?.user]);

  const formatCurrency = (n: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(n);
  };

  const monthLabelMap = useMemo(() => {
    return new Map(availableMonths.map((m) => [m.value, m.label]));
  }, [availableMonths]);

  const fyYearOptions = useMemo(() => {
    const cur = getFinancialYearStartYear(new Date());
    const years: number[] = [];
    for (let y = cur + 1; y >= cur - 20; y--) years.push(y);
    return years;
  }, []);

  const activeScopeFyStartYear = useMemo(() => {
    const m = /^fy:(\d+)$/.exec(vendorFyScope);
    return m ? Number(m[1]) : null;
  }, [vendorFyScope]);

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

  const loadDuePurchases = async (supplierName: string) => {
    if (!supplierName) {
      setDuePurchases([]);
      setAllocations({});
      return;
    }
    setDueLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('supplier', supplierName);
      params.set('limit', '500');
      const res = await fetch(`/api/stock-purchases?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to load purchases for supplier');
        return;
      }
      const list: PurchaseDueRow[] = (data.purchases || [])
        .map((p: any) => ({
          id: String(p.id),
          purchaseDate: String(p.purchaseDate || ''),
          invoiceNumber: p.invoiceNumber ?? null,
          productName: p.productName ?? null,
          unit: p.unit ?? null,
          totalAmount: p.totalAmount == null ? null : Number(p.totalAmount),
          totalPaid: Number(p.totalPaid || 0),
          balanceDue: p.balanceDue == null ? null : Number(p.balanceDue),
        }))
        .filter((p: PurchaseDueRow) => p.totalAmount != null && (p.balanceDue || 0) > 0.005);
      setDuePurchases(list);
      setAllocations({});
    } catch {
      setError('Network error loading supplier purchases');
    } finally {
      setDueLoading(false);
    }
  };

  const filteredDuePurchases = useMemo(() => {
    if (activeScopeFyStartYear == null) return duePurchases;
    const start = new Date(activeScopeFyStartYear, 3, 1).getTime();
    const end = new Date(activeScopeFyStartYear + 1, 2, 31, 23, 59, 59, 999).getTime();
    return duePurchases.filter((p) => {
      const t = new Date(p.purchaseDate).getTime();
      return Number.isFinite(t) && t >= start && t <= end;
    });
  }, [duePurchases, activeScopeFyStartYear]);

  const sortedDuePurchases = useMemo(() => {
    const dir = dueSortOrder === 'asc' ? 1 : -1;
    return [...filteredDuePurchases].sort((a, b) => {
      const num = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);
      if (dueSortBy === 'purchaseDate') {
        return (new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime()) * dir;
      }
      if (dueSortBy === 'totalAmount' || dueSortBy === 'totalPaid' || dueSortBy === 'balanceDue') {
        return (num((a as any)[dueSortBy]) - num((b as any)[dueSortBy])) * dir;
      }
      return String((a as any)[dueSortBy] ?? '').localeCompare(String((b as any)[dueSortBy] ?? '')) * dir;
    });
  }, [filteredDuePurchases, dueSortBy, dueSortOrder]);

  const handleDueSort = (k: DueSortKey) => {
    if (dueSortBy === k) setDueSortOrder((s) => (s === 'asc' ? 'desc' : 'asc'));
    else {
      setDueSortBy(k);
      setDueSortOrder('asc');
    }
  };

  const loadSupplierOpeningBalance = async (supplierName: string, fyStartYear: number) => {
    setOpeningBalanceLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('supplierName', supplierName);
      params.set('fyStartYear', String(fyStartYear));
      const res = await fetch(`/api/suppliers/opening-balance?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        const amt = Number(data.openingBalancePayable) || 0;
        setOpeningBalancePayable(amt);
        setOpeningBalanceDraft(amt ? String(amt) : '');
        setOpeningBalanceNotes(String(data.notes || ''));
      }
    } catch {
      setOpeningBalancePayable(0);
      setOpeningBalanceDraft('');
      setOpeningBalanceNotes('');
    } finally {
      setOpeningBalanceLoading(false);
    }
  };

  const saveSupplierOpeningBalance = async () => {
    if (!vendorForm.supplierName || activeScopeFyStartYear == null) return;
    const n = openingBalanceDraft.trim() === '' ? 0 : Number(openingBalanceDraft);
    if (!Number.isFinite(n) || n < 0) return setError('Opening balance must be a valid non-negative amount.');
    setOpeningBalanceSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/suppliers/opening-balance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: vendorForm.supplierName.trim(),
          fyStartYear: activeScopeFyStartYear,
          openingBalancePayable: n,
          notes: openingBalanceNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save opening balance.');
        return;
      }
      setOpeningBalancePayable(n);
      setSuccess(`Opening balance saved for FY ${formatFinancialYearLabel(activeScopeFyStartYear)}.`);
    } catch {
      setError('Network error saving opening balance.');
    } finally {
      setOpeningBalanceSaving(false);
    }
  };

  useEffect(() => {
    if (!showVendorModal) return;
    if (!vendorForm.supplierName) return;
    if (activeScopeFyStartYear == null) {
      setOpeningBalancePayable(0);
      setOpeningBalanceDraft('');
      setOpeningBalanceNotes('');
      setOpeningBalanceLoading(false);
      return;
    }
    loadSupplierOpeningBalance(vendorForm.supplierName, activeScopeFyStartYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showVendorModal, vendorForm.supplierName, activeScopeFyStartYear]);

  const allocatedTotal = useMemo(() => {
    return Object.values(allocations).reduce((acc, v) => acc + (Number(v) || 0), 0);
  }, [allocations]);

  const lumpsumTotal = useMemo(() => {
    const n = Number(vendorForm.totalAmount);
    return Number.isFinite(n) ? n : 0;
  }, [vendorForm.totalAmount]);

  const unallocated = useMemo(() => {
    return Math.max(0, lumpsumTotal - allocatedTotal);
  }, [lumpsumTotal, allocatedTotal]);

  const scopeRemainingTotal = useMemo(() => {
    return filteredDuePurchases.reduce((acc, p) => acc + (Number(p.balanceDue) || 0), 0);
  }, [filteredDuePurchases]);

  const autoAllocateOldestFirst = () => {
    const total = lumpsumTotal;
    if (!total || total <= 0) return;
    let remaining = total;
    const next: Record<string, string> = {};
    for (const p of sortedDuePurchases) {
      const rem = Number(p.balanceDue || 0);
      if (rem <= 0 || remaining <= 0) continue;
      const use = Math.min(rem, remaining);
      next[p.id] = use.toFixed(2);
      remaining -= use;
    }
    setAllocations(next);
  };

  const saveVendorPayment = async () => {
    const supplierName = vendorForm.supplierName.trim();
    const paidOn = String(vendorForm.paidOn || '').trim();
    const totalAmount = Number(vendorForm.totalAmount);
    if (!supplierName) return setError('Select supplier.');
    if (!paidOn) return setError('Select paid date.');
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) return setError('Enter a valid total amount.');
    if (Math.abs(allocatedTotal - totalAmount) > 0.01) {
      return setError(`Allocated total must equal lumpsum total. Allocated ₹${allocatedTotal.toFixed(2)} / Total ₹${totalAmount.toFixed(2)}.`);
    }
    const allocationsList = Object.entries(allocations)
      .map(([stockPurchaseId, amount]) => ({ stockPurchaseId, amount: Number(amount) }))
      .filter((a) => Number.isFinite(a.amount) && a.amount > 0);
    if (!allocationsList.length) return setError('Allocate amount to at least one purchase.');

    setVendorSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/stock-purchase-payments/vendor-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName,
          paidOn,
          totalAmount,
          notes: vendorForm.notes?.trim() || null,
          allocations: allocationsList,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save vendor payment');
        return;
      }
      setSuccess('Vendor payment saved and allocated.');
      setShowVendorModal(false);
      setVendorForm((f) => ({ ...f, totalAmount: '', notes: '' }));
      setAllocations({});
      setDuePurchases([]);
      // refresh main table
      setFilters((f) => ({ ...f }));
    } catch {
      setError('Network error saving vendor payment');
    } finally {
      setVendorSaving(false);
    }
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
            <button
              type="button"
              onClick={() => {
                setError('');
                setSuccess('');
                setVendorFyScope('all');
                setShowVendorModal(true);
              }}
              className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Single vendor payment
            </button>
            <Link
              href="/dashboard/admin/purchases"
              className="w-full sm:w-auto text-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Purchases
            </Link>
          </div>
        </div>

        {error && <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">{error}</div>}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">{success}</div>
        )}

        {showVendorModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h3 className="text-lg font-medium text-gray-900">Single vendor payment (lumpsum)</h3>
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-gray-600 mb-4">
                Enter one paid amount, then allocate it across multiple purchases of the same supplier. This will save one
                payment row per selected purchase (for accurate remaining balances).
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                  <select
                    value={vendorForm.supplierName}
                    onChange={(e) => {
                      const v = e.target.value;
                      setVendorForm((f) => ({ ...f, supplierName: v }));
                      setVendorFyScope('all');
                      loadDuePurchases(v);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-xs text-gray-500">
                    Manage suppliers in{' '}
                    <Link href="/dashboard/admin/suppliers" className="text-indigo-600 hover:text-indigo-800">
                      Supplier Master
                    </Link>
                    .
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                  <select
                    value={vendorFyScope}
                    onChange={(e) => setVendorFyScope(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="all">Overall (all FY)</option>
                    {fyYearOptions.map((y) => (
                      <option key={y} value={`fy:${y}`}>
                        FY {formatFinancialYearLabel(y)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Paid on *</label>
                  <input
                    type="date"
                    value={vendorForm.paidOn}
                    onChange={(e) => setVendorForm((f) => ({ ...f, paidOn: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total paid (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={vendorForm.totalAmount}
                    onChange={(e) => setVendorForm((f) => ({ ...f, totalAmount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. 15000"
                  />
                </div>
                <div className="md:col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <input
                    type="text"
                    value={vendorForm.notes}
                    onChange={(e) => setVendorForm((f) => ({ ...f, notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g. NEFT ref / bank / remarks"
                  />
                </div>
              </div>

              {activeScopeFyStartYear != null && (
                <div className="mt-4 p-3 rounded-md border border-amber-200 bg-amber-50/70">
                  <div className="text-sm font-medium text-gray-800 mb-2">
                    Opening balance for {vendorForm.supplierName || 'selected supplier'} (FY{' '}
                    {formatFinancialYearLabel(activeScopeFyStartYear)})
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Opening payable (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={openingBalanceDraft}
                        onChange={(e) => setOpeningBalanceDraft(e.target.value)}
                        disabled={openingBalanceLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-600 mb-1">Notes</label>
                      <input
                        type="text"
                        value={openingBalanceNotes}
                        onChange={(e) => setOpeningBalanceNotes(e.target.value)}
                        disabled={openingBalanceLoading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={saveSupplierOpeningBalance}
                        disabled={!vendorForm.supplierName || openingBalanceLoading || openingBalanceSaving}
                        className="w-full px-4 py-2 text-sm border border-amber-300 rounded-md bg-white hover:bg-amber-50 disabled:opacity-50"
                      >
                        {openingBalanceSaving ? 'Saving...' : 'Save opening'}
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mt-2">
                    Saved opening: <span className="font-medium">{formatCurrency(openingBalancePayable)}</span>
                  </div>
                </div>
              )}

              <div className="mt-5 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
                <div className="text-sm text-gray-700">
                  <div>
                    Allocated: <span className="font-semibold">{formatCurrency(allocatedTotal)}</span>
                  </div>
                  <div>
                    Unallocated: <span className="font-semibold">{formatCurrency(unallocated)}</span>
                  </div>
                  <div>
                    Scope remaining due:{' '}
                    <span className="font-semibold">
                      {formatCurrency(scopeRemainingTotal + (activeScopeFyStartYear == null ? 0 : openingBalancePayable))}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={autoAllocateOldestFirst}
                    disabled={!vendorForm.supplierName || !lumpsumTotal || dueLoading}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Auto allocate (oldest first)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocations({})}
                    disabled={dueLoading}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Clear allocations
                  </button>
                </div>
              </div>

              <div className="mt-4 border rounded-md overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 text-left cursor-pointer" onClick={() => handleDueSort('purchaseDate')}>
                        Purchase date {dueSortBy === 'purchaseDate' ? (dueSortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-3 py-2 text-left cursor-pointer" onClick={() => handleDueSort('invoiceNumber')}>
                        Invoice {dueSortBy === 'invoiceNumber' ? (dueSortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-3 py-2 text-left cursor-pointer" onClick={() => handleDueSort('productName')}>
                        Product {dueSortBy === 'productName' ? (dueSortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-3 py-2 text-right cursor-pointer" onClick={() => handleDueSort('totalAmount')}>
                        Bill (₹) {dueSortBy === 'totalAmount' ? (dueSortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-3 py-2 text-right cursor-pointer" onClick={() => handleDueSort('totalPaid')}>
                        Paid (₹) {dueSortBy === 'totalPaid' ? (dueSortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-3 py-2 text-right cursor-pointer" onClick={() => handleDueSort('balanceDue')}>
                        Remaining (₹) {dueSortBy === 'balanceDue' ? (dueSortOrder === 'asc' ? '▲' : '▼') : ''}
                      </th>
                      <th className="px-3 py-2 text-right">Allocate now (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dueLoading ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                          Loading purchases...
                        </td>
                      </tr>
                    ) : sortedDuePurchases.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-gray-500">
                          {vendorForm.supplierName
                            ? activeScopeFyStartYear == null
                              ? 'No remaining purchases found (all paid).'
                              : `No remaining purchases in FY ${formatFinancialYearLabel(activeScopeFyStartYear)}.`
                            : 'Select supplier to load purchases.'}
                        </td>
                      </tr>
                    ) : (
                      sortedDuePurchases.map((p) => {
                        const remaining = Number(p.balanceDue || 0);
                        return (
                          <tr key={p.id} className="border-t">
                            <td className="px-3 py-2">{p.purchaseDate ? formatDate(p.purchaseDate) : '—'}</td>
                            <td className="px-3 py-2">{p.invoiceNumber || '—'}</td>
                            <td className="px-3 py-2">{(p.productName || '—') + (p.unit ? ` (${p.unit})` : '')}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(Number(p.totalAmount || 0))}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(Number(p.totalPaid || 0))}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(remaining)}</td>
                            <td className="px-3 py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={allocations[p.id] ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value;
                                  const n = Number(v);
                                  if (v !== '' && (!Number.isFinite(n) || n < 0)) return;
                                  if (v !== '' && Number.isFinite(n) && n > remaining + 0.01) return;
                                  setAllocations((a) => ({ ...a, [p.id]: v }));
                                }}
                                className="w-32 px-2 py-1 border border-gray-300 rounded-md text-right"
                                placeholder="0.00"
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowVendorModal(false)}
                  className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveVendorPayment}
                  disabled={vendorSaving || dueLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
                >
                  {vendorSaving ? 'Saving…' : 'Save payment'}
                </button>
              </div>
            </div>
          </div>
        )}

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

