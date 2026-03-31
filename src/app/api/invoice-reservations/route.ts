import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { INVOICE_NUMBER_FULL_REGEX } from '@/lib/financialYear';

function parseFyFromInvoice(invoiceNumber: string): string | null {
  const m = String(invoiceNumber).trim().match(/\/\s*(\d{4}(?:-\d{2})?)$/);
  return m?.[1] ? m[1] : null;
}

async function ensureInvoiceReservationsTable(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS invoice_reservations (
      id VARCHAR(255) PRIMARY KEY,
      invoice_number VARCHAR(100) NOT NULL,
      sale_type VARCHAR(50) NOT NULL DEFAULT 'canteen',
      fy_label VARCHAR(16) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'reserved',
      reason TEXT NULL,
      linked_sale_id VARCHAR(255) NULL,
      created_by VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_invoice_reservations_invoice_number (invoice_number),
      INDEX idx_invoice_reservations_sale_type_status (sale_type, status)
    )
  `);
}

// GET /api/invoice-reservations?saleType=canteen&status=reserved&limit=200
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const saleType = String(searchParams.get('saleType') || 'canteen').trim();
    const status = String(searchParams.get('status') || 'reserved').trim();
    const limit = Math.min(Number(searchParams.get('limit') || 200), 1000);

    const connection = await createConnection();
    try {
      await ensureInvoiceReservationsTable(connection);
      const [rows] = await connection.query(
        `SELECT id,
                invoice_number as invoiceNumber,
                sale_type as saleType,
                fy_label as fyLabel,
                status,
                reason,
                linked_sale_id as linkedSaleId,
                created_by as createdBy,
                created_at as createdAt,
                updated_at as updatedAt
         FROM invoice_reservations
         WHERE sale_type = ? AND status = ?
         ORDER BY created_at DESC
         LIMIT ?`,
        [saleType, status, limit],
      );
      return NextResponse.json({ reservations: rows });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('invoice-reservations GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/invoice-reservations
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !['admin', 'accountant'].includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const invoiceNumber = String(body.invoiceNumber || '').trim();
    const saleType = String(body.saleType || 'canteen').trim().toLowerCase();
    const reason = String(body.reason || '').trim() || null;

    if (!INVOICE_NUMBER_FULL_REGEX.test(invoiceNumber)) {
      return NextResponse.json({ error: 'Invalid invoice format. Use C0001/2025-26 or R0001/2025-26.' }, { status: 400 });
    }
    if (!['canteen', 'retail'].includes(saleType)) {
      return NextResponse.json({ error: 'Invalid sale type' }, { status: 400 });
    }
    if (saleType === 'canteen' && !invoiceNumber.startsWith('C')) {
      return NextResponse.json({ error: 'Canteen reservation must use C prefix' }, { status: 400 });
    }
    if (saleType === 'retail' && !invoiceNumber.startsWith('R')) {
      return NextResponse.json({ error: 'Retail reservation must use R prefix' }, { status: 400 });
    }

    const connection = await createConnection();
    try {
      await ensureInvoiceReservationsTable(connection);
      await connection.beginTransaction();

      const [existingSales]: any = await connection.query(
        'SELECT id FROM sales WHERE invoice_number = ? LIMIT 1',
        [invoiceNumber],
      );
      if (Array.isArray(existingSales) && existingSales.length > 0) {
        await connection.rollback();
        return NextResponse.json({ error: 'Invoice number already used in sales.' }, { status: 409 });
      }

      const [existingReservations]: any = await connection.query(
        'SELECT id, status FROM invoice_reservations WHERE invoice_number = ? LIMIT 1',
        [invoiceNumber],
      );
      if (Array.isArray(existingReservations) && existingReservations.length > 0) {
        await connection.rollback();
        const existingStatus = existingReservations[0]?.status || 'reserved';
        return NextResponse.json({ error: `Invoice already reserved (${existingStatus}).` }, { status: 409 });
      }

      const id = `inv-res-${Date.now()}`;
      const fyLabel = parseFyFromInvoice(invoiceNumber);
      await connection.execute(
        `INSERT INTO invoice_reservations
          (id, invoice_number, sale_type, fy_label, status, reason, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'reserved', ?, ?, NOW(), NOW())`,
        [id, invoiceNumber, saleType, fyLabel, reason, session.user.id],
      );

      await connection.commit();
      return NextResponse.json({
        reservation: { id, invoiceNumber, saleType, fyLabel, status: 'reserved', reason },
      }, { status: 201 });
    } catch (e) {
      try { await connection.rollback(); } catch (_) {}
      throw e;
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('invoice-reservations POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/invoice-reservations?id=...&saleType=canteen
export async function DELETE(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !['admin', 'accountant'].includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const saleType = String(searchParams.get('saleType') || 'canteen').trim().toLowerCase();

    if (!id) return NextResponse.json({ error: 'Missing reservation id' }, { status: 400 });
    if (!['canteen', 'retail'].includes(saleType)) {
      return NextResponse.json({ error: 'Invalid sale type' }, { status: 400 });
    }

    const connection = await createConnection();
    try {
      await connection.execute(`
        CREATE TABLE IF NOT EXISTS invoice_reservations (
          id VARCHAR(255) PRIMARY KEY,
          invoice_number VARCHAR(100) NOT NULL,
          sale_type VARCHAR(50) NOT NULL DEFAULT 'canteen',
          fy_label VARCHAR(16) NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'reserved',
          reason TEXT NULL,
          linked_sale_id VARCHAR(255) NULL,
          created_by VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY uq_invoice_reservations_invoice_number (invoice_number),
          INDEX idx_invoice_reservations_sale_type_status (sale_type, status)
        )
      `);

      const [rows]: any = await connection.query(
        `UPDATE invoice_reservations
           SET status = 'cancelled',
               updated_at = NOW()
         WHERE id = ?
           AND sale_type = ?
           AND status = 'reserved'`,
        [id, saleType],
      );

      // mysql2 returns an object for execute; but query above uses query so handle both.
      const affected = Number(rows?.affectedRows ?? 0);

      if (!affected) {
        return NextResponse.json({ error: 'Reservation not found or already used/cancelled.' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('invoice-reservations DELETE error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

