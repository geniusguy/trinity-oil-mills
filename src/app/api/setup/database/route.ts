import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';

// POST /api/setup/database - Create missing database tables
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
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

        // Add kept_on_display flag (for canteen orders)
        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS kept_on_display TINYINT(1) NOT NULL DEFAULT 0');
          console.log('Added kept_on_display column to sales table');
        } catch (error) {
          console.log('kept_on_display column already exists or error:', error.message);
        }

        // Courier weight or amount (for canteen orders)
        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS courier_weight_or_rs VARCHAR(50) NULL');
          console.log('Added courier_weight_or_rs column to sales table');
        } catch (error) {
          console.log('courier_weight_or_rs column already exists or error:', error.message);
        }

        // Mail sent HO date (for canteen orders)
        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS mail_sent_ho_date DATE NULL');
          console.log('Added mail_sent_ho_date column to sales table');
        } catch (error) {
          console.log('mail_sent_ho_date column already exists or error:', error.message);
        }

        // Supply totals: bottles, liters, tins
        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_bottles DECIMAL(10,2) NULL');
          console.log('Added total_bottles column to sales table');
        } catch (error) {
          console.log('total_bottles column already exists or error:', error.message);
        }

        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_liters DECIMAL(10,2) NULL');
          console.log('Added total_liters column to sales table');
        } catch (error) {
          console.log('total_liters column already exists or error:', error.message);
        }

        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS total_tins DECIMAL(10,2) NULL');
          console.log('Added total_tins column to sales table');
        } catch (error) {
          console.log('total_tins column already exists or error:', error.message);
        }

        // Optional reference PDF attachment from canteen POS
        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_pdf_path VARCHAR(500) NULL');
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS reference_pdf_original_name VARCHAR(255) NULL');
          console.log('Added reference_pdf_* columns to sales table');
        } catch (error) {
          console.log('reference_pdf_* columns already exists or error:', (error as Error).message);
        }

        // credited_date - credit to account date (only used when payment_status is paid/credited)
        try {
          await connection.execute('ALTER TABLE sales ADD COLUMN IF NOT EXISTS credited_date DATE NULL');
          console.log('Added credited_date column to sales table');
        } catch (error) {
          console.log('credited_date column already exists or error:', (error as Error).message);
        }

        // Add billing / delivery contact columns to canteen_addresses if missing
        for (const [colName, def] of [
          ['billing_contact_person', 'VARCHAR(255) NULL'],
          ['billing_email', 'VARCHAR(255) NULL'],
          ['billing_mobile', 'VARCHAR(20) NULL'],
          ['delivery_email', 'VARCHAR(255) NULL'],
        ]) {
          try {
            await connection.execute(`ALTER TABLE canteen_addresses ADD COLUMN IF NOT EXISTS ${colName} ${def}`);
            console.log(`Added canteen_addresses.${colName}`);
          } catch (e) {
            console.log(`canteen_addresses.${colName} already exists or error:`, (e as Error).message);
          }
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

    // Create stock_purchases table (add stock with supplier / purchase tracking)
    const stockPurchasesSQL = `
      CREATE TABLE IF NOT EXISTS stock_purchases (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        purchase_date DATETIME NOT NULL,
        unit_price DECIMAL(10,2) NULL,
        total_amount DECIMAL(10,2) NULL,
        invoice_number VARCHAR(100) NULL,
        notes TEXT NULL,
        created_by VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    await connection.execute(stockPurchasesSQL);

    // Daily notes / task reminders (calls, follow-ups, reminders)
    const dailyTaskRemindersSQL = `
      CREATE TABLE IF NOT EXISTS daily_task_reminders (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(500) NOT NULL,
        reminder_on DATETIME NULL,
        remarks TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_daily_task_reminders_status (status),
        INDEX idx_daily_task_reminders_reminder_on (reminder_on)
      )
    `;
    await connection.execute(dailyTaskRemindersSQL);

    // Invoice reservations (dummy placeholders to keep invoice number sequence)
    const invoiceReservationsSQL = `
      CREATE TABLE IF NOT EXISTS invoice_reservations (
        id VARCHAR(255) PRIMARY KEY,
        invoice_number VARCHAR(100) NOT NULL,
        sale_type VARCHAR(50) NOT NULL DEFAULT 'canteen',
        fy_label VARCHAR(16) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'reserved',
        reason TEXT NULL,
        linked_sale_id VARCHAR(255) NULL,
        created_by VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_invoice_reservations_invoice_number (invoice_number),
        INDEX idx_invoice_reservations_sale_type_status (sale_type, status)
      )
    `;
    await connection.execute(invoiceReservationsSQL);

    // Sales returns / expiry write-off register
    const salesReturnsSQL = `
      CREATE TABLE IF NOT EXISTS sales_returns (
        id VARCHAR(255) PRIMARY KEY,
        sale_id VARCHAR(255) NULL,
        sale_type VARCHAR(50) NOT NULL DEFAULT 'canteen',
        canteen_name VARCHAR(255) NULL,
        product_name VARCHAR(255) NOT NULL,
        unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
        quantity DECIMAL(12,2) NOT NULL,
        unit_price_ex_gst DECIMAL(12,2) NOT NULL,
        gst_rate DECIMAL(5,2) NOT NULL DEFAULT 5.00,
        return_amount_ex_gst DECIMAL(12,2) NOT NULL,
        return_gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        return_total_amount DECIMAL(12,2) NOT NULL,
        return_nature VARCHAR(30) NOT NULL DEFAULT 'sales_return',
        accounting_impact VARCHAR(30) NOT NULL DEFAULT 'revenue_reversal',
        reason TEXT NULL,
        return_date DATE NOT NULL,
        created_by VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_sales_returns_date (return_date),
        INDEX idx_sales_returns_sale_id (sale_id),
        INDEX idx_sales_returns_nature_impact (return_nature, accounting_impact)
      )
    `;
    await connection.execute(salesReturnsSQL);

    const courierExpensesSQL = `
      CREATE TABLE IF NOT EXISTS courier_expenses (
        id VARCHAR(255) PRIMARY KEY,
        courier_date DATE NOT NULL,
        quantity DECIMAL(12, 2) NOT NULL DEFAULT 0,
        cost DECIMAL(12, 2) NOT NULL,
        gst_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
        gst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        cgst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        sgst_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
        canteen_address_id VARCHAR(255) NULL,
        destination_note TEXT NULL,
        notes TEXT NULL,
        payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
        reference_no VARCHAR(100) NULL,
        reference_pdf_path VARCHAR(500) NULL,
        reference_pdf_original_name VARCHAR(255) NULL,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_courier_expenses_date (courier_date),
        INDEX idx_courier_expenses_canteen (canteen_address_id)
      )
    `;
    await connection.execute(courierExpensesSQL);

    // Ensure GST columns exist for older databases
    try {
      const [gRateCols] = await connection.query('SHOW COLUMNS FROM courier_expenses LIKE "gst_rate"');
      const hasGstRate = Array.isArray(gRateCols) && gRateCols.length > 0;
      if (!hasGstRate) {
        await connection.execute('ALTER TABLE courier_expenses ADD COLUMN gst_rate DECIMAL(5,2) NOT NULL DEFAULT 0');
      }
    } catch (_) {}

    try {
      const [gAmtCols] = await connection.query('SHOW COLUMNS FROM courier_expenses LIKE "gst_amount"');
      const hasGstAmount = Array.isArray(gAmtCols) && gAmtCols.length > 0;
      if (!hasGstAmount) {
        await connection.execute('ALTER TABLE courier_expenses ADD COLUMN gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0');
      }
    } catch (_) {}

    // Ensure CGST/SGST columns exist for older databases
    try {
      const [cCols] = await connection.query('SHOW COLUMNS FROM courier_expenses LIKE "cgst_amount"');
      const hasCgst = Array.isArray(cCols) && cCols.length > 0;
      if (!hasCgst) {
        await connection.execute('ALTER TABLE courier_expenses ADD COLUMN cgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0');
      }
    } catch (_) {}

    try {
      const [sCols] = await connection.query('SHOW COLUMNS FROM courier_expenses LIKE "sgst_amount"');
      const hasSgst = Array.isArray(sCols) && sCols.length > 0;
      if (!hasSgst) {
        await connection.execute('ALTER TABLE courier_expenses ADD COLUMN sgst_amount DECIMAL(12,2) NOT NULL DEFAULT 0');
      }
    } catch (_) {}

    // Backfill CGST/SGST from gst_amount (common intra-state split).
    try {
      await connection.execute(`
        UPDATE courier_expenses
        SET
          cgst_amount = ROUND(gst_amount / 2, 2),
          sgst_amount = ROUND(gst_amount - (gst_amount / 2), 2)
        WHERE gst_amount IS NOT NULL AND gst_amount > 0
          AND (cgst_amount = 0 AND sgst_amount = 0)
      `);
    } catch (_) {}

    // Reference PDF attachment columns (optional)
    for (const [colName, colDef] of [
      ['reference_pdf_path', 'VARCHAR(500) NULL'],
      ['reference_pdf_original_name', 'VARCHAR(255) NULL'],
    ]) {
      try {
        const [cols] = await connection.query(`SHOW COLUMNS FROM courier_expenses LIKE ?`, [colName]);
        const hasCol = Array.isArray(cols) && cols.length > 0;
        if (!hasCol) {
          await connection.execute(`ALTER TABLE courier_expenses ADD COLUMN ${colName} ${colDef}`);
        }
      } catch (_) {}
    }

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
    const session = await auth();
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
