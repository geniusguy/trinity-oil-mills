import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { ensureSuppliersTable } from '@/lib/suppliersDb';

const ROLES = ['admin', 'accountant', 'retail_staff'];

function isAllowed(role: string | undefined) {
  return !!role && ROLES.includes(role);
}

// PUT /api/suppliers/:id
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAllowed(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Supplier id is required' }, { status: 400 });

    const body = await request.json();
    const name = String(body?.name || '').trim();
    const supplierType = body?.supplierType ? String(body.supplierType).trim() : null;
    const contactNumber = body?.contactNumber ? String(body.contactNumber).trim() : null;
    const email = body?.email ? String(body.email).trim() : null;
    if (!name) return NextResponse.json({ error: 'Supplier name is required' }, { status: 400 });

    const connection = await createConnection();
    await ensureSuppliersTable(connection);
    const [result]: any = await connection.execute(
      `UPDATE suppliers
       SET name = ?, supplier_type = ?, contact_number = ?, email = ?, updated_at = NOW()
       WHERE id = ?`,
      [name, supplierType, contactNumber, email, id]
    );
    await connection.end();
    if (!result?.affectedRows) return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    return NextResponse.json({ message: 'Supplier updated' }, { status: 200 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    if (msg.toLowerCase().includes('duplicate')) {
      return NextResponse.json({ error: 'Supplier name already exists' }, { status: 409 });
    }
    console.error('Suppliers PUT error:', error);
    return NextResponse.json({ error: 'Internal server error', details: msg }, { status: 500 });
  }
}

// DELETE /api/suppliers/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.email || !isAllowed(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Supplier id is required' }, { status: 400 });

    const connection = await createConnection();
    await ensureSuppliersTable(connection);
    const [rows]: any = await connection.query('SELECT name FROM suppliers WHERE id = ? LIMIT 1', [id]);
    if (!rows?.length) {
      await connection.end();
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }
    const supplierName = String(rows[0].name || '');

    const [usage]: any = await connection.query(
      'SELECT COUNT(*) as count FROM stock_purchases WHERE supplier_name COLLATE utf8mb4_general_ci = ? COLLATE utf8mb4_general_ci',
      [supplierName]
    );
    const count = Number(usage?.[0]?.count || 0);
    if (count > 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'Supplier has purchase history. Keep it for records.' },
        { status: 409 }
      );
    }

    await connection.execute('DELETE FROM suppliers WHERE id = ?', [id]);
    await connection.end();
    return NextResponse.json({ message: 'Supplier deleted' }, { status: 200 });
  } catch (error) {
    console.error('Suppliers DELETE error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
