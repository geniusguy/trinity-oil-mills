"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { getQueueCount } from '@/lib/offlineQueue';
import { Card, Button, Input, Select, LoadingSpinner } from '@/components/ui';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number | string;  // Can be string from database or number from form
  paymentMethod: string;
  receiptNumber?: string;
  expenseDate: string;
  userId: string;
  createdAt: string;
}

type SortKey = 'expenseDate' | 'category' | 'description' | 'amount' | 'paymentMethod';
type SortDirection = 'asc' | 'desc';

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'expenseDate',
    direction: 'desc',
  });
  const [formData, setFormData] = useState({
    category: '',
    description: '',
    amount: '',
    paymentMethod: 'cash',
    receiptNumber: '',
    expenseDate: ''
  });
  const [mounted, setMounted] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  const categories = [
    { id: 'oil_purchase', name: 'Oil Purchase', icon: '🛢️', color: 'bg-amber-100 text-amber-800', description: 'Buying oil from suppliers' },
    { id: 'supplier_bills', name: 'Supplier Bills', icon: '📄', color: 'bg-blue-100 text-blue-800', description: 'Bills from suppliers' },
    { id: 'transportation', name: 'Transportation', icon: '🚚', color: 'bg-green-100 text-green-800', description: 'Vehicle & transport costs' },
    { id: 'shipment_costs', name: 'Shipment Costs', icon: '📦', color: 'bg-purple-100 text-purple-800', description: 'Delivery & shipping' },
    { id: 'utilities', name: 'Utilities', icon: '⚡', color: 'bg-yellow-100 text-yellow-800', description: 'Electricity, water, gas' },
    { id: 'marketing', name: 'Marketing', icon: '📢', color: 'bg-pink-100 text-pink-800', description: 'Advertising & promotion' },
    { id: 'administrative', name: 'Administrative', icon: '🏢', color: 'bg-indigo-100 text-indigo-800', description: 'Office admin expenses' },
    { id: 'maintenance', name: 'Maintenance', icon: '🔧', color: 'bg-orange-100 text-orange-800', description: 'Equipment & facility repairs' },
    { id: 'office_supplies', name: 'Office Supplies', icon: '📝', color: 'bg-gray-100 text-gray-800', description: 'Stationery & office items' },
    { id: 'packaging', name: 'Packaging', icon: '📦', color: 'bg-teal-100 text-teal-800', description: 'Bottles, labels, boxes' },
    { id: 'other', name: 'Other', icon: '💼', color: 'bg-slate-100 text-slate-800', description: 'Miscellaneous expenses' }
  ];

  const paymentMethods = [
    { id: 'cash', name: 'Cash', icon: '💵' },
    { id: 'bank_transfer', name: 'Bank Transfer', icon: '🏦' },
    { id: 'card', name: 'Card Payment', icon: '💳' },
    { id: 'upi', name: 'UPI', icon: '📱' }
  ];

  // Helper functions to get category and payment method info
  const getCategoryInfo = (categoryId: string) => {
    return categories.find(cat => cat.id === categoryId) || categories[categories.length - 1]; // fallback to 'other'
  };

  const getPaymentMethodInfo = (methodId: string) => {
    return paymentMethods.find(method => method.id === methodId) || paymentMethods[0]; // fallback to 'cash'
  };

  useEffect(() => {
    setMounted(true);
    setFormData(prev => ({
      ...prev,
      expenseDate: new Date().toISOString().split('T')[0]
    }));
    fetchExpenses();
  }, []);

  useEffect(() => {
    const update = async () => setQueueCount(await getQueueCount());
    update();
    const onUpdate = (e: any) => setQueueCount(e.detail?.count || 0);
    window.addEventListener('offline-queue-update' as any, onUpdate);
    return () => window.removeEventListener('offline-queue-update' as any, onUpdate);
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/expenses');
      const data = await response.json();
      if (data.success) {
        setExpenses(data.data);
      } else {
        setError('Failed to fetch expenses');
      }
    } catch (err) {
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount),
        receiptNumber: formData.receiptNumber || undefined
      };

      const url = editingExpense ? `/api/expenses/${editingExpense.id}` : '/api/expenses';
      const method = editingExpense ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });

      const data = await response.json();
      if (data.success) {
        await fetchExpenses();
        resetForm();
        setShowForm(false);
      } else {
        setError(data.error || 'Failed to save expense');
      }
    } catch (err) {
      setError('Failed to save expense');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      paymentMethod: expense.paymentMethod,
      receiptNumber: expense.receiptNumber || '',
      expenseDate: expense.expenseDate.split('T')[0]
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      const response = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await fetchExpenses();
      } else {
        setError(data.error || 'Failed to delete expense');
      }
    } catch (err) {
      setError('Failed to delete expense');
    }
  };

  const resetForm = () => {
    setFormData({
      category: '',
      description: '',
      amount: '',
      paymentMethod: 'cash',
      receiptNumber: '',
      expenseDate: mounted ? new Date().toISOString().split('T')[0] : ''
    });
    setEditingExpense(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  // Helper function to safely parse amounts
  const parseAmount = (amount: number | string): number => {
    return typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
  };

  const requestSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedExpenses = useMemo(() => {
    const sorted = [...expenses];

    sorted.sort((a, b) => {
      let compareValue = 0;

      if (sortConfig.key === 'expenseDate') {
        compareValue = new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime();
      } else if (sortConfig.key === 'amount') {
        compareValue = parseAmount(a.amount) - parseAmount(b.amount);
      } else if (sortConfig.key === 'category') {
        compareValue = a.category.localeCompare(b.category);
      } else if (sortConfig.key === 'description') {
        compareValue = a.description.localeCompare(b.description);
      } else if (sortConfig.key === 'paymentMethod') {
        compareValue = a.paymentMethod.localeCompare(b.paymentMethod);
      }

      return sortConfig.direction === 'asc' ? compareValue : -compareValue;
    });

    return sorted;
  }, [expenses, sortConfig]);

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return '↕';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  const getTotalByCategory = () => {
    const totals: { [key: string]: number } = {};
    expenses.forEach(expense => {
      const amount = parseAmount(expense.amount);
      totals[expense.category] = (totals[expense.category] || 0) + amount;
    });
    return totals;
  };

  const categoryTotals = getTotalByCategory();
  const grandTotal = expenses.reduce((sum, expense) => sum + parseAmount(expense.amount), 0);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading expenses..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {queueCount > 0 && (
        <div className="p-3 rounded-md border border-amber-200 bg-amber-50 text-amber-800">
          {queueCount} action(s) pending sync. They will be sent when you’re online.
        </div>
      )}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-4xl">💰</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Expenses Management</h1>
            <p className="text-gray-600">Track and manage all your business expenses easily</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
          <span className="mr-2">➕</span>
          Add Expense
        </Button>
      </div>

      {/* Expense Form */}
      {showForm && (
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingExpense ? 'Edit Expense' : 'Add New Expense'}
              </h2>
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Visual Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Expense Category *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                      className={`
                        cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md
                        ${formData.category === cat.id 
                          ? `${cat.color} border-current shadow-md` 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">{cat.icon}</div>
                        <div className="font-medium text-sm">{cat.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{cat.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {!formData.category && (
                  <p className="text-red-500 text-sm mt-2">Please select a category</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter expense description"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Method *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {paymentMethods.map(method => (
                      <div
                        key={method.id}
                        onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method.id }))}
                        className={`
                          cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md text-center
                          ${formData.paymentMethod === method.id 
                            ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md' 
                            : 'bg-white border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <div className="text-xl mb-1">{method.icon}</div>
                        <div className="font-medium text-sm">{method.name}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Receipt Number
                  </label>
                  <Input
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, receiptNumber: e.target.value }))}
                    placeholder="Optional receipt number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expense Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expenseDate: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingExpense ? 'Update Expense' : 'Add Expense'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(grandTotal)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500">This Month</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(
                expenses
                  .filter(e => new Date(e.expenseDate).getMonth() === new Date().getMonth())
                  .reduce((sum, e) => sum + parseAmount(e.amount), 0)
              )}
            </p>
          </div>
        </Card>
        {/* Top 2 Categories */}
        {Object.entries(categoryTotals)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 2)
          .map(([categoryId, total]) => {
            const categoryInfo = getCategoryInfo(categoryId);
            return (
              <Card key={categoryId}>
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{categoryInfo.icon}</span>
                    <h3 className="text-sm font-medium text-gray-500">{categoryInfo.name}</h3>
                  </div>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(total as number)}</p>
                </div>
              </Card>
            );
          })
        }
      </div>

      {/* Expenses List */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">All Expenses</h2>
          
          {expenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No expenses recorded yet</h3>
              <p className="text-gray-500 mb-6">Start tracking your business expenses by adding your first expense.</p>
              <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <span className="mr-2">➕</span>
                Add Your First Expense
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => requestSort('expenseDate')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Date
                        <span className="text-[10px]">{getSortIndicator('expenseDate')}</span>
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => requestSort('category')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Category
                        <span className="text-[10px]">{getSortIndicator('category')}</span>
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => requestSort('description')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Description
                        <span className="text-[10px]">{getSortIndicator('description')}</span>
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => requestSort('amount')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Amount
                        <span className="text-[10px]">{getSortIndicator('amount')}</span>
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <button
                        type="button"
                        onClick={() => requestSort('paymentMethod')}
                        className="inline-flex items-center gap-1 hover:text-gray-700"
                      >
                        Payment
                        <span className="text-[10px]">{getSortIndicator('paymentMethod')}</span>
                      </button>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(expense.expenseDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const categoryInfo = getCategoryInfo(expense.category);
                          return (
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${categoryInfo.color}`}>
                              <span className="mr-1">{categoryInfo.icon}</span>
                              {categoryInfo.name}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {expense.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-red-600">
                        {formatCurrency(parseAmount(expense.amount))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(() => {
                          const paymentInfo = getPaymentMethodInfo(expense.paymentMethod);
                          return (
                            <span className="inline-flex items-center">
                              <span className="mr-1">{paymentInfo.icon}</span>
                              {paymentInfo.name}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(expense)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(expense.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;
