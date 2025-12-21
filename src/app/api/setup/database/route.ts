import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// POST /api/setup/database - Create missing database tables
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const connection = await createConnection();

        // Add missing columns to sales table
        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS po_number VARCHAR(255) NULL');
          console.log('Added po_number column to sales table');
        } catch (error) {
          console.log('po_number column already exists or error:', error.message);
        }

        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS po_date DATE NULL');
          console.log('Added po_date column to sales table');
        } catch (error) {
          console.log('po_date column already exists or error:', error.message);
        }

        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS mode_of_sales VARCHAR(255) NULL');
          console.log('Added mode_of_sales column to sales table');
        } catch (error) {
          console.log('mode_of_sales column already exists or error:', error.message);
        }

        // Create savings_investments table
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS savings_investments (
            id VARCHAR(255) PRIMARY KEY,
            type VARCHAR(50) NOT NULL COMMENT 'savings, investment, fixed_deposit, mutual_fund, stock, property, gold, other',
            title VARCHAR(255) NOT NULL,
            description TEXT,
            amount DECIMAL(15,2) NOT NULL,
            current_value DECIMAL(15,2),
            investment_date DATETIME NOT NULL,
            maturity_date DATETIME,
            interest_rate DECIMAL(5,2),
            institution VARCHAR(255) COMMENT 'Bank, broker, etc.',
            account_number VARCHAR(100),
            status VARCHAR(50) NOT NULL DEFAULT 'active' COMMENT 'active, matured, closed, sold',
            user_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          )
        `;

        await connection.execute(createTableSQL);

    // Create indexes for better performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_savings_investments_user_id ON savings_investments(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_savings_investments_type ON savings_investments(type)',
      'CREATE INDEX IF NOT EXISTS idx_savings_investments_status ON savings_investments(status)',
      'CREATE INDEX IF NOT EXISTS idx_savings_investments_investment_date ON savings_investments(investment_date)'
    ];

    for (const indexSQL of indexes) {
      await connection.execute(indexSQL);
    }

    // Check if table has any data, if not add sample data
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM savings_investments') as any[];
    const recordCount = countResult[0].count;

    if (recordCount === 0) {
      // Insert sample data
      const sampleData = [
        {
          id: 'si-sample-001',
          type: 'fixed_deposit',
          title: 'SBI Fixed Deposit',
          description: 'High interest rate FD for 1 year',
          amount: 100000.00,
          current_value: 108500.00,
          investment_date: '2024-01-15 10:00:00',
          maturity_date: '2025-01-15 10:00:00',
          interest_rate: 8.5,
          institution: 'State Bank of India',
          account_number: 'FD-001-2024',
          status: 'active',
          user_id: session.user.id || 'admin-001'
        },
        {
          id: 'si-sample-002',
          type: 'mutual_fund',
          title: 'HDFC Equity Fund',
          description: 'Diversified equity mutual fund',
          amount: 50000.00,
          current_value: 52500.00,
          investment_date: '2024-03-20 14:30:00',
          maturity_date: null,
          interest_rate: null,
          institution: 'HDFC Mutual Fund',
          account_number: 'MF-HDFC-789',
          status: 'active',
          user_id: session.user.id || 'admin-001'
        },
        {
          id: 'si-sample-003',
          type: 'gold',
          title: 'Gold Investment',
          description: 'Physical gold purchase',
          amount: 25000.00,
          current_value: 26800.00,
          investment_date: '2024-06-10 09:15:00',
          maturity_date: null,
          interest_rate: null,
          institution: 'Local Jeweller',
          account_number: null,
          status: 'active',
          user_id: session.user.id || 'admin-001'
        }
      ];

      for (const investment of sampleData) {
        await connection.execute(`
          INSERT INTO savings_investments (
            id, type, title, description, amount, current_value, investment_date, 
            maturity_date, interest_rate, institution, account_number, status, user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          investment.id, investment.type, investment.title, investment.description,
          investment.amount, investment.current_value, investment.investment_date,
          investment.maturity_date, investment.interest_rate, investment.institution,
          investment.account_number, investment.status, investment.user_id
        ]);
      }
    }

    // Verify table structure
    const [tableInfo] = await connection.execute('DESCRIBE savings_investments');
    const [finalCount] = await connection.execute('SELECT COUNT(*) as count FROM savings_investments') as any[];

    await connection.end();

    return NextResponse.json({
      success: true,
      message: 'Database setup completed successfully',
      tableCreated: true,
      sampleDataAdded: recordCount === 0,
      finalRecordCount: finalCount[0].count,
      tableStructure: tableInfo
    });
  } catch (error) {
    console.error('Database setup error:', error);
    return NextResponse.json({
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/setup/database - Check database status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 });
    }

    const connection = await createConnection();

    // Check if savings_investments table exists
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'trinityoil_oil_shop_db_new' 
      AND TABLE_NAME = 'savings_investments'
    `) as any[];

    let tableExists = tables.length > 0;
    let recordCount = 0;
    let tableStructure = null;

    if (tableExists) {
      try {
        const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM savings_investments') as any[];
        recordCount = countResult[0].count;
        
        const [structure] = await connection.execute('DESCRIBE savings_investments');
        tableStructure = structure;
      } catch (tableError) {
        console.warn('Error accessing savings_investments table:', tableError);
        tableExists = false;
      }
    }

    await connection.end();

    return NextResponse.json({
      success: true,
      tableExists,
      recordCount,
      tableStructure,
      needsSetup: !tableExists
    });
  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json({
      error: 'Database check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
