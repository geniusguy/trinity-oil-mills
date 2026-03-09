import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import jwt from 'jsonwebtoken';

function getTokenFromHeader(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!authHeader) return null;
  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const secret = process.env.NEXTAUTH_SECRET || 'trinity-oil-secret-key-2024';
    let payload: any;
    try {
      payload = jwt.verify(token, secret);
    } catch (err) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const connection = await createConnection();

    const [rows] = await connection.query(
      'SELECT id, email, name, role FROM users WHERE id = ? LIMIT 1',
      [payload.id]
    );

    await connection.end();

    const users = rows as Array<{ id: string; email: string; name: string; role: string } >;
    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = users[0];
    return NextResponse.json({ user });
  } catch (error) {
    console.error('Mobile me error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


