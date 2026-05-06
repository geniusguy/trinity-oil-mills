'use client';

import React, { useMemo, useState } from 'react';
import { Button, Card, Input } from '@/components/ui';

type PNLInputs = {
  purchasedOilPerTin: number;
  bottlesPerTin: number;
  sellingPricePerTin: number;
  sellingPricePerBottle: number;
  petBottleCostPerBottle: number;
  innerLeadCostPerBottle: number;
  capCostPerBottle: number;
  frontLabelCostPerBottle: number;
  backLabelCostPerBottle: number;
  bigCardboardBoxCost: number;
  bottlesPerBox: number;
  courierChargePerBox: number;
};

const INITIAL_INPUTS: PNLInputs = {
  purchasedOilPerTin: 2400,
  bottlesPerTin: 15,
  sellingPricePerTin: 3000,
  sellingPricePerBottle: 210,
  petBottleCostPerBottle: 12,
  innerLeadCostPerBottle: 0.8,
  capCostPerBottle: 1.5,
  frontLabelCostPerBottle: 0.9,
  backLabelCostPerBottle: 0.9,
  bigCardboardBoxCost: 40,
  bottlesPerBox: 15,
  courierChargePerBox: 60,
};

const toCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

export default function TinBottlePNLPage() {
  const [inputs, setInputs] = useState<PNLInputs>(INITIAL_INPUTS);
  const [gstMode, setGstMode] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [gstRate, setGstRate] = useState(5);

  const computed = useMemo(() => {
    const gstFactor = 1 + Math.max(0, gstRate) / 100;
    const asExclusive = (amount: number) =>
      gstMode === 'inclusive' ? amount / gstFactor : amount;

    const safeBottlesPerTin = Math.max(1, inputs.bottlesPerTin);
    const safeBottlesPerBox = Math.max(1, inputs.bottlesPerBox);

    const purchasedOilPerTinExcl = asExclusive(inputs.purchasedOilPerTin);
    const sellingPricePerTinExcl = asExclusive(inputs.sellingPricePerTin);
    const sellingPricePerBottleExcl = asExclusive(inputs.sellingPricePerBottle);
    const petBottleCostExcl = asExclusive(inputs.petBottleCostPerBottle);
    const innerLeadCostExcl = asExclusive(inputs.innerLeadCostPerBottle);
    const capCostExcl = asExclusive(inputs.capCostPerBottle);
    const frontLabelCostExcl = asExclusive(inputs.frontLabelCostPerBottle);
    const backLabelCostExcl = asExclusive(inputs.backLabelCostPerBottle);
    const bigCardboardBoxCostExcl = asExclusive(inputs.bigCardboardBoxCost);
    const courierChargePerBoxExcl = asExclusive(inputs.courierChargePerBox);

    const oilCostPerBottle = purchasedOilPerTinExcl / safeBottlesPerTin;

    const packagingMaterialsPerBottle =
      petBottleCostExcl +
      innerLeadCostExcl +
      capCostExcl +
      frontLabelCostExcl +
      backLabelCostExcl;

    const boxSharePerBottle = bigCardboardBoxCostExcl / safeBottlesPerBox;
    const courierSharePerBottle = courierChargePerBoxExcl / safeBottlesPerBox;

    const totalCostPerBottle =
      oilCostPerBottle +
      packagingMaterialsPerBottle +
      boxSharePerBottle +
      courierSharePerBottle;

    const profitPerBottle = sellingPricePerBottleExcl - totalCostPerBottle;
    const marginPerBottle =
      sellingPricePerBottleExcl > 0
        ? (profitPerBottle / sellingPricePerBottleExcl) * 100
        : 0;

    const packagingAndCourierPerTin =
      (packagingMaterialsPerBottle + boxSharePerBottle + courierSharePerBottle) *
      safeBottlesPerTin;
    const totalCostPerTin = purchasedOilPerTinExcl + packagingAndCourierPerTin;
    const profitPerTin = sellingPricePerTinExcl - totalCostPerTin;
    const marginPerTin =
      sellingPricePerTinExcl > 0 ? (profitPerTin / sellingPricePerTinExcl) * 100 : 0;

    return {
      bottlesPerTinUsed: safeBottlesPerTin,
      petBottleCostExcl,
      innerLeadCostExcl,
      capCostExcl,
      frontLabelCostExcl,
      backLabelCostExcl,
      purchasedOilPerTinExcl,
      sellingPricePerTinExcl,
      sellingPricePerBottleExcl,
      oilCostPerBottle,
      packagingMaterialsPerBottle,
      boxSharePerBottle,
      courierSharePerBottle,
      totalCostPerBottle,
      profitPerBottle,
      marginPerBottle,
      packagingAndCourierPerTin,
      totalCostPerTin,
      profitPerTin,
      marginPerTin,
    };
  }, [inputs, gstMode, gstRate]);

  const onChangeNumber = (field: keyof PNLInputs, value: string) => {
    const parsed = Number(value);
    setInputs((prev) => ({
      ...prev,
      [field]: Number.isFinite(parsed) ? parsed : 0,
    }));
  };

  const profitColor = (value: number) => (value >= 0 ? 'text-green-700' : 'text-red-700');

  const exportCsv = () => {
    const rows: Array<[string, string]> = [
      ['Report', 'Per Tin / Per Bottle P&L'],
      ['GST Mode', gstMode === 'inclusive' ? 'Inclusive' : 'Exclusive'],
      ['GST Rate (%)', gstRate.toFixed(2)],
      ['Generated At', new Date().toLocaleString('en-IN')],
      ['', ''],
      ['Input - Purchased oil per tin', inputs.purchasedOilPerTin.toFixed(2)],
      ['Input - Bottles per tin', inputs.bottlesPerTin.toFixed(0)],
      ['Input - Selling price per tin', inputs.sellingPricePerTin.toFixed(2)],
      ['Input - Selling price per bottle', inputs.sellingPricePerBottle.toFixed(2)],
      ['Input - PET bottle cost (per bottle)', inputs.petBottleCostPerBottle.toFixed(2)],
      ['Input - Inner lead cost (per bottle)', inputs.innerLeadCostPerBottle.toFixed(2)],
      ['Input - Cap cost (per bottle)', inputs.capCostPerBottle.toFixed(2)],
      ['Input - Front label cost (per bottle)', inputs.frontLabelCostPerBottle.toFixed(2)],
      ['Input - Back label cost (per bottle)', inputs.backLabelCostPerBottle.toFixed(2)],
      ['Input - Big cardboard box cost (per box)', inputs.bigCardboardBoxCost.toFixed(2)],
      ['Input - Bottles per box', inputs.bottlesPerBox.toFixed(0)],
      ['Input - Courier charge (per box)', inputs.courierChargePerBox.toFixed(2)],
      ['', ''],
      ['Computed - Oil cost share per bottle', computed.oilCostPerBottle.toFixed(2)],
      ['Computed - Packaging materials per bottle', computed.packagingMaterialsPerBottle.toFixed(2)],
      ['Computed - Box share per bottle', computed.boxSharePerBottle.toFixed(2)],
      ['Computed - Courier share per bottle', computed.courierSharePerBottle.toFixed(2)],
      ['Computed - Total cost per bottle', computed.totalCostPerBottle.toFixed(2)],
      ['Computed - Selling price per bottle (ex GST)', computed.sellingPricePerBottleExcl.toFixed(2)],
      ['Computed - Final P&L per bottle', computed.profitPerBottle.toFixed(2)],
      ['Computed - Profit margin per bottle (%)', computed.marginPerBottle.toFixed(2)],
      ['', ''],
      ['Computed - Purchased oil per tin (ex GST)', computed.purchasedOilPerTinExcl.toFixed(2)],
      ['Computed - Packaging + box + courier per tin', computed.packagingAndCourierPerTin.toFixed(2)],
      ['Computed - Total cost per tin', computed.totalCostPerTin.toFixed(2)],
      ['Computed - Selling price per tin (ex GST)', computed.sellingPricePerTinExcl.toFixed(2)],
      ['Computed - Final P&L per tin', computed.profitPerTin.toFixed(2)],
      ['Computed - Profit margin per tin (%)', computed.marginPerTin.toFixed(2)],
    ];

    const csvContent = rows
      .map(([k, v]) => `"${k.replace(/"/g, '""')}","${v.replace(/"/g, '""')}"`)
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tin-bottle-pnl-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Per Tin / Per Bottle P&amp;L</h1>
          <p className="text-gray-600 mt-1">
            Calculate final profit using oil, packaging items, cardboard box, and courier charge.
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700">
            Print
          </Button>
          <Button onClick={exportCsv} className="bg-green-600 hover:bg-green-700">
            Export CSV
          </Button>
        </div>
      </div>

      <Card title="Input Costs & Selling Price" subtitle="Enter all values in INR">
        <div className="mb-4 p-3 rounded-md border border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GST Mode</label>
              <select
                value={gstMode}
                onChange={(e) => setGstMode(e.target.value as 'exclusive' | 'inclusive')}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-green-500 focus:border-green-500"
              >
                <option value="exclusive">Exclusive (inputs are before GST)</option>
                <option value="inclusive">Inclusive (inputs include GST)</option>
              </select>
            </div>
            <Input
              type="number"
              step="0.01"
              min="0"
              label="GST Rate (%)"
              value={gstRate}
              onChange={(e) => setGstRate(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 0)}
            />
            <div className="text-xs text-gray-600 self-end pb-2">
              {gstMode === 'inclusive'
                ? 'P&L is calculated on ex-GST values derived from your inputs.'
                : 'P&L is calculated directly using your ex-GST values.'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            type="number"
            step="0.01"
            label="Purchased oil per tin"
            value={inputs.purchasedOilPerTin}
            onChange={(e) => onChangeNumber('purchasedOilPerTin', e.target.value)}
          />
          <Input
            type="number"
            step="1"
            min="1"
            label="Bottles per tin"
            value={inputs.bottlesPerTin}
            onChange={(e) => onChangeNumber('bottlesPerTin', e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            label="Selling price per tin"
            value={inputs.sellingPricePerTin}
            onChange={(e) => onChangeNumber('sellingPricePerTin', e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            label="Selling price per bottle"
            value={inputs.sellingPricePerBottle}
            onChange={(e) => onChangeNumber('sellingPricePerBottle', e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            label="PET bottle cost (per bottle)"
            value={inputs.petBottleCostPerBottle}
            onChange={(e) => onChangeNumber('petBottleCostPerBottle', e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            label="Inner lead cost (per bottle)"
            value={inputs.innerLeadCostPerBottle}
            onChange={(e) => onChangeNumber('innerLeadCostPerBottle', e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            label="Cap cost (per bottle)"
            value={inputs.capCostPerBottle}
            onChange={(e) => onChangeNumber('capCostPerBottle', e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            label="Front label cost (per bottle)"
            value={inputs.frontLabelCostPerBottle}
            onChange={(e) => onChangeNumber('frontLabelCostPerBottle', e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            label="Back label cost (per bottle)"
            value={inputs.backLabelCostPerBottle}
            onChange={(e) => onChangeNumber('backLabelCostPerBottle', e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            label="Big cardboard box cost (per box)"
            value={inputs.bigCardboardBoxCost}
            onChange={(e) => onChangeNumber('bigCardboardBoxCost', e.target.value)}
          />
          <Input
            type="number"
            step="1"
            min="1"
            label="Bottles per box"
            value={inputs.bottlesPerBox}
            onChange={(e) => onChangeNumber('bottlesPerBox', e.target.value)}
          />
          <Input
            type="number"
            step="0.01"
            label="Courier charge (per box)"
            value={inputs.courierChargePerBox}
            onChange={(e) => onChangeNumber('courierChargePerBox', e.target.value)}
          />
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Per Bottle Breakdown">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Oil cost share</span>
              <span>{toCurrency(computed.oilCostPerBottle)}</span>
            </div>
            <div className="flex justify-between">
              <span>PET bottle + inner lead + cap + labels</span>
              <span>{toCurrency(computed.packagingMaterialsPerBottle)}</span>
            </div>
            <div className="flex justify-between">
              <span>Big cardboard box share</span>
              <span>{toCurrency(computed.boxSharePerBottle)}</span>
            </div>
            <div className="flex justify-between">
              <span>Courier share</span>
              <span>{toCurrency(computed.courierSharePerBottle)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total cost per bottle</span>
              <span>{toCurrency(computed.totalCostPerBottle)}</span>
            </div>
            <div className="flex justify-between">
              <span>Selling price per bottle</span>
              <span>{toCurrency(computed.sellingPricePerBottleExcl)}</span>
            </div>
            <div className={`border-t pt-2 flex justify-between font-bold ${profitColor(computed.profitPerBottle)}`}>
              <span>Final P&amp;L per bottle</span>
              <span>{toCurrency(computed.profitPerBottle)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Profit margin</span>
              <span>{computed.marginPerBottle.toFixed(2)}%</span>
            </div>
          </div>
        </Card>

        <Card title="Per Tin Breakdown">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Purchased oil per tin</span>
              <span>{toCurrency(computed.purchasedOilPerTinExcl)}</span>
            </div>
            <div className="flex justify-between">
              <span>PET bottle ({computed.bottlesPerTinUsed} units)</span>
              <span>{toCurrency(computed.petBottleCostExcl * computed.bottlesPerTinUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span>Inner lead ({computed.bottlesPerTinUsed} units)</span>
              <span>{toCurrency(computed.innerLeadCostExcl * computed.bottlesPerTinUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cap ({computed.bottlesPerTinUsed} units)</span>
              <span>{toCurrency(computed.capCostExcl * computed.bottlesPerTinUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span>Front label ({computed.bottlesPerTinUsed} units)</span>
              <span>{toCurrency(computed.frontLabelCostExcl * computed.bottlesPerTinUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span>Back label ({computed.bottlesPerTinUsed} units)</span>
              <span>{toCurrency(computed.backLabelCostExcl * computed.bottlesPerTinUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span>Big cardboard box share</span>
              <span>{toCurrency(computed.boxSharePerBottle * computed.bottlesPerTinUsed)}</span>
            </div>
            <div className="flex justify-between">
              <span>Courier charge share</span>
              <span>{toCurrency(computed.courierSharePerBottle * computed.bottlesPerTinUsed)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total packaging + box + courier (for one tin)</span>
              <span>{toCurrency(computed.packagingAndCourierPerTin)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total cost per tin</span>
              <span>{toCurrency(computed.totalCostPerTin)}</span>
            </div>
            <div className="flex justify-between">
              <span>Selling price per tin</span>
              <span>{toCurrency(computed.sellingPricePerTinExcl)}</span>
            </div>
            <div className={`border-t pt-2 flex justify-between font-bold ${profitColor(computed.profitPerTin)}`}>
              <span>Final P&amp;L per tin</span>
              <span>{toCurrency(computed.profitPerTin)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Profit margin</span>
              <span>{computed.marginPerTin.toFixed(2)}%</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
