'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function AdminProductEditPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const productId = params?.id as string;

  const isNew = productId === 'new';

  const [form, setForm] = useState({
    name: '',
    category: 'Produced',
    type: 'Groundnut',
    description: '',
    basePrice: '',
    retailPrice: '',
    gstRate: '5',
    gstIncluded: false, // false = GST excluded, true = GST included
    unit: '1L',
    barcode: '',
    isActive: true,
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (session.user?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    const load = async () => {
      if (isNew) return;
      try {
        setLoading(true);
        const res = await fetch('/api/products');
        const data = await res.json();
        const prod = (data.products || []).find((p: any) => p.id === productId);
        if (!prod) {
          setError('Product not found');
          return;
        }
        const basePrice = String(prod.basePrice ?? '');
        const retailPrice = String(prod.retailPrice ?? '');
        
        
        setForm({
          name: prod.name || '',
          category: prod.category || 'Produced',
          type: prod.type || 'Groundnut',
          description: prod.description || '',
          basePrice: basePrice,
          retailPrice: retailPrice,
          gstRate: String(prod.gstRate || '5'),
          gstIncluded: Boolean(prod.gstIncluded), // Load actual GST inclusion status
          unit: prod.unit || '1L',
          barcode: prod.barcode || '',
          isActive: Boolean(prod.isActive),
        });
      } catch (e) {
        setError('Failed to load product');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [productId, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type, checked } = e.target as any;
    setForm((f) => {
      const newForm = { ...f, [name]: type === 'checkbox' ? checked : value };
      
      // Auto-calculate retail price when base price, GST rate, or GST inclusion changes
      if ((name === 'basePrice' || name === 'gstRate' || name === 'gstIncluded') && value !== undefined) {
        const basePrice = Number(name === 'basePrice' ? value : f.basePrice);
        const gstRate = Number(name === 'gstRate' ? value : f.gstRate || 5);
        const gstIncluded = name === 'gstIncluded' ? checked : f.gstIncluded;
        
        if (basePrice && gstRate !== undefined) {
          let retailPrice;
          if (gstIncluded) {
            // If GST is included in base price, retail price = base price
            retailPrice = basePrice;
          } else {
            // If GST is excluded, add GST to base price
            const gstAmount = (basePrice * gstRate) / 100;
            retailPrice = basePrice + gstAmount;
          }
          newForm.retailPrice = retailPrice.toFixed(2);
        }
      }
      
      return newForm;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        name: form.name,
        category: form.category,
        type: form.type,
        description: form.description || null,
        basePrice: Number(form.basePrice),
        retailPrice: Number(form.retailPrice),
        gstRate: Number(form.gstRate),
        gstIncluded: form.gstIncluded,
        unit: form.unit,
        barcode: form.barcode || null,
        isActive: Boolean(form.isActive),
      };
      const res = await fetch(isNew ? '/api/products' : `/api/products/${productId}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Saved successfully');
        router.push('/dashboard/admin/products');
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch (e) {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{isNew ? 'Add Product' : 'Edit Product'}</h1>
          <Link href="/dashboard/admin/products" className="text-indigo-600 hover:text-indigo-800 text-sm">Back to Products</Link>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">{error}</div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">{success}</div>}

        <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input name="name" value={form.name} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select name="category" value={form.category} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="Produced">Produced</option>
                <option value="Purchased">Purchased</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select name="type" value={form.type} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="Groundnut">Groundnut</option>
                <option value="Gingelly">Gingelly</option>
                <option value="Coconut">Coconut</option>
                <option value="Deepam">Deepam</option>
                <option value="Castor">Castor</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Price {form.gstIncluded ? '(GST Incl.)' : '(GST Excl.)'}
              </label>
              <input name="basePrice" type="number" step="0.01" value={form.basePrice} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label>
              <input name="gstRate" type="number" step="0.01" value={form.gstRate} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-4">
            <input 
              id="gstIncluded" 
              name="gstIncluded" 
              type="checkbox" 
              checked={form.gstIncluded} 
              onChange={handleChange} 
              className="h-4 w-4" 
            />
            <label htmlFor="gstIncluded" className="text-sm text-gray-700">
              GST is included in base price (if unchecked, GST will be added to base price)
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Retail Price (GST Incl.)</label>
              <input name="retailPrice" type="number" step="0.01" value={form.retailPrice} readOnly className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-600" />
              {form.basePrice && form.gstRate && (
                <div className="text-xs text-gray-500 mt-1">
                  {form.gstIncluded ? (
                    <>Base Price (GST included): ₹{form.basePrice} = Retail Price: ₹{form.retailPrice}</>
                  ) : (
                    <>Base: ₹{form.basePrice} + GST ({form.gstRate}%): ₹{((Number(form.basePrice) * Number(form.gstRate)) / 100).toFixed(2)} = ₹{form.retailPrice}</>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select name="unit" value={form.unit} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="5L">5 Ltrs</option>
                <option value="1L">1 Ltr</option>
                <option value="500ml">1/2 Ltr (500 ml)</option>
                <option value="200ml">200 ml</option>
                <option value="retail">Retail (custom)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Barcode</label>
              <input name="barcode" value={form.barcode} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input id="isActive" name="isActive" type="checkbox" checked={form.isActive} onChange={handleChange} className="h-4 w-4" />
              <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link href="/dashboard/admin/products" className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400">Cancel</Link>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


