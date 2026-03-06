import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import ExcelJS from 'exceljs';

type Row = {
  'Canteen Name': string;
  'Billing Address': string;
  'Billing City': string;
  'Billing State': string;
  'Billing Pincode': string;
  'GST Number': string;
  'Delivery Address': string;
  'Delivery City': string;
  'Delivery State': string;
  'Delivery Pincode': string;
  'Receiving Person Name': string;
  'Receiving Person Mobile': string;
  'Active? (Yes/No)': string;
};

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !['admin', 'retail_staff'].includes(session.user.role || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.worksheets[0];

    const headerRow = worksheet.getRow(1);
    const headerMap: Record<string, number> = {};
    headerRow.eachCell((cell, colNumber) => {
      const header = String(cell.value || '').trim();
      if (header) {
        headerMap[header] = colNumber;
      }
    });

    const rows: Row[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // skip header
      const get = (header: keyof Row): string => {
        const col = headerMap[header as string];
        if (!col) return '';
        const cell = row.getCell(col);
        const v = cell.value;
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && 'text' in (v as any)) return String((v as any).text ?? '');
        return String(v);
      };

      const rowObj: Row = {
        'Canteen Name': get('Canteen Name'),
        'Billing Address': get('Billing Address'),
        'Billing City': get('Billing City'),
        'Billing State': get('Billing State'),
        'Billing Pincode': get('Billing Pincode'),
        'GST Number': get('GST Number'),
        'Delivery Address': get('Delivery Address'),
        'Delivery City': get('Delivery City'),
        'Delivery State': get('Delivery State'),
        'Delivery Pincode': get('Delivery Pincode'),
        'Receiving Person Name': get('Receiving Person Name'),
        'Receiving Person Mobile': get('Receiving Person Mobile'),
        'Active? (Yes/No)': get('Active? (Yes/No)'),
      };

      // Skip completely empty rows
      const hasAnyValue = Object.values(rowObj).some((v) => v && v.toString().trim() !== '');
      if (hasAnyValue) {
        rows.push(rowObj);
      }
    });

    if (!rows.length) {
      return NextResponse.json({ error: 'No rows found in Excel file' }, { status: 400 });
    }

    const connection = await createConnection();

    try {
      let created = 0;
      const now = Date.now();
      const skipped: { rowIndex: number; reason: string }[] = [];

      // Load existing canteens to detect duplicates by Canteen Name
      const [existingRows] = await connection.query(
        'SELECT canteen_name FROM canteen_addresses',
      );
      const existingKeys = new Set<string>();
      (existingRows as any[]).forEach((r) => {
        const name = (r.canteen_name || '').toString().toLowerCase().trim();
        if (name) existingKeys.add(name);
      });
      const batchKeys = new Set<string>();

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const excelRowNumber = i + 2; // +2 because Excel header is row 1

        const canteenName = row['Canteen Name']?.toString().trim();
        const deliveryAddress = row['Delivery Address']?.toString().trim();
        const deliveryCity = row['Delivery City']?.toString().trim();
        const deliveryState = row['Delivery State']?.toString().trim() || 'Tamil Nadu';
        const deliveryPincode = row['Delivery Pincode']?.toString().trim();
        const receivingPersonName = row['Receiving Person Name']?.toString().trim();

        // Normalize mobile number:
        // - Accept cases like "9876543210 / 9123456789" by taking the first part
        // - Keep only digits
        // - Trim to max 15 characters (DB column is varchar(15))
        const rawMobile = row['Receiving Person Mobile']?.toString().trim() || '';
        const firstPart = rawMobile.split('/')[0] || rawMobile;
        const digitsOnly = firstPart.replace(/\D+/g, '');
        const receivingPersonMobile = digitsOnly.slice(-15); // keep last 15 digits (handles +91 prefixes etc.)

        const missingFields: string[] = [];
        if (!canteenName) missingFields.push('Canteen Name');
        if (!deliveryAddress) missingFields.push('Delivery Address');
        if (!deliveryCity) missingFields.push('Delivery City');
        if (!deliveryPincode) missingFields.push('Delivery Pincode');
        if (!receivingPersonName) missingFields.push('Receiving Person Name');
        if (!receivingPersonMobile) missingFields.push('Receiving Person Mobile');

        if (missingFields.length > 0) {
          skipped.push({
            rowIndex: excelRowNumber,
            reason: `Missing required fields: ${missingFields.join(', ')}`,
          });
          continue;
        }

        // Duplicate detection: same Canteen Name (case-insensitive)
        // We silently skip duplicates (do NOT report as error rows)
        const dupKey = canteenName.toLowerCase();
        if (existingKeys.has(dupKey)) {
          // Already in DB – skip without adding to error report
          continue;
        }
        if (batchKeys.has(dupKey)) {
          // Repeated in the same Excel – skip without adding to error report
          continue;
        }
        batchKeys.add(dupKey);

        const billingAddress = row['Billing Address']?.toString().trim() || deliveryAddress;
        const billingCity = row['Billing City']?.toString().trim() || deliveryCity;
        const billingStateValue =
          row['Billing State']?.toString().trim() || deliveryState || 'Tamil Nadu';
        const billingPincode =
          row['Billing Pincode']?.toString().trim() || deliveryPincode;
        const billingGstNumber = row['GST Number']?.toString().trim() || null;

        const activeCell = row['Active? (Yes/No)']?.toString().trim().toLowerCase();
        const isActive =
          activeCell === 'yes' || activeCell === 'y' || activeCell === 'true' || activeCell === '1';

        const id = `canteen-${now}-${i}`;

        await connection.execute(
          `
          INSERT INTO canteen_addresses 
          (id, canteen_name, address, city, state, pincode,
           billing_address, billing_city, billing_state, billing_pincode,
           contact_person, mobile_number, gst_number, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?,
                  ?, ?, ?, ?,
                  ?, ?, ?, ?, NOW(), NOW())
        `,
          [
            id,
            canteenName,
            deliveryAddress,
            deliveryCity,
            deliveryState,
            deliveryPincode,
            billingAddress,
            billingCity,
            billingStateValue,
            billingPincode,
            receivingPersonName,
            receivingPersonMobile,
            billingGstNumber,
            isActive,
          ],
        );

        created += 1;
      }

      await connection.end();

      const skippedSummary =
        skipped.length === 0
          ? 'No rows skipped.'
          : `Skipped rows: ${skipped
              .map((s) => `${s.rowIndex} (${s.reason})`)
              .join('; ')}`;

      return NextResponse.json(
        {
          message: `Bulk upload completed. ${skippedSummary}`,
          totalRows: rows.length,
          created,
          skippedRows: skipped,
        },
        { status: 200 },
      );
    } catch (err) {
      await connection.end();
      throw err;
    }
  } catch (error) {
    console.error('Bulk canteen upload error:', error);
    return NextResponse.json(
      { error: 'Failed to process bulk upload' },
      { status: 500 },
    );
  }
}

