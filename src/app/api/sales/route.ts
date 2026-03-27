import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import {
  isCastor200mlProduct,
  packLitersPerUnit,
  CASTOR_200ML_LOOKUP_IDS,
  CASTOR_200ML_NEW_ID,
  CANTEEN_LITERS_PER_TIN,
} from '@/lib/canteenSupply';
import { auth } from '@/lib/auth';
import { getInvoiceFinancialYearSuffix, INVOICE_NUMBER_FULL_REGEX } from '@/lib/financialYear';

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
    
    // Define packaging requirements based on product.
    // We keep both product-id oriented matching (preferred) and fallback name matching.
    const packagingRequirements: Array<{
      quantity: number;
      description: string;
      inventoryIdHints?: string[];
      inventoryNameHints?: string[];
      rawMaterialNameHints?: string[];
    }> = [];
    
    // For oil products, determine bottle size and packaging needs
    if (productName.includes('oil')) {
      // Determine oil type for labels
      let oilType = '';
      if (productName.includes('groundnut')) oilType = 'groundnut';
      else if (productName.includes('gingelly') || productName.includes('sesame')) oilType = 'gingelly';
      else if (productName.includes('coconut')) oilType = 'coconut';
      else if (productName.includes('deepam')) oilType = 'deepam';
      else if (productName.includes('castor')) oilType = 'castor';

      const addBottlePackaging = (sizeKey: '5l' | '1l' | '500ml' | '200ml') => {
        const sizeLabel = sizeKey === '5l' ? '5L' : sizeKey === '1l' ? '1L' : sizeKey === '500ml' ? '500ml' : '200ml';
        const bottleId = `pack_pet_bottle_${sizeKey}`;
        const innerCapId = `pack_inner_cap_${sizeKey}`;
        const flipTopIds = [
          `pack_flip_top_cap_${sizeKey}_green`,
          `pack_flip_top_cap_${sizeKey}_yellow`,
          `pack_flip_top_cap_${sizeKey}_white`,
          `pack_flip_top_cap_${sizeKey}_red`,
        ];
        const frontLabelId = `pack_front_label_${sizeKey}`;
        const backLabelId = `pack_back_label_${sizeKey}`;

        packagingRequirements.push(
          {
            quantity,
            description: `PET Bottle ${sizeLabel}`,
            inventoryIdHints: [bottleId],
            inventoryNameHints: [`pet bottle ${sizeLabel.toLowerCase()}`, `pet bottle ${sizeKey}`, `bottle ${sizeLabel.toLowerCase()}`],
            rawMaterialNameHints: [`pet bottle ${sizeKey}`, `bottle ${sizeLabel.toLowerCase()}`],
          },
          {
            quantity,
            description: `Inner Cap (${sizeLabel})`,
            inventoryIdHints: [innerCapId],
            inventoryNameHints: [`inner cap ${sizeKey}`, `inner cap ${sizeLabel.toLowerCase()}`, `innercap ${sizeKey}`],
            rawMaterialNameHints: [`inner cap ${sizeKey}`, `inner cap ${sizeLabel.toLowerCase()}`],
          },
          {
            quantity,
            description: `Flip Top Cap (${sizeLabel})`,
            inventoryIdHints: flipTopIds,
            inventoryNameHints: [`flip top cap ${sizeKey}`, `flip cap ${sizeKey}`, `bottle cap flip top ${sizeKey}`],
            rawMaterialNameHints: [`flip top cap ${sizeKey}`, `flip cap ${sizeKey}`],
          },
          {
            quantity,
            description: `${oilType.charAt(0).toUpperCase() + oilType.slice(1)} Front Label (${sizeLabel})`,
            inventoryIdHints: [frontLabelId],
            inventoryNameHints: [`${oilType} front label ${sizeKey}`, `front label ${sizeKey}`, `${oilType} label front ${sizeKey}`],
            rawMaterialNameHints: [`${oilType} front label ${sizeKey}`, `front label ${sizeKey}`],
          },
          {
            quantity,
            description: `${oilType.charAt(0).toUpperCase() + oilType.slice(1)} Back Label (${sizeLabel})`,
            inventoryIdHints: [backLabelId],
            inventoryNameHints: [`${oilType} back label ${sizeKey}`, `back label ${sizeKey}`, `${oilType} label back ${sizeKey}`],
            rawMaterialNameHints: [`${oilType} back label ${sizeKey}`, `back label ${sizeKey}`],
          },
        );
      };

      if (productName.includes('5l') || productName.includes('5 l') || productName.includes('5 liter')) {
        addBottlePackaging('5l');
      } else if (productName.includes('1l') || productName.includes('1 l') || productName.includes('1 liter')) {
        addBottlePackaging('1l');
      } else if (productName.includes('500ml') || productName.includes('500 ml')) {
        addBottlePackaging('500ml');
      } else if (/\b200\D*ml\b/.test(productName)) {
        addBottlePackaging('200ml');
      }
      
      // Additional packaging for canteen delivery only
      if (saleType === 'canteen') {
        // Canteen orders need cardboard box (1 per order)
        packagingRequirements.push({
          quantity: 1,
          description: 'Cardboard Boxes',
          inventoryIdHints: ['pack_carton_box'],
          inventoryNameHints: ['cardboard box', 'carton box'],
          rawMaterialNameHints: ['cardboard box', 'carton box'],
        });
        
        // For packing tape: Check how many canteen orders exist and deduct tape every 4 orders
        try {
          const [canteenOrderCount] = await connection.query(
            'SELECT COUNT(*) as count FROM sales WHERE sale_type = "canteen"'
          );
          const totalCanteenOrders = canteenOrderCount[0].count + 1; // +1 for current order
          
          // Check if this order completes a group of 4 (every 4th order needs 1 tape)
          if (totalCanteenOrders % 4 === 0) {
            packagingRequirements.push({
              quantity: 1,
              description: 'Packing Tape',
              inventoryIdHints: ['pack_packing_tape'],
              inventoryNameHints: ['packaging tape', 'packing tape'],
              rawMaterialNameHints: ['packaging tape', 'packing tape'],
            });
          }
        } catch (error) {
          console.log('Could not check canteen order count for tape calculation:', error instanceof Error ? error.message : error);
        }
      }
    }
    
    const buildLike = (hints?: string[]) => (hints || []).map((h) => `%${String(h).toLowerCase()}%`);

    // Deduct packaging materials from inventory / raw materials
    for (const pkg of packagingRequirements) {
      let updatedAny = false;

      // 1) Prefer exact id hints where available.
      if (pkg.inventoryIdHints && pkg.inventoryIdHints.length > 0) {
        if (pkg.inventoryIdHints.length === 1) {
          const [r] = await connection.execute(
            `UPDATE inventory
             SET quantity = GREATEST(0, quantity - ?), updated_at = NOW()
             WHERE product_id = ?`,
            [pkg.quantity, pkg.inventoryIdHints[0]],
          );
          const affected = Number((r as any)?.affectedRows ?? 0);
          if (affected > 0) updatedAny = true;
        } else {
          // Multiple candidate IDs (e.g. colored flip-top caps): deduct from the row with the highest available stock.
          const idPlaceholders = pkg.inventoryIdHints.map(() => '?').join(',');
          const [candidates]: any = await connection.execute(
            `SELECT id, quantity
             FROM inventory
             WHERE product_id IN (${idPlaceholders})
             ORDER BY quantity DESC
             LIMIT 1`,
            [...pkg.inventoryIdHints],
          );
          if (Array.isArray(candidates) && candidates.length > 0) {
            const targetInvId = candidates[0].id;
            const [r] = await connection.execute(
              `UPDATE inventory
               SET quantity = GREATEST(0, quantity - ?), updated_at = NOW()
               WHERE id = ?`,
              [pkg.quantity, targetInvId],
            );
            const affected = Number((r as any)?.affectedRows ?? 0);
            if (affected > 0) updatedAny = true;
          }
        }
      }

      // 2) Fallback by packaging product names (lowercase contains hints).
      if (!updatedAny) {
        const likeHints = buildLike(pkg.inventoryNameHints);
        if (likeHints.length > 0) {
          const ors = likeHints.map(() => 'LOWER(p.name) LIKE ?').join(' OR ');
          const [r] = await connection.execute(
            `UPDATE inventory i
             JOIN products p ON p.id = i.product_id
             SET i.quantity = GREATEST(0, i.quantity - ?), i.updated_at = NOW()
             WHERE (${ors})`,
            [pkg.quantity, ...likeHints],
          );
          const affected = Number((r as any)?.affectedRows ?? 0);
          if (affected > 0) updatedAny = true;
        }
      }

      // 3) Also attempt raw_materials (if used in this DB).
      try {
        const likeHints = buildLike(pkg.rawMaterialNameHints);
        if (likeHints.length > 0) {
          const ors = likeHints.map(() => 'LOWER(name) LIKE ?').join(' OR ');
          const [r] = await connection.execute(
            `UPDATE raw_materials
             SET current_stock = GREATEST(0, current_stock - ?), updated_at = NOW()
             WHERE category = 'packaging' AND (${ors})`,
            [pkg.quantity, ...likeHints],
          );
          const affected = Number((r as any)?.affectedRows ?? 0);
          if (affected > 0) updatedAny = true;
        }
      } catch (error) {
        // raw_materials may not exist on some installs
        console.log('[sales] raw_materials update skipped:', error instanceof Error ? error.message : error);
      }

      if (!updatedAny) {
        console.warn(`[sales] Packaging stock not matched for "${pkg.description}" (product ${productId}).`);
      }
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

    // Optional reference PDF attachment fields (from canteen POS / courier bills)
    let referencePdfPathField = ', NULL as referencePdfPath';
    let referencePdfOriginalNameField = ', NULL as referencePdfOriginalName';
    try {
      const [rCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "reference_pdf_path"');
      if (Array.isArray(rCols) && rCols.length > 0) {
        referencePdfPathField = ', s.reference_pdf_path as referencePdfPath';
      }
    } catch (_) {}

    try {
      const [oCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "reference_pdf_original_name"');
      if (Array.isArray(oCols) && oCols.length > 0) {
        referencePdfOriginalNameField = ', s.reference_pdf_original_name as referencePdfOriginalName';
      }
    } catch (_) {}

    let query = `SELECT s.id, s.invoice_number as invoiceNumber, s.sale_type as saleType, s.subtotal, s.gst_amount as gstAmount, s.total_amount as totalAmount,
                        s.payment_method as paymentMethod, s.payment_status as paymentStatus, s.shipment_status as shipmentStatus, s.notes${poNumberField}${poDateField}${invoiceDateField}${modeOfSalesField}${keptOnDisplayField}${courierField}${mailSentField}${referencePdfPathField}${referencePdfOriginalNameField}, s.created_at as createdAt,
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

// Function to generate auto invoice number with 4 digits and financial year (e.g. C0001/2024-25)
async function generateInvoiceNumber(
  connection: any,
  saleType: string,
  customInvoiceNumber: string | undefined,
  referenceDate: Date
) {
  const fySuffix = getInvoiceFinancialYearSuffix(referenceDate);

  if (customInvoiceNumber && customInvoiceNumber.trim() !== '') {
    let formattedNumber = customInvoiceNumber.trim();
    
    // If user just entered a number like "56", format it properly with sale type prefix (4 digits)
    if (/^\d+$/.test(formattedNumber)) {
      const paddedNumber = formattedNumber.padStart(4, '0');
      const prefix = saleType === 'canteen' ? 'C' : 'R';
      formattedNumber = `${prefix}${paddedNumber}/${fySuffix}`;
    }
    
    // Validate: C0001/2024-25 or legacy C0001/2026
    if (!INVOICE_NUMBER_FULL_REGEX.test(formattedNumber)) {
      const expectedPrefix = saleType === 'canteen' ? 'C' : 'R';
      throw new Error(`Invoice number must be in format: ${expectedPrefix}0001/${fySuffix} or just enter: 1`);
    }
    
    // Check if the prefix matches the sale type
    const prefix = formattedNumber.charAt(0);
    const expectedPrefix = saleType === 'canteen' ? 'C' : 'R';
    if (prefix !== expectedPrefix) {
      throw new Error(`${saleType === 'canteen' ? 'Canteen' : 'Retail'} sales must use ${expectedPrefix} prefix`);
    }
    
    // Check if custom invoice number already exists
    const [existing] = await connection.query(
      'SELECT id, invoice_number as invoiceNumber, po_number as poNumber, created_at as createdAt FROM sales WHERE invoice_number = ?',
      [formattedNumber]
    );
    
    if (existing.length > 0) {
      const row = existing[0] as any;
      const dt = row?.createdAt ? new Date(row.createdAt).toISOString().slice(0, 10) : 'unknown date';
      const po = row?.poNumber ? String(row.poNumber) : 'N/A';
      throw new Error(
        `Invoice number already exists. Existing entry: Invoice ${row?.invoiceNumber || formattedNumber}, PO ${po}, Date ${dt}.`
      );
    }
    
    return formattedNumber;
  }
  
  // Auto-generate invoice number with separate sequences per financial year (4 digits)
  const prefix = saleType === 'canteen' ? 'C' : 'R';
  
  // Get the highest invoice number for this FY and sale type
  const [rows] = await connection.query(
    'SELECT invoice_number FROM sales WHERE invoice_number LIKE ? ORDER BY invoice_number DESC LIMIT 1',
    [`${prefix}%/${fySuffix}`]
  );
  
  let nextNumber = 1;
  if (rows.length > 0) {
    const lastInvoice = rows[0].invoice_number;
    const numberPart = lastInvoice.split('/')[0].substring(1); // Remove prefix
    nextNumber = parseInt(numberPart, 10) + 1;
  }
  
  // Format as 4 digits with leading zeros (e.g. C0001/2024-25)
  const paddedNumber = nextNumber.toString().padStart(4, '0');
  return `${prefix}${paddedNumber}/${fySuffix}`;
}

const CASTOR_200ML_NEW_BASE_PRICE = 76.19; // GST-EXCLUSIVE price for new code (GST extra)

/**
 * Deduct quantity from inventory.
 * 1) Find row by product_id. For Castor (55336/68539), also look for product_id 'castor-200ml' and pick row with most stock.
 * 2) If found: UPDATE by id. If not: INSERT row then UPDATE by id.
 */
async function deductInventory(
  connection: any,
  productId: string,
  quantity: number,
  productName?: string | null,
  productUnit?: string | null
): Promise<void> {
  const pid = String(productId).trim();
  const isCastor = isCastor200mlProduct({ name: productName ?? '', unit: productUnit ?? '' }, pid);
  const lookupIds = isCastor ? Array.from(new Set([...CASTOR_200ML_LOOKUP_IDS, pid])) : [pid];

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
      referencePdfPath = null,
      referencePdfOriginalName = null,
      gstMode,
    } = body;

    const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

    if (!['retail', 'canteen'].includes(String(saleType))) {
      return NextResponse.json({ error: 'Invalid sale type' }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }

    const poNumberRaw = typeof poNumber === 'string' ? poNumber.trim() : '';
    if (!poNumberRaw) {
      return NextResponse.json({ error: 'PO Number is required' }, { status: 400 });
    }
    const poNumberMatch = poNumberRaw.match(/^PO-(\d{1,10})\s*\/\s*(\d{2}-\d{2})$/);
    if (!poNumberMatch) {
      return NextResponse.json({ error: 'PO Number must be in format PO-<number> / <yy-yy>' }, { status: 400 });
    }

    const poDateRaw = typeof poDate === 'string' ? poDate.trim() : '';
    if (!poDateRaw || !isValidDate(poDateRaw)) {
      return NextResponse.json({ error: 'PO Date must be a valid date (YYYY-MM-DD)' }, { status: 400 });
    }

    const invoiceDateRaw = typeof invoiceDate === 'string' ? invoiceDate.trim() : '';
    if (invoiceDateRaw && !isValidDate(invoiceDateRaw)) {
      return NextResponse.json({ error: 'Invoice Date must be a valid date (YYYY-MM-DD)' }, { status: 400 });
    }

    // Set default values for canteen sales
    let finalPaymentStatus = paymentStatus;
    let finalShipmentStatus = shipmentStatus;
    
    if (saleType === 'canteen') {
      if (!canteenAddressId || !String(canteenAddressId).trim()) {
        return NextResponse.json({ error: 'Canteen address is required for canteen sales' }, { status: 400 });
      }

      finalPaymentStatus = 'pending'; // Default to pending for canteen
      finalShipmentStatus = 'pending'; // Default to pending for canteen orders
      
      const mode = String(modeOfSales || '').toLowerCase();
      const isEmailMode = mode === 'email' || mode.startsWith('email:');
      const emailRaw = String(customerEmail || '').trim();
      // Receiving person email is optional for canteen orders.
      // Validate only if user provided an email.
      if (isEmailMode && emailRaw && !isValidEmail(emailRaw)) {
        return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
      }
    }

    const connection = await createConnection();
    try {
      await connection.beginTransaction();

    // Fetch product prices to ensure server-trusted pricing
    const productIds = items.map((i: any) => i.productId);
    const [products] = await connection.query(
      `SELECT id, name, unit, base_price as basePrice, retail_price as retailPrice, gst_rate as gstRate FROM products WHERE id IN (${productIds.map(() => '?').join(',')})`,
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

    let supplyTotalLiters = 0;
    let supplyTotalBottles = 0;
    let supplyTotalTinsLegacy = 0;

    const preparedItems = items.map((i: any) => {
      const prod = idToProduct[i.productId];
      const quantity = Number(i.quantity);

      const productGstRate = prod && prod.gstRate != null ? Number(prod.gstRate) : 5.0;
      let unitPrice: number;
      let lineGstAmount: number;
      let lineBase: number;

      const isCastorNew = String(i.productId).trim() === CASTOR_200ML_NEW_ID;

      // Supply metrics (bottles / liters / tins)
      // Use BOTH product name and unit (e.g. unit='200ml') so it still works even if name doesn't include size.
      const productName = prod?.name ? String(prod.name) : '';
      const productUnit = prod?.unit ? String(prod.unit) : '';
      const packLiters = packLitersPerUnit(productName, productUnit, String(i.productId));
      const isBottle = packLiters !== null && packLiters > 0 && packLiters < 5;
      const isTin = packLiters !== null && packLiters >= 5;
      if (packLiters !== null) {
        supplyTotalLiters += packLiters * quantity;
        if (isBottle) supplyTotalBottles += quantity;
        if (isTin) supplyTotalTinsLegacy += quantity;
      }

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
          inventoryProductName: productName,
          inventoryProductUnit: productUnit,
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
          inventoryProductName: productName,
          inventoryProductUnit: productUnit,
        };
      }
    });

    const totalAmount = Number((subtotal + gstAmount).toFixed(2));
    const totalLitersSupply = Number(supplyTotalLiters.toFixed(2));
    const totalBottlesSupply = Number(supplyTotalBottles.toFixed(2));
    const totalTinsSupply = Number((totalLitersSupply / CANTEEN_LITERS_PER_TIN).toFixed(2)); // 15.2 L usable = 1 tin (0.8 L wastage vs 16 L nominal)

    // Invoice date drives financial year on the invoice (e.g. Feb 2025 → FY 2024-25)
    let invoiceDateValue: string | null = typeof invoiceDate === 'string' && invoiceDate.trim() ? invoiceDate.trim() : null;
    if (!invoiceDateValue) {
      invoiceDateValue = new Date().toISOString().slice(0, 10);
    }
    const referenceDateForInvoice = new Date(`${invoiceDateValue}T12:00:00`);

    const saleId = `sale-${Date.now()}`;
    const invoiceNumber = await generateInvoiceNumber(connection, saleType, customInvoiceNumber, referenceDateForInvoice);

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
    // supply totals (canteen only)
    try {
      const [sCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "total_bottles"');
      const [lCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "total_liters"');
      const [tCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "total_tins"');
      const hasTotals =
        Array.isArray(sCols) && sCols.length > 0 &&
        Array.isArray(lCols) && lCols.length > 0 &&
        Array.isArray(tCols) && tCols.length > 0;
      if (hasTotals) {
        insertFields += ', total_bottles, total_liters, total_tins';
        if (saleType === 'canteen') {
          insertValues.push(totalBottlesSupply, totalLitersSupply, totalTinsSupply);
        } else {
          insertValues.push(null, null, null);
        }
        insertPlaceholders += ', ?, ?, ?';
      }
    } catch (_) {}
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

    // Optional reference PDF attachment from canteen POS
    try {
      const [pCols] = await connection.query('SHOW COLUMNS FROM sales LIKE "reference_pdf_path"');
      const hasRefPdf =
        Array.isArray(pCols) && pCols.length > 0;
      if (hasRefPdf) {
        insertFields += ', reference_pdf_path, reference_pdf_original_name';
        insertValues.push(referencePdfPath, referencePdfOriginalName);
        insertPlaceholders += ', ?, ?';
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

      await deductInventory(connection, it.productId, it.quantity, it.inventoryProductName, it.inventoryProductUnit);

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
    const message = error instanceof Error ? error.message : 'Internal server error';

    if (message.includes('Invoice number already exists')) {
      return NextResponse.json(
        { error: message },
        { status: 409 }
      );
    }

    if (message.toLowerCase().includes('duplicate entry') && message.toLowerCase().includes('invoice_number')) {
      return NextResponse.json(
        { error: 'Invoice number already exists. Please use a different invoice number.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


