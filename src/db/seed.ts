import { db } from './db';
import { users, products, inventory, customers } from './schema';
import bcrypt from 'bcryptjs';

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const adminUser = await db.insert(users).values({
      id: 'admin-001',
      email: 'admin@trinityoil.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'admin',
    });

    // Create accountant user
    const accountantUser = await db.insert(users).values({
      id: 'accountant-001',
      email: 'accountant@trinityoil.com',
      password: hashedPassword,
      name: 'Accountant User',
      role: 'accountant',
    });

    // Create retail staff user
    const retailUser = await db.insert(users).values({
      id: 'retail-001',
      email: 'staff@trinityoil.com',
      password: hashedPassword,
      name: 'Retail Staff',
      role: 'retail_staff',
    });

    console.log('✅ Users created');

    // Create 5 oil products (3 produced + 2 purchased)
    const oilProducts = [
      // Produced oils
      {
        id: 'prod-ground-nut',
        name: 'Ground Nut Oil',
        category: 'produced',
        type: 'ground_nut',
        description: 'Pure ground nut oil produced in-house',
        price: '120.00',
        gstRate: '5.00',
        unit: 'liters',
        barcode: '8901234567890',
      },
      {
        id: 'prod-gingelly',
        name: 'Gingelly Oil',
        category: 'produced',
        type: 'gingelly',
        description: 'Premium gingelly oil produced in-house',
        price: '150.00',
        gstRate: '5.00',
        unit: 'liters',
        barcode: '8901234567891',
      },
      {
        id: 'prod-coconut',
        name: 'Coconut Oil',
        category: 'produced',
        type: 'coconut',
        description: 'Pure coconut oil produced in-house',
        price: '100.00',
        gstRate: '5.00',
        unit: 'liters',
        barcode: '8901234567892',
      },
      // Purchased oils
      {
        id: 'purch-deepam',
        name: 'Deepam Oil',
        category: 'purchased',
        type: 'deepam',
        description: 'Deepam brand cooking oil',
        price: '80.00',
        gstRate: '12.00',
        unit: 'liters',
        barcode: '8901234567893',
      },
      {
        id: 'purch-castor',
        name: 'Castor Oil',
        category: 'purchased',
        type: 'castor',
        description: 'Castor oil for industrial use',
        price: '200.00',
        gstRate: '18.00',
        unit: 'liters',
        barcode: '8901234567894',
      },
    ];

    for (const product of oilProducts) {
      await db.insert(products).values(product);
    }

    console.log('✅ Products created');

    // Create initial inventory for each product
    const inventoryData = [
      { productId: 'prod-ground-nut', quantity: '500', minStock: '50', maxStock: '1000', costPrice: '100.00' },
      { productId: 'prod-gingelly', quantity: '300', minStock: '30', maxStock: '800', costPrice: '120.00' },
      { productId: 'prod-coconut', quantity: '400', minStock: '40', maxStock: '900', costPrice: '80.00' },
      { productId: 'purch-deepam', quantity: '200', minStock: '20', maxStock: '500', costPrice: '70.00' },
      { productId: 'purch-castor', quantity: '100', minStock: '10', maxStock: '300', costPrice: '180.00' },
    ];

    for (const inv of inventoryData) {
      await db.insert(inventory).values({
        id: `inv-${inv.productId}`,
        ...inv,
        location: 'main_store',
        batchNumber: `BATCH-${Date.now()}`,
      });
    }

    console.log('✅ Inventory created');

    // Create sample customers
    const sampleCustomers = [
      {
        id: 'cust-001',
        name: 'Rajesh Kumar',
        email: 'rajesh@email.com',
        phone: '9876543210',
        address: '123 Main Street, Chennai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        customerType: 'retail',
        gstNumber: '33ABCDE1234F1Z5',
      },
      {
        id: 'cust-002',
        name: 'Saraswathi Canteen',
        email: 'saraswathi@canteen.com',
        phone: '9876543211',
        address: '456 College Road, Madurai',
        city: 'Madurai',
        state: 'Tamil Nadu',
        pincode: '625001',
        customerType: 'canteen',
        gstNumber: '33FGHIJ5678K2L6',
      },
      {
        id: 'cust-003',
        name: 'Priya Stores',
        email: 'priya@stores.com',
        phone: '9876543212',
        address: '789 Market Street, Coimbatore',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        pincode: '641001',
        customerType: 'retail',
        gstNumber: '33MNOPQ9012R3S7',
      },
    ];

    for (const customer of sampleCustomers) {
      await db.insert(customers).values(customer);
    }

    console.log('✅ Customers created');
    console.log('🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export default seed;




