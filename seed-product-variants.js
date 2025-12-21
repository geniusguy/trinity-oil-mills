const mysql = require('mysql2/promise');

// Generates variants for each base product by unit size with simple price multipliers
// Units: 5L, 1L, 500ml, 200ml, retail
// Pricing logic: base (1L) = existing price; 5L = 5x with 3% discount; 500ml = 0.52x; 200ml = 0.22x; retail = same as 1L

const UNITS = [
  { code: '5L', factor: 5.0, discount: 0.03 },
  { code: '1L', factor: 1.0, discount: 0.0 },
  { code: '500ml', factor: 0.52, discount: 0.0 },
  { code: '200ml', factor: 0.22, discount: 0.0 },
  { code: 'retail', factor: 1.0, discount: 0.0 },
];

function priceFor(base, unit) {
  const p = Number(base) * unit.factor;
  const discounted = p * (1 - (unit.discount || 0));
  return Number(discounted.toFixed(2));
}

async function seedVariants() {
  const connection = await mysql.createConnection({ host: 'localhost', user: 'root', database: 'oil_shop_db_new' });
  console.log('🌱 Seeding product variants...');

  // Fetch all base products (any product that does not already have one of the predefined unit codes)
  const [products] = await connection.query(
    "SELECT id, name, category, type, description, price, unit FROM products"
  );

  const existingCheck = async (baseId, unitCode) => {
    const variantId = `${baseId}-${unitCode}`;
    const [rows] = await connection.query('SELECT id FROM products WHERE id = ? LIMIT 1', [variantId]);
    return rows.length > 0;
  };

  let created = 0;

  for (const p of products) {
    // Use the product's price as 1L base if its unit is 1L or retail or liters; otherwise approximate
    const isOneL = ['1L', 'retail', 'liters', 'liter', 'ltr'].includes(String(p.unit).toLowerCase());
    const basePrice = isOneL ? Number(p.price) : Number(p.price);

    for (const u of UNITS) {
      const variantId = `${p.id}-${u.code}`;
      const exists = await existingCheck(p.id, u.code);
      if (exists) continue;

      const variantPrice = priceFor(basePrice, u);

      await connection.execute(
        `INSERT INTO products (id, name, category, type, description, price, gst_rate, unit, barcode, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 5.00, ?, NULL, 1, NOW(), NOW())`,
        [
          variantId,
          `${p.name} - ${u.code}`,
          p.category,
          p.type,
          p.description,
          variantPrice,
          u.code,
        ]
      );
      created += 1;
      console.log(`✅ Created variant: ${variantId} @ ${variantPrice}`);
    }
  }

  console.log(`🎉 Variant seeding complete. Created ${created} variants.`);
  await connection.end();
}

seedVariants().catch((e) => {
  console.error('❌ Variant seeding failed:', e);
  process.exit(1);
});



