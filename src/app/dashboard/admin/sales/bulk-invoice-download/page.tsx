'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type SaleRow = {
  id: string;
  invoiceNumber: string;
  saleType: string;
  totalAmount: number;
  invoiceDate?: string | null;
  createdAt: string;
  canteenName?: string | null;
  customerName?: string | null;
};

function saleDate(s: SaleRow): Date {
  const d = new Date((s.invoiceDate || s.createdAt) as string);
  return Number.isNaN(d.getTime()) ? new Date(s.createdAt) : d;
}

export default function BulkInvoiceDownloadPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);

  const [saleType, setSaleType] = useState('');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [quarter, setQuarter] = useState('');
  const [zipGroupBy, setZipGroupBy] = useState<'none' | 'month' | 'quarter' | 'year'>('none');
  const [search, setSearch] = useState('');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!['admin', 'accountant', 'retail_staff'].includes(session.user?.role || '')) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (!session || !['admin', 'accountant', 'retail_staff'].includes(session.user?.role || '')) return;
    const load = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await fetch('/api/sales?limit=2000');
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Failed to load sales');
          setSales([]);
          return;
        }
        setSales(Array.isArray(data.sales) ? data.sales : []);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  const years = useMemo(() => {
    const y = new Set<string>();
    sales.forEach((s) => y.add(String(saleDate(s).getFullYear())));
    return Array.from(y).sort((a, b) => Number(b) - Number(a));
  }, [sales]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      const d = saleDate(s);
      if (saleType && s.saleType !== saleType) return false;
      if (year && String(d.getFullYear()) !== year) return false;
      if (month && String(d.getMonth() + 1) !== month) return false;
      if (quarter) {
        const m = d.getMonth() + 1;
        const qtr = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';
        if (qtr !== quarter) return false;
      }
      if (q) {
        const blob = `${s.invoiceNumber} ${s.canteenName || ''} ${s.customerName || ''}`.toLowerCase();
        if (!blob.includes(q)) return false;
      }
      return true;
    });
  }, [sales, saleType, year, month, quarter, search]);

  const selectedCount = selectedIds.length;
  const selectedTotalValue = useMemo(
    () => filtered.filter((s) => selectedIds.includes(s.id)).reduce((sum, s) => sum + Number(s.totalAmount || 0), 0),
    [filtered, selectedIds],
  );

  const toggleId = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const addIds = (ids: string[]) => {
    setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
  };

  const selectFiltered = () => addIds(filtered.map((s) => s.id));
  const selectYearWise = () => {
    if (!year) return setError('Select a year first');
    addIds(filtered.filter((s) => String(saleDate(s).getFullYear()) === year).map((s) => s.id));
  };
  const selectMonthWise = () => {
    if (!month) return setError('Select a month first');
    addIds(filtered.filter((s) => String(saleDate(s).getMonth() + 1) === month).map((s) => s.id));
  };
  const selectQuarterWise = () => {
    if (!quarter) return setError('Select a quarter first');
    addIds(
      filtered
        .filter((s) => {
          const m = saleDate(s).getMonth() + 1;
          const qtr = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';
          return qtr === quarter;
        })
        .map((s) => s.id),
    );
  };

  const clearSelection = () => setSelectedIds([]);

  const downloadZip = async () => {
    if (selectedIds.length === 0) {
      setError('Select at least one invoice');
      return;
    }
    try {
      setIsDownloading(true);
      setError('');
      setSuccess('');
      const res = await fetch('/api/invoices/bulk-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ saleIds: selectedIds, groupBy: zipGroupBy }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to generate ZIP');
        return;
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices-bulk-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setSuccess(`Downloaded ZIP with ${selectedIds.length} invoice(s).`);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-lg">Loading...</div></div>;
  }

  if (!session || !['admin', 'accountant', 'retail_staff'].includes(session.user?.role || '')) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-lg">Access Denied</div></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bulk Invoice Downloader</h1>
            <p className="text-gray-600 mt-1">Month-wise, quarter-wise, year-wise invoice ZIP download (with optional folder grouping)</p>
          </div>
          <Link href="/dashboard/admin/sales" className="px-4 py-2 rounded-md bg-gray-700 text-white text-sm">Back to Sales</Link>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-md text-sm">{success}</div>}

        <div className="bg-white shadow rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoice/canteen" className="px-3 py-2 border rounded-md" />
          <select value={saleType} onChange={(e) => setSaleType(e.target.value)} className="px-3 py-2 border rounded-md">
            <option value="">All Types</option>
            <option value="canteen">Canteen</option>
            <option value="retail">Retail</option>
          </select>
          <select value={year} onChange={(e) => setYear(e.target.value)} className="px-3 py-2 border rounded-md">
            <option value="">All Years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="px-3 py-2 border rounded-md">
            <option value="">All Months</option>
            {Array.from({ length: 12 }).map((_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
          </select>
          <select value={quarter} onChange={(e) => setQuarter(e.target.value)} className="px-3 py-2 border rounded-md">
            <option value="">All Quarters</option>
            <option value="Q1">Q1 (Jan-Mar)</option>
            <option value="Q2">Q2 (Apr-Jun)</option>
            <option value="Q3">Q3 (Jul-Sep)</option>
            <option value="Q4">Q4 (Oct-Dec)</option>
          </select>
          <select
            value={zipGroupBy}
            onChange={(e) => setZipGroupBy(e.target.value as 'none' | 'month' | 'quarter' | 'year')}
            className="px-3 py-2 border rounded-md"
            title="Group PDFs into folders inside ZIP"
          >
            <option value="none">ZIP folders: None</option>
            <option value="month">ZIP folders: Month-wise</option>
            <option value="quarter">ZIP folders: Quarter-wise</option>
            <option value="year">ZIP folders: Year-wise</option>
          </select>
          <button onClick={downloadZip} disabled={isDownloading || selectedCount === 0} className="px-3 py-2 rounded-md bg-indigo-600 text-white disabled:opacity-50">
            {isDownloading ? 'Preparing ZIP...' : `Download ZIP (${selectedCount})`}
          </button>
        </div>

        <div className="bg-white shadow rounded-lg p-4 mb-4 flex flex-wrap gap-2 items-center">
          <button onClick={selectFiltered} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">Select filtered</button>
          <button onClick={selectYearWise} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">Select year-wise</button>
          <button onClick={selectMonthWise} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">Select month-wise</button>
          <button onClick={selectQuarterWise} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">Select quarter-wise</button>
          <button onClick={clearSelection} className="px-3 py-2 rounded-md bg-red-50 text-red-700 hover:bg-red-100 text-sm">Clear selection</button>
          <span className="ml-auto text-sm text-gray-600">Selected value: <span className="font-semibold text-gray-900">₹{selectedTotalValue.toFixed(2)}</span></span>
        </div>

        <div className="bg-white shadow rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Select</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Party</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">No invoices found for filters.</td></tr>
              ) : (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleId(s.id)} />
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-indigo-700">{s.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{saleDate(s).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{s.saleType}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{s.canteenName || s.customerName || '—'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">₹{Number(s.totalAmount || 0).toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

