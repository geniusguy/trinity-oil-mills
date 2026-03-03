import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Define sample rows
  const rows = [
    {
      'Canteen Name': 'Sample Canteen',
      'Billing Address': '123 Billing Street, T. Nagar',
      'Billing City': 'Chennai',
      'Billing State': 'Tamil Nadu',
      'Billing Pincode': '600017',
      'GST Number': '33AAAGT0316F1ZT',
      'Delivery Address': '45 Delivery Road, T. Nagar',
      'Delivery City': 'Chennai',
      'Delivery State': 'Tamil Nadu',
      'Delivery Pincode': '600017',
      'Receiving Person Name': 'Raman Kumar',
      'Receiving Person Mobile': '9876543210',
      'Active? (Yes/No)': 'Yes',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'CanteenAddresses');

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

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

