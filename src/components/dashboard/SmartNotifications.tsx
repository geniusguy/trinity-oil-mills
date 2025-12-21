import React, { useEffect, useState } from 'react';
import { Card, Button, LoadingSpinner } from '../ui';

interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  timestamp: Date;
  priority: 'low' | 'medium' | 'high';
}

interface SmartNotificationsProps {
  limit?: number;
}

export const SmartNotifications: React.FC<SmartNotificationsProps> = ({ limit = 5 }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      generateSmartNotifications();
    }
  }, [mounted]);

  const generateSmartNotifications = async () => {
    try {
      setLoading(true);
      
      // Fetch data for smart notifications
      const [salesRes, inventoryRes, expensesRes] = await Promise.all([
        fetch('/api/sales?limit=10'),
        fetch('/api/inventory/low-stock'),
        fetch('/api/expenses')
      ]);

      const salesData = await salesRes.json();
      const inventoryData = await inventoryRes.json();
      const expensesData = await expensesRes.json();

      const smartNotifications: Notification[] = [];

      // Low stock notifications
      if (inventoryData.lowStock?.length > 0) {
        inventoryData.lowStock.forEach((item: any) => {
          smartNotifications.push({
            id: `low-stock-${item.id}`,
            type: 'warning',
            title: '📦 Low Stock Alert',
            message: `${item.productName} is running low (${item.quantity} remaining)`,
            action: {
              label: 'Restock Now',
              href: '/dashboard/admin/inventory'
            },
            timestamp: new Date(),
            priority: 'high'
          });
        });
      }

      // Recent sales insights
      if (salesData.sales?.length > 0) {
        const todaySales = salesData.sales.filter((sale: any) => {
          const saleDate = new Date(sale.createdAt);
          const today = new Date();
          return saleDate.toDateString() === today.toDateString();
        });

        if (todaySales.length > 5) {
          smartNotifications.push({
            id: 'high-sales-day',
            type: 'success',
            title: '🎉 Great Sales Day!',
            message: `${todaySales.length} sales today - above average performance`,
            action: {
              label: 'View Sales',
              href: '/dashboard/admin/sales'
            },
            timestamp: new Date(),
            priority: 'medium'
          });
        }

        // Pending payments
        const pendingPayments = salesData.sales.filter((sale: any) => sale.paymentStatus === 'pending');
        if (pendingPayments.length > 0) {
          smartNotifications.push({
            id: 'pending-payments',
            type: 'warning',
            title: '💳 Pending Payments',
            message: `${pendingPayments.length} sales have pending payments`,
            action: {
              label: 'Review Payments',
              href: '/dashboard/admin/sales'
            },
            timestamp: new Date(),
            priority: 'medium'
          });
        }
      }

      // Business insights
      const currentHour = new Date().getHours();
      if (currentHour >= 9 && currentHour <= 18) {
        smartNotifications.push({
          id: 'business-hours',
          type: 'info',
          title: '🕒 Business Hours Active',
          message: 'Peak business hours - monitor inventory levels closely',
          timestamp: new Date(),
          priority: 'low'
        });
      }

      // Sort by priority and timestamp
      const sortedNotifications = smartNotifications
        .sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return b.timestamp.getTime() - a.timestamp.getTime();
        })
        .slice(0, limit);

      setNotifications(sortedNotifications);
    } catch (error) {
      console.error('Error generating notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      default: return 'ℹ️';
    }
  };

  const getNotificationColors = (type: string) => {
    switch (type) {
      case 'success': return 'border-green-200 bg-green-50 text-green-800';
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-800';
      case 'error': return 'border-red-200 bg-red-50 text-red-800';
      default: return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  if (!mounted) {
    return (
      <Card title="🔔 Smart Notifications" subtitle="AI-powered business insights">
        <div className="flex justify-center py-8">
          <div className="text-gray-500">Loading notifications...</div>
        </div>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card title="🔔 Smart Notifications" subtitle="AI-powered business insights">
        <div className="flex justify-center py-8">
          <LoadingSpinner text="Analyzing business data..." />
        </div>
      </Card>
    );
  }

  return (
    <Card title="🔔 Smart Notifications" subtitle="AI-powered business insights">
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">🎯</div>
            <p>All systems running smoothly!</p>
            <p className="text-sm">No urgent notifications at this time.</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${getNotificationColors(notification.type)} transition-all duration-200 hover:shadow-md`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    <h4 className="font-medium">{notification.title}</h4>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      notification.priority === 'high' ? 'bg-red-100 text-red-700' :
                      notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {notification.priority}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{notification.message}</p>
                  <p className="text-xs text-gray-500">
                    {notification.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                
                {notification.action && (
                  <div className="ml-4">
                    {notification.action.href ? (
                      <a
                        href={notification.action.href}
                        className="text-xs bg-white px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        {notification.action.label}
                      </a>
                    ) : (
                      <button
                        onClick={notification.action.onClick}
                        className="text-xs bg-white px-3 py-1 rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        {notification.action.label}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        
        {notifications.length > 0 && (
          <div className="pt-3 border-t border-gray-200">
            <button
              onClick={generateSmartNotifications}
              className="w-full text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              🔄 Refresh Insights
            </button>
          </div>
        )}
      </div>
    </Card>
  );
};
