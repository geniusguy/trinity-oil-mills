import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    // Check if user is authenticated and is admin
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied. Admin role required.' },
        { status: 403 }
      );
    }

    const { userId, newRole } = await request.json();

    // Validation
    if (!userId || !newRole) {
      return NextResponse.json(
        { error: 'User ID and new role are required' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['admin', 'accountant', 'retail_staff'];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, accountant, or retail_staff' },
        { status: 400 }
      );
    }

    // Connect to database
    const connection = await createConnection();

    // Check if user exists
    const [users] = await connection.query(
      'SELECT id, email, name, role FROM users WHERE id = ? LIMIT 1',
      [userId]
    );

    if (users.length === 0) {
      await connection.end();
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = users[0];

    // Update role
    await connection.execute(
      'UPDATE users SET role = ?, updated_at = NOW() WHERE id = ?',
      [newRole, userId]
    );

    await connection.end();

    console.log(`✅ Admin ${session.user.email} updated role for user ${user.email} from ${user.role} to ${newRole}`);

    return NextResponse.json(
      { 
        message: `Role updated successfully for ${user.name}`,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          oldRole: user.role,
          newRole: newRole
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Admin update role error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
