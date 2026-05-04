'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Loan {
  id: string;
  loanName: string;
  lenderName: string;
  loanType: string;
  principalAmount: string;
  interestRate: string;
  tenure: number;
  emiAmount: string;
  startDate: string;
  endDate: string;
  status: string;
  remainingBalance: string;
  nextPaymentDate: string | null;
  purpose: string;
  createdAt: string;
}

interface LoanPayment {
  id: string;
  loanId: string;
  paymentDate: string;
  paymentAmount: string;
  principalAmount: string;
  interestAmount: string;
  outstandingBalance: string;
  paymentMethod: string;
  paymentStatus: string;
  lateFee: string;
  notes: string | null;
  loanName: string;
  lenderName: string;
  transactionId?: string | null;
  receiptNumber?: string | null;
}

interface LoanSummary {
  totalLoans: number;
  activeLoans: number;
  totalPrincipal: number;
  totalOutstanding: number;
  monthlyEMI: number;
}

export default function LoanManagementPage() {
  const { data: session } = useSession();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentForm, setEditPaymentForm] = useState({
    paymentDate: '',
    paymentAmount: '',
    principalAmount: '',
    interestAmount: '',
    paymentMethod: 'bank_transfer',
    transactionId: '',
    receiptNumber: '',
    lateFee: '0',
    notes: '',
  });
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'loans' | 'payments' | 'add-loan' | 'add-payment'>('overview');
  const [selectedLoan, setSelectedLoan] = useState<string>('');
  const [formData, setFormData] = useState({
    loanName: '',
    lenderName: '',
    loanType: 'business_loan',
    principalAmount: '',
    interestRate: '',
    tenure: '',
    emiAmount: '',
    startDate: '',
    endDate: '',
    accountNumber: '',
    ifscCode: '',
    collateral: '',
    purpose: '',
    notes: ''
  });
  const [paymentFormData, setPaymentFormData] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    paymentAmount: '',
    principalAmount: '',
    interestAmount: '',
    paymentMethod: 'bank_transfer',
    transactionId: '',
    receiptNumber: '',
    lateFee: '0',
    notes: ''
  });

  // Fetch loans and summary
  const fetchLoans = async () => {
    try {
      const response = await fetch('/api/loans');
      if (response.ok) {
        const data = await response.json();
        setLoans(data.loans);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching loans:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await fetch('/api/loans/payments');
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments ?? []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const [loansRes, paymentsRes] = await Promise.all([
          fetch('/api/loans'),
          fetch('/api/loans/payments'),
        ]);
        if (cancelled) return;
        if (loansRes.ok) {
          const data = await loansRes.json();
          setLoans(data.loans);
          setSummary(data.summary);
        }
        if (paymentsRes.ok) {
          const payData = await paymentsRes.json();
          setPayments(payData.payments ?? []);
        }
      } catch (error) {
        console.error('Error loading loan management data:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadInitialData();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle form submission for new loan
  const handleSubmitLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/loans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Loan created successfully!');
        setFormData({
          loanName: '',
          lenderName: '',
          loanType: 'business_loan',
          principalAmount: '',
          interestRate: '',
          tenure: '',
          emiAmount: '',
          startDate: '',
          endDate: '',
          accountNumber: '',
          ifscCode: '',
          collateral: '',
          purpose: '',
          notes: ''
        });
        setActiveTab('loans');
        fetchLoans();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error creating loan:', error);
      alert('Error creating loan');
    }
  };

  // Handle payment submission
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) {
      alert('Please select a loan');
      return;
    }

    try {
      const response = await fetch(`/api/loans/${selectedLoan}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentFormData),
      });

      if (response.ok) {
        alert('Payment recorded successfully!');
        setPaymentFormData({
          paymentDate: new Date().toISOString().split('T')[0],
          paymentAmount: '',
          principalAmount: '',
          interestAmount: '',
          paymentMethod: 'bank_transfer',
          transactionId: '',
          receiptNumber: '',
          lateFee: '0',
          notes: ''
        });
        setSelectedLoan('');
        setActiveTab('payments');
        fetchLoans();
        fetchPayments();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Error recording payment');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(typeof amount === 'string' ? parseFloat(amount) : amount);
  };

  const formatDate = (value: string | Date) => {
    const d = value instanceof Date ? value : new Date(value);
    return d.toLocaleDateString('en-IN');
  };

  const toNumber = (value: string | number) => (
    typeof value === 'string' ? parseFloat(value) : value
  );

  const selectedLoanData = loans.find((loan) => loan.id === selectedLoan);
  const selectedLoanOutstanding = selectedLoanData ? parseFloat(selectedLoanData.remainingBalance) : null;
  const enteredPrincipalAmount = paymentFormData.principalAmount ? parseFloat(paymentFormData.principalAmount) : 0;
  const projectedRemainingAmount = selectedLoanOutstanding !== null
    ? Math.max(selectedLoanOutstanding - enteredPrincipalAmount, 0)
    : null;
  const isPrincipalGreaterThanOutstanding = selectedLoanOutstanding !== null && enteredPrincipalAmount > selectedLoanOutstanding;

  const canManagePayments = ['admin', 'accountant'].includes(session?.user?.role ?? '');

  const toInputDate = (value: string | Date) => {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    const s = String(value);
    return s.length >= 10 ? s.slice(0, 10) : s;
  };

  const openEditPayment = (payment: LoanPayment) => {
    setEditingPaymentId(payment.id);
    setEditPaymentForm({
      paymentDate: toInputDate(payment.paymentDate as string | Date),
      paymentAmount: String(payment.paymentAmount),
      principalAmount: String(payment.principalAmount),
      interestAmount: String(payment.interestAmount),
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId ?? '',
      receiptNumber: payment.receiptNumber ?? '',
      lateFee: payment.lateFee ?? '0',
      notes: payment.notes ?? '',
    });
  };

  const handleSaveEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentId) return;
    try {
      const response = await fetch(`/api/loans/payments/${editingPaymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPaymentForm),
      });
      if (response.ok) {
        setEditingPaymentId(null);
        await fetchPayments();
        await fetchLoans();
      } else {
        const err = await response.json();
        alert(err.error ?? 'Failed to update payment');
      }
    } catch {
      alert('Failed to update payment');
    }
  };

  const handleDeletePayment = async (payment: LoanPayment) => {
    const dateLabel = formatDate(payment.paymentDate as string | Date);
    if (!confirm(`Delete payment on ${dateLabel} for "${payment.loanName}"? Loan balances will be recalculated.`)) {
      return;
    }
    try {
      const response = await fetch(`/api/loans/payments/${payment.id}`, { method: 'DELETE' });
      if (response.ok) {
        if (editingPaymentId === payment.id) setEditingPaymentId(null);
        await fetchPayments();
        await fetchLoans();
      } else {
        const err = await response.json();
        alert(err.error ?? 'Failed to delete payment');
      }
    } catch {
      alert('Failed to delete payment');
    }
  };

  const overviewPayments = payments.slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Loan Management</h1>
          <p className="text-gray-600">Manage business loans, track payments, and monitor loan status</p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { key: 'overview', label: '📊 Overview' },
                { key: 'loans', label: '🏦 Loans' },
                { key: 'payments', label: '💳 Payments' },
                { key: 'add-loan', label: '➕ Add Loan' },
                { key: 'add-payment', label: '💰 Record Payment' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.key
                      ? 'border-green-500 text-green-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && summary && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-md">
                    <span className="text-blue-600 text-xl">🏦</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Loans</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.totalLoans}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-md">
                    <span className="text-green-600 text-xl">✅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Active Loans</p>
                    <p className="text-2xl font-bold text-gray-900">{summary.activeLoans}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-md">
                    <span className="text-purple-600 text-xl">💰</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Total Principal</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalPrincipal)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-md">
                    <span className="text-red-600 text-xl">⚠️</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Outstanding</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.totalOutstanding)}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-md">
                    <span className="text-yellow-600 text-xl">📅</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">Monthly EMI</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(summary.monthlyEMI)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Active Loans */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Active Loans</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lender</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total loan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid so far</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Payment</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loans.filter(loan => loan.status === 'active').map((loan) => {
                      const paidSoFar = Math.max(toNumber(loan.principalAmount) - toNumber(loan.remainingBalance), 0);

                      return (
                      <tr key={loan.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{loan.loanName}</div>
                            <div className="text-sm text-gray-500">{loan.loanType.replace('_', ' ')}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{loan.lenderName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(loan.principalAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(paidSoFar)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(loan.remainingBalance)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(loan.emiAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : 'N/A'}
                        </td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Payments */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                      {canManagePayments && (
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {overviewPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(payment.paymentDate as string | Date)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{payment.loanName}</div>
                            <div className="text-sm text-gray-500">{payment.lenderName}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(payment.paymentAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(payment.principalAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(payment.interestAmount)}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            {payment.paymentMethod.replace('_', ' ')}
                          </span>
                        </td>
                        {canManagePayments && (
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button
                              type="button"
                              onClick={() => openEditPayment(payment)}
                              className="text-green-600 hover:text-green-800 font-medium mr-3"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePayment(payment)}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Loans Tab */}
        {activeTab === 'loans' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Loans</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Details</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lender</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total loan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid so far</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EMI</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Next Payment</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {loans.map((loan) => {
                    const originalPrincipal = toNumber(loan.principalAmount);
                    const remainingPrincipal = toNumber(loan.remainingBalance);
                    const repaidPrincipal = Math.max(originalPrincipal - remainingPrincipal, 0);

                    return (
                    <tr key={loan.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{loan.loanName}</div>
                          <div className="text-sm text-gray-500">{loan.loanType.replace('_', ' ')} • {loan.tenure} months</div>
                          <div className="text-sm text-gray-500">{loan.interestRate}% p.a.</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{loan.lenderName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(loan.principalAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(repaidPrincipal)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(loan.remainingBalance)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(loan.emiAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          loan.status === 'active' ? 'bg-green-100 text-green-800' :
                          loan.status === 'closed' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {loan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {loan.nextPaymentDate ? formatDate(loan.nextPaymentDate) : 'N/A'}
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">All Payments</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Principal</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Interest</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                    {canManagePayments && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(payment.paymentDate as string | Date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{payment.loanName}</div>
                          <div className="text-sm text-gray-500">{payment.lenderName}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(payment.paymentAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(payment.principalAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(payment.interestAmount)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(payment.outstandingBalance)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {payment.paymentMethod.replace('_', ' ')}
                        </span>
                      </td>
                      {canManagePayments && (
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            type="button"
                            onClick={() => openEditPayment(payment)}
                            className="text-green-600 hover:text-green-800 font-medium mr-3"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(payment)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Delete
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Loan Tab */}
        {activeTab === 'add-loan' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Add New Loan</h2>
            </div>
            <form onSubmit={handleSubmitLoan} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.loanName}
                    onChange={(e) => setFormData({ ...formData, loanName: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Business Expansion Loan 2024"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Lender Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.lenderName}
                    onChange={(e) => setFormData({ ...formData, lenderName: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., State Bank of India"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Loan Type *</label>
                  <select
                    required
                    value={formData.loanType}
                    onChange={(e) => setFormData({ ...formData, loanType: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="business_loan">Business Loan</option>
                    <option value="personal_loan">Personal Loan</option>
                    <option value="equipment_loan">Equipment Loan</option>
                    <option value="working_capital">Working Capital</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.principalAmount}
                    onChange={(e) => setFormData({ ...formData, principalAmount: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="1000000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (% p.a.) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="12.50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tenure (Months) *</label>
                  <input
                    type="number"
                    required
                    value={formData.tenure}
                    onChange={(e) => setFormData({ ...formData, tenure: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="60"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">EMI Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.emiAmount}
                    onChange={(e) => setFormData({ ...formData, emiAmount: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="22244"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Account Number</label>
                  <input
                    type="text"
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="1234567890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code</label>
                  <input
                    type="text"
                    value={formData.ifscCode}
                    onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="SBIN0001234"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose *</label>
                <textarea
                  required
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Describe the purpose of this loan..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Collateral</label>
                <textarea
                  value={formData.collateral}
                  onChange={(e) => setFormData({ ...formData, collateral: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Describe any collateral provided..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Create Loan
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Add Payment Tab */}
        {activeTab === 'add-payment' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Record Loan Payment</h2>
            </div>
            <form onSubmit={handleSubmitPayment} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Loan *</label>
                <select
                  required
                  value={selectedLoan}
                  onChange={(e) => setSelectedLoan(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Choose a loan...</option>
                  {loans.filter(loan => loan.status === 'active').map((loan) => (
                    <option key={loan.id} value={loan.id}>
                      {loan.loanName} - {loan.lenderName} (Outstanding: {formatCurrency(loan.remainingBalance)})
                    </option>
                  ))}
                </select>
                {selectedLoanData && (
                  <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-900">
                    Current Outstanding: <span className="font-semibold">{formatCurrency(selectedLoanData.remainingBalance)}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date *</label>
                  <input
                    type="date"
                    required
                    value={paymentFormData.paymentDate}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Payment Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentFormData.paymentAmount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentAmount: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="22244"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Principal Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentFormData.principalAmount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, principalAmount: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="15000"
                  />
                  {selectedLoanData && paymentFormData.principalAmount && (
                    <p className={`mt-2 text-sm ${isPrincipalGreaterThanOutstanding ? 'text-red-600' : 'text-gray-700'}`}>
                      {isPrincipalGreaterThanOutstanding
                        ? 'Principal amount cannot be greater than outstanding balance.'
                        : `Remaining after this payment: ${formatCurrency(projectedRemainingAmount ?? 0)}`}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Interest Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={paymentFormData.interestAmount}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, interestAmount: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="7244"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method *</label>
                  <select
                    required
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Late Fee (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentFormData.lateFee}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, lateFee: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Transaction ID</label>
                  <input
                    type="text"
                    value={paymentFormData.transactionId}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, transactionId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="TXN123456789"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Receipt Number</label>
                  <input
                    type="text"
                    value={paymentFormData.receiptNumber}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, receiptNumber: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="RCP001"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={paymentFormData.notes}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Additional notes about this payment..."
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Record Payment
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('overview')}
                  className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {editingPaymentId && canManagePayments && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-payment-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingPaymentId(null);
          }}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="edit-payment-title" className="text-lg font-semibold text-gray-900 mb-4">
              Edit payment
            </h3>
            <form onSubmit={handleSaveEditPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment date *</label>
                <input
                  type="date"
                  required
                  value={editPaymentForm.paymentDate}
                  onChange={(e) =>
                    setEditPaymentForm({ ...editPaymentForm, paymentDate: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPaymentForm.paymentAmount}
                    onChange={(e) =>
                      setEditPaymentForm({ ...editPaymentForm, paymentAmount: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Principal (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPaymentForm.principalAmount}
                    onChange={(e) =>
                      setEditPaymentForm({ ...editPaymentForm, principalAmount: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPaymentForm.interestAmount}
                    onChange={(e) =>
                      setEditPaymentForm({ ...editPaymentForm, interestAmount: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Method *</label>
                  <select
                    required
                    value={editPaymentForm.paymentMethod}
                    onChange={(e) =>
                      setEditPaymentForm({ ...editPaymentForm, paymentMethod: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="upi">UPI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Late fee (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPaymentForm.lateFee}
                    onChange={(e) =>
                      setEditPaymentForm({ ...editPaymentForm, lateFee: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID</label>
                  <input
                    type="text"
                    value={editPaymentForm.transactionId}
                    onChange={(e) =>
                      setEditPaymentForm({ ...editPaymentForm, transactionId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Receipt number</label>
                  <input
                    type="text"
                    value={editPaymentForm.receiptNumber}
                    onChange={(e) =>
                      setEditPaymentForm({ ...editPaymentForm, receiptNumber: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editPaymentForm.notes}
                  onChange={(e) =>
                    setEditPaymentForm({ ...editPaymentForm, notes: e.target.value })
                  }
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setEditingPaymentId(null)}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
