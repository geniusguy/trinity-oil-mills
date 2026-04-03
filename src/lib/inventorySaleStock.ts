/**
 * Inventory adjustments for sale lines — must stay in sync with POST /api/sales deduction rules
 * (Castor 200ml multi product_id lookup, pick row with highest quantity).
 */
import { isCastor200mlProduct, CASTOR_200ML_LOOKUP_IDS } from '@/lib/canteenSupply';

export type SaleLineInventoryContext = {
  productId: string;
  /** Negative = deduct (sale), positive = restore (sale delete / reversal). */
  quantityDelta: number;
  productName?: string | null;
  productUnit?: string | null;
};

export async function adjustInventoryForSaleLine(
  connection: { query: (sql: string, params?: unknown[]) => Promise<unknown>; execute: (sql: string, params?: unknown[]) => Promise<unknown> },
  args: SaleLineInventoryContext,
): Promise<void> {
  const pid = String(args.productId ?? '').trim();
  const delta = Number(args.quantityDelta);
  if (!Number.isFinite(delta) || delta === 0) return;

  const productName = args.productName ?? '';
  const productUnit = args.productUnit ?? '';

  const isCastor = isCastor200mlProduct({ name: productName, unit: productUnit }, pid);
  const lookupIds = isCastor ? Array.from(new Set([...CASTOR_200ML_LOOKUP_IDS, pid])) : [pid];

  let invId: string | null = null;
  if (lookupIds.length === 1) {
    const [rows]: any = await connection.query('SELECT id FROM inventory WHERE product_id = ? LIMIT 1', [
      lookupIds[0],
    ]);
    if (rows && rows[0]) invId = rows[0].id;
  } else {
    let best: { id: string; quantity: number } | null = null;
    for (const id of lookupIds) {
      const [rows]: any = await connection.query('SELECT id, quantity FROM inventory WHERE product_id = ? LIMIT 1', [
        id,
      ]);
      if (rows && rows[0]) {
        const q = Number(rows[0].quantity ?? 0);
        if (!best || q > best.quantity) best = { id: rows[0].id, quantity: q };
      }
    }
    if (best) invId = best.id;
  }

  if (!invId) {
    const insertProductId = isCastor ? 'castor-200ml' : pid;
    invId = `inv-${insertProductId}-${Date.now()}`;
    await connection.execute(
      `INSERT INTO inventory (id, product_id, quantity, min_stock, max_stock, location, created_at, updated_at)
       VALUES (?, ?, 0, 10, 1000, 'main_store', NOW(), NOW())`,
      [invId, insertProductId],
    );
  }

  if (delta < 0) {
    const q = Math.abs(delta);
    await connection.execute('UPDATE inventory SET quantity = quantity - ?, updated_at = NOW() WHERE id = ?', [
      q,
      invId,
    ]);
  } else {
    await connection.execute('UPDATE inventory SET quantity = quantity + ?, updated_at = NOW() WHERE id = ?', [
      delta,
      invId,
    ]);
  }
}
