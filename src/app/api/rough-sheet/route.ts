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

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await createConnection();
    await ensureRoughSheetTable(connection);
    const [rows] = await connection.query(
      `SELECT id, content, created_by as createdBy, created_at as createdAt, updated_at as updatedAt
       FROM rough_sheet_entries
       ORDER BY updated_at DESC`,
    );
    await connection.end();
    return NextResponse.json({ success: true, data: rows || [] });
  } catch (error) {
    console.error('rough-sheet GET:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch rough sheet entries' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const content = String(body.content || '').trim();
    if (!content) {
      return NextResponse.json({ success: false, error: 'Content is required' }, { status: 400 });
    }

    const id = `rough-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const connection = await createConnection();
    await ensureRoughSheetTable(connection);
    await connection.execute(
      `INSERT INTO rough_sheet_entries (id, content, created_by, created_at, updated_at)
       VALUES (?, ?, ?, NOW(), NOW())`,
      [id, content, session.user.id || null],
    );
    await connection.end();

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('rough-sheet POST:', error);
    return NextResponse.json({ success: false, error: 'Failed to create rough sheet entry' }, { status: 500 });
  }
}

