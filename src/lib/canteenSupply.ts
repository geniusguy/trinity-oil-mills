/**
 * Canteen supply volume — must match POST /api/sales (pack size from name+unit).
 * Tin-equivalent uses 15.2 L per tin (usable oil; 0.8 L per nominal 16 L treated as wastage).
 */

export const CASTOR_200ML_LOOKUP_IDS = ['55336', '68539', 'castor-200ml'];
export const CASTOR_200ML_NEW_ID = '68539';

export function isCastor200mlProduct(
  prod: { name?: string | null; unit?: string | null },
  pid: string,
): boolean {
  const p = String(pid ?? '').trim();
  if (CASTOR_200ML_LOOKUP_IDS.includes(p) || p === CASTOR_200ML_NEW_ID || p === '55336') return true;

  const combined = `${prod?.name ?? ''} ${prod?.unit ?? ''}`.toLowerCase();
  const hasCastorWords = combined.includes('castor');
  if (!hasCastorWords) return false;

  const mlMatch = combined.match(/(\d+(?:\.\d+)?)\D*ml\b/);
  if (!mlMatch) return false;
  const ml = Number(mlMatch[1]);
  return Number.isFinite(ml) && ml === 200;
}

/** Parse ml/L from a size string (unit column or product name). */
function parsePackLitersFromSizeText(text: string): number | null {
  const name = text.trim().toLowerCase();
  if (!name) return null;

  const mlMatch = name.match(/(\d+(?:\.\d+)?)\s*ml\b/);
  if (mlMatch) {
    const ml = Number(mlMatch[1]);
    if (Number.isFinite(ml) && ml > 0) return ml / 1000;
  }

  // Require whitespace (or start) before L — avoids product codes like "68532: … oil" matching as liters.
  const lMatch = name.match(/(\d+(?:\.\d+)?)\s*(?:l|lt|ltr|liter|litre)\b/);
  if (lMatch) {
    const l = Number(lMatch[1]);
    if (Number.isFinite(l) && l > 0) return l;
  }

  return null;
}

/**
 * Liters per single pack/unit, from product name + unit (same rules as sales route).
 * Returns null if size cannot be parsed (no ml/L in text).
 */
export function packLitersPerUnit(productName: string, unit: string, productId: string): number | null {
  const productUnit = unit ? String(unit) : '';
  const pid = String(productId).trim();

  if (isCastor200mlProduct({ name: productName, unit: productUnit }, pid)) return 0.2;

  const fromUnit = parsePackLitersFromSizeText(productUnit);
  if (fromUnit !== null) return fromUnit;

  const sizeText = `${productName} ${productUnit}`.trim();
  return parsePackLitersFromSizeText(sizeText);
}

/** 15.2 L per tin — matches `totalTinsSupply = totalLitersSupply / CANTEEN_LITERS_PER_TIN` in POST /api/sales */
export const CANTEEN_LITERS_PER_TIN = 15.2;

/** 200ml shipping box capacity (also used as register fallback when pack size is unknown). */
export const BOTTLES_PER_BOX = 40;

/** Bottles per cardboard box by pack size (invoice: sum boxes per line, not pooled across sizes). */
export function bottlesPerBoxForPackLiters(packLiters: number): number {
  if (!(packLiters > 0)) return BOTTLES_PER_BOX;
  if (packLiters <= 0.25) return 40; // 200ml
  if (packLiters <= 0.6) return 20; // 500ml
  if (packLiters <= 1.5) return 15; // 1L
  return BOTTLES_PER_BOX;
}

/** Bottle-sized pack: under 5 L per unit (200ml, 500ml, 1L) — same rule as POST /api/sales. */
export function isBottlePackLiters(packLiters: number | null): boolean {
  return packLiters !== null && packLiters > 0 && packLiters < 5;
}

export type SaleLineForBottles = {
  quantity?: number | string | null;
  productName?: string | null;
  product_name?: string | null;
  name?: string | null;
  unit?: string | null;
  product_unit?: string | null;
  product_id?: string | null;
  productId?: string | null;
};

/** Sum bottle-line quantities (200ml, 500ml, 1L, etc.) — matches sales `supplyTotalBottles`. */
export function bottleCountFromSaleItems(items: SaleLineForBottles[]): number {
  let total = 0;
  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    if (!(qty > 0)) continue;
    const name = String(item.productName ?? item.product_name ?? item.name ?? '');
    const unit = String(item.unit ?? item.product_unit ?? '');
    const pid = String(item.product_id ?? item.productId ?? '');
    const pack = packLitersPerUnit(name, unit, pid);
    if (isBottlePackLiters(pack)) total += qty;
  }
  return total;
}

export function boxesFromBottleCount(bottleCount: number, bottlesPerBox: number = BOTTLES_PER_BOX): number {
  if (!(bottleCount > 0) || !(bottlesPerBox > 0)) return 0;
  return Math.ceil(bottleCount / bottlesPerBox);
}

/**
 * Invoice box count: per line ceil(qty / bottles-per-box for that pack), then sum.
 * e.g. 60×500ml → 3 boxes, 45×1L → 3 boxes → total 6.
 */
export function boxesFromSaleItems(items: SaleLineForBottles[]): number {
  let totalBoxes = 0;
  for (const item of items) {
    const qty = Number(item.quantity) || 0;
    if (!(qty > 0)) continue;
    const name = String(item.productName ?? item.product_name ?? item.name ?? '');
    const unit = String(item.unit ?? item.product_unit ?? '');
    const pid = String(item.product_id ?? item.productId ?? '');
    const pack = packLitersPerUnit(name, unit, pid);
    if (!isBottlePackLiters(pack) || pack == null) continue;
    const perBox = bottlesPerBoxForPackLiters(pack);
    totalBoxes += Math.ceil(qty / perBox);
  }
  return totalBoxes;
}

/**
 * Total liters for a sale line (quantity × pack liters).
 */
export function lineSupplyLiters(
  quantity: number,
  productName: string,
  unit: string,
  productId: string,
): number | null {
  const pack = packLitersPerUnit(productName, unit, productId);
  if (pack == null || !Number.isFinite(quantity) || quantity <= 0) return null;
  return pack * quantity;
}

/**
 * Tin-equivalent for one line (decimal), same as allocating total_tins across lines proportionally.
 */
export function tinEquivalentForCanteenLine(
  quantity: number,
  productName: string,
  unit: string,
  productId: string,
): number | null {
  const liters = lineSupplyLiters(quantity, productName, unit, productId);
  if (liters == null) return null;
  return liters / CANTEEN_LITERS_PER_TIN;
}
