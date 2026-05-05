import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ROLES = ['admin', 'accountant', 'retail_staff'] as const;

function canAccess(role?: string) {
  return Boolean(role && ROLES.includes(role as (typeof ROLES)[number]));
}

function normalizeLogicalUploadPath(raw: string) {
  const decoded = decodeURIComponent(String(raw || '').trim());
  const noBackslashes = decoded.replace(/\\/g, '/');
  const withoutPrefix = noBackslashes.replace(/^\/?uploads\/?/i, '');

  const safeSegments = withoutPrefix
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => segment !== '.' && segment !== '..');

  return safeSegments.join('/');
}

function buildUploadRoots() {
  const roots = [
    String(process.env.UPLOADS_ROOT_DIR || '').trim(),
    path.join(process.cwd(), 'storage', 'uploads'),
    path.join(process.cwd(), 'public', 'uploads'),
  ].filter(Boolean);

  return Array.from(new Set(roots.map((root) => path.resolve(root))));
}

function getMimeTypeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'image/jpeg';
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawPath = searchParams.get('path') || '';
    const relativeUploadPath = normalizeLogicalUploadPath(rawPath);
    const download = searchParams.get('download') === '1';

    if (!relativeUploadPath) {
      return NextResponse.json({ success: false, error: 'Missing path parameter' }, { status: 400 });
    }

    const filename = path.posix.basename(relativeUploadPath);
    const roots = buildUploadRoots();

    for (const root of roots) {
      const absolute = path.resolve(root, relativeUploadPath);
      if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
        continue;
      }

      try {
        const stat = await fs.stat(absolute);
        if (!stat.isFile()) continue;

        const file = await fs.readFile(absolute);
        return new NextResponse(file, {
          status: 200,
          headers: {
            'Content-Type': getMimeTypeFromName(filename),
            'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
            'Cache-Control': 'private, max-age=300',
          },
        });
      } catch (error: any) {
        if (String(error?.code || '') === 'ENOENT') {
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({ success: false, error: 'PDF not found' }, { status: 404 });
  } catch (error) {
    console.error('uploads inline GET:', error);
    return NextResponse.json({ success: false, error: 'Failed to open file' }, { status: 500 });
  }
}
