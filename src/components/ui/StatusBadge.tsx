import React from 'react';

interface StatusBadgeProps {
  status: string;
  type?: 'payment' | 'shipment' | 'general';
  size?: 'sm' | 'md' | 'lg';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'general',
  size = 'md'
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base'
  };

  const getStatusConfig = () => {
    const lowerStatus = status.toLowerCase();
    
    // Payment status configurations
    if (type === 'payment') {
      switch (lowerStatus) {
        case 'paid':
          return { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' };
        case 'pending':
          return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' };
        case 'partial':
          return { bg: 'bg-orange-100', text: 'text-orange-800', icon: '🔶' };
        case 'refunded':
          return { bg: 'bg-purple-100', text: 'text-purple-800', icon: '↩️' };
        case 'failed':
          return { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' };
        default:
          return { bg: 'bg-gray-100', text: 'text-gray-800', icon: '❓' };
      }
    }
    
    // Shipment status configurations
    if (type === 'shipment') {
      switch (lowerStatus) {
        case 'delivered':
          return { bg: 'bg-green-100', text: 'text-green-800', icon: '📦' };
        case 'shipped':
          return { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🚚' };
        case 'pending':
          return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' };
        case 'cancelled':
          return { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' };
        case 'walk_in_delivery':
          return { bg: 'bg-teal-100', text: 'text-teal-800', icon: '🚶' };
        default:
          return { bg: 'bg-gray-100', text: 'text-gray-800', icon: '📋' };
      }
    }
    
    // General status configurations
    switch (lowerStatus) {
      case 'active':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' };
      case 'inactive':
        return { bg: 'bg-gray-100', text: 'text-gray-800', icon: '⭕' };
      case 'good':
        return { bg: 'bg-green-100', text: 'text-green-800', icon: '🟢' };
      case 'low':
        return { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '🟡' };
      case 'critical':
        return { bg: 'bg-red-100', text: 'text-red-800', icon: '🔴' };
      default:
        return { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔵' };
    }
  };

  const config = getStatusConfig();

  return (
    <span className={`
      inline-flex items-center gap-1 font-medium rounded-full
      ${sizeClasses[size]} ${config.bg} ${config.text}
    `}>
      <span>{config.icon}</span>
      <span className="capitalize">{status.replace('_', ' ')}</span>
    </span>
  );
};

