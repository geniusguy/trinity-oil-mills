import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function isAllowedUploadPath(p: string) {
  if (!p.startsWith('/uploads/')) return false;
  const lower = p.toLowerCase();
  if (!lower.endsWith('.pdf')) return false;
  return lower.startsWith('/uploads/sales/') || lower.startsWith('/uploads/courier-expenses/');
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const p = String(new URL(request.url).searchParams.get('path') || '').trim();
  if (!p || !isAllowedUploadPath(p)) {
    return NextResponse.json({ error: 'Invalid PDF path' }, { status: 400 });
  }

  try {
    const normalized = p.replace(/^\/+/, '');
    const fullPath = path.join(process.cwd(), 'public', normalized);
    const file = await fs.readFile(fullPath);
    const filename = path.basename(fullPath);

    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'private, max-age=600',
      },
    });
  } catch {
    return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
  }
}

