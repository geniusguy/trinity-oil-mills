'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { StatsCard } from '../../components/dashboard/StatsCard';
import { EnhancedStatsCard } from '../../components/dashboard/EnhancedStatsCard';
import { SmartNotifications } from '../../components/dashboard/SmartNotifications';
import { RecentActivity } from '../../components/dashboard/RecentActivity';
import { Card, useToast } from '../../components/ui';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    lowStockItems: 0,
  });
  const [overallStats, setOverallStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    lowStockItems: 0,
  });
  const [thisMonthStats, setThisMonthStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    lowStockItems: 0,
  });
  const [selectedMonthStats, setSelectedMonthStats] = useState({
    totalSales: 0,
    totalRevenue: 0,
    totalProducts: 0,
    lowStockItems: 0,
  });
  const [filterRange, setFilterRange] = useState<'today' | 'overall' | 'thisMonth' | 'selectedMonth'>('today');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);
  const [mounted, setMounted] = useState(false);


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && session?.user?.role === 'admin') {
      fetchStats();
      fetchRecentActivities();
    } else if (mounted && session?.user?.role === 'accountant') {
      fetchStats(); // Accountants also need stats data
    } else if (mounted && session?.user?.role === 'retail_staff') {
      fetchStats(); // Staff also need stats data for their dashboard
    } else if (mounted) {
      setIsLoading(false); // For other roles, just stop loading
    }
  }, [session, mounted]);

  // Refetch stats when selected month changes
  useEffect(() => {
    if (mounted && session?.user && selectedMonth) {
      fetchStats();
    }
  }, [selectedMonth, mounted, session]);

  const fetchStats = async () => {
    try {
      setIsLoading(true);
      const [salesRes, productsRes, inventoryRes] = await Promise.all([
        fetch('/api/sales'),
        fetch('/api/products'),
        fetch('/api/inventory/low-stock')
      ]);
      
      const salesData = await salesRes.json();
      const productsData = await productsRes.json();
      const inventoryData = await inventoryRes.json();
      const allSales: any[] = salesData.sales || [];
      
      const now = new Date();
      const isToday = (d: string | number | Date) => new Date(d).toDateString() === now.toDateString();
      
      const isThisMonth = (d: string | number | Date) => {
        const saleDate = new Date(d);
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      };
      
      const isSelectedMonth = (d: string | number | Date) => {
        const saleDate = new Date(d);
        const selectedDate = new Date(selectedMonth + '-01');
        return saleDate.getMonth() === selectedDate.getMonth() && saleDate.getFullYear() === selectedDate.getFullYear();
      };

      const todaySales = allSales.filter((s) => isToday(s.createdAt));
      const thisMonthSales = allSales.filter((s) => isThisMonth(s.createdAt));
      const selectedMonthSales = allSales.filter((s) => isSelectedMonth(s.createdAt));
      
      const todayRevenue = todaySales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      const thisMonthRevenue = thisMonthSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      const selectedMonthRevenue = selectedMonthSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
      const overallRevenue = allSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

      setStats({
        totalSales: todaySales.length,
        totalRevenue: todayRevenue,
        totalProducts: productsData.products?.length || 0,
        lowStockItems: inventoryData.lowStock?.length || 0,
      });

      setThisMonthStats({
        totalSales: thisMonthSales.length,
        totalRevenue: thisMonthRevenue,
        totalProducts: productsData.products?.length || 0,
        lowStockItems: inventoryData.lowStock?.length || 0,
      });

      setSelectedMonthStats({
        totalSales: selectedMonthSales.length,
        totalRevenue: selectedMonthRevenue,
        totalProducts: productsData.products?.length || 0,
        lowStockItems: inventoryData.lowStock?.length || 0,
      });

      setOverallStats({
        totalSales: allSales.length,
        totalRevenue: overallRevenue,
        totalProducts: productsData.products?.length || 0,
        lowStockItems: inventoryData.lowStock?.length || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const res = await fetch('/api/sales?limit=5');
      const data = await res.json();
      
      const activities = data.sales?.map((sale: any) => ({
        id: sale.id,
        type: 'sale',
        description: `New sale ${sale.invoiceNumber} for ₹${Number(sale.totalAmount).toLocaleString()}`,
        timestamp: new Date(sale.createdAt).toLocaleDateString(),
        status: 'success'
      })) || [];
      
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  };

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  const getCurrentStats = () => {
    switch (filterRange) {
      case 'today':
        return stats;
      case 'overall':
        return overallStats;
      case 'thisMonth':
        return thisMonthStats;
      case 'selectedMonth':
        return selectedMonthStats;
      default:
        return stats;
    }
  };

  const FilterToggle = () => (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="inline-flex items-center rounded-md border border-gray-200 bg-white p-1 text-xs">
        <button
          onClick={() => setFilterRange('today')}
          className={`px-3 py-1 rounded ${filterRange === 'today' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          Today
        </button>
        <button
          onClick={() => setFilterRange('overall')}
          className={`px-3 py-1 rounded ${filterRange === 'overall' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          Overall
        </button>
        <button
          onClick={() => setFilterRange('thisMonth')}
          className={`px-3 py-1 rounded ${filterRange === 'thisMonth' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          This Month
        </button>
        <button
          onClick={() => setFilterRange('selectedMonth')}
          className={`px-3 py-1 rounded ${filterRange === 'selectedMonth' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}
        >
          Selected Month
        </button>
      </div>
      
      {filterRange === 'selectedMonth' && (
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Month:</label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}
    </div>
  );

  const getDashboardContent = () => {
    switch (session.user?.role) {
      case 'admin':
        return (
          <div className="space-y-6">
            <div>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                  <p className="mt-2 text-gray-600">Comprehensive overview of your oil mill operations</p>
                </div>
                <FilterToggle />
              </div>
            </div>

            {/* Enhanced Stats Cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <EnhancedStatsCard
                title={
                  filterRange === 'today' ? 'Total Sales Today' :
                  filterRange === 'thisMonth' ? 'Total Sales This Month' :
                  filterRange === 'selectedMonth' ? `Total Sales ${new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}` :
                  'Total Sales Overall'
                }
                value={getCurrentStats().totalSales}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                }
                color="blue"
                trend={{ value: 15, direction: 'up', period: 'yesterday' }}
                onClick={() => router.push('/dashboard/admin/sales')}
              />
              <EnhancedStatsCard
                title={
                  filterRange === 'today' ? 'Revenue Today' :
                  filterRange === 'thisMonth' ? 'Revenue This Month' :
                  filterRange === 'selectedMonth' ? `Revenue ${new Date(selectedMonth + '-01').toLocaleString('default', { month: 'long', year: 'numeric' })}` :
                  'Revenue Overall'
                }
                value={`₹${getCurrentStats().totalRevenue.toLocaleString()}`}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                }
                color="green"
                trend={{ value: 8, direction: 'up', period: 'yesterday' }}
                onClick={() => router.push('/dashboard/admin/financial-statements')}
              />
              <EnhancedStatsCard
                title="Active Products"
                value={getCurrentStats().totalProducts}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
                color="indigo"
                onClick={() => router.push('/dashboard/admin/products')}
              />
              <EnhancedStatsCard
                title="Stock Alerts"
                value={getCurrentStats().lowStockItems}
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                }
                color="red"
                trend={getCurrentStats().lowStockItems > 0 ? { value: getCurrentStats().lowStockItems, direction: 'down', period: 'action needed' } : undefined}
                onClick={() => router.push('/dashboard/admin/inventory')}
              />
            </div>

            {/* Smart Notifications */}
            <SmartNotifications limit={3} />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Quick Actions */}
              <Card title="Quick Actions" subtitle="Most common tasks - organized for easy understanding">
                <div className="space-y-4">
                  {/* SELLING SECTION */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">🛒 SELLING</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/dashboard/admin/sales/pos" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                        🛒 Make New Sale
                      </Link>
                      <Link href="/dashboard/admin/sales" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                        📋 View All Sales
                      </Link>
                    </div>
                  </div>

                  {/* INVENTORY SECTION */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">📦 INVENTORY</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/dashboard/admin/products" className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                        🛢️ Oil Products
                      </Link>
                      <Link href="/dashboard/admin/inventory" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                        📦 Stock Levels
                      </Link>
                    </div>
                  </div>

                  {/* MONEY SECTION */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">💰 MONEY</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/dashboard/admin/stock-value" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                        📦 Stock Value
                      </Link>
                      <Link href="/dashboard/admin/savings-investments" className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                        💰 Investments
                      </Link>
                      <Link href="/dashboard/admin/book-value" className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                        🏢 Book Value
                      </Link>
                      <Link href="/dashboard/admin/financial-statements" className="bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                        📊 Financial Reports
                      </Link>
                    </div>
                  </div>

                  {/* SYSTEM SECTION */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">⚙️ SYSTEM</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <Link href="/dashboard/admin/users" className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                        👥 Staff Management
                      </Link>
                      <Link href="/dashboard/admin/documentation" className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                        📖 Help Guide
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Sales Overview */}
              <Card title="Sales Overview" subtitle="Recent sales performance">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Sales Today</span>
                    <span className="font-semibold">{stats.totalSales}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Revenue Today</span>
                    <span className="font-semibold">₹{stats.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="pt-2">
                  <Link href="/dashboard/admin/sales" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                      View all sales →
                    </Link>
                  </div>
                </div>
              </Card>

              {/* System Status */}
              <Card title="System Status" subtitle="Current system health">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Products</span>
                    <span className="font-semibold text-green-600">{stats.totalProducts} Active</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Low Stock</span>
                    <span className={`font-semibold ${stats.lowStockItems > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stats.lowStockItems} Items
                    </span>
                  </div>
                  <div className="pt-2">
                  <Link href="/dashboard/admin/inventory" className="text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                      Manage inventory →
                    </Link>
                  </div>
                </div>
              </Card>
            </div>

            {/* Recent Activity */}
            <RecentActivity activities={recentActivities} />
          </div>
        );

      case 'accountant':
        return (
          <div className="space-y-6">
            <div>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Accountant Dashboard</h1>
                <FilterToggle />
              </div>
              <p className="mt-2 text-gray-600">Financial overview and reporting center</p>
            </div>

            {/* Financial Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Total Revenue"
                value={`₹${getCurrentStats().totalRevenue.toLocaleString()}`}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                }
                color="green"
              />
              <StatsCard
                title="Total Sales"
                value={getCurrentStats().totalSales}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                }
                color="blue"
              />
              <StatsCard
                title="GST Collected"
                value={`₹${(getCurrentStats().totalRevenue * 0.05).toLocaleString()}`}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                color="purple"
              />
              <StatsCard
                title="Low Stock Items"
                value={getCurrentStats().lowStockItems}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                }
                color="red"
              />
            </div>

            {/* Financial Tools */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <Card title="Financial Statements" subtitle="Comprehensive financial reports">
                <div className="space-y-3">
                  <Link href="/dashboard/admin/financial-statements" className="block text-green-600 hover:text-green-500 text-sm font-medium">
                    📈 Profit & Loss Statement
                  </Link>
                  <Link href="/dashboard/admin/financial-statements" className="block text-blue-600 hover:text-blue-500 text-sm font-medium">
                    📊 Balance Sheet
                  </Link>
                  <Link href="/dashboard/admin/financial-statements" className="block text-purple-600 hover:text-purple-500 text-sm font-medium">
                    💰 Cash Flow Statement
                  </Link>
                  <div className="pt-2">
                    <Link href="/dashboard/admin/financial-statements" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center block transition-colors">
                      View All Financial Statements
                    </Link>
                  </div>
                </div>
              </Card>

              <Card title="Reports & Analytics" subtitle="Business intelligence and insights">
                <div className="space-y-3">
                  <Link href="/dashboard/admin/analytics" className="block text-purple-600 hover:text-purple-500 text-sm font-medium">
                    🧠 Business Analytics
                  </Link>
                  <Link href="/dashboard/admin/reports" className="block text-indigo-600 hover:text-indigo-500 text-sm font-medium">
                    📊 Sales Reports
                  </Link>
                  <Link href="/dashboard/admin/reports" className="block text-orange-600 hover:text-orange-500 text-sm font-medium">
                    📦 Inventory Reports
                  </Link>
                  <Link href="/dashboard/admin/reports" className="block text-red-600 hover:text-red-500 text-sm font-medium">
                    💸 Expense Analysis
                  </Link>
                  <div className="pt-2">
                    <Link href="/dashboard/admin/analytics" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center block transition-colors">
                      🧠 Advanced Analytics
                    </Link>
                  </div>
                </div>
              </Card>

              <Card title="Expense Management" subtitle="Track and manage expenses">
                <div className="space-y-3">
                  <Link href="/dashboard/admin/expenses" className="block text-red-600 hover:text-red-500 text-sm font-medium">
                    💳 View All Expenses
                  </Link>
                  <Link href="/dashboard/admin/expenses" className="block text-orange-600 hover:text-orange-500 text-sm font-medium">
                    📝 Add New Expense
                  </Link>
                  <Link href="/dashboard/admin/expenses" className="block text-yellow-600 hover:text-yellow-500 text-sm font-medium">
                    📋 Expense Categories
                  </Link>
                  <div className="pt-2">
                    <Link href="/dashboard/admin/expenses" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center block transition-colors">
                      Manage Expenses
                    </Link>
                  </div>
                </div>
              </Card>
            </div>

            {/* Quick Actions for Accountants */}
            <Card title="Quick Actions" subtitle="Common accounting tasks">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Link href="/dashboard/admin/expenses" className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors">
                  💸 Add Expense
                </Link>
                <Link href="/dashboard/admin/financial-statements" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors">
                  📈 P&L Statement
                </Link>
                <Link href="/dashboard/admin/analytics" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors">
                  🧠 Analytics
                </Link>
                <Link href="/dashboard/admin/reports" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium text-center transition-colors">
                  📊 Reports
                </Link>
              </div>
            </Card>
          </div>
        );

      case 'retail_staff':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Retail Staff Dashboard</h1>
              <p className="mt-2 text-gray-600">Sales and customer management center</p>
            </div>

            {/* Sales Stats */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <StatsCard
                title="Today's Sales"
                value={stats.totalSales}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                }
                color="blue"
              />
              <StatsCard
                title="Today's Revenue"
                value={`₹${stats.totalRevenue.toLocaleString()}`}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                }
                color="green"
              />
              <StatsCard
                title="Available Products"
                value={stats.totalProducts}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                }
                color="yellow"
              />
              <StatsCard
                title="Low Stock Alerts"
                value={stats.lowStockItems}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                }
                color="red"
              />
            </div>

            {/* Main Tools - Simplified for Staff */}
            <Card title="Daily Work Tools" subtitle="Everything you need for daily operations - organized simply">
              <div className="space-y-4">
                {/* SELLING SECTION */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">🛒 SELLING</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/dashboard/admin/sales/pos" className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                      🛒 Make New Sale
                    </Link>
                    <Link href="/dashboard/admin/sales" className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                      📋 View All Sales
                    </Link>
                    <Link href="/dashboard/admin/sales/retail" className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                      🏪 Shop Sales
                    </Link>
                    <Link href="/dashboard/admin/sales/canteen" className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                      🏢 Canteen Sales
                    </Link>
                  </div>
                </div>

                {/* INVENTORY SECTION */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">📦 INVENTORY</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/dashboard/admin/products" className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                      🛢️ Oil Products
                    </Link>
                    <Link href="/dashboard/admin/inventory" className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                      📦 Stock Levels
                    </Link>
                  </div>
                </div>

                {/* CUSTOMER SERVICE */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">👥 CUSTOMERS</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <Link href="/dashboard/admin/canteen-addresses" className="bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                      📍 Canteen Addresses
                    </Link>
                    <Link href="/dashboard/admin/documentation" className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-2 rounded-md text-sm font-medium text-center transition-colors">
                      📖 Help Guide
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            {/* Performance Overview */}
            <Card title="Performance Overview" subtitle="Your sales performance">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{stats.totalSales}</p>
                  <p className="text-sm text-gray-600">Sales Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">₹{stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Revenue Today</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{stats.totalProducts}</p>
                  <p className="text-sm text-gray-600">Products Available</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.lowStockItems}</p>
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                </div>
              </div>
            </Card>
          </div>
        );

      default:
        return (
          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-gray-900">Welcome to Trinity Oil Mills</h1>
            <p className="mt-4 text-gray-600">Please contact your administrator for access.</p>
          </div>
        );
    }
  };

  return getDashboardContent();
}