import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

// GET /api/canteen-addresses
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await createConnection();

    const [rows] = await connection.query(`
      SELECT 
        id,
        name as canteenName,
        address,
        city,
        state,
        pincode,
        address as billingAddress,
        city as billingCity,
        state as billingState,
        pincode as billingPincode,
        contact_person as contactPerson,
        phone as mobileNumber,
        email as gstNumber,
        is_active as isActive,
        created_at as createdAt,
        updated_at as updatedAt
      FROM canteen_addresses 
      WHERE is_active = true
      ORDER BY name
    `);

    await connection.end();
    return NextResponse.json({ addresses: rows }, { status: 200 });
  } catch (error) {
    console.error('Canteen addresses GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/canteen-addresses
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      canteenName,
      billingAddress,
      billingCity,
      billingState = 'Tamil Nadu',
      billingPincode,
      billingGstNumber,
      billingContactPerson,
      billingMobile,
      billingEmail,
      deliveryAddress,
      deliveryCity,
      deliveryState = 'Tamil Nadu',
      deliveryPincode,
      receivingPersonName,
      receivingPersonMobile,
      receivingPersonEmail,
      receivingPersonDesignation,
      isActive = true
    } = body;

    // Validate required fields as per user requirements
    if (!canteenName || !canteenName.trim()) {
      return NextResponse.json({ error: 'Canteen name is required' }, { status: 400 });
    }
    if (!deliveryAddress || !deliveryAddress.trim()) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }
    if (!deliveryCity || !deliveryCity.trim()) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 });
    }
    if (!deliveryPincode || !deliveryPincode.trim()) {
      return NextResponse.json({ error: 'Pincode is required' }, { status: 400 });
    }
    if (!receivingPersonName || !receivingPersonName.trim()) {
      return NextResponse.json({ error: 'Contact person is required' }, { status: 400 });
    }
    if (!receivingPersonMobile || !receivingPersonMobile.trim()) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 });
    }

    // Validate mobile number format
    const mobileRegex = /^[6-9]\d{9}$/;
    if (!mobileRegex.test(receivingPersonMobile.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit mobile number' }, { status: 400 });
    }

    // Validate pincode format
    const pincodeRegex = /^\d{6}$/;
    if (!pincodeRegex.test(deliveryPincode.replace(/\s/g, ''))) {
      return NextResponse.json({ error: 'Please enter a valid 6-digit pincode' }, { status: 400 });
    }

    const connection = await createConnection();

    const addressId = `addr-${Date.now()}`;

    await connection.execute(`
      INSERT INTO canteen_addresses (
        id, name, address, city, state, pincode,
        contact_person, phone, email, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      addressId,
      canteenName,
      deliveryAddress, // Use delivery address as main address
      deliveryCity,
      deliveryState,
      deliveryPincode,
      receivingPersonName, // Use receiving person as main contact
      receivingPersonMobile,
      billingGstNumber,
      isActive
    ]);

    await connection.end();
    return NextResponse.json({ 
      message: 'Canteen address created successfully',
      addressId 
    }, { status: 201 });
  } catch (error) {
    console.error('Canteen addresses POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}