import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Define sample rows
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('CanteenAddresses');

  const headers = [
    'Canteen Name',
    'Billing Address',
    'Billing City',
    'Billing State',
    'Billing Pincode',
    'GST Number',
    'Delivery Address',
    'Delivery City',
    'Delivery State',
    'Delivery Pincode',
    'Receiving Person Name',
    'Receiving Person Mobile',
    'Active? (Yes/No)',
  ];

  worksheet.addRow(headers);
  worksheet.addRow([
    'Sample Canteen',
    '123 Billing Street, T. Nagar',
    'Chennai',
    'Tamil Nadu',
    '600017',
    '33AAAGT0316F1ZT',
    '45 Delivery Road, T. Nagar',
    'Chennai',
    'Tamil Nadu',
    '600017',
    'Raman Kumar',
    '9876543210',
    'Yes',
  ]);

  // Auto-size columns a bit
  worksheet.columns.forEach((col) => {
    if (!col) return;
    let maxLength = 10;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const v = cell.value ? cell.value.toString() : '';
      if (v.length > maxLength) maxLength = v.length;
    });
    col.width = Math.min(Math.max(maxLength + 2, 12), 40);
  });

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition':
        'attachment; filename="canteen-addresses-sample.xlsx"',
    },
  });
}

