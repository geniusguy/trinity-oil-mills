import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Redirect to the HTML invoice for better viewing
    const baseUrl = request.nextUrl.origin;
    const htmlUrl = `${baseUrl}/api/sales/${params.id}/invoice/html`;
    
    return NextResponse.redirect(htmlUrl);

  } catch (error) {
    console.error('Error redirecting to HTML invoice:', error);
    return NextResponse.json({ error: 'Failed to redirect to invoice' }, { status: 500 });
  }
}

