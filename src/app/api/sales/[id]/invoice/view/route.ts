import { NextRequest, NextResponse } from 'next/server';
import { resolveDynamicRouteId } from '@/lib/saleRouteLookup';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const id = await resolveDynamicRouteId(params);
    if (!id) {
      return NextResponse.json({ error: 'Invalid sale id' }, { status: 400 });
    }
    // Redirect to the HTML invoice for better viewing
    const baseUrl = request.nextUrl.origin;
    const htmlUrl = `${baseUrl}/api/sales/${encodeURIComponent(id)}/invoice/html`;
    
    return NextResponse.redirect(htmlUrl);

  } catch (error) {
    console.error('Error redirecting to HTML invoice:', error);
    return NextResponse.json({ error: 'Failed to redirect to invoice' }, { status: 500 });
  }
}

