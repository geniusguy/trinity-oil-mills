'use client';

import React from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface FinancialAnalyticsChartProps {
  type: 'revenue-trend' | 'expense-breakdown' | 'profit-margin' | 'cash-flow';
  data: any[];
  height?: number;
}

export const FinancialAnalyticsChart: React.FC<FinancialAnalyticsChartProps> = ({ 
  type, 
  data, 
  height = 300 
}) => {
  const colors = {
    primary: '#16a34a',   // green-600
    secondary: '#2563eb', // blue-600
    accent: '#dc2626',    // red-600
    warning: '#ea580c',   // orange-600
    success: '#059669',   // emerald-600
    purple: '#9333ea',    // purple-600
  };

  const pieColors = [colors.primary, colors.secondary, colors.accent, colors.warning, colors.success, colors.purple];

  const renderChart = () => {
    switch (type) {
      case 'revenue-trend':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="period" 
                stroke="#666"
                fontSize={12}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                labelStyle={{ color: '#333' }}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke={colors.primary} 
                fill={colors.primary}
                fillOpacity={0.3}
                strokeWidth={2}
                name="Revenue"
              />
              <Area 
                type="monotone" 
                dataKey="profit" 
                stroke={colors.secondary} 
                fill={colors.secondary}
                fillOpacity={0.2}
                strokeWidth={2}
                name="Profit"
              />
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'expense-breakdown':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="amount"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                labelLine={false}
                fontSize={12}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Amount']}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'profit-margin':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="category" 
                stroke="#666"
                fontSize={12}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Profit Margin']}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Bar 
                dataKey="margin" 
                fill={colors.primary}
                radius={[4, 4, 0, 0]}
                name="Profit Margin %"
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'cash-flow':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                stroke="#666"
                fontSize={12}
              />
              <YAxis 
                stroke="#666"
                fontSize={12}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                formatter={(value: number, name: string) => [`₹${value.toLocaleString()}`, name]}
                contentStyle={{ 
                  backgroundColor: '#fff', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="cashIn" 
                stroke={colors.success} 
                strokeWidth={3}
                dot={{ fill: colors.success, strokeWidth: 2, r: 4 }}
                name="Cash Inflow"
              />
              <Line 
                type="monotone" 
                dataKey="cashOut" 
                stroke={colors.accent} 
                strokeWidth={3}
                dot={{ fill: colors.accent, strokeWidth: 2, r: 4 }}
                name="Cash Outflow"
              />
              <Line 
                type="monotone" 
                dataKey="netCashFlow" 
                stroke={colors.secondary} 
                strokeWidth={3}
                dot={{ fill: colors.secondary, strokeWidth: 2, r: 4 }}
                name="Net Cash Flow"
              />
            </LineChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-center text-gray-500">Chart type not supported</div>;
    }
  };

  return (
    <div className="w-full">
      {renderChart()}
    </div>
  );
};

