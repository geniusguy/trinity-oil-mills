'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getCurrentFinancialYearBounds,
  getCurrentFinancialYearQuarterBounds,
  getFinancialYearStartYear,
  getPreviousFinancialYearBounds,
  formatFinancialYearLabel,
} from '@/lib/financialYear';

type CourierRow = {
  id: string;
  courierDate: string;
  quantity: number;
  cost: number; // cost ex GST (base amount)
  gstRate: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
  canteenAddressId: string | null;
  destinationNote: string;
  notes: string;
  paymentMethod: string;
  referenceNo: string;
  referencePdfPath: string | null;
  referencePdfOriginalName: string | null;
  canteenName: string | null;
  canteenCity: string | null;
  canteenAddressLine: string | null;
};

type CanteenOpt = { id: string; canteenName: string; city?: string; address: string };

type ByCanteen = {
  canteenAddressId: string | null;
  canteenName: string;
  totalCostExGst: number;
  totalCgst: number;
  totalSgst: number;
  totalGst: number;
  totalCost: number; // total payable
  totalQuantity: number;
  entryCount: number;
};

type CourierDraftLine = {
  id: string;
  quantity: string;
  cost: string; // cost ex GST
  gstAmount: string; // GST amount (optional; API can compute from gstRate)
  gstRate: string; // %
  canteenAddressId: string;
  destinationNote: string;
  notes: string;
};

