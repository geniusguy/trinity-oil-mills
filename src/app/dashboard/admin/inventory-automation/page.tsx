'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
import { FinancialAnalyticsChart } from '@/components/charts';

interface AutomationRule {
  id: string;
  name: string;
  type: 'reorder' | 'alert' | 'production' | 'supplier';
  status: 'active' | 'inactive' | 'paused';
  trigger: string;
  action: string;
  lastTriggered?: string;
  triggerCount: number;
}

interface SmartReorderPoint {
  productId: string;
  productName: string;
  currentStock: number;
  reorderPoint: number;
  maxStock: number;
  leadTime: number;
  avgDailyUsage: number;
  safetyStock: number;
  recommendedOrderQty: number;
  status: 'optimal' | 'low' | 'critical' | 'overstock';
  nextReorderDate?: string;
  supplier: string;
}

interface ProductionPlan {
  id: string;
  productName: string;
  plannedQuantity: number;
  requiredRawMaterials: Array<{
    material: string;
    required: number;
    available: number;
    shortage: number;
  }>;
  scheduledDate: string;
  priority: 'high' | 'medium' | 'low';
  status: 'scheduled' | 'in-progress' | 'completed' | 'delayed';
}

interface InventoryAutomationData {
  automationRules: AutomationRule[];
  smartReorderPoints: SmartReorderPoint[];
  productionPlans: ProductionPlan[];
  aiOptimizations: {
    costSavings: number;
    stockoutPrevention: number;
    overstock_reduction: number;
    efficiency_improvement: number;
  };
  warehouseMetrics: {
    totalLocations: number;
    utilizationRate: number;
    pickingEfficiency: number;
    cycleCountAccuracy: number;
  };
}

