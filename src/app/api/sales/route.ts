import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';

// Function to deduct packaging materials for both retail and canteen sales
async function deductPackagingMaterials(connection: any, productId: string, quantity: number, saleType: string) {
  try {
    // Get product details to determine packaging requirements
    const [productResult] = await connection.query(
      'SELECT name, unit FROM products WHERE id = ?',
      [productId]
    );
    
    if (!productResult || productResult.length === 0) return;
    
    const product = productResult[0];
    const productName = product.name.toLowerCase();
    
    // Define packaging requirements based on product
    const packagingRequirements = [];
    
    // For oil products, determine bottle size and packaging needs
    if (productName.includes('oil')) {
      // Determine oil type for labels
      let oilType = '';
      if (productName.includes('groundnut')) oilType = 'groundnut';
      else if (productName.includes('gingelly') || productName.includes('sesame')) oilType = 'gingelly';
      else if (productName.includes('coconut')) oilType = 'coconut';
      else if (productName.includes('deepam')) oilType = 'deepam';
      else if (productName.includes('castor')) oilType = 'castor';

      if (productName.includes('5l') || productName.includes('5 l') || productName.includes('5 liter')) {
        // 5 Liter oil needs: 5L bottle + 5L cap + 5L label
        packagingRequirements.push(
          { type: 'pet_5l', quantity: quantity, description: 'PET Bottle 5 Liter' },
          { type: 'caps_5l', quantity: quantity, description: 'Bottle Caps (5L)' },
          { type: `labels_${oilType}_5l`, quantity: quantity, description: `${oilType.charAt(0).toUpperCase() + oilType.slice(1)} Oil Labels (5L)` }
        );
      } else if (productName.includes('1l') || productName.includes('1 l') || productName.includes('1 liter')) {
        // 1 Liter oil needs: 1L bottle + 1L cap + 1L label
        packagingRequirements.push(
          { type: 'pet_1l', quantity: quantity, description: 'PET Bottle 1 Liter' },
          { type: 'caps_1l', quantity: quantity, description: 'Bottle Caps (1L)' },
          { type: `labels_${oilType}_1l`, quantity: quantity, description: `${oilType.charAt(0).toUpperCase() + oilType.slice(1)} Oil Labels (1L)` }
        );
      } else if (productName.includes('500ml') || productName.includes('500 ml')) {
        // 500ml oil needs: 500ml bottle + 500ml cap + 500ml label
        packagingRequirements.push(
          { type: 'pet_500ml', quantity: quantity, description: 'PET Bottle 500ml' },
          { type: 'caps_500ml', quantity: quantity, description: 'Bottle Caps (500ml)' },
          { type: `labels_${oilType}_500ml`, quantity: quantity, description: `${oilType.charAt(0).toUpperCase() + oilType.slice(1)} Oil Labels (500ml)` }
        );
      } else if (productName.includes('200ml') || productName.includes('200 ml')) {
        // 200ml oil needs: 200ml bottle + 200ml cap + 200ml label
        packagingRequirements.push(
          { type: 'pet_200ml', quantity: quantity, description: 'PET Bottle 200ml' },
          { type: 'caps_200ml', quantity: quantity, description: 'Bottle Caps (200ml)' },
          { type: `labels_${oilType}_200ml`, quantity: quantity, description: `${oilType.charAt(0).toUpperCase() + oilType.slice(1)} Oil Labels (200ml)` }
        );
      }
      
      // Additional packaging for canteen delivery only
      if (saleType === 'canteen') {
        // Canteen orders need cardboard box (1 per order)
        packagingRequirements.push(
          { type: 'cardboard', quantity: 1, description: 'Cardboard Boxes' }
        );
        
        // For packing tape: Check how many canteen orders exist and deduct tape every 4 orders
        try {
          const [canteenOrderCount] = await connection.query(
            'SELECT COUNT(*) as count FROM sales WHERE sale_type = "canteen"'
          );
          const totalCanteenOrders = canteenOrderCount[0].count + 1; // +1 for current order
          
          // Check if this order completes a group of 4 (every 4th order needs 1 tape)
          if (totalCanteenOrders % 4 === 0) {
            packagingRequirements.push(
              { type: 'packing_tape', quantity: 1, description: 'Packing Tape' }
            );
          }
        } catch (error) {
          console.log('Could not check canteen order count for tape calculation:', error instanceof Error ? error.message : error);
        }
      }
    }
    
    // Deduct packaging materials from inventory
    for (const pkg of packagingRequirements) {
      // First, try to deduct from products table (legacy packaging products)
      await connection.execute(
        `UPDATE inventory SET quantity = GREATEST(0, quantity - ?) 
         WHERE product_id IN (
           SELECT id FROM products 
           WHERE name LIKE ? AND category = 'packaging'
         )`,
        [pkg.quantity, `%${pkg.type}%`]
      );
      
      // Also try to deduct from raw materials if the table exists
      try {
        await connection.execute(
          `UPDATE rawMaterials SET current_stock = GREATEST(0, current_stock - ?) 
           WHERE name LIKE ? AND category = 'packaging'`,
          [pkg.quantity, `%${pkg.description}%`]
        );
      } catch (error) {
        // Raw materials table might not exist yet, ignore error
        console.log('Raw materials table not available, skipping:', error instanceof Error ? error.message : error);
      }
      
      console.log(`Deducted ${pkg.quantity} ${pkg.description} for product ${productId}`);
    }
    
  } catch (error) {
    console.error('Error deducting packaging materials:', error);
    // Don't throw error to avoid breaking the sale, just log it
  }
}

