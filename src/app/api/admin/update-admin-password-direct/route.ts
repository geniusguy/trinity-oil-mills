import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import bcrypt from 'bcryptjs';

// Temporary endpoint to update admin password directly
// This should be removed after use for security
export async function POST(request: NextRequest) {
  try {
    const { email, newPassword, secret } = await request.json();

    // Simple secret check (you can remove this endpoint after use)
    if (secret !== 'TEMPORARY_UPDATE_2024') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: 'Email and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    // Connect to database using app's connection method
    const connection = await createConnection();

    // Check if user exists
    const [users] = await connection.query(
      'SELECT id, email, name FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (users.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await connection.execute(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?',
      [hashedPassword, email]
    );

    await connection.end();

    console.log(`✅ Password updated for user ${email}`);

    return NextResponse.json(
      { 
        message: `Password updated successfully for ${user.name}`,
        email: user.email
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Update password error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

