'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  formatFinancialYearLabel,
  getFinancialYearEndDate,
  getFinancialYearStartDate,
  getFinancialYearStartYear,
} from '@/lib/financialYear';
import { CANTEEN_LITERS_PER_TIN } from '@/lib/canteenSupply';

type SaleRow = {
  id?: string | null;
  invoiceNumber?: string | null;
  saleType?: string | null;
  canteenName?: string | null;
  customerName?: string | null;
  totalBottles?: number | null;
  totalTins?: number | null;
  invoiceDate?: string | null;
  createdAt?: string | null;
};

type StockPurchaseRow = {
  id?: string | null;
  productId?: string | null;
  productName?: string | null;
  quantity?: number | string | null;
  totalAmount?: number | string | null;
  purchaseDate?: string | null;
};

type SalesReturnRow = {
  quantity?: number | string | null;
  unit?: string | null;
  returnNature?: string | null;
  returnDate?: string | null;
  productName?: string | null;
};

type MaterialRow = {
  item: string;
  quantityDetails: string;
  soldValue: number;
  soldUnit: string;
  returnedValue: number | null;
  returnedUnit: string;
  balanceValue: number | null;
  balanceUnit: string;
  paymentValue: number;
};

type ItemMatcher = {
  key: string;
  label: string;
  soldUnit: string;
  balanceUnit: string;
  purchaseToDisplayFactor?: number;
  purchaseProductIds: string[];
  purchaseKeywords: string[];
  soldMode: 'tins' | 'bottles' | 'none';
};

const CASTOR_200ML_BOTTLES_PER_TIN = CANTEEN_LITERS_PER_TIN / 0.2;

