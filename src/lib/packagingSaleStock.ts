export type AdjustPackagingOptions = {
  /** Canteen tape (every 4th order): ordinal by created_at, id — pass the sale row id so delete matches deduct. */
  canteenSaleId?: string;
};

/**
 * Adjust packaging inventory for a sale line (deduct on sale create, add back on sale delete).
 */
export async function adjustPackagingForProductLine(
  connection: any,
  productId: string,
  quantity: number,
  saleType: string,
  direction: 'deduct' | 'restore',
  options?: AdjustPackagingOptions,
): Promise<void> {
  const isDeduct = direction === 'deduct';
  const op = isDeduct ? 'deduct' : 'restore';

  try {
    const [productResult] = await connection.query('SELECT name, unit FROM products WHERE id = ?', [productId]);

    if (!productResult || productResult.length === 0) return;

    const product = productResult[0];
    const productName = String(product.name || '').toLowerCase();

    const packagingRequirements: Array<{
      quantity: number;
      description: string;
      inventoryIdHints?: string[];
      inventoryNameHints?: string[];
      rawMaterialNameHints?: string[];
    }> = [];

    if (productName.includes('oil')) {
      let oilType = '';
      if (productName.includes('groundnut')) oilType = 'groundnut';
      else if (productName.includes('gingelly') || productName.includes('sesame')) oilType = 'gingelly';
      else if (productName.includes('coconut')) oilType = 'coconut';
      else if (productName.includes('deepam')) oilType = 'deepam';
      else if (productName.includes('castor')) oilType = 'castor';

      const addBottlePackaging = (sizeKey: '5l' | '1l' | '500ml' | '200ml') => {
        const sizeLabel = sizeKey === '5l' ? '5L' : sizeKey === '1l' ? '1L' : sizeKey === '500ml' ? '500ml' : '200ml';
        const bottleId = `pack_pet_bottle_${sizeKey}`;
        const innerCapId = `pack_inner_cap_${sizeKey}`;
        const flipTopIds = [
          `pack_flip_top_cap_${sizeKey}_green`,
          `pack_flip_top_cap_${sizeKey}_yellow`,
          `pack_flip_top_cap_${sizeKey}_white`,
          `pack_flip_top_cap_${sizeKey}_red`,
        ];
        const frontLabelId = `pack_front_label_${sizeKey}`;
        const backLabelId = `pack_back_label_${sizeKey}`;

        packagingRequirements.push(
          {
            quantity,
            description: `PET Bottle ${sizeLabel}`,
            inventoryIdHints: [bottleId],
            inventoryNameHints: [`pet bottle ${sizeLabel.toLowerCase()}`, `pet bottle ${sizeKey}`, `bottle ${sizeLabel.toLowerCase()}`],
            rawMaterialNameHints: [`pet bottle ${sizeKey}`, `bottle ${sizeLabel.toLowerCase()}`],
          },
          {
            quantity,
            description: `Inner Cap (${sizeLabel})`,
            inventoryIdHints: [innerCapId],
            inventoryNameHints: [`inner cap ${sizeKey}`, `inner cap ${sizeLabel.toLowerCase()}`, `innercap ${sizeKey}`],
            rawMaterialNameHints: [`inner cap ${sizeKey}`, `inner cap ${sizeLabel.toLowerCase()}`],
          },
          {
            quantity,
            description: `Flip Top Cap (${sizeLabel})`,
            inventoryIdHints: flipTopIds,
            inventoryNameHints: [`flip top cap ${sizeKey}`, `flip cap ${sizeKey}`, `bottle cap flip top ${sizeKey}`],
            rawMaterialNameHints: [`flip top cap ${sizeKey}`, `flip cap ${sizeKey}`],
          },
          {
            quantity,
            description: `${oilType.charAt(0).toUpperCase() + oilType.slice(1)} Front Label (${sizeLabel})`,
            inventoryIdHints: [frontLabelId],
            inventoryNameHints: [`${oilType} front label ${sizeKey}`, `front label ${sizeKey}`, `${oilType} label front ${sizeKey}`],
            rawMaterialNameHints: [`${oilType} front label ${sizeKey}`, `front label ${sizeKey}`],
          },
          {
            quantity,
            description: `${oilType.charAt(0).toUpperCase() + oilType.slice(1)} Back Label (${sizeLabel})`,
            inventoryIdHints: [backLabelId],
            inventoryNameHints: [`${oilType} back label ${sizeKey}`, `back label ${sizeKey}`, `${oilType} label back ${sizeKey}`],
            rawMaterialNameHints: [`${oilType} back label ${sizeKey}`, `back label ${sizeKey}`],
          },
        );
      };

      if (productName.includes('5l') || productName.includes('5 l') || productName.includes('5 liter')) {
        addBottlePackaging('5l');
      } else if (productName.includes('1l') || productName.includes('1 l') || productName.includes('1 liter')) {
        addBottlePackaging('1l');
      } else if (productName.includes('500ml') || productName.includes('500 ml')) {
        addBottlePackaging('500ml');
      } else if (/\b200\D*ml\b/.test(productName)) {
        addBottlePackaging('200ml');
      }

      if (saleType === 'canteen') {
        packagingRequirements.push({
          quantity: 1,
          description: 'Cardboard Boxes',
          inventoryIdHints: ['pack_carton_box'],
          inventoryNameHints: ['cardboard box', 'carton box'],
          rawMaterialNameHints: ['cardboard box', 'carton box'],
        });

        try {
          let takeTape = false;
          if (options?.canteenSaleId) {
            const [ordRows]: any = await connection.query(
              `SELECT COUNT(*) AS c FROM sales s
               WHERE s.sale_type = 'canteen'
               AND (
                 s.created_at < (SELECT created_at FROM sales WHERE id = ? LIMIT 1)
                 OR (
                   s.created_at = (SELECT created_at FROM sales WHERE id = ? LIMIT 1)
                   AND s.id <= ?
                 )
               )`,
              [options.canteenSaleId, options.canteenSaleId, options.canteenSaleId],
            );
            const k = Number(ordRows?.[0]?.c ?? 0);
            takeTape = (k + 1) % 4 === 0;
          } else {
            const [canteenOrderCount]: any = await connection.query(
              'SELECT COUNT(*) as count FROM sales WHERE sale_type = "canteen"',
            );
            const totalCanteenOrders = Number(canteenOrderCount?.[0]?.count ?? 0) + 1;
            takeTape = totalCanteenOrders % 4 === 0;
          }

          if (takeTape) {
            packagingRequirements.push({
              quantity: 1,
              description: 'Packing Tape',
              inventoryIdHints: ['pack_packing_tape'],
              inventoryNameHints: ['packaging tape', 'packing tape'],
              rawMaterialNameHints: ['packaging tape', 'packing tape'],
            });
          }
        } catch (error) {
          console.log(
            'Could not check canteen order count for tape calculation:',
            error instanceof Error ? error.message : error,
          );
        }
      }
    }

    const buildLike = (hints?: string[]) => (hints || []).map((h) => `%${String(h).toLowerCase()}%`);

    for (const pkg of packagingRequirements) {
      let updatedAny = false;
      const q = pkg.quantity;

      if (pkg.inventoryIdHints && pkg.inventoryIdHints.length > 0) {
        if (pkg.inventoryIdHints.length === 1) {
          const [r] = isDeduct
            ? await connection.execute(
                `UPDATE inventory
                 SET quantity = GREATEST(0, quantity - ?), updated_at = NOW()
                 WHERE product_id = ?`,
                [q, pkg.inventoryIdHints[0]],
              )
            : await connection.execute(
                `UPDATE inventory
                 SET quantity = quantity + ?, updated_at = NOW()
                 WHERE product_id = ?`,
                [q, pkg.inventoryIdHints[0]],
              );
          const affected = Number((r as any)?.affectedRows ?? 0);
          if (affected > 0) updatedAny = true;
        } else {
          const idPlaceholders = pkg.inventoryIdHints.map(() => '?').join(',');
          const [candidates]: any = await connection.execute(
            `SELECT id, quantity
             FROM inventory
             WHERE product_id IN (${idPlaceholders})
             ORDER BY quantity DESC
             LIMIT 1`,
            [...pkg.inventoryIdHints],
          );
          if (Array.isArray(candidates) && candidates.length > 0) {
            const targetInvId = candidates[0].id;
            const [r] = isDeduct
              ? await connection.execute(
                  `UPDATE inventory
                   SET quantity = GREATEST(0, quantity - ?), updated_at = NOW()
                   WHERE id = ?`,
                  [q, targetInvId],
                )
              : await connection.execute(
                  `UPDATE inventory
                   SET quantity = quantity + ?, updated_at = NOW()
                   WHERE id = ?`,
                  [q, targetInvId],
                );
            const affected = Number((r as any)?.affectedRows ?? 0);
            if (affected > 0) updatedAny = true;
          }
        }
      }

      if (!updatedAny) {
        const likeHints = buildLike(pkg.inventoryNameHints);
        if (likeHints.length > 0) {
          const ors = likeHints.map(() => 'LOWER(p.name) LIKE ?').join(' OR ');
          const [r] = isDeduct
            ? await connection.execute(
                `UPDATE inventory i
                 JOIN products p ON p.id = i.product_id
                 SET i.quantity = GREATEST(0, i.quantity - ?), i.updated_at = NOW()
                 WHERE (${ors})`,
                [q, ...likeHints],
              )
            : await connection.execute(
                `UPDATE inventory i
                 JOIN products p ON p.id = i.product_id
                 SET i.quantity = i.quantity + ?, i.updated_at = NOW()
                 WHERE (${ors})`,
                [q, ...likeHints],
              );
          const affected = Number((r as any)?.affectedRows ?? 0);
          if (affected > 0) updatedAny = true;
        }
      }

      try {
        const likeHints = buildLike(pkg.rawMaterialNameHints);
        if (likeHints.length > 0) {
          const ors = likeHints.map(() => 'LOWER(name) LIKE ?').join(' OR ');
          const [r] = isDeduct
            ? await connection.execute(
                `UPDATE raw_materials
                 SET current_stock = GREATEST(0, current_stock - ?), updated_at = NOW()
                 WHERE category = 'packaging' AND (${ors})`,
                [q, ...likeHints],
              )
            : await connection.execute(
                `UPDATE raw_materials
                 SET current_stock = current_stock + ?, updated_at = NOW()
                 WHERE category = 'packaging' AND (${ors})`,
                [q, ...likeHints],
              );
          const affected = Number((r as any)?.affectedRows ?? 0);
          if (affected > 0) updatedAny = true;
        }
      } catch (error) {
        console.log('[packagingSaleStock] raw_materials update skipped:', error instanceof Error ? error.message : error);
      }

      if (!updatedAny) {
        console.warn(`[packagingSaleStock] Packaging stock not matched for "${pkg.description}" (${op}, product ${productId}).`);
      }
    }
  } catch (error) {
    if (isDeduct) {
      console.error('Error deducting packaging materials:', error);
    } else {
      console.error('Error restoring packaging materials:', error);
      throw error;
    }
  }
}
