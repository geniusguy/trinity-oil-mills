'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Product {
  id: string;
  name: string;
  unit: string;
}

interface Purchase {
  id: string;
  productId: string;
  productName: string;
  unit: string;
  quantity: number;
  supplierName: string;
  purchaseDate: string;
  unitPrice: number | null;
  totalAmount: number | null;
  invoiceNumber: string | null;
  notes: string | null;
  createdAt: string;
}

interface PurchaseDraftLine {
  id: string;
  productId: string;
  productLabel: string;
  quantity: number;
  supplierName: string;
  purchaseDate: string;
  unitPrice: number | null;
  totalAmount: number | null;
  invoiceNumber: string | null;
  notes: string | null;
}

export default function StockPurchasesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    productId: '',
    quantity: '',
    tins: '',
    supplierName: 'Yuvaraj',
    purchaseDate: new Date().toISOString().slice(0, 10),
    unitPrice: '',
    totalAmount: '',
    invoiceNumber: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [draftLines, setDraftLines] = useState<PurchaseDraftLine[]>([]);

  const [filters, setFilters] = useState({
    productId: '',
    supplier: '',
    dateFrom: '',
    dateTo: '',
  });

  const [sortBy, setSortBy] = useState<
    | 'purchaseDate'
    | 'productName'
    | 'quantity'
    | 'unit'
    | 'supplierName'
    | 'unitPrice'
    | 'totalAmount'
    | 'invoiceNumber'
    | 'notes'
    | 'tins'
  >('purchaseDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    productId: '',
    quantity: '',
    supplierName: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    unitPrice: '',
    totalAmount: '',
    invoiceNumber: '',
    notes: '',
  });

  const normalizeDateForInput = (d: string | null | undefined) => {
    if (!d) return new Date().toISOString().slice(0, 10);
    const s = String(d).trim();
    if (!s) return new Date().toISOString().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const dt = new Date(s);
    if (Number.isNaN(dt.getTime())) return new Date().toISOString().slice(0, 10);
    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Tin calc: 1 tin = 15200 ml. Whole tins only.
  const TIN_ML = 15200;

  const parseMlPerPackFromText = (text: string) => {
    const t = (text || '').toLowerCase();
    // Common cases: "200ml", "200 ml"
    // Support "(200)ml" and "200 ml", "200ml"
    const mlMatch = t.match(/(\d+(?:\.\d+)?)\D*ml\b/);
    if (mlMatch) {
      const ml = Number(mlMatch[1]);
      if (Number.isFinite(ml) && ml > 0) return ml;
    }
    // Liter cases: "1L", "5 l", "16 liter"
    const lMatch = t.match(/(\d+(?:\.\d+)?)\D*(l|liter|litre)\b/);
    if (lMatch) {
      const l = Number(lMatch[1]);
      if (Number.isFinite(l) && l > 0) return l * 1000;
    }

    // If the product/unit is explicitly a tin, treat it as 15200ml.
    if (t.includes('tin')) return TIN_ML;

    return null;
  };

  const getMlPerPackForProductId = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return null;
    return parseMlPerPackFromText(prod.name) ?? parseMlPerPackFromText(prod.unit) ?? null;
  };

  const isPetBottleText = (name: string, unit: string) => {
    const combined = `${name ?? ''} ${unit ?? ''}`.toLowerCase();
    // PET bottle products are things like "PET Bottle 1 Liter" or "PET Bottle 500ml".
    return combined.includes('pet') && combined.includes('bottle');
  };

  const isPackagingComponentText = (name: string, unit: string) => {
    const combined = `${name ?? ''} ${unit ?? ''}`.toLowerCase();
    const keys = ['cap', 'inner cap', 'flip top', 'label', 'bottle', 'carton', 'tape', 'packaging'];
    return keys.some((k) => combined.includes(k));
  };

  const isPetBottleForProductId = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return false;
    return isPetBottleText(prod.name, prod.unit);
  };

  const isTinConversionEligibleForProductId = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return false;
    if (isPackagingComponentText(prod.name, prod.unit)) return false;
    const mlPerPack = parseMlPerPackFromText(prod.name) ?? parseMlPerPackFromText(prod.unit);
    return Number.isFinite(Number(mlPerPack)) && Number(mlPerPack) > 0;
  };

  const calcTinsFromQuantity = (quantityNum: number, mlPerPack: number) =>
    Math.floor((quantityNum * mlPerPack) / TIN_ML);

  const calcQuantityFromTins = (tinsNum: number, mlPerPack: number) => Math.ceil((tinsNum * TIN_ML) / mlPerPack);

  // Castor 200ml variants merge:
  // Your DB may contain multiple product ids for the same 200ml item (old/new codes or "(200)ml" names).
  const isCastorOil200mlVariantById = (productId: string) => {
    const pid = String(productId ?? '').trim();
    return pid === '55336' || pid === '68539' || pid === 'castor-200ml';
  };

  const isCastorOil200mlVariantProduct = (p: Product) => {
    if (isCastorOil200mlVariantById(p.id)) return true;
    const name = (p.name || '').toLowerCase();
    if (!name.includes('castor')) return false;
    const mlPerPack = parseMlPerPackFromText(p.name) ?? parseMlPerPackFromText(p.unit);
    return Number(mlPerPack) === 200;
  };

  const canonicalCastor200mlProductId = useMemo(() => {
    const preferred = ['castor-200ml', '68539', '55336'];
    for (const pid of preferred) {
      if (products.some((p) => p.id === pid)) return pid;
    }
    const castors = products.filter(isCastorOil200mlVariantProduct);
    return castors[0]?.id ?? '';
  }, [products]);

  const productsDropdown = useMemo(() => {
    if (!canonicalCastor200mlProductId) return products;
    const canonical = products.find((p) => p.id === canonicalCastor200mlProductId);
    if (!canonical) return products;
    const nonCastors = products.filter((p) => !isCastorOil200mlVariantProduct(p));
    return [...nonCastors, canonical];
  }, [products, canonicalCastor200mlProductId]);

  const canonicalizeCastor200mlProductIdForForm = (productId: string) => {
    if (isCastorOil200mlVariantById(productId)) return canonicalCastor200mlProductId || String(productId).trim();
    return productId;
  };

  const CASTOR_200ML_DISPLAY_NAME = 'TOM - Castor Oil - 200 ML';
  const isCastor200mlDisplayString = (s: string | null | undefined) => {
    const t = String(s ?? '').toLowerCase();
    if (!t.includes('castor')) return false;
    // Match "200 ml", "200 ML", "200ML", even if there are symbols/spaces.
    return /\b200\D*ml\b/.test(t);
  };

  const getProductOptionLabel = (p: Product) => {
    if (isCastorOil200mlVariantProduct(p) || isCastor200mlDisplayString(p.name)) return CASTOR_200ML_DISPLAY_NAME;
    return `${p.name} (${p.unit})`;
  };

  const getPurchaseProductDisplayName = (productName: string) => {
    return isCastor200mlDisplayString(productName) ? CASTOR_200ML_DISPLAY_NAME : productName;
  };

  const tinCountForPurchase = (p: Purchase) => {
    if (isPackagingComponentText(p.productName, p.unit)) return 0;
    const mlPerPack = parseMlPerPackFromText(p.productName) ?? parseMlPerPackFromText(p.unit);
    if (!mlPerPack) return 0;
    const tins = (Number(p.quantity) * Number(mlPerPack)) / TIN_ML;
    return Math.floor(tins);
  };

  const purchasesWithTins = useMemo(
    () =>
      purchases.map((p) => ({
        ...p,
        tins: tinCountForPurchase(p),
        tinsDisplay: isPetBottleText(p.productName, p.unit) ? null : tinCountForPurchase(p),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [purchases]
  );

  const grandTotals = useMemo(() => {
    const totalAmount = purchases.reduce((acc, p) => acc + (Number(p.totalAmount) || 0), 0);
    const totalQty = purchases.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
    const totalTins = purchasesWithTins.reduce((acc, p: any) => acc + (Number(p.tinsDisplay) || 0), 0);

    return { totalAmount, totalQty, totalTins };
  }, [purchases, purchasesWithTins]);

  const handleSort = (key: typeof sortBy) => {
    if (sortBy === key) setSortOrder((p) => (p === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const sortedPurchases = useMemo(() => {
    const dir = sortOrder === 'asc' ? 1 : -1;
    return [...purchasesWithTins].sort((a: any, b: any) => {
      const getNum = (v: any) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      if (sortBy === 'quantity' || sortBy === 'unitPrice' || sortBy === 'totalAmount' || sortBy === 'tins') {
        return (getNum(a[sortBy]) - getNum(b[sortBy])) * dir;
      }
      if (sortBy === 'purchaseDate') {
        return (new Date(String(a.purchaseDate)).getTime() - new Date(String(b.purchaseDate)).getTime()) * dir;
      }
      return String(a[sortBy] ?? '').localeCompare(String(b[sortBy] ?? '')) * dir;
    });
  }, [purchasesWithTins, sortBy, sortOrder]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!['admin', 'retail_staff', 'accountant'].includes(session.user?.role || '')) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (['admin', 'retail_staff', 'accountant'].includes(session?.user?.role || '')) {
      fetchProducts();
    }
  }, [session?.user?.role]);

  useEffect(() => {
    if (['admin', 'retail_staff', 'accountant'].includes(session?.user?.role || '')) {
      fetchPurchases();
    }
  }, [session?.user?.role, filters]);

  const fetchProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const res = await fetch('/api/products');
      const data = await res.json();
      if (res.ok) setProducts(data.products || []);
      else setError(data.error || 'Failed to load products');
    } catch (e) {
      setError('Network error loading products.');
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchPurchases = async () => {
    try {
      setIsLoadingPurchases(true);
      const params = new URLSearchParams();
      if (filters.productId) params.set('productId', filters.productId);
      if (filters.supplier) params.set('supplier', filters.supplier);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);
      const res = await fetch(`/api/stock-purchases?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setPurchases(data.purchases || []);
      else setError(data.error || 'Failed to load purchases');
    } catch (e) {
      setError('Network error loading purchase history.');
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    addCurrentFormToDraft();
  };

  const addCurrentFormToDraft = () => {
    setError('');
    setSuccess('');
    const qty = Number(form.quantity);
    if (!form.productId || !form.supplierName.trim() || !form.purchaseDate || qty <= 0) {
      setError('Please fill Product, Quantity, Supplier name, and Purchase date.');
      return;
    }

    const prod = productsDropdown.find((p) => p.id === form.productId);
    if (!prod) {
      setError('Please select a valid product.');
      return;
    }

    const line: PurchaseDraftLine = {
      id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      productId: canonicalizeCastor200mlProductIdForForm(form.productId),
      productLabel: getProductOptionLabel(prod),
      quantity: qty,
      supplierName: form.supplierName.trim(),
      purchaseDate: form.purchaseDate,
      unitPrice: form.unitPrice ? Number(form.unitPrice) : null,
      totalAmount: form.totalAmount ? Number(form.totalAmount) : null,
      invoiceNumber: form.invoiceNumber.trim() || null,
      notes: form.notes.trim() || null,
    };

    setDraftLines((prev) => [...prev, line]);
    setSuccess('Line added. You can add more products, then click "Save All Lines".');
    setForm({
      productId: '',
      quantity: '',
      tins: '',
      supplierName: form.supplierName,
      purchaseDate: form.purchaseDate,
      unitPrice: '',
      totalAmount: '',
      invoiceNumber: form.invoiceNumber,
      notes: '',
    });
  };

  const submitAllDraftLines = async () => {
    setError('');
    setSuccess('');
    if (draftLines.length === 0) {
      setError('Add at least one line first.');
      return;
    }
    setSaving(true);
    try {
      for (const line of draftLines) {
        const res = await fetch('/api/stock-purchases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: line.productId,
            quantity: line.quantity,
            supplierName: line.supplierName,
            purchaseDate: line.purchaseDate,
            unitPrice: line.unitPrice,
            totalAmount: line.totalAmount,
            invoiceNumber: line.invoiceNumber,
            notes: line.notes,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || `Failed to add stock for ${line.productLabel}`);
          return;
        }
      }
      setSuccess(`Saved ${draftLines.length} purchase lines successfully.`);
      setDraftLines([]);
      fetchPurchases();
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePurchase = async (purchase: Purchase) => {
    if (!purchase?.id) return;
    const confirmed = window.confirm('Delete this purchase record? This will also reduce the inventory stock.');
    if (!confirmed) return;

    setError('');
    setSuccess('');
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/stock-purchases/${purchase.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to delete purchase');
        return;
      }

      setSuccess('Purchase deleted successfully');
      setShowEditModal(false);
      setSelectedPurchase(null);
      fetchPurchases();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const clearFilters = () => {
    setFilters({ productId: '', supplier: '', dateFrom: '', dateTo: '' });
  };

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return d;
    }
  };

  const formatCurrency = (n: number | null) => {
    if (n == null) return '—';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
  };

  const mlPerPackForForm = getMlPerPackForProductId(form.productId);
  const isPetBottleSelected = isPetBottleForProductId(form.productId);
  const isTinCalcEligible = isTinConversionEligibleForProductId(form.productId);
  const totalLtrsDisplay =
    !isTinCalcEligible
      ? ''
      : mlPerPackForForm && form.quantity && Number.isFinite(Number(form.quantity)) && Number(form.quantity) > 0
        ? ((Number(form.quantity) * mlPerPackForForm) / 1000).toFixed(2)
        : '';

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }
  if (!session || !['admin', 'retail_staff', 'accountant'].includes(session.user?.role || '')) {
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
            <h1 className="text-3xl font-bold text-gray-900">Add Stock & Purchase History</h1>
            <p className="mt-2 text-gray-600">
              Record stock purchases, track from whom and when stock was purchased
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/admin/oil-purchase-volume"
              className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Oil volume (L &amp; tins)
            </Link>
            <Link
              href="/dashboard/admin/inventory"
              className="w-full sm:w-auto text-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Stock Levels
            </Link>
            <Link
              href="/dashboard/admin/products"
              className="w-full sm:w-auto text-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Products
            </Link>
            <Link
              href="/dashboard"
              className="w-full sm:w-auto text-center bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Add Stock (Record Purchase)</h2>
            <p className="text-sm text-gray-500 mt-1">
              Select product, quantity, supplier name and date. Stock will be added to inventory.
            </p>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Purchase Date FIRST (as requested) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date *</label>
                <input
                  type="date"
                  required
                  value={form.purchaseDate}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <select
                  required
                  value={form.productId}
                  onChange={(e) => {
                    const nextProductId = e.target.value;
                    const nextIsPetBottle = isPetBottleForProductId(nextProductId);
                    const nextTinEligible = isTinConversionEligibleForProductId(nextProductId);
                    const mlPerPack = getMlPerPackForProductId(nextProductId);
                    setForm((f) => {
                      const tinsNum = Number(f.tins);
                      const qtyNum = Number(f.quantity);
                      const next: typeof f = { ...f, productId: nextProductId };

                      if (nextIsPetBottle || !nextTinEligible) {
                        // Packaging / non-oil items should not use tins/ltr calculations.
                        next.tins = '';
                        return next;
                      }

                      // If tins already entered, prefer converting tins -> quantity.
                      if (mlPerPack && Number.isFinite(tinsNum) && tinsNum > 0) {
                        next.quantity = String(calcQuantityFromTins(tinsNum, mlPerPack));
                        next.tins = String(Math.floor(tinsNum));
                      } else if (mlPerPack && Number.isFinite(qtyNum) && qtyNum > 0) {
                        // Otherwise prefer converting quantity -> tins.
                        next.tins = String(calcTinsFromQuantity(qtyNum, mlPerPack));
                      } else {
                        next.tins = '';
                      }

                      return next;
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Select product</option>
                  {productsDropdown.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getProductOptionLabel(p)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  No. of Tins
                  <span className="text-xs text-gray-500 ml-2">(1 tin = 15200ml)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={form.tins}
                  onChange={(e) => {
                    const nextTinsRaw = e.target.value;
                    const tinsNum = Number(nextTinsRaw);
                    const mlPerPack = getMlPerPackForProductId(form.productId);
                    if (nextTinsRaw !== '' && Number.isFinite(tinsNum) && tinsNum > 0 && !mlPerPack) {
                      setError('Selected product does not include ml/unit info, so tins conversion is not possible.');
                      return;
                    }
                    setForm((f) => {
                      const next: typeof f = { ...f, tins: nextTinsRaw };
                      if (!mlPerPack || !Number.isFinite(tinsNum) || tinsNum <= 0) return next;
                      const qty = calcQuantityFromTins(tinsNum, mlPerPack);
                      next.quantity = String(qty);
                      return next;
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. 1"
                  disabled={!isTinCalcEligible}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={form.quantity}
                  onChange={(e) => {
                    const nextQtyRaw = e.target.value;
                    const qtyNum = Number(nextQtyRaw);
                    const mlPerPack = getMlPerPackForProductId(form.productId);
                    setForm((f) => {
                      const next: typeof f = { ...f, quantity: nextQtyRaw };
                      if (!isTinCalcEligible) return next;
                      if (!mlPerPack || !Number.isFinite(qtyNum) || qtyNum <= 0) return next;
                      next.tins = String(calcTinsFromQuantity(qtyNum, mlPerPack));
                      return next;
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g. 100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Ltrs</label>
                <input
                  type="number"
                  readOnly
                  value={totalLtrsDisplay}
                  placeholder="Auto"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 focus:outline-none"
                  disabled={!isTinCalcEligible}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier / From whom *</label>
                <input
                  type="text"
                  required
                  value={form.supplierName}
                  onChange={(e) => setForm((f) => ({ ...f, supplierName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Supplier or vendor name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.unitPrice}
                  onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.totalAmount}
                  onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input
                  type="text"
                  value={form.invoiceNumber}
                  onChange={(e) => setForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Optional"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Optional notes"
                />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saving || isLoadingProducts}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  Add Line
                </button>
                <button
                  type="button"
                  onClick={submitAllDraftLines}
                  disabled={saving || draftLines.length === 0}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                >
                  {saving ? 'Saving...' : `Save All Lines (${draftLines.length})`}
                </button>
              </div>
            </div>
          </form>
          {draftLines.length > 0 && (
            <div className="px-6 pb-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Pending Lines</h3>
              <div className="border rounded-md overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Product</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2 text-left">Supplier</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {draftLines.map((line) => (
                      <tr key={line.id} className="border-t">
                        <td className="px-3 py-2">{line.productLabel}</td>
                        <td className="px-3 py-2 text-right">{line.quantity}</td>
                        <td className="px-3 py-2">{line.supplierName}</td>
                        <td className="px-3 py-2">{line.purchaseDate}</td>
                        <td className="px-3 py-2 text-right">{line.totalAmount == null ? '—' : line.totalAmount}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-900 mr-3"
                            onClick={() => {
                              setForm({
                                productId: line.productId,
                                quantity: String(line.quantity),
                                tins: '',
                                supplierName: line.supplierName,
                                purchaseDate: line.purchaseDate,
                                unitPrice: line.unitPrice == null ? '' : String(line.unitPrice),
                                totalAmount: line.totalAmount == null ? '' : String(line.totalAmount),
                                invoiceNumber: line.invoiceNumber || '',
                                notes: line.notes || '',
                              });
                              setDraftLines((prev) => prev.filter((x) => x.id !== line.id));
                              setSuccess('Line loaded into form for editing.');
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="text-red-600 hover:text-red-900"
                            onClick={() => setDraftLines((prev) => prev.filter((x) => x.id !== line.id))}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Purchase History</h2>
            <p className="text-sm text-gray-500 mt-1">
              When and from whom stock was purchased. Use filters to search.
            </p>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={filters.productId}
                  onChange={(e) => setFilters((f) => ({ ...f, productId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">All products</option>
                  {productsDropdown.map((p) => (
                    <option key={p.id} value={p.id}>
                      {getProductOptionLabel(p)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <input
                  type="text"
                  value={filters.supplier}
                  onChange={(e) => setFilters((f) => ({ ...f, supplier: e.target.value }))}
                  placeholder="Search by supplier name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          {/* Grand totals (filtered) */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-md border border-gray-200 p-3 bg-white">
                <div className="text-xs text-gray-500">Grand Total Amount (₹)</div>
                <div className="text-lg font-semibold text-gray-900">{formatCurrency(grandTotals.totalAmount)}</div>
              </div>
              <div className="rounded-md border border-gray-200 p-3 bg-white">
                <div className="text-xs text-gray-500">Grand Total Quantity</div>
                <div className="text-lg font-semibold text-gray-900">{grandTotals.totalQty.toFixed(2)}</div>
              </div>
              <div className="rounded-md border border-gray-200 p-3 bg-white">
                <div className="text-xs text-gray-500">Grand Total Tin (where applicable)</div>
                <div className="text-lg font-semibold text-gray-900">{grandTotals.totalTins.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoadingPurchases ? (
              <div className="p-8 text-center text-gray-500">Loading purchase history...</div>
            ) : purchases.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No purchase records found. Add stock using the form above to see history here.
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort('purchaseDate')}
                    >
                      Date {sortBy === 'purchaseDate' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort('productName')}
                    >
                      Product {sortBy === 'productName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort('quantity')}
                    >
                      Qty {sortBy === 'quantity' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort('unit')}
                    >
                      Unit {sortBy === 'unit' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort('supplierName')}
                    >
                      Supplier {sortBy === 'supplierName' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort('unitPrice')}
                    >
                      Unit Price {sortBy === 'unitPrice' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort('totalAmount')}
                    >
                      Total {sortBy === 'totalAmount' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort('invoiceNumber')}
                    >
                      Invoice {sortBy === 'invoiceNumber' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort('notes')}
                    >
                      Notes {sortBy === 'notes' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => handleSort('tins')}
                    >
                      No. of Tin {sortBy === 'tins' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedPurchases.map((p: any) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(p.purchaseDate)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{getPurchaseProductDisplayName(p.productName)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{Number(p.quantity)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.unit}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.supplierName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(p.unitPrice)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatCurrency(p.totalAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{p.invoiceNumber || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate" title={p.notes || ''}>{p.notes || '—'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {p.tinsDisplay == null ? '—' : p.tinsDisplay}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPurchase(p);
                            setEditForm({
                              productId: canonicalizeCastor200mlProductIdForForm(p.productId),
                              quantity: String(p.quantity),
                              supplierName: p.supplierName || '',
                              purchaseDate: normalizeDateForInput(p.purchaseDate),
                              unitPrice: p.unitPrice != null ? String(p.unitPrice) : '',
                              totalAmount: p.totalAmount != null ? String(p.totalAmount) : '',
                              invoiceNumber: p.invoiceNumber != null ? String(p.invoiceNumber) : '',
                              notes: p.notes != null ? String(p.notes) : '',
                            });
                            setShowEditModal(true);
                            setError('');
                            setSuccess('');
                          }}
                          className="text-blue-600 hover:text-blue-900 font-medium text-xs"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePurchase(p)}
                          className="ml-3 text-red-600 hover:text-red-900 font-medium text-xs"
                          disabled={isUpdating}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {showEditModal && selectedPurchase && (
              <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Edit Purchase
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded ml-2">No inventory correction</span>
                  </h3>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!selectedPurchase) return;
                      setIsUpdating(true);
                      setError('');
                      setSuccess('');

                      try {
                        const qty = Number(editForm.quantity);
                        if (
                          !editForm.productId ||
                          !editForm.supplierName.trim() ||
                          !editForm.purchaseDate ||
                          !Number.isFinite(qty) ||
                          qty <= 0
                        ) {
                          setError('Please fill product, quantity (>0), supplier name, and purchase date.');
                          return;
                        }

                        const res = await fetch(`/api/stock-purchases/${selectedPurchase.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            productId: canonicalizeCastor200mlProductIdForForm(editForm.productId),
                            quantity: qty,
                            supplierName: editForm.supplierName.trim(),
                            purchaseDate: editForm.purchaseDate,
                            unitPrice: editForm.unitPrice ? Number(editForm.unitPrice) : null,
                            totalAmount: editForm.totalAmount ? Number(editForm.totalAmount) : null,
                            invoiceNumber: editForm.invoiceNumber ? editForm.invoiceNumber.trim() : null,
                            notes: editForm.notes ? editForm.notes.trim() : null,
                          }),
                        });

                        const data = await res.json();
                        if (!res.ok) {
                          setError(data.error || 'Failed to update purchase');
                          return;
                        }

                        setSuccess('Purchase updated successfully');
                        setShowEditModal(false);
                        setSelectedPurchase(null);
                        fetchPurchases();
                      } catch {
                        setError('Network error. Please try again.');
                      } finally {
                        setIsUpdating(false);
                      }
                    }}
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date *</label>
                        <input
                          type="date"
                          required
                          value={editForm.purchaseDate}
                          onChange={(e) => setEditForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                        <select
                          required
                          value={editForm.productId}
                          onChange={(e) => setEditForm((f) => ({ ...f, productId: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select product</option>
                  {productsDropdown.map((p) => (
                            <option key={p.id} value={p.id}>
                              {getProductOptionLabel(p)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="any"
                          value={editForm.quantity}
                          onChange={(e) => setEditForm((f) => ({ ...f, quantity: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier / From whom *</label>
                        <input
                          type="text"
                          required
                          value={editForm.supplierName}
                          onChange={(e) => setEditForm((f) => ({ ...f, supplierName: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (₹)</label>
                        <input
                          type="number"
                          value={editForm.unitPrice}
                          onChange={(e) => setEditForm((f) => ({ ...f, unitPrice: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount (₹)</label>
                        <input
                          type="number"
                          value={editForm.totalAmount}
                          onChange={(e) => setEditForm((f) => ({ ...f, totalAmount: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                        <input
                          type="text"
                          value={editForm.invoiceNumber}
                          onChange={(e) => setEditForm((f) => ({ ...f, invoiceNumber: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Optional"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <input
                          type="text"
                          value={editForm.notes}
                          onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Optional notes"
                        />
                      </div>
                    </div>

                    {error && <div className="text-sm text-red-600">{error}</div>}

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => selectedPurchase && handleDeletePurchase(selectedPurchase)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowEditModal(false);
                          setSelectedPurchase(null);
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        disabled={isUpdating}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdating}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                      >
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
