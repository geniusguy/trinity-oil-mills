'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { formatFinancialYearLabel, getFinancialYearStartYear } from '@/lib/financialYear';

type RefPayment = {
  id: string;
  vendorName: string;
  productName: string;
  tinsCount: number;
  purchasedDate: string;
  paymentDate: string;
  purchasedAmount: number;
  paidAmount: number;
  paymentType: 'full' | 'partial';
  paymentEvents: Array<{
    date: string;
    amount: number;
    note?: string;
  }>;
  notes: string;
  fyStartYear: number;
  createdAt: string;
};

type SupplierOption = { id: string; name: string };
type ProductOption = { id: string; name: string; unit?: string };
type TableSortKey =
  | 'vendorName'
  | 'productName'
  | 'tinsCount'
  | 'purchasedDate'
  | 'paymentDate'
  | 'fyStartYear'
  | 'purchasedAmount'
  | 'paidAmount'
  | 'balance'
  | 'paymentType';

const STORAGE_KEY = 'tom_vendor_payment_reference_v1';
const STORAGE_KEY_SESSION = 'tom_vendor_payment_reference_v1_session';

function toYmd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function fyFromDate(dateLike: string) {
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return getFinancialYearStartYear(new Date());
  return getFinancialYearStartYear(d);
}

function parseStoredRows(raw: string | null): any[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && Array.isArray(parsed.rows)) return parsed.rows;
    return [];
  } catch {
    return [];
  }
}

