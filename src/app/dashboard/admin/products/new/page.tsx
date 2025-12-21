'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProductFormData {
  name: string;
  category: string;
  type: string;
  description: string;
  basePrice: string;
  retailPrice: string;
  gstRate: string;
  gstIncluded: boolean;
  unit: string;
  barcode: string;
  isActive: boolean;
}

export default function NewProductPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: 'Produced',
    type: 'Groundnut',
    description: '',
    basePrice: '',
    retailPrice: '',
    gstRate: '5',
    gstIncluded: true,
    unit: '1L',
    barcode: '',
    isActive: true
  });

  // Redirect if not authenticated or not admin
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  if (!['admin', 'retail_staff'].includes(session.user?.role || '')) {
    router.push('/dashboard');
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim()) {
      setError('Product name is required');
      return;
    }
    if (!formData.basePrice || isNaN(Number(formData.basePrice)) || Number(formData.basePrice) <= 0) {
      setError('Valid base price is required');
      return;
    }
    if (!formData.retailPrice || isNaN(Number(formData.retailPrice)) || Number(formData.retailPrice) <= 0) {
      setError('Valid retail price is required');
      return;
    }
    if (!formData.gstRate || isNaN(Number(formData.gstRate)) || Number(formData.gstRate) < 0) {
      setError('Valid GST rate is required');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          basePrice: Number(formData.basePrice),
          retailPrice: Number(formData.retailPrice),
          gstRate: Number(formData.gstRate)
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Product created successfully!');
        setTimeout(() => {
          router.push('/dashboard/admin/products');
        }, 1500);
      } else {
        setError(data.error || 'Failed to create product');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Product</h1>
              <p className="mt-2 text-gray-600">Create a new oil product</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Welcome, {session.user?.name} (Admin)
              </span>
              <Link
                href="/dashboard/admin/products"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Back to Products
              </Link>
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

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Product Information</h2>
          </div>
          
          <form onSubmit={handleSubmit} className="px-6 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Groundnut Oil 1L"
                  required
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="Produced">Produced</option>
                  <option value="Purchased">Purchased</option>
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Oil Type *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="Groundnut">Groundnut</option>
                  <option value="Gingelly">Gingelly</option>
                  <option value="Coconut">Coconut</option>
                  <option value="Deepam">Deepam</option>
                  <option value="Castor">Castor</option>
                </select>
              </div>

              {/* Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit *
                </label>
                <select
                  name="unit"
                  value={formData.unit}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  <option value="5L">5L</option>
                  <option value="1L">1L</option>
                  <option value="500ml">500ml</option>
                  <option value="200ml">200ml</option>
                  <option value="100ml">100ml</option>
                  <option value="retail">Retail</option>
                </select>
              </div>

              {/* Barcode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Barcode
                </label>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Optional barcode"
                />
              </div>

              {/* Base Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Base Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="basePrice"
                  value={formData.basePrice}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Retail Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Retail Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="retailPrice"
                  value={formData.retailPrice}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* GST Rate */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GST Rate (%) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  name="gstRate"
                  value={formData.gstRate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="5.00"
                  required
                />
              </div>

              {/* GST Included */}
              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="gstIncluded"
                    checked={formData.gstIncluded}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    GST is included in retail price
                  </label>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  If checked, GST is already included in the retail price. If unchecked, GST will be added to the base price.
                </p>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Product description (optional)"
                />
              </div>

              {/* Active Status */}
              <div className="md:col-span-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">
                    Active (product is available for sale)
                  </label>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="mt-8 flex justify-end space-x-3">
              <Link
                href="/dashboard/admin/products"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
