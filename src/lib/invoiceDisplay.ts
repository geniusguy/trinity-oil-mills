/**
 * Canteen invoice line label: "68531 : TOM-Cooking Gingelly Oil"
 * - products.id may be a slug (e.g. gingelly-500ml) while products.name embeds the billing code (68531: …).
 * - Avoid "gingelly-500ml : 68531: TOM-…" duplication.
 */
export function formatInvoiceItemLine(productId: string | null | undefined, rawName: string | null | undefined): string {
  const pid = String(productId ?? '').trim();
  let name = String(rawName ?? '').trim();

  if (!name && !pid) return 'Product';

  // Name stored as "68531: TOM-Cooking Gingelly Oil" (billing code + label)
  const embedded = name.match(/^(\d+)\s*:\s*(.+)$/);
  if (embedded) {
    return `${embedded[1]} : ${embedded[2].trim()}`;
  }

  // Numeric SKU on sale line — standard "id : name"
  if (/^\d+$/.test(pid)) {
    return name ? `${pid} : ${name}` : pid;
  }

  // Internal slug id (gingelly-500ml, castor-200ml, prod-gingelly) — show name only
  if (name) return name;

  return pid || 'Product';
}
