import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { createConnection } from '@/lib/database';
import { resolveDynamicRouteId } from '@/lib/saleRouteLookup';
import { sendInvoicePdfEmail } from '@/lib/email';

export const runtime = 'nodejs';

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const routeId = await resolveDynamicRouteId(params);
    if (!routeId) {
      return NextResponse.json({ error: 'Invalid sale id' }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const toEmail = String(body?.toEmail || '').trim();
    if (!toEmail || !isValidEmail(toEmail)) {
      return NextResponse.json({ error: 'Valid toEmail is required' }, { status: 400 });
    }

    const connection = await createConnection();
    try {
      const [rows]: any = await connection.query(
        `SELECT id, invoice_number as invoiceNumber, sale_type as saleType
         FROM sales
         WHERE id = ?
         LIMIT 1`,
        [routeId]
      );
      const sale = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (!sale) return NextResponse.json({ error: 'Sale not found' }, { status: 404 });

      // Build base URL from the *incoming request* so we always hit the correct port.
      const host = request.headers.get('host') || 'localhost:3001';
      const forwardedProto = request.headers.get('x-forwarded-proto');
      const proto =
        forwardedProto ||
        (String(host).startsWith('localhost') || String(host).startsWith('127.0.0.1') ? 'http' : 'https');
      const baseUrl = `${proto}://${host}`;

      // Important: generate PDF from the HTML invoice route (new design).
      // This matches what the user sees on `/invoice/html`.
      const htmlUrl = `${baseUrl}/api/sales/${encodeURIComponent(routeId)}/invoice/html`;

      let pdfBuffer: Buffer | null = null;
      let usedFallback = false;
      let htmlPdfError: string | null = null;

      // Attempt HTML->PDF via Playwright.
      try {
        const playwright = await import('playwright');
        const { chromium } = playwright as unknown as { chromium: any };

        const browser = await chromium.launch({
          headless: true,
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

        try {
          const page = await browser.newPage();
          page.setDefaultTimeout(60_000);
          await page.goto(htmlUrl, { waitUntil: 'networkidle' });
          const pdfBytes = await page.pdf({ format: 'A4', printBackground: true });
          pdfBuffer = Buffer.from(pdfBytes);
        } finally {
          try {
            await browser.close();
          } catch (_) {}
        }
      } catch (e: any) {
        // Typical server-side failure: missing Linux shared libraries for Chromium.
        // Example in your log: `error while loading shared libraries: libatk-1.0.so.0`.
        htmlPdfError = e?.message || String(e);
        console.error('HTML invoice PDF (Playwright) failed:', htmlPdfError);
      }

      // If Playwright failed, fall back to legacy jsPDF endpoint so the email still goes out.
      // (This may produce older PDF formatting until server dependencies are installed.)
      if (!pdfBuffer) {
        usedFallback = true;
        const pdfUrl = `${baseUrl}/api/sales/${encodeURIComponent(routeId)}/invoice/pdf?format=${encodeURIComponent(
          sale.saleType || 'canteen',
        )}`;

        const pdfRes = await fetch(pdfUrl, { cache: 'no-store' });
        if (!pdfRes.ok) {
          return NextResponse.json(
            {
              error: 'Failed to generate invoice PDF',
              details: `HTML->PDF failed (and fallback failed) HTTP ${pdfRes.status}`,
            },
            { status: 500 },
          );
        }

        const ab = await pdfRes.arrayBuffer();
        pdfBuffer = Buffer.from(ab);
      }

      const emailResult = await sendInvoicePdfEmail(
        toEmail,
        String(sale.invoiceNumber || 'invoice'),
        pdfBuffer,
      );

      if (!emailResult?.success) {
        return NextResponse.json(
          { error: 'Failed to send email', details: emailResult?.error || null },
          { status: 500 },
        );
      }

      // Mark mailed-on date (best effort).
      try {
        await connection.execute('UPDATE sales SET mail_sent_ho_date = CURDATE() WHERE id = ?', [routeId]);
      } catch {
        // ignore if column doesn't exist on some DBs
      }

      return NextResponse.json(
        {
          success: true,
          message: usedFallback
            ? 'Email sent (HTML->PDF fallback used)'
            : 'Successfully email sent',
          accepted: emailResult.accepted,
          rejected: emailResult.rejected,
          messageId: emailResult.messageId,
          usedFallback,
          htmlPdfError,
        },
        { status: 200 },
      );

    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Invoice email POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

