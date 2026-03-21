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

/**
 * Liters per single pack/unit, from product name + unit (same rules as sales route).
 * Returns null if size cannot be parsed (no ml/L in text).
 */
export function packLitersPerUnit(productName: string, unit: string, productId: string): number | null {
  const productUnit = unit ? String(unit) : '';
  const sizeText = `${productName} ${productUnit}`.trim();
  const name = sizeText.toLowerCase();
  const pid = String(productId).trim();

  if (isCastor200mlProduct({ name: productName, unit: productUnit }, pid)) return 0.2;

  const mlMatch = name.match(/(\d+(?:\.\d+)?)\D*ml\b/);
  if (mlMatch) {
    const ml = Number(mlMatch[1]);
    if (Number.isFinite(ml) && ml > 0) return ml / 1000;
  }
  const lMatch = name.match(/(\d+(?:\.\d+)?)\D*(l|liter|litre)\b/);
  if (lMatch) {
    const l = Number(lMatch[1]);
    if (Number.isFinite(l) && l > 0) return l;
  }
  return null;
}

/** 15.2 L per tin — matches `totalTinsSupply = totalLitersSupply / CANTEEN_LITERS_PER_TIN` in POST /api/sales */
export const CANTEEN_LITERS_PER_TIN = 15.2;

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
