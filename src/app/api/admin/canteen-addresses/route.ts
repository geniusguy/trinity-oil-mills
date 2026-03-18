import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';

// GET - Fetch all canteen addresses
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const connection = await createConnection();

    const [addresses] = await connection.query(`
      SELECT 
        id,
        canteen_name    AS canteen_name,
        address,
        city,
        state,
        pincode,
        billing_address AS billing_address,
        billing_city    AS billing_city,
        billing_state   AS billing_state,
        billing_pincode AS billing_pincode,
        billing_contact_person AS billing_contact_person,
        billing_email   AS billing_email,
        billing_mobile  AS billing_mobile,
        delivery_email  AS delivery_email,
        contact_person,
        mobile_number   AS mobile_number,
        gst_number      AS gst_number,
        is_active,
        created_at,
        updated_at
      FROM canteen_addresses 
      ORDER BY canteen_name
    `);

    await connection.end();

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error('Error fetching canteen addresses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canteen addresses' },
      { status: 500 }
    );
  }
}

// POST - Create new canteen address
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const {
      canteenName,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      deliveryPincode,
      receivingPersonName,
      receivingPersonMobile,
      receivingPersonEmail,
      billingAddress,
      billingCity,
      billingState,
      billingPincode,
      billingGstNumber,
      billingContactPerson,
      billingEmail,
      billingMobile,
      isActive = true
    } = await request.json();

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

    // Generate ID
    const id = `canteen-${Date.now()}`;

    await connection.execute(
      `
      INSERT INTO canteen_addresses 
      (id, canteen_name, address, city, state, pincode,
       billing_address, billing_city, billing_state, billing_pincode,
       billing_contact_person, billing_email, billing_mobile,
       contact_person, mobile_number, gst_number, delivery_email,
       is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?, ?, ?,
              ?, NOW(), NOW())
    `,
      [
        id,
        canteenName,
        deliveryAddress,
        deliveryCity,
        deliveryState || 'Tamil Nadu',
        deliveryPincode,
        billingAddress ?? deliveryAddress,
        billingCity ?? deliveryCity,
        billingState ?? (deliveryState || 'Tamil Nadu'),
        billingPincode ?? deliveryPincode,
        billingContactPerson ?? null,
        billingEmail ?? null,
        billingMobile ?? null,
        receivingPersonName,
        receivingPersonMobile,
        billingGstNumber || null,
        receivingPersonEmail ?? null,
        isActive,
      ],
    );

    await connection.end();

    return NextResponse.json(
      { message: 'Canteen address created successfully', id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating canteen address:', error);
    return NextResponse.json(
      { error: 'Failed to create canteen address' },
      { status: 500 }
    );
  }
}

