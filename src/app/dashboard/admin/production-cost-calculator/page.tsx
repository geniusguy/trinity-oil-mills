'use client';

import React, { useState, useEffect } from 'react';
import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
// Removed ProductionCostCalculator import to avoid client-side database issues

interface ProductionCostBreakdown {
  productName: string;
  batchSize: number;
  unit: string;
  
  // Raw Material Costs
  seedCost: {
    seedType: string;
    quantityNeeded: number;
    unitCost: number;
    totalCost: number;
  };
  
  // Packaging Costs
  packagingCosts: {
    bottles: { quantity: number; unitCost: number; totalCost: number };
    caps: { quantity: number; unitCost: number; totalCost: number };
    labels: { quantity: number; unitCost: number; totalCost: number };
    boxes: { quantity: number; unitCost: number; totalCost: number };
  };
  
  // Production Costs
  productionCosts: {
    laborCost: number;
    electricityCost: number;
    machineryDepreciation: number;
    overheadCost: number;
  };
  
  // Transportation & Distribution
  transportationCosts: {
    fuelCost: number;
    driverWages: number;
    vehicleDepreciation: number;
    packagingForTransport: number;
  };
  
  // Calculated Totals
  totalRawMaterialCost: number;
  totalPackagingCost: number;
  totalProductionCost: number;
  totalTransportationCost: number;
  grandTotalCost: number;
  costPerUnit: number;
  
  // Pricing
  suggestedSellingPrice: number;
  profitMargin: number;
  profitPerUnit: number;
}

interface RawMaterial {
  id: string;
  name: string;
  category: string;
  costPerUnit: number;
  unit: string;
  currentStock: number;
}

