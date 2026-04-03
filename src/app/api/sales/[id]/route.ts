import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { INVOICE_NUMBER_FULL_REGEX } from '@/lib/financialYear';
import { adjustInventoryForSaleLine } from '@/lib/inventorySaleStock';
import { adjustPackagingForProductLine } from '@/lib/packagingSaleStock';

const SALE_DELETE_ROLES = ['admin', 'accountant', 'retail_staff'];

// GET - Fetch single sale details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || session.user?.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: saleId } = await params;
    const connection = await createConnection();

    // Get sale details
    const [[sale]]: any = await connection.query(
      `SELECT s.id, s.invoice_number as invoiceNumber, s.subtotal, s.gst_amount as gstAmount, 
              s.total_amount as totalAmount, s.payment_method as paymentMethod, s.payment_status as paymentStatus, s.shipment_status as shipmentStatus,
              s.notes, s.created_at as createdAt, s.updated_at as updatedAt,
              u.name as userName, s.notes as customerName, NULL as customerId
       FROM sales s
       JOIN users u ON u.id = s.user_id
       WHERE s.id = ?
       LIMIT 1`,
      [saleId]
    );

    if (!sale) {
      await connection.end();
      return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
    }

    // Get sale items
    const [items]: any = await connection.query(
      `SELECT si.id, si.product_id as productId, p.name as productName, si.quantity, 
              si.unit_price as unitPrice, si.gst_rate as gstRate, si.gst_amount as gstAmount, 
              si.total_amount as totalAmount
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`,
      [saleId]
    );

    await connection.end();

    return NextResponse.json({ sale, items });
  } catch (error) {
    console.error('Error fetching sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update sale
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const allowedRoles = ['admin', 'accountant', 'retail_staff'];
    if (!session || !allowedRoles.includes(session.user?.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: saleId } = await params;
    const requestData = await request.json();
    const { 
      paymentStatus, 
      shipmentStatus, 
      notes, 
      invoiceNumber, 
      poNumber, 
      poDate,
      invoiceDate,
      customerName, 
      paymentMethod,
      canteenAddressId,
      modeOfSales,
      keptOnDisplay,
      courierWeightOrRs,
      mailSentHoDate,
      creditedDate,
      referencePdfPath,
      referencePdfOriginalName,
    } = requestData;

    console.log('Received update data:', requestData); // Debug log
    console.log('Canteen Address ID to update:', canteenAddressId); // Debug log

    const connection = await createConnection();

    // Ensure optional PDF columns exist on older databases (MariaDB-safe).
    // Some MariaDB versions do not support ADD COLUMN IF NOT EXISTS reliably.
    try {
      const [pCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "reference_pdf_path"');
      const hasPath = Array.isArray(pCols) && pCols.length > 0;
      if (!hasPath) {
        await connection.execute('ALTER TABLE sales ADD COLUMN reference_pdf_path VARCHAR(500) NULL');
      }
    } catch (e) {
      console.log('Could not ensure reference_pdf_path:', (e as Error).message);
    }
    try {
      const [nCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "reference_pdf_original_name"');
      const hasName = Array.isArray(nCols) && nCols.length > 0;
      if (!hasName) {
        await connection.execute('ALTER TABLE sales ADD COLUMN reference_pdf_original_name VARCHAR(255) NULL');
      }
    } catch (e) {
      console.log('Could not ensure reference_pdf_original_name:', (e as Error).message);
    }

    // Check if po_number column exists
    let hasPoNumberColumn = false;
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM sales LIKE "po_number"');
      hasPoNumberColumn = Array.isArray(columns) && columns.length > 0;
    } catch (error) {
      console.log('Could not check for po_number column:', error);
    }

    // Check if po_date column exists
    let hasPoDateColumn = false;
    try {
      const [poDateColumns] = await connection.query('SHOW COLUMNS FROM sales LIKE "po_date"');
      hasPoDateColumn = Array.isArray(poDateColumns) && poDateColumns.length > 0;
    } catch (error) {
      console.log('Could not check for po_date column:', error);
    }

    // Validate invoice number: C0001/2024-25 (FY) or legacy C0001/2026
    if (invoiceNumber && invoiceNumber.trim() !== '') {
      if (!INVOICE_NUMBER_FULL_REGEX.test(invoiceNumber.trim())) {
        await connection.end();
        return NextResponse.json({ error: 'Invalid invoice number format. Use C0001/2024-25 or R0001/2024-25 (or legacy /2026)' }, { status: 400 });
      }

      // Check for duplicate invoice numbers (excluding current sale)
      const [existing] = await connection.query(
        'SELECT id FROM sales WHERE invoice_number = ? AND id != ?',
        [invoiceNumber.trim(), saleId]
      );
      
      if (existing.length > 0) {
        await connection.end();
        return NextResponse.json({ error: 'Invoice number already exists' }, { status: 400 });
      }
    }

    // Build update query systematically to avoid parameter order issues
    let updateFields = [];
    let updateValues = [];

    // Always update these basic fields
    updateFields.push('payment_status = ?', 'shipment_status = ?', 'notes = ?');
    updateValues.push(paymentStatus, shipmentStatus, notes || '');

    // Conditionally add other fields
    if (invoiceNumber && invoiceNumber.trim() !== '') {
      updateFields.push('invoice_number = ?');
      updateValues.push(invoiceNumber.trim());
    }

    if (hasPoNumberColumn && poNumber !== undefined) {
      updateFields.push('po_number = ?');
      updateValues.push(poNumber || null);
    }

    if (hasPoDateColumn && poDate !== undefined) {
      // Normalize po_date to plain YYYY-MM-DD for DATE column
      let normalizedPoDate: string | null = null;
      if (typeof poDate === 'string') {
        const trimmed = poDate.trim();
        if (trimmed) {
          // Handle both "2026-03-06" and "2026-03-06T18:30:00.000Z"
          normalizedPoDate = trimmed.slice(0, 10);
        }
      }
      updateFields.push('po_date = ?');
      updateValues.push(normalizedPoDate);
    }

    let hasInvoiceDateColumn = false;
    try {
      const [invCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "invoice_date"');
      hasInvoiceDateColumn = Array.isArray(invCols) && invCols.length > 0;
    } catch (_) {}
    if (hasInvoiceDateColumn && invoiceDate !== undefined) {
      updateFields.push('invoice_date = ?');
      updateValues.push(invoiceDate && String(invoiceDate).trim() ? String(invoiceDate).trim() : null);
    }

    if (paymentMethod && paymentMethod.trim() !== '') {
      updateFields.push('payment_method = ?');
      updateValues.push(paymentMethod.trim());
    }

    if (canteenAddressId !== undefined) {
      updateFields.push('canteen_address_id = ?');
      updateValues.push(canteenAddressId || null);
    }

    // Check for mode_of_sales column and add if exists
    let hasModeOfSalesColumn = false;
    try {
      const [modeColumns] = await connection.query('SHOW COLUMNS FROM sales LIKE "mode_of_sales"');
      hasModeOfSalesColumn = Array.isArray(modeColumns) && modeColumns.length > 0;
    } catch (error) {
      console.log('Could not check for mode_of_sales column:', error);
    }

    if (hasModeOfSalesColumn && modeOfSales !== undefined) {
      updateFields.push('mode_of_sales = ?');
      updateValues.push(modeOfSales || null);
    }

    // kept_on_display
    try {
      const [kCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "kept_on_display"');
      const hasKept = Array.isArray(kCols) && kCols.length > 0;
      if (hasKept && keptOnDisplay !== undefined) {
        updateFields.push('kept_on_display = ?');
        updateValues.push(keptOnDisplay ? 1 : 0);
      }
    } catch (_) {}

    // courier_weight_or_rs
    try {
      const [cCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "courier_weight_or_rs"');
      const hasCourier = Array.isArray(cCols) && cCols.length > 0;
      if (hasCourier && courierWeightOrRs !== undefined) {
        const v = courierWeightOrRs && String(courierWeightOrRs).trim() ? String(courierWeightOrRs).trim() : null;
        updateFields.push('courier_weight_or_rs = ?');
        updateValues.push(v);
      }
    } catch (_) {}

    // mail_sent_ho_date
    try {
      const [mCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "mail_sent_ho_date"');
      const hasMail = Array.isArray(mCols) && mCols.length > 0;
      if (hasMail && mailSentHoDate !== undefined) {
        const trimmed = typeof mailSentHoDate === 'string' ? mailSentHoDate.trim() : '';
        updateFields.push('mail_sent_ho_date = ?');
        updateValues.push(trimmed ? trimmed.slice(0, 10) : null);
      }
    } catch (_) {}

    // credited_date (credit to account date)
    try {
      const [cCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "credited_date"');
      let hasCredited = Array.isArray(cCols) && cCols.length > 0;

      // If older DB is missing the column, add it on-the-fly (MariaDB safe).
      if (!hasCredited) {
        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN credited_date DATE NULL');
          hasCredited = true;
        } catch (_) {
          hasCredited = false;
        }
      }

      if (hasCredited) {
        if (paymentStatus === 'paid') {
          const trimmed = typeof creditedDate === 'string' ? creditedDate.trim() : '';
          if (trimmed) {
            updateFields.push('credited_date = ?');
            updateValues.push(trimmed.slice(0, 10));
          } else {
            // Date is optional; keep it null when not provided.
            updateFields.push('credited_date = NULL');
          }
        } else {
          updateFields.push('credited_date = ?');
          updateValues.push(null);
        }
      }
    } catch (_) {}

    // reference_pdf_* (optional attachment from POS/canteen edit)
    try {
      const [pCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "reference_pdf_path"');
      const hasRefPdfPath = Array.isArray(pCols) && pCols.length > 0;
      if (hasRefPdfPath && referencePdfPath !== undefined) {
        const v = referencePdfPath && String(referencePdfPath).trim() ? String(referencePdfPath).trim() : null;
        updateFields.push('reference_pdf_path = ?');
        updateValues.push(v);
      }
    } catch (_) {}

    try {
      const [nCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "reference_pdf_original_name"');
      const hasRefPdfName = Array.isArray(nCols) && nCols.length > 0;
      if (hasRefPdfName && referencePdfOriginalName !== undefined) {
        const v =
          referencePdfOriginalName && String(referencePdfOriginalName).trim()
            ? String(referencePdfOriginalName).trim()
            : null;
        updateFields.push('reference_pdf_original_name = ?');
        updateValues.push(v);
      }
    } catch (_) {}

    // Always update timestamp and add sale ID at the end
    updateFields.push('updated_at = NOW()');
    updateValues.push(saleId);

    const finalQuery = `UPDATE sales SET ${updateFields.join(', ')} WHERE id = ?`;
    console.log('Executing SQL:', finalQuery); // Debug log
    console.log('With values:', updateValues); // Debug log

    // Update sale
    await connection.execute(finalQuery, updateValues);

    await connection.end();

    return NextResponse.json({ message: 'Sale updated successfully' });
  } catch (error) {
    console.error('Error updating sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete sale
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id || !SALE_DELETE_ROLES.includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: saleId } = await params;
    const connection = await createConnection();

    // Start transaction
    await connection.query('START TRANSACTION');

    try {
      const [[saleRow]]: any = await connection.query(
        'SELECT sale_type AS saleType FROM sales WHERE id = ? LIMIT 1',
        [saleId],
      );
      if (!saleRow) {
        await connection.query('ROLLBACK');
        await connection.end();
        return NextResponse.json({ error: 'Sale not found' }, { status: 404 });
      }
      const saleType = String(saleRow.saleType || 'retail');

      // Sale lines + product name/unit for Castor / merged SKU inventory resolution (same rules as POST /api/sales)
      const [items]: any = await connection.query(
        `SELECT
           si.product_id AS productId,
           si.quantity AS quantity,
           COALESCE(p.name, '') AS productName,
           COALESCE(p.unit, '') AS productUnit
         FROM sale_items si
         LEFT JOIN products p ON p.id COLLATE utf8mb4_general_ci = (
           CASE
             WHEN si.product_id COLLATE utf8mb4_general_ci IN ('55336', '68539') THEN 'castor-200ml'
             ELSE si.product_id
           END
         ) COLLATE utf8mb4_general_ci
         WHERE si.sale_id = ?`,
        [saleId],
      );

      for (const item of items || []) {
        const qty = Number(item.quantity);
        if (!Number.isFinite(qty) || qty <= 0) continue;
        await adjustInventoryForSaleLine(connection, {
          productId: String(item.productId),
          quantityDelta: qty,
          productName: item.productName,
          productUnit: item.productUnit,
        });
      }

      for (const item of items || []) {
        const qty = Number(item.quantity);
        if (!Number.isFinite(qty) || qty <= 0) continue;
        await adjustPackagingForProductLine(
          connection,
          String(item.productId),
          qty,
          saleType,
          'restore',
          { canteenSaleId: saleType === 'canteen' ? saleId : undefined },
        );
      }

      // Delete sale items
      await connection.execute('DELETE FROM sale_items WHERE sale_id = ?', [saleId]);

      // Delete sale
      await connection.execute('DELETE FROM sales WHERE id = ?', [saleId]);

      // Commit transaction
      await connection.query('COMMIT');
      await connection.end();

      return NextResponse.json({ message: 'Sale deleted successfully' });
    } catch (error) {
      // Rollback transaction
      await connection.query('ROLLBACK');
      await connection.end();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting sale:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
