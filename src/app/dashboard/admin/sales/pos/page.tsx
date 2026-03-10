'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast, StatusBadge, LoadingSpinner } from '@/components/ui';
import { Card, Button } from '@/components/ui';

interface Product {
  id: string;
  name: string;
  category: string;
  type: string;
  basePrice: string;
  retailPrice: string;
  gstRate: string;
  unit: string;
  isActive: boolean;
}

interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  gstRate: number;
}

interface CanteenAddress {
  id: string;
  canteenName: string;
  address: string;
  contactPerson: string;
  mobileNumber: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstNumber?: string;
  billingEmail?: string | null;
  billingContactPerson?: string | null;
  billingMobile?: string | null;
   deliveryEmail?: string | null;
}

// Castor Oil 200ml: two billing codes, same product — one card, code selector (new default), full name everywhere
const CASTOR_200ML_OLD_CODE = '55336';
const CASTOR_200ML_NEW_CODE = '68539';
const CASTOR_200ML_DISPLAY_NAME = 'TOM-Castor Oil - 200ml';
const CASTOR_200ML_NEW_PRICE = 76.19; // GST-inclusive unit price for new code (68539)
const CASTOR_200ML_OLD_PRICE = 80;    // Keep old code at 80

function isCastor200mlById(p: Product): boolean {
  const id = String(p.id).trim();
  return id === CASTOR_200ML_OLD_CODE || id === CASTOR_200ML_NEW_CODE;
}

function isCastor200ml(p: Product): boolean {
  if (isCastor200mlById(p)) return true;
  const name = (p.name || '').toLowerCase();
  const unit = (p.unit || '').toLowerCase();
  return name.includes('castor') && (name.includes('200') || unit.includes('200ml'));
}

// Helper function to get product-specific icons
const getProductIcon = (product: Product): string => {
  const productName = product.name.toLowerCase();
  const productType = product.type.toLowerCase();

  // Oil-specific icons based on type and name
  if (productName.includes('groundnut') || productType.includes('ground')) {
    return '🥜'; // Peanut for groundnut oil
  }
  if (productName.includes('gingelly') || productName.includes('sesame') || productType.includes('gingelly')) {
    return '🌰'; // Chestnut for gingelly/sesame oil
  }
  if (productName.includes('coconut') || productType.includes('coconut')) {
    return '🥥'; // Coconut for coconut oil
  }
  if (productName.includes('deepam') || productType.includes('deepam')) {
    return '🪔'; // Oil lamp for deepam oil
  }
  if (productName.includes('castor') || productType.includes('castor')) {
    return '🌿'; // Herb for castor oil
  }
  
  // Size-specific bottle icons for oils
  if (productName.includes('oil')) {
    if (productName.includes('5l') || productName.includes('5 l')) {
      return '🍶'; // Large bottle for 5L
    }
    if (productName.includes('1l') || productName.includes('1 l')) {
      return '🫗'; // Pouring liquid for 1L
    }
    if (productName.includes('500ml')) {
      return '🧴'; // Bottle for 500ml
    }
    if (productName.includes('200ml')) {
      return '🧪'; // Small bottle for 200ml
    }
    return '🛢️'; // Default oil barrel
  }
  
  // Packaging items
  if (product.category === 'packaging') {
    return '📦';
  }
  
  // Default fallback
  return '🛢️';
};

// Helper function to get product-specific background gradients
const getProductBackground = (product: Product): string => {
  const productName = product.name.toLowerCase();
  const productType = product.type.toLowerCase();

  // Oil-specific background colors
  if (productName.includes('groundnut') || productType.includes('ground')) {
    return 'bg-gradient-to-br from-amber-100 to-amber-200'; // Golden brown for groundnut
  }
  if (productName.includes('gingelly') || productName.includes('sesame') || productType.includes('gingelly')) {
    return 'bg-gradient-to-br from-yellow-100 to-yellow-200'; // Light golden for sesame
  }
  if (productName.includes('coconut') || productType.includes('coconut')) {
    return 'bg-gradient-to-br from-blue-100 to-blue-200'; // Light blue for coconut
  }
  if (productName.includes('deepam') || productType.includes('deepam')) {
    return 'bg-gradient-to-br from-orange-100 to-orange-200'; // Orange for deepam
  }
  if (productName.includes('castor') || productType.includes('castor')) {
    return 'bg-gradient-to-br from-purple-100 to-purple-200'; // Purple for castor
  }
  
  // Packaging items
  if (product.category === 'packaging') {
    return 'bg-gradient-to-br from-gray-100 to-gray-200';
  }
  
  // Default green gradient
  return 'bg-gradient-to-br from-green-100 to-green-200';
};

