import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

// Test endpoint to check if DATABASE_URL is available to Next.js
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check environment variables
    const envCheck = {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET (' + process.env.DATABASE_URL.substring(0, 30) + '...)' : 'NOT SET ❌',
      NODE_ENV: process.env.NODE_ENV || 'NOT SET',
      AUTH_SECRET: process.env.AUTH_SECRET ? 'SET' : 'NOT SET',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      // List all DB-related env vars
      allDbVars: Object.keys(process.env).filter(k => k.includes('DB') || k.includes('DATABASE')).map(k => ({
        key: k,
        hasValue: !!process.env[k],
        valueLength: process.env[k]?.length || 0
      }))
    };

    // Try to create a database connection
    let dbTest = 'Not attempted';
    try {
      const { createConnection } = await import('@/lib/database');
      const connection = await createConnection();
      const [rows] = await connection.query('SELECT 1 as test');
      await connection.end();
      dbTest = '✅ Connection successful';
    } catch (error) {
      dbTest = `❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }

    return NextResponse.json({
      success: true,
      environment: envCheck,
      databaseTest: dbTest,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

