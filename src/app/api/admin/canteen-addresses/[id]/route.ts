import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import { auth } from '@/lib/auth';

// GET - Fetch single canteen address
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const connection = await createConnection();

    const [addresses] = await connection.query(
      `
      SELECT 
        id,
        canteen_name  AS canteen_name,
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
      WHERE id = ?
    `,
      [id],
    );

    await connection.end();

    if (!addresses || addresses.length === 0) {
      return NextResponse.json(
        { error: 'Canteen address not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ address: addresses[0] });
  } catch (error) {
    console.error('Error fetching canteen address:', error);
    return NextResponse.json(
      { error: 'Failed to fetch canteen address' },
      { status: 500 }
    );
  }
}

// PUT - Update canteen address
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
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
      billingAddress,
      billingCity,
      billingState,
      billingPincode,
      billingGstNumber,
      billingContactPerson,
      billingEmail,
      billingMobile,
      receivingPersonEmail,
      isActive,
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

    await connection.execute(
      `
      UPDATE canteen_addresses 
      SET 
        canteen_name    = ?,
        address         = ?,
        city            = ?,
        state           = ?,
        pincode         = ?,
        billing_address = ?,
        billing_city    = ?,
        billing_state   = ?,
        billing_pincode = ?,
        billing_contact_person = ?,
        billing_email   = ?,
        billing_mobile  = ?,
        delivery_email  = ?,
        contact_person  = ?,
        mobile_number   = ?,
        gst_number      = ?,
        is_active       = ?,
        updated_at      = NOW()
      WHERE id = ?
    `,
      [
        canteenName,
        deliveryAddress,
        deliveryCity,
        deliveryState || 'Tamil Nadu',
        deliveryPincode,
        billingAddress ?? null,
        billingCity ?? null,
        billingState ?? null,
        billingPincode ?? null,
        billingContactPerson ?? null,
        billingEmail ?? null,
        billingMobile ?? null,
        receivingPersonEmail ?? null,
        receivingPersonName,
        receivingPersonMobile,
        billingGstNumber || null,
        isActive !== undefined ? isActive : true,
        id,
      ],
    );

    await connection.end();

    return NextResponse.json(
      { message: 'Canteen address updated successfully' }
    );
  } catch (error) {
    console.error('Error updating canteen address:', error);
    return NextResponse.json(
      { error: 'Failed to update canteen address' },
      { status: 500 }
    );
  }
}

// DELETE - Delete canteen address
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const connection = await createConnection();

    await connection.execute(`
      DELETE FROM canteen_addresses 
      WHERE id = ?
    `, [id]);

    await connection.end();

    return NextResponse.json(
      { message: 'Canteen address deleted successfully' }
    );
  } catch (error) {
    console.error('Error deleting canteen address:', error);
    return NextResponse.json(
      { error: 'Failed to delete canteen address' },
      { status: 500 }
    );
  }
}

