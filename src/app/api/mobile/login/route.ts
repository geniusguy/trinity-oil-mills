import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const connection = await createConnection();

    const [rows] = await connection.query(
      'SELECT id, email, password, name, role FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    await connection.end();

    const users = rows as Array<{ id: string; email: string; password: string; name: string; role: string } >;

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const secret = process.env.NEXTAUTH_SECRET || 'trinity-oil-secret-key-2024';
    const token = jwt.sign(
      { sub: user.id, id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


