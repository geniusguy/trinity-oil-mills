'use client';

import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  getFinancialYearLabelForDate,
  isDateInFinancialYear,
  parseFinancialYearLabelToStartYear,
} from '@/lib/financialYear';

interface Sale {
  id: string;
  invoiceNumber: string;
  saleType: string;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: string;
  shipmentStatus: string;
  createdAt: string;
  invoiceDate?: string;
  userName: string;
  customerName?: string;
  canteenName?: string;
  canteenAddress?: string;
  contactPerson?: string;
  mobileNumber?: string;
  canteenContact?: string;
  canteenMobile?: string;
  poNumber?: string;
  poDate?: string;
  canteenAddressId?: string;
  modeOfSales?: string;
  keptOnDisplay?: number | boolean;
  courierWeightOrRs?: string | null;
  mailSentHoDate?: string | null;
  referencePdfPath?: string | null;
  referencePdfOriginalName?: string | null;
  creditedDate?: string | null;
  isReservation?: boolean;
  reservationReason?: string | null;
  reservationDbId?: string | null;
  reservationFyLabel?: string | null;
}

interface CanteenAddress {
  id: string;
  canteenName: string;
  address: string;
  contactPerson: string;
  mobileNumber: string;
  deliveryEmail?: string | null;
  billingEmail?: string | null;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
}

