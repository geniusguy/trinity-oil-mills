import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';

// GET /api/canteen-addresses
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const connection = await createConnection();

    const [rows] = await connection.query(`
      SELECT 
        id,
        canteen_name              AS canteenName,
        address,
        city,
        state,
        pincode,
        COALESCE(billing_address, address)  AS billingAddress,
        COALESCE(billing_city,   city)      AS billingCity,
        COALESCE(billing_state,  state)     AS billingState,
        COALESCE(billing_pincode,pincode)   AS billingPincode,
        billing_contact_person   AS billingContactPerson,
        billing_email            AS billingEmail,
        billing_mobile           AS billingMobile,
        delivery_email           AS deliveryEmail,
        contact_person            AS contactPerson,
        mobile_number             AS mobileNumber,
        gst_number                AS gstNumber,
        is_active                 AS isActive,
        created_at                AS createdAt,
        updated_at                AS UpdatedAt
      FROM canteen_addresses 
      WHERE is_active = true
      ORDER BY canteen_name
    `);

    await connection.end();
    return NextResponse.json({ addresses: rows }, { status: 200 });
  } catch (error) {
    console.error('Canteen addresses GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', { message: errorMessage });
    console.error('DATABASE_URL available:', !!process.env.DATABASE_URL);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

// POST /api/canteen-addresses
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      canteenName,
      // Billing info (optional; fall back to delivery when empty)
      billingAddress,
      billingCity,
      billingState = 'Tamil Nadu',
      billingPincode,
      billingGstNumber,
      // Currently unused extra billing fields:
      // billingContactPerson,
      // billingMobile,
      // billingEmail,
      // Delivery info (required)
      deliveryAddress,
      deliveryCity,
      deliveryState = 'Tamil Nadu',
      deliveryPincode,
      // Receiving person (required)
      receivingPersonName,
      receivingPersonMobile,
      // receivingPersonEmail,
      // receivingPersonDesignation,
      isActive = true,
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

    // Persist delivery and billing addresses separately.
    // If billing fields are not provided, fall back to delivery.
    await connection.execute(
      `
      INSERT INTO canteen_addresses (
        id,
        canteen_name,
        address,
        city,
        state,
        pincode,
        billing_address,
        billing_city,
        billing_state,
        billing_pincode,
        contact_person,
        mobile_number,
        gst_number,
        is_active,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
      [
        addressId,
        canteenName,
        deliveryAddress,
        deliveryCity,
        deliveryState,
        deliveryPincode,
        billingAddress ?? deliveryAddress,
        billingCity ?? deliveryCity,
        billingState ?? deliveryState,
        billingPincode ?? deliveryPincode,
        receivingPersonName,
        receivingPersonMobile,
        billingGstNumber ?? null,
        isActive,
      ],
    );

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