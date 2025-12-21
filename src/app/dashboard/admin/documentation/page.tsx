'use client';

import { useState } from 'react';

interface Section {
  id: string;
  title: string;
  icon: JSX.Element;
  content: JSX.Element;
}

export default function DocumentationPage() {
  const [activeSection, setActiveSection] = useState('overview');

  const sections: Section[] = [
    {
      id: 'overview',
      title: 'Overview & Quick Start',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-green-800 mb-4">Welcome to Trinity Oil Mills Management System</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-green-700">
              <div>
                <h4 className="font-medium mb-2">System Access:</h4>
                <ul className="space-y-1">
                  <li>• Application URL: <code className="bg-green-100 px-2 py-1 rounded">http://localhost:3001</code></li>
                  <li>• Login Page: <code className="bg-green-100 px-2 py-1 rounded">/login</code></li>
                  <li>• Dashboard: <code className="bg-green-100 px-2 py-1 rounded">/dashboard</code></li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">User Roles:</h4>
                <ul className="space-y-1">
                  <li>• <span className="font-medium">Admin:</span> Full system access</li>
                  <li>• <span className="font-medium">Accountant:</span> Financial data access</li>
                  <li>• <span className="font-medium">Staff:</span> Sales & inventory access</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Navigation & Layout</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Sidebar Sections:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Dashboard (Home)</li>
                  <li>• Products Management</li>
                  <li>• Inventory Tracking</li>
                  <li>• Sales (Retail/Canteen/New)</li>
                  <li>• Canteen Addresses</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-green-700 mb-2">Financial:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• Expenses Management</li>
                  <li>• Price Management (NEW)</li>
                  <li>• Historical P&L Reports (NEW)</li>
                  <li>• Financial Statements</li>
                  <li>• Reports & Analytics</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-green-700 mb-2">Administration:</h4>
                <ul className="space-y-1 text-gray-600">
                  <li>• User Management</li>
                  <li>• Raw Materials</li>
                  <li>• Cost Calculator</li>
                  <li>• Analytics & Automation</li>
                  <li>• Documentation (this page)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'products',
      title: 'Products Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Managing Products</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Accessing Products:</h4>
                <p className="text-sm text-gray-600 mb-2">Navigate to: <code className="bg-gray-100 px-2 py-1 rounded">/dashboard/admin/products</code></p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-700 mb-2">Adding New Products:</h4>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                  <li>Click "Add New Product" button</li>
                  <li>Enter product details:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li><strong>Name:</strong> Product name (e.g., "Groundnut Oil")</li>
                      <li><strong>Unit:</strong> Measurement unit (L, ml, kg)</li>
                      <li><strong>GST Rate:</strong> Tax percentage (0%, 5%, 12%, 18%, 28%)</li>
                      <li><strong>Pricing:</strong> Base price per unit</li>
                    </ul>
                  </li>
                  <li>Save the product</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Best Practices:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                  <li>Use consistent units (L for liters, ml for milliliters, kg for kilograms)</li>
                  <li>Ensure accurate GST rates according to government regulations</li>
                  <li>Regular price updates based on market conditions</li>
                  <li>Archive discontinued products instead of deleting</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'inventory',
      title: 'Inventory Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Inventory Tracking</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Accessing Inventory:</h4>
                <p className="text-sm text-gray-600 mb-2">Navigate to: <code className="bg-gray-100 px-2 py-1 rounded">/dashboard/admin/inventory</code></p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-700 mb-2">Stock Management:</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Stock-In (Receiving):</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li>Record new stock arrivals</li>
                      <li>Update quantities after production</li>
                      <li>Add packaging materials</li>
                      <li>Include purchase/production date</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Stock-Out (Usage):</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                      <li>Record sales transactions</li>
                      <li>Track production material usage</li>
                      <li>Account for wastage/damage</li>
                      <li>Include reason for stock-out</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-2">Packaging Inventory:</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">Track packaging materials:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li>PET Bottles (1L, 500ml, 200ml)</li>
                    <li>Cardboard Boxes</li>
                    <li>Packaging Tape</li>
                    <li>Labels and other materials</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sales',
      title: 'Sales Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Sales Workflows</h3>
            <div className="space-y-6">
              
              <div>
                <h4 className="font-medium text-green-700 mb-3">Retail Sales</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-700 mb-2">Path: <code className="bg-blue-100 px-2 py-1 rounded">/dashboard/admin/sales/retail</code></p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                    <li>Select products and quantities</li>
                    <li>Apply GST calculations automatically</li>
                    <li>Add discounts if applicable</li>
                    <li>Record payment method (Cash/Card/UPI)</li>
                    <li>Generate invoice/receipt</li>
                  </ol>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">Canteen/Wholesale Sales</h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <p className="text-sm text-purple-700 mb-2">Path: <code className="bg-purple-100 px-2 py-1 rounded">/dashboard/admin/sales/canteen</code></p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-purple-700">
                    <li>Select canteen address from list</li>
                    <li>Add bulk quantities</li>
                    <li>Apply wholesale pricing</li>
                    <li>Generate formal invoice with GST details</li>
                    <li>Track payment terms and due dates</li>
                  </ol>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">POS System</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-700 mb-2">Path: <code className="bg-green-100 px-2 py-1 rounded">/dashboard/admin/sales/pos</code></p>
                  <p className="text-sm text-green-700">Modern point-of-sale interface for creating both retail and canteen sales with automatic packaging deduction.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'canteen',
      title: 'Canteen Addresses',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Managing Canteen Addresses</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Purpose:</h4>
                <p className="text-sm text-gray-600">Manage B2B customer addresses for bulk/wholesale sales to canteens, restaurants, and institutional buyers.</p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-700 mb-2">Accessing:</h4>
                <p className="text-sm text-gray-600 mb-2">Navigate to: <code className="bg-gray-100 px-2 py-1 rounded">/dashboard/admin/canteen-addresses</code></p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-700 mb-2">Adding New Address:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Click "Add New Address"</li>
                  <li>Enter customer details:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>Business/Canteen name</li>
                      <li>Complete address</li>
                      <li>Contact person and phone</li>
                      <li>GST number (if applicable)</li>
                      <li>Payment terms</li>
                    </ul>
                  </li>
                  <li>Save and use in canteen sales</li>
                </ol>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Usage in Sales:</h4>
                <p className="text-sm text-blue-700">These addresses appear in the canteen sales workflow for quick selection and automatic invoice generation with proper billing details.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'expenses',
      title: 'Expense Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recording Expenses</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Accessing Expenses:</h4>
                <p className="text-sm text-gray-600 mb-2">Navigate to: <code className="bg-gray-100 px-2 py-1 rounded">/dashboard/admin/expenses</code></p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-700 mb-2">Adding Expenses:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Click "Add New Expense"</li>
                  <li>Enter expense details:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li><strong>Category:</strong> Type of expense</li>
                      <li><strong>Amount:</strong> Expense amount</li>
                      <li><strong>Date:</strong> When expense occurred</li>
                      <li><strong>Description:</strong> Brief details</li>
                    </ul>
                  </li>
                  <li>Save for financial reporting</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-2">Expense Categories:</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h5 className="font-medium text-gray-700 mb-2">Operating Expenses:</h5>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                      <li>Rent & Utilities</li>
                      <li>Transportation</li>
                      <li>Packaging Materials</li>
                      <li>Marketing & Advertising</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h5 className="font-medium text-gray-700 mb-2">Administrative:</h5>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                      <li>Payroll & Salaries</li>
                      <li>Office Supplies</li>
                      <li>Maintenance & Repairs</li>
                      <li>Professional Services</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Best Practices:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                  <li>Record expenses daily for accuracy</li>
                  <li>Use consistent category names</li>
                  <li>Keep receipts and documentation</li>
                  <li>Regular review for budget tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'price-management',
      title: 'Price Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Historical Price Management</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Accessing Price Management:</h4>
                <p className="text-sm text-gray-600 mb-2">Navigate to: <code className="bg-gray-100 px-2 py-1 rounded">/dashboard/admin/price-management</code></p>
                <p className="text-sm text-gray-500">Note: Available to Admin and Accountant roles</p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-700 mb-2">Key Features:</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-800 mb-2">Price History Tracking:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                      <li>View complete price history for any product</li>
                      <li>Track base price, retail price, and GST rates</li>
                      <li>See effective dates and end dates</li>
                      <li>Add notes for price change reasons</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h5 className="font-medium text-purple-800 mb-2">Price Updates:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm text-purple-700">
                      <li>Update prices with specific effective dates</li>
                      <li>Automatic closure of previous price periods</li>
                      <li>Bulk price updates for multiple products</li>
                      <li>Audit trail for all price changes</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-2">Updating Product Prices:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Select the product you want to update</li>
                  <li>Click "Update Price" to open the form</li>
                  <li>Enter new prices:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li><strong>Base Price:</strong> Cost basis for the product</li>
                      <li><strong>Retail Price:</strong> Selling price to customers</li>
                      <li><strong>GST Rate:</strong> Tax percentage</li>
                      <li><strong>Effective Date:</strong> When the new price takes effect</li>
                      <li><strong>Notes:</strong> Reason for price change</li>
                    </ul>
                  </li>
                  <li>Save to create new price history entry</li>
                </ol>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Benefits of Historical Pricing:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                  <li><strong>Accurate P&L:</strong> Calculate profits using correct prices for each sale</li>
                  <li><strong>Audit Trail:</strong> Complete record of all price changes</li>
                  <li><strong>Trend Analysis:</strong> Analyze pricing trends over time</li>
                  <li><strong>Compliance:</strong> Maintain proper records for tax purposes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'historical-pnl',
      title: 'Historical P&L Reports',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Historical Profit & Loss Analysis</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Accessing Historical P&L:</h4>
                <p className="text-sm text-gray-600 mb-2">Navigate to: <code className="bg-gray-100 px-2 py-1 rounded">/dashboard/admin/historical-pnl</code></p>
                <p className="text-sm text-gray-500">Note: Available to Admin and Accountant roles</p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-700 mb-2">Key Features:</h4>
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-800 mb-2">Accurate Historical Analysis:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                      <li>P&L calculations using prices that were active during each sale</li>
                      <li>Production costs calculated with historical raw material prices</li>
                      <li>True profit margins for any time period</li>
                      <li>Eliminates pricing distortions in financial analysis</li>
                    </ul>
                  </div>
                  
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h5 className="font-medium text-purple-800 mb-2">Period Comparisons:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm text-purple-700">
                      <li>Compare current period with previous period</li>
                      <li>Custom date range comparisons</li>
                      <li>Revenue, cost, and profit change analysis</li>
                      <li>Margin change tracking</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-2">Generating Reports:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Select start and end dates for the analysis period</li>
                  <li>Choose comparison option:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li><strong>No Comparison:</strong> Single period analysis</li>
                      <li><strong>Previous Period:</strong> Automatic comparison with equivalent previous period</li>
                    </ul>
                  </li>
                  <li>Click "Generate Report" to create the analysis</li>
                  <li>Review detailed metrics and sales breakdown</li>
                </ol>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-2">Report Components:</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h5 className="font-medium text-gray-700 mb-2">Summary Metrics:</h5>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                      <li>Total Revenue</li>
                      <li>Total Historical Costs</li>
                      <li>Net Profit</li>
                      <li>Profit Margin Percentage</li>
                    </ul>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <h5 className="font-medium text-gray-700 mb-2">Detailed Breakdown:</h5>
                    <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
                      <li>Individual sale analysis</li>
                      <li>Revenue vs. cost per transaction</li>
                      <li>Profit per sale</li>
                      <li>Time-based profit trends</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Why Historical P&L Matters:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                  <li><strong>True Performance:</strong> See actual profitability using correct historical prices</li>
                  <li><strong>Accurate Comparisons:</strong> Compare periods fairly using their respective pricing</li>
                  <li><strong>Better Decisions:</strong> Make informed pricing and business decisions</li>
                  <li><strong>Regulatory Compliance:</strong> Maintain accurate financial records</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'financial-features',
      title: 'Financial Features ⭐ NEW',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-800 mb-4 flex items-center gap-2">
              <span>💰</span>
              New Financial Management Tools
            </h3>
            <p className="text-blue-700 mb-4">
              Three powerful new features to track your financial health and make better business decisions.
            </p>
            <div className="text-center">
              <a 
                href="/dashboard/admin/help/financial-features" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium inline-flex items-center gap-2 transition-colors"
              >
                <span>📖</span>
                Complete Financial Features Guide
              </a>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <span className="text-4xl mb-2 block">📦</span>
                <h4 className="font-semibold text-gray-800">Total Stock Value</h4>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Purpose:</strong> Real-time inventory valuation</p>
                <p><strong>Shows:</strong> Cost vs retail value, profit potential</p>
                <p><strong>Benefits:</strong> Optimize inventory investment</p>
              </div>
              <div className="mt-4 text-center">
                <a href="/dashboard/admin/stock-value" className="text-blue-600 hover:text-blue-500 font-medium">
                  Open Stock Value →
                </a>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <span className="text-4xl mb-2 block">💰</span>
                <h4 className="font-semibold text-gray-800">Investments</h4>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Purpose:</strong> Portfolio tracking & P&L</p>
                <p><strong>Types:</strong> FDs, Mutual Funds, Stocks, Gold</p>
                <p><strong>Benefits:</strong> Monitor financial growth</p>
              </div>
              <div className="mt-4 text-center">
                <a href="/dashboard/admin/savings-investments" className="text-green-600 hover:text-green-500 font-medium">
                  Open Investments →
                </a>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <span className="text-4xl mb-2 block">🏢</span>
                <h4 className="font-semibold text-gray-800">Book Value</h4>
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p><strong>Purpose:</strong> Company net worth calculation</p>
                <p><strong>Formula:</strong> Assets - Liabilities</p>
                <p><strong>Benefits:</strong> Track company growth</p>
              </div>
              <div className="mt-4 text-center">
                <a href="/dashboard/admin/book-value" className="text-purple-600 hover:text-purple-500 font-medium">
                  Open Book Value →
                </a>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h4 className="font-medium text-yellow-800 mb-3">🎯 Quick Start Tips</h4>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-yellow-700">
              <div>
                <p className="font-medium mb-2">For Stock Value:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check weekly for inventory optimization</li>
                  <li>Focus on high-value, slow-moving items</li>
                  <li>Use for pricing and restocking decisions</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">For Investments:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Start by adding your existing FDs and savings</li>
                  <li>Update current values monthly</li>
                  <li>Track different investment types</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">For Book Value:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Review monthly to track company growth</li>
                  <li>Focus on improving asset efficiency ratios</li>
                  <li>Use insights for business planning</li>
                </ul>
              </div>
              <div>
                <p className="font-medium mb-2">Access Requirements:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Admin or Accountant role required</li>
                  <li>Available on both web and mobile apps</li>
                  <li>Real-time calculations using live data</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'financial',
      title: 'Financial Statements',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Financial Reporting</h3>
            <div className="space-y-6">
              
              <div>
                <h4 className="font-medium text-green-700 mb-2">Accessing Financial Statements:</h4>
                <p className="text-sm text-gray-600 mb-4">Navigate to: <code className="bg-gray-100 px-2 py-1 rounded">/dashboard/admin/financial-statements</code></p>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">Profit & Loss (P&L) Statement</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="space-y-2 text-sm text-blue-700">
                    <p><strong>Purpose:</strong> Shows profitability over a specific period</p>
                    <p><strong>Calculation:</strong></p>
                    <ul className="list-disc list-inside ml-4 space-y-1">
                      <li>Revenue (Sales) − COGS (Production/Materials) = Gross Profit</li>
                      <li>Gross Profit − Operating Expenses = Operating Profit</li>
                      <li>+/− Other Income/Expenses = Net Profit</li>
                    </ul>
                    <p><strong>Data Sources:</strong> Sales records, production costs, expense entries</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">Balance Sheet</h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="space-y-2 text-sm text-purple-700">
                    <p><strong>Purpose:</strong> Shows financial position at a specific date</p>
                    <p><strong>Formula:</strong> Assets = Liabilities + Equity</p>
                    <div className="grid md:grid-cols-3 gap-3 mt-2">
                      <div>
                        <p className="font-medium">Assets:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                          <li>Cash & Equivalents</li>
                          <li>Accounts Receivable</li>
                          <li>Inventory Value</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Liabilities:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                          <li>Accounts Payable</li>
                          <li>Outstanding Expenses</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Equity:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                          <li>Retained Earnings</li>
                          <li>Current Period Profit</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">Cash Flow Statement</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="space-y-2 text-sm text-green-700">
                    <p><strong>Purpose:</strong> Tracks cash movement over a period</p>
                    <div className="grid md:grid-cols-3 gap-3 mt-2">
                      <div>
                        <p className="font-medium">Operating Activities:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                          <li>Cash from sales</li>
                          <li>Cash for expenses</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Investing Activities:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                          <li>Equipment purchases</li>
                          <li>Asset sales</li>
                        </ul>
                      </div>
                      <div>
                        <p className="font-medium">Financing Activities:</p>
                        <ul className="list-disc list-inside text-xs space-y-1">
                          <li>Loans received</li>
                          <li>Owner investments</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Data Requirements:</h4>
                <p className="text-sm text-red-700">Financial statements require data from sales, expenses, and production. If sections show zero, ensure you have recorded transactions for the selected period.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Reports and Analytics</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Accessing Reports:</h4>
                <p className="text-sm text-gray-600 mb-2">Navigate to: <code className="bg-gray-100 px-2 py-1 rounded">/dashboard/admin/reports</code></p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-700 mb-2">Available Reports:</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h5 className="font-medium text-blue-800 mb-2">Sales Reports:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm text-blue-700">
                      <li>Daily/Weekly/Monthly sales trends</li>
                      <li>Product performance analysis</li>
                      <li>Customer segment analysis</li>
                      <li>Payment method breakdown</li>
                    </ul>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h5 className="font-medium text-purple-800 mb-2">Inventory Reports:</h5>
                    <ul className="list-disc list-inside space-y-1 text-sm text-purple-700">
                      <li>Current stock levels</li>
                      <li>Stock movement history</li>
                      <li>Low stock alerts</li>
                      <li>Packaging material usage</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-2">Report Filters:</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                    <li><strong>Date Range:</strong> Filter by specific periods</li>
                    <li><strong>Product Category:</strong> Focus on specific products</li>
                    <li><strong>Customer Type:</strong> Retail vs. Canteen sales</li>
                    <li><strong>Payment Method:</strong> Cash, Card, UPI analysis</li>
                  </ul>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Best Practices:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                  <li>Generate reports regularly for trend analysis</li>
                  <li>Use date filters to focus on specific periods</li>
                  <li>Export reports for external analysis if needed</li>
                  <li>Share insights with team for better decision making</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'users',
      title: 'User Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Managing Users</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-green-700 mb-2">Accessing User Management:</h4>
                <p className="text-sm text-gray-600 mb-2">Navigate to: <code className="bg-gray-100 px-2 py-1 rounded">/dashboard/admin/users</code></p>
                <p className="text-sm text-gray-500">Note: Only available to Admin users</p>
              </div>
              
              <div>
                <h4 className="font-medium text-green-700 mb-2">User Roles & Permissions:</h4>
                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <h5 className="font-medium text-red-800">Admin</h5>
                    <p className="text-sm text-red-700">Full system access including user management, financial data, and system settings</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h5 className="font-medium text-blue-800">Accountant</h5>
                    <p className="text-sm text-blue-700">Access to financial statements, reports, expenses, and sales data</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h5 className="font-medium text-green-800">Staff</h5>
                    <p className="text-sm text-green-700">Access to sales entry, inventory management, and basic reporting</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-2">Adding New Users:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
                  <li>Click "Add New User"</li>
                  <li>Enter user details:
                    <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                      <li>Full name and email</li>
                      <li>Strong password (min 8 characters)</li>
                      <li>Appropriate role based on responsibilities</li>
                    </ul>
                  </li>
                  <li>Save and share credentials securely</li>
                </ol>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-2">Security Best Practices:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-yellow-700">
                  <li>Follow principle of least privilege (minimal permissions)</li>
                  <li>Regular password updates</li>
                  <li>Remove access for inactive users</li>
                  <li>Monitor user activity logs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Common Issues & Solutions</h3>
            <div className="space-y-6">
              
              <div>
                <h4 className="font-medium text-red-700 mb-2">Login Issues</h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium text-red-800">Problem:</p>
                      <p className="text-red-700">&quot;Invalid credentials&quot; or login not working</p>
                    </div>
                    <div>
                      <p className="font-medium text-red-800">Solutions:</p>
                      <ul className="list-disc list-inside text-red-700 space-y-1">
                        <li>Verify username/email and password</li>
                        <li>Check for caps lock or typing errors</li>
                        <li>Contact admin for password reset</li>
                        <li>Clear browser cache and cookies</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-red-700 mb-2">Financial Data Issues</h4>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium text-orange-800">Problem:</p>
                      <p className="text-orange-700">&quot;Failed to fetch financial data&quot; or zeros in reports</p>
                    </div>
                    <div>
                      <p className="font-medium text-orange-800">Solutions:</p>
                      <ul className="list-disc list-inside text-orange-700 space-y-1">
                        <li>Ensure you have sales, expenses, and production data for the selected period</li>
                        <li>Check if the date range contains any transactions</li>
                        <li>Verify API endpoints are accessible</li>
                        <li>Check browser developer console for errors</li>
                        <li>Refresh the page and try again</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-red-700 mb-2">Page Loading Issues</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium text-yellow-800">Problem:</p>
                      <p className="text-yellow-700">Pages not loading or 404 errors</p>
                    </div>
                    <div>
                      <p className="font-medium text-yellow-800">Solutions:</p>
                      <ul className="list-disc list-inside text-yellow-700 space-y-1">
                        <li>Ensure application is running on correct port (3001)</li>
                        <li>Check if you have proper permissions for the page</li>
                        <li>Use correct URLs starting with <code>/dashboard</code></li>
                        <li>Clear browser cache and hard refresh (Ctrl+F5)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-red-700 mb-2">Performance Issues</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium text-blue-800">Problem:</p>
                      <p className="text-blue-700">Slow loading or unresponsive interface</p>
                    </div>
                    <div>
                      <p className="font-medium text-blue-800">Solutions:</p>
                      <ul className="list-disc list-inside text-blue-700 space-y-1">
                        <li>Use pagination for large data sets</li>
                        <li>Apply date filters to limit data range</li>
                        <li>Avoid generating very large reports</li>
                        <li>Close unnecessary browser tabs</li>
                        <li>Check system resources and network connection</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-2">Getting Help:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                  <li>Check this documentation first</li>
                  <li>Contact system administrator</li>
                  <li>Provide error messages and screenshots</li>
                  <li>Note the exact steps that led to the issue</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'daily-checklist',
      title: 'Daily Operations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Daily Operations Checklist</h3>
            <div className="space-y-6">
              
              <div>
                <h4 className="font-medium text-green-700 mb-3">Morning Setup</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-green-700">
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Login to the system and check dashboard overview</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Review previous day's sales and inventory levels</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Check for low stock alerts and reorder if needed</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Verify packaging material availability</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">During Operations</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-blue-700">
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Record all sales transactions immediately</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Update inventory after each sale or stock movement</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Enter expenses as they occur</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Process production batches and update costs</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">End of Day</h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-purple-700">
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Verify all sales are recorded correctly</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Reconcile cash and payment methods</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Review daily sales report</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Plan for next day's operations</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">Weekly Tasks</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-yellow-700">
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Generate and review P&L statement</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Analyze sales trends and product performance</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Update inventory counts and reconcile discrepancies</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Review and categorize all expenses</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">Monthly Tasks</h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-red-700">
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Generate complete financial statements (P&L, Balance Sheet, Cash Flow)</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Review user access and permissions</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Backup important data</span>
                    </li>
                    <li className="flex items-start">
                      <input type="checkbox" className="mt-1 mr-2" />
                      <span>Plan for next month's operations and budget</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'tips',
      title: 'Tips & Best Practices',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      content: (
        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Tips & Best Practices</h3>
            <div className="space-y-6">
              
              <div>
                <h4 className="font-medium text-green-700 mb-3">Data Entry Tips</h4>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-green-700">
                    <li><strong>Consistency:</strong> Use consistent naming conventions for products, categories, and customers</li>
                    <li><strong>Accuracy:</strong> Double-check quantities, prices, and dates before saving</li>
                    <li><strong>Timeliness:</strong> Enter data as transactions occur, not at end of day</li>
                    <li><strong>Completeness:</strong> Fill all required fields and add descriptions where helpful</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">Financial Management</h4>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-blue-700">
                    <li><strong>Regular Reviews:</strong> Check financial statements weekly, not just monthly</li>
                    <li><strong>Expense Categories:</strong> Use consistent expense categories for better reporting</li>
                    <li><strong>Date Ranges:</strong> Use appropriate date ranges for meaningful comparisons</li>
                    <li><strong>Backup Data:</strong> Regularly export or backup financial data</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">Inventory Management</h4>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-purple-700">
                    <li><strong>Stock Levels:</strong> Set minimum stock levels and reorder points</li>
                    <li><strong>FIFO Method:</strong> Use First-In-First-Out for oil products to maintain quality</li>
                    <li><strong>Packaging Tracking:</strong> Monitor packaging material usage closely</li>
                    <li><strong>Regular Audits:</strong> Conduct physical inventory counts monthly</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">Security & Access</h4>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-red-700">
                    <li><strong>Strong Passwords:</strong> Use complex passwords and change them regularly</li>
                    <li><strong>Role-Based Access:</strong> Give users only the permissions they need</li>
                    <li><strong>Regular Logout:</strong> Log out when away from the system</li>
                    <li><strong>Monitor Activity:</strong> Review user activity logs regularly</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">Performance Optimization</h4>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-yellow-700">
                    <li><strong>Use Filters:</strong> Apply date and category filters for faster loading</li>
                    <li><strong>Pagination:</strong> Use pagination for large data sets</li>
                    <li><strong>Browser Cache:</strong> Clear browser cache if experiencing issues</li>
                    <li><strong>Regular Maintenance:</strong> Archive old data that's no longer needed</li>
                  </ul>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-green-700 mb-3">Keyboard Shortcuts</h4>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
                    <div>
                      <h5 className="font-medium mb-2">Navigation:</h5>
                      <ul className="space-y-1">
                        <li><kbd className="bg-gray-200 px-2 py-1 rounded">Ctrl + /</kbd> - Search</li>
                        <li><kbd className="bg-gray-200 px-2 py-1 rounded">Esc</kbd> - Close modals</li>
                        <li><kbd className="bg-gray-200 px-2 py-1 rounded">Tab</kbd> - Navigate forms</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">Actions:</h5>
                      <ul className="space-y-1">
                        <li><kbd className="bg-gray-200 px-2 py-1 rounded">Ctrl + S</kbd> - Save forms</li>
                        <li><kbd className="bg-gray-200 px-2 py-1 rounded">Ctrl + Enter</kbd> - Submit</li>
                        <li><kbd className="bg-gray-200 px-2 py-1 rounded">Ctrl + R</kbd> - Refresh</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentSection = sections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Navigation Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold text-gray-800">System Documentation</h1>
            <p className="text-sm text-gray-600 mt-1">Complete user guide and training materials</p>
          </div>
          
          <nav className="p-4">
            <ul className="space-y-1">
              {sections.map((section) => {
                return (
                  <li key={section.id}>
                    <button
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        activeSection === section.id
                          ? 'bg-green-100 text-green-800 border border-green-200'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="w-5 h-5 mr-3">
                        {section.icon}
                      </span>
                      {section.title}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {currentSection && (
              <>
                <div className="mb-6">
                  <div className="flex items-center mb-2">
                    <span className="w-6 h-6 text-green-600 mr-2">
                      {currentSection.icon}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-800">{currentSection.title}</h2>
                  </div>
                  <div className="h-1 bg-green-600 w-20 rounded"></div>
                </div>
                
                <div className="prose prose-lg max-w-none">
                  {currentSection.content}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
