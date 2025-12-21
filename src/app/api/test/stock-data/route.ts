import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// Test endpoint to debug stock data fetching
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await createConnection();

    // Test inventory table structure
    const [inventoryStructure] = await connection.query('DESCRIBE inventory');
    
    // Test products table structure  
    const [productsStructure] = await connection.query('DESCRIBE products');

    // Get sample data from both tables
    const [inventorySample] = await connection.query(
      `SELECT i.*, p.name as productName, p.retail_price 
       FROM inventory i 
       LEFT JOIN products p ON p.id = i.product_id 
       LIMIT 3`
    );

    const [productsSample] = await connection.query(
      'SELECT * FROM products LIMIT 3'
    );

    // Count records
    const [inventoryCount] = await connection.query('SELECT COUNT(*) as count FROM inventory') as any[];
    const [productsCount] = await connection.query('SELECT COUNT(*) as count FROM products') as any[];

    await connection.end();

    return NextResponse.json({
      success: true,
      debug: {
        inventoryStructure,
        productsStructure,
        inventorySample,
        productsSample,
        counts: {
          inventory: inventoryCount[0].count,
          products: productsCount[0].count
        }
      }
    });
  } catch (error) {
    console.error('Test API error:', error);
    return NextResponse.json({ 
      error: 'Database test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