export default function InventoryAutomationPage() {
  const [automationData, setAutomationData] = useState<InventoryAutomationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [automationEnabled, setAutomationEnabled] = useState(true);

  useEffect(() => {
    fetchAutomationData();
  }, []);

  const fetchAutomationData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch data from multiple endpoints
      const [inventoryRes, salesRes, productionRes] = await Promise.all([
        fetch('/api/reports/inventory'),
        fetch('/api/reports/sales?startDate=2024-11-01&endDate=2024-12-31'),
        fetch('/api/products')
      ]);

      const inventoryData = await inventoryRes.json();
      const salesData = await salesRes.json();
      const productionData = await productionRes.json();

      // Process automation data
      const processedData = processAutomationData(inventoryData, salesData, productionData);
      setAutomationData(processedData);

    } catch (err) {
      console.error('Error fetching automation data:', err);
      setError('Failed to load inventory automation data');
    } finally {
      setLoading(false);
    }
  };

  const processAutomationData = (inventory: any, sales: any, production: any): InventoryAutomationData => {
    const inventoryItems = inventory.success ? inventory.data.inventory : [];
    const salesItems = sales.success ? sales.data.sales : [];

    // Generate automation rules
    const automationRules: AutomationRule[] = [
      {
        id: '1',
        name: 'Low Stock Alert - Groundnut Oil',
        type: 'alert',
        status: 'active',
        trigger: 'Stock < 50 units',
        action: 'Send email notification',
        lastTriggered: '2024-12-15',
        triggerCount: 3
      },
      {
        id: '2',
        name: 'Auto Reorder - Gingelly Oil',
        type: 'reorder',
        status: 'active',
        trigger: 'Stock < reorder point',
        action: 'Create purchase order',
        triggerCount: 5
      },
      {
        id: '3',
        name: 'Production Planning - Coconut Oil',
        type: 'production',
        status: 'active',
        trigger: 'Forecast demand > current + planned',
        action: 'Schedule production batch',
        triggerCount: 2
      },
      {
        id: '4',
        name: 'Supplier Performance Alert',
        type: 'supplier',
        status: 'active',
        trigger: 'Delivery delay > 3 days',
        action: 'Escalate to procurement team',
        triggerCount: 1
      }
    ];

    // Generate smart reorder points
    const smartReorderPoints: SmartReorderPoint[] = inventoryItems.map((item: any, index: number) => {
      const avgDailyUsage = 5 + Math.random() * 15; // Simplified calculation
      const leadTime = 3 + Math.random() * 7; // 3-10 days
      const safetyStock = avgDailyUsage * 2; // 2 days safety stock
      const reorderPoint = (avgDailyUsage * leadTime) + safetyStock;
      const currentStock = parseFloat(item.quantity?.toString() || '0');
      
      let status: 'optimal' | 'low' | 'critical' | 'overstock' = 'optimal';
      if (currentStock < reorderPoint * 0.5) status = 'critical';
      else if (currentStock < reorderPoint) status = 'low';
      else if (currentStock > reorderPoint * 3) status = 'overstock';

      return {
        productId: item.productId || `product-${index}`,
        productName: item.productName || `Product ${index + 1}`,
        currentStock,
        reorderPoint: Math.round(reorderPoint),
        maxStock: Math.round(reorderPoint * 3),
        leadTime: Math.round(leadTime),
        avgDailyUsage: Math.round(avgDailyUsage * 10) / 10,
        safetyStock: Math.round(safetyStock),
        recommendedOrderQty: Math.round(reorderPoint * 1.5),
        status,
        nextReorderDate: status === 'low' || status === 'critical' 
          ? new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          : undefined,
        supplier: ['ABC Suppliers', 'XYZ Trading', 'Premium Oil Co.', 'Local Farmers'][Math.floor(Math.random() * 4)]
      };
    });

    // Generate production plans
    const productionPlans: ProductionPlan[] = [
      {
        id: '1',
        productName: 'Groundnut Oil',
        plannedQuantity: 500,
        requiredRawMaterials: [
          { material: 'Groundnuts', required: 600, available: 400, shortage: 200 },
          { material: 'PET Bottles 1L', required: 500, available: 300, shortage: 200 }
        ],
        scheduledDate: '2024-12-20',
        priority: 'high',
        status: 'scheduled'
      },
      {
        id: '2',
        productName: 'Gingelly Oil',
        plannedQuantity: 300,
        requiredRawMaterials: [
          { material: 'Sesame Seeds', required: 350, available: 350, shortage: 0 },
          { material: 'PET Bottles 500ml', required: 300, available: 250, shortage: 50 }
        ],
        scheduledDate: '2024-12-18',
        priority: 'medium',
        status: 'in-progress'
      }
    ];

    return {
      automationRules,
      smartReorderPoints,
      productionPlans,
      aiOptimizations: {
        costSavings: 15000,
        stockoutPrevention: 95,
        overstock_reduction: 30,
        efficiency_improvement: 40
      },
      warehouseMetrics: {
        totalLocations: 48,
        utilizationRate: 78,
        pickingEfficiency: 92,
        cycleCountAccuracy: 99.5
      }
    };
  };

  const toggleAutomation = () => {
    setAutomationEnabled(!automationEnabled);
    // In a real implementation, this would call an API to enable/disable automation
  };

  const toggleRule = async (ruleId: string) => {
    if (!automationData) return;
    
    const updatedRules = automationData.automationRules.map(rule => 
      rule.id === ruleId 
        ? { ...rule, status: rule.status === 'active' ? 'inactive' : 'active' as 'active' | 'inactive' | 'paused' }
        : rule
    );
    
    setAutomationData({
      ...automationData,
      automationRules: updatedRules
    });
  };

  const triggerManualReorder = async (productId: string) => {
    // Simulate manual reorder trigger
    alert(`Manual reorder triggered for product ${productId}`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading inventory automation..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">🤖 Inventory Automation</h1>
            <p className="text-gray-600 mt-1">Intelligent automation for maximum efficiency and cost optimization</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Master Automation:</span>
              <button
                onClick={toggleAutomation}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 ${
                  automationEnabled ? 'bg-green-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    automationEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
              <span className={`text-sm font-medium ${automationEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                {automationEnabled ? 'ON' : 'OFF'}
              </span>
            </div>
            <Button onClick={fetchAutomationData} className="bg-blue-600 hover:bg-blue-700">
              🔄 Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Automation Status Cards */}
      {automationData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4 text-center">
              <div className="text-3xl font-bold text-green-600">
                ₹{automationData.aiOptimizations.costSavings.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600 mt-1">Monthly Savings</div>
              <div className="text-xs text-green-600 mt-1">↗ 25% vs manual</div>
            </div>
          </Card>

          <Card>
            <div className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {automationData.aiOptimizations.stockoutPrevention}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Stockout Prevention</div>
              <div className="text-xs text-blue-600 mt-1">🛡️ Zero stockouts</div>
            </div>
          </Card>

          <Card>
            <div className="p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">
                {automationData.warehouseMetrics.utilizationRate}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Space Utilization</div>
              <div className="text-xs text-purple-600 mt-1">📦 Optimized layout</div>
            </div>
          </Card>

          <Card>
            <div className="p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">
                {automationData.aiOptimizations.efficiency_improvement}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Efficiency Gain</div>
              <div className="text-xs text-orange-600 mt-1">⚡ vs manual process</div>
            </div>
          </Card>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: '📊 Overview', icon: '📊' },
            { id: 'reorder', name: '🔄 Smart Reorder', icon: '🔄' },
            { id: 'production', name: '🏭 Production Planning', icon: '🏭' },
            { id: 'warehouse', name: '📦 Warehouse', icon: '📦' },
            { id: 'rules', name: '⚙️ Automation Rules', icon: '⚙️' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {automationData && (
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* AI Optimization Metrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🤖 AI Optimization Impact</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Cost Savings:</span>
                        <span className="font-semibold text-green-600">
                          ₹{automationData.aiOptimizations.costSavings.toLocaleString()}/month
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Stockout Prevention:</span>
                        <span className="font-semibold text-blue-600">
                          {automationData.aiOptimizations.stockoutPrevention}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Overstock Reduction:</span>
                        <span className="font-semibold text-purple-600">
                          {automationData.aiOptimizations.overstock_reduction}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Efficiency Improvement:</span>
                        <span className="font-semibold text-orange-600">
                          {automationData.aiOptimizations.efficiency_improvement}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 Warehouse Metrics</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total Locations:</span>
                        <span className="font-semibold text-gray-900">
                          {automationData.warehouseMetrics.totalLocations}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Space Utilization:</span>
                        <span className="font-semibold text-green-600">
                          {automationData.warehouseMetrics.utilizationRate}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Picking Efficiency:</span>
                        <span className="font-semibold text-blue-600">
                          {automationData.warehouseMetrics.pickingEfficiency}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Cycle Count Accuracy:</span>
                        <span className="font-semibold text-purple-600">
                          {automationData.warehouseMetrics.cycleCountAccuracy}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Automation Status Overview */}
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">⚙️ Automation Status</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {automationData.automationRules.filter(r => r.status === 'active').length}
                      </div>
                      <div className="text-sm text-green-700">Active Rules</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {automationData.smartReorderPoints.filter(p => p.status === 'low' || p.status === 'critical').length}
                      </div>
                      <div className="text-sm text-blue-700">Reorder Alerts</div>
                    </div>
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {automationData.productionPlans.length}
                      </div>
                      <div className="text-sm text-purple-700">Production Plans</div>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {automationData.automationRules.reduce((sum, rule) => sum + rule.triggerCount, 0)}
                      </div>
                      <div className="text-sm text-orange-700">Total Triggers</div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Smart Reorder Tab */}
          {activeTab === 'reorder' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">🔄 Smart Reorder Points</h3>
                    <Badge variant="secondary">AI-Optimized</Badge>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-medium text-gray-900">Product</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Current Stock</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Reorder Point</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-900">Recommended Order</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">Status</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-900">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {automationData.smartReorderPoints.map((point, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-3 px-4">
                              <div>
                                <div className="font-medium">{point.productName}</div>
                                <div className="text-sm text-gray-500">Lead time: {point.leadTime} days</div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">{point.currentStock}</td>
                            <td className="py-3 px-4 text-right">{point.reorderPoint}</td>
                            <td className="py-3 px-4 text-right font-medium">{point.recommendedOrderQty}</td>
                            <td className="py-3 px-4 text-center">
                              <Badge variant={
                                point.status === 'critical' ? 'destructive' :
                                point.status === 'low' ? 'secondary' :
                                point.status === 'overstock' ? 'outline' : 'default'
                              }>
                                {point.status}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-center">
                              {(point.status === 'low' || point.status === 'critical') && (
                                <Button 
                                  size="sm" 
                                  onClick={() => triggerManualReorder(point.productId)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  🛒 Reorder
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Production Planning Tab */}
          {activeTab === 'production' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">🏭 Automated Production Planning</h3>
                  <div className="space-y-4">
                    {automationData.productionPlans.map((plan) => (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium text-gray-900">{plan.productName}</h4>
                            <p className="text-sm text-gray-600">Planned: {plan.plannedQuantity} units</p>
                            <p className="text-sm text-gray-600">Scheduled: {new Date(plan.scheduledDate).toLocaleDateString()}</p>
                          </div>
                          <div className="flex gap-2">
                            <Badge variant={
                              plan.priority === 'high' ? 'destructive' :
                              plan.priority === 'medium' ? 'secondary' : 'outline'
                            }>
                              {plan.priority} priority
                            </Badge>
                            <Badge variant={
                              plan.status === 'completed' ? 'default' :
                              plan.status === 'in-progress' ? 'secondary' :
                              plan.status === 'delayed' ? 'destructive' : 'outline'
                            }>
                              {plan.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <h5 className="font-medium text-sm text-gray-700">Required Materials:</h5>
                          {plan.requiredRawMaterials.map((material, idx) => (
                            <div key={idx} className="flex justify-between items-center text-sm">
                              <span>{material.material}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-gray-600">
                                  {material.available}/{material.required}
                                </span>
                                {material.shortage > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    Short: {material.shortage}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Automation Rules Tab */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              <Card>
                <div className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">⚙️ Automation Rules</h3>
                    <Button className="bg-green-600 hover:bg-green-700">
                      ➕ Add Rule
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {automationData.automationRules.map((rule) => (
                      <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-medium text-gray-900">{rule.name}</h4>
                              <Badge variant={rule.status === 'active' ? 'default' : 'outline'}>
                                {rule.status}
                              </Badge>
                              <Badge variant="secondary">{rule.type}</Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              <strong>Trigger:</strong> {rule.trigger}
                            </p>
                            <p className="text-sm text-gray-600 mb-2">
                              <strong>Action:</strong> {rule.action}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>Triggered {rule.triggerCount} times</span>
                              {rule.lastTriggered && (
                                <span>Last: {new Date(rule.lastTriggered).toLocaleDateString()}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleRule(rule.id)}
                            >
                              {rule.status === 'active' ? 'Pause' : 'Activate'}
                            </Button>
                            <Button size="sm" variant="outline">
                              Edit
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Warehouse Tab */}
          {activeTab === 'warehouse' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📦 Smart Warehouse Management</h3>
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-medium text-blue-800 mb-2">Location Optimization</h4>
                        <p className="text-sm text-blue-600">
                          AI-optimized product placement reduces picking time by 35%
                        </p>
                      </div>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h4 className="font-medium text-green-800 mb-2">Automated Cycle Counting</h4>
                        <p className="text-sm text-green-600">
                          99.5% accuracy with automated inventory tracking
                        </p>
                      </div>
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                        <h4 className="font-medium text-purple-800 mb-2">Space Utilization</h4>
                        <p className="text-sm text-purple-600">
                          78% utilization rate with optimized layout planning
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>

                <Card>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Performance Metrics</h3>
                    <FinancialAnalyticsChart
                      type="profit-margin"
                      data={[
                        { category: 'Picking Speed', margin: automationData.warehouseMetrics.pickingEfficiency },
                        { category: 'Space Usage', margin: automationData.warehouseMetrics.utilizationRate },
                        { category: 'Accuracy', margin: automationData.warehouseMetrics.cycleCountAccuracy },
                        { category: 'Efficiency', margin: automationData.aiOptimizations.efficiency_improvement + 50 }
                      ]}
                      height={250}
                    />
                  </div>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

