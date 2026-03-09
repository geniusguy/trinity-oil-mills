import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';

// GET /api/sales/:id/invoice
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const saleId = params.id;
    const connection = await createConnection();
    const [[sale]]: any = await connection.query(
      `SELECT s.id, s.invoice_number as invoiceNumber, s.subtotal, s.gst_amount as gstAmount, s.total_amount as totalAmount, s.payment_method as paymentMethod, s.created_at as createdAt,
              u.name as userName, c.name as customerName
       FROM sales s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.id = ?
       LIMIT 1`,
      [saleId],
    );
    if (!sale) { await connection.end(); return NextResponse.json({ error: 'Sale not found' }, { status: 404 }); }

    const [items] = await connection.query(
      `SELECT si.product_id as productId, p.name as productName, si.quantity, si.unit_price as unitPrice, si.gst_rate as gstRate, si.gst_amount as gstAmount, si.total_amount as totalAmount
       FROM sale_items si
       JOIN products p ON p.id = si.product_id
       WHERE si.sale_id = ?`,
      [saleId],
    );

    await connection.end();
    return NextResponse.json({ sale, items }, { status: 200 });
  } catch (error) {
    console.error('Invoice GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}



