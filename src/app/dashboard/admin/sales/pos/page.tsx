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

export default function POSPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [canteenAddresses, setCanteenAddresses] = useState<CanteenAddress[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [saleType, setSaleType] = useState<'retail' | 'canteen'>('retail');
  const [selectedCanteen, setSelectedCanteen] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [poDate, setPoDate] = useState('');
  const [modeOfSales, setModeOfSales] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customInvoiceNumber, setCustomInvoiceNumber] = useState('');
  const [showInvoiceEdit, setShowInvoiceEdit] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentYear, setCurrentYear] = useState('2025');
  const { addToast, ToastContainer } = useToast();

  // Set mounted and current year
  useEffect(() => {
    setMounted(true);
    setCurrentYear(new Date().getFullYear().toString());
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
      } else {
        setSaleType('retail');
        setPaymentMethod('cash'); // Default cash for retail
        setModeOfSales('walk_in'); // Default walk-in for retail sales
      }
    }
  }, [mounted]);

  // Update payment method and mode of sales when sale type changes
  useEffect(() => {
    if (saleType === 'canteen') {
      setPaymentMethod('credit'); // Auto credit for canteens
      setModeOfSales('email'); // Default email for canteen sales
    } else {
      setPaymentMethod('cash'); // Default cash for retail
      setModeOfSales('walk_in'); // Default walk-in for retail sales
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

  // Cart management
  const addToCart = (product: Product) => {
    const price = saleType === 'retail' ? parseFloat(product.retailPrice) : parseFloat(product.basePrice);
    const existingItem = cart.find(item => item.productId === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.productId === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        productId: product.id,
        name: product.name,
        price,
        quantity: 1,
        unit: product.unit,
        gstRate: parseFloat(product.gstRate)
      }]);
    }

    // Visual feedback
    setSuccess(`${product.name} added to cart!`);
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
      const gst = saleType === 'retail' 
        ? (itemTotal * item.gstRate / (100 + item.gstRate)) // GST from inclusive price
        : (itemTotal * item.gstRate / 100); // GST on exclusive price
      return sum + gst;
    }, 0);
    
    const total = saleType === 'retail' ? subtotal : subtotal + gstAmount;
    
    return {
      subtotal: saleType === 'retail' ? subtotal - gstAmount : subtotal,
      gstAmount,
      total
    };
  };

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      setError('Please add items to cart');
      return;
    }

    if (saleType === 'canteen' && !selectedCanteen) {
      setError('Please select a canteen address');
      return;
    }

    setIsSaving(true);
    setError('');

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
        paymentMethod,
        customerName: customerName || 'Walk-in Customer',
        canteenAddressId: saleType === 'canteen' ? selectedCanteen : null,
        poNumber: poNumber || null, // PO number available for both retail and canteen
        poDate: poDate || null, // PO date selected by user
        modeOfSales: modeOfSales === 'email' && customerEmail ? `email:${customerEmail}` : modeOfSales || null, // Mode of sales with email if applicable
        customInvoiceNumber: customInvoiceNumber || null,
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
        setPoNumber('');
        setPoDate('');
        setModeOfSales('');
        setCustomerEmail('');
        setCustomInvoiceNumber('');
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
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
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
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Welcome, {session?.user?.name}</span>
              <Link
                href="/dashboard/admin/sales"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
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
              {filteredProducts.map((product) => {
                const price = saleType === 'retail' ? parseFloat(product.retailPrice) : parseFloat(product.basePrice);
                const inCart = cart.find(item => item.productId === product.id);
                
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
                      <h3 className="font-semibold text-gray-900 mb-1">{product.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {product.type.replace('_', ' ').toUpperCase()} • {product.unit}
                      </p>
                      
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
                            onClick={() => updateQuantity(product.id, inCart.quantity - 1)}
                            className="w-10 h-10 flex items-center justify-center bg-white border border-green-300 rounded-lg hover:bg-gray-50 transition-all duration-200 transform hover:scale-110 active:scale-95 touch-manipulation"
                          >
                            <span className="text-green-600 font-bold text-lg">−</span>
                          </button>
                          <div className="text-center">
                            <div className="font-bold text-green-800 text-lg">{inCart.quantity}</div>
                            <div className="text-xs text-green-600">in cart</div>
                          </div>
                          <button
                            onClick={() => updateQuantity(product.id, inCart.quantity + 1)}
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

            {filteredProducts.length === 0 && (
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
                  {cart.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                        <p className="text-sm text-gray-600">₹{item.price} × {item.quantity}</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => {
                            const newQuantity = parseFloat(e.target.value) || 0;
                            if (newQuantity >= 0) {
                              updateQuantity(item.productId, newQuantity);
                            }
                          }}
                          onBlur={(e) => {
                            // Ensure minimum quantity of 0.1 if not zero
                            const value = parseFloat(e.target.value) || 0;
                            if (value > 0 && value < 0.1) {
                              updateQuantity(item.productId, 0.1);
                            }
                          }}
                          min="0"
                          step="0.1"
                          className="w-16 text-center font-medium border border-gray-300 rounded px-1 py-1 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center bg-white border border-gray-300 rounded text-gray-600 hover:bg-gray-50"
                        >
                          +
                        </button>
                        <span className="w-16 text-right font-semibold text-gray-900">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer Details */}
            {cart.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">👤 Customer Details</h3>
                
                {saleType === 'canteen' ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Canteen *
                    </label>
                    <select
                      value={selectedCanteen}
                      onChange={(e) => setSelectedCanteen(e.target.value)}
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
                    
                    {/* PO Number Field for Canteen Sales */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          PO Number (Customer Reference)
                        </label>
                      </div>
                      <input
                        type="text"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        placeholder="e.g., PO-2025-001, REQ-123, 56-2025"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Customer's Purchase Order number</strong> - This will appear as "PO NO: [your input]" on the invoice
                      </p>
                    </div>

                    {/* PO Date Field for Canteen Sales */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          PO Date (Optional)
                        </label>
                      </div>
                      <input
                        type="date"
                        value={poDate}
                        onChange={(e) => setPoDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Purchase Order Date</strong> - This will appear as "Dated: [your selected date]" on the invoice. If not selected, today's date will be used.
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
                      <label className="block text-sm font-medium text-gray-700">
                        PO Number (Customer Reference)
                      </label>
                      <input
                        type="text"
                        value={poNumber}
                        onChange={(e) => setPoNumber(e.target.value)}
                        placeholder="e.g., PO-2025-001, REQ-123, 56-2025"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Customer's Purchase Order number</strong> - This will appear as "PO NO: [your input]" on the invoice
                      </p>
                    </div>

                    {/* PO Date Field for Retail Sales too */}
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-700">
                        PO Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={poDate}
                        onChange={(e) => setPoDate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        <strong>Purchase Order Date</strong> - This will appear as "Dated: [your selected date]" on the invoice. If not selected, today's date will be used.
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
                      <input
                        type="text"
                        value={customInvoiceNumber}
                        onChange={(e) => setCustomInvoiceNumber(e.target.value)}
                        placeholder={`e.g., 56 or ${saleType === 'canteen' ? 'C' : 'R'}0000056/2025`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                      />
                      <p className="text-xs text-gray-500">
                        Enter just the number (e.g., 56) or full format ({saleType === 'canteen' ? 'C' : 'R'}0000056/2025)
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
                        Invoice number will be automatically generated in format: {saleType === 'canteen' ? 'C' : 'R'}0000001/{currentYear}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Bill Summary */}
            {cart.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📄 Bill Summary</h3>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GST ({saleType === 'retail' ? 'included' : 'added'}):</span>
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