function formatDateEnGB(value: string | null | undefined): string {
  if (value == null || !String(value).trim()) return '—';
  const v = String(value).trim();
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB');
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Invoice value shown on printed invoice.
 * Keep consistent with `/api/sales/[id]/invoice/html` bill-rounding logic.
 */
function getInvoiceBillTotal(sale: Sale): number {
  const subtotal = round2(Number(sale.subtotal || 0));
  // Current system uses 5% GST for canteen invoices.
  const derivedGstAmount = round2(subtotal * 0.05);
  const sgstDisplay = round2(derivedGstAmount / 2);
  const cgstDisplay = round2(derivedGstAmount - sgstDisplay);
  const sgstBillWhole = Math.floor(sgstDisplay);
  const cgstBillWhole = Math.floor(cgstDisplay);
  return round2(subtotal + sgstBillWhole + cgstBillWhole);
}

/** Days from invoice date (or sale created_at) to credited_date; null if missing. */
function getDaysInvoiceToCredit(sale: Sale): number | null {
  if (sale.isReservation || sale.paymentStatus !== 'paid') return null;
  const credRaw = String(sale.creditedDate || '').trim();
  if (!credRaw) return null;
  const cred = /^\d{4}-\d{2}-\d{2}$/.test(credRaw) ? new Date(`${credRaw}T12:00:00`) : new Date(credRaw);
  const invRaw = sale.invoiceDate || sale.createdAt;
  const invStr = String(invRaw || '').trim();
  const invDatePart = invStr.slice(0, 10);
  const inv = /^\d{4}-\d{2}-\d{2}$/.test(invDatePart)
    ? new Date(`${invDatePart}T12:00:00`)
    : new Date(invRaw);
  if (Number.isNaN(cred.getTime()) || Number.isNaN(inv.getTime())) return null;
  return Math.round((cred.getTime() - inv.getTime()) / 86400000);
}

function PaidCreditBlock({ sale }: { sale: Sale }) {
  if (sale.isReservation || sale.paymentStatus !== 'paid') return null;
  const days = getDaysInvoiceToCredit(sale);
  const invoiceDateLabel = formatDateEnGB(sale.invoiceDate || sale.createdAt);
  const creditedLabel = formatDateEnGB(sale.creditedDate);

  return (
    <div className="mt-2 rounded-lg border border-emerald-200/90 bg-emerald-50/95 px-2.5 py-2 space-y-1 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900">Credited to our account</div>
      <div className="text-xs text-emerald-950">
        <span className="text-emerald-800/90">Credited date:</span>{' '}
        <span className="font-medium">{creditedLabel}</span>
      </div>
      <div className="text-xs text-emerald-950">
        <span className="text-emerald-800/90">No. of days to credit:</span>{' '}
        {days === null ? (
          <span className="text-amber-800 font-medium">— (set credited date)</span>
        ) : (
          <span className="font-semibold tabular-nums">{days}</span>
        )}
        {days !== null && <span className="text-emerald-800/80"> {days === 1 ? 'day' : 'days'}</span>}
      </div>
      <div className="text-[11px] text-emerald-900/95 font-mono leading-snug break-words border-t border-emerald-200/60 pt-1.5 mt-1">
        <span className="text-emerald-800/80 font-sans text-[10px] uppercase tracking-wide">Invoice → credit</span>
        <br />
        <span className="font-semibold">{sale.invoiceNumber}</span>
        <span className="text-emerald-700 mx-1">·</span>
        {invoiceDateLabel}
        <span className="text-emerald-600 mx-1">→</span>
        {creditedLabel}
      </div>
    </div>
  );
}

/** Display label for `sale.paymentStatus` (API still uses `paid` for credited-to-account). */
function paymentStatusDisplay(status: string): string {
  const s = String(status || '').toLowerCase();
  if (s === 'paid') return 'Credited';
  if (s === 'reserved') return 'Reserved (dummy)';
  return status;
}

export default function CanteenSalesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [filteredSales, setFilteredSales] = useState<Sale[]>([]);
  const [canteenAddresses, setCanteenAddresses] = useState<CanteenAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter and sort states
  const [filters, setFilters] = useState({
    search: '',
    paymentMethod: '',
    paymentStatus: '',
    shipmentStatus: '',
    canteenId: '',
    dateFrom: '',
    dateTo: '',
    month: '',
    year: getFinancialYearLabelForDate(new Date())
  });
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [availableMonths, setAvailableMonths] = useState<{value: string, label: string}[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [emailInvoiceSale, setEmailInvoiceSale] = useState<Sale | null>(null);
  const [emailInvoiceTo, setEmailInvoiceTo] = useState<string>('trinityoilmills@gmail.com');
  const [isEmailInvoiceSending, setIsEmailInvoiceSending] = useState(false);
  const [emailInvoiceStatus, setEmailInvoiceStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editReferencePdfFile, setEditReferencePdfFile] = useState<File | null>(null);
  const [editReferencePdfError, setEditReferencePdfError] = useState('');
  const [removeExistingReferencePdf, setRemoveExistingReferencePdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canteenTableTopScrollRef = useRef<HTMLDivElement>(null);
  const canteenTableMainScrollRef = useRef<HTMLDivElement>(null);
  const canteenTableScrollSpacerRef = useRef<HTMLDivElement>(null);
  const canteenTableRef = useRef<HTMLTableElement>(null);
  const canteenScrollSyncing = useRef(false);

  // Dummy invoice reservation modal
  const [showReserveReservationModal, setShowReserveReservationModal] = useState(false);
  const [reserveInvoiceNumber, setReserveInvoiceNumber] = useState('');
  const [reserveReason, setReserveReason] = useState('');
  const [reserveError, setReserveError] = useState('');
  const [isReserving, setIsReserving] = useState(false);

  const [editForm, setEditForm] = useState({
    paymentStatus: '',
    shipmentStatus: '',
    notes: '',
    invoiceNumber: '',
    poNumber: '',
    poDate: '',
    invoiceDate: '',
    customerName: '',
    canteenAddressId: '',
    paymentMethod: '',
    modeOfSales: '',
    customerEmail: ''
    ,
    keptOnDisplay: false,
    courierWeightOrRs: '',
    mailSentHoDate: '',
    creditedDate: '',
  });

  // Redirect if not authenticated or not admin
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

  // Fetch canteen sales and addresses
  useEffect(() => {
    if (session?.user && ['admin', 'retail_staff', 'accountant'].includes(session.user.role)) {
      fetchCanteenSales();
      fetchCanteenAddresses();
    }
  }, [session]);

  const fetchCanteenSales = async () => {
    try {
      setIsLoading(true);
      const [salesRes, reservationsRes] = await Promise.all([
        fetch('/api/sales?category=canteen&limit=1000'),
        fetch('/api/invoice-reservations?saleType=canteen&status=reserved&limit=1000'),
      ]);

      const salesData = await salesRes.json();
      const reservationsData = await reservationsRes.json();

      if (salesRes.ok) {
        const baseSales: Sale[] = Array.isArray(salesData.sales) ? salesData.sales : [];
        const reservationRows: Sale[] = Array.isArray(reservationsData.reservations)
          ? reservationsData.reservations.map((r: any) => ({
              id: `reservation-${r.id}`,
              invoiceNumber: r.invoiceNumber,
              saleType: 'canteen',
              subtotal: 0,
              gstAmount: 0,
              totalAmount: 0,
              paymentMethod: 'credit',
              paymentStatus: 'reserved',
              shipmentStatus: 'pending',
              createdAt: r.createdAt || new Date().toISOString(),
              userName: 'Reserved',
              canteenName: 'Dummy / Reserved',
              reservationReason: r.reason || null,
              reservationDbId: r.id || null,
              reservationFyLabel: r.fyLabel || null,
              isReservation: true,
            }))
          : [];

        const merged = [...baseSales, ...reservationRows];
        setSales(merged);
        extractAvailableDates(merged);
      } else {
        setError(salesData.error || 'Failed to fetch canteen sales');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCanteenAddresses = async () => {
    try {
      const response = await fetch('/api/canteen-addresses');
      const data = await response.json();
      setCanteenAddresses(data.addresses || []);
    } catch (error) {
      console.error('Error fetching canteen addresses:', error);
    }
  };

  // Anchor date for FY:
  // - normal sales: invoice date, else PO date, else created_at
  // - dummy reservations: derive from reservation FY label (e.g. "2024-25" -> 2024-04-01)
  const anchorDate = (sale: Sale) => {
    if (sale.isReservation && sale.reservationFyLabel) {
      const fy = String(sale.reservationFyLabel).trim();
      const m = fy.match(/^(\d{4})(?:-\d{2})?$/);
      if (m?.[1]) {
        const startYear = Number(m[1]);
        if (Number.isFinite(startYear)) {
          return new Date(startYear, 3, 1); // Apr 1 of FY start year
        }
      }
    }
    return new Date(sale.invoiceDate || sale.poDate || sale.createdAt);
  };

  // Extract available months and years from sales data
  const extractAvailableDates = (salesData: Sale[]) => {
    const months = new Set<string>();
    const years = new Set<string>();
    
    salesData.forEach(sale => {
      const date = anchorDate(sale);
      const calYear = date.getFullYear().toString();
      const month = `${calYear}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      years.add(getFinancialYearLabelForDate(date));
      months.add(month);
    });
    
    // Convert months to labeled options
    const monthOptions = Array.from(months)
      .sort((a, b) => b.localeCompare(a)) // Sort newest first
      .map(monthValue => {
        const [year, month] = monthValue.split('-');
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthName = monthNames[parseInt(month) - 1];
        return {
          value: monthValue,
          label: `${monthName} ${year}`
        };
      });
    
    const yearOptions = Array.from(years).sort((a, b) => b.localeCompare(a)); // Sort newest first
    
    setAvailableMonths(monthOptions);
    setAvailableYears(yearOptions);
  };

  // Apply filters and sorting
  const applyFiltersAndSort = () => {
    let filtered = [...sales];

    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(s => 
        s.invoiceNumber.toLowerCase().includes(searchLower) ||
        s.userName.toLowerCase().includes(searchLower) ||
        (s.customerName && s.customerName.toLowerCase().includes(searchLower)) ||
        (s.canteenName && s.canteenName.toLowerCase().includes(searchLower))
      );
    }
    if (filters.paymentMethod) {
      filtered = filtered.filter(s => s.paymentMethod === filters.paymentMethod);
    }
    if (filters.paymentStatus) {
      filtered = filtered.filter(s => s.paymentStatus === filters.paymentStatus);
    }
    if (filters.shipmentStatus) {
      filtered = filtered.filter(s => s.shipmentStatus === filters.shipmentStatus);
    }
    if (filters.canteenId) {
      filtered = filtered.filter(s => s.canteenAddressId === filters.canteenId);
    }

    // Use PO Date as main date when present (for filtering/sorting)
    const getSaleDate = (s: Sale) => (s.poDate ? new Date(s.poDate) : new Date(s.createdAt));

    // Apply date filters (by PO Date when present)
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(s => getSaleDate(s) >= fromDate);
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(s => getSaleDate(s) <= toDate);
    }
    if (filters.month) {
      const [year, month] = filters.month.split('-');
      filtered = filtered.filter(s => {
        const saleDate = getSaleDate(s);
        return saleDate.getFullYear() === parseInt(year) && 
               saleDate.getMonth() === parseInt(month) - 1;
      });
    }
    if (filters.year) {
      const fyStart = parseFinancialYearLabelToStartYear(filters.year);
      filtered = filtered.filter(s => {
        const d = anchorDate(s);
        return fyStart !== null && isDateInFinancialYear(d, fyStart);
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      const parseInvoiceSortKey = (s?: string) => {
        const str = String(s || '').trim();
        // Examples: C0001/2025-26, R0042/2024-25, legacy C0001/2026
        const m = str.match(/^[A-Za-z]\s*(\d+)\s*\/\s*(\d{4})(?:\s*-\s*(\d{2}))?$/);
        if (m) {
          const seq = Number(m[1] || 0);
          const fyStart = Number(m[2] || 0);
          const fyEnd = m[3] ? Number(`${String(fyStart).slice(0, 2)}${m[3]}`) : fyStart;
          return { fyStart, fyEnd, seq, raw: str };
        }

        // Fallback for unusual invoice formats
        const seqFallback = Number((str.match(/\d+/)?.[0] || '-1'));
        return { fyStart: -1, fyEnd: -1, seq: seqFallback, raw: str };
      };

      const parseInvoiceSequence = (s?: string): number => {
        if (!s) return -1;
        const str = String(s).trim();
        // Prefer patterns like C0001/2024-25 or legacy C0001/2026
        const m = str.match(/^[A-Za-z]\s*(\d+)\s*\/\s*(?:\d{4}-\d{2}|\d{4})$/);
        if (m?.[1]) return Number(m[1]);
        // Fallback: take first numeric group
        const g = str.match(/\d+/);
        return g ? Number(g[0]) : -1;
      };

      const parsePoSequence = (s?: string): number => {
        if (!s) return -1;
        const str = String(s).trim();
        // Prefer patterns like PO-71 / 25-26
        const m = str.match(/PO-?\s*(\d+)/i);
        if (m?.[1]) return Number(m[1]);
        const g = str.match(/\d+/);
        return g ? Number(g[0]) : -1;
      };
      
      switch (sortBy) {
        case 'invoiceNumber':
          aValue = a.invoiceNumber.toLowerCase();
          bValue = b.invoiceNumber.toLowerCase();
          break;
        case 'invoiceNumberNumeric':
          {
            const aKey = parseInvoiceSortKey(a.invoiceNumber);
            const bKey = parseInvoiceSortKey(b.invoiceNumber);

            // Always group/sort by FY first (newest FY first), then invoice sequence.
            // This avoids mixing C0001/2024-25 between C0001/2025-26 and C0002/2025-26.
            if (aKey.fyStart !== bKey.fyStart) return bKey.fyStart - aKey.fyStart;
            if (aKey.fyEnd !== bKey.fyEnd) return bKey.fyEnd - aKey.fyEnd;

            if (aKey.seq !== bKey.seq) {
              return sortOrder === 'asc' ? aKey.seq - bKey.seq : bKey.seq - aKey.seq;
            }

            // Stable fallback
            return aKey.raw.localeCompare(bKey.raw);
          }
        case 'canteenName':
          aValue = (a.canteenName || '').toLowerCase();
          bValue = (b.canteenName || '').toLowerCase();
          break;
        case 'totalAmount':
          aValue = a.isReservation ? -1 : getInvoiceBillTotal(a);
          bValue = b.isReservation ? -1 : getInvoiceBillTotal(b);
          break;
        case 'paymentMethod':
          aValue = a.paymentMethod.toLowerCase();
          bValue = b.paymentMethod.toLowerCase();
          break;
        case 'paymentStatus':
          aValue = a.paymentStatus.toLowerCase();
          bValue = b.paymentStatus.toLowerCase();
          break;
        case 'shipmentStatus':
          aValue = a.shipmentStatus.toLowerCase();
          bValue = b.shipmentStatus.toLowerCase();
          break;
        case 'poNumber':
          aValue = (a.poNumber || '').toLowerCase();
          bValue = (b.poNumber || '').toLowerCase();
          break;
        case 'poNumberNumeric':
          aValue = parsePoSequence(a.poNumber);
          bValue = parsePoSequence(b.poNumber);
          break;
        case 'poDate':
          aValue = (a.poDate ? new Date(a.poDate) : new Date(a.createdAt)).getTime();
          bValue = (b.poDate ? new Date(b.poDate) : new Date(b.createdAt)).getTime();
          break;
        case 'modeOfSales':
          aValue = (a.modeOfSales || '').toLowerCase();
          bValue = (b.modeOfSales || '').toLowerCase();
          break;
        case 'invoiceDate':
          aValue = (a.invoiceDate ? new Date(a.invoiceDate) : new Date(a.createdAt)).getTime();
          bValue = (b.invoiceDate ? new Date(b.invoiceDate) : new Date(b.createdAt)).getTime();
          break;
        case 'contact':
          aValue = ((a.canteenContact ?? a.contactPerson) || '').toLowerCase();
          bValue = ((b.canteenContact ?? b.contactPerson) || '').toLowerCase();
          break;
        case 'createdAt':
          aValue = (a.poDate ? new Date(a.poDate) : new Date(a.createdAt)).getTime();
          bValue = (b.poDate ? new Date(b.poDate) : new Date(b.createdAt)).getTime();
          break;
        default:
          aValue = (a.poDate ? new Date(a.poDate) : new Date(a.createdAt)).getTime();
          bValue = (b.poDate ? new Date(b.poDate) : new Date(b.createdAt)).getTime();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    setFilteredSales(filtered);
  };

  // Handle filter changes
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle sort change
  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const openReserveReservationModal = () => {
    setReserveInvoiceNumber('');
    setReserveReason('');
    setReserveError('');
    setShowReserveReservationModal(true);
  };

  const submitReservation = async () => {
    const invoiceNumber = reserveInvoiceNumber.trim();
    const reason = reserveReason.trim();

    if (!invoiceNumber) {
      setReserveError('Invoice number is required');
      return;
    }

    try {
      setIsReserving(true);
      setReserveError('');
      setError('');
      setSuccess('');

      const res = await fetch('/api/invoice-reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceNumber,
          saleType: 'canteen',
          reason: reason || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setReserveError(data.error || 'Failed to reserve dummy invoice');
        return;
      }

      setSuccess(`Dummy invoice reserved: ${invoiceNumber}`);
      setShowReserveReservationModal(false);
      setReserveInvoiceNumber('');
      setReserveReason('');
      fetchCanteenSales();
    } catch (_) {
      setReserveError('Network error. Please try again.');
    } finally {
      setIsReserving(false);
    }
  };

  const cancelReservation = async (sale: Sale) => {
    if (!sale.reservationDbId) return;
    try {
      setError('');
      setSuccess('');

      const res = await fetch(
        `/api/invoice-reservations?id=${encodeURIComponent(sale.reservationDbId)}&saleType=canteen`,
        { method: 'DELETE' },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to cancel reservation');
        return;
      }

      setSuccess('Reservation cancelled');
      fetchCanteenSales();
    } catch (_) {
      setError('Network error. Please try again.');
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      paymentMethod: '',
      paymentStatus: '',
      shipmentStatus: '',
      canteenId: '',
      dateFrom: '',
      dateTo: '',
      month: '',
      year: getFinancialYearLabelForDate(new Date())
    });
  };

  // Apply filters when sales or filters change
  useEffect(() => {
    applyFiltersAndSort();
  }, [sales, filters, sortBy, sortOrder]);

  useLayoutEffect(() => {
    const table = canteenTableRef.current;
    const spacer = canteenTableScrollSpacerRef.current;
    if (!table || !spacer) return;
    const syncWidth = () => {
      spacer.style.width = `${table.scrollWidth}px`;
    };
    syncWidth();
    const ro = new ResizeObserver(syncWidth);
    ro.observe(table);
    return () => ro.disconnect();
  }, [filteredSales, sales.length]);

  const onCanteenTableTopScroll = () => {
    if (canteenScrollSyncing.current) return;
    canteenScrollSyncing.current = true;
    const top = canteenTableTopScrollRef.current;
    const main = canteenTableMainScrollRef.current;
    if (top && main) main.scrollLeft = top.scrollLeft;
    requestAnimationFrame(() => {
      canteenScrollSyncing.current = false;
    });
  };

  const onCanteenTableMainScroll = () => {
    if (canteenScrollSyncing.current) return;
    canteenScrollSyncing.current = true;
    const top = canteenTableTopScrollRef.current;
    const main = canteenTableMainScrollRef.current;
    if (top && main) top.scrollLeft = main.scrollLeft;
    requestAnimationFrame(() => {
      canteenScrollSyncing.current = false;
    });
  };

  const handleEditSale = (sale: Sale) => {
    setSelectedSale(sale);
    
    // Parse mode of sales and email
    let modeOfSales = sale.modeOfSales || '';
    let customerEmail = '';
    
    if (sale.modeOfSales && sale.modeOfSales.startsWith('email:')) {
      modeOfSales = 'email';
      customerEmail = sale.modeOfSales.split(':')[1] || '';
    }
    
    // Normalize dates from API (can be Date string with timezone) to YYYY-MM-DD for <input type="date">
    const normalizeDate = (d?: string) => {
      if (!d) return '';
      const str = String(d).trim();
      if (!str) return '';
      // If it's already YYYY-MM-DD, keep it
      if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
      const dt = new Date(str);
      if (Number.isNaN(dt.getTime())) return '';
      // Format using local timezone to avoid "one day before" issues
      const yyyy = dt.getFullYear();
      const mm = String(dt.getMonth() + 1).padStart(2, '0');
      const dd = String(dt.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    setEditForm({
      paymentStatus: sale.paymentStatus,
      shipmentStatus: sale.shipmentStatus || 'pending', // Default to pending for canteen
      notes: '',
      invoiceNumber: sale.invoiceNumber,
      poNumber: sale.poNumber || '',
      poDate: normalizeDate(sale.poDate),
      invoiceDate: normalizeDate(sale.invoiceDate),
      customerName: sale.canteenName || sale.customerName || '',
      canteenAddressId: sale.canteenAddressId || '', // Use the actual canteen address ID from sale
      paymentMethod: sale.saleType === 'canteen' ? 'credit' : sale.paymentMethod, // Auto credit for canteen
      modeOfSales: modeOfSales,
      customerEmail: customerEmail,
      keptOnDisplay: Boolean((sale as any).keptOnDisplay),
      courierWeightOrRs: (sale as any).courierWeightOrRs || '',
      mailSentHoDate: normalizeDate((sale as any).mailSentHoDate),
      creditedDate: normalizeDate((sale as any).creditedDate || null),
    });
    setShowEditModal(true);
    setError('');
    setSuccess('');
    setEditReferencePdfFile(null);
    setEditReferencePdfError('');
    setRemoveExistingReferencePdf(false);
  };

  const handleDeleteSale = (sale: Sale) => {
    setSelectedSale(sale);
    setShowDeleteModal(true);
    setError('');
    setSuccess('');
  };

  const updateSale = async () => {
    if (!selectedSale) return;

    try {
      setIsUpdating(true);
      setError('');
      
      // Prepare data for update
      const updateData = { ...editForm };

      // Optional PDF upload from edit modal
      let uploadedReferencePdfPath: string | null = removeExistingReferencePdf ? null : selectedSale.referencePdfPath || null;
      let uploadedReferencePdfOriginalName: string | null =
        removeExistingReferencePdf ? null : selectedSale.referencePdfOriginalName || null;
      if (editReferencePdfFile) {
        setEditReferencePdfError('');
        const fd = new FormData();
        fd.append('file', editReferencePdfFile);
        fd.append('scope', 'sales');
        const upRes = await fetch('/api/uploads/reference-pdf', {
          method: 'POST',
          body: fd,
          credentials: 'include',
        });

        // Server may return JSON on success/error, but on some failures it can return text/HTML.
        // Guard against `res.json()` throwing to keep the UI actionable.
        let upJson: any = null;
        try {
          const ct = String(upRes.headers.get('content-type') || '').toLowerCase();
          if (ct.includes('application/json')) {
            upJson = await upRes.json();
          } else {
            const txt = await upRes.text().catch(() => '');
            upJson = { error: txt || `PDF upload failed (HTTP ${upRes.status})` };
          }
        } catch (e) {
          const txt = await upRes.text().catch(() => '');
          upJson = { error: txt || `PDF upload failed (HTTP ${upRes.status})` };
        }

        if (!upRes.ok) {
          const msg = upJson.error || 'PDF upload failed';
          setEditReferencePdfError(msg);
          throw new Error(msg);
        }
        uploadedReferencePdfPath = upJson.path || null;
        uploadedReferencePdfOriginalName = upJson.originalName || null;
      }
      
      // Combine mode of sales with email if it's an email order
      if (editForm.modeOfSales === 'email' && editForm.customerEmail) {
        updateData.modeOfSales = `email:${editForm.customerEmail}`;
      }
      (updateData as any).referencePdfPath = uploadedReferencePdfPath;
      (updateData as any).referencePdfOriginalName = uploadedReferencePdfOriginalName;
      
      console.log('Updating sale with data:', updateData); // Debug log
      
      const response = await fetch(`/api/sales/${selectedSale.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      let data: any = null;
      try {
        const ct = String(response.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('application/json')) {
          data = await response.json();
        } else {
          const txt = await response.text().catch(() => '');
          data = { error: txt || `Update failed (HTTP ${response.status})` };
        }
      } catch (e) {
        const txt = await response.text().catch(() => '');
        data = { error: txt || `Update failed (HTTP ${response.status})` };
      }

      if (response.ok) {
        setSuccess('Sale updated successfully');
        setShowEditModal(false);
        setSelectedSale(null);
        fetchCanteenSales(); // Refresh the list
      } else {
        setError(data.error || 'Failed to update sale');
      }
    } catch (error) {
      // Preserve the real API error message (e.g. PDF too large / unauthorized / invalid scope)
      // instead of masking it as a generic network error.
      const msg = (error as any)?.message || 'Network error. Please try again.';
      setError(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  const openEmailInvoiceModal = (sale: Sale) => {
    setEmailInvoiceSale(sale);
    const defaultEmail = 'trinityoilmills@gmail.com';
    const addr = canteenAddresses.find((a) => String(a.id) === String(sale.canteenAddressId || ''));
    const prefill =
      String(addr?.deliveryEmail || '').trim() ||
      String(addr?.billingEmail || '').trim() ||
      defaultEmail;
    setEmailInvoiceTo(prefill);
    setEmailInvoiceStatus(null);
  };

  const closeEmailInvoiceModal = () => {
    setEmailInvoiceSale(null);
    setEmailInvoiceStatus(null);
    setIsEmailInvoiceSending(false);
  };

  const sendInvoicePdfEmail = async () => {
    if (!emailInvoiceSale || !emailInvoiceSale.id) return;
    if (!emailInvoiceTo.trim()) {
      setEmailInvoiceStatus({ type: 'error', message: 'Please enter recipient email.' });
      return;
    }

    try {
      setIsEmailInvoiceSending(true);
      setEmailInvoiceStatus(null);

      const res = await fetch(`/api/sales/${encodeURIComponent(emailInvoiceSale.id)}/invoice/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: emailInvoiceTo }),
      });
      let data: any = null;
      try {
        const ct = String(res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('application/json')) {
          data = await res.json();
        } else {
          const txt = await res.text().catch(() => '');
          data = { error: txt || `Failed to send email (HTTP ${res.status})` };
        }
      } catch (e) {
        const txt = await res.text().catch(() => '');
        data = { error: txt || `Failed to send email (HTTP ${res.status})` };
      }

      if (!res.ok) {
        setEmailInvoiceStatus({
          type: 'error',
          message: data?.error || 'Failed to send email.',
        });
        return;
      }

      const accepted = Array.isArray(data?.accepted) ? data.accepted : [];
      const rejected = Array.isArray(data?.rejected) ? data.rejected : [];
      const acceptedText = accepted.length ? `Accepted: ${accepted.join(', ')}` : 'Accepted: —';
      const rejectedText = rejected.length ? `Rejected: ${rejected.join(', ')}` : 'Rejected: —';
      const usedFallback = Boolean(data?.usedFallback);
      const fallbackMsg = usedFallback ? ` (NOTE: HTML->PDF failed on server, used legacy PDF instead${data?.htmlPdfError ? `: ${data.htmlPdfError}` : ''})` : '';

      setEmailInvoiceStatus({
        type: 'success',
        message: `Successfully email sent to ${emailInvoiceTo}. ${acceptedText}. ${rejectedText}.${fallbackMsg}`,
      });
      fetchCanteenSales();
    } catch (e: any) {
      setEmailInvoiceStatus({ type: 'error', message: e?.message || 'Network error. Please try again.' });
    } finally {
      setIsEmailInvoiceSending(false);
    }
  };

  const deleteSale = async () => {
    if (!selectedSale) return;

    try {
      setIsDeleting(true);
      setError('');
      
      const response = await fetch(`/api/sales/${selectedSale.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Sale deleted successfully');
        setShowDeleteModal(false);
        setSelectedSale(null);
        fetchCanteenSales(); // Refresh the list
      } else {
        setError(data.error || 'Failed to delete sale');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedSale(null);
    setEditForm({ 
      paymentStatus: '', 
      shipmentStatus: '', 
      notes: '',
      invoiceNumber: '',
      poNumber: '',
      poDate: '',
      invoiceDate: '',
      customerName: '',
      canteenAddressId: '',
      paymentMethod: '',
      modeOfSales: '',
      customerEmail: '',
      keptOnDisplay: false,
      courierWeightOrRs: '',
      mailSentHoDate: '',
      creditedDate: '',
    });
    setEditReferencePdfFile(null);
    setEditReferencePdfError('');
    setRemoveExistingReferencePdf(false);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedSale(null);
  };

  if (status === 'loading' || isLoading) {
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

  const fyInvoiceCount = (() => {
    if (!filters.year) return sales.length;
    const fyStart = parseFinancialYearLabelToStartYear(filters.year);
    if (fyStart === null) return sales.length;
    return sales.filter((s) => isDateInFinancialYear(anchorDate(s), fyStart)).length;
  })();

  const fyBreakupText = (() => {
    const counts: Record<string, number> = {};
    sales.forEach((s) => {
      const label = getFinancialYearLabelForDate(anchorDate(s));
      counts[label] = (counts[label] || 0) + 1;
    });

    return Object.entries(counts)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([fy, count]) => `${fy}: ${count}`)
      .join(' | ');
  })();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="w-full max-w-full py-3 sm:py-6">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Canteen Sales</h1>
              <p className="mt-1.5 text-sm sm:text-base text-slate-600">Manage canteen sales, deliveries, and credits</p>
            </div>
            <div className="w-full lg:max-w-3xl lg:shrink-0">
              <div className="text-sm text-slate-600 mb-2 lg:text-right">Welcome, {session.user?.name}</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Link
                  href="/dashboard/admin/sales/pos?type=canteen"
                  className="text-center rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition"
                >
                  New Sale
                </Link>
                <Link
                  href="/dashboard/admin/canteen-addresses"
                  className="text-center rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 active:scale-[0.98] transition"
                >
                  Addresses
                </Link>
                <button
                  type="button"
                  onClick={openReserveReservationModal}
                  className="text-center rounded-lg bg-amber-500 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-600 active:scale-[0.98] transition"
                >
                  Reserve dummy
                </button>
                <Link
                  href="/dashboard/admin/sales"
                  className="text-center rounded-lg bg-slate-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-slate-700 active:scale-[0.98] transition"
                >
                  All sales
                </Link>
                <Link
                  href="/dashboard/admin/sales/retail"
                  className="text-center rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700 active:scale-[0.98] transition"
                >
                  Retail
                </Link>
                <Link
                  href="/dashboard"
                  className="text-center rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 active:scale-[0.98] transition"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
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

        {/* Filters Section */}
        <div className="mb-6 rounded-xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-4">Filters &amp; search</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Invoice, customer, canteen..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                value={filters.paymentMethod}
                onChange={(e) => handleFilterChange('paymentMethod', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Methods</option>
                <option value="cash">Cash</option>
                <option value="upi">UPI</option>
                <option value="card">Card</option>
                <option value="credit">Credit</option>
                <option value="canteen_autopayment">Canteen Auto</option>
              </select>
            </div>

            {/* Credit status filter — API still uses payment_status=paid for credited sales */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Credit status</label>
              <select
                value={filters.paymentStatus}
                onChange={(e) => handleFilterChange('paymentStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All</option>
                <option value="paid">Credited to account</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Shipment Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Shipment Status</label>
              <select
                value={filters.shipmentStatus}
                onChange={(e) => handleFilterChange('shipmentStatus', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Status</option>
                <option value="courier">Courier</option>
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="walk_in_delivery">Walk in delivery</option>
              </select>
            </div>

            {/* Canteen Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Canteen</label>
              <select
                value={filters.canteenId}
                onChange={(e) => handleFilterChange('canteenId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Canteens</option>
                {canteenAddresses.map(addr => (
                  <option key={addr.id} value={addr.id}>
                    {addr.canteenName}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Month Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={filters.month}
                onChange={(e) => handleFilterChange('month', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Months</option>
                {availableMonths.map(month => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Financial year filter (India: Apr–Mar) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Financial year (Apr–Mar)</label>
              <select
                value={filters.year}
                onChange={(e) => handleFilterChange('year', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All FY</option>
                {availableYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            {/* Sorting is available by clicking the table headers below */}
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Sales Table + mobile cards */}
        <div className="rounded-xl border border-slate-200/90 bg-white shadow-sm overflow-visible">
          <div className="border-b border-slate-200/80 bg-slate-50/80 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900">
                Canteen sales <span className="text-slate-500 font-normal">({filteredSales.length})</span>
              </h2>
              <div className="flex flex-col gap-1 text-xs sm:text-sm text-slate-600 lg:text-right lg:items-end">
                <div>
                  <span className="text-slate-500">Total (filtered):</span>{' '}
                  <span className="font-semibold text-slate-900 tabular-nums">
                    ₹
                    {filteredSales
                      .reduce((sum, s) => sum + Number(s.totalAmount || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">FY count ({filters.year || 'All FY'}):</span>{' '}
                  <span className="font-semibold text-slate-900">{fyInvoiceCount}</span>
                  {!filters.year && fyBreakupText ? (
                    <div className="mt-1 max-w-xl text-[11px] leading-snug text-slate-500 lg:ml-auto">
                      {fyBreakupText}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-600 hidden md:block">
              <span className="font-medium text-slate-800">Wide table:</span> use the top or bottom horizontal scrollbar
              to see all columns (a short hint appears when you hover the table or those scroll areas). Invoice and
              Actions stay pinned while you scroll.
            </p>
          </div>
          
          <div className="hidden md:block border-t border-slate-200/90 group/canteen-hscroll">
            <div
              className="flex max-h-0 items-center justify-between gap-2 overflow-hidden border-b border-transparent bg-transparent px-3 py-0 opacity-0 transition-[max-height,opacity,padding,border-color,background-color] duration-200 ease-out group-hover/canteen-hscroll:max-h-14 group-hover/canteen-hscroll:border-slate-200 group-hover/canteen-hscroll:bg-indigo-50/70 group-hover/canteen-hscroll:py-1.5 group-hover/canteen-hscroll:opacity-100"
              role="note"
              aria-hidden="true"
            >
              <span className="text-xs font-medium text-indigo-950">↑ Scroll horizontally (same as table below)</span>
              <span className="text-lg leading-none text-indigo-400 select-none" aria-hidden>
                ↔
              </span>
            </div>
            <div
              ref={canteenTableTopScrollRef}
              onScroll={onCanteenTableTopScroll}
              className="canteen-sales-hscroll-top overscroll-x-contain border-b-2 border-slate-200 bg-slate-100/90"
              aria-label="Horizontal scroll for canteen table (top, synced with table scrollbar)"
            >
              <div ref={canteenTableScrollSpacerRef} className="h-2 shrink-0" />
            </div>
            <div
              ref={canteenTableMainScrollRef}
              onScroll={onCanteenTableMainScroll}
              className="canteen-sales-hscroll-main w-full max-w-full overflow-x-auto overscroll-x-contain [scrollbar-gutter:auto]"
            >
            <table ref={canteenTableRef} className="min-w-[1180px] w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {/* Invoice - Always visible */}
                  <th
                    className="sticky left-0 z-20 bg-slate-50 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none border-r border-slate-200 shadow-[4px_0_14px_-6px_rgba(15,23,42,0.18)]"
                    onClick={() => handleSortChange('invoiceNumberNumeric')}
                    title="Sort by invoice number (numeric)"
                  >
                    Invoice
                    {sortBy === 'invoiceNumberNumeric' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Canteen - Always visible */}
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('canteenName')}
                    title="Sort by canteen name"
                  >
                    Canteen
                    {sortBy === 'canteenName' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Amount - Always visible */}
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('totalAmount')}
                    title="Sort by total amount"
                  >
                    Total
                    {sortBy === 'totalAmount' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Payment Combined - Always visible */}
                  <th
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('paymentStatus')}
                    title="Sort by payment method and credit status (paid = credited to account)"
                  >
                    Pay / credit
                    {sortBy === 'paymentStatus' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>

                  {/* Kept on display - Visible on desktop */}
                  <th className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kept on display
                  </th>

                  {/* PO Number & Date - Visible on tablet+ */}
                  <th
                    className="hidden md:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('poNumberNumeric')}
                    title="Sort by PO number (numeric)"
                  >
                    PO Number &amp; Date
                    {sortBy === 'poNumberNumeric' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Contact - Hidden on mobile, visible on desktop */}
                  <th
                    className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('contact')}
                    title="Sort by contact name"
                  >
                    Contact
                    {sortBy === 'contact' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Shipment - Hidden on mobile, visible on desktop */}
                  <th
                    className="hidden lg:table-cell px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none"
                    onClick={() => handleSortChange('shipmentStatus')}
                    title="Sort by shipment status"
                  >
                    Shipment
                    {sortBy === 'shipmentStatus' && (sortOrder === 'asc' ? ' ▲' : ' ▼')}
                  </th>
                  
                  {/* Actions - Always visible */}
                  <th className="sticky right-0 z-20 bg-slate-50 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-slate-200 shadow-[-4px_0_14px_-6px_rgba(15,23,42,0.18)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredSales.map((sale) => (
                  <tr key={sale.id} className="group hover:bg-slate-50/90">
                    {/* Invoice */}
                    <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-4 text-sm whitespace-nowrap shadow-[4px_0_14px_-8px_rgba(15,23,42,0.12)] group-hover:bg-slate-50">
                      <div className="space-y-1">
                        <div className="font-medium text-indigo-700">{sale.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">
                          {new Date((sale.invoiceDate || sale.createdAt) as any).toLocaleDateString('en-GB')}
                        </div>
                        {sale.isReservation && (
                          <div className="text-xs text-amber-700 font-medium">Dummy reservation</div>
                        )}
                      </div>
                    </td>
                    
                    {/* Canteen */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      <div className="max-w-32">
                        <div className="font-medium text-gray-900 flex items-center">
                          🏢 {sale.canteenName || 'Unknown'}
                        </div>
                        {sale.canteenAddress && (
                          <div className="text-xs text-gray-500 truncate">
                            {sale.canteenAddress}
                          </div>
                        )}
                      </div>
                    </td>
                    
                    {/* Total Amount */}
                    <td className="px-3 py-4 whitespace-nowrap text-sm">
                      {sale.isReservation ? (
                        <div className="font-semibold text-gray-500">—</div>
                      ) : (
                        <div className="font-semibold text-gray-900">₹{getInvoiceBillTotal(sale).toFixed(2)}</div>
                      )}
                    </td>
                    
                    {/* Payment Combined */}
                    <td className="px-3 py-4 text-sm align-top min-w-[11rem] max-w-[17rem]">
                      <div className="space-y-1">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          sale.paymentMethod === 'cash' ? 'bg-green-100 text-green-800' :
                          sale.paymentMethod === 'upi' ? 'bg-blue-100 text-blue-800' :
                          sale.paymentMethod === 'card' ? 'bg-purple-100 text-purple-800' :
                          sale.paymentMethod === 'credit' ? 'bg-orange-100 text-orange-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {sale.paymentMethod === 'cash' ? '💵 Cash' :
                           sale.paymentMethod === 'upi' ? '📱 UPI' :
                           sale.paymentMethod === 'card' ? '💳 Card' :
                           sale.paymentMethod === 'credit' ? '🏦 Credit' :
                           sale.paymentMethod}
                        </span>
                        <div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            sale.paymentStatus === 'reserved' ? 'bg-amber-100 text-amber-800' :
                            sale.paymentStatus === 'paid' ? 'bg-green-100 text-green-800' :
                            sale.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {paymentStatusDisplay(sale.paymentStatus)}
                          </span>
                          {sale.isReservation && sale.reservationReason ? (
                            <div className="text-xs text-gray-500 mt-1">Reason: {sale.reservationReason}</div>
                          ) : null}
                          <PaidCreditBlock sale={sale} />
                        </div>
                      </div>
                    </td>

                    {/* Kept on display */}
                    <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm">
                      {Boolean((sale as any).keptOnDisplay) ? (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                          No
                        </span>
                      )}
                    </td>

                    {/* PO Number & Date - Hidden on mobile */}
                    <td className="hidden md:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {sale.poNumber ? (
                            <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                              📋 {sale.poNumber}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">No PO</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">PO Date:</span>{' '}
                          {sale.poDate ? new Date(sale.poDate).toLocaleDateString('en-GB') : '—'}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">Invoice Date:</span>{' '}
                          {new Date((sale.invoiceDate || sale.createdAt) as any).toLocaleDateString('en-GB')}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">Email sent HO:</span>{' '}
                          {(sale as any).mailSentHoDate ? 'Yes' : 'No'}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">HO Date:</span>{' '}
                          {(sale as any).mailSentHoDate ? new Date((sale as any).mailSentHoDate).toLocaleDateString('en-GB') : '—'}
                        </div>
                        <div className="text-xs text-gray-500">
                          <span className="font-semibold">Reference PDF:</span>{' '}
                          {sale.referencePdfPath ? (
                            <a
                              href={`/api/uploads/inline?path=${encodeURIComponent(sale.referencePdfPath)}`}
                              className="text-indigo-600 hover:text-indigo-900 font-medium underline"
                            >
                              View PDF
                            </a>
                          ) : (
                            '—'
                          )}
                        </div>
                      </div>
                    </td>
                    
                    {/* Contact - from canteen (canteenContact/canteenMobile) or fallback */}
                    <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="max-w-28">
                        <div className="font-medium">{(sale.canteenContact ?? sale.contactPerson) || 'N/A'}</div>
                        {(sale.canteenMobile ?? sale.mobileNumber) && (
                          <div className="text-xs text-gray-500">{sale.canteenMobile ?? sale.mobileNumber}</div>
                        )}
                      </div>
                    </td>
                    
                    {/* Shipment - Hidden on mobile */}
                    <td className="hidden lg:table-cell px-3 py-4 whitespace-nowrap text-sm">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        sale.shipmentStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                        sale.shipmentStatus === 'shipped' ? 'bg-blue-100 text-blue-800' :
                        sale.shipmentStatus === 'courier' ? 'bg-indigo-100 text-indigo-800' :
                        sale.shipmentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        sale.shipmentStatus === 'walk_in_delivery' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {sale.shipmentStatus}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="sticky right-0 z-10 border-l border-slate-200 bg-white px-3 py-4 text-sm whitespace-nowrap shadow-[-4px_0_14px_-8px_rgba(15,23,42,0.12)] group-hover:bg-slate-50">
                      <div className="flex flex-col space-y-1">
                        {!sale.isReservation && (
                          <a 
                            href={`/api/sales/${sale.id}/invoice/html`} 
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                          >
                            📄 Invoice
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => openEmailInvoiceModal(sale)}
                          className="text-indigo-600 hover:text-indigo-900 text-xs font-medium text-left"
                        >
                          Email Invoice PDF
                        </button>
                        {sale.referencePdfPath && (
                          <a
                            href={`/api/uploads/inline?path=${encodeURIComponent(sale.referencePdfPath)}`}
                            className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                          >
                            📎 View PDF
                          </a>
                        )}
                        {sale.isReservation && (
                          <button
                            onClick={() => cancelReservation(sale)}
                            className="text-amber-700 hover:text-amber-900 text-xs font-medium text-left"
                          >
                            🧾 Cancel Reservation
                          </button>
                        )}
                        {!sale.isReservation && (
                          <>
                            <button 
                              onClick={() => handleEditSale(sale)} 
                              className="text-blue-600 hover:text-blue-900 text-xs font-medium text-left"
                            >
                              ✏️ Edit
                            </button>
                            <button 
                              onClick={() => handleDeleteSale(sale)} 
                              className="text-red-600 hover:text-red-900 text-xs font-medium text-left"
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Mobile: card list (no horizontal table scroll) */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-indigo-700 break-all">{sale.invoiceNumber}</div>
                    <div className="text-xs text-slate-500">
                      Invoice date: {formatDateEnGB(sale.invoiceDate || sale.createdAt)}
                    </div>
                    {sale.isReservation && (
                      <div className="mt-1 text-xs font-medium text-amber-700">Dummy reservation</div>
                    )}
                  </div>
                  {sale.isReservation ? (
                    <span className="shrink-0 text-xs text-slate-500">—</span>
                  ) : (
                    <div className="shrink-0 text-right font-semibold text-slate-900 tabular-nums">
                      ₹{Number(sale.totalAmount).toFixed(2)}
                    </div>
                  )}
                </div>

                <div className="text-sm text-slate-800">
                  <span aria-hidden>🏢</span> <span className="font-medium">{sale.canteenName || 'Unknown'}</span>
                  {sale.canteenAddress ? (
                    <div className="mt-0.5 line-clamp-2 text-xs text-slate-500">{sale.canteenAddress}</div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                      sale.paymentMethod === 'cash'
                        ? 'bg-green-100 text-green-800'
                        : sale.paymentMethod === 'upi'
                          ? 'bg-blue-100 text-blue-800'
                          : sale.paymentMethod === 'card'
                            ? 'bg-purple-100 text-purple-800'
                            : sale.paymentMethod === 'credit'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {sale.paymentMethod === 'cash'
                      ? 'Cash'
                      : sale.paymentMethod === 'upi'
                        ? 'UPI'
                        : sale.paymentMethod === 'card'
                          ? 'Card'
                          : sale.paymentMethod === 'credit'
                            ? 'Credit'
                            : sale.paymentMethod}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                      sale.paymentStatus === 'reserved'
                        ? 'bg-amber-100 text-amber-800'
                        : sale.paymentStatus === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : sale.paymentStatus === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {paymentStatusDisplay(sale.paymentStatus)}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                      sale.shipmentStatus === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : sale.shipmentStatus === 'shipped'
                          ? 'bg-blue-100 text-blue-800'
                          : sale.shipmentStatus === 'courier'
                            ? 'bg-indigo-100 text-indigo-800'
                            : sale.shipmentStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : sale.shipmentStatus === 'walk_in_delivery'
                                ? 'bg-gray-100 text-gray-800'
                                : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {sale.shipmentStatus}
                  </span>
                </div>

                {sale.isReservation && sale.reservationReason ? (
                  <div className="text-xs text-slate-600">Reason: {sale.reservationReason}</div>
                ) : null}

                <PaidCreditBlock sale={sale} />

                {(sale.poNumber || sale.poDate) && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    {sale.poNumber ? <div>PO: {sale.poNumber}</div> : null}
                    {sale.poDate ? <div>PO date: {formatDateEnGB(sale.poDate)}</div> : null}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                  {!sale.isReservation && (
                    <a
                      href={`/api/sales/${sale.id}/invoice/html`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      Invoice
                    </a>
                  )}
                  {!sale.isReservation && (
                    <button
                      type="button"
                      onClick={() => openEmailInvoiceModal(sale)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      Email PDF
                    </button>
                  )}
                  {sale.referencePdfPath && (
                    <a
                      href={`/api/uploads/inline?path=${encodeURIComponent(sale.referencePdfPath)}`}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View PDF
                    </a>
                  )}
                  {sale.isReservation && (
                    <button
                      type="button"
                      onClick={() => cancelReservation(sale)}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 hover:bg-amber-100"
                    >
                      Cancel reservation
                    </button>
                  )}
                  {!sale.isReservation && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleEditSale(sale)}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteSale(sale)}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reserve Dummy Invoice Modal */}
      {showReserveReservationModal && (
        <div className="fixed inset-0 bg-gray-700/50 overflow-y-auto z-50">
          <div className="min-h-full flex items-start justify-center p-3 sm:p-4 md:pt-16">
            <div className="relative w-full max-w-lg p-4 sm:p-5 border shadow-xl rounded-xl bg-white">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reserve Dummy Invoice</h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="reserveInvoiceNumber" className="block text-xs font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    id="reserveInvoiceNumber"
                    type="text"
                    value={reserveInvoiceNumber}
                    onChange={(e) => setReserveInvoiceNumber(e.target.value)}
                    placeholder="e.g., C0001/2025-26"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Reserved invoices are placeholder slots and won&apos;t create any bill amount.</p>
                </div>

                <div>
                  <label htmlFor="reserveReason" className="block text-xs font-medium text-gray-700 mb-1">
                    Reason (optional)
                  </label>
                  <input
                    id="reserveReason"
                    type="text"
                    value={reserveReason}
                    onChange={(e) => setReserveReason(e.target.value)}
                    placeholder="e.g., Pending manual entry"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {reserveError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-md text-sm">
                    {reserveError}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => setShowReserveReservationModal(false)}
                    disabled={isReserving}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitReservation}
                    disabled={isReserving}
                    className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isReserving ? 'Reserving...' : 'Reserve'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Invoice Modal */}
      {emailInvoiceSale && !emailInvoiceSale.isReservation && (
        <div className="fixed inset-0 bg-gray-700/50 overflow-y-auto z-50">
          <div className="min-h-full flex items-start justify-center p-3 sm:p-4 md:pt-16">
            <div className="relative w-full max-w-lg p-4 sm:p-5 border shadow-xl rounded-xl bg-white">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Email Invoice PDF - {emailInvoiceSale.invoiceNumber}
              </h3>

              <div className="space-y-4">
                <div>
                  <label htmlFor="invoiceEmailTo" className="block text-xs font-medium text-gray-700 mb-1">
                    To (Email)
                  </label>
                  <input
                    id="invoiceEmailTo"
                    type="email"
                    value={emailInvoiceTo}
                    onChange={(e) => setEmailInvoiceTo(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="recipient@example.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">Default: trinityoilmills@gmail.com</p>
                </div>

                {emailInvoiceStatus && (
                  <div
                    className={`px-3 py-2 rounded-md text-sm border ${
                      emailInvoiceStatus.type === 'success'
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-red-50 border-red-200 text-red-700'
                    }`}
                  >
                    {emailInvoiceStatus.message}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeEmailInvoiceModal}
                    disabled={isEmailInvoiceSending}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={sendInvoicePdfEmail}
                    disabled={isEmailInvoiceSending}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isEmailInvoiceSending ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {showEditModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-700/50 overflow-y-auto z-50">
          <div className="min-h-full flex items-start justify-center p-3 sm:p-4 md:pt-8">
          <div className="relative w-full max-w-5xl p-3 sm:p-4 md:p-5 border shadow-xl rounded-xl bg-white max-h-[94vh] overflow-y-auto">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Edit Sale - {selectedSale.invoiceNumber}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {/* Invoice Number */}
                <div>
                  <label htmlFor="invoiceNumber" className="block text-xs font-medium text-gray-700 mb-1">
                    Invoice Number
                  </label>
                  <input
                    id="invoiceNumber"
                    type="text"
                    value={editForm.invoiceNumber}
                    onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., C0000056/2025"
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: C0001/2024-25 (FY) for canteen, R0001/2024-25 for retail. Legacy /2026 still accepted.</p>
                </div>

                {/* PO Number */}
                <div>
                  <label htmlFor="poNumber" className="block text-xs font-medium text-gray-700 mb-1">
                    PO Number (Customer Reference)
                  </label>
                  <input
                    id="poNumber"
                    type="text"
                    value={editForm.poNumber}
                    onChange={(e) => setEditForm({ ...editForm, poNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="e.g., PO-2025-001, REQ-123, 56-2025"
                  />
                  <p className="text-xs text-gray-500 mt-1">Customer's Purchase Order number</p>
                </div>

                {/* PO Date */}
                <div>
                  <label htmlFor="poDate" className="block text-xs font-medium text-gray-700 mb-1">
                    PO Date (Optional)
                  </label>
                  <input
                    id="poDate"
                    type="date"
                    value={editForm.poDate}
                    onChange={(e) => setEditForm({ ...editForm, poDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Purchase Order Date - appears as "Dated: [selected date]" on invoice</p>
                </div>

                {/* Invoice Date */}
                <div>
                  <label htmlFor="invoiceDate" className="block text-xs font-medium text-gray-700 mb-1">
                    Invoice Date (Optional)
                  </label>
                  <input
                    id="invoiceDate"
                    type="date"
                    value={editForm.invoiceDate}
                    onChange={(e) => setEditForm({ ...editForm, invoiceDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Invoice Date used when generating the invoice; defaults to created date if empty.</p>
                </div>

                {/* Mode of Sales */}
                <div>
                  <label htmlFor="modeOfSales" className="block text-xs font-medium text-gray-700 mb-1">
                    Mode of Sales
                  </label>
                  <select
                    id="modeOfSales"
                    value={editForm.modeOfSales}
                    onChange={(e) => {
                      setEditForm({ ...editForm, modeOfSales: e.target.value });
                      if (e.target.value !== 'email') {
                        setEditForm(prev => ({ ...prev, customerEmail: '' }));
                      }
                    }}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select mode...</option>
                    <option value="email">📧 Email Order</option>
                    <option value="phone">📞 Phone Order</option>
                    <option value="whatsapp">📱 WhatsApp Order</option>
                    <option value="walk_in">🚶 Walk-in Order</option>
                    <option value="online">💻 Online Order</option>
                  </select>
                  
                  {/* Email Input - Shows only when Email Order is selected */}
                  {editForm.modeOfSales === 'email' && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Customer Email Address
                      </label>
                      <input
                        type="email"
                        value={editForm.customerEmail}
                        onChange={(e) => setEditForm({ ...editForm, customerEmail: e.target.value })}
                        placeholder="customer@example.com"
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1">How the order was received</p>
                </div>

                {/* Customer/Canteen Selection */}
                <div className="md:col-span-2 xl:col-span-3">
                  <label htmlFor="canteenAddressId" className="block text-xs font-medium text-gray-700 mb-1">
                    {selectedSale?.saleType === 'canteen' ? 'Select Canteen' : 'Customer Name'}
                  </label>
                  {selectedSale?.saleType === 'canteen' ? (
                    <select
                      id="canteenAddressId"
                      value={editForm.canteenAddressId}
                      onChange={(e) => setEditForm({ ...editForm, canteenAddressId: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="">Choose canteen...</option>
                      {canteenAddresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.canteenName} - {address.contactPerson}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="customerName"
                      type="text"
                      value={editForm.customerName}
                      onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="Enter customer name..."
                    />
                  )}
                </div>

                {/* Kept on display (Canteen only) */}
                {selectedSale?.saleType === 'canteen' && (
                  <div>
                    <label htmlFor="keptOnDisplay" className="block text-xs font-medium text-gray-700 mb-1">
                      Kept on display
                    </label>
                    <select
                      id="keptOnDisplay"
                      value={editForm.keptOnDisplay ? 'yes' : 'no'}
                      onChange={(e) => setEditForm({ ...editForm, keptOnDisplay: e.target.value === 'yes' })}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Default is No.</p>
                  </div>
                )}

                {/* Mail sent HO date (Canteen only) */}
                {selectedSale?.saleType === 'canteen' && (
                  <div>
                    <label htmlFor="mailSentHoDate" className="block text-xs font-medium text-gray-700 mb-1">
                      Mail sent HO (Date)
                    </label>
                    <input
                      id="mailSentHoDate"
                      type="date"
                      value={(editForm as any).mailSentHoDate}
                      onChange={(e) => setEditForm({ ...(editForm as any), mailSentHoDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}

                    {/* Courier weig/rs (Canteen only) */}
                {selectedSale?.saleType === 'canteen' && (
                  <div>
                    <label htmlFor="courierWeightOrRs" className="block text-xs font-medium text-gray-700 mb-1">
                      Courier weig/rs
                    </label>
                    <input
                      id="courierWeightOrRs"
                      type="text"
                      value={(editForm as any).courierWeightOrRs}
                      onChange={(e) => setEditForm({ ...(editForm as any), courierWeightOrRs: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder='e.g. "12kg" or "₹450"'
                    />
                    <p className="text-xs text-gray-500 mt-1">You can type weight or amount.</p>
                  </div>
                )}

                {/* PDF attachment (Canteen only) */}
                {selectedSale?.saleType === 'canteen' && (
                  <div className="md:col-span-2 xl:col-span-3">
                    <label className="block text-sm font-bold text-gray-800 mb-2">
                      Attach Courier / Canteen Bill PDF (optional)
                    </label>
                    {selectedSale.referencePdfPath && !editReferencePdfFile && (
                      <div className="mb-2">
                        <a
                          href={`/api/uploads/inline?path=${encodeURIComponent(selectedSale.referencePdfPath)}`}
                          className="text-xs text-indigo-600 hover:text-indigo-900 font-medium underline"
                        >
                          View current PDF
                          {selectedSale.referencePdfOriginalName ? ` (${selectedSale.referencePdfOriginalName})` : ''}
                        </a>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0] || null;
                          setEditReferencePdfError('');
                          if (!f) {
                            setEditReferencePdfFile(null);
                            return;
                          }
                          const isPdf =
                            String(f.type || '').toLowerCase().includes('pdf') ||
                            String(f.name || '').toLowerCase().endsWith('.pdf');
                          if (!isPdf) {
                            setEditReferencePdfFile(null);
                            setEditReferencePdfError('Only PDF files are allowed');
                            return;
                          }
                          const maxBytes = 20 * 1024 * 1024;
                          if (typeof f.size === 'number' && f.size > maxBytes) {
                            setEditReferencePdfFile(null);
                            setEditReferencePdfError('PDF too large (max 20MB)');
                            return;
                          }
                          setEditReferencePdfFile(f);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm font-medium"
                      >
                        Browse...
                      </button>
                      {editReferencePdfFile ? (
                        <span className="text-xs text-gray-600">Selected: {editReferencePdfFile.name}</span>
                      ) : (
                        <span className="text-xs text-gray-500">No file selected</span>
                      )}
                    </div>
                    {selectedSale.referencePdfPath && (
                      <label className="mt-2 inline-flex items-center gap-2 text-xs text-gray-700">
                        <input
                          type="checkbox"
                          checked={removeExistingReferencePdf}
                          onChange={(e) => setRemoveExistingReferencePdf(e.target.checked)}
                        />
                        Remove current PDF on save
                      </label>
                    )}
                    {editReferencePdfError && (
                      <p className="text-xs text-red-600 mt-1">{editReferencePdfError}</p>
                    )}
                  </div>
                )}

                {/* Payment Method */}
                <div>
                  <label htmlFor="paymentMethod" className="block text-xs font-medium text-gray-700 mb-1">
                    Payment Method
                  </label>
                  {selectedSale?.saleType === 'canteen' ? (
                    <div className="space-y-2">
                      <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 text-orange-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                          </svg>
                          <span className="text-orange-800 font-medium">Auto Credit Payment</span>
                        </div>
                        <p className="text-sm text-orange-600 mt-1">
                          Canteen orders are automatically processed on credit terms
                        </p>
                      </div>
                      <select
                        id="paymentMethod"
                        value={editForm.paymentMethod}
                        onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="credit">Credit (Default)</option>
                        <option value="cash">Cash</option>
                        <option value="card">Card</option>
                        <option value="upi">UPI</option>
                      </select>
                    </div>
                  ) : (
                    <select
                      id="paymentMethod"
                      value={editForm.paymentMethod}
                      onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="upi">UPI</option>
                      <option value="credit">Credit</option>
                    </select>
                  )}
                </div>

                <div>
                  <label htmlFor="paymentStatus" className="block text-xs font-medium text-gray-700 mb-1">
                    Credit status
                  </label>
                  <select
                    id="paymentStatus"
                    value={editForm.paymentStatus}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        paymentStatus: e.target.value,
                        creditedDate: e.target.value === 'paid' ? editForm.creditedDate : '',
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Credited to account</option>
                    <option value="partial">Partial</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                {editForm.paymentStatus === 'paid' && (
                  <div>
                    <label htmlFor="creditedDate" className="block text-xs font-medium text-gray-700 mb-1">
                      Credited Date
                    </label>
                    <input
                      id="creditedDate"
                      type="date"
                      value={editForm.creditedDate}
                      onChange={(e) => setEditForm({ ...editForm, creditedDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Date when the credit was added to the account.</p>
                  </div>
                )}
                
                <div>
                  <label htmlFor="shipmentStatus" className="block text-xs font-medium text-gray-700 mb-1">
                    Shipment Status
                  </label>
                  <select
                    id="shipmentStatus"
                    value={editForm.shipmentStatus}
                    onChange={(e) => setEditForm({ ...editForm, shipmentStatus: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="courier">Courier</option>
                    <option value="walk_in_delivery">Walk in delivery</option>
                    <option value="pending">Pending</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div className="md:col-span-2 xl:col-span-3">
                  <label htmlFor="notes" className="block text-xs font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    rows={2}
                    placeholder="Add any notes about this sale..."
                  />
                </div>
              </div>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="sticky bottom-0 bg-white pt-4 mt-6 border-t flex justify-end space-x-3">
                <button
                  onClick={closeEditModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  disabled={isUpdating}
                >
                  Cancel
                </button>
                <button
                  onClick={updateSale}
                  disabled={isUpdating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Updating...' : 'Update Sale'}
                </button>
              </div>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* Delete Sale Modal */}
      {showDeleteModal && selectedSale && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Delete Sale - {selectedSale.invoiceNumber}
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Are you sure you want to delete this canteen sale? This action will:
                </p>
                <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
                  <li>Remove the sale record</li>
                  <li>Restore inventory quantities</li>
                  <li>Delete all associated sale items</li>
                </ul>
                <p className="text-sm font-medium text-red-600">
                  This action cannot be undone!
                </p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSale}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
