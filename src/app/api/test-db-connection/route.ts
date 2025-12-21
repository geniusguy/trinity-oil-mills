import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing database connection...');
    
    // Get database config
    const { getDatabaseConfig } = await import('@/lib/database');
    const dbConfig = getDatabaseConfig();
    
    console.log('📋 Database config:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      password: dbConfig.password ? '***' : 'NOT SET'
    });

    const connection = await createConnection();
    console.log('✅ Connected to database');
    
    // Test query - get users count
    const [users] = await connection.query(
      'SELECT COUNT(*) as count FROM users'
    );
    console.log('📊 Users count:', users[0].count);
    
    // Check admin user
    const [adminUsers] = await connection.query(
      'SELECT email, password, name, role FROM users WHERE email = ?',
      ['admin@trinityoil.com']
    );
    
    let passwordTest = null;
    let passwordMatches = false;
    
    if (adminUsers.length > 0) {
      const testPassword = 'admin@123';
      passwordTest = await bcrypt.compare(testPassword, adminUsers[0].password);
      passwordMatches = passwordTest === true;
      console.log('🔐 Password test:', passwordMatches ? 'PASSED' : 'FAILED');
    }
    
    await connection.end();
    
    return NextResponse.json({
      success: true,
      database: {
        usersCount: users[0].count,
        adminUserExists: adminUsers.length > 0,
        adminEmail: adminUsers.length > 0 ? adminUsers[0].email : null,
        adminName: adminUsers.length > 0 ? adminUsers[0].name : null,
        adminRole: adminUsers.length > 0 ? adminUsers[0].role : null,
        passwordTest: passwordTest,
        passwordMatches: passwordMatches
      },
      config: {
        host: dbConfig.host,
        port: dbConfig.port,
        user: dbConfig.user,
        database: dbConfig.database,
        passwordSet: !!dbConfig.password
      },
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 
          'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT || '3000'
      }
    });
    
  } catch (error) {
    console.error('❌ Database test error:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error instanceof Error && 'code' in error ? error.code : null,
      env: {
        DATABASE_URL: process.env.DATABASE_URL ? 
          process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : 
          'NOT SET',
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT || '3000'
      }
    }, { status: 500 });
  }
}

