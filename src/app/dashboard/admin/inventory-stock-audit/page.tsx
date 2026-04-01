'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { CANTEEN_LITERS_PER_TIN, packLitersPerUnit } from '@/lib/canteenSupply';

type PurchaseRow = {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number | string;
  purchaseDate?: string | null;
  invoiceNumber?: string | null;
};

type SaleItem = {
  productId?: string;
  productName?: string;
  quantity?: number;
};

type SaleRow = {
  invoiceNumber?: string;
  invoiceDate?: string | null;
  createdAt?: string | null;
  items?: SaleItem[];
};

type ProductRow = { id: string; name: string; unit: string };

function toNum(v: unknown) {
  const n = Number(v || 0);
  return Number.isFinite(n) ? n : 0;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 });
}

export default function InventoryStockAuditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) router.push('/login');
  }, [status, session, router]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        const [pRes, sRes, prodRes] = await Promise.all([
          fetch('/api/stock-purchases?limit=5000'),
          fetch(`/api/reports/sales?startDate=2000-01-01&endDate=${new Date().toISOString().slice(0, 10)}`),
          fetch('/api/products?limit=5000'),
        ]);
        const pJson = await pRes.json();
        const sJson = await sRes.json();
        const prodJson = await prodRes.json();

        if (!pRes.ok || !sRes.ok || !prodRes.ok) throw new Error('Failed to fetch audit data');
        setPurchases(Array.isArray(pJson.purchases) ? pJson.purchases : []);
        setSales(Array.isArray(sJson?.data?.sales) ? sJson.data.sales : []);
        setProducts(Array.isArray(prodJson.products) ? prodJson.products : []);
      } catch (e) {
        setError('Unable to load stock audit data.');
      } finally {
        setLoading(false);
      }
    };
    if (session?.user) run();
  }, [session]);

  const productMap = useMemo(() => {
    const m = new Map<string, ProductRow>();
    for (const p of products) m.set(String(p.id), p);
    return m;
  }, [products]);

  const purchaseLines = useMemo(() => {
    return purchases
      .filter((r) => {
        const pid = String(r.productId || '').trim();
        const name = String(r.productName || '').toLowerCase();
        return pid === 'castor-200ml' || pid === '55336' || pid === '68539' || (name.includes('castor') && name.includes('200'));
      })
      .map((r) => {
      const pid = String(r.productId || '');
      const qty = toNum(r.quantity);
      const name = String(r.productName || productMap.get(pid)?.name || pid);
      const unit = String(r.unit || productMap.get(pid)?.unit || '');
      const liters = packLitersPerUnit(name, unit, pid);
      return {
        key: `p-${r.id}`,
        date: String(r.purchaseDate || '').slice(0, 10),
        ref: r.invoiceNumber || '-',
        productId: pid,
        productName: name,
        unit,
        bottles: qty,
        tins: liters != null ? (qty * liters) / CANTEEN_LITERS_PER_TIN : 0,
      };
      });
  }, [purchases, productMap]);

  const saleLines = useMemo(() => {
    const out: Array<{
      key: string;
      date: string;
      ref: string;
      productId: string;
      productName: string;
      unit: string;
      bottles: number;
      tins: number;
    }> = [];
    for (const s of sales) {
      const date = String(s.invoiceDate || s.createdAt || '').slice(0, 10);
      const ref = String(s.invoiceNumber || '-');
      for (const it of s.items || []) {
        const pid = String(it.productId || '');
        const itemName = String(it.productName || '').toLowerCase();
        if (!(pid === 'castor-200ml' || pid === '55336' || pid === '68539' || (itemName.includes('castor') && itemName.includes('200')))) {
          continue;
        }
        const qty = toNum(it.quantity);
        const prod = productMap.get(pid);
        const unit = String(prod?.unit || '');
        const name = String(it.productName || prod?.name || pid);
        const liters = packLitersPerUnit(name, unit, pid);
        out.push({
          key: `s-${ref}-${pid}-${out.length}`,
          date,
          ref,
          productId: pid,
          productName: name,
          unit,
          bottles: qty,
          tins: liters != null ? (qty * liters) / CANTEEN_LITERS_PER_TIN : 0,
        });
      }
    }
    return out;
  }, [sales, productMap]);

  const totals = useMemo(() => {
    const pB = purchaseLines.reduce((s, r) => s + r.bottles, 0);
    const pT = purchaseLines.reduce((s, r) => s + r.tins, 0);
    const sB = saleLines.reduce((s, r) => s + r.bottles, 0);
    const sT = saleLines.reduce((s, r) => s + r.tins, 0);
    return { pB, pT, sB, sT, bBal: pB - sB, tBal: pT - sT };
  }, [purchaseLines, saleLines]);

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportExcel = async () => {
    try {
      setExporting('excel');
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Trinity Oil Mills';
      wb.created = new Date();

      const summary = wb.addWorksheet('Summary');
      summary.addRow(['Castor 200ml Audit (Temporary)']);
      summary.addRow([]);
      summary.addRow(['Metric', 'Bottles', 'Tins']);
      summary.addRow(['Purchased', totals.pB, totals.pT]);
      summary.addRow(['Sold', totals.sB, totals.sT]);
      summary.addRow(['Balance (Purchase - Sold)', totals.bBal, totals.tBal]);

      const pws = wb.addWorksheet('Purchase Breakup');
      pws.addRow(['Date', 'Invoice', 'Product', 'Bottles/Units', 'Tins']);
      for (const r of purchaseLines) pws.addRow([r.date || '-', r.ref, r.productName, r.bottles, r.tins]);

      const sws = wb.addWorksheet('Sold Breakup');
      sws.addRow(['Date', 'Invoice', 'Product', 'Bottles/Units', 'Tins']);
      for (const r of saleLines) sws.addRow([r.date || '-', r.ref, r.productName, r.bottles, r.tins]);

      const buf = await wb.xlsx.writeBuffer();
      downloadBlob(
        new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `castor-200ml-audit-${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } finally {
      setExporting(null);
    }
  };

  const exportPdf = async () => {
    try {
      setExporting('pdf');
      const { jsPDF } = await import('jspdf/dist/jspdf.es.min.js');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const left = 40;
      const lineH = 16;
      let y = 40;
      const newPage = () => { doc.addPage(); y = 40; };
      const print = (text: string, bold = false) => {
        if (y > 790) newPage();
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.text(text, left, y);
        y += lineH;
      };

      print('Castor 200ml Audit (Temporary)', true);
      print(`Generated: ${new Date().toLocaleString('en-IN')}`);
      y += 6;
      print(`Purchased: ${fmt(totals.pB)} bottles | ${fmt(totals.pT)} tins`, true);
      print(`Sold: ${fmt(totals.sB)} bottles | ${fmt(totals.sT)} tins`, true);
      print(`Balance: ${fmt(totals.bBal)} bottles | ${fmt(totals.tBal)} tins`, true);
      y += 8;

      print('Purchase Breakup', true);
      for (const r of purchaseLines) {
        print(`${r.date || '-'} | ${r.ref} | ${r.productName} | ${fmt(r.bottles)} | ${fmt(r.tins)}`);
      }
      y += 8;
      print('Sold Breakup', true);
      for (const r of saleLines) {
        print(`${r.date || '-'} | ${r.ref} | ${r.productName} | ${fmt(r.bottles)} | ${fmt(r.tins)}`);
      }

      doc.save(`castor-200ml-audit-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(null);
    }
  };

  if (status === 'loading' || loading) return <div className="p-8">Loading...</div>;
  if (!session?.user) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h1 className="text-xl font-semibold text-gray-900">Castor 200ml Audit (Temporary)</h1>
          <p className="text-sm text-gray-600 mt-1">Only `TOM - Castor Oil - 200 Ml` breakup (Bottles + Tins).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={exportPdf}
              disabled={exporting != null}
              className="px-3 py-2 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white disabled:opacity-60"
            >
              {exporting === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
            </button>
            <button
              onClick={exportExcel}
              disabled={exporting != null}
              className="px-3 py-2 text-sm rounded-md bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
            >
              {exporting === 'excel' ? 'Exporting Excel...' : 'Export Excel'}
            </button>
          </div>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="text-xs text-blue-700">Purchased</p>
            <p className="text-sm font-semibold text-blue-900">{fmt(totals.pB)} bottles | {fmt(totals.pT)} tins</p>
          </div>
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <p className="text-xs text-amber-700">Sold</p>
            <p className="text-sm font-semibold text-amber-900">{fmt(totals.sB)} bottles | {fmt(totals.sT)} tins</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
            <p className="text-xs text-emerald-700">Balance (Purchase - Sold)</p>
            <p className="text-sm font-semibold text-emerald-900">{fmt(totals.bBal)} bottles | {fmt(totals.tBal)} tins</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Purchase Breakup</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Invoice</th>
                  <th className="py-2 text-left">Product</th>
                  <th className="py-2 text-right">Bottles/Units</th>
                  <th className="py-2 text-right">Tins</th>
                </tr>
              </thead>
              <tbody>
                {purchaseLines.map((r) => (
                  <tr key={r.key} className="border-b border-gray-100">
                    <td className="py-2">{r.date || '-'}</td>
                    <td className="py-2">{r.ref}</td>
                    <td className="py-2">{r.productName}</td>
                    <td className="py-2 text-right">{fmt(r.bottles)}</td>
                    <td className="py-2 text-right">{fmt(r.tins)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Sold Breakup</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-600">
                  <th className="py-2 text-left">Date</th>
                  <th className="py-2 text-left">Invoice</th>
                  <th className="py-2 text-left">Product</th>
                  <th className="py-2 text-right">Bottles/Units</th>
                  <th className="py-2 text-right">Tins</th>
                </tr>
              </thead>
              <tbody>
                {saleLines.map((r) => (
                  <tr key={r.key} className="border-b border-gray-100">
                    <td className="py-2">{r.date || '-'}</td>
                    <td className="py-2">{r.ref}</td>
                    <td className="py-2">{r.productName}</td>
                    <td className="py-2 text-right">{fmt(r.bottles)}</td>
                    <td className="py-2 text-right">{fmt(r.tins)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