// Current financial year for PO (e.g. "24-25" for Apr 2024–Mar 2025)
function getCurrentFY(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = d.getMonth();
  if (m >= 3) return `${String(y).slice(-2)}-${String(y + 1).slice(-2)}`;
  return `${String(y - 1).slice(-2)}-${String(y).slice(-2)}`;
}

function getPoYearOptions(): string[] {
  const current = getCurrentFY();
  const [a] = current.split('-').map(Number);
  const list: string[] = [];
  const start = Math.max(0, a - 5); // past 5 years
  const end = 29; // up to 29-30 (FY ending March 2030)
  for (let y1 = start; y1 <= end; y1++) {
    const y2 = y1 + 1;
    list.push(`${String(y1).padStart(2, '0')}-${String(y2).padStart(2, '0')}`);
  }
  return list;
}

const PO_YEAR_OPTIONS = getPoYearOptions();

export default function POSPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [canteenAddresses, setCanteenAddresses] = useState<CanteenAddress[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<'retail' | 'canteen'>('retail');
  const [gstMode, setGstMode] = useState<'included' | 'excluded'>('excluded');
  const [selectedCanteen, setSelectedCanteen] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [poNumberValue, setPoNumberValue] = useState(''); // User types just the number
  const [poYear, setPoYear] = useState(getCurrentFY); // lazy init e.g. "24-25"
  const [poDate, setPoDate] = useState(() => new Date().toISOString().slice(0, 10)); // Required; default today
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10)); // Invoice date; default today
  const [modeOfSales, setModeOfSales] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customInvoiceNum, setCustomInvoiceNum] = useState(''); // 4-digit number when editing
  const [customInvoiceYear, setCustomInvoiceYear] = useState(() => new Date().getFullYear().toString());
  const [showInvoiceEdit, setShowInvoiceEdit] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState('2025');
  const [editingQuantity, setEditingQuantity] = useState<Record<string, string>>({});
  const [castor200mlBillingCode, setCastor200mlBillingCode] = useState<string>(CASTOR_200ML_NEW_CODE); // default new code
  const { addToast, ToastContainer } = useToast();

  // Set mounted and current year
  useEffect(() => {
    setMounted(true);
    setCurrentYear(new Date().getFullYear().toString());
  }, []);

  // Prevent Backspace from triggering browser back (better UX: don't close/navigate away from cart)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Backspace') return;
      const target = e.target as HTMLElement;
      const tagName = target.tagName?.toLowerCase();
      const isEditable =
        tagName === 'input' ||
        tagName === 'textarea' ||
        target.isContentEditable;
      if (isEditable) return; // Let Backspace work normally in inputs
      e.preventDefault(); // Stop Backspace from navigating back
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Authentication check
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

  // Detect sale type from URL parameters and set appropriate payment method and mode of sales
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const typeParam = urlParams.get('type');
      if (typeParam === 'canteen') {
        setSaleType('canteen');
        setPaymentMethod('credit'); // Canteens use auto credit payment
        setModeOfSales('email'); // Default email for canteen sales
        setGstMode('excluded'); // Default GST mode: GST extra (excluded from unit price)
      } else {
        setSaleType('retail');
        setPaymentMethod('cash'); // Default cash for retail
        setModeOfSales('walk_in'); // Default walk-in for retail sales
        setGstMode('excluded'); // Default GST mode: GST extra (excluded from unit price)
      }
    }
  }, [mounted]);

  // Update payment method and mode of sales when sale type changes
  useEffect(() => {
    if (saleType === 'canteen') {
      setPaymentMethod('credit'); // Auto credit for canteens
      setModeOfSales('email'); // Default email for canteen sales
      setGstMode((prev) => prev || 'excluded'); // Default GST mode: GST extra
    } else {
      setPaymentMethod('cash'); // Default cash for retail
      setModeOfSales('walk_in'); // Default walk-in for retail sales
      setGstMode((prev) => prev || 'excluded'); // Default GST mode: GST extra
    }
  }, [saleType]);

  // Fetch data
  useEffect(() => {
    if (session?.user) {
      fetchProducts();
      fetchCanteenAddresses();
    }
  }, [session]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      const data = await response.json();
      // Filter out raw materials - only show products for sale (produced and purchased oils)
      setProducts(data.products?.filter((p: Product) => p.isActive && p.category !== 'raw_material') || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products');
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

  // Castor 200ml: always use selected billing code (55336 or 68539) for cart/API
  const getProductIdForCart = (product: Product): string => {
    if (isCastor200ml(product)) return castor200mlBillingCode;
    return product.id;
  };

  // Cart management
  const addToCart = (product: Product, forceProductId?: string) => {
    const productId = forceProductId ?? getProductIdForCart(product);
    let price: number;
    if (isCastor200ml(product)) {
      // Special pricing for Castor 200ml:
      // - New code 68539 must always be 76.19 (as per requirement)
      // - Old code 55336 stays at 80
      price = productId === CASTOR_200ML_NEW_CODE ? CASTOR_200ML_NEW_PRICE : CASTOR_200ML_OLD_PRICE;
    } else {
      price =
        gstMode === 'included'
          ? parseFloat(product.retailPrice)
          : parseFloat(product.basePrice);
    }
    const existingItem = cart.find(item => item.productId === productId);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const itemName = isCastor200ml(product) ? CASTOR_200ML_DISPLAY_NAME : product.name;
      setCart([...cart, {
        productId,
        name: itemName,
        price,
        quantity: 1,
        unit: product.unit,
        gstRate: parseFloat(product.gstRate)
      }]);
    }

    const successName = isCastor200ml(product) ? CASTOR_200ML_DISPLAY_NAME : product.name;
    setSuccess(`${successName} added to cart!`);
    setTimeout(() => setSuccess(''), 2000);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.productId !== productId));
    } else {
      setCart(cart.map(item => 
        item.productId === productId 
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
    setEditingQuantity(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const changeCastorCodeInCart = (currentProductId: string, newCode: string) => {
    if (newCode === currentProductId) return;
    setCart(cart.map(item => {
      if (item.productId !== currentProductId) return item;
      const newPrice = newCode === CASTOR_200ML_NEW_CODE ? CASTOR_200ML_NEW_PRICE : CASTOR_200ML_OLD_PRICE;
      return { ...item, productId: newCode, price: newPrice };
    }));
    setEditingQuantity(prev => {
      const next = { ...prev };
      if (next[currentProductId] !== undefined) {
        next[newCode] = next[currentProductId];
        delete next[currentProductId];
      }
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
    setSuccess('Cart cleared!');
    setTimeout(() => setSuccess(''), 2000);
  };

  // Calculations
  const calculateTotals = () => {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gstAmount = cart.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      const gst = gstMode === 'included'
        ? (itemTotal * item.gstRate / (100 + item.gstRate)) // GST from inclusive price
        : (itemTotal * item.gstRate / 100); // GST on exclusive price
      return sum + gst;
    }, 0);
    
    const total = gstMode === 'included' ? subtotal : subtotal + gstAmount;
    
    return {
      subtotal: gstMode === 'included' ? subtotal - gstAmount : subtotal,
      gstAmount,
      total
    };
  };

  // Format validation helpers
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((email || '').trim());
  const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test((d || '').trim()) && !Number.isNaN(Date.parse(d));

  // Process sale
  const processSale = async () => {
    setError('');
    if (cart.length === 0) {
      const msg = 'Please add items to cart';
      setError(msg);
      addToast(msg, 'error');
      return;
    }

    if (saleType === 'canteen' && !selectedCanteen) {
      const msg = 'Please select a canteen address';
      setError(msg);
      addToast(msg, 'error');
      return;
    }

    if (!poDate || !poDate.trim()) {
      const msg = 'Please select PO Date';
      setError(msg);
      addToast(msg, 'error');
      return;
    }
    if (!isValidDate(poDate.trim())) {
      const msg = 'PO Date must be a valid date (YYYY-MM-DD)';
      setError(msg);
      addToast(msg, 'error');
      return;
    }

    if (!poNumberValue || !poNumberValue.trim()) {
      const msg = 'Please enter PO Number (Customer Reference)';
      setError(msg);
      addToast(msg, 'error');
      return;
    }
    if (!/^\d{1,10}$/.test(poNumberValue.trim())) {
      const msg = 'PO Number must be 1–10 digits only';
      setError(msg);
      addToast(msg, 'error');
      return;
    }

    if (invoiceDate && invoiceDate.trim() && !isValidDate(invoiceDate.trim())) {
      const msg = 'Invoice Date must be a valid date (YYYY-MM-DD)';
      setError(msg);
      addToast(msg, 'error');
      return;
    }

    if (saleType === 'canteen' && modeOfSales === 'email') {
      if (!customerEmail || !customerEmail.trim()) {
        const msg = 'Please enter customer email for email orders';
        setError(msg);
        addToast(msg, 'error');
        return;
      }
      if (!isValidEmail(customerEmail)) {
        const msg = 'Please enter a valid email address';
        setError(msg);
        addToast(msg, 'error');
        return;
      }
    }

    if (showInvoiceEdit && customInvoiceNum.trim()) {
      const num = customInvoiceNum.replace(/\D/g, '');
      if (num.length === 0 || num.length > 4) {
        const msg = 'Custom invoice number must be 1–4 digits (e.g. 1 or 0001)';
        setError(msg);
        addToast(msg, 'error');
        return;
      }
    }

    setIsSaving(true);

    try {
      const { subtotal, gstAmount, total } = calculateTotals();
      
      const saleData = {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.price
        })),
        saleType,
        subtotal,
        gstAmount,
        totalAmount: total,
        gstMode,
        paymentMethod,
        customerName: customerName || 'Walk-in Customer',
        canteenAddressId: saleType === 'canteen' ? selectedCanteen : null,
        poNumber: (poNumberValue.trim() && poYear) ? `PO-${poNumberValue.trim()} / ${poYear}` : null,
        poDate: poDate.trim() || null, // Main date for invoice (required)
        invoiceDate: invoiceDate.trim() || new Date().toISOString().slice(0, 10), // Invoice date (default today)
        modeOfSales: modeOfSales === 'email' && customerEmail ? `email:${customerEmail}` : modeOfSales || null, // Mode of sales with email if applicable
        customInvoiceNumber: (showInvoiceEdit && customInvoiceNum.trim()) ? `${saleType === 'canteen' ? 'C' : 'R'}${customInvoiceNum.replace(/\D/g, '').padStart(4, '0').slice(0, 4)}/${customInvoiceYear}` : null,
        customerEmail: customerEmail || null
      };

      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saleData)
      });

      const result = await response.json();

      if (response.ok) {
        addToast(`🎉 Sale completed! Invoice: ${result.sale?.invoiceNumber || 'Generated'}`, 'success');
        setCart([]);
        setCustomerName('');
        setSelectedCanteen('');
        setPoNumberValue('');
        setPoYear(getCurrentFY());
        setPoDate(new Date().toISOString().slice(0, 10));
        setInvoiceDate(new Date().toISOString().slice(0, 10));
        setModeOfSales('');
        setCustomerEmail('');
        setCustomInvoiceNum('');
        setCustomInvoiceYear(new Date().getFullYear().toString());
        setShowInvoiceEdit(false);
        setTimeout(() => {
          router.push('/dashboard/admin/sales');
        }, 2000);
      } else {
        addToast(result.error || 'Failed to process sale', 'error');
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      addToast('Network error. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', ...Array.from(new Set(products.map(p => p.category)))];

  // One card for Castor Oil 200ml: show new code (68539) only, hide old (55336) when both exist
  const hasCastorNew = filteredProducts.some(p => String(p.id).trim() === CASTOR_200ML_NEW_CODE);
  const displayProducts = hasCastorNew
    ? filteredProducts.filter(p => String(p.id).trim() !== CASTOR_200ML_OLD_CODE)
    : filteredProducts;

  const { subtotal, gstAmount, total } = calculateTotals();

  if (status === 'loading' || isLoading || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading POS System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between h-auto md:h-16 py-4 md:py-0">
            <div className="flex items-center flex-wrap gap-4">
              <h1 className="text-2xl font-bold text-gray-900">🛒 Point of Sale</h1>
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSaleType('retail')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    saleType === 'retail'
                      ? 'bg-green-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🏪 Retail
                </button>
                <button
                  onClick={() => setSaleType('canteen')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    saleType === 'canteen'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  🏢 Canteen
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap md:justify-end">
              <span className="text-sm text-gray-600">Welcome, {session?.user?.name}</span>
              <Link
                href="/dashboard/admin/sales"
                className="w-full sm:w-auto text-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                View All Sales
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="🔍 Search products..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                  />
                </div>
                <div className="sm:w-48">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>
                        {cat === 'all' ? '📦 All Products' : `🛢️ ${cat.charAt(0).toUpperCase() + cat.slice(1)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayProducts.map((product) => {
                const price = saleType === 'retail' ? parseFloat(product.retailPrice) : parseFloat(product.basePrice);
                const isCastor = isCastor200ml(product);
                const inCart = isCastor
                  ? cart.find(item => item.productId === CASTOR_200ML_OLD_CODE || item.productId === CASTOR_200ML_NEW_CODE)
                  : cart.find(item => item.productId === product.id);
                const cartProductId = inCart ? inCart.productId : getProductIdForCart(product);
                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                  >
                    {/* Product Image with Oil-Specific Icons */}
                    <div className={`h-32 flex items-center justify-center ${getProductBackground(product)}`}>
                      <div className="text-5xl">
                        {getProductIcon(product)}
                      </div>
                    </div>
                    
                    {/* Product Details */}
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {isCastor ? CASTOR_200ML_DISPLAY_NAME : product.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {isCastor ? `200ml • Code ${castor200mlBillingCode}` : `${product.type.replace('_', ' ').toUpperCase()} • ${product.unit}`}
                      </p>

                      {/* Billing code: always show for Castor Oil 200ml (by name or id) */}
                      {isCastor && (
                        <div className="mb-2">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Billing code</label>
                          <select
                            value={castor200mlBillingCode}
                            onChange={(e) => setCastor200mlBillingCode(e.target.value)}
                            disabled={!!inCart}
                            className="w-full text-sm px-2 py-1.5 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-600"
                          >
                            <option value={CASTOR_200ML_NEW_CODE}>{CASTOR_200ML_NEW_CODE} (new)</option>
                            <option value={CASTOR_200ML_OLD_CODE}>{CASTOR_200ML_OLD_CODE} (old)</option>
                          </select>
                          {inCart && <p className="text-xs text-gray-500 mt-0.5">Change code in cart below</p>}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="text-2xl font-bold text-green-600">₹{price}</span>
                          <span className="text-sm text-gray-500">/{product.unit}</span>
                        </div>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          GST {product.gstRate}%
                        </span>
                      </div>

                      {/* Add to Cart Button - Enhanced for Mobile */}
                      {inCart ? (
                        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                          <button
                            onClick={() => updateQuantity(cartProductId, Math.max(0, Math.round(inCart.quantity) - 1))}
                            className="w-10 h-10 flex items-center justify-center bg-white border border-green-300 rounded-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-110 active:scale-95 touch-manipulation"
                          >
                            <span className="text-green-600 font-bold text-lg">−</span>
                          </button>
                          <div className="text-center">
                            <div className="font-bold text-green-800 text-lg">{Math.round(inCart.quantity)}</div>
                            <div className="text-xs text-green-600">in cart</div>
                          </div>
                          <button
                            onClick={() => updateQuantity(cartProductId, Math.round(inCart.quantity) + 1)}
                            className="w-10 h-10 flex items-center justify-center bg-white border border-green-300 rounded-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-110 active:scale-95 touch-manipulation"
                          >
                            <span className="text-green-600 font-bold text-lg">+</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(product)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg min-h-[48px] touch-manipulation"
                        >
                          <div className="flex items-center justify-center space-x-2">
                            <span>🛒</span>
                            <span>Add to Cart</span>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {displayProducts.length === 0 && (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-600">Try adjusting your search or category filter</p>
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="space-y-6">
            {/* Cart Header */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">🛒 Cart ({cart.length})</h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Cart Items */}
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🛒</div>
                  <p className="text-gray-500">Your cart is empty</p>
                  <p className="text-sm text-gray-400">Add products to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => {
                    const isCastor = item.productId === CASTOR_200ML_OLD_CODE || item.productId === CASTOR_200ML_NEW_CODE;
                    const displayName = isCastor ? `${CASTOR_200ML_DISPLAY_NAME} (${item.productId})` : item.name;
                    return (
                    <div key={item.productId} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 text-sm truncate" title={displayName}>{displayName}</h4>
                          {isCastor && (
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-xs text-gray-600 shrink-0">Code:</span>
                              <select
                                value={item.productId}
                                onChange={(e) => changeCastorCodeInCart(item.productId, e.target.value)}
                                className="text-xs px-1.5 py-0.5 border border-gray-300 rounded max-w-[6rem] focus:ring-1 focus:ring-green-500 focus:border-green-500"
                              >
                                <option value={CASTOR_200ML_NEW_CODE}>{CASTOR_200ML_NEW_CODE} (new)</option>
                                <option value={CASTOR_200ML_OLD_CODE}>{CASTOR_200ML_OLD_CODE} (old)</option>
                              </select>
                            </div>
                          )}
                          <p className="text-sm text-gray-600 mt-0.5">₹{item.price} × {item.quantity}</p>
                        </div>
                        <div className="flex items-center space-x-1 shrink-0">
                        <button
                          onClick={() => updateQuantity(item.productId, Math.max(0, Math.round(item.quantity) - 1))}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={editingQuantity[item.productId] !== undefined ? editingQuantity[item.productId] : item.quantity}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const num = parseFloat(raw);
                            if (raw === '' || raw === '-' || Number.isNaN(num)) {
                              setEditingQuantity(prev => ({ ...prev, [item.productId]: raw }));
                              return;
                            }
                            if (num <= 0) {
                              setEditingQuantity(prev => ({ ...prev, [item.productId]: raw }));
                              return;
                            }
                            updateQuantity(item.productId, num);
                          }}
                          onBlur={(e) => {
                            const raw = e.target.value;
                            const num = parseFloat(raw);
                            if (raw === '' || Number.isNaN(num) || num <= 0) {
                              updateQuantity(item.productId, 1);
                            }
                          }}
                          min="1"
                          step="1"
                          className="w-16 text-center font-medium border border-gray-300 rounded px-1 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <button
                          onClick={() => updateQuantity(item.productId, Math.round(item.quantity) + 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                        >
                          +
                        </button>
                        <span className="w-14 text-right font-semibold text-gray-900 text-sm">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Customer Details - always show so cart doesn't "close" when empty */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Customer Details</h3>
                
                {saleType === 'canteen' ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Canteen *
                    </label>
                    <select
                      value={selectedCanteen}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedCanteen(id);
                        const addr = canteenAddresses.find((a) => a.id === id);
                        // Prefer delivery email for mode-of-order; fall back to billing email
                        if (addr) {
                          const primary = (addr.deliveryEmail || addr.billingEmail || '').trim();
                          setCustomerEmail(primary);
                        } else if (!id) {
                          setCustomerEmail('');
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      required
                    >
                      <option value="">Choose canteen...</option>
                      {canteenAddresses.map((address) => (
                        <option key={address.id} value={address.id}>
                          {address.canteenName} - {address.contactPerson}
                        </option>
                      ))}
                    </select>

                    {selectedCanteen && (() => {
                      const addr = canteenAddresses.find(a => a.id === selectedCanteen);
                      if (!addr) return null;
                      return (
                        <div className="mt-2 text-xs text-gray-600 space-y-1">
                          <div>
                            <span className="font-semibold">Billing Email:</span>{' '}
                            {addr.billingEmail?.trim() || '—'}
                          </div>
                          <div>
                            <span className="font-semibold">Delivery Email:</span>{' '}
                            {addr.deliveryEmail?.trim() || '—'}
                          </div>
                        </div>
                      );
                    })()}
                    
                    {/* PO Number Field for Canteen Sales */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          PO Number (Customer Reference) <span className="text-red-500">*</span>
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-gray-600 font-medium">PO-</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={poNumberValue}
                          onChange={(e) => setPoNumberValue(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="Number"
                          className="flex-1 min-w-[80px] max-w-[120px] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <span className="text-gray-600 font-medium">/</span>
                        <select
                          value={poYear}
                          onChange={(e) => setPoYear(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                        >
                          {PO_YEAR_OPTIONS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Customer&apos;s Purchase Order</strong> — appears as &quot;PO NO: PO-{poNumberValue || '…'} / {poYear}&quot; on the invoice
                      </p>
                    </div>

                    {/* PO Date - main date for invoice (required) */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          PO Date <span className="text-red-500">*</span>
                        </label>
                      </div>
                      <input
                        type="date"
                        required
                        value={poDate}
                        onChange={(e) => setPoDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Purchase Order Date</strong> — This is the main date saved and shown as &quot;Dated&quot; on the invoice.
                      </p>
                    </div>

                    {/* Invoice Date - default today */}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invoice Date
                      </label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Date shown as &quot;Invoice Date&quot; on the invoice. Defaults to today.
                      </p>
                    </div>

                    {/* Mode of Sales Field for Canteen Sales */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Mode of Sales
                        </label>
                      </div>
                      <select
                        value={modeOfSales}
                        onChange={(e) => {
                          setModeOfSales(e.target.value);
                          if (e.target.value !== 'email') {
                            setCustomerEmail(''); // Clear email if not email mode
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="email">📧 Email Order (Default)</option>
                        <option value="phone">📞 Phone Order</option>
                        <option value="whatsapp">📱 WhatsApp Order</option>
                        <option value="walk_in">🚶 Walk-in Order</option>
                        <option value="online">💻 Online Order</option>
                      </select>
                      
                      {/* Receiving Person Email ID - required for canteen email orders */}
                      {modeOfSales === 'email' && (
                        <>
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Receiving Person Email ID <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              value={customerEmail}
                              onChange={(e) => setCustomerEmail(e.target.value)}
                              placeholder="receiving.person@canteen.com"
                              required={modeOfSales === 'email'}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              This will be used as the email under <strong>Mode of Order</strong> on the invoice.
                            </p>
                          </div>

                          {/* Billing Person Email ID - optional informative field */}
                          {selectedCanteen && (
                            <div className="mt-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Billing Person Email ID (optional)
                              </label>
                              {(() => {
                                const addr = canteenAddresses.find(a => a.id === selectedCanteen);
                                const billing = (addr?.billingEmail || '').trim();
                                return (
                                  <input
                                    type="email"
                                    value={billing}
                                    readOnly
                                    disabled={!billing}
                                    placeholder={billing ? '' : 'Not set in canteen master'}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-600"
                                  />
                                );
                              })()}
                              <p className="text-xs text-gray-500 mt-1">
                                Pulled from the canteen master Billing Email. This is **not** mandatory.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>How the order was received</strong> - This will appear in "Mode of Order" column on the invoice
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Customer Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer name..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    
                    {/* PO Number Field for Retail Sales too */}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PO Number (Customer Reference) <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-gray-600 font-medium">PO-</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={poNumberValue}
                          onChange={(e) => setPoNumberValue(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="Number"
                          className="flex-1 min-w-[80px] max-w-[120px] px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <span className="text-gray-600 font-medium">/</span>
                        <select
                          value={poYear}
                          onChange={(e) => setPoYear(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                        >
                          {PO_YEAR_OPTIONS.map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Customer&apos;s Purchase Order</strong> — appears as &quot;PO NO: PO-{poNumberValue || '…'} / {poYear}&quot; on the invoice
                      </p>
                    </div>

                    {/* PO Date - main date for invoice (required) */}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PO Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={poDate}
                        onChange={(e) => setPoDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Purchase Order Date</strong> — This is the main date saved and shown as &quot;Dated&quot; on the invoice.
                      </p>
                    </div>

                    {/* Invoice Date - default today (Retail) */}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invoice Date
                      </label>
                      <input
                        type="date"
                        value={invoiceDate}
                        onChange={(e) => setInvoiceDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Date shown as &quot;Invoice Date&quot; on the invoice. Defaults to today.
                      </p>
                    </div>

                    {/* Mode of Sales Field for Retail Sales too */}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Mode of Sales
                      </label>
                      <select
                        value={modeOfSales}
                        onChange={(e) => {
                          setModeOfSales(e.target.value);
                          if (e.target.value !== 'email') {
                            setCustomerEmail(''); // Clear email if not email mode
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      >
                        <option value="walk_in">🚶 Walk-in Order (Default)</option>
                        <option value="email">📧 Email Order</option>
                        <option value="phone">📞 Phone Order</option>
                        <option value="whatsapp">📱 WhatsApp Order</option>
                        <option value="online">💻 Online Order</option>
                      </select>
                      
                      {/* Email Input - Shows only when Email Order is selected */}
                      {modeOfSales === 'email' && (
                        <div className="mt-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Customer Email Address
                          </label>
                          <input
                            type="email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            placeholder="customer@example.com"
                            required={modeOfSales === 'email'}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Email address where the order was received
                          </p>
                        </div>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>How the order was received</strong> - This will appear in "Mode of Order" column on the invoice
                      </p>
                    </div>
                  </div>
                )}

                {saleType === 'canteen' ? (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
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
                  </div>
                ) : (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['cash', 'card', 'upi'].map((method) => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                            paymentMethod === method
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {method === 'cash' && '💵'} 
                          {method === 'card' && '💳'} 
                          {method === 'upi' && '📱'} 
                          {method.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invoice Number Section */}
                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Invoice Number <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowInvoiceEdit(!showInvoiceEdit)}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      {showInvoiceEdit ? 'Use Auto-Generated' : 'Edit Invoice Number'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">
                    <strong>Note:</strong> Invoice Number is different from PO Number above
                  </p>
                  
                  {showInvoiceEdit ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-gray-600 font-medium">{saleType === 'canteen' ? 'C' : 'R'}</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={customInvoiceNum}
                          onChange={(e) => setCustomInvoiceNum(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="0001"
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <span className="text-gray-600 font-medium">/</span>
                        <select
                          value={customInvoiceYear}
                          onChange={(e) => setCustomInvoiceYear(e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white"
                        >
                          {Array.from({ length: 11 }, (_, i) => 2020 + i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>
                      </div>
                      <p className="text-xs text-gray-500">
                        4-digit number + year. Example: {saleType === 'canteen' ? 'C' : 'R'}{(customInvoiceNum.replace(/\D/g, '') || '1').padStart(4, '0').slice(0, 4)}/{customInvoiceYear}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-md p-3">
                      <div className="flex items-center">
                        <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-green-800 font-medium">Auto-Generated Invoice Number</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        Invoice number will be automatically generated in format: {saleType === 'canteen' ? 'C' : 'R'}0001/{currentYear}
                      </p>
                    </div>
                  )}
                </div>
              </div>

            {/* Bill Summary */}
            {cart.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📄 Bill Summary</h3>
                
                {/* GST Mode Toggle */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Calculation Method
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGstMode('included')}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border ${
                        gstMode === 'included'
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      GST Included in item price
                    </button>
                    <button
                      type="button"
                      onClick={() => setGstMode('excluded')}
                      className={`flex-1 px-3 py-2 rounded-md text-sm font-medium border ${
                        gstMode === 'excluded'
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                      }`}
                    >
                      GST Extra (add on top)
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Use <span className="font-semibold">GST Included</span> when product price already has GST inside. Use{' '}
                    <span className="font-semibold">GST Extra</span> when unit price is without GST and GST should be added separately.
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">
                      GST ({gstMode === 'included' ? 'included in item price' : 'added separately'}):
                    </span>
                    <span className="font-medium">₹{gstAmount.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-2xl font-bold text-green-600">₹{total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={processSale}
                  disabled={isSaving || cart.length === 0}
                  className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-5 px-6 rounded-xl font-bold text-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:transform-none shadow-lg hover:shadow-xl min-h-[60px] touch-manipulation"
                >
                  {isSaving ? (
                    <div className="flex items-center justify-center">
                      <LoadingSpinner size="sm" color="gray" />
                      <span className="ml-2">Processing Sale...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center space-x-2">
                      <span className="text-xl">💳</span>
                      <span>Process Sale</span>
                      <span className="text-xl font-bold">₹{total.toFixed(2)}</span>
                    </div>
                  )}
                </button>
              </div>
            )}

            {/* Empty Cart Message */}
            {cart.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="text-6xl mb-4">🛒</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ready to make a sale?</h3>
                <p className="text-gray-600 mb-4">Select products from the catalog to add them to your cart</p>
                <div className="flex justify-center space-x-2 text-sm text-gray-500">
                  <span>💡 Tip:</span>
                  <span>Use search or categories to find products quickly</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Toast Container */}
      <ToastContainer />
    </div>
  );
}

