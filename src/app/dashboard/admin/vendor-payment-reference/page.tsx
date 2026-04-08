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
  amount: number;
  notes: string;
  fyStartYear: number;
  createdAt: string;
};

type SupplierOption = { id: string; name: string };
type ProductOption = { id: string; name: string; unit?: string };

const STORAGE_KEY = 'tom_vendor_payment_reference_v1';

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
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [fyFilter, setFyFilter] = useState<number | 'all'>(getFinancialYearStartYear(new Date()));

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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) setRows(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  }, [rows]);

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

  const total = useMemo(
    () => filteredRows.reduce((acc, r) => acc + Number(r.amount || 0), 0),
    [filteredRows],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const name = vendorName.trim();
    const product = productName.trim();
    const tins = Number(tinsCount);
    const amt = Number(amount);
    if (!name) return setError('Vendor name is required');
    if (!product) return setError('Product is required');
    if (!Number.isFinite(tins) || tins <= 0) return setError('No. of tins must be greater than 0');
    if (!purchasedDate) return setError('Purchased date is required');
    if (!paymentDate) return setError('Payment date is required');
    if (!Number.isFinite(amt) || amt <= 0) return setError('Amount must be greater than 0');

    const row: RefPayment = {
      id: `vpr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      vendorName: name,
      productName: product,
      tinsCount: tins,
      purchasedDate,
      paymentDate,
      amount: amt,
      notes: notes.trim(),
      fyStartYear: fyFromDate(paymentDate),
      createdAt: new Date().toISOString(),
    };
    setRows((prev) => [row, ...prev]);
    setVendorName('');
    setProductName('');
    setTinsCount('');
    setPurchasedDate(toYmd(new Date()));
    setAmount('');
    setNotes('');
    setNotice('Reference payment entry saved.');
  };

  const remove = (id: string) => setRows((prev) => prev.filter((r) => r.id !== id));

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

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6">
          <form className="grid grid-cols-1 md:grid-cols-6 gap-3" onSubmit={submit}>
            <div>
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
            <div>
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
            <div>
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
            <div>
              <label className="block text-xs text-slate-600 mb-1">Purchased date *</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={purchasedDate}
                onChange={(e) => setPurchasedDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Payment date *</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs text-slate-600 mb-1">Amount (₹) *</label>
              <input
                type="number"
                min={0.01}
                step="0.01"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-1 flex items-end">
              <button type="submit" className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
                Save
              </button>
            </div>
            <div className="md:col-span-4">
              <label className="block text-xs text-slate-600 mb-1">Notes</label>
              <input
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional remarks"
              />
            </div>
          </form>
        </div>

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
              Total: <span className="font-semibold">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-2">Vendor</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2 text-right">No. of tins</th>
                  <th className="px-3 py-2">Purchased date</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">FY</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2">Notes</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-medium text-slate-900">{r.vendorName}</td>
                    <td className="px-3 py-2">{r.productName}</td>
                    <td className="px-3 py-2 text-right">{r.tinsCount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2">{r.purchasedDate}</td>
                    <td className="px-3 py-2">{r.paymentDate}</td>
                    <td className="px-3 py-2">{formatFinancialYearLabel(r.fyStartYear)}</td>
                    <td className="px-3 py-2 text-right">₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2">{r.notes || '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="text-red-600 hover:text-red-700 text-xs font-medium" onClick={() => remove(r.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-8 text-center text-slate-500">
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

