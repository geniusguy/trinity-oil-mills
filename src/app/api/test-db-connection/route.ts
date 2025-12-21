import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    // Get database config to see what we're connecting to
    const config = await import('@/lib/database').then(m => {
      // Access the internal function if possible, or just test connection
      return null;
    });

    const connection = await createConnection();
    
    // Test query
    const [users] = await connection.query(
      'SELECT COUNT(*) as count FROM users'
    );
    
    // Check admin user
    const [adminUsers] = await connection.query(
      'SELECT email, password FROM users WHERE email = ?',
      ['admin@trinityoil.com']
    );
    
    await connection.end();
    
    let passwordTest = null;
    if (adminUsers.length > 0) {
      const testPassword = 'admin@123';
      passwordTest = await bcrypt.compare(testPassword, adminUsers[0].password);
    }
    
    return NextResponse.json({
      success: true,
      database: {
        usersCount: users[0].count,
        adminUserExists: adminUsers.length > 0,
        adminEmail: adminUsers.length > 0 ? adminUsers[0].email : null,
        passwordTest: passwordTest,
        passwordMatches: passwordTest === true
      },
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 
          'NOT SET',
        NODE_ENV: process.env.NODE_ENV
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 
          'NOT SET',
        NODE_ENV: process.env.NODE_ENV
      }
    }, { status: 500 });
  }
}

