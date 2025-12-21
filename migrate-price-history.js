const mysql = require('mysql2/promise');
require('dotenv').config({ path: '.env.local' });

async function createPriceHistoryTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'trinity_oil_mills'
  });

  try {
    console.log('Creating price history tables...');

    // Create product_price_history table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS product_price_history (
        id VARCHAR(255) PRIMARY KEY,
        product_id VARCHAR(255) NOT NULL,
        base_price DECIMAL(10,2) NOT NULL,
        retail_price DECIMAL(10,2) NOT NULL,
        gst_rate DECIMAL(5,2) NOT NULL,
        effective_date DATE NOT NULL,
        end_date DATE NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255) NOT NULL,
        notes TEXT,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        INDEX idx_product_effective_date (product_id, effective_date),
        INDEX idx_active_prices (product_id, is_active)
      )
    `);
    console.log('✓ product_price_history table created');

    // Create raw_material_price_history table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS raw_material_price_history (
        id VARCHAR(255) PRIMARY KEY,
        raw_material_id VARCHAR(255) NOT NULL,
        cost_per_unit DECIMAL(10,2) NOT NULL,
        gst_rate DECIMAL(5,2) NOT NULL,
        effective_date DATE NOT NULL,
        end_date DATE NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(255) NOT NULL,
        supplier VARCHAR(255),
        notes TEXT,
        FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id),
        INDEX idx_material_effective_date (raw_material_id, effective_date),
        INDEX idx_active_material_prices (raw_material_id, is_active)
      )
    `);
    console.log('✓ raw_material_price_history table created');

    // Create production_cost_history table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS production_cost_history (
        id VARCHAR(255) PRIMARY KEY,
        production_id VARCHAR(255) NOT NULL,
        product_id VARCHAR(255) NOT NULL,
        raw_material_id VARCHAR(255) NOT NULL,
        quantity_used DECIMAL(10,3) NOT NULL,
        cost_per_unit DECIMAL(10,2) NOT NULL,
        total_cost DECIMAL(10,2) NOT NULL,
        production_date DATE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (production_id) REFERENCES production(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id),
        INDEX idx_production_date (production_id, production_date),
        INDEX idx_product_production_date (product_id, production_date)
      )
    `);
    console.log('✓ production_cost_history table created');

    // Initialize price history for existing products
    console.log('Initializing price history for existing products...');
    
    // Get admin user ID for initial entries
    const [adminUsers] = await connection.execute(
      "SELECT id FROM users WHERE role = 'admin' LIMIT 1"
    );
    
    if (adminUsers.length === 0) {
      console.log('⚠ No admin user found. Please create an admin user first.');
      return;
    }
    
    const adminUserId = adminUsers[0].id;
    const today = new Date().toISOString().split('T')[0];

    // Initialize product price history
    const [existingProducts] = await connection.execute(
      "SELECT id, base_price, retail_price, gst_rate, created_at FROM products WHERE is_active = true"
    );

    for (const product of existingProducts) {
      // Check if price history already exists
      const [existingHistory] = await connection.execute(
        "SELECT id FROM product_price_history WHERE product_id = ? LIMIT 1",
        [product.id]
      );

      if (existingHistory.length === 0) {
        const effectiveDate = product.created_at.toISOString().split('T')[0];
        const historyId = require('crypto').randomUUID();
        
        await connection.execute(`
          INSERT INTO product_price_history 
          (id, product_id, base_price, retail_price, gst_rate, effective_date, is_active, created_by, notes)
          VALUES (?, ?, ?, ?, ?, ?, true, ?, 'Initial price history entry')
        `, [
          historyId,
          product.id,
          product.base_price,
          product.retail_price,
          product.gst_rate,
          effectiveDate,
          adminUserId
        ]);
      }
    }
    console.log(`✓ Initialized price history for ${existingProducts.length} products`);

    // Initialize raw material price history
    const [existingMaterials] = await connection.execute(
      "SELECT id, cost_per_unit, gst_rate, created_at FROM raw_materials WHERE is_active = true"
    );

    for (const material of existingMaterials) {
      const [existingHistory] = await connection.execute(
        "SELECT id FROM raw_material_price_history WHERE raw_material_id = ? LIMIT 1",
        [material.id]
      );

      if (existingHistory.length === 0) {
        const effectiveDate = material.created_at.toISOString().split('T')[0];
        const historyId = require('crypto').randomUUID();
        
        await connection.execute(`
          INSERT INTO raw_material_price_history 
          (id, raw_material_id, cost_per_unit, gst_rate, effective_date, is_active, created_by, notes)
          VALUES (?, ?, ?, ?, ?, true, ?, 'Initial price history entry')
        `, [
          historyId,
          material.id,
          material.cost_per_unit,
          material.gst_rate,
          effectiveDate,
          adminUserId
        ]);
      }
    }
    console.log(`✓ Initialized price history for ${existingMaterials.length} raw materials`);

    console.log('\n🎉 Price history tables created and initialized successfully!');
    console.log('\nNext steps:');
    console.log('1. Update your application to use the new historical pricing system');
    console.log('2. Use the new APIs to manage price changes');
    console.log('3. Generate historical PNL reports with accurate pricing');

  } catch (error) {
    console.error('Error creating price history tables:', error);
    throw error;
  } finally {
    await connection.end();
  }
}

// Run the migration
if (require.main === module) {
  createPriceHistoryTables()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = { createPriceHistoryTables };
