'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ProductSalesChartProps {
  data: Array<{
    product: string;
    sales: number;
    quantity: number;
  }>;
}

export const ProductSalesChart: React.FC<ProductSalesChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="product" />
          <YAxis />
          <Tooltip formatter={(value) => [`₹${value}`, '']} />
          <Legend />
          <Bar dataKey="sales" fill="#10b981" name="Sales (₹)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