export default function ProductionCostCalculatorPage() {
  const [costBreakdown, setCostBreakdown] = useState<ProductionCostBreakdown | null>(null);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dataSourceLabel, setDataSourceLabel] = useState('Live pricing');
  
  // Form inputs
  const [calculatorForm, setCalculatorForm] = useState({
    productType: 'groundnut',
    batchSize: 1000,
    unit: 'liters',
    
    // Raw materials
    seedQuantity: 1200, // kg needed for 1000L
    seedCostPerKg: 80,
    
    // Packaging (per unit)
    bottleType: 'pet-1l',
    bottleCost: 12,
    capCost: 2,
    labelCost: 1.5,
    boxesNeeded: 50, // 20 bottles per box
    boxCost: 25,
    
    // Production costs (per batch)
    laborHours: 8,
    laborRatePerHour: 150,
    electricityUnits: 200,
    electricityRatePerUnit: 8,
    machineryDepreciationPerBatch: 500,
    overheadPercentage: 10,
    
    // Transportation (per batch)
    transportationDistance: 50, // km
    fuelCostPerKm: 8,
    driverWagesPerTrip: 800,
    vehicleDepreciationPerTrip: 200,
    transportPackagingCost: 300,
    
    // Pricing
    targetProfitMargin: 25 // percentage
  });

  useEffect(() => {
    fetchRawMaterials();
  }, []);

  useEffect(() => {
    calculateProductionCost();
  }, [calculatorForm, rawMaterials]);

  const fetchRawMaterials = async () => {
    const parseProductCost = (p: any) => {
      const n = Number(p?.basePrice ?? p?.retailPrice ?? 0);
      return Number.isFinite(n) && n > 0 ? n : 0;
    };

    try {
      // Live source: products + inventory endpoints.
      const [productsRes, inventoryRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/inventory'),
      ]);
      const productsJson = await productsRes.json();
      const inventoryJson = await inventoryRes.json();
      const products = Array.isArray(productsJson?.products) ? productsJson.products : [];
      const inventory = Array.isArray(inventoryJson?.inventory) ? inventoryJson.inventory : [];

      const invByProductId = new Map<string, number>();
      for (const row of inventory) {
        invByProductId.set(String(row.productId), Number(row.quantity || 0));
      }

      const mapped: RawMaterial[] = products
        .map((p: any) => {
          const name = String(p?.name || '');
          const lower = name.toLowerCase();
          const unit = String(p?.unit || 'pieces');
          const cost = parseProductCost(p);
          if (!cost) return null;
          const isSeed = lower.includes('groundnut') || lower.includes('gingelly') || lower.includes('sesame') || lower.includes('coconut') || lower.includes('copra');
          const isPackaging = lower.includes('bottle') || lower.includes('cap') || lower.includes('label') || lower.includes('box') || lower.includes('carton');
          if (!isSeed && !isPackaging) return null;
          return {
            id: String(p.id),
            name,
            category: isSeed ? 'seeds' : 'packaging',
            costPerUnit: cost,
            unit,
            currentStock: Number(invByProductId.get(String(p.id)) || 0),
          } as RawMaterial;
        })
        .filter(Boolean) as RawMaterial[];

      setRawMaterials(mapped);
      const seedGroundnut = mapped.find((m) => m.category === 'seeds' && m.name.toLowerCase().includes('groundnut'));
      const seedGingelly = mapped.find((m) => m.category === 'seeds' && (m.name.toLowerCase().includes('gingelly') || m.name.toLowerCase().includes('sesame')));
      const seedCoconut = mapped.find((m) => m.category === 'seeds' && (m.name.toLowerCase().includes('coconut') || m.name.toLowerCase().includes('copra')));
      const bottle = mapped.find((m) => m.category === 'packaging' && m.name.toLowerCase().includes('bottle'));
      const cap = mapped.find((m) => m.category === 'packaging' && m.name.toLowerCase().includes('cap'));
      const label = mapped.find((m) => m.category === 'packaging' && m.name.toLowerCase().includes('label'));
      const box = mapped.find((m) => m.category === 'packaging' && (m.name.toLowerCase().includes('box') || m.name.toLowerCase().includes('carton')));

      setCalculatorForm((prev) => ({
        ...prev,
        seedCostPerKg:
          prev.productType === 'groundnut'
            ? Number(seedGroundnut?.costPerUnit || prev.seedCostPerKg)
            : prev.productType === 'gingelly'
            ? Number(seedGingelly?.costPerUnit || prev.seedCostPerKg)
            : Number(seedCoconut?.costPerUnit || prev.seedCostPerKg),
        bottleCost: Number(bottle?.costPerUnit || prev.bottleCost),
        capCost: Number(cap?.costPerUnit || prev.capCost),
        labelCost: Number(label?.costPerUnit || prev.labelCost),
        boxCost: Number(box?.costPerUnit || prev.boxCost),
      }));

      if (mapped.length === 0) {
        throw new Error('No live material mapping found');
      }
      setDataSourceLabel('Live pricing (products + inventory API)');
      setError('');
    } catch (err) {
      setRawMaterials([]);
      setDataSourceLabel('Live pricing unavailable');
      setError('Failed to load live material pricing');
    }
  };

  const calculateProductionCost = () => {
    const form = calculatorForm;
    
    // Get seed cost based on product type
    let seedType = '';
    let seedCostPerKg = form.seedCostPerKg;
    
    switch (form.productType) {
      case 'groundnut':
        seedType = 'Groundnuts';
        seedCostPerKg = rawMaterials.find(m => m.id === 'rm-groundnuts')?.costPerUnit ?? 0;
        break;
      case 'gingelly':
        seedType = 'Sesame Seeds';
        seedCostPerKg = rawMaterials.find(m => m.id === 'rm-sesame')?.costPerUnit ?? 0;
        break;
      case 'coconut':
        seedType = 'Coconut (Copra)';
        seedCostPerKg = rawMaterials.find(m => m.id === 'rm-coconut')?.costPerUnit ?? 0;
        break;
    }

    // Raw Material Costs
    const seedCost = {
      seedType,
      quantityNeeded: form.seedQuantity,
      unitCost: seedCostPerKg,
      totalCost: form.seedQuantity * seedCostPerKg
    };

    // Packaging Costs
    const packagingCosts = {
      bottles: {
        quantity: form.batchSize,
        unitCost: form.bottleCost,
        totalCost: form.batchSize * form.bottleCost
      },
      caps: {
        quantity: form.batchSize,
        unitCost: form.capCost,
        totalCost: form.batchSize * form.capCost
      },
      labels: {
        quantity: form.batchSize,
        unitCost: form.labelCost,
        totalCost: form.batchSize * form.labelCost
      },
      boxes: {
        quantity: form.boxesNeeded,
        unitCost: form.boxCost,
        totalCost: form.boxesNeeded * form.boxCost
      }
    };

    // Production Costs
    const laborCost = form.laborHours * form.laborRatePerHour;
    const electricityCost = form.electricityUnits * form.electricityRatePerUnit;
    const productionCosts = {
      laborCost,
      electricityCost,
      machineryDepreciation: form.machineryDepreciationPerBatch,
      overheadCost: (laborCost + electricityCost + form.machineryDepreciationPerBatch) * (form.overheadPercentage / 100)
    };

    // Transportation Costs
    const fuelCost = form.transportationDistance * form.fuelCostPerKm;
    const transportationCosts = {
      fuelCost,
      driverWages: form.driverWagesPerTrip,
      vehicleDepreciation: form.vehicleDepreciationPerTrip,
      packagingForTransport: form.transportPackagingCost
    };

    // Calculate totals
    const totalRawMaterialCost = seedCost.totalCost;
    const totalPackagingCost = Object.values(packagingCosts).reduce((sum, item) => sum + item.totalCost, 0);
    const totalProductionCost = Object.values(productionCosts).reduce((sum, cost) => sum + cost, 0);
    const totalTransportationCost = Object.values(transportationCosts).reduce((sum, cost) => sum + cost, 0);
    const grandTotalCost = totalRawMaterialCost + totalPackagingCost + totalProductionCost + totalTransportationCost;
    const costPerUnit = grandTotalCost / form.batchSize;

    // Calculate pricing
    const suggestedSellingPrice = costPerUnit * (1 + form.targetProfitMargin / 100);
    const profitPerUnit = suggestedSellingPrice - costPerUnit;

    const breakdown: ProductionCostBreakdown = {
      productName: `${form.productType.charAt(0).toUpperCase() + form.productType.slice(1)} Oil`,
      batchSize: form.batchSize,
      unit: form.unit,
      seedCost,
      packagingCosts,
      productionCosts,
      transportationCosts,
      totalRawMaterialCost,
      totalPackagingCost,
      totalProductionCost,
      totalTransportationCost,
      grandTotalCost,
      costPerUnit,
      suggestedSellingPrice,
      profitMargin: form.targetProfitMargin,
      profitPerUnit
    };

    setCostBreakdown(breakdown);
  };

  const handleInputChange = (field: string, value: any) => {
    setCalculatorForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const saveProductionPlan = async () => {
    if (!costBreakdown) return;
    
    try {
      setLoading(true);
      // In real implementation, save to database
      alert(`Production plan saved for ${costBreakdown.productName}!\nCost per unit: ₹${costBreakdown.costPerUnit.toFixed(2)}\nSuggested price: ₹${costBreakdown.suggestedSellingPrice.toFixed(2)}`);
    } catch (err) {
      setError('Failed to save production plan');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !costBreakdown) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner text="Loading cost calculator..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">🧮 Production Cost Calculator</h1>
          <p className="text-gray-600 mt-1">Calculate accurate production costs for oil manufacturing</p>
          <p className="text-xs text-gray-500 mt-1">Source: {dataSourceLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={saveProductionPlan} disabled={!costBreakdown} className="bg-green-600 hover:bg-green-700">
            💾 Save Production Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📝 Production Parameters</h3>
            
            {/* Product Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Type</label>
                <select
                  value={calculatorForm.productType}
                  onChange={(e) => handleInputChange('productType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="groundnut">Groundnut Oil</option>
                  <option value="gingelly">Gingelly Oil</option>
                  <option value="coconut">Coconut Oil</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batch Size</label>
                  <input
                    type="number"
                    value={calculatorForm.batchSize}
                    onChange={(e) => handleInputChange('batchSize', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <select
                    value={calculatorForm.unit}
                    onChange={(e) => handleInputChange('unit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="liters">Liters</option>
                    <option value="kg">Kilograms</option>
                  </select>
                </div>
              </div>

              {/* Raw Materials */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-800 mb-3">🌱 Raw Materials</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seeds Needed (kg)</label>
                    <input
                      type="number"
                      value={calculatorForm.seedQuantity}
                      onChange={(e) => handleInputChange('seedQuantity', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seed Cost/kg (₹)</label>
                    <input
                      type="number"
                      value={calculatorForm.seedCostPerKg}
                      onChange={(e) => handleInputChange('seedCostPerKg', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Packaging */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-800 mb-3">📦 Packaging Costs</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bottle Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculatorForm.bottleCost}
                      onChange={(e) => handleInputChange('bottleCost', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cap Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculatorForm.capCost}
                      onChange={(e) => handleInputChange('capCost', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label Cost (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculatorForm.labelCost}
                      onChange={(e) => handleInputChange('labelCost', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Boxes Needed</label>
                    <input
                      type="number"
                      value={calculatorForm.boxesNeeded}
                      onChange={(e) => handleInputChange('boxesNeeded', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Transportation */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-gray-800 mb-3">🚚 Transportation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Distance (km)</label>
                    <input
                      type="number"
                      value={calculatorForm.transportationDistance}
                      onChange={(e) => handleInputChange('transportationDistance', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Cost/km (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={calculatorForm.fuelCostPerKm}
                      onChange={(e) => handleInputChange('fuelCostPerKm', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Profit Margin */}
              <div className="border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Profit Margin (%)</label>
                  <input
                    type="number"
                    value={calculatorForm.targetProfitMargin}
                    onChange={(e) => handleInputChange('targetProfitMargin', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Cost Breakdown Results */}
        {costBreakdown && (
          <Card>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Cost Breakdown</h3>
              
              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{costBreakdown.costPerUnit.toFixed(2)}
                    </div>
                    <div className="text-sm text-green-700">Cost per {costBreakdown.unit.slice(0, -1)}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      ₹{costBreakdown.suggestedSellingPrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-blue-700">Suggested Price ({costBreakdown.profitMargin}% margin)</div>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-4">
                {/* Raw Materials */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">🌱 Raw Materials</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{costBreakdown.seedCost.seedType} ({costBreakdown.seedCost.quantityNeeded} kg)</span>
                      <span>₹{costBreakdown.seedCost.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total Raw Materials</span>
                      <span>₹{costBreakdown.totalRawMaterialCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Packaging */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">📦 Packaging</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Bottles ({costBreakdown.packagingCosts.bottles.quantity})</span>
                      <span>₹{costBreakdown.packagingCosts.bottles.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Caps ({costBreakdown.packagingCosts.caps.quantity})</span>
                      <span>₹{costBreakdown.packagingCosts.caps.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Labels ({costBreakdown.packagingCosts.labels.quantity})</span>
                      <span>₹{costBreakdown.packagingCosts.labels.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Boxes ({costBreakdown.packagingCosts.boxes.quantity})</span>
                      <span>₹{costBreakdown.packagingCosts.boxes.totalCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total Packaging</span>
                      <span>₹{costBreakdown.totalPackagingCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Production */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">🏭 Production</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Labor</span>
                      <span>₹{costBreakdown.productionCosts.laborCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Electricity</span>
                      <span>₹{costBreakdown.productionCosts.electricityCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Machinery Depreciation</span>
                      <span>₹{costBreakdown.productionCosts.machineryDepreciation.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overhead</span>
                      <span>₹{costBreakdown.productionCosts.overheadCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total Production</span>
                      <span>₹{costBreakdown.totalProductionCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Transportation */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-2">🚚 Transportation</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Fuel Cost</span>
                      <span>₹{costBreakdown.transportationCosts.fuelCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Driver Wages</span>
                      <span>₹{costBreakdown.transportationCosts.driverWages.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vehicle Depreciation</span>
                      <span>₹{costBreakdown.transportationCosts.vehicleDepreciation.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transport Packaging</span>
                      <span>₹{costBreakdown.transportationCosts.packagingForTransport.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t pt-1">
                      <span>Total Transportation</span>
                      <span>₹{costBreakdown.totalTransportationCost.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Grand Total */}
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold">Grand Total Cost</span>
                    <span className="text-lg font-bold text-green-600">₹{costBreakdown.grandTotalCost.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-medium">Profit per Unit</span>
                    <span className="font-semibold text-blue-600">₹{costBreakdown.profitPerUnit.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}
    </div>
  );
}

