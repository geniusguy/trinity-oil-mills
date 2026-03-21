# Tin equivalent conventions (15.2 L vs 16 L vs 15200 ml)

## Business rule

- **Nominal tin size:** often labeled **16 L** (physical / marketing).
- **Usable oil per tin (accounting):** **15.2 L** — **0.8 L** treated as wastage.
- **Single constant in code:** `CANTEEN_LITERS_PER_TIN = 15.2` in `src/lib/canteenSupply.ts`

## Where **15.2 L per tin** is used (canteen / sales / inventory reports)

| Area | File(s) |
|------|---------|
| Constant | `src/lib/canteenSupply.ts` |
| New canteen sale `total_tins` | `src/app/api/sales/route.ts` — `total_liters / CANTEEN_LITERS_PER_TIN` |
| Supplied-details tin report | `src/app/api/reports/supplied-details/route.ts` |
| Inventory “No. of Tins (equiv.)” | `src/app/dashboard/admin/inventory/page.tsx` |
| Supplied-details UI copy | `src/app/dashboard/admin/sales/supplied-details/page.tsx` |
| CLI tally | `scripts/inventory-tin-tally.ts` (`npm run inventory:tally`) |
| Backfill script | `scripts/migrate-fill-sales-supply-totals.js` — `totalLiters / 15.2` |
| Raw materials (bottle pour from tin) | `src/app/dashboard/admin/raw-materials/page.tsx` — uses `CANTEEN_LITERS_PER_TIN` |

## Where **15200 ml** appears (same as **15.2 L** in metric)

`15200 ml = 15.2 L` — used for **whole-tin** math on **stock purchases** / admin purchases, not a different business rule:

| Area | File(s) |
|------|---------|
| Purchase tin floor math | `src/lib/purchaseVolume.ts` — `TIN_ML = 15200` |
| Oil purchase volume UI | `src/app/dashboard/admin/oil-purchase-volume/page.tsx` |
| Stock purchases volume summary API | `src/app/api/stock-purchases/volume-summary/route.ts` — `tinCapacityMl: 15200` (label) |

So: **canteen tin-equivalent** = liters ÷ **15.2**; **purchase “tins”** = volume ÷ **15200 ml** — numerically aligned (15.2 L = 15200 ml).

## Where **16** is still intentional (not changed to 15.2)

These refer to **nominal 16 L / 16 kg** (physical pack or weight), not the accounting tin divisor:

| Area | Notes |
|------|--------|
| `src/app/api/sales/[id]/invoice/html/route.ts` | Gross weight: **16 kg** for a **16 L** tin name |
| `src/app/api/sales/route.ts` — `getWeightPerUnitKg` | Same — **kg** for courier, not tin-equivalent |
| `src/app/dashboard/admin/raw-materials/page.tsx` | Display names like “Oil TIN **(16L)**” — physical label |
| `src/app/dashboard/admin/purchases/page.tsx` | Help text “**15200 ml**” per tin — same as 15.2 L |

---

## Fixing **historical** `total_tins` in the database (local + server)

Rows saved **before** switching to 15.2 may have `total_tins = total_liters / 16`. To realign from stored liters:

**Prerequisite:** `total_liters` on each row must be correct.

```sql
-- Preview
SELECT id, invoice_number, total_liters, total_tins,
       ROUND(total_liters / 15.2, 2) AS tins_15_2
FROM sales
WHERE sale_type = 'canteen'
  AND total_liters IS NOT NULL
  AND total_liters > 0;

-- Apply (backup DB first)
UPDATE sales
SET total_tins = ROUND(total_liters / 15.2, 2)
WHERE sale_type = 'canteen'
  AND total_liters IS NOT NULL;
```

Or run the project script (rewrites from line items — review before production):

```bash
cd oil-shop-web
node scripts/migrate-fill-sales-supply-totals.js
```

---

## Deploy checklist (local + server)

1. **Pull** latest code with `CANTEEN_LITERS_PER_TIN = 15.2`.
2. **Build** — `npm run build` (or your CI).
3. **Restart** the Node/PM2 process so the new API code runs.
4. **Database** — run the SQL above **or** the migrate script if you need historical `total_tins` fixed.
5. **Verify** — create a test canteen sale; confirm `total_tins ≈ total_liters / 15.2` in DB and on invoice/supplied-details.

---

## Quick “is everything 15.2?” grep

From repo root (`oil-shop-web`):

```bash
# Should find CANTEEN_LITERS_PER_TIN and 15.2 in canteen paths; 15200 in purchaseVolume is OK
rg "CANTEEN_LITERS_PER_TIN|15\\.2|15200|TIN_ML" src scripts --glob "*.{ts,tsx,js}"
```

Legacy `/ 16` for **tin-equivalent** should **not** appear in sales totals anymore (sales uses `CANTEEN_LITERS_PER_TIN`).
