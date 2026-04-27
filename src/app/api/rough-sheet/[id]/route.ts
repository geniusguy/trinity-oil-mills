import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';

const ROLES = ['admin', 'accountant', 'retail_staff'];
const canAccess = (role?: string) => Boolean(role && ROLES.includes(role));

async function ensureRoughSheetTable(connection: any) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS rough_sheet_entries (
      id VARCHAR(255) PRIMARY KEY,
      content TEXT NOT NULL,
      created_by VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();
    const content = String(body.content || '').trim();
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    if (!content) return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });

    const connection = await createConnection();
    await ensureRoughSheetTable(connection);
    await connection.execute(
      `UPDATE rough_sheet_entries
       SET content = ?, updated_at = NOW()
       WHERE id = ?`,
      [content, id],
    );
    await connection.end();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('rough-sheet PUT:', error);
    return NextResponse.json({ success: false, error: 'Failed to update rough sheet entry' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    const { id } = await params;
    if (!id) return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });

    const connection = await createConnection();
    await ensureRoughSheetTable(connection);
    await connection.execute(`DELETE FROM rough_sheet_entries WHERE id = ?`, [id]);
    await connection.end();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('rough-sheet DELETE:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete rough sheet entry' }, { status: 500 });
  }
}

