'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input } from '@/components/ui';
import { getCurrentFinancialYearBounds } from '@/lib/financialYear';

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
  bottlesPerTin: 75,
  sellingPricePerTin: 3000,
  sellingPricePerBottle: 210,
  petBottleCostPerBottle: 4,
  innerLeadCostPerBottle: 0.35,
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
  const NOMINAL_TIN_LITERS = 16;
  const WASTAGE_LITERS = 1;
  const BOTTLE_SIZE_ML = 200;
  const USABLE_OIL_LITERS = NOMINAL_TIN_LITERS - WASTAGE_LITERS;
  const AUTO_BOTTLES_PER_TIN = Math.max(1, Math.floor((USABLE_OIL_LITERS * 1000) / BOTTLE_SIZE_ML));

  const [inputs, setInputs] = useState<PNLInputs>(INITIAL_INPUTS);
  const [gstMode, setGstMode] = useState<'exclusive' | 'inclusive'>('exclusive');
  const [gstRate, setGstRate] = useState(5);
  const [petBottleGstRate, setPetBottleGstRate] = useState(18);
  const [innerCapGstRate, setInnerCapGstRate] = useState(18);
  const [capGstRate, setCapGstRate] = useState(18);
  const [frontLabelGstRate, setFrontLabelGstRate] = useState(18);
  const [backLabelGstRate, setBackLabelGstRate] = useState(18);
  const [cardboardBoxGstRate, setCardboardBoxGstRate] = useState(18);
  const [courierGstRate, setCourierGstRate] = useState(18);
  const [useManualInputs, setUseManualInputs] = useState(false);
  const [loadingRealData, setLoadingRealData] = useState(false);
  const [realDataError, setRealDataError] = useState('');
  const [realDataNote, setRealDataNote] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [dateRange, setDateRange] = useState(() => {
    const fy = getCurrentFinancialYearBounds();
    return {
      startDate: fy.start.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    };
  });

  useEffect(() => {
    const TIN_ML = 15200;
    const packagingKeywords = [
      'pet bottle',
      'bottle',
      'inner lead',
      'inner lid',
      'inner cap',
      'cap',
      'label',
      'carton',
      'cardboard',
      'box',
      'tape',
      'packing',
      'packaging',
    ];

    const average = (rows: Array<{ amount: number; weight: number }>) => {
      const valid = rows.filter((r) => Number.isFinite(r.amount) && Number.isFinite(r.weight) && r.weight > 0);
      const totalWeight = valid.reduce((sum, r) => sum + r.weight, 0);
      if (totalWeight <= 0) return null;
      const weighted = valid.reduce((sum, r) => sum + r.amount * r.weight, 0);
      return weighted / totalWeight;
    };

    const parseNumber = (v: any) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const parseMlFromText = (text: string) => {
      const t = String(text || '').toLowerCase();
      const mlMatch = t.match(/(\d+(?:\.\d+)?)\D*ml\b/);
      if (mlMatch) {
        const ml = Number(mlMatch[1]);
        if (Number.isFinite(ml) && ml > 0) return ml;
      }
      const lMatch = t.match(/(\d+(?:\.\d+)?)\D*(l|liter|litre)\b/);
      if (lMatch) {
        const l = Number(lMatch[1]);
        if (Number.isFinite(l) && l > 0) return l * 1000;
      }
      if (t.includes('tin')) return TIN_ML;
      return null;
    };

    const hasAny = (text: string, keys: string[]) => keys.some((k) => text.includes(k));

    const fetchRealData = async () => {
      setLoadingRealData(true);
      setRealDataError('');
      setRealDataNote('');
      try {
        const [purchaseRes, salesRes, salesIndexRes, courierRes] = await Promise.all([
          fetch(`/api/stock-purchases?dateFrom=${dateRange.startDate}&dateTo=${dateRange.endDate}&limit=500`),
          fetch(`/api/reports/sales?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
          fetch('/api/sales?saleType=canteen&limit=500'),
          fetch(`/api/courier-expenses?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`),
        ]);

        const purchaseJson = await purchaseRes.json();
        const salesJson = await salesRes.json();
        const salesIndexJson = await salesIndexRes.json();
        const courierJson = await courierRes.json();

        const purchases = Array.isArray(purchaseJson?.purchases) ? purchaseJson.purchases : [];
        const sales = Array.isArray(salesJson?.data?.sales) ? salesJson.data.sales : [];
        const salesIndex = Array.isArray(salesIndexJson?.sales) ? salesIndexJson.sales : [];
        const courierSummary = courierJson?.summary ?? {};

        const purchaseBuckets = {
          oilTin: [] as Array<{ amount: number; weight: number }>,
          petBottle: [] as Array<{ amount: number; weight: number }>,
          innerLead: [] as Array<{ amount: number; weight: number }>,
          cap: [] as Array<{ amount: number; weight: number }>,
          frontLabel: [] as Array<{ amount: number; weight: number }>,
          backLabel: [] as Array<{ amount: number; weight: number }>,
          anyLabel: [] as Array<{ amount: number; weight: number }>,
          cardboardBox: [] as Array<{ amount: number; weight: number }>,
        };
        const oilTinEqRows: Array<{ amount: number; weight: number }> = [];
        let oilPurchaseRowsUsed = 0;

        for (const p of purchases) {
          const nameRaw = String(p?.productName || '');
          const unitRaw = String(p?.unit || '');
          const combined = `${nameRaw} ${unitRaw}`.toLowerCase();
          const qty = Math.max(0, parseNumber(p?.quantity));
          if (qty <= 0) continue;
          const unitPrice = parseNumber(p?.unitPrice);
          const totalAmount = parseNumber(p?.totalAmount);
          const lineAmount = totalAmount > 0 ? totalAmount : unitPrice > 0 ? unitPrice * qty : 0;
          const amount = unitPrice > 0 ? unitPrice : lineAmount > 0 ? lineAmount / qty : 0;
          if (amount <= 0) continue;

          const row = { amount, weight: qty };
          const mlPerPackForBucket = parseMlFromText(nameRaw) ?? parseMlFromText(unitRaw);
          if ((combined.includes('pet') || combined.includes('bottle')) && mlPerPackForBucket === 200) {
            purchaseBuckets.petBottle.push(row);
          }
          if (
            combined.includes('inner') &&
            (
              combined.includes('lead') ||
              combined.includes('lid') ||
              combined.includes('seal') ||
              combined.includes('pet inner') ||
              combined.includes('cap')
            )
          ) {
            purchaseBuckets.innerLead.push(row);
          }
          if (combined.includes('cap')) purchaseBuckets.cap.push(row);
          if (combined.includes('front') && combined.includes('label')) purchaseBuckets.frontLabel.push(row);
          if (combined.includes('back') && combined.includes('label')) purchaseBuckets.backLabel.push(row);
          if (combined.includes('label')) purchaseBuckets.anyLabel.push(row);
          if (combined.includes('cardboard') || combined.includes('carton') || combined.includes('box')) {
            purchaseBuckets.cardboardBox.push(row);
          }

          // Real purchased oil/tin from bills:
          // convert purchase line to tin-equivalent cost (not just exact "tin" names).
          const looksPackaging = hasAny(combined, packagingKeywords);
          const mlPerPack = parseMlFromText(nameRaw) ?? parseMlFromText(unitRaw);
          if (!looksPackaging && mlPerPack && lineAmount > 0) {
            const tinsEq = (qty * mlPerPack) / TIN_ML;
            if (tinsEq > 0) {
              oilTinEqRows.push({ amount: lineAmount / tinsEq, weight: tinsEq });
              oilPurchaseRowsUsed += 1;
            }
          }
        }
        purchaseBuckets.oilTin = oilTinEqRows;

        const saleBuckets = {
          sellingTin: [] as Array<{ amount: number; weight: number }>,
          sellingBottle: [] as Array<{ amount: number; weight: number }>,
        };
        let saleRowsUsed = 0;
        for (const sale of sales) {
          const items = Array.isArray((sale as any)?.items) ? (sale as any).items : [];
          for (const it of items) {
            const nameRaw = String(it?.productName || '');
            const name = nameRaw.toLowerCase();
            const qty = Math.max(0, parseNumber(it?.quantity));
            const unitPrice = parseNumber(it?.unitPrice);
            if (qty <= 0 || unitPrice <= 0) continue;
            const mlPerPack = parseMlFromText(nameRaw);
            if (mlPerPack && mlPerPack >= 5000) {
              saleBuckets.sellingTin.push({ amount: unitPrice, weight: qty });
              saleRowsUsed += 1;
            }
            if (mlPerPack && mlPerPack > 0 && mlPerPack < 5000) {
              saleBuckets.sellingBottle.push({ amount: unitPrice, weight: qty });
              saleRowsUsed += 1;
            } else if (!mlPerPack && (name.includes('bottle') || name.includes('ml'))) {
              saleBuckets.sellingBottle.push({ amount: unitPrice, weight: qty });
              saleRowsUsed += 1;
            }
          }
        }

        // Invoice-level tin selling rate (preferred): total amount / total tins from generated invoices.
        // This avoids product-name mismatch issues and reflects real billed value.
        let invoiceTinRowsUsed = 0;
        let totalInvoiceTins = 0;
        for (const s of salesIndex) {
          const createdAt = String(s?.createdAt || '');
          const dateKey = createdAt.slice(0, 10);
          if (!dateKey || dateKey < dateRange.startDate || dateKey > dateRange.endDate) continue;
          const tinsRaw = parseNumber(s?.totalTins);
          const bottlesRaw = parseNumber(s?.totalBottles);
          const tins = tinsRaw > 0 ? tinsRaw : bottlesRaw > 0 ? bottlesRaw / AUTO_BOTTLES_PER_TIN : 0;
          const subtotalExGst = parseNumber(s?.subtotal);
          if (tins > 0 && subtotalExGst > 0) {
            saleBuckets.sellingTin.push({ amount: subtotalExGst / tins, weight: tins });
            totalInvoiceTins += tins;
            invoiceTinRowsUsed += 1;
          }
        }

        const courierCostExGst = parseNumber(courierSummary?.totalCostExGst);
        // IMPORTANT: courier quantity may be kg/weight/packets and not "boxes".
        // Allocate courier by actual sold tins for the selected period.
        // Protect against outliers when invoice tin counts are sparse.
        const courierPerTin = totalInvoiceTins > 0 ? courierCostExGst / totalInvoiceTins : null;
        const courierPerBottle = courierPerTin != null ? courierPerTin / AUTO_BOTTLES_PER_TIN : null;
        const courierPerBox = courierPerBottle != null ? courierPerBottle * INITIAL_INPUTS.bottlesPerBox : null;

        const oilPerTin = average(purchaseBuckets.oilTin);
        const sellTin = average(saleBuckets.sellingTin);
        const sellBottle = average(saleBuckets.sellingBottle);
        const petBottle = average(purchaseBuckets.petBottle);
        const innerLead = average(purchaseBuckets.innerLead);
        const cap = average(purchaseBuckets.cap);
        const frontLabel = average(purchaseBuckets.frontLabel) ?? average(purchaseBuckets.anyLabel);
        const backLabel = frontLabel;
        const box = average(purchaseBuckets.cardboardBox);

        const next: PNLInputs = {
          purchasedOilPerTin: oilPerTin ?? INITIAL_INPUTS.purchasedOilPerTin,
          bottlesPerTin: AUTO_BOTTLES_PER_TIN,
          sellingPricePerTin: sellTin ?? INITIAL_INPUTS.sellingPricePerTin,
          sellingPricePerBottle: sellBottle ?? INITIAL_INPUTS.sellingPricePerBottle,
          petBottleCostPerBottle: petBottle ?? INITIAL_INPUTS.petBottleCostPerBottle,
          innerLeadCostPerBottle: innerLead ?? INITIAL_INPUTS.innerLeadCostPerBottle,
          capCostPerBottle: cap ?? INITIAL_INPUTS.capCostPerBottle,
          frontLabelCostPerBottle: frontLabel ?? INITIAL_INPUTS.frontLabelCostPerBottle,
          backLabelCostPerBottle: backLabel ?? INITIAL_INPUTS.frontLabelCostPerBottle,
          bigCardboardBoxCost: box ?? INITIAL_INPUTS.bigCardboardBoxCost,
          bottlesPerBox: INITIAL_INPUTS.bottlesPerBox,
          courierChargePerBox: courierPerBox ?? INITIAL_INPUTS.courierChargePerBox,
        };

        setInputs((prev) =>
          useManualInputs
            ? prev
            : {
                ...prev,
                ...next,
                bottlesPerTin: AUTO_BOTTLES_PER_TIN,
                bottlesPerBox: prev.bottlesPerBox || INITIAL_INPUTS.bottlesPerBox,
              }
        );
        const fallbackFields = [
          !oilPerTin ? 'oil/tin buy' : '',
          !sellTin ? 'tin selling' : '',
          !sellBottle ? 'bottle selling' : '',
          !petBottle ? 'PET bottle' : '',
          !innerLead ? 'inner lead' : '',
          !cap ? 'cap' : '',
          !frontLabel ? 'front label' : '',
          !backLabel ? 'back label' : '',
          !box ? 'cardboard box' : '',
          courierPerTin == null ? 'courier/tin' : '',
        ].filter(Boolean);

        setRealDataNote(
          `Auto-loaded from real data (${dateRange.startDate} to ${dateRange.endDate}): ` +
            `oil rows=${oilPurchaseRowsUsed}, sales rows=${saleRowsUsed}, invoice tin rows=${invoiceTinRowsUsed}, total invoice tins=${totalInvoiceTins.toFixed(2)}, courier ex-GST=${courierCostExGst.toFixed(2)}, courier/tin=${courierPerTin != null ? courierPerTin.toFixed(2) : 'N/A'}.` +
            ` Bottles/tin fixed at ${AUTO_BOTTLES_PER_TIN} (16L - 1L wastage => 15L, 200ml each).` +
            (fallbackFields.length ? ` Fallback defaults used for: ${fallbackFields.join(', ')}.` : '')
        );
      } catch (error) {
        setRealDataError('Unable to load real billing/invoice data. Showing current values.');
      } finally {
        setLoadingRealData(false);
      }
    };

    fetchRealData();
  }, [dateRange, useManualInputs, refreshToken, AUTO_BOTTLES_PER_TIN]);

  const computed = useMemo(() => {
    const gstFactor = 1 + Math.max(0, gstRate) / 100;
    const asExclusive = (amount: number, rate: number = gstRate) =>
      gstMode === 'inclusive' ? amount / (1 + Math.max(0, rate) / 100) : amount;

    const safeBottlesPerTin = AUTO_BOTTLES_PER_TIN;
    const safeBottlesPerBox = Math.max(1, inputs.bottlesPerBox);

    const purchasedOilPerTinExcl = asExclusive(inputs.purchasedOilPerTin);
    const sellingPricePerTinExcl = asExclusive(inputs.sellingPricePerTin);
    const sellingPricePerBottleExcl = asExclusive(inputs.sellingPricePerBottle);
    const petBottleCostExcl = asExclusive(inputs.petBottleCostPerBottle, petBottleGstRate);
    const innerLeadCostExcl = asExclusive(inputs.innerLeadCostPerBottle, innerCapGstRate);
    const capCostExcl = asExclusive(inputs.capCostPerBottle, capGstRate);
    const frontLabelCostExcl = asExclusive(inputs.frontLabelCostPerBottle, frontLabelGstRate);
    const backLabelCostExcl = asExclusive(inputs.backLabelCostPerBottle, backLabelGstRate);
    const bigCardboardBoxCostExcl = asExclusive(inputs.bigCardboardBoxCost, cardboardBoxGstRate);
    const courierChargePerBoxExcl = asExclusive(inputs.courierChargePerBox, courierGstRate);
    const oilGstRate = Math.max(0, gstRate);
    const petRate = Math.max(0, petBottleGstRate);
    const innerRate = Math.max(0, innerCapGstRate);
    const capRateNum = Math.max(0, capGstRate);
    const frontRate = Math.max(0, frontLabelGstRate);
    const backRate = Math.max(0, backLabelGstRate);
    const boxRate = Math.max(0, cardboardBoxGstRate);
    const courierRateNum = Math.max(0, courierGstRate);

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

    const oilPerTinGst = (purchasedOilPerTinExcl * oilGstRate) / 100;
    const oilPerTinIncl = purchasedOilPerTinExcl + oilPerTinGst;

    const petBottleTotalExTin = petBottleCostExcl * safeBottlesPerTin;
    const petBottleTotalGstTin = (petBottleTotalExTin * petRate) / 100;
    const petBottleTotalInclTin = petBottleTotalExTin + petBottleTotalGstTin;

    const innerLeadTotalExTin = innerLeadCostExcl * safeBottlesPerTin;
    const innerLeadTotalGstTin = (innerLeadTotalExTin * innerRate) / 100;
    const innerLeadTotalInclTin = innerLeadTotalExTin + innerLeadTotalGstTin;

    const capTotalExTin = capCostExcl * safeBottlesPerTin;
    const capTotalGstTin = (capTotalExTin * capRateNum) / 100;
    const capTotalInclTin = capTotalExTin + capTotalGstTin;

    const frontLabelTotalExTin = frontLabelCostExcl * safeBottlesPerTin;
    const frontLabelTotalGstTin = (frontLabelTotalExTin * frontRate) / 100;
    const frontLabelTotalInclTin = frontLabelTotalExTin + frontLabelTotalGstTin;

    const backLabelTotalExTin = backLabelCostExcl * safeBottlesPerTin;
    const backLabelTotalGstTin = (backLabelTotalExTin * backRate) / 100;
    const backLabelTotalInclTin = backLabelTotalExTin + backLabelTotalGstTin;

    const boxTotalExTin = boxSharePerBottle * safeBottlesPerTin;
    const boxTotalGstTin = (boxTotalExTin * boxRate) / 100;
    const boxTotalInclTin = boxTotalExTin + boxTotalGstTin;

    const courierTotalExTin = courierSharePerBottle * safeBottlesPerTin;
    const courierTotalGstTin = (courierTotalExTin * courierRateNum) / 100;
    const courierTotalInclTin = courierTotalExTin + courierTotalGstTin;

    const totalGstPaidPerTin =
      oilPerTinGst +
      petBottleTotalGstTin +
      innerLeadTotalGstTin +
      capTotalGstTin +
      frontLabelTotalGstTin +
      backLabelTotalGstTin +
      boxTotalGstTin +
      courierTotalGstTin;
    const totalCostPerTinIncl = totalCostPerTin + totalGstPaidPerTin;

    const gstPerBottle = (sellingPricePerBottleExcl * Math.max(0, gstRate)) / 100;
    const sellingPricePerBottleIncl = sellingPricePerBottleExcl + gstPerBottle;
    const gstPerTin = (sellingPricePerTinExcl * Math.max(0, gstRate)) / 100;
    const sellingPricePerTinIncl = sellingPricePerTinExcl + gstPerTin;

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
      oilPerTinGst,
      oilPerTinIncl,
      petBottleTotalExTin,
      petBottleTotalInclTin,
      innerLeadTotalExTin,
      innerLeadTotalInclTin,
      capTotalExTin,
      capTotalInclTin,
      frontLabelTotalExTin,
      frontLabelTotalInclTin,
      backLabelTotalExTin,
      backLabelTotalInclTin,
      boxTotalExTin,
      boxTotalInclTin,
      courierTotalExTin,
      courierTotalInclTin,
      totalGstPaidPerTin,
      totalCostPerTinIncl,
      gstPerBottle,
      sellingPricePerBottleIncl,
      gstPerTin,
      sellingPricePerTinIncl,
    };
  }, [
    inputs,
    gstMode,
    gstRate,
    petBottleGstRate,
    innerCapGstRate,
    capGstRate,
    frontLabelGstRate,
    backLabelGstRate,
    cardboardBoxGstRate,
    courierGstRate,
    AUTO_BOTTLES_PER_TIN,
  ]);

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
      ['PET Bottle GST Rate (%)', petBottleGstRate.toFixed(2)],
      ['Inner Cap GST Rate (%)', innerCapGstRate.toFixed(2)],
      ['Cap GST Rate (%)', capGstRate.toFixed(2)],
      ['Front Label GST Rate (%)', frontLabelGstRate.toFixed(2)],
      ['Back Label GST Rate (%)', backLabelGstRate.toFixed(2)],
      ['Cardboard Box GST Rate (%)', cardboardBoxGstRate.toFixed(2)],
      ['Courier GST Rate (%)', courierGstRate.toFixed(2)],
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
      ['Label pricing rule', 'Back label cost follows front label cost'],
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
          <Button
            onClick={() => setUseManualInputs((v) => !v)}
            className={useManualInputs ? 'bg-amber-600 hover:bg-amber-700' : 'bg-gray-700 hover:bg-gray-800'}
          >
            {useManualInputs ? 'Manual Override: ON' : 'Manual Override: OFF'}
          </Button>
          <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700">
            Print
          </Button>
          <Button onClick={exportCsv} className="bg-green-600 hover:bg-green-700">
            Export CSV
          </Button>
        </div>
      </div>

      <Card title="Data Source" subtitle="Use bills + invoices to calculate real P&L">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            type="date"
            label="Start date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
          />
          <Input
            type="date"
            label="End date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
          />
          <div className="flex items-end">
            <Button onClick={() => setRefreshToken((v) => v + 1)} className="w-full">
              {loadingRealData ? 'Refreshing...' : 'Refresh Real Data'}
            </Button>
          </div>
          <div className="text-xs text-gray-600 self-end pb-2">
            {useManualInputs
              ? 'Manual override enabled: values below are editable.'
              : 'Manual override disabled: values are auto-loaded from real entries.'}
          </div>
        </div>
        {realDataNote && <p className="mt-3 text-xs text-green-700">{realDataNote}</p>}
        {realDataError && <p className="mt-2 text-xs text-red-700">{realDataError}</p>}
      </Card>

      <Card title="Input Costs & Selling Price" subtitle="Enter all values in INR">
        <div className="mb-4 p-3 rounded-md border border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
              label="General GST Rate (%)"
              value={gstRate}
              onChange={(e) => setGstRate(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 0)}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="PET Bottle GST Rate (%)"
              value={petBottleGstRate}
              onChange={(e) => setPetBottleGstRate(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 18)}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="Inner Cap GST Rate (%)"
              value={innerCapGstRate}
              onChange={(e) => setInnerCapGstRate(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 18)}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="Cap GST Rate (%)"
              value={capGstRate}
              onChange={(e) => setCapGstRate(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 18)}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="Front Label GST Rate (%)"
              value={frontLabelGstRate}
              onChange={(e) => setFrontLabelGstRate(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 18)}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="Back Label GST Rate (%)"
              value={backLabelGstRate}
              onChange={(e) => setBackLabelGstRate(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 18)}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="Cardboard Box GST Rate (%)"
              value={cardboardBoxGstRate}
              onChange={(e) => setCardboardBoxGstRate(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 18)}
            />
            <Input
              type="number"
              step="0.01"
              min="0"
              label="Courier GST Rate (%)"
              value={courierGstRate}
              onChange={(e) => setCourierGstRate(Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : 18)}
            />
            <div className="text-xs text-gray-600 self-end pb-2">
              {gstMode === 'inclusive'
                ? 'P&L is calculated on ex-GST values using component-wise GST rates.'
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
            disabled={!useManualInputs}
          />
          <Input type="number" step="1" label="Bottles per tin (auto: 15L usable / 200ml)" value={AUTO_BOTTLES_PER_TIN} disabled />
          <Input
            type="number"
            step="0.01"
            label="Selling price per tin"
            value={inputs.sellingPricePerTin}
            onChange={(e) => onChangeNumber('sellingPricePerTin', e.target.value)}
            disabled={!useManualInputs}
          />
          <Input
            type="number"
            step="0.01"
            label="Selling price per bottle"
            value={inputs.sellingPricePerBottle}
            onChange={(e) => onChangeNumber('sellingPricePerBottle', e.target.value)}
            disabled={!useManualInputs}
          />
          <Input
            type="number"
            step="0.01"
            label="PET bottle cost (per bottle)"
            value={inputs.petBottleCostPerBottle}
            onChange={(e) => onChangeNumber('petBottleCostPerBottle', e.target.value)}
            disabled={!useManualInputs}
          />
          <Input
            type="number"
            step="0.01"
            label="Inner lead cost (per bottle)"
            value={inputs.innerLeadCostPerBottle}
            onChange={(e) => onChangeNumber('innerLeadCostPerBottle', e.target.value)}
            disabled={!useManualInputs}
          />
          <Input
            type="number"
            step="0.01"
            label="Cap cost (per bottle)"
            value={inputs.capCostPerBottle}
            onChange={(e) => onChangeNumber('capCostPerBottle', e.target.value)}
            disabled={!useManualInputs}
          />
          <Input
            type="number"
            step="0.01"
            label="Front label cost (per bottle)"
            value={inputs.frontLabelCostPerBottle}
            onChange={(e) => onChangeNumber('frontLabelCostPerBottle', e.target.value)}
            disabled={!useManualInputs}
          />
          <Input
            type="number"
            step="0.01"
            label="Back label cost (per bottle)"
            value={inputs.backLabelCostPerBottle}
            onChange={(e) => onChangeNumber('backLabelCostPerBottle', e.target.value)}
            disabled={!useManualInputs}
          />
          <Input
            type="number"
            step="0.01"
            label="Big cardboard box cost (per box)"
            value={inputs.bigCardboardBoxCost}
            onChange={(e) => onChangeNumber('bigCardboardBoxCost', e.target.value)}
            disabled={!useManualInputs}
          />
          <Input
            type="number"
            step="1"
            min="1"
            label="Bottles per box"
            value={inputs.bottlesPerBox}
            onChange={(e) => onChangeNumber('bottlesPerBox', e.target.value)}
            disabled={!useManualInputs}
          />
          <Input
            type="number"
            step="0.01"
            label="Courier charge (per box)"
            value={inputs.courierChargePerBox}
            onChange={(e) => onChangeNumber('courierChargePerBox', e.target.value)}
            disabled={!useManualInputs}
          />
        </div>
      </Card>

      <Card title="GST & 1-Unit Price Reference" subtitle="Shows which GST applies to each component">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 pr-4">Component</th>
                <th className="text-right py-2 pr-4">1 Unit Price (Input)</th>
                <th className="text-right py-2 pr-4">GST Rate</th>
                <th className="text-right py-2 pr-4">GST Amount / Unit</th>
                <th className="text-right py-2 pr-4">1 Unit Price (Ex GST)</th>
                <th className="text-right py-2">1 Unit Price (Incl GST)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-2 pr-4">PET Bottle</td>
                <td className="py-2 pr-4 text-right">{toCurrency(inputs.petBottleCostPerBottle)}</td>
                <td className="py-2 pr-4 text-right">{petBottleGstRate.toFixed(2)}%</td>
                <td className="py-2 pr-4 text-right">{toCurrency((computed.petBottleCostExcl * petBottleGstRate) / 100)}</td>
                <td className="py-2 pr-4 text-right">{toCurrency(computed.petBottleCostExcl)}</td>
                <td className="py-2 text-right">{toCurrency(computed.petBottleCostExcl * (1 + petBottleGstRate / 100))}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Inner Cap</td>
                <td className="py-2 pr-4 text-right">{toCurrency(inputs.innerLeadCostPerBottle)}</td>
                <td className="py-2 pr-4 text-right">{innerCapGstRate.toFixed(2)}%</td>
                <td className="py-2 pr-4 text-right">{toCurrency((computed.innerLeadCostExcl * innerCapGstRate) / 100)}</td>
                <td className="py-2 pr-4 text-right">{toCurrency(computed.innerLeadCostExcl)}</td>
                <td className="py-2 text-right">{toCurrency(computed.innerLeadCostExcl * (1 + innerCapGstRate / 100))}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Cap</td>
                <td className="py-2 pr-4 text-right">{toCurrency(inputs.capCostPerBottle)}</td>
                <td className="py-2 pr-4 text-right">{capGstRate.toFixed(2)}%</td>
                <td className="py-2 pr-4 text-right">{toCurrency((computed.capCostExcl * capGstRate) / 100)}</td>
                <td className="py-2 pr-4 text-right">{toCurrency(computed.capCostExcl)}</td>
                <td className="py-2 text-right">{toCurrency(computed.capCostExcl * (1 + capGstRate / 100))}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Front Label</td>
                <td className="py-2 pr-4 text-right">{toCurrency(inputs.frontLabelCostPerBottle)}</td>
                <td className="py-2 pr-4 text-right">{frontLabelGstRate.toFixed(2)}%</td>
                <td className="py-2 pr-4 text-right">{toCurrency((computed.frontLabelCostExcl * frontLabelGstRate) / 100)}</td>
                <td className="py-2 pr-4 text-right">{toCurrency(computed.frontLabelCostExcl)}</td>
                <td className="py-2 text-right">{toCurrency(computed.frontLabelCostExcl * (1 + frontLabelGstRate / 100))}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Back Label</td>
                <td className="py-2 pr-4 text-right">{toCurrency(inputs.backLabelCostPerBottle)}</td>
                <td className="py-2 pr-4 text-right">{backLabelGstRate.toFixed(2)}%</td>
                <td className="py-2 pr-4 text-right">{toCurrency((computed.backLabelCostExcl * backLabelGstRate) / 100)}</td>
                <td className="py-2 pr-4 text-right">{toCurrency(computed.backLabelCostExcl)}</td>
                <td className="py-2 text-right">{toCurrency(computed.backLabelCostExcl * (1 + backLabelGstRate / 100))}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Cardboard Box</td>
                <td className="py-2 pr-4 text-right">{toCurrency(inputs.bigCardboardBoxCost)}</td>
                <td className="py-2 pr-4 text-right">{cardboardBoxGstRate.toFixed(2)}%</td>
                <td className="py-2 pr-4 text-right">{toCurrency(((computed.boxSharePerBottle * Math.max(1, inputs.bottlesPerBox)) * cardboardBoxGstRate) / 100)}</td>
                <td className="py-2 pr-4 text-right">{toCurrency((computed.boxSharePerBottle * Math.max(1, inputs.bottlesPerBox)))}</td>
                <td className="py-2 text-right">{toCurrency((computed.boxSharePerBottle * Math.max(1, inputs.bottlesPerBox)) * (1 + cardboardBoxGstRate / 100))}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Courier (per box)</td>
                <td className="py-2 pr-4 text-right">{toCurrency(inputs.courierChargePerBox)}</td>
                <td className="py-2 pr-4 text-right">{courierGstRate.toFixed(2)}%</td>
                <td className="py-2 pr-4 text-right">{toCurrency(((computed.courierSharePerBottle * Math.max(1, inputs.bottlesPerBox)) * courierGstRate) / 100)}</td>
                <td className="py-2 pr-4 text-right">{toCurrency((computed.courierSharePerBottle * Math.max(1, inputs.bottlesPerBox)))}</td>
                <td className="py-2 text-right">{toCurrency((computed.courierSharePerBottle * Math.max(1, inputs.bottlesPerBox)) * (1 + courierGstRate / 100))}</td>
              </tr>
              <tr className="font-semibold bg-gray-50">
                <td className="py-2 pr-4">Selling (Oil)</td>
                <td className="py-2 pr-4 text-right">{toCurrency(inputs.sellingPricePerBottle)}</td>
                <td className="py-2 pr-4 text-right">{gstRate.toFixed(2)}%</td>
                <td className="py-2 pr-4 text-right">{toCurrency((computed.sellingPricePerBottleExcl * gstRate) / 100)}</td>
                <td className="py-2 pr-4 text-right">{toCurrency(computed.sellingPricePerBottleExcl)}</td>
                <td className="py-2 text-right">{toCurrency(computed.sellingPricePerBottleIncl)}</td>
              </tr>
            </tbody>
          </table>
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
            <div className="flex justify-between">
              <span>GST on selling ({gstRate.toFixed(2)}%)</span>
              <span>{toCurrency(computed.gstPerBottle)}</span>
            </div>
            <div className="flex justify-between">
              <span>Selling price incl GST</span>
              <span>{toCurrency(computed.sellingPricePerBottleIncl)}</span>
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
            <div className="text-xs text-gray-500 -mt-1">
              1 unit: {toCurrency(computed.purchasedOilPerTinExcl)} ex GST | {toCurrency(computed.oilPerTinIncl)} incl GST
            </div>
            <div className="flex justify-between">
              <span>PET bottle ({computed.bottlesPerTinUsed} units)</span>
              <span>{toCurrency(computed.petBottleTotalExTin)}</span>
            </div>
            <div className="text-xs text-gray-500 -mt-1">
              1 unit: {toCurrency(computed.petBottleCostExcl)} ex | {toCurrency(computed.petBottleCostExcl * (1 + petBottleGstRate / 100))} incl
              {' '}| Total incl: {toCurrency(computed.petBottleTotalInclTin)}
            </div>
            <div className="flex justify-between">
              <span>Inner lead ({computed.bottlesPerTinUsed} units)</span>
              <span>{toCurrency(computed.innerLeadTotalExTin)}</span>
            </div>
            <div className="text-xs text-gray-500 -mt-1">
              1 unit: {toCurrency(computed.innerLeadCostExcl)} ex | {toCurrency(computed.innerLeadCostExcl * (1 + innerCapGstRate / 100))} incl
              {' '}| Total incl: {toCurrency(computed.innerLeadTotalInclTin)}
            </div>
            <div className="flex justify-between">
              <span>Cap ({computed.bottlesPerTinUsed} units)</span>
              <span>{toCurrency(computed.capTotalExTin)}</span>
            </div>
            <div className="text-xs text-gray-500 -mt-1">
              1 unit: {toCurrency(computed.capCostExcl)} ex | {toCurrency(computed.capCostExcl * (1 + capGstRate / 100))} incl
              {' '}| Total incl: {toCurrency(computed.capTotalInclTin)}
            </div>
            <div className="flex justify-between">
              <span>Front label ({computed.bottlesPerTinUsed} units)</span>
              <span>{toCurrency(computed.frontLabelTotalExTin)}</span>
            </div>
            <div className="text-xs text-gray-500 -mt-1">
              1 unit: {toCurrency(computed.frontLabelCostExcl)} ex | {toCurrency(computed.frontLabelCostExcl * (1 + frontLabelGstRate / 100))} incl
              {' '}| Total incl: {toCurrency(computed.frontLabelTotalInclTin)}
            </div>
            <div className="flex justify-between">
              <span>Back label ({computed.bottlesPerTinUsed} units)</span>
              <span>{toCurrency(computed.backLabelTotalExTin)}</span>
            </div>
            <div className="text-xs text-gray-500 -mt-1">
              1 unit: {toCurrency(computed.backLabelCostExcl)} ex | {toCurrency(computed.backLabelCostExcl * (1 + backLabelGstRate / 100))} incl
              {' '}| Total incl: {toCurrency(computed.backLabelTotalInclTin)}
            </div>
            <div className="flex justify-between">
              <span>Big cardboard box share</span>
              <span>{toCurrency(computed.boxTotalExTin)}</span>
            </div>
            <div className="text-xs text-gray-500 -mt-1">
              1 unit (box): {toCurrency(computed.boxTotalExTin)} ex | {toCurrency(computed.boxTotalInclTin)} incl
            </div>
            <div className="flex justify-between">
              <span>Courier charge share</span>
              <span>{toCurrency(computed.courierTotalExTin)}</span>
            </div>
            <div className="text-xs text-gray-500 -mt-1">
              1 unit (tin share): {toCurrency(computed.courierTotalExTin)} ex | {toCurrency(computed.courierTotalInclTin)} incl
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total packaging + box + courier (for one tin)</span>
              <span>{toCurrency(computed.packagingAndCourierPerTin)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total cost per tin</span>
              <span>{toCurrency(computed.totalCostPerTin)}</span>
            </div>
            <div className="flex justify-between font-semibold text-purple-700">
              <span>Total GST paid for 1 tin</span>
              <span>{toCurrency(computed.totalGstPaidPerTin)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total cost per tin (incl GST)</span>
              <span>{toCurrency(computed.totalCostPerTinIncl)}</span>
            </div>
            <div className="text-xs text-gray-600">
              Formula: Purchased oil per tin + Total packaging/box/courier per tin
            </div>
            <div className="flex justify-between">
              <span>Selling price per tin</span>
              <span>{toCurrency(computed.sellingPricePerTinExcl)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST on selling ({gstRate.toFixed(2)}%)</span>
              <span>{toCurrency(computed.gstPerTin)}</span>
            </div>
            <div className="flex justify-between">
              <span>Selling price incl GST</span>
              <span>{toCurrency(computed.sellingPricePerTinIncl)}</span>
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
