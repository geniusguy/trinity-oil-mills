"use client";
import React, { useState } from 'react';
import { Card } from '@/components/ui';
import Link from 'next/link';

const FinancialFeaturesHelp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const TabButton = ({ id, title, active, onClick }: { id: string; title: string; active: boolean; onClick: () => void }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        active 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {title}
    </button>
  );

  const FeatureCard = ({ icon, title, description, link }: { icon: string; title: string; description: string; link: string }) => (
    <Card>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{icon}</span>
          <h3 className="text-xl font-semibold">{title}</h3>
        </div>
        <p className="text-gray-600 mb-4">{description}</p>
        <Link href={link} className="text-blue-600 hover:text-blue-500 font-medium">
          Open {title} →
        </Link>
      </div>
    </Card>
  );

  const StepCard = ({ step, title, description }: { step: number; title: string; description: string }) => (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
        {step}
      </div>
      <div>
        <h4 className="font-semibold mb-1">{title}</h4>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-4xl">💰</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Features Help</h1>
          <p className="text-gray-600">Complete guide to Trinity Oil Mills financial management tools</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        <TabButton id="overview" title="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabButton id="stock-value" title="Stock Value" active={activeTab === 'stock-value'} onClick={() => setActiveTab('stock-value')} />
        <TabButton id="investments" title="Investments" active={activeTab === 'investments'} onClick={() => setActiveTab('investments')} />
        <TabButton id="book-value" title="Book Value" active={activeTab === 'book-value'} onClick={() => setActiveTab('book-value')} />
        <TabButton id="getting-started" title="Getting Started" active={activeTab === 'getting-started'} onClick={() => setActiveTab('getting-started')} />
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">🎯 What Are Financial Features?</h2>
              <p className="text-gray-600 mb-6">
                Our financial features help you understand and manage your business finances with three powerful tools:
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureCard
                  icon="📦"
                  title="Total Stock Value"
                  description="See how much your inventory is worth right now and analyze profit potential."
                  link="/dashboard/admin/stock-value"
                />
                <FeatureCard
                  icon="💰"
                  title="Savings & Investments"
                  description="Track your investment portfolio and monitor financial growth over time."
                  link="/dashboard/admin/savings-investments"
                />
                <FeatureCard
                  icon="🏢"
                  title="Book Value"
                  description="Calculate your company's net worth and financial health automatically."
                  link="/dashboard/admin/book-value"
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">✨ Key Benefits</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-green-600">✅</span>
                  <span><strong>Real-time calculations</strong> using your live business data</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-600">✅</span>
                  <span><strong>Mobile app support</strong> for access anywhere</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-600">✅</span>
                  <span><strong>Offline capability</strong> on mobile devices</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-600">✅</span>
                  <span><strong>Professional reports</strong> with detailed breakdowns</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-600">✅</span>
                  <span><strong>Role-based access</strong> for Admin and Accountant only</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-green-600">✅</span>
                  <span><strong>Automatic updates</strong> when you add new data</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'stock-value' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">📦 Total Stock Value</h2>
              <p className="text-gray-600 mb-6">
                This feature calculates how much your entire inventory is worth right now, showing both what you paid for it and what you could sell it for.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">📊 What You'll See</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span><strong>Total Items:</strong> Number of different products in stock</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span><strong>Cost Value:</strong> How much you paid for all inventory</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span><strong>Retail Value:</strong> How much you could sell it all for</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600">•</span>
                      <span><strong>Potential Profit:</strong> Difference between cost and retail</span>
                    </li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">🎯 How to Use It</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">→</span>
                      <span>Check your inventory investment amount</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">→</span>
                      <span>Identify which categories are most valuable</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">→</span>
                      <span>Find low stock items that need reordering</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-600">→</span>
                      <span>Analyze profit margins by product type</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Pro Tip</h4>
                <p className="text-blue-700 text-sm">
                  Check this page weekly to monitor your inventory investment and identify slow-moving stock that might need promotional pricing.
                </p>
              </div>

              <div className="mt-4">
                <Link href="/dashboard/admin/stock-value" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium">
                  Open Stock Value →
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'investments' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">💰 Savings & Investments</h2>
              <p className="text-gray-600 mb-6">
                Track all your personal and business investments in one place, from bank deposits to mutual funds and property.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">📈 Investment Types</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span>🏦</span>
                      <span>Savings Account</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📈</span>
                      <span>Fixed Deposit</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📊</span>
                      <span>Mutual Fund</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>📈</span>
                      <span>Stocks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🏠</span>
                      <span>Property</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>🥇</span>
                      <span>Gold</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3">📊 What You'll Track</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">•</span>
                      <span>How much you invested originally</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">•</span>
                      <span>Current market value of investments</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">•</span>
                      <span>Profit or loss on each investment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-purple-600">•</span>
                      <span>Maturity dates and interest rates</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">🚀 How to Add an Investment</h3>
                <div className="space-y-3">
                  <StepCard step={1} title="Click 'Add Investment'" description="Find the green button at the top of the page" />
                  <StepCard step={2} title="Choose Investment Type" description="Select from savings, FD, mutual fund, stocks, etc." />
                  <StepCard step={3} title="Enter Details" description="Add amount, date, institution, and other information" />
                  <StepCard step={4} title="Save Investment" description="Click save to add it to your portfolio" />
                </div>
              </div>

              <div className="mt-6 p-4 bg-green-50 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">💡 Best Practice</h4>
                <p className="text-green-700 text-sm">
                  Update the "Current Value" of your investments monthly to get accurate profit/loss calculations and portfolio performance.
                </p>
              </div>

              <div className="mt-4">
                <Link href="/dashboard/admin/savings-investments" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium">
                  Open Investments →
                </Link>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'book-value' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">🏢 Book Value of Company</h2>
              <p className="text-gray-600 mb-6">
                This automatically calculates your company's net worth by looking at everything you own (assets) minus everything you owe (liabilities).
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3">🧮 How It's Calculated</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-4 text-lg font-medium">
                        <span className="text-blue-600">Assets</span>
                        <span className="text-gray-400">−</span>
                        <span className="text-red-600">Liabilities</span>
                        <span className="text-gray-400">=</span>
                        <span className="text-green-600">Book Value</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-blue-600 mb-3">📈 Assets (What You Own)</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span><strong>Cash:</strong> Revenue minus expenses</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span><strong>Inventory:</strong> Current stock at cost price</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span><strong>Investments:</strong> Your savings & investment portfolio</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-red-600 mb-3">📉 Liabilities (What You Owe)</h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <span className="text-red-600">•</span>
                        <span><strong>Accounts Payable:</strong> Money owed to suppliers</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600">•</span>
                        <span><strong>Loans:</strong> Business loans (when tracked)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-red-600">•</span>
                        <span><strong>Other Debts:</strong> Outstanding payments</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3">📊 Key Financial Ratios</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-blue-800">Inventory Turnover</h4>
                      <p className="text-sm text-blue-700">How efficiently you're selling inventory</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-green-800">Asset Turnover</h4>
                      <p className="text-sm text-green-700">How well you're using your assets</p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <h4 className="font-semibold text-purple-800">Return on Assets</h4>
                      <p className="text-sm text-purple-700">How profitable your assets are</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h4 className="font-semibold text-yellow-800 mb-2">📝 Important Notes</h4>
                  <ul className="text-yellow-700 text-sm space-y-1">
                    <li>• Book value is based on recorded data, not market value</li>
                    <li>• Equipment and property values are not included (need separate tracking)</li>
                    <li>• This gives you a conservative estimate of company worth</li>
                    <li>• Check monthly to track your company's financial growth</li>
                  </ul>
                </div>

                <div className="mt-4">
                  <Link href="/dashboard/admin/book-value" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md font-medium">
                    Open Book Value →
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'getting-started' && (
        <div className="space-y-6">
          <Card>
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">🚀 Getting Started</h2>
              <p className="text-gray-600 mb-6">
                Follow these steps to start using the financial features effectively.
              </p>

              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-semibold mb-4">🌐 On Web (Desktop/Laptop)</h3>
                  <div className="space-y-3">
                    <StepCard step={1} title="Login as Admin or Accountant" description="Only these roles can access financial features" />
                    <StepCard step={2} title="Open the Sidebar" description="Look for 'Financial Management' in the left sidebar" />
                    <StepCard step={3} title="Choose Your Feature" description="Select Stock Value, Investments, or Book Value" />
                    <StepCard step={4} title="Explore the Data" description="Each page shows different financial insights" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">📱 On Mobile App</h3>
                  <div className="space-y-3">
                    <StepCard step={1} title="Open Trinity Oil Mills App" description="Login with your Admin or Accountant account" />
                    <StepCard step={2} title="Go to Dashboard" description="Tap the Home tab at the bottom" />
                    <StepCard step={3} title="Find Money & Finance Section" description="Scroll down to see the financial quick actions" />
                    <StepCard step={4} title="Tap Any Feature" description="Stock Value, Investments, or Book Value" />
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">💡 First Week Checklist</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="rounded" />
                      <span>Check your current stock value and profit potential</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="rounded" />
                      <span>Add your existing investments (FDs, mutual funds, etc.)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="rounded" />
                      <span>Review your company's book value and financial health</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="rounded" />
                      <span>Set up regular monitoring schedule (weekly/monthly)</span>
                    </label>
                    <label className="flex items-center gap-3">
                      <input type="checkbox" className="rounded" />
                      <span>Train other Admin/Accountant users if needed</span>
                    </label>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold text-blue-800 mb-2">🎯 Success Tips</h4>
                  <ul className="text-blue-700 text-sm space-y-1">
                    <li>• Start with Stock Value - it's the easiest to understand</li>
                    <li>• Update investment values monthly for accurate tracking</li>
                    <li>• Use Book Value to make important business decisions</li>
                    <li>• Check these features regularly to spot trends early</li>
                    <li>• Keep your product pricing and inventory data current</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">❓ Need More Help?</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">📧 Contact Support</h4>
                  <p className="text-sm text-gray-600 mb-2">For technical issues or questions:</p>
                  <p className="text-sm text-blue-600">support@trinityoil.in</p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">👨‍💼 Request Training</h4>
                  <p className="text-sm text-gray-600 mb-2">Need personal training session:</p>
                  <p className="text-sm text-blue-600">Contact your system administrator</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default FinancialFeaturesHelp;

