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
    { id: 'savings', name: 'Savings Account', icon: '🏦', color: 'bg-blue-100 text-blue-800' },
    { id: 'fixed_deposit', name: 'Fixed Deposit', icon: '📈', color: 'bg-green-100 text-green-800' },
    { id: 'mutual_fund', name: 'Mutual Fund', icon: '📊', color: 'bg-purple-100 text-purple-800' },
    { id: 'stock', name: 'Stocks', icon: '📈', color: 'bg-red-100 text-red-800' },
    { id: 'property', name: 'Property', icon: '🏠', color: 'bg-orange-100 text-orange-800' },
    { id: 'gold', name: 'Gold', icon: '🥇', color: 'bg-yellow-100 text-yellow-800' },
    { id: 'investment', name: 'General Investment', icon: '💎', color: 'bg-indigo-100 text-indigo-800' },
    { id: 'other', name: 'Other', icon: '💼', color: 'bg-gray-100 text-gray-800' }
  ];

  useEffect(() => {
    fetchSavingsInvestments();
  }, []);

  const fetchSavingsInvestments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/savings-investments');
      const data = await response.json();

      if (data.success) {
        setSavingsInvestments(data.data);
      } else {
        setError('Failed to fetch savings/investments');
      }
    } catch (err) {
      console.error('Error fetching savings/investments:', err);
      setError('Failed to fetch savings/investments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/savings-investments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSavingsInvestments([data.data, ...savingsInvestments]);
        resetForm();
        setShowForm(false);
      } else {
        setError('Failed to create savings/investment');
      }
    } catch (err) {
      console.error('Error creating savings/investment:', err);
      setError('Failed to create savings/investment');
    }
  };

  const resetForm = () => {
    setFormData({
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
    setEditingItem(null);
  };

  const formatCurrency = (amount: number | string) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  const getTypeInfo = (type: string) => {
    return investmentTypes.find(t => t.id === type) || investmentTypes[investmentTypes.length - 1];
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading investments..." />
      </div>
    );
  }

  if (error) {
    const isTableMissing = error.includes("doesn't exist") || error.includes("ER_NO_SUCH_TABLE");
    
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">💰</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Savings & Investments</h1>
            <p className="text-gray-600">Track financial portfolio and investments</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-md p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">{isTableMissing ? '🛠️' : '❌'}</span>
            <h3 className="text-lg font-semibold text-red-800">
              {isTableMissing ? 'Database Setup Required' : 'Error Loading Investments'}
            </h3>
          </div>
          
          <div className="text-red-700 mb-4">{error}</div>
          
          <div className="space-y-3">
            {isTableMissing ? (
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">💰</span>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Savings & Investments</h1>
            <p className="text-gray-600">Track financial portfolio and investments</p>
          </div>
        </div>
        <div className="flex">
          <Button
            onClick={() => setShowForm(!showForm)}
            variant="primary"
            className="w-full md:w-auto justify-center"
          >
            {showForm ? 'Cancel' : '+ Add Investment'}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">
              {editingItem ? 'Edit Investment' : 'Add New Investment'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Investment Type *
                  </label>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    required
                  >
                    <option value="">Select type</option>
                    {investmentTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.icon} {type.name}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <Input
                    label="Title *"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g., SBI Fixed Deposit"
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Amount *"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Current Value"
                    type="number"
                    value={formData.currentValue}
                    onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Input
                    label="Investment Date *"
                    type="date"
                    value={formData.investmentDate}
                    onChange={(e) => setFormData({ ...formData, investmentDate: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Input
                    label="Maturity Date"
                    type="date"
                    value={formData.maturityDate}
                    onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                  />
                </div>

                <div>
                  <Input
                    label="Interest Rate (%)"
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <Input
                    label="Institution"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    placeholder="e.g., SBI, HDFC"
                  />
                </div>
              </div>

              <div>
                <Input
                  label="Description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details..."
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" variant="primary">
                  {editingItem ? 'Update Investment' : 'Add Investment'}
                </Button>
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </form>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {savingsInvestments.map((investment) => {
          const typeInfo = getTypeInfo(investment.type);
          const currentValue = typeof investment.currentValue === 'string' 
            ? parseFloat(investment.currentValue) 
            : investment.currentValue || 0;
          const amount = typeof investment.amount === 'string' 
            ? parseFloat(investment.amount) 
            : investment.amount;
          const gainLoss = currentValue - amount;
          const gainLossPercent = amount > 0 ? (gainLoss / amount) * 100 : 0;

          return (
            <Card key={investment.id}>
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{typeInfo.icon}</span>
                    <div>
                      <h3 className="font-semibold text-gray-900">{investment.title}</h3>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${typeInfo.color}`}>
                        {typeInfo.name}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    investment.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {investment.status}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Invested:</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Value:</span>
                    <span className="font-medium">{formatCurrency(currentValue)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gain/Loss:</span>
                    <span className={`font-medium ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(gainLoss)} ({gainLossPercent.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{formatDate(investment.investmentDate)}</span>
                  </div>
                  {investment.institution && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Institution:</span>
                      <span className="font-medium">{investment.institution}</span>
                    </div>
                  )}
                </div>

                {investment.description && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-sm text-gray-600">{investment.description}</p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {savingsInvestments.length === 0 && !loading && (
        <Card>
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">💰</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No investments yet</h3>
            <p className="text-gray-500 mb-6">Start tracking your savings and investments to build your financial portfolio.</p>
            <Button onClick={() => setShowForm(true)} variant="primary">
              Add Your First Investment
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};

export default SavingsInvestmentsPage;