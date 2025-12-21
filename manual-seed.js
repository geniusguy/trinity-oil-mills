const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function manualSeed() {
  try {
    console.log('🌱 Starting manual database seeding...');

    // Connect to the database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root'
    });

    // Use the database
    await connection.query('USE oil_shop_db_new');

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Insert users directly
    const users = [
      {
        id: 'admin-001',
        email: 'admin@trinityoil.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'admin'
      },
      {
        id: 'accountant-001',
        email: 'accountant@trinityoil.com',
        password: hashedPassword,
        name: 'Accountant User',
        role: 'accountant'
      },
      {
        id: 'retail-001',
        email: 'staff@trinityoil.com',
        password: hashedPassword,
        name: 'Retail Staff',
        role: 'retail_staff'
      }
    ];

    for (const user of users) {
      await connection.query(
        'INSERT INTO users (id, email, password, name, role, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
        [user.id, user.email, user.password, user.name, user.role]
      );
      console.log(`✅ User created: ${user.email}`);
    }

    // Insert products
    const products = [
      {
        id: 'prod-ground-nut',
        name: 'Ground Nut Oil',
        category: 'produced',
        type: 'ground_nut',
        description: 'Pure ground nut oil produced in-house',
        price: '120.00',
        gst_rate: '5.00',
        unit: 'liters',
        barcode: '8901234567890'
      },
      {
        id: 'prod-gingelly',
        name: 'Gingelly Oil',
        category: 'produced',
        type: 'gingelly',
        description: 'Premium gingelly oil produced in-house',
        price: '150.00',
        gst_rate: '5.00',
        unit: 'liters',
        barcode: '8901234567891'
      },
      {
        id: 'prod-coconut',
        name: 'Coconut Oil',
        category: 'produced',
        type: 'coconut',
        description: 'Pure coconut oil produced in-house',
        price: '100.00',
        gst_rate: '5.00',
        unit: 'liters',
        barcode: '8901234567892'
      },
      {
        id: 'purch-deepam',
        name: 'Deepam Oil',
        category: 'purchased',
        type: 'deepam',
        description: 'Deepam brand cooking oil',
        price: '80.00',
        gst_rate: '12.00',
        unit: 'liters',
        barcode: '8901234567893'
      },
      {
        id: 'purch-castor',
        name: 'Castor Oil',
        category: 'purchased',
        type: 'castor',
        description: 'Castor oil for industrial use',
        price: '200.00',
        gst_rate: '18.00',
        unit: 'liters',
        barcode: '8901234567894'
      }
    ];

    for (const product of products) {
      await connection.query(
        'INSERT INTO products (id, name, category, type, description, price, gst_rate, unit, barcode, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [product.id, product.name, product.category, product.type, product.description, product.price, product.gst_rate, product.unit, product.barcode, true]
      );
      console.log(`✅ Product created: ${product.name}`);
    }

    // Insert inventory
    const inventoryData = [
      { productId: 'prod-ground-nut', quantity: '500', minStock: '50', maxStock: '1000', costPrice: '100.00' },
      { productId: 'prod-gingelly', quantity: '300', minStock: '30', maxStock: '800', costPrice: '120.00' },
      { productId: 'prod-coconut', quantity: '400', minStock: '40', maxStock: '900', costPrice: '80.00' },
      { productId: 'purch-deepam', quantity: '200', minStock: '20', maxStock: '500', costPrice: '70.00' },
      { productId: 'purch-castor', quantity: '100', minStock: '10', maxStock: '300', costPrice: '180.00' }
    ];

    for (const inv of inventoryData) {
      await connection.query(
        'INSERT INTO inventory (id, product_id, quantity, min_stock, max_stock, location, batch_number, cost_price, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())',
        [`inv-${inv.productId}`, inv.productId, inv.quantity, inv.minStock, inv.maxStock, 'main_store', `BATCH-${Date.now()}`, inv.costPrice]
      );
      console.log(`✅ Inventory created for: ${inv.productId}`);
    }

    await connection.end();
    console.log('🎉 Manual seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error in manual seeding:', error);
  }
}

manualSeed();