type FormFieldKey =
  | 'courierDate'
  | 'quantity'
  | 'cost'
  | 'gstAmount'
  | 'paymentMethod'
  | 'destinationNote'
  | 'referenceNo';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toYmd(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function round2(n: number) {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

function computeGstAmountFromCostAndRate(costRaw: string, rateRaw: string) {
  const costNum = Number(costRaw);
  const rateNum = Number(rateRaw);
  if (!Number.isFinite(costNum) || costNum < 0 || !Number.isFinite(rateNum) || rateNum < 0) return 0;
  return round2((costNum * rateNum) / 100);
}

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash' },
  { id: 'bank_transfer', name: 'Bank transfer' },
  { id: 'upi', name: 'UPI' },
  { id: 'card', name: 'Card' },
];

const SORT_OPTIONS = [
  { id: 'courier_date', label: 'Courier date' },
  { id: 'cost', label: 'Cost' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'canteen', label: 'Canteen name' },
] as const;

export default function CourierExpensesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const allowed = ['admin', 'accountant'];

  const [rows, setRows] = useState<CourierRow[]>([]);
  const [summary, setSummary] = useState({
    totalCostExGst: 0,
    totalCgst: 0,
    totalSgst: 0,
    totalGst: 0,
    totalCost: 0, // total payable (ex GST + GST)
    totalQuantity: 0,
    count: 0,
  });
  const [byCanteen, setByCanteen] = useState<ByCanteen[]>([]);
  const [canteens, setCanteens] = useState<CanteenOpt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<string>('');

  const [periodPreset, setPeriodPreset] = useState<
    'this_month' | 'fy_quarter' | 'fy_year' | 'fy_prev' | 'custom'
  >('fy_year');
  const [startDate, setStartDate] = useState(() => {
    const { start } = getCurrentFinancialYearBounds(new Date());
    return toYmd(start);
  });
  const [endDate, setEndDate] = useState(() => {
    const { end } = getCurrentFinancialYearBounds(new Date());
    return toYmd(end);
  });
  const [filterCanteenId, setFilterCanteenId] = useState('');
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]['id']>('courier_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLines, setDraftLines] = useState<CourierDraftLine[]>([]);
  const [billPdfFile, setBillPdfFile] = useState<File | null>(null);
  const [billPdfError, setBillPdfError] = useState<string>('');
  const [existingPdfPath, setExistingPdfPath] = useState<string | null>(null);
  const [existingPdfOriginalName, setExistingPdfOriginalName] = useState<string | null>(null);
  const [removeExistingPdf, setRemoveExistingPdf] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormFieldKey, string>>>({});
  const courierDateRef = useRef<HTMLInputElement | null>(null);
  const quantityRef = useRef<HTMLInputElement | null>(null);
  const costRef = useRef<HTMLInputElement | null>(null);
  const gstAmountRef = useRef<HTMLInputElement | null>(null);
  const paymentMethodRef = useRef<HTMLSelectElement | null>(null);
  const destinationNoteRef = useRef<HTMLInputElement | null>(null);
  const referenceNoRef = useRef<HTMLInputElement | null>(null);
  const [form, setForm] = useState({
    courierDate: toYmd(new Date()),
    quantity: '1',
    cost: '',
    gstRate: '18',
    gstAmount: '',
    canteenAddressId: '',
    destinationNote: '',
    notes: '',
    paymentMethod: 'cash',
    referenceNo: '',
  });

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

  const applyPreset = useCallback((preset: typeof periodPreset) => {
    const now = new Date();
    if (preset === 'this_month') {
      const s = new Date(now.getFullYear(), now.getMonth(), 1);
      const e = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toYmd(s));
      setEndDate(toYmd(e));
      return;
    }
    if (preset === 'fy_quarter') {
      const { start, end } = getCurrentFinancialYearQuarterBounds(now);
      setStartDate(toYmd(start));
      setEndDate(toYmd(end));
      return;
    }
    if (preset === 'fy_year') {
      const { start, end } = getCurrentFinancialYearBounds(now);
      setStartDate(toYmd(start));
      setEndDate(toYmd(end));
      return;
    }
    if (preset === 'fy_prev') {
      const { start, end } = getPreviousFinancialYearBounds(now);
      setStartDate(toYmd(start));
      setEndDate(toYmd(end));
      return;
    }
  }, []);

  useEffect(() => {
    if (periodPreset !== 'custom') {
      applyPreset(periodPreset);
    }
  }, [periodPreset, applyPreset]);

  const fetchCanteens = async () => {
    try {
      const res = await fetch('/api/canteen-addresses');
      const j = await res.json();
      const list = (j.addresses || j.data || []) as CanteenOpt[];
      setCanteens(Array.isArray(list) ? list : []);
    } catch {
      setCanteens([]);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const qs = new URLSearchParams();
      if (startDate) qs.set('startDate', startDate);
      if (endDate) qs.set('endDate', endDate);
      if (filterCanteenId) qs.set('canteenAddressId', filterCanteenId);
      qs.set('sortBy', sortBy);
      qs.set('sortDir', sortDir);

      const res = await fetch(`/api/courier-expenses?${qs.toString()}`, { credentials: 'include' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Failed to load');
      setRows(j.data || []);
      setSummary(
        j.summary || {
          totalCostExGst: 0,
          totalCgst: 0,
          totalSgst: 0,
          totalGst: 0,
          totalCost: 0,
          totalQuantity: 0,
          count: 0,
        },
      );
      setByCanteen(j.byCanteen || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load';
      setError(msg);
      if (msg.includes('Unauthorized') || msg.includes('401')) {
        setError('Unauthorized. Admin or Accountant only.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && allowed.includes(session.user.role || '')) {
      fetchCanteens();
    }
  }, [session]);

  useEffect(() => {
    if (!session?.user || !allowed.includes(session.user.role || '')) return;
    if (!startDate || !endDate) return;
    void fetchData();
  }, [session, startDate, endDate, filterCanteenId, sortBy, sortDir]);

  const resetForm = () => {
    setEditingId(null);
    setDraftLines([]);
    setError('');
    setNotice('');
    setBillPdfFile(null);
    setBillPdfError('');
    setExistingPdfPath(null);
    setExistingPdfOriginalName(null);
    setRemoveExistingPdf(false);
    setFieldErrors({});
    setForm({
      courierDate: toYmd(new Date()),
      quantity: '1',
      cost: '',
      gstRate: '18',
      gstAmount: '',
      canteenAddressId: '',
      destinationNote: '',
      notes: '',
      paymentMethod: 'cash',
      referenceNo: '',
    });
    setShowForm(false);
  };

  const startEdit = (r: CourierRow) => {
    setError('');
    setFieldErrors({});
    setEditingId(r.id);
    setDraftLines([]);
    setBillPdfFile(null);
    setBillPdfError('');
    setExistingPdfPath(r.referencePdfPath || null);
    setExistingPdfOriginalName(r.referencePdfOriginalName || null);
    setRemoveExistingPdf(false);
    setForm({
      courierDate: r.courierDate,
      quantity: String(r.quantity),
      cost: String(r.cost),
      gstRate: String(r.gstRate ?? 0),
      gstAmount: String(r.gstAmount ?? 0),
      canteenAddressId: r.canteenAddressId || '',
      destinationNote: r.destinationNote || '',
      notes: r.notes || '',
      paymentMethod: r.paymentMethod || 'cash',
      referenceNo: r.referenceNo || '',
    });
    setShowForm(true);
  };

  const focusField = (field: FormFieldKey) => {
    const map: Record<FormFieldKey, () => void> = {
      courierDate: () => courierDateRef.current?.focus(),
      quantity: () => quantityRef.current?.focus(),
      cost: () => costRef.current?.focus(),
      gstAmount: () => gstAmountRef.current?.focus(),
      paymentMethod: () => paymentMethodRef.current?.focus(),
      destinationNote: () => destinationNoteRef.current?.focus(),
      referenceNo: () => referenceNoRef.current?.focus(),
    };
    map[field]?.();
  };

  const validateCurrentFormLine = () => {
    const errors: Partial<Record<FormFieldKey, string>> = {};
    const courierDate = String(form.courierDate || '').trim();
    const qty = Number(form.quantity);
    const costNum = Number(form.cost);
    const gstAmountNum = formGstAmountComputed;
    const paymentMethod = String(form.paymentMethod || '').trim();
    const cantId = String(form.canteenAddressId || '').trim();
    const dest = String(form.destinationNote || '').trim();
    const billRef = String(form.referenceNo || '').trim();

    if (!courierDate) errors.courierDate = 'Courier date is required';
    if (Number.isNaN(qty) || qty <= 0) errors.quantity = 'Quantity must be greater than 0';
    if (Number.isNaN(costNum) || costNum <= 0) errors.cost = 'Cost must be greater than 0';
    if (Number.isNaN(gstAmountNum) || gstAmountNum < 0) {
      errors.gstAmount = 'GST amount must be zero or more';
    }
    if (!paymentMethod) errors.paymentMethod = 'Payment is required';
    if (!cantId && !dest) errors.destinationNote = 'Select canteen or enter destination / address note';
    if (!billRef) errors.referenceNo = 'Bill/Invoice reference number is required';

    const order: FormFieldKey[] = [
      'courierDate',
      'quantity',
      'cost',
      'gstAmount',
      'paymentMethod',
      'destinationNote',
      'referenceNo',
    ];
    const firstInvalid = order.find((k) => Boolean(errors[k])) || null;
    return { errors, firstInvalid };
  };

  const addLineToDraft = () => {
    if (editingId) return;
    const qty = Number(form.quantity);
    const costNum = Number(form.cost);
    const cantId = form.canteenAddressId && String(form.canteenAddressId).trim() ? String(form.canteenAddressId).trim() : '';
    const dest = form.destinationNote != null ? String(form.destinationNote).trim() : '';
    const { errors, firstInvalid } = validateCurrentFormLine();
    setFieldErrors(errors);
    if (firstInvalid) {
      setError('');
      focusField(firstInvalid);
      return;
    }

    setError('');
    setFieldErrors({});
    const line: CourierDraftLine = {
      id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      quantity: String(qty),
      cost: String(costNum),
      gstRate: String(form.gstRate ?? '18'),
      gstAmount: String(formGstAmountComputed),
      canteenAddressId: cantId,
      destinationNote: dest,
      notes: form.notes ?? '',
    };
    setDraftLines((prev) => [...prev, line]);

    // Clear line-only fields, keep the bill header (date / bill ref / payment / GST rate).
    setForm((f) => ({
      ...f,
      quantity: '1',
      cost: '',
      gstAmount: '',
      canteenAddressId: '',
      destinationNote: '',
      notes: '',
    }));
  };

  const removeDraftLine = (id: string) => {
    setDraftLines((prev) => prev.filter((l) => l.id !== id));
  };

  const calcDraftGstAmount = (line: CourierDraftLine) => {
    const gstAmountRaw = String(line.gstAmount ?? '').trim();
    if (gstAmountRaw) return Number(gstAmountRaw) || 0;
    const costNum = Number(line.cost);
    const rateNum = Number(line.gstRate);
    if (!Number.isFinite(costNum) || !Number.isFinite(rateNum)) return 0;
    return (costNum * rateNum) / 100;
  };

  const calcDraftTotal = (line: CourierDraftLine) => {
    const costNum = Number(line.cost);
    const gstAmt = calcDraftGstAmount(line);
    return (Number.isFinite(costNum) ? costNum : 0) + gstAmt;
  };

  const calcDraftCgstAmount = (line: CourierDraftLine) => {
    const gstAmt = calcDraftGstAmount(line);
    return round2(gstAmt / 2);
  };

  const calcDraftSgstAmount = (line: CourierDraftLine) => {
    const gstAmt = calcDraftGstAmount(line);
    const cgstAmt = round2(gstAmt / 2);
    return round2(gstAmt - cgstAmt);
  };

  const draftTotals = useMemo(() => {
    const init = { exGst: 0, cgst: 0, sgst: 0, gst: 0, total: 0, count: 0 };
    const acc = draftLines.reduce((a, l) => {
      const costNum = Number(l.cost);
      const cgstNum = calcDraftCgstAmount(l);
      const sgstNum = calcDraftSgstAmount(l);
      const gstNum = cgstNum + sgstNum;
      const totalNum = (Number.isFinite(costNum) ? costNum : 0) + gstNum;
      a.exGst += Number.isFinite(costNum) ? costNum : 0;
      a.cgst += cgstNum;
      a.sgst += sgstNum;
      a.gst += gstNum;
      a.total += totalNum;
      a.count += 1;
      return a;
    }, init);
    return {
      ...acc,
      exGst: Math.round(acc.exGst * 100) / 100,
      cgst: Math.round(acc.cgst * 100) / 100,
      sgst: Math.round(acc.sgst * 100) / 100,
      gst: Math.round(acc.gst * 100) / 100,
      total: Math.round(acc.total * 100) / 100,
    };
  }, [draftLines]);

  const formGstAmountComputed = useMemo(
    () => computeGstAmountFromCostAndRate(form.cost, form.gstRate),
    [form.cost, form.gstRate],
  );
  const formCgstAmountComputed = useMemo(() => round2(formGstAmountComputed / 2), [formGstAmountComputed]);
  const formSgstAmountComputed = useMemo(
    () => round2(formGstAmountComputed - formCgstAmountComputed),
    [formGstAmountComputed, formCgstAmountComputed],
  );
  const formRoundOffComputed = useMemo(() => {
    const base = Number(form.cost) || 0;
    const exact = base + formGstAmountComputed;
    return round2(Math.round(exact) - exact);
  }, [form.cost, formGstAmountComputed]);
  const formNetPayableComputed = useMemo(() => {
    const base = Number(form.cost) || 0;
    const exact = base + formGstAmountComputed;
    return round2(exact + formRoundOffComputed);
  }, [form.cost, formGstAmountComputed, formRoundOffComputed]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        const { errors, firstInvalid } = validateCurrentFormLine();
        setFieldErrors(errors);
        if (firstInvalid) {
          focusField(firstInvalid);
          return;
        }

        let uploadedReferencePdfPath: string | null = removeExistingPdf ? null : existingPdfPath;
        let uploadedReferencePdfOriginalName: string | null = removeExistingPdf ? null : existingPdfOriginalName;
        if (billPdfFile) {
          setBillPdfError('');
          const fd = new FormData();
          fd.append('file', billPdfFile);
          fd.append('scope', 'courier-expenses');
          const upRes = await fetch('/api/uploads/reference-pdf', {
            method: 'POST',
            body: fd,
            credentials: 'include',
          });
          const upJson = await upRes.json();
          if (!upRes.ok) {
            const msg = upJson.error || 'PDF upload failed';
            setBillPdfError(msg);
            throw new Error(msg);
          }
          uploadedReferencePdfPath = upJson.path || null;
          uploadedReferencePdfOriginalName = upJson.originalName || null;
        }

        const payload = {
          courierDate: form.courierDate,
          quantity: form.quantity,
          cost: form.cost,
          gstRate: form.gstRate,
          gstAmount: form.gstAmount,
          canteenAddressId: form.canteenAddressId || null,
          destinationNote: form.destinationNote,
          notes: form.notes,
          paymentMethod: form.paymentMethod,
          referenceNo: form.referenceNo,
          referencePdfPath: uploadedReferencePdfPath,
          referencePdfOriginalName: uploadedReferencePdfOriginalName,
        };
        const url = `/api/courier-expenses/${editingId}`;
        const res = await fetch(url, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Save failed');
        setNotice('Updated courier expense line.');
        resetForm();
        await fetchData();
        return;
      }

      setFieldErrors({});
      const billRef = String(form.referenceNo ?? '').trim();
      if (!billRef) throw new Error('Bill/Invoice reference number is required');

      let uploadedReferencePdfPath: string | null = null;
      let uploadedReferencePdfOriginalName: string | null = null;
      if (billPdfFile) {
        setBillPdfError('');
        const fd = new FormData();
        fd.append('file', billPdfFile);
        fd.append('scope', 'courier-expenses');
        const upRes = await fetch('/api/uploads/reference-pdf', {
          method: 'POST',
          body: fd,
          credentials: 'include',
        });
        const upJson = await upRes.json();
        if (!upRes.ok) {
          const msg = upJson.error || 'PDF upload failed';
          setBillPdfError(msg);
          throw new Error(msg);
        }
        uploadedReferencePdfPath = upJson.path || null;
        uploadedReferencePdfOriginalName = upJson.originalName || null;
      }

      const linesToSave: CourierDraftLine[] =
        draftLines.length > 0
          ? draftLines
          : [
              {
                id: 'draft-single',
                quantity: String(form.quantity ?? '1'),
                cost: String(form.cost ?? ''),
                gstRate: String(form.gstRate ?? '18'),
                gstAmount: String(formGstAmountComputed),
                canteenAddressId: String(form.canteenAddressId ?? ''),
                destinationNote: String(form.destinationNote ?? ''),
                notes: String(form.notes ?? ''),
              },
            ];

      if (linesToSave.length === 0) throw new Error('Add at least one destination line');

      const billExactTotal = linesToSave.reduce((acc, l) => acc + calcDraftTotal(l), 0);
      const billNet = Math.round(billExactTotal);
      const billRoundOff = billNet - billExactTotal;

      for (const line of linesToSave) {
        const qty = Number(line.quantity);
        const costNum = Number(line.cost);
        const gstAmountNum = String(line.gstAmount ?? '').trim() === ''
          ? computeGstAmountFromCostAndRate(String(line.cost ?? ''), String(line.gstRate ?? '0'))
          : Number(line.gstAmount);
        if (Number.isNaN(qty) || qty < 0) throw new Error('Quantity must be zero or positive for each line');
        if (Number.isNaN(costNum) || costNum <= 0) throw new Error('Cost must be greater than 0 for each line');
        if (Number.isNaN(gstAmountNum) || gstAmountNum < 0) {
          throw new Error('GST amount must be zero or more for each line');
        }

        const cantId = line.canteenAddressId && String(line.canteenAddressId).trim() ? String(line.canteenAddressId).trim() : null;
        const dest = line.destinationNote != null ? String(line.destinationNote).trim() : '';
        if (!cantId && !dest) throw new Error('Select a canteen or enter destination / address note for each line');

        const payload = {
          courierDate: form.courierDate,
          quantity: line.quantity,
          cost: line.cost,
          gstRate: line.gstRate,
          gstAmount: String(gstAmountNum),
          canteenAddressId: cantId,
          destinationNote: dest,
          notes: line.notes,
          paymentMethod: form.paymentMethod,
          referenceNo: billRef,
          referencePdfPath: uploadedReferencePdfPath,
          referencePdfOriginalName: uploadedReferencePdfOriginalName,
        };

        const res = await fetch('/api/courier-expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          credentials: 'include',
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Save failed');
      }
      setNotice(
        `Saved courier bill ${billRef} (${linesToSave.length} destination line${linesToSave.length === 1 ? '' : 's'}). Net payable: ₹${billNet.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Round off: ₹${billRoundOff.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}).`,
      );
      resetForm();
      await fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setNotice('');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this courier expense entry?')) return;
    try {
      const res = await fetch(`/api/courier-expenses/${id}`, { method: 'DELETE', credentials: 'include' });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Delete failed');
      fetchData();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const fyLabelNow = useMemo(() => formatFinancialYearLabel(getFinancialYearStartYear(new Date())), []);

  const gstBreakdownByMonthAndYear = useMemo(() => {
    const monthMap = new Map<string, { month: string; cgst: number; sgst: number; gst: number; count: number }>();
    const yearMap = new Map<string, { year: string; cgst: number; sgst: number; gst: number; count: number }>();

    for (const r of rows) {
      const dateStr = String(r.courierDate || '');
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(0, 7); // YYYY-MM
      if (year.length !== 4 || month.length !== 7) continue;

      const cgst = Number(r.cgstAmount ?? 0) || 0;
      const sgst = Number(r.sgstAmount ?? 0) || 0;
      const gst = Number(r.gstAmount ?? cgst + sgst) || cgst + sgst;

      const m = monthMap.get(month);
      if (!m) monthMap.set(month, { month, cgst, sgst, gst, count: 1 });
      else {
        m.cgst += cgst;
        m.sgst += sgst;
        m.gst += gst;
        m.count += 1;
      }

      const y = yearMap.get(year);
      if (!y) yearMap.set(year, { year, cgst, sgst, gst, count: 1 });
      else {
        y.cgst += cgst;
        y.sgst += sgst;
        y.gst += gst;
        y.count += 1;
      }
    }

    return {
      byMonth: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      byYear: Array.from(yearMap.values()).sort((a, b) => a.year.localeCompare(b.year)),
    };
  }, [rows]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading…</p>
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Courier expenses</h1>
            <p className="mt-2 text-slate-600 max-w-2xl">
              Record courier / shipment costs by date, quantity, amount, and canteen (or free-text destination).
              Totals respect filters below (month, FY quarter, FY year, or custom range).
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium"
            >
              + New entry
            </button>
            <Link
              href="/dashboard/admin/expenses"
              className="px-4 py-2 bg-white border border-slate-300 text-slate-800 rounded-lg text-sm font-medium hover:bg-slate-50"
            >
              Daily expenses
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-medium">
              Dashboard
            </Link>
          </div>
        </div>

        {notice && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            {notice}
          </div>
        )}

        {!showForm && error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
            {error.includes('Failed') || error.includes('table') ? (
              <p className="mt-2 text-xs">
                If the table is missing, run <strong>Database Setup</strong> (admin) or execute{' '}
                <code className="bg-red-100 px-1 rounded">scripts/sql/migrate_courier_expenses.sql</code>
              </p>
            ) : null}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 mb-6 space-y-4">
          <h2 className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Period & filters</h2>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['this_month', 'This month'],
                ['fy_quarter', 'This FY quarter (Apr–Mar)'],
                ['fy_year', `This FY (${fyLabelNow})`],
                ['fy_prev', 'Last FY (full)'],
                ['custom', 'Custom range'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPeriodPreset(id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${
                  periodPreset === id
                    ? 'bg-indigo-100 text-indigo-900 ring-2 ring-indigo-500'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={startDate}
                onChange={(e) => {
                  setPeriodPreset('custom');
                  setStartDate(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
              <input
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={endDate}
                onChange={(e) => {
                  setPeriodPreset('custom');
                  setEndDate(e.target.value);
                }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Canteen</label>
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={filterCanteenId}
                onChange={(e) => setFilterCanteenId(e.target.value)}
              >
                <option value="">All canteens</option>
                {canteens.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.canteenName}
                    {c.city ? ` — ${c.city}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Sort by</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Direction</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-2 py-2 text-sm"
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as 'asc' | 'desc')}
                >
                  <option value="desc">Newest / high → low</option>
                  <option value="asc">Oldest / low → high</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Total amount (incl GST)</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              ₹{summary.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              CGST: ₹{summary.totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · SGST: ₹
              {summary.totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-slate-500 mt-1">Total GST: ₹{summary.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Total quantity</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalQuantity.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500 uppercase">Entries</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{summary.count}</p>
          </div>
        </div>

        {/* GST breakdown */}
        {(gstBreakdownByMonthAndYear.byMonth.length > 0 || gstBreakdownByMonthAndYear.byYear.length > 0) && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-800">Total GST paid (CGST/SGST) breakdown</h2>
            </div>
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">By month</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                        <th className="px-3 py-2">Month</th>
                        <th className="px-3 py-2 text-right">Entries</th>
                        <th className="px-3 py-2 text-right">CGST</th>
                        <th className="px-3 py-2 text-right">SGST</th>
                        <th className="px-3 py-2 text-right">GST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstBreakdownByMonthAndYear.byMonth.map((m) => (
                        <tr key={m.month} className="border-b border-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{m.month}</td>
                          <td className="px-3 py-2 text-right">{m.count}</td>
                          <td className="px-3 py-2 text-right">₹{m.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right">₹{m.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right font-medium">₹{m.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-800 mb-2">By year</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                        <th className="px-3 py-2">Year</th>
                        <th className="px-3 py-2 text-right">Entries</th>
                        <th className="px-3 py-2 text-right">CGST</th>
                        <th className="px-3 py-2 text-right">SGST</th>
                        <th className="px-3 py-2 text-right">GST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gstBreakdownByMonthAndYear.byYear.map((y) => (
                        <tr key={y.year} className="border-b border-slate-50">
                          <td className="px-3 py-2 font-medium text-slate-800">{y.year}</td>
                          <td className="px-3 py-2 text-right">{y.count}</td>
                          <td className="px-3 py-2 text-right">₹{y.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right">₹{y.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right font-medium">₹{y.gst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* By canteen */}
        {byCanteen.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-semibold text-slate-800">Totals by canteen (same filters)</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-100">
                    <th className="px-4 py-2">Canteen / destination</th>
                    <th className="px-4 py-2 text-right">Entries</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Cost (ex GST)</th>
                    <th className="px-4 py-2 text-right">CGST</th>
                    <th className="px-4 py-2 text-right">SGST</th>
                    <th className="px-4 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {[...byCanteen]
                    .sort((a, b) => b.totalCost - a.totalCost)
                    .map((b, i) => (
                      <tr key={`${b.canteenAddressId ?? 'null'}-${i}`} className="border-b border-slate-50">
                        <td className="px-4 py-2 font-medium text-slate-800">{b.canteenName}</td>
                        <td className="px-4 py-2 text-right">{b.entryCount}</td>
                        <td className="px-4 py-2 text-right">{b.totalQuantity.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-2 text-right">
                          ₹{b.totalCostExGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right">
                          ₹{b.totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right">
                          ₹{b.totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2 text-right font-medium">
                          ₹{b.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showForm && (
          <div className="fixed inset-0 z-50 bg-slate-900/30 overflow-y-auto">
            <div className="min-h-full flex items-start justify-center p-2 sm:p-3 md:pt-6">
              <div className="w-full max-w-6xl bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 md:p-5 max-h-[96vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">{editingId ? 'Edit line' : 'New courier bill'}</h2>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Courier date *</label>
                <input
                  ref={courierDateRef}
                  type="date"
                  required
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                  value={form.courierDate}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, courierDate: '' }));
                    setForm((f) => ({ ...f, courierDate: e.target.value }));
                  }}
                />
                {fieldErrors.courierDate && <p className="text-xs text-red-600 mt-1">{fieldErrors.courierDate}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Quantity *</label>
                <input
                  ref={quantityRef}
                  type="number"
                  min={0}
                  step="0.01"
                  required={!!editingId}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                  placeholder="e.g. parcels, kg, cartons"
                  value={form.quantity}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, quantity: '' }));
                    setForm((f) => ({ ...f, quantity: e.target.value }));
                  }}
                />
                {fieldErrors.quantity && <p className="text-xs text-red-600 mt-1">{fieldErrors.quantity}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Cost (ex GST) *</label>
                <input
                  ref={costRef}
                  type="number"
                  min={0.01}
                  step="0.01"
                  required={!!editingId}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                  value={form.cost}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, cost: '' }));
                    setForm((f) => ({
                      ...f,
                      cost: e.target.value,
                      gstAmount: String(computeGstAmountFromCostAndRate(e.target.value, f.gstRate)),
                    }));
                  }}
                />
                {fieldErrors.cost && <p className="text-xs text-red-600 mt-1">{fieldErrors.cost}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">GST rate (%) *</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                  value={form.gstRate}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      gstRate: e.target.value,
                      gstAmount: String(computeGstAmountFromCostAndRate(f.cost, e.target.value)),
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sub Total (₹)</label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  readOnly
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm bg-slate-50"
                  value={round2(Number(form.cost) || 0)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  CGST @ {(Number(form.gstRate || 0) / 2).toFixed(2)}%
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  readOnly
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm bg-slate-50"
                  value={formCgstAmountComputed}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  SGST @ {(Number(form.gstRate || 0) / 2).toFixed(2)}%
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  readOnly
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm bg-slate-50"
                  value={formSgstAmountComputed}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Round Off (₹) (auto)</label>
                <input
                  type="number"
                  step="0.01"
                  readOnly
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm bg-slate-50"
                  value={formRoundOffComputed}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nett Amount Payable (₹)</label>
                <input
                  ref={gstAmountRef}
                  type="number"
                  step="0.01"
                  readOnly
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm bg-slate-50"
                  value={formNetPayableComputed}
                />
                {fieldErrors.gstAmount && <p className="text-xs text-red-600 mt-1">{fieldErrors.gstAmount}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Payment *</label>
                <select
                  ref={paymentMethodRef}
                  required
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                  value={form.paymentMethod}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, paymentMethod: '' }));
                    setForm((f) => ({ ...f, paymentMethod: e.target.value }));
                  }}
                >
                  {PAYMENT_METHODS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.paymentMethod && <p className="text-xs text-red-600 mt-1">{fieldErrors.paymentMethod}</p>}
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Canteen * or Destination / address note *
                </label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                  value={form.canteenAddressId}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, destinationNote: '' }));
                    setForm((f) => ({ ...f, canteenAddressId: e.target.value }));
                  }}
                >
                  <option value="">— Select canteen —</option>
                  {canteens.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.canteenName} — {c.city || c.address?.slice(0, 40)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">Destination / address note</label>
                <input
                  ref={destinationNoteRef}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                  placeholder="Required if no canteen selected"
                  value={form.destinationNote}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, destinationNote: '' }));
                    setForm((f) => ({ ...f, destinationNote: e.target.value }));
                  }}
                />
                {fieldErrors.destinationNote && <p className="text-xs text-red-600 mt-1">{fieldErrors.destinationNote}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Bill reference (Ref / AWB)</label>
                <input
                  ref={referenceNoRef}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                  value={form.referenceNo}
                  onChange={(e) => {
                    setFieldErrors((prev) => ({ ...prev, referenceNo: '' }));
                    setForm((f) => ({ ...f, referenceNo: e.target.value }));
                  }}
                  required={!editingId}
                />
                {fieldErrors.referenceNo && <p className="text-xs text-red-600 mt-1">{fieldErrors.referenceNo}</p>}
              </div>
              <div className="md:col-span-2 xl:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Attach PDF reference (optional)
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setBillPdfError('');
                    if (!f) {
                      setBillPdfFile(null);
                      return;
                    }

                    const isPdf =
                      String(f.type || '').toLowerCase().includes('pdf') ||
                      String(f.name || '').toLowerCase().endsWith('.pdf');
                    if (!isPdf) {
                      setBillPdfFile(null);
                      setBillPdfError('Only PDF files are allowed');
                      return;
                    }

                    const maxBytes = 20 * 1024 * 1024; // 20MB
                    if (typeof f.size === 'number' && f.size > maxBytes) {
                      setBillPdfFile(null);
                      setBillPdfError('PDF too large (max 20MB)');
                      return;
                    }

                    setBillPdfFile(f);
                  }}
                />
                {billPdfFile && <p className="text-xs text-slate-500 mt-1">Selected: {billPdfFile.name}</p>}
                {!billPdfFile && existingPdfPath && (
                  <a
                    href={`/api/uploads/inline?path=${encodeURIComponent(existingPdfPath)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block mt-1 text-xs text-indigo-600 hover:text-indigo-800 underline"
                  >
                    View current PDF{existingPdfOriginalName ? ` (${existingPdfOriginalName})` : ''}
                  </a>
                )}
                {editingId && existingPdfPath && (
                  <label className="mt-2 inline-flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={removeExistingPdf}
                      onChange={(e) => setRemoveExistingPdf(e.target.checked)}
                    />
                    Remove current PDF on save
                  </label>
                )}
                {billPdfError && <p className="text-xs text-red-600 mt-1">{billPdfError}</p>}
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={1}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-sm"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {!editingId && draftLines.length > 0 && (
                <div className="md:col-span-2">
                  <div className="text-sm font-semibold text-slate-800 mb-2">Draft lines (same bill)</div>
                  <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg border border-slate-200 p-2 bg-slate-50">
                      Ex GST: ₹{draftTotals.exGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="rounded-lg border border-slate-200 p-2 bg-slate-50">
                      CGST: ₹{draftTotals.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · SGST: ₹
                      {draftTotals.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="rounded-lg border border-slate-200 p-2 bg-slate-50 sm:col-span-2">
                      Total GST: ₹{draftTotals.gst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <div className="text-xs text-slate-500 mt-1">
                        Exact total: ₹{draftTotals.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {(() => {
                        const net = Math.round(draftTotals.total);
                        const roundOff = net - draftTotals.total;
                        return (
                          <div className="text-xs text-slate-600 mt-1">
                            Round off: ₹{roundOff.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Net amount: ₹
                            {net.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-slate-500 uppercase border-b border-slate-200">
                          <th className="px-3 py-2">Destination</th>
                          <th className="px-3 py-2 text-right">Qty</th>
                          <th className="px-3 py-2 text-right">Cost (ex GST)</th>
                          <th className="px-3 py-2 text-right">CGST</th>
                          <th className="px-3 py-2 text-right">SGST</th>
                          <th className="px-3 py-2 text-right">Total</th>
                          <th className="px-3 py-2 text-right">Remove</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftLines.map((l) => {
                          const qtyNum = Number(l.quantity);
                          const costNum = Number(l.cost);
                          const gstNum = calcDraftGstAmount(l);
                          const cgstNum = calcDraftCgstAmount(l);
                          const sgstNum = calcDraftSgstAmount(l);
                          const total = (Number.isFinite(costNum) ? costNum : 0) + gstNum;
                          const dest = l.canteenAddressId
                            ? canteens.find((c) => c.id === l.canteenAddressId)?.canteenName || 'Canteen'
                            : l.destinationNote || '—';
                          return (
                            <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                              <td className="px-3 py-2">{dest}</td>
                              <td className="px-3 py-2 text-right">{Number.isFinite(qtyNum) ? qtyNum.toLocaleString('en-IN') : '—'}</td>
                              <td className="px-3 py-2 text-right">₹{Number.isFinite(costNum) ? costNum.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}</td>
                              <td className="px-3 py-2 text-right">₹{cgstNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="px-3 py-2 text-right">₹{sgstNum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="px-3 py-2 text-right font-medium">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td className="px-3 py-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeDraftLine(l.id)}
                                  className="text-red-600 hover:text-red-800 text-xs font-medium"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {error && (
                <div className="md:col-span-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">
                  {error}
                </div>
              )}
              <div className="md:col-span-2 flex gap-2 flex-wrap">
                {!editingId && (
                  <button
                    type="button"
                    onClick={addLineToDraft}
                    className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-medium hover:bg-slate-300"
                  >
                    + Add line to bill
                  </button>
                )}
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">
                  {editingId ? 'Save changes' : 'Save bill'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-200 text-slate-800 rounded-lg text-sm font-medium">
                  Cancel
                </button>
              </div>
            </form>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-800">All entries</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                  <th className="px-3 py-3">Date</th>
                  <th className="px-3 py-3">Canteen / destination</th>
                  <th className="px-3 py-3 text-right">Qty</th>
                  <th className="px-3 py-3 text-right">Cost (ex GST)</th>
                      <th className="px-3 py-3 text-right">CGST</th>
                      <th className="px-3 py-3 text-right">SGST</th>
                  <th className="px-3 py-3 text-right">Total</th>
                  <th className="px-3 py-3">Ref</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const dest =
                    r.canteenName ||
                    (r.destinationNote ? r.destinationNote : '—');
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/80">
                      <td className="px-3 py-3 whitespace-nowrap">{r.courierDate}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-900">{dest}</div>
                        {r.canteenName && r.canteenCity && (
                          <div className="text-xs text-slate-500">{r.canteenCity}</div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">{r.quantity.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-3 text-right font-medium">
                        ₹{r.cost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-right">
                        ₹{(r.cgstAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        ₹{(r.sgstAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-right font-medium">
                        ₹{round2(Math.round((r.cost ?? 0) + (r.gstAmount ?? 0))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-600 max-w-[120px] truncate" title={r.referenceNo}>
                        {r.referenceNo || '—'}
                        {r.referencePdfPath && (
                          <div className="mt-1">
                            <a
                              href={`/api/uploads/inline?path=${encodeURIComponent(r.referencePdfPath)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:text-indigo-800 text-[11px] font-medium underline"
                            >
                              View PDF
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium mr-2"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(r.id)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {rows.length === 0 && (
            <div className="px-4 py-12 text-center text-slate-500 text-sm">No entries in this period. Click &quot;New entry&quot;.</div>
          )}
        </div>
      </div>
    </div>
  );
}
