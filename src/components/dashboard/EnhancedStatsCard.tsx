import React, { useEffect, useState } from 'react';
import { Card, LoadingSpinner } from '../ui';

interface EnhancedStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
  trend?: {
    value: number;
    direction: 'up' | 'down';
    period: string;
  };
  loading?: boolean;
  onClick?: () => void;
}

export const EnhancedStatsCard: React.FC<EnhancedStatsCardProps> = ({
  title,
  value,
  icon,
  color,
  trend,
  loading = false,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconText: 'text-blue-600',
      text: 'text-blue-600',
      trendUp: 'text-blue-600',
      trendDown: 'text-blue-600'
    },
    green: {
      bg: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconText: 'text-green-600',
      text: 'text-green-600',
      trendUp: 'text-green-600',
      trendDown: 'text-red-600'
    },
    yellow: {
      bg: 'bg-yellow-50',
      iconBg: 'bg-yellow-100',
      iconText: 'text-yellow-600',
      text: 'text-yellow-600',
      trendUp: 'text-green-600',
      trendDown: 'text-red-600'
    },
    red: {
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
      iconText: 'text-red-600',
      text: 'text-red-600',
      trendUp: 'text-green-600',
      trendDown: 'text-red-600'
    },
    purple: {
      bg: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconText: 'text-purple-600',
      text: 'text-purple-600',
      trendUp: 'text-green-600',
      trendDown: 'text-red-600'
    },
    indigo: {
      bg: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      iconText: 'text-indigo-600',
      text: 'text-indigo-600',
      trendUp: 'text-green-600',
      trendDown: 'text-red-600'
    }
  };

  const colors = colorClasses[color];

  return (
    <div
      className={`
        ${colors.bg} rounded-lg p-6 border-2 border-transparent
        transition-all duration-200 cursor-pointer
        ${onClick ? 'hover:border-gray-200 hover:shadow-lg' : ''}
        ${isHovered ? 'transform scale-105' : ''}
      `}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          
          {loading ? (
            <div className="flex items-center">
              <LoadingSpinner size="sm" color="gray" />
              <span className="ml-2 text-gray-500">Loading...</span>
            </div>
          ) : (
            <div className="flex items-baseline space-x-2">
              <p className="text-3xl font-bold text-gray-900">{value}</p>
              {trend && (
                <div className={`flex items-center text-sm ${
                  trend.direction === 'up' ? colors.trendUp : colors.trendDown
                }`}>
                  <span className="mr-1">
                    {trend.direction === 'up' ? '↗️' : '↘️'}
                  </span>
                  <span className="font-medium">
                    {trend.value}% {trend.period}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className={`${colors.iconBg} ${colors.iconText} p-3 rounded-lg`}>
          {icon}
        </div>
      </div>
      
      {trend && (
        <div className="mt-3 text-xs text-gray-500">
          Compared to previous {trend.period}
        </div>
      )}
    </div>
  );
};

