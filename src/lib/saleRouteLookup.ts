import { INVOICE_NUMBER_FULL_REGEX } from '@/lib/financialYear';

/** Next.js 15+ may pass `params` as a Promise; older code used a plain object. */
export async function resolveDynamicRouteId(
  params: Promise<{ id: string }> | { id: string }
): Promise<string> {
  const p = (await Promise.resolve(params)) as { id?: string };
  const raw = p?.id;
  if (raw == null) return '';
  return decodeURIComponent(String(raw).trim());
}

/**
 * Build DB lookup keys from the URL segment (handles restored DBs / copy-paste variants).
 */
export function collectSaleLookupKeys(routeId: string): { idKeys: string[]; invoiceKeys: string[] } {
  const base = String(routeId || '').trim();
  const idSet = new Set<string>();
  const invSet = new Set<string>();

  const addId = (s: string) => {
    const t = s.trim();
    if (t) idSet.add(t);
  };

  if (!base) {
    return { idKeys: [], invoiceKeys: [] };
  }

  addId(base);

  const salePrefix = base.match(/^(sale)[-_]/i);
  if (salePrefix) {
    const tail = base.slice(salePrefix[0].length);
    addId(tail);
    if (/^\d+$/.test(tail)) {
      addId(`sale-${tail}`);
    }
  }

  if (/^\d+$/.test(base)) {
    addId(`sale-${base}`);
  }

  if (INVOICE_NUMBER_FULL_REGEX.test(base)) {
    invSet.add(base);
  }

  return {
    idKeys: [...idSet],
    invoiceKeys: [...invSet],
  };
}