// GET /api/sales
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get('limit') || 50);
    const offset = Number(searchParams.get('offset') || 0);
    const saleType = searchParams.get('saleType');
    const category = searchParams.get('category'); // For backward compatibility

    const connection = await createConnection();
    
    // Check if po_number column exists (and create if missing)
    let hasPoNumberColumn = false;
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM sales LIKE "po_number"');
      hasPoNumberColumn = Array.isArray(columns) && columns.length > 0;
      if (!hasPoNumberColumn) {
        try {
          await connection.query('ALTER TABLE sales ADD COLUMN po_number VARCHAR(255) NULL');
          hasPoNumberColumn = true;
        } catch (e) {
          console.log('ALTER add po_number failed:', (e as any)?.message);
        }
      }
    } catch (error) {
      console.log('Could not check for po_number column:', error);
    }

    const poNumberField = hasPoNumberColumn ? ', s.po_number as poNumber' : ', NULL as poNumber';
    
    // Check if po_date column exists (and create if missing)
    let hasPoDateColumn = false;
    try {
      const [poDateColumns] = await connection.query('SHOW COLUMNS FROM sales LIKE "po_date"');
      hasPoDateColumn = Array.isArray(poDateColumns) && poDateColumns.length > 0;
      if (!hasPoDateColumn) {
        try {
          await connection.query('ALTER TABLE sales ADD COLUMN po_date DATE NULL');
          hasPoDateColumn = true;
        } catch (e) {
          console.log('ALTER add po_date failed:', (e as any)?.message);
        }
      }
    } catch (error) {
      console.log('Could not check for po_date column:', error);
    }

    const poDateField = hasPoDateColumn ? ', s.po_date as poDate' : ', NULL as poDate';

    let invoiceDateField = ', NULL as invoiceDate';
    try {
      const [invCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "invoice_date"');
      if (Array.isArray(invCols) && invCols.length > 0) {
        invoiceDateField = ', s.invoice_date as invoiceDate';
      }
    } catch (_) {}

    // Check for mode_of_sales column
    let hasModeOfSalesColumn = false;
    try {
      const [modeColumns] = await connection.query('SHOW COLUMNS FROM sales LIKE "mode_of_sales"');
      hasModeOfSalesColumn = Array.isArray(modeColumns) && modeColumns.length > 0;
    } catch (error) {
      console.log('Could not check for mode_of_sales column:', error);
    }
    
    const modeOfSalesField = hasModeOfSalesColumn ? ', s.mode_of_sales as modeOfSales' : ', NULL as modeOfSales';
    
    // kept_on_display column (new)
    let keptOnDisplayField = ', 0 as keptOnDisplay';
    try {
      const [kCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "kept_on_display"');
      if (Array.isArray(kCols) && kCols.length > 0) {
        keptOnDisplayField = ', s.kept_on_display as keptOnDisplay';
      }
    } catch (_) {}

    // courier / mail-sent columns (optional)
    let courierField = ', NULL as courierWeightOrRs';
    try {
      const [cCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "courier_weight_or_rs"');
      if (Array.isArray(cCols) && cCols.length > 0) courierField = ', s.courier_weight_or_rs as courierWeightOrRs';
    } catch (_) {}

    let mailSentField = ', NULL as mailSentHoDate';
    try {
      const [mCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "mail_sent_ho_date"');
      if (Array.isArray(mCols) && mCols.length > 0) mailSentField = ', s.mail_sent_ho_date as mailSentHoDate';
    } catch (_) {}

    let query = `SELECT s.id, s.invoice_number as invoiceNumber, s.sale_type as saleType, s.subtotal, s.gst_amount as gstAmount, s.total_amount as totalAmount,
                        s.payment_method as paymentMethod, s.payment_status as paymentStatus, s.shipment_status as shipmentStatus, s.notes${poNumberField}${poDateField}${invoiceDateField}${modeOfSalesField}${keptOnDisplayField}${courierField}${mailSentField}, s.created_at as createdAt,
                        s.canteen_address_id as canteenAddressId, u.name as userName, s.notes as customerName, ca.canteen_name as canteenName, ca.address as canteenAddress,
                        ca.contact_person as canteenContact, ca.mobile_number as canteenMobile
                 FROM sales s
                 JOIN users u ON u.id = s.user_id
                 LEFT JOIN canteen_addresses ca ON ca.id = s.canteen_address_id`;
    
    const params = [];
    
    // Filter by sale type or category
    if (saleType || category) {
      const filterType = saleType || category;
      query += ' WHERE s.sale_type = ?';
      params.push(filterType);
    }
    
    query += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const [rows] = await connection.query(query, params);
    await connection.end();
    return NextResponse.json({ sales: rows }, { status: 200 });
  } catch (error) {
    console.error('Sales GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { message: errorMessage, stack: errorStack });
    console.error('DATABASE_URL available:', !!process.env.DATABASE_URL);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

// Function to generate auto invoice number with 4 digits and year (e.g. C0001/2026)
async function generateInvoiceNumber(connection: any, saleType: string, customInvoiceNumber?: string) {
  if (customInvoiceNumber && customInvoiceNumber.trim() !== '') {
    let formattedNumber = customInvoiceNumber.trim();
    
    // If user just entered a number like "56", format it properly with sale type prefix (4 digits)
    if (/^\d+$/.test(formattedNumber)) {
      const currentYear = new Date().getFullYear();
      const paddedNumber = formattedNumber.padStart(4, '0');
      const prefix = saleType === 'canteen' ? 'C' : 'R';
      formattedNumber = `${prefix}${paddedNumber}/${currentYear}`;
    }
    
    // Validate the final format: C0001/2026 or R0001/2026 (4 digits)
    const formatRegex = /^[CR]\d{4}\/\d{4}$/;
    if (!formatRegex.test(formattedNumber)) {
      const expectedPrefix = saleType === 'canteen' ? 'C' : 'R';
      throw new Error(`Invoice number must be in format: ${expectedPrefix}0001/2026 or just enter: 1`);
    }
    
    // Check if the prefix matches the sale type
    const prefix = formattedNumber.charAt(0);
    const expectedPrefix = saleType === 'canteen' ? 'C' : 'R';
    if (prefix !== expectedPrefix) {
      throw new Error(`${saleType === 'canteen' ? 'Canteen' : 'Retail'} sales must use ${expectedPrefix} prefix`);
    }
    
    // Check if custom invoice number already exists
    const [existing] = await connection.query(
      'SELECT id FROM sales WHERE invoice_number = ?',
      [formattedNumber]
    );
    
    if (existing.length > 0) {
      throw new Error('Invoice number already exists');
    }
    
    return formattedNumber;
  }
  
  // Auto-generate invoice number with separate sequences (4 digits)
  const currentYear = new Date().getFullYear();
  const prefix = saleType === 'canteen' ? 'C' : 'R';
  
  // Get the highest invoice number for current year and sale type
  const [rows] = await connection.query(
    'SELECT invoice_number FROM sales WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1',
    [`${prefix}%/${currentYear}`]
  );
  
  let nextNumber = 1;
  if (rows.length > 0) {
    const lastInvoice = rows[0].invoice_number;
    const numberPart = lastInvoice.split('/')[0].substring(1); // Remove prefix
    nextNumber = parseInt(numberPart, 10) + 1;
  }
  
  // Format as 4 digits with leading zeros (e.g. C0001/2026)
  const paddedNumber = nextNumber.toString().padStart(4, '0');
  return `${prefix}${paddedNumber}/${currentYear}`;
}

// Castor Oil 200ml: POS may send 55336/68539 but inventory can be under castor-200ml or 55336/68539 — check all.
const CASTOR_200ML_LOOKUP_IDS = ['55336', '68539', 'castor-200ml'];
const CASTOR_200ML_NEW_ID = '68539';
const CASTOR_200ML_NEW_BASE_PRICE = 76.19; // GST-EXCLUSIVE price for new code (GST extra)

/**
 * Deduct quantity from inventory.
 * 1) Find row by product_id. For Castor (55336/68539), also look for product_id 'castor-200ml' and pick row with most stock.
 * 2) If found: UPDATE by id. If not: INSERT row then UPDATE by id.
 */
async function deductInventory(connection: any, productId: string, quantity: number): Promise<void> {
  const pid = String(productId).trim();
  const isCastor = ['55336', '68539'].includes(pid);
  const lookupIds = isCastor ? CASTOR_200ML_LOOKUP_IDS : [pid];

  // 1) Find inventory row. For Castor, try every possible product_id and pick the row with highest quantity.
  let invId: string | null = null;
  if (lookupIds.length === 1) {
    const [rows]: any = await connection.query('SELECT id FROM inventory WHERE product_id = ? LIMIT 1', [lookupIds[0]]);
    if (rows && rows[0]) invId = rows[0].id;
  } else {
    let best: { id: string; quantity: number } | null = null;
    for (const id of lookupIds) {
      const [rows]: any = await connection.query('SELECT id, quantity FROM inventory WHERE product_id = ? LIMIT 1', [id]);
      if (rows && rows[0]) {
        const q = Number(rows[0].quantity ?? 0);
        if (!best || q > best.quantity) best = { id: rows[0].id, quantity: q };
      }
    }
    if (best) invId = best.id;
  }

  if (!invId) {
    const insertProductId = isCastor ? 'castor-200ml' : pid;
    invId = `inv-${insertProductId}-${Date.now()}`;
    await connection.execute(
      `INSERT INTO inventory (id, product_id, quantity, min_stock, max_stock, location, created_at, updated_at)
       VALUES (?, ?, 0, 10, 1000, 'main_store', NOW(), NOW())`,
      [invId, insertProductId]
    );
  }

  // 2) Deduct by primary key (same style as PUT /api/inventory)
  await connection.execute(
    'UPDATE inventory SET quantity = quantity - ?, updated_at = NOW() WHERE id = ?',
    [quantity, invId]
  );
}

// POST /api/sales (create sale with items, 5% GST, deduct inventory)
export async function POST(request: NextRequest) {
    const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      customerId = null,
      items = [],
      paymentMethod = 'cash',
      paymentStatus = 'paid',
      shipmentStatus = 'walk_in_delivery',
      saleType = 'retail',
      customerName = '',
      canteenAddressId = null,
      customInvoiceNumber = null,
      poNumber = null,
      poDate = null,
      invoiceDate = null,
      modeOfSales = null,
      customerEmail = null,
      keptOnDisplay = null,
      courierWeightOrRs = null,
      mailSentHoDate = null,
      gstMode,
    } = body;
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    // Set default values for canteen sales
    let finalPaymentStatus = paymentStatus;
    let finalShipmentStatus = shipmentStatus;
    
    if (saleType === 'canteen') {
      finalPaymentStatus = 'pending'; // Default to pending for canteen
      finalShipmentStatus = 'pending'; // Default to pending for canteen orders
      
      // Make email mandatory for canteen sales
      if (modeOfSales === 'email' && !customerEmail) {
        return NextResponse.json({ error: 'Email is required for email orders' }, { status: 400 });
      }
    }

    const connection = await createConnection();
    try {
      await connection.beginTransaction();

    // Fetch product prices to ensure server-trusted pricing
    const productIds = items.map((i: any) => i.productId);
    const [products] = await connection.query(
      `SELECT id, name, base_price as basePrice, retail_price as retailPrice, gst_rate as gstRate FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
      productIds
    );
    const idToProduct: Record<string, any> = {};
    (products as any[]).forEach((p) => (idToProduct[p.id] = p));

    let subtotal = 0;
    let gstAmount = 0;
    const effectiveGstMode: 'included' | 'excluded' =
      gstMode === 'included' || gstMode === 'excluded'
        ? gstMode
        : 'included';

    const preparedItems = items.map((i: any) => {
      const prod = idToProduct[i.productId];
      const quantity = Number(i.quantity);

      const productGstRate = prod && prod.gstRate != null ? Number(prod.gstRate) : 5.0;
      let unitPrice: number;
      let lineGstAmount: number;
      let lineBase: number;

      const isCastorNew = String(i.productId).trim() === CASTOR_200ML_NEW_ID;

      if (effectiveGstMode === 'included') {
        // Use GST-inclusive price, GST is already inside unit price
        unitPrice = prod ? Number(prod.retailPrice) : Number(i.unitPrice || 0);
        if (isCastorNew) {
          // If someone uses GST-included mode, inclusive price should be base + 5% GST
          unitPrice = Number((CASTOR_200ML_NEW_BASE_PRICE * (1 + productGstRate / 100)).toFixed(2));
        }
        const lineTotalInclusive = unitPrice * quantity;
        lineGstAmount = Number((lineTotalInclusive * productGstRate / (100 + productGstRate)).toFixed(2));
        lineBase = Number((lineTotalInclusive - lineGstAmount).toFixed(2));
        subtotal += lineBase;
        gstAmount += lineGstAmount;
        return {
          ...i,
          unitPrice,
          quantity,
          lineTotal: lineTotalInclusive,
          gstAmount: lineGstAmount,
          gstRate: productGstRate,
        };
      } else {
        // Use GST-exclusive price, add GST on top
        unitPrice = prod ? Number(prod.basePrice) : Number(i.unitPrice || 0);
        if (isCastorNew) {
          // Force new Castor 200ml code to 76.19 (GST extra)
          unitPrice = CASTOR_200ML_NEW_BASE_PRICE;
        }
        const lineTotalExclusive = unitPrice * quantity;
        lineGstAmount = Number((lineTotalExclusive * productGstRate / 100).toFixed(2));
        lineBase = lineTotalExclusive;
        subtotal += lineBase;
        gstAmount += lineGstAmount;
        return {
          ...i,
          unitPrice,
          quantity,
          lineTotal: lineTotalExclusive + lineGstAmount,
          gstAmount: lineGstAmount,
          gstRate: productGstRate,
        };
      }
    });

    const totalAmount = Number((subtotal + gstAmount).toFixed(2));

    const saleId = `sale-${Date.now()}`;
    const invoiceNumber = await generateInvoiceNumber(connection, saleType, customInvoiceNumber);

    // Normalize modeOfSales to include email if applicable
    let finalModeOfSales = modeOfSales;
    if (modeOfSales === 'email' && customerEmail) {
      finalModeOfSales = `email:${customerEmail}`;
    }

    // Check if po_number column exists
    let hasPoNumberColumn = false;
    try {
      const [columns] = await connection.query('SHOW COLUMNS FROM sales LIKE "po_number"');
      hasPoNumberColumn = Array.isArray(columns) && columns.length > 0;
    } catch (error) {
      console.log('Could not check for po_number column:', error);
    }

    // Check if po_date column exists
    let hasPoDateColumn = false;
    try {
      const [poDateColumns] = await connection.query('SHOW COLUMNS FROM sales LIKE "po_date"');
      hasPoDateColumn = Array.isArray(poDateColumns) && poDateColumns.length > 0;
    } catch (error) {
      console.log('Could not check for po_date column:', error);
    }

    // Check for additional columns
    let hasModeOfSalesColumn = false;
    try {
      const [modeColumns] = await connection.query('SHOW COLUMNS FROM sales LIKE "mode_of_sales"');
      hasModeOfSalesColumn = Array.isArray(modeColumns) && modeColumns.length > 0;
      if (!hasModeOfSalesColumn) {
        try {
          await connection.query('ALTER TABLE sales ADD COLUMN mode_of_sales VARCHAR(255) NULL');
          hasModeOfSalesColumn = true;
        } catch (e) {
          console.log('ALTER add mode_of_sales failed:', (e as any)?.message);
        }
      }
    } catch (error) {
      console.log('Could not check for mode_of_sales column:', error);
    }

    // Check if invoice_date column exists
    let hasInvoiceDateColumn = false;
    let invoiceDateValue: string | null = typeof invoiceDate === 'string' && invoiceDate.trim() ? invoiceDate.trim() : null;
    if (!invoiceDateValue) {
      invoiceDateValue = new Date().toISOString().slice(0, 10);
    }
    try {
      const [invDateCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "invoice_date"');
      hasInvoiceDateColumn = Array.isArray(invDateCols) && invDateCols.length > 0;
      if (!hasInvoiceDateColumn) {
        try {
          await connection.query('ALTER TABLE sales ADD COLUMN invoice_date DATE NULL');
          hasInvoiceDateColumn = true;
        } catch (e: any) {
          console.log('ALTER add invoice_date failed:', e?.message);
        }
      }
    } catch (error) {
      console.log('Could not check for invoice_date column:', error);
    }

    // Build dynamic insert query
    let insertFields = 'id, customer_id, user_id, invoice_number, sale_type, subtotal, gst_amount, total_amount, payment_method, payment_status, shipment_status, notes, canteen_address_id';
    let insertValues = [saleId, customerId, session.user.id, invoiceNumber, saleType, subtotal, gstAmount, totalAmount, paymentMethod, finalPaymentStatus, finalShipmentStatus, customerName, canteenAddressId];
    let insertPlaceholders = '?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?';

    if (hasPoNumberColumn) {
      insertFields += ', po_number';
      insertValues.push(poNumber);
      insertPlaceholders += ', ?';
    }

    if (hasPoDateColumn) {
      insertFields += ', po_date';
      insertValues.push(poDate);
      insertPlaceholders += ', ?';
    }

    if (hasModeOfSalesColumn) {
      let normalizedMode = modeOfSales;
      if (modeOfSales && modeOfSales === 'email' && body.customerEmail) {
        normalizedMode = `email:${body.customerEmail}`;
      }
      insertFields += ', mode_of_sales';
      insertValues.push(normalizedMode);
      insertPlaceholders += ', ?';
    }

    if (hasInvoiceDateColumn) {
      insertFields += ', invoice_date';
      insertValues.push(invoiceDateValue);
      insertPlaceholders += ', ?';
    }

    // kept_on_display (only meaningful for canteen, default 0/false)
    try {
      const [kCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "kept_on_display"');
      const hasKept = Array.isArray(kCols) && kCols.length > 0;
      if (hasKept) {
        insertFields += ', kept_on_display';
        const v = saleType === 'canteen' ? (keptOnDisplay ? 1 : 0) : 0;
        insertValues.push(v);
        insertPlaceholders += ', ?';
      }
    } catch (_) {}

    // courier_weight_or_rs (canteen only)
    try {
      const [cCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "courier_weight_or_rs"');
      const hasCourier = Array.isArray(cCols) && cCols.length > 0;
      if (hasCourier) {
        insertFields += ', courier_weight_or_rs';
        const raw = courierWeightOrRs && String(courierWeightOrRs).trim() ? String(courierWeightOrRs).trim() : '';

        // If user didn't enter anything, default to the same Gross Weight calc used in invoice HTML.
        const getWeightPerUnitKg = (name: string) => {
          const n = (name || '').toLowerCase();
          const mlMatch = n.match(/\b(\d+)\s*ml/);
          if (mlMatch) {
            const ml = parseInt(mlMatch[1], 10);
            if (ml <= 250) return 0.2;
            if (ml <= 600) return 0.5;
            return ml / 1000;
          }
          const literMatch = n.match(/\b(16|5|1)\s*l(it(er|re))?/);
          if (literMatch) {
            const num = parseInt(literMatch[1], 10);
            if (num >= 16) return 16;
            if (num >= 5) return 5;
            return 1;
          }
          if (/\b16\b/.test(n) && (n.includes('l') || n.includes('tin'))) return 16;
          if (/\b5\s*l|\b5l\b/.test(n)) return 5;
          if (/\b1\s*l|\b1l\b|\b1\s*liter|\b1\s*litre/.test(n)) return 1;
          if (n.includes('500') && (n.includes('ml') || n.includes('0.5'))) return 0.5;
          if (n.includes('200') || n.includes('0.2')) return 0.2;
          return 0.2;
        };

        const computeGrossKg = () => {
          let totalKg = 0;
          for (const it of preparedItems as any[]) {
            const qty = Number(it.quantity) || 0;
            const prod = idToProduct[it.productId];
            const name = (prod && prod.name) ? String(prod.name) : '';
            totalKg += qty * getWeightPerUnitKg(name);
          }
          return Number(totalKg.toFixed(2));
        };

        const v =
          saleType === 'canteen'
            ? (raw
                ? raw
                : (() => {
                    const kg = computeGrossKg();
                    // If for some reason we can't compute meaningful weight, fall back to total amount.
                    if (!Number.isFinite(kg) || kg <= 0) return `₹${Number(totalAmount).toFixed(2)}`;
                    return `${kg.toFixed(2)} kg`;
                  })())
            : null;
        insertValues.push(v);
        insertPlaceholders += ', ?';
      }
    } catch (_) {}

    // mail_sent_ho_date (canteen only)
    try {
      const [mCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "mail_sent_ho_date"');
      const hasMail = Array.isArray(mCols) && mCols.length > 0;
      if (hasMail) {
        insertFields += ', mail_sent_ho_date';
        const trimmed = typeof mailSentHoDate === 'string' ? mailSentHoDate.trim() : '';
        const v = saleType === 'canteen' ? (trimmed ? trimmed.slice(0, 10) : null) : null;
        insertValues.push(v);
        insertPlaceholders += ', ?';
      }
    } catch (_) {}

    insertFields += ', created_at, updated_at';
    insertPlaceholders += ', NOW(), NOW()';

        await connection.execute(
          `INSERT INTO sales (${insertFields}) VALUES (${insertPlaceholders})`,
          insertValues
        );

    for (const it of preparedItems) {
      const itemId = `${saleId}-${it.productId}`;
      await connection.execute(
        `INSERT INTO sale_items (id, sale_id, product_id, quantity, unit_price, gst_rate, gst_amount, total_amount, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          itemId,
          saleId,
          it.productId,
          it.quantity,
          it.unitPrice,
          it.gstRate,
          it.gstAmount,
          it.lineTotal,
        ]
      );

      await deductInventory(connection, it.productId, it.quantity);

      try {
        await deductPackagingMaterials(connection, it.productId, it.quantity, saleType);
      } catch (packErr) {
        console.error('[sales] Packaging deduction failed (sale and inventory still saved):', packErr);
      }
    }

      await connection.commit();
      return NextResponse.json({
        sale: {
          id: saleId,
          invoiceNumber,
          subtotal,
          gstAmount,
          totalAmount,
          paymentMethod,
        },
      }, { status: 201 });
    } catch (txError) {
      try { await connection.rollback(); } catch (_) {}
      throw txError;
    } finally {
      try { await connection.end(); } catch (_) {}
    }
  } catch (error) {
    console.error('Sales POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


