import React from 'react';
import { Card } from '../ui';

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon,
  color = 'blue'
}) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    purple: 'bg-purple-500'
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`w-8 h-8 ${colorClasses[color]} rounded-md flex items-center justify-center`}>
            <div className="text-white">
              {icon}
            </div>
          </div>
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">
              {title}
            </dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">
                {value}
              </div>
              {change && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                  change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  <svg
                    className={`self-center flex-shrink-0 h-4 w-4 ${
                      change.type === 'increase' ? 'text-green-500' : 'text-red-500'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d={change.type === 'increase' 
                        ? "M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                        : "M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                      }
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="sr-only">
                    {change.type === 'increase' ? 'Increased' : 'Decreased'} by
                  </span>
                  {Math.abs(change.value)}%
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </Card>
  );
};

