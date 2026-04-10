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

type MaterialRow = {
  item: string;
  quantityDetails: string;
  soldValue: number;
  soldUnit: string;
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
    purchaseKeywords: [],
    soldMode: 'bottles',
  },
  {
    key: 'packing',
    label: 'Packing',
    soldUnit: 'Nos',
    balanceUnit: 'Nos',
    purchaseProductIds: ['pack_inner_cap_5l', 'pack_inner_cap_1l', 'pack_inner_cap_500ml', 'pack_inner_cap_200ml'],
    purchaseKeywords: [],
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
    purchaseKeywords: [],
    soldMode: 'bottles',
  },
  {
    key: 'box',
    label: 'Box',
    soldUnit: 'Nos',
    balanceUnit: 'Nos',
    purchaseProductIds: ['pack_carton_box'],
    purchaseKeywords: [],
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
    purchaseKeywords: [],
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
    const arr = Array.from(years).sort((a, b) => b - a);
    const current = getFinancialYearStartYear(new Date());
    if (!arr.includes(current)) arr.unshift(current);
    return arr;
  }, [sales, purchases]);

  useEffect(() => {
    if (!session?.user || !allowed.includes(session.user.role || '')) return;

    const run = async () => {
      try {
        setLoading(true);
        setError('');

        const [salesRes, purchasesRes] = await Promise.all([
          fetch('/api/sales?category=canteen&limit=5000', { credentials: 'include' }),
          fetch('/api/stock-purchases?limit=5000', {
            credentials: 'include',
          }),
        ]);

        const salesJson = await salesRes.json();
        const purchasesJson = await purchasesRes.json();

        if (!salesRes.ok) throw new Error(salesJson.error || 'Failed to load sales');
        if (!purchasesRes.ok) throw new Error(purchasesJson.error || 'Failed to load stock purchases');

        const allSales = Array.isArray(salesJson.sales) ? salesJson.sales : [];
        const allPurchases = Array.isArray(purchasesJson.purchases) ? purchasesJson.purchases : [];
        setSales(allSales);
        setPurchases(allPurchases);

      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load data');
        setSales([]);
        setPurchases([]);
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
    const totalTinsSoldInFy = salesInFy.reduce((acc, s) => acc + num(s.totalTins), 0);
    const totalBottlesSoldInFy = salesInFy.reduce((acc, s) => acc + num(s.totalBottles), 0);

    const getMatchTotalQty = (productIds: string[]) =>
      purchasesInFy.reduce((acc, p) => {
        const productId = String(p.productId || '').trim().toLowerCase();
        const byId = productIds.some((id) => productId === id.toLowerCase());
        if (!byId) return acc;
        return acc + num(p.quantity);
      }, 0);

    const getMatchTotalPurchaseAmount = (productIds: string[]) =>
      purchasesInFy.reduce((acc, p) => {
        const productId = String(p.productId || '').trim().toLowerCase();
        const byId = productIds.some((id) => productId === id.toLowerCase());
        if (!byId) return acc;
        return acc + num(p.totalAmount);
      }, 0);

    return ITEM_CONFIG.map((cfg) => {
      const purchasedRaw = getMatchTotalQty(cfg.purchaseProductIds);
      const purchasedAmount = getMatchTotalPurchaseAmount(cfg.purchaseProductIds);
      const sold =
        cfg.soldMode === 'tins' ? totalTinsSoldInFy : cfg.soldMode === 'bottles' ? totalBottlesSoldInFy : 0;
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
        balanceValue: balance,
        balanceUnit: cfg.balanceUnit,
        paymentValue: purchasedAmount,
      };
    });
  }, [purchases, sales, selectedFyStartYear]);

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
                <th className="px-4 py-3 text-right">Sold</th>
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
                      ? `${r.soldValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })} ${r.soldUnit}`
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
    </div>
  );
}

