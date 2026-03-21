/**
 * POS catalog rules: finished goods only — hide packaging components (PET, caps, labels)
 * that exist for inventory / costing but are not sold as line items on POS.
 */

export const CASTOR_200ML_OLD_CODE = '55336';
export const CASTOR_200ML_NEW_CODE = '68539';
export const CASTOR_200ML_LEGACY_ID = 'castor-200ml';
/** Single label in POS / invoices for all Castor 200ml billing codes */
export const CASTOR_200ML_DISPLAY_NAME = 'TOM-Castor Oil - 200ml';

const CASTOR_200ML_IDS = new Set([CASTOR_200ML_OLD_CODE, CASTOR_200ML_NEW_CODE, CASTOR_200ML_LEGACY_ID]);

/** True if unit or name indicates 200ml (handles "200 ml", "200ml", "200 ML"). */
export function textIndicates200ml(text: string): boolean {
  const t = String(text || '').toLowerCase();
  return /\b200\s*ml\b/.test(t) || t.replace(/\s/g, '').includes('200ml');
}

export function isCastor200mlProductId(id: string): boolean {
  return CASTOR_200ML_IDS.has(String(id ?? '').trim());
}

export function isCastor200mlByNameAndUnit(name: string, unit: string): boolean {
  const n = String(name || '').toLowerCase();
  if (!n.includes('castor')) return false;
  if (n.includes('200') || textIndicates200ml(n)) return true;
  return textIndicates200ml(unit);
}

/** Normalize MySQL 0/1 or string "0"/"1" to boolean (client + API). */
export function isTruthyActive(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (value === false || value === 0 || value === null || value === undefined) return false;
  const s = String(value).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

/** Packaging SKUs from seed (pack_*) and known component types — not sold on POS. */
export function isPosPackagingComponent(p: {
  id: string;
  name?: string;
  type?: string;
  category?: string;
  description?: string;
  unit?: string;
}): boolean {
  // Never treat Castor 200ml billing rows as packaging (avoids false positives, e.g. "PET" edge cases).
  if (isCastor200mlProductId(p.id)) return false;
  if (isCastor200mlByNameAndUnit(String(p.name ?? ''), String(p.unit ?? ''))) return false;

  const id = String(p.id ?? '').trim().toLowerCase();
  if (id.startsWith('pack_')) return true;

  const type = String(p.type ?? '').trim().toLowerCase();
  if (['bottle', 'inner cap', 'flip top cap', 'label'].includes(type)) return true;

  const cat = String(p.category ?? '').trim().toLowerCase();
  if (cat === 'packaging') return true;

  const name = String(p.name ?? '').toLowerCase();
  const desc = String(p.description ?? '').toLowerCase();
  if (desc.includes('packaging component')) return true;
  // PET bottle / caps / labels (avoid lone \bpet\b — can false-positive on some strings)
  if (
    /\bpet\s+bottle\b/i.test(name) ||
    /^pet\s*[-–]/.test(name.trim()) ||
    /\bflip\s*top\b/.test(name) ||
    /\binner\s*cap\b/.test(name) ||
    /\bfront\s*label\b/.test(name) ||
    /\bback\s*label\b/.test(name)
  ) {
    if (name.includes('castor') && name.includes('oil')) return false;
    return true;
  }

  return false;
}
