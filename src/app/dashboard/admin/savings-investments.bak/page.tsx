"use client";
import React, { useEffect, useState } from 'react';
import { Card, Button, Input, Select, LoadingSpinner } from '@/components/ui';

// Disable static generation for this page
export const dynamic = 'force-dynamic';

interface SavingsInvestment {
  id: string;
  type: string;
  title: string;
  description?: string;
  amount: number | string;
  currentValue?: number | string;
  investmentDate: string;
  maturityDate?: string;
  interestRate?: number | string;
  institution?: string;
  accountNumber?: string;
  status: string;
  userId: string;
  createdAt: string;
}

const SavingsInvestmentsPage: React.FC = () => {
  const [savingsInvestments, setSavingsInvestments] = useState<SavingsInvestment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<SavingsInvestment | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    amount: '',
    currentValue: '',
    investmentDate: '',
    maturityDate: '',
    interestRate: '',
    institution: '',
    accountNumber: '',
    status: 'active'
  });

  const investmentTypes = [
    { id: 'savings', name: 'Savings Account', icon: '🏦', color: 'bg-blue-100 text-blue-800', description: 'Regular bank savings' },
    { id: 'fixed_deposit', name: 'Fixed Deposit', icon: '📈', color: 'bg-green-100 text-green-800', description: 'Bank FDs and term deposits' },
    { id: 'mutual_fund', name: 'Mutual Fund', icon: '📊', color: 'bg-purple-100 text-purple-800', description: 'Mutual fund investments' },
    { id: 'stock', name: 'Stocks', icon: '📈', color: 'bg-red-100 text-red-800', description: 'Share market investments' },
    { id: 'property', name: 'Property', icon: '🏠', color: 'bg-orange-100 text-orange-800', description: 'Real estate investments' },
    { id: 'gold', name: 'Gold', icon: '🥇', color: 'bg-yellow-100 text-yellow-800', description: 'Gold investments' },
    { id: 'investment', name: 'General Investment', icon: '💎', color: 'bg-indigo-100 text-indigo-800', description: 'Other investments' },
    { id: 'other', name: 'Other', icon: '💼', color: 'bg-gray-100 text-gray-800', description: 'Other financial assets' }
  ];

  const statusOptions = [
    { id: 'active', name: 'Active', color: 'bg-green-100 text-green-800' },
    { id: 'matured', name: 'Matured', color: 'bg-blue-100 text-blue-800' },
    { id: 'closed', name: 'Closed', color: 'bg-gray-100 text-gray-800' },
    { id: 'sold', name: 'Sold', color: 'bg-orange-100 text-orange-800' }
  ];

  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      investmentDate: new Date().toISOString().split('T')[0]
    }));
    fetchSavingsInvestments();
  }, []);

  const fetchSavingsInvestments = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/savings-investments');
      const data = await response.json();
      if (data.success) {
        setSavingsInvestments(data.data);
      } else {
        setError('Failed to fetch savings/investments');
      }
    } catch (err) {
      setError('Failed to fetch savings/investments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const itemData = {
        ...formData,
        amount: parseFloat(formData.amount),
        currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        maturityDate: formData.maturityDate || undefined,
        description: formData.description || undefined,
        institution: formData.institution || undefined,
        accountNumber: formData.accountNumber || undefined
      };

      const url = editingItem ? `/api/savings-investments/${editingItem.id}` : '/api/savings-investments';
      const method = editingItem ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemData)
      });

      const data = await response.json();
      if (data.success) {
        await fetchSavingsInvestments();
        resetForm();
        setShowForm(false);
      } else {
        setError(data.error || 'Failed to save item');
      }
    } catch (err) {
      setError('Failed to save item');
    }
  };

  const handleEdit = (item: SavingsInvestment) => {
    setEditingItem(item);
    setFormData({
      type: item.type,
      title: item.title,
      description: item.description || '',
      amount: item.amount.toString(),
      currentValue: item.currentValue?.toString() || '',
      investmentDate: item.investmentDate.split('T')[0],
      maturityDate: item.maturityDate ? item.maturityDate.split('T')[0] : '',
      interestRate: item.interestRate?.toString() || '',
      institution: item.institution || '',
      accountNumber: item.accountNumber || '',
      status: item.status
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    
    try {
      const response = await fetch(`/api/savings-investments/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await fetchSavingsInvestments();
      } else {
        setError(data.error || 'Failed to delete item');
      }
    } catch (err) {
      setError('Failed to delete item');
    }
  };

  const resetForm = () => {
    setFormData({
      type: '',
      title: '',
      description: '',
      amount: '',
      currentValue: '',
      investmentDate: new Date().toISOString().split('T')[0],
      maturityDate: '',
      interestRate: '',
      institution: '',
      accountNumber: '',
      status: 'active'
    });
    setEditingItem(null);
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getTypeInfo = (typeId: string) => {
    return investmentTypes.find(type => type.id === typeId) || investmentTypes[investmentTypes.length - 1];
  };

  const getStatusInfo = (statusId: string) => {
    return statusOptions.find(status => status.id === statusId) || statusOptions[0];
  };

  const parseAmount = (amount: number | string): number => {
    return typeof amount === 'string' ? parseFloat(amount) || 0 : amount || 0;
  };

  const getTotalsByType = () => {
    const totals: { [key: string]: { count: number; amount: number; currentValue: number } } = {};
    savingsInvestments.forEach(item => {
      const amount = parseAmount(item.amount);
      const currentValue = parseAmount(item.currentValue || item.amount);
      
      if (!totals[item.type]) {
        totals[item.type] = { count: 0, amount: 0, currentValue: 0 };
      }
      totals[item.type].count += 1;
      totals[item.type].amount += amount;
      totals[item.type].currentValue += currentValue;
    });
    return totals;
  };

  const getTotalInvestment = () => {
    return savingsInvestments.reduce((sum, item) => sum + parseAmount(item.amount), 0);
  };

  const getTotalCurrentValue = () => {
    return savingsInvestments.reduce((sum, item) => 
      sum + parseAmount(item.currentValue || item.amount), 0);
  };

  const getGainLoss = () => {
    const totalInvestment = getTotalInvestment();
    const totalCurrent = getTotalCurrentValue();
    return totalCurrent - totalInvestment;
  };

  const typeBreakdown = getTotalsByType();
  const totalInvestment = getTotalInvestment();
  const totalCurrentValue = getTotalCurrentValue();
  const gainLoss = getGainLoss();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading savings & investments..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-4xl">💰</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Savings & Investments</h1>
            <p className="text-gray-600">Track and manage your financial portfolio</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-700">
          <span className="mr-2">➕</span>
          Add Investment
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Investment</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalInvestment)}</p>
              </div>
              <div className="text-3xl">💸</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Current Value</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCurrentValue)}</p>
              </div>
              <div className="text-3xl">💰</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gain/Loss</p>
                <p className={`text-2xl font-bold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {gainLoss >= 0 ? '+' : ''}{formatCurrency(gainLoss)}
                </p>
              </div>
              <div className="text-3xl">{gainLoss >= 0 ? '📈' : '📉'}</div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-indigo-600">{savingsInvestments.length}</p>
              </div>
              <div className="text-3xl">📊</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingItem ? 'Edit Investment' : 'Add New Investment'}
              </h2>
              <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                Cancel
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Investment Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Investment Type *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {investmentTypes.map(type => (
                    <div
                      key={type.id}
                      onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                      className={`
                        cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md
                        ${formData.type === type.id 
                          ? `${type.color} border-current shadow-md` 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="text-center">
                        <div className="text-2xl mb-2">{type.icon}</div>
                        <div className="font-medium text-sm">{type.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Investment title"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Investment Amount *
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
                    Current Value
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.currentValue}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentValue: e.target.value }))}
                    placeholder="Current market value"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Investment Date *
                  </label>
                  <Input
                    type="date"
                    value={formData.investmentDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, investmentDate: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maturity Date
                  </label>
                  <Input
                    type="date"
                    value={formData.maturityDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, maturityDate: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interest Rate (%)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, interestRate: e.target.value }))}
                    placeholder="5.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Institution/Bank
                  </label>
                  <Input
                    value={formData.institution}
                    onChange={(e) => setFormData(prev => ({ ...prev, institution: e.target.value }))}
                    placeholder="Bank or broker name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <Input
                    value={formData.accountNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                    placeholder="Account or reference number"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Additional details"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <Select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    {statusOptions.map(status => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingItem ? 'Update Investment' : 'Add Investment'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      {/* Type Breakdown */}
      {Object.keys(typeBreakdown).length > 0 && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Portfolio Breakdown
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(typeBreakdown).map(([type, data]) => {
                const typeInfo = getTypeInfo(type);
                const profit = data.currentValue - data.amount;
                return (
                  <div key={type} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{typeInfo.icon}</span>
                      <h3 className="font-semibold text-gray-800">{typeInfo.name}</h3>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Items:</span>
                        <span className="font-medium">{data.count}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Invested:</span>
                        <span className="font-medium text-blue-600">{formatCurrency(data.amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Current:</span>
                        <span className="font-medium text-green-600">{formatCurrency(data.currentValue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">P&L:</span>
                        <span className={`font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      )}

      {/* Investment List */}
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">All Investments</h2>
          
          {savingsInvestments.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💰</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No investments recorded yet</h3>
              <p className="text-gray-500 mb-6">Start building your financial portfolio by adding your first investment.</p>
              <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <span className="mr-2">➕</span>
                Add Your First Investment
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Investment
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Current Value
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      P&L
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {savingsInvestments.map((item) => {
                    const typeInfo = getTypeInfo(item.type);
                    const statusInfo = getStatusInfo(item.status);
                    const currentValue = parseAmount(item.currentValue || item.amount);
                    const investedAmount = parseAmount(item.amount);
                    const profit = currentValue - investedAmount;
                    
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.title}</div>
                            <div className="text-sm text-gray-500">{item.institution}</div>
                            <div className="text-xs text-gray-400">{formatDate(item.investmentDate)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${typeInfo.color}`}>
                            <span className="mr-1">{typeInfo.icon}</span>
                            {typeInfo.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                          {formatCurrency(investedAmount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(currentValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                          <span className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
                            {statusInfo.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(item.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{error.includes("doesn't exist") || error.includes("ER_NO_SUCH_TABLE") ? '🛠️' : '❌'}</span>
            <h3 className="text-lg font-semibold text-red-800">
              {error.includes("doesn't exist") || error.includes("ER_NO_SUCH_TABLE") 
                ? 'Database Setup Required' 
                : 'Error Loading Investments'}
            </h3>
          </div>
          
          <div className="text-red-700 mb-4">{error}</div>
          
          <div className="space-y-3">
            {(error.includes("doesn't exist") || error.includes("ER_NO_SUCH_TABLE")) ? (
              <div className="space-y-3">
                <p className="text-red-600">
                  The savings_investments table needs to be created before you can use this feature.
                </p>
                <div className="flex gap-3">
                  <a
                    href="/dashboard/admin/setup/database"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium inline-flex items-center gap-2"
                  >
                    <span>🛠️</span>
                    Setup Database
                  </a>
                  <button
                    onClick={fetchSavingsInvestments}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
                  >
                    🔄 Retry
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={fetchSavingsInvestments}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium"
              >
                🔄 Retry
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SavingsInvestmentsPage;