export default function VendorPaymentReferencePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const allowed = ['admin', 'accountant', 'retail_staff'];

  const [rows, setRows] = useState<RefPayment[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loadingMasters, setLoadingMasters] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [productName, setProductName] = useState('');
  const [tinsCount, setTinsCount] = useState('');
  const [purchasedDate, setPurchasedDate] = useState(toYmd(new Date()));
  const [paymentDate, setPaymentDate] = useState(toYmd(new Date()));
  const [purchasedAmount, setPurchasedAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentType, setPaymentType] = useState<'full' | 'partial'>('full');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fyFilter, setFyFilter] = useState<number | 'all'>(getFinancialYearStartYear(new Date()));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fundTargetId, setFundTargetId] = useState<string | null>(null);
  const [fundAmount, setFundAmount] = useState('');
  const [fundDate, setFundDate] = useState(toYmd(new Date()));
  const [fundNotes, setFundNotes] = useState('');
  const [sortBy, setSortBy] = useState<TableSortKey>('paymentDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!allowed.includes(session.user?.role || '')) router.push('/dashboard');
  }, [session, status, router]);

  useEffect(() => {
    try {
      const localRows = parseStoredRows(localStorage.getItem(STORAGE_KEY));
      const sessionRows = parseStoredRows(sessionStorage.getItem(STORAGE_KEY_SESSION));
      const sourceRows = localRows.length >= sessionRows.length ? localRows : sessionRows;
      if (sourceRows.length > 0) {
        const migrated: RefPayment[] = sourceRows.map((r: any) => {
          const oldAmount = Number(r?.amount || 0);
          const existingPurchased = Number(r?.purchasedAmount || 0);
          const existingPaid = Number(r?.paidAmount || 0);
          const purchased = existingPurchased > 0 ? existingPurchased : oldAmount;
          const paid = existingPaid > 0 ? existingPaid : oldAmount;
          const type: 'full' | 'partial' =
            r?.paymentType === 'partial' || paid < purchased ? 'partial' : 'full';
          const eventsRaw = Array.isArray(r?.paymentEvents) ? r.paymentEvents : [];
          const events =
            eventsRaw.length > 0
              ? eventsRaw
                  .map((e: any) => ({
                    date: String(e?.date || ''),
                    amount: Number(e?.amount || 0),
                    note: String(e?.note || ''),
                  }))
                  .filter((e: any) => e.date && Number.isFinite(e.amount) && e.amount > 0)
              : [{ date: String(r?.paymentDate || toYmd(new Date())), amount: paid, note: 'Initial payment' }];
          return {
            id: String(r?.id || `vpr-${Date.now()}`),
            vendorName: String(r?.vendorName || ''),
            productName: String(r?.productName || ''),
            tinsCount: Number(r?.tinsCount || 0),
            purchasedDate: String(r?.purchasedDate || r?.paymentDate || toYmd(new Date())),
            paymentDate: String(r?.paymentDate || toYmd(new Date())),
            purchasedAmount: purchased,
            paidAmount: paid,
            paymentType: type,
            paymentEvents: events,
            notes: String(r?.notes || ''),
            fyStartYear: Number(r?.fyStartYear || getFinancialYearStartYear(new Date())),
            createdAt: String(r?.createdAt || new Date().toISOString()),
          };
        });
        setRows(migrated);
      }
    } catch {
      // ignore
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const payload = JSON.stringify(rows);
    localStorage.setItem(STORAGE_KEY, payload);
    sessionStorage.setItem(STORAGE_KEY_SESSION, payload);
  }, [rows, isHydrated]);

  useEffect(() => {
    if (!session?.user || !allowed.includes(session.user.role || '')) return;
    const loadMasters = async () => {
      try {
        setLoadingMasters(true);
        const [supRes, prodRes] = await Promise.all([
          fetch('/api/suppliers', { credentials: 'include' }),
          fetch('/api/products', { credentials: 'include' }),
        ]);
        const supJson = await supRes.json();
        const prodJson = await prodRes.json();

        const supList = Array.isArray(supJson.suppliers)
          ? supJson.suppliers.map((s: any) => ({ id: String(s.id), name: String(s.name) }))
          : [];
        const prodList = Array.isArray(prodJson.products)
          ? prodJson.products.map((p: any) => ({ id: String(p.id), name: String(p.name), unit: String(p.unit || '') }))
          : [];

        setSuppliers(supList.sort((a: SupplierOption, b: SupplierOption) => a.name.localeCompare(b.name)));
        setProducts(prodList.sort((a: ProductOption, b: ProductOption) => a.name.localeCompare(b.name)));
      } catch {
        // keep manual entries fallback if master fetch fails
        setSuppliers([]);
        setProducts([]);
      } finally {
        setLoadingMasters(false);
      }
    };
    void loadMasters();
  }, [session]);

  const fyOptions = useMemo(() => {
    const set = new Set<number>();
    rows.forEach((r) => set.add(r.fyStartYear));
    const current = getFinancialYearStartYear(new Date());
    set.add(current);
    return Array.from(set).sort((a, b) => b - a);
  }, [rows]);

  const filteredRows = useMemo(
    () => (fyFilter === 'all' ? rows : rows.filter((r) => r.fyStartYear === fyFilter)),
    [rows, fyFilter],
  );

  useEffect(() => {
    if (!isHydrated) return;
    if (rows.length === 0) return;
    if (fyFilter === 'all') return;
    const hasInSelectedFy = rows.some((r) => r.fyStartYear === fyFilter);
    if (!hasInSelectedFy) {
      setFyFilter('all');
      setNotice('Showing Overall (All FY) because no entries exist in current FY.');
    }
  }, [rows, fyFilter, isHydrated]);

  const total = useMemo(
    () => filteredRows.reduce((acc, r) => acc + Number(r.paidAmount || 0), 0),
    [filteredRows],
  );

  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    const txt = (v: unknown) => String(v ?? '').toLowerCase();
    return [...filteredRows].sort((a, b) => {
      if (sortBy === 'vendorName') return txt(a.vendorName).localeCompare(txt(b.vendorName)) * dir;
      if (sortBy === 'productName') return txt(a.productName).localeCompare(txt(b.productName)) * dir;
      if (sortBy === 'paymentType') return txt(a.paymentType).localeCompare(txt(b.paymentType)) * dir;
      if (sortBy === 'tinsCount') return (Number(a.tinsCount || 0) - Number(b.tinsCount || 0)) * dir;
      if (sortBy === 'purchasedAmount') return (Number(a.purchasedAmount || 0) - Number(b.purchasedAmount || 0)) * dir;
      if (sortBy === 'paidAmount') return (Number(a.paidAmount || 0) - Number(b.paidAmount || 0)) * dir;
      if (sortBy === 'balance') {
        const av = Number(a.purchasedAmount || 0) - Number(a.paidAmount || 0);
        const bv = Number(b.purchasedAmount || 0) - Number(b.paidAmount || 0);
        return (av - bv) * dir;
      }
      if (sortBy === 'fyStartYear') return (Number(a.fyStartYear || 0) - Number(b.fyStartYear || 0)) * dir;
      if (sortBy === 'purchasedDate') return (new Date(a.purchasedDate).getTime() - new Date(b.purchasedDate).getTime()) * dir;
      if (sortBy === 'paymentDate') return (new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()) * dir;
      return 0;
    });
  }, [filteredRows, sortBy, sortDir]);

  const onSort = (key: TableSortKey) => {
    if (sortBy === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortDir('asc');
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const name = vendorName.trim();
    const product = productName.trim();
    const tins = Number(tinsCount);
    const purchasedAmt = Number(purchasedAmount);
    const paidAmt = Number(paymentType === 'full' ? purchasedAmount : paidAmount);
    if (!name) return setError('Vendor name is required');
    if (!product) return setError('Product is required');
    if (!Number.isFinite(tins) || tins <= 0) return setError('No. of tins must be greater than 0');
    if (!purchasedDate) return setError('Purchased date is required');
    if (!paymentDate) return setError('Payment date is required');
    if (!Number.isFinite(purchasedAmt) || purchasedAmt <= 0) return setError('Purchased amount must be greater than 0');
    if (!Number.isFinite(paidAmt) || paidAmt <= 0) return setError('Paid amount must be greater than 0');
    if (paidAmt > purchasedAmt) return setError('Paid amount cannot be greater than purchased amount');

    const row: RefPayment = {
      id: editingId || `vpr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      vendorName: name,
      productName: product,
      tinsCount: tins,
      purchasedDate,
      paymentDate,
      purchasedAmount: purchasedAmt,
      paidAmount: paidAmt,
      paymentType,
      paymentEvents: [
        {
          date: paymentDate,
          amount: paidAmt,
          note: paymentType === 'partial' ? 'Initial partial payment' : 'Initial full payment',
        },
      ],
      notes: notes.trim(),
      fyStartYear: fyFromDate(paymentDate),
      createdAt: new Date().toISOString(),
    };
    setRows((prev) => {
      if (!editingId) return [row, ...prev];
      return prev.map((r) => (r.id === editingId ? { ...r, ...row, createdAt: r.createdAt } : r));
    });
    setVendorName('');
    setProductName('');
    setTinsCount('');
    setPurchasedDate(toYmd(new Date()));
    setPurchasedAmount('');
    setPaidAmount('');
    setPaymentType('full');
    setNotes('');
    setEditingId(null);
    setNotice(editingId ? 'Reference entry updated.' : 'Reference payment entry saved.');
  };

  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

  const startEdit = (r: RefPayment) => {
    setEditingId(r.id);
    setVendorName(r.vendorName);
    setProductName(r.productName);
    setTinsCount(String(r.tinsCount));
    setPurchasedDate(r.purchasedDate);
    setPurchasedAmount(String(r.purchasedAmount));
    setPaymentDate(r.paymentDate);
    setPaymentType(r.paymentType);
    setPaidAmount(String(r.paidAmount));
    setNotes(r.notes || '');
    setNotice('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveTopup = () => {
    if (!fundTargetId) return;
    const add = Number(fundAmount);
    if (!Number.isFinite(add) || add <= 0) {
      setError('Add funds amount must be greater than 0');
      return;
    }
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== fundTargetId) return r;
        const nextPaid = Math.min(r.purchasedAmount, Number(r.paidAmount || 0) + add);
        const nextType: 'full' | 'partial' = nextPaid + 0.0001 >= r.purchasedAmount ? 'full' : 'partial';
        const mergedNotes = [r.notes, fundNotes ? `Top-up: ${fundNotes}` : '']
          .filter(Boolean)
          .join(' | ')
          .slice(0, 500);
        return {
          ...r,
          paidAmount: nextPaid,
          paymentType: nextType,
          paymentDate: fundDate || r.paymentDate,
          paymentEvents: [
            ...(Array.isArray(r.paymentEvents) ? r.paymentEvents : []),
            {
              date: fundDate || toYmd(new Date()),
              amount: add,
              note: fundNotes || 'Top-up payment',
            },
          ],
          notes: mergedNotes,
          fyStartYear: fyFromDate(fundDate || r.paymentDate),
        };
      }),
    );
    setFundTargetId(null);
    setFundAmount('');
    setFundDate(toYmd(new Date()));
    setFundNotes('');
    setError('');
    setNotice('Funds added successfully.');
  };

  if (status === 'loading') return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!session || !allowed.includes(session.user?.role || '')) return <div className="min-h-screen flex items-center justify-center">Access denied</div>;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Vendor Payment Reference</h1>
          <p className="text-slate-600 mt-1">
            Separate reference sheet only. This page is not used in P&amp;L or accounting reports.
          </p>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {notice && <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{notice}</div>}

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-6">
          <form className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4" onSubmit={submit}>
            <div className="xl:col-span-1">
              <label className="block text-xs text-slate-600 mb-1">Vendor *</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
              >
                <option value="">{loadingMasters ? 'Loading vendors...' : 'Select vendor'}</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="xl:col-span-1">
              <label className="block text-xs text-slate-600 mb-1">Product *</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
              >
                <option value="">{loadingMasters ? 'Loading products...' : 'Select product'}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                    {p.unit ? ` (${p.unit})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="xl:col-span-1">
              <label className="block text-xs text-slate-600 mb-1">No. of tins *</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={tinsCount}
                onChange={(e) => setTinsCount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="xl:col-span-1">
              <label className="block text-xs text-slate-600 mb-1">Purchased date *</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={purchasedDate}
                onChange={(e) => setPurchasedDate(e.target.value)}
              />
            </div>
            <div className="xl:col-span-1">
              <label className="block text-xs text-slate-600 mb-1">Purchased amount (₹) *</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={purchasedAmount}
                onChange={(e) => {
                  setPurchasedAmount(e.target.value);
                  if (paymentType === 'full') setPaidAmount(e.target.value);
                }}
                placeholder="0.00"
              />
            </div>
            <div className="xl:col-span-1">
              <label className="block text-xs text-slate-600 mb-1">Payment date *</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div className="xl:col-span-1">
              <label className="block text-xs text-slate-600 mb-1">Payment option *</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={paymentType}
                onChange={(e) => {
                  const v = e.target.value as 'full' | 'partial';
                  setPaymentType(v);
                  if (v === 'full') setPaidAmount(purchasedAmount);
                }}
              >
                <option value="full">Full payment</option>
                <option value="partial">Partial payment</option>
              </select>
            </div>
            <div className="xl:col-span-1">
              <label className="block text-xs text-slate-600 mb-1">Paid now (₹) *</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={paymentType === 'full' ? purchasedAmount : paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="0.00"
                disabled={paymentType === 'full'}
              />
            </div>
            <div className="md:col-span-2 xl:col-span-4">
              <label className="block text-xs text-slate-600 mb-1">Notes</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional remarks"
              />
            </div>
            <div className="md:col-span-2 xl:col-span-4 flex justify-end">
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                {editingId ? 'Update' : 'Save'}
              </button>
            </div>
          </form>
        </div>

        {fundTargetId && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-700 mb-1">Add funds amount (₹)</label>
                <input
                  type="number"
                  min={0.01}
                  step="0.01"
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm"
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-700 mb-1">Payment date</label>
                <input
                  type="date"
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm"
                  value={fundDate}
                  onChange={(e) => setFundDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-700 mb-1">Top-up notes</label>
                <input
                  className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm"
                  value={fundNotes}
                  onChange={(e) => setFundNotes(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={saveTopup} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700">
                  Add funds
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFundTargetId(null);
                    setFundAmount('');
                    setFundDate(toYmd(new Date()));
                    setFundNotes('');
                  }}
                  className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-medium hover:bg-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <label className="block text-xs text-slate-600 mb-1">Financial Year</label>
              <select
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={fyFilter}
                onChange={(e) => setFyFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              >
                <option value="all">Overall (All FY)</option>
                {fyOptions.map((fy) => (
                  <option key={fy} value={fy}>
                    {formatFinancialYearLabel(fy)}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-sm text-slate-700">
              Paid total: <span className="font-semibold">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => onSort('vendorName')}>Vendor {sortBy === 'vendorName' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => onSort('productName')}>Product {sortBy === 'productName' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 text-right cursor-pointer select-none" onClick={() => onSort('tinsCount')}>No. of tins {sortBy === 'tinsCount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => onSort('purchasedDate')}>Purchased date {sortBy === 'purchasedDate' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => onSort('paymentDate')}>Date {sortBy === 'paymentDate' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => onSort('fyStartYear')}>FY {sortBy === 'fyStartYear' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 text-right cursor-pointer select-none" onClick={() => onSort('purchasedAmount')}>Purchased amt {sortBy === 'purchasedAmount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 text-right cursor-pointer select-none" onClick={() => onSort('paidAmount')}>Paid amt {sortBy === 'paidAmount' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 text-right cursor-pointer select-none" onClick={() => onSort('balance')}>Balance {sortBy === 'balance' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2 cursor-pointer select-none" onClick={() => onSort('paymentType')}>Type {sortBy === 'paymentType' ? (sortDir === 'asc' ? '▲' : '▼') : ''}</th>
                  <th className="px-3 py-2">Partial payment history</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="sticky right-0 z-20 bg-slate-50 px-3 py-2 text-right border-l border-slate-200 shadow-[-4px_0_10px_-6px_rgba(15,23,42,0.18)]">Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{r.vendorName}</td>
                    <td className="px-3 py-2">{r.productName}</td>
                    <td className="px-3 py-2 text-right">{r.tinsCount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2">{r.purchasedDate}</td>
                    <td className="px-3 py-2">{r.paymentDate}</td>
                    <td className="px-3 py-2">{formatFinancialYearLabel(r.fyStartYear)}</td>
                    <td className="px-3 py-2 text-right">₹{r.purchasedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right">₹{r.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 text-right">
                      ₹{Math.max(0, r.purchasedAmount - r.paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          r.paymentType === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {r.paymentType === 'partial' ? 'Partial' : 'Full'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-700">
                      {Array.isArray(r.paymentEvents) && r.paymentEvents.length > 0 ? (
                        <div className="space-y-2 min-w-[12rem]">
                          {r.paymentEvents.map((ev, idx) => (
                            <div key={`${r.id}-ev-${idx}`} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1.5">
                              <div className="font-semibold text-slate-900">
                                ₹{Number(ev.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-[11px] text-slate-600">
                                {ev.date || '—'}
                                {ev.note ? ` • ${ev.note}` : ''}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-3 py-2">{r.notes || '—'}</td>
                    <td className="sticky right-0 z-10 bg-white px-3 py-2 text-right border-l border-slate-200 shadow-[-4px_0_10px_-6px_rgba(15,23,42,0.12)]">
                      <div className="inline-flex gap-2">
                        <button type="button" className="text-indigo-600 hover:text-indigo-700 text-xs font-medium" onClick={() => startEdit(r)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-amber-700 hover:text-amber-800 text-xs font-medium"
                          onClick={() => {
                            setFundTargetId(r.id);
                            setFundAmount('');
                            setFundDate(toYmd(new Date()));
                            setFundNotes('');
                          }}
                        >
                          Add funds
                        </button>
                        <button type="button" className="text-red-600 hover:text-red-700 text-xs font-medium" onClick={() => remove(r.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={14} className="px-3 py-8 text-center text-slate-500">
                      No reference entries for selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

