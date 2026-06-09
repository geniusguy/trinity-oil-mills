const CASTOR_200ML_VARIANT_IDS = new Set(['55336', '68539', 'castor-200ml']);

/** Map legacy Castor SKUs to canonical product row for HSN lookup. */
export function canonicalProductIdForHsn(productId: string | null | undefined): string {
  const pid = String(productId ?? '').trim();
  if (CASTOR_200ML_VARIANT_IDS.has(pid)) return 'castor-200ml';
  return pid;
}

/** HSN shown on invoices — trimmed product value, or empty when not set. */
export function resolveHsnCode(hsn: string | null | undefined): string {
  return String(hsn ?? '').trim();
}
