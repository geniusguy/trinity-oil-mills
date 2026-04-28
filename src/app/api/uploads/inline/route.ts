import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

function isAllowedUploadPath(p: string) {
  if (!p.startsWith('/uploads/')) return false;
  const lower = p.toLowerCase();
  if (!lower.endsWith('.pdf')) return false;
  return lower.startsWith('/uploads/sales/') || lower.startsWith('/uploads/courier-expenses/');
}

function getUploadsRootDir() {
  // Keep this static to avoid broad NFT tracing warnings in Turbopack builds.
  return 'storage/uploads';
}

function getCandidatePaths(requestedPath: string) {
  const normalized = requestedPath.replace(/^\/+/, ''); // uploads/sales/file.pdf
  const suffix = normalized.replace(/^uploads\//, ''); // sales/file.pdf
  return [`${getUploadsRootDir()}/${suffix}`];
}

export async function GET(request: NextRequest) {
  const p = String(new URL(request.url).searchParams.get('path') || '').trim();
  if (!p || !isAllowedUploadPath(p)) {
    return NextResponse.json({ error: 'Invalid PDF path' }, { status: 400 });
  }

  try {
    const candidates = getCandidatePaths(p);
    let file: Buffer | null = null;
    let filename = 'document.pdf';

    for (const fullPath of candidates) {
      try {
        file = await fs.readFile(fullPath);
        filename = fullPath.split('/').pop() || filename;
        break;
      } catch {
        // try next path
      }
    }

    if (!file) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
    }

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