const ITEM_CONFIG: ItemMatcher[] = [
  {
    key: 'castor_oil',
    label: 'TOM Castor Oil',
    soldUnit: 'Tins',
    balanceUnit: 'Tins',
    purchaseToDisplayFactor: CASTOR_200ML_BOTTLES_PER_TIN,
    purchaseProductIds: ['castor-200ml', '55336', '68539', 'purch-castor'],
    purchaseKeywords: [],
    soldMode: 'tins',
  },
  {
    key: 'bottles',
    label: 'Bottles',
    soldUnit: 'Bottles',
    balanceUnit: 'Nos',
    purchaseProductIds: ['pack_pet_bottle_5l', 'pack_pet_bottle_1l', 'pack_pet_bottle_500ml', 'pack_pet_bottle_200ml', 'prod_bottle_1l', 'prod_bottle_500ml'],
    purchaseKeywords: ['pet bottle', 'bottle'],
    soldMode: 'bottles',
  },
  {
    key: 'packing',
    label: 'Packing',
    soldUnit: 'Nos',
    balanceUnit: 'Nos',
    purchaseProductIds: ['pack_inner_cap_5l', 'pack_inner_cap_1l', 'pack_inner_cap_500ml', 'pack_inner_cap_200ml'],
    purchaseKeywords: ['inner cap', 'cap'],
    soldMode: 'bottles',
  },
  {
    key: 'cover',
    label: 'Cover',
    soldUnit: 'Nos',
    balanceUnit: 'Nos',
    purchaseProductIds: [
      'pack_front_label_5l',
      'pack_front_label_1l',
      'pack_front_label_500ml',
      'pack_front_label_200ml',
      'pack_back_label_5l',
      'pack_back_label_1l',
      'pack_back_label_500ml',
      'pack_back_label_200ml',
      'pack_flip_top_cap_5l_green',
      'pack_flip_top_cap_1l_green',
      'pack_flip_top_cap_500ml_green',
      'pack_flip_top_cap_200ml_green',
      'pack_flip_top_cap_5l_red',
      'pack_flip_top_cap_1l_red',
      'pack_flip_top_cap_500ml_red',
      'pack_flip_top_cap_200ml_red',
      'pack_flip_top_cap_5l_white',
      'pack_flip_top_cap_1l_white',
      'pack_flip_top_cap_500ml_white',
      'pack_flip_top_cap_200ml_white',
      'pack_flip_top_cap_5l_yellow',
      'pack_flip_top_cap_1l_yellow',
      'pack_flip_top_cap_500ml_yellow',
      'pack_flip_top_cap_200ml_yellow',
    ],
    purchaseKeywords: ['label', 'flip top'],
    soldMode: 'bottles',
  },
  {
    key: 'box',
    label: 'Box',
    soldUnit: 'Nos',
    balanceUnit: 'Nos',
    purchaseProductIds: ['pack_carton_box'],
    purchaseKeywords: ['carton', 'box'],
    soldMode: 'none',
  },
  {
    key: 'printout',
    label: 'Printout',
    soldUnit: 'Nos',
    balanceUnit: 'Nos',
    purchaseProductIds: [],
    purchaseKeywords: [],
    soldMode: 'none',
  },
  {
    key: 'packing_bag',
    label: 'Packing bag',
    soldUnit: 'Nos',
    balanceUnit: 'Nos',
    purchaseProductIds: [],
    purchaseKeywords: ['packing bag', 'bag'],
    soldMode: 'bottles',
  },
];

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export default function MaterialBalancePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const allowed = ['admin', 'accountant', 'retail_staff'];

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [purchases, setPurchases] = useState<StockPurchaseRow[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturnRow[]>([]);
  const [selectedBreakupItemKey, setSelectedBreakupItemKey] = useState<string | null>(null);

  const [selectedFyStartYear, setSelectedFyStartYear] = useState<number | 'all'>(() => getFinancialYearStartYear(new Date()));

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!allowed.includes(session.user?.role || '')) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const getFyStart = (d: Date) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);
  const getFyStartFromDateLike = (value: string | null | undefined): number | null => {
    const raw = String(value || '').trim();
    // For timestamp values (e.g. "...Z"), prefer Date parsing so timezone is respected.
    // For plain YYYY-MM-DD, parse directly without timezone conversion.
    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const y = Number(dateOnly[1]);
      const mm = Number(dateOnly[2]); // 1..12
      if (Number.isFinite(y) && Number.isFinite(mm)) return mm >= 4 ? y : y - 1;
    }
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    return getFyStart(d);
  };
  const inFy = (value: string | null | undefined, fyStart: number) => {
    const fy = getFyStartFromDateLike(value);
    return fy !== null && fy === fyStart;
  };

  const isBottleLikeReturn = (unit: string, productName: string) => {
    const u = unit.trim().toLowerCase();
    const p = productName.trim().toLowerCase();
    return (
      u.includes('bottle') ||
      u === 'nos' ||
      u === 'no' ||
      u === 'pcs' ||
      u === 'piece' ||
      u === 'pieces' ||
      /\b\d+(\.\d+)?\s*ml\b/.test(u) ||
      /\b\d+(\.\d+)?\s*l(it(er|re))?\b/.test(u) ||
      p.includes('castor') ||
      p.includes('bottle')
    );
  };

  const fyOptions = useMemo(() => {
    const years = new Set<number>();
    sales.forEach((s) => {
      const d = new Date(String(s.invoiceDate || s.createdAt || ''));
      if (!Number.isNaN(d.getTime())) years.add(getFyStart(d));
    });
    purchases.forEach((p) => {
      const d = new Date(String(p.purchaseDate || ''));
      if (!Number.isNaN(d.getTime())) years.add(getFyStart(d));
    });
    salesReturns.forEach((r) => {
      const d = new Date(String(r.returnDate || ''));
      if (!Number.isNaN(d.getTime())) years.add(getFyStart(d));
    });
    const arr = Array.from(years).sort((a, b) => b - a);
    const current = getFinancialYearStartYear(new Date());
    if (!arr.includes(current)) arr.unshift(current);
    return arr;
  }, [sales, purchases, salesReturns]);

  useEffect(() => {
    if (!session?.user || !allowed.includes(session.user.role || '')) return;

    const run = async () => {
      try {
        setLoading(true);
        setError('');

        const [salesRes, purchasesRes, returnsRes] = await Promise.all([
          fetch('/api/sales?category=canteen&limit=5000', { credentials: 'include' }),
          fetch('/api/stock-purchases?limit=5000', {
            credentials: 'include',
          }),
          fetch('/api/sales-returns?saleType=canteen&limit=5000', { credentials: 'include' }),
        ]);

        const salesJson = await salesRes.json();
        const purchasesJson = await purchasesRes.json();
        const returnsJson = await returnsRes.json();

        if (!salesRes.ok) throw new Error(salesJson.error || 'Failed to load sales');
        if (!purchasesRes.ok) throw new Error(purchasesJson.error || 'Failed to load stock purchases');
        if (!returnsRes.ok) throw new Error(returnsJson.error || 'Failed to load sales returns');

        const allSales = Array.isArray(salesJson.sales) ? salesJson.sales : [];
        const allPurchases = Array.isArray(purchasesJson.purchases) ? purchasesJson.purchases : [];
        const allReturns = Array.isArray(returnsJson.returns) ? returnsJson.returns : [];
        setSales(allSales);
        setPurchases(allPurchases);
        setSalesReturns(allReturns);

      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
        setSales([]);
        setPurchases([]);
        setSalesReturns([]);
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [session]);

  const totalTinsSold = useMemo(() => sales.reduce((acc, s) => acc + num(s.totalTins), 0), [sales]);
  const totalBottlesSold = useMemo(() => sales.reduce((acc, s) => acc + num(s.totalBottles), 0), [sales]);

  const rows = useMemo<MaterialRow[]>(() => {
    const salesInFy =
      selectedFyStartYear === 'all'
        ? sales
        : sales.filter((s) => inFy(String(s.invoiceDate || s.createdAt || ''), selectedFyStartYear));
    const purchasesInFy =
      selectedFyStartYear === 'all'
        ? purchases
        : purchases.filter((p) => inFy(String(p.purchaseDate || ''), selectedFyStartYear));
    const returnsInFy =
      selectedFyStartYear === 'all'
        ? salesReturns
        : salesReturns.filter((r) => inFy(String(r.returnDate || ''), selectedFyStartYear));

    const totalBottlesReturnedInFy = returnsInFy.reduce((acc, r) => {
      const nature = String(r.returnNature || '').trim().toLowerCase();
      // Include dedicated free sample + existing/legacy return entries for material adjustment.
      if (!['sales_return', 'sales return', 'free_sample', 'free sample', 'expiry'].includes(nature)) return acc;
      const unit = String(r.unit || '');
      const productName = String(r.productName || '');
      if (!isBottleLikeReturn(unit, productName)) return acc;
      return acc + num(r.quantity);
    }, 0);

    const totalTinsSoldInFy = salesInFy.reduce((acc, s) => acc + num(s.totalTins), 0);
    const totalBottlesSoldInFy = salesInFy.reduce((acc, s) => acc + num(s.totalBottles), 0) - totalBottlesReturnedInFy;
    const netBottlesSoldInFy = Math.max(0, totalBottlesSoldInFy);

    const matchesPurchase = (p: StockPurchaseRow, productIds: string[], keywords: string[]) => {
      const productId = String(p.productId || '').trim().toLowerCase();
      const productName = String(p.productName || '').trim().toLowerCase();
      const byId = productIds.some((id) => productId === id.toLowerCase());
      const byKeyword = keywords.some((kw) => productName.includes(kw.toLowerCase()));
      return byId || byKeyword;
    };

    const getMatchTotalQty = (productIds: string[], keywords: string[]) =>
      purchasesInFy.reduce((acc, p) => {
        if (!matchesPurchase(p, productIds, keywords)) return acc;
        return acc + num(p.quantity);
      }, 0);

    const getMatchTotalPurchaseAmount = (productIds: string[], keywords: string[]) =>
      purchasesInFy.reduce((acc, p) => {
        if (!matchesPurchase(p, productIds, keywords)) return acc;
        return acc + num(p.totalAmount);
      }, 0);

    return ITEM_CONFIG.map((cfg) => {
      const purchasedRaw = getMatchTotalQty(cfg.purchaseProductIds, cfg.purchaseKeywords);
      const purchasedAmount = getMatchTotalPurchaseAmount(cfg.purchaseProductIds, cfg.purchaseKeywords);
      const sold =
        cfg.soldMode === 'tins' ? totalTinsSoldInFy : cfg.soldMode === 'bottles' ? netBottlesSoldInFy : 0;
      const returned = cfg.soldMode === 'bottles' ? totalBottlesReturnedInFy : null;
      const purchasedDisplay = purchasedRaw / (cfg.purchaseToDisplayFactor ?? 1);
      const balance = purchasedDisplay > 0 ? purchasedDisplay - sold : null;

      return {
        item: cfg.label,
        quantityDetails:
          purchasedDisplay > 0
            ? `${purchasedDisplay.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${cfg.balanceUnit}`
            : '—',
        soldValue: sold,
        soldUnit: cfg.soldUnit,
        returnedValue: returned,
        returnedUnit: 'Bottles',
        balanceValue: balance,
        balanceUnit: cfg.balanceUnit,
        paymentValue: purchasedAmount,
      };
    });
  }, [purchases, sales, salesReturns, selectedFyStartYear]);

  const returnsReductionSummary = useMemo(() => {
    const returnsInFy =
      selectedFyStartYear === 'all'
        ? salesReturns
        : salesReturns.filter((r) => inFy(String(r.returnDate || ''), selectedFyStartYear));

    const toLabel = (nature: string) => {
      if (nature === 'sales_return' || nature === 'sales return') return 'Sales Return';
      if (nature === 'free_sample' || nature === 'free sample') return 'Free Sample';
      if (nature === 'expiry') return 'Expiry';
      return nature || 'Other';
    };

    const bucket = new Map<string, number>();
    for (const r of returnsInFy) {
      const nature = String(r.returnNature || '').trim().toLowerCase();
      if (!['sales_return', 'sales return', 'free_sample', 'free sample', 'expiry'].includes(nature)) continue;
      const unit = String(r.unit || '');
      const productName = String(r.productName || '');
      if (!isBottleLikeReturn(unit, productName)) continue;
      const label = toLabel(nature);
      bucket.set(label, (bucket.get(label) || 0) + num(r.quantity));
    }

    const rows = Array.from(bucket.entries())
      .map(([label, quantity]) => ({ label, quantity }))
      .sort((a, b) => a.label.localeCompare(b.label));

    const total = rows.reduce((acc, r) => acc + r.quantity, 0);
    return { rows, total };
  }, [salesReturns, selectedFyStartYear]);

  const salesInSelectedFy = useMemo(
    () =>
      selectedFyStartYear === 'all'
        ? sales
        : sales.filter((s) => inFy(String(s.invoiceDate || s.createdAt || ''), selectedFyStartYear)),
    [sales, selectedFyStartYear],
  );

  const soldBreakupByItem = useMemo(() => {
    const map: Record<string, Array<{ date: string; invoice: string; party: string; qty: number; unit: string }>> = {};
    ITEM_CONFIG.forEach((cfg) => {
      const lines = salesInSelectedFy
        .map((s) => {
          const qty = cfg.soldMode === 'tins' ? num(s.totalTins) : cfg.soldMode === 'bottles' ? num(s.totalBottles) : 0;
          const dateRaw = String(s.invoiceDate || s.createdAt || '');
          const dt = new Date(dateRaw);
          const date = Number.isNaN(dt.getTime()) ? dateRaw.slice(0, 10) : dt.toLocaleDateString('en-GB');
          const party = String(s.canteenName || s.customerName || '—');
          const invoice = String(s.invoiceNumber || '—');
          return { date, invoice, party, qty, unit: cfg.soldUnit };
        })
        .filter((x) => x.qty > 0);
      map[cfg.key] = lines;
    });
    return map;
  }, [salesInSelectedFy]);

  const selectedBreakupConfig = selectedBreakupItemKey
    ? ITEM_CONFIG.find((x) => x.key === selectedBreakupItemKey) || null
    : null;
  const selectedBreakupLines = selectedBreakupItemKey ? soldBreakupByItem[selectedBreakupItemKey] || [] : [];
  const selectedBreakupTotal = selectedBreakupLines.reduce((acc, x) => acc + x.qty, 0);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (!session || !allowed.includes(session.user?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Material Balance Sheet</h1>
            <p className="text-slate-600 mt-1">FY-wise live view for oil, packing materials, sold quantity, balance, and payments.</p>
          </div>
          <div className="w-full sm:w-64">
            <label className="block text-sm font-medium text-slate-700 mb-1">Financial year (Apr-Mar)</label>
            <select
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={selectedFyStartYear}
              onChange={(e) => {
                const v = e.target.value;
                setSelectedFyStartYear(v === 'all' ? 'all' : Number(v));
              }}
            >
              <option value="all">Overall (All FY)</option>
              {fyOptions.map((y) => (
                <option key={y} value={y}>
                  {formatFinancialYearLabel(y)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Quantity / Details</th>
                <th className="px-4 py-3 text-right">Net Sold</th>
                <th className="px-4 py-3 text-right">Returned</th>
                <th className="px-4 py-3 text-right">Balance</th>
                <th className="px-4 py-3 text-right">Payment</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.item} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.item}</td>
                  <td className="px-4 py-3 text-slate-700">{r.quantityDetails}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {r.soldValue > 0
                      ? (
                        <button
                          type="button"
                          onClick={() => {
                            const cfg = ITEM_CONFIG.find((x) => x.label === r.item);
                            if (cfg) setSelectedBreakupItemKey(cfg.key);
                          }}
                          className="text-indigo-700 hover:text-indigo-900 underline underline-offset-2 font-medium"
                          title="Click to view sold breakup"
                        >
                          {`${r.soldValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${r.soldUnit}`}
                        </button>
                      )
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {r.returnedValue != null && r.returnedValue > 0
                      ? `${r.returnedValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${r.returnedUnit}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {r.balanceValue != null
                      ? `${r.balanceValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${r.balanceUnit}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {r.paymentValue > 0
                      ? `₹${r.paymentValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBreakupConfig && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Sold breakup - {selectedBreakupConfig.label}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedBreakupItemKey(null)}
                className="text-slate-500 hover:text-slate-700 text-sm"
              >
                Close
              </button>
            </div>
            <div className="p-4 max-h-[70vh] overflow-auto">
              {selectedBreakupLines.length === 0 ? (
                <p className="text-sm text-slate-600">No sold entries for selected FY.</p>
              ) : (
                <table className="min-w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-left">Invoice</th>
                      <th className="px-3 py-2 text-left">Sold To</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBreakupLines.map((x, idx) => (
                      <tr key={`${x.invoice}-${idx}`} className="border-t border-slate-100">
                        <td className="px-3 py-2">{x.date}</td>
                        <td className="px-3 py-2">{x.invoice}</td>
                        <td className="px-3 py-2">{x.party}</td>
                        <td className="px-3 py-2 text-right">
                          {x.qty.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {x.unit}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <div className="mt-3 text-sm text-slate-700">
                <span className="font-semibold">Total sold:</span>{' '}
                {selectedBreakupTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })} {selectedBreakupConfig.soldUnit}
              </div>

              {selectedBreakupConfig.soldMode === 'bottles' && (
                <div className="mt-2 text-sm text-slate-700">
                  <span className="font-semibold">Reduced total (returns/free sample/expiry):</span>{' '}
                  {returnsReductionSummary.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Bottles
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

