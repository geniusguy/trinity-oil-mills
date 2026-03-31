import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || !['admin', 'accountant', 'retail_staff'].includes(session.user.role || '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const saleIds = Array.isArray(body?.saleIds) ? body.saleIds.map((v: unknown) => String(v).trim()).filter(Boolean) : [];
    const groupBy = String(body?.groupBy || 'none').toLowerCase();
    if (saleIds.length === 0) {
      return NextResponse.json({ error: 'No invoices selected' }, { status: 400 });
    }
    if (saleIds.length > 500) {
      return NextResponse.json({ error: 'Too many invoices selected (max 500)' }, { status: 400 });
    }
    if (!['none', 'month', 'quarter', 'year'].includes(groupBy)) {
      return NextResponse.json({ error: 'Invalid groupBy option' }, { status: 400 });
    }

    const connection = await createConnection();
    let sales: any[] = [];
    try {
      const placeholders = saleIds.map(() => '?').join(',');
      const [rows]: any = await connection.query(
        `SELECT id,
                invoice_number as invoiceNumber,
                invoice_date as invoiceDate,
                created_at as createdAt
         FROM sales
         WHERE id IN (${placeholders})
         ORDER BY created_at DESC`,
        saleIds,
      );
      sales = Array.isArray(rows) ? rows : [];
    } finally {
      await connection.end();
    }

    if (sales.length === 0) {
      return NextResponse.json({ error: 'Selected invoices not found' }, { status: 404 });
    }

    const origin = request.nextUrl.origin;
    const zip = new JSZip();
    let addedCount = 0;

    // Prefer converting the NEW HTML invoice into PDF, not the legacy jsPDF template.
    // We use Playwright to render the HTML route and print to PDF.
    let chromium: any = null;
    try {
      ({ chromium } = await import('playwright'));
    } catch (e) {
      chromium = null;
    }

    let browser: any = null;
    let page: any = null;
    if (chromium) {
      try {
        browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
        page = await browser.newPage();
        page.setDefaultTimeout(60_000);
      } catch (e) {
        console.error('Bulk invoice download: Playwright launch failed:', e);
        return NextResponse.json(
          {
            error:
              'Bulk HTML invoice PDF requires Playwright Chromium. Run: npx playwright install chromium',
          },
          { status: 500 },
        );
      }
    } else {
      return NextResponse.json(
        {
          error:
            'Playwright dependency not available for bulk HTML invoice PDF generation.',
        },
        { status: 500 },
      );
    }

    try {
      for (const sale of sales) {
        const saleId = String(sale.id || '').trim();
        if (!saleId) continue;

        const invoiceNumber = String(sale.invoiceNumber || saleId).replace(/[\\/:*?"<>|]/g, '_');
        const date = new Date(String(sale.invoiceDate || sale.createdAt || ''));
        const yyyy = Number.isNaN(date.getTime()) ? 'unknown-year' : String(date.getFullYear());
        const mmNum = Number.isNaN(date.getTime()) ? 0 : date.getMonth() + 1;
        const mm = mmNum > 0 ? String(mmNum).padStart(2, '0') : '00';
        const quarter = mmNum <= 3 ? 'Q1' : mmNum <= 6 ? 'Q2' : mmNum <= 9 ? 'Q3' : 'Q4';

        let filePath = `${invoiceNumber}.pdf`;
        if (groupBy === 'month') {
          filePath = `${yyyy}-${mm}/${invoiceNumber}.pdf`;
        } else if (groupBy === 'quarter') {
          filePath = `${yyyy}-${quarter}/${invoiceNumber}.pdf`;
        } else if (groupBy === 'year') {
          filePath = `${yyyy}/${invoiceNumber}.pdf`;
        }

        const htmlUrl = `${origin}/api/sales/${encodeURIComponent(saleId)}/invoice/html`;
        await page.goto(htmlUrl, { waitUntil: 'networkidle' });
        const pdfBuf = Buffer.from(
          await page.pdf({
            format: 'A4',
            printBackground: true,
          }),
        );

        zip.file(filePath, pdfBuf);
        addedCount += 1;
      }
    } finally {
      if (browser) {
        try {
          await browser.close();
        } catch (_) {}
      }
    }

    if (addedCount === 0) {
      return NextResponse.json({ error: 'Could not generate any invoice PDFs' }, { status: 500 });
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const fileName = `invoices-bulk-${new Date().toISOString().slice(0, 10)}.zip`;

    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(zipBuffer.length),
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Bulk invoice download error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

