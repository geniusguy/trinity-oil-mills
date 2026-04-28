import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

const ROLES = ['admin', 'accountant', 'retail_staff'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'text/plain',
]);

const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'drive');

function sanitizeBaseName(input: string) {
  return input
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 120);
}

function canAccess(role?: string) {
  return Boolean(role && ROLES.includes(role));
}

function getFileType(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'text';
}

async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true });
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUploadsDir();
    const entries = await fs.readdir(uploadsDir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const absolutePath = path.join(uploadsDir, entry.name);
          const stats = await fs.stat(absolutePath);
          const lower = entry.name.toLowerCase();
          const mimeType = lower.endsWith('.pdf')
            ? 'application/pdf'
            : lower.endsWith('.txt')
            ? 'text/plain'
            : lower.endsWith('.png')
            ? 'image/png'
            : lower.endsWith('.webp')
            ? 'image/webp'
            : lower.endsWith('.gif')
            ? 'image/gif'
            : 'image/jpeg';
          return {
            id: entry.name,
            name: entry.name.replace(/^\d+-[a-z0-9]{6,}-/, ''),
            filename: entry.name,
            url: `/uploads/drive/${encodeURIComponent(entry.name)}`,
            size: stats.size,
            mimeType,
            fileType: getFileType(mimeType),
            uploadedAt: stats.mtime.toISOString(),
          };
        }),
    );

    files.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
    return NextResponse.json({ success: true, files });
  } catch (error) {
    console.error('drive-files GET:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch files' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { success: false, error: 'Only PDF, image, and text files are allowed' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ success: false, error: 'File too large (max 20MB)' }, { status: 400 });
    }

    await ensureUploadsDir();
    const ext = path.extname(file.name || '').toLowerCase();
    const base = sanitizeBaseName(path.basename(file.name || 'file', ext));
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const filename = `${unique}-${base || 'file'}${ext}`;
    const targetPath = path.join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    await fs.writeFile(targetPath, Buffer.from(bytes));

    return NextResponse.json({
      success: true,
      file: {
        id: filename,
        name: `${base || 'file'}${ext}`,
        filename,
        url: `/uploads/drive/${encodeURIComponent(filename)}`,
        size: file.size,
        mimeType: file.type,
        fileType: getFileType(file.type),
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('drive-files POST:', error);
    return NextResponse.json({ success: false, error: 'Failed to upload file' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filename = String(searchParams.get('filename') || '');
    if (!filename) {
      return NextResponse.json({ success: false, error: 'filename is required' }, { status: 400 });
    }

    const safeName = path.basename(filename);
    const targetPath = path.join(uploadsDir, safeName);
    await fs.unlink(targetPath);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (String(error?.code || '') === 'ENOENT') {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }
    console.error('drive-files DELETE:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete file' }, { status: 500 });
  }
}

