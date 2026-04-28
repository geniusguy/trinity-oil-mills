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

function normalizeRelativePath(input: string) {
  const cleaned = String(input || '')
    .replace(/\\/g, '/')
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part !== '.' && part !== '..')
    .join('/');
  return cleaned;
}

function resolveSafeTarget(relativePath: string) {
  const normalized = normalizeRelativePath(relativePath);
  const resolved = path.resolve(uploadsDir, normalized);
  const root = path.resolve(uploadsDir);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('Invalid path');
  }
  return { normalized, resolved };
}

function getFileType(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  return 'text';
}

function getMimeTypeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  if (lower.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true });
}

async function listAllFoldersRecursive(rootRelative = ''): Promise<Array<{ name: string; path: string }>> {
  const { normalized, resolved } = resolveSafeTarget(rootRelative);
  const entries = await fs.readdir(resolved, { withFileTypes: true });
  const out: Array<{ name: string; path: string }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const relPath = normalizeRelativePath(path.posix.join(normalized, entry.name));
    out.push({ name: entry.name, path: relPath });
    const nested = await listAllFoldersRecursive(relPath);
    out.push(...nested);
  }
  return out;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUploadsDir();
    const { searchParams } = new URL(request.url);
    const filePathParam = searchParams.get('filePath') || '';
    const download = searchParams.get('download') === '1';

    if (filePathParam) {
      const { normalized, resolved } = resolveSafeTarget(filePathParam);
      const stat = await fs.stat(resolved);
      if (!stat.isFile()) {
        return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
      }
      const file = await fs.readFile(resolved);
      const filename = path.posix.basename(normalized);
      const mimeType = getMimeTypeFromName(filename);
      return new NextResponse(file, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `${download ? 'attachment' : 'inline'}; filename="${filename}"`,
          'Cache-Control': 'private, max-age=300',
        },
      });
    }

    const folderParam = searchParams.get('folder') || '';
    const { normalized: currentFolder, resolved: currentFolderPath } = resolveSafeTarget(folderParam);
    await fs.mkdir(currentFolderPath, { recursive: true });

    const entries = await fs.readdir(currentFolderPath, { withFileTypes: true });
    const folders = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const absolutePath = path.join(currentFolderPath, entry.name);
          const stats = await fs.stat(absolutePath);
          const relPath = normalizeRelativePath(path.posix.join(currentFolder, entry.name));
          return {
            id: `folder:${relPath}`,
            name: entry.name,
            path: relPath,
            kind: 'folder' as const,
            updatedAt: stats.mtime.toISOString(),
          };
        }),
    );
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
          const absolutePath = path.join(currentFolderPath, entry.name);
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
          const relPath = normalizeRelativePath(path.posix.join(currentFolder, entry.name));
          return {
            id: `file:${relPath}`,
            name: entry.name.replace(/^\d+-[a-z0-9]{6,}-/, ''),
            filename: entry.name,
            path: relPath,
            kind: 'file' as const,
            url: `/api/drive-files?filePath=${encodeURIComponent(relPath)}`,
            size: stats.size,
            mimeType,
            fileType: getFileType(mimeType),
            uploadedAt: stats.mtime.toISOString(),
          };
        }),
    );

    const allFolders = [{ name: 'Drive', path: '' }, ...(await listAllFoldersRecursive(''))];
    return NextResponse.json({ success: true, currentFolder, folders, files, allFolders });
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
    const action = String(formData.get('action') || 'upload');
    const folder = String(formData.get('folder') || '');
    const { normalized: currentFolder, resolved: targetFolder } = resolveSafeTarget(folder);

    if (action === 'create_folder') {
      const folderName = sanitizeBaseName(String(formData.get('folderName') || '').trim());
      if (!folderName) {
        return NextResponse.json({ success: false, error: 'Folder name is required' }, { status: 400 });
      }
      const { normalized: nextFolder, resolved: nextFolderPath } = resolveSafeTarget(
        path.posix.join(currentFolder, folderName),
      );
      await fs.mkdir(nextFolderPath, { recursive: true });
      return NextResponse.json({ success: true, folder: { name: folderName, path: nextFolder } });
    }

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
    await fs.mkdir(targetFolder, { recursive: true });
    const ext = path.extname(file.name || '').toLowerCase();
    const base = sanitizeBaseName(path.basename(file.name || 'file', ext));
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const filename = `${unique}-${base || 'file'}${ext}`;
    const targetPath = path.join(targetFolder, filename);
    const relPath = normalizeRelativePath(path.posix.join(currentFolder, filename));

    const bytes = await file.arrayBuffer();
    await fs.writeFile(targetPath, Buffer.from(bytes));

    return NextResponse.json({
      success: true,
      file: {
        id: filename,
        name: `${base || 'file'}${ext}`,
        filename,
        path: relPath,
        url: `/api/drive-files?filePath=${encodeURIComponent(relPath)}`,
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

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    await ensureUploadsDir();
    const body = await request.json();
    const action = String(body?.action || '').trim();
    const kind = String(body?.kind || 'file').trim();
    const sourcePath = String(body?.path || '').trim();
    if (!action || !sourcePath) {
      return NextResponse.json({ success: false, error: 'action and path are required' }, { status: 400 });
    }

    const { resolved: sourceAbsolute } = resolveSafeTarget(sourcePath);
    await fs.stat(sourceAbsolute);

    if (action === 'rename') {
      const newName = sanitizeBaseName(String(body?.newName || '').trim());
      if (!newName) return NextResponse.json({ success: false, error: 'newName is required' }, { status: 400 });
      const parentRel = normalizeRelativePath(path.posix.dirname(normalizeRelativePath(sourcePath)));
      const extension = kind === 'file' ? path.extname(path.basename(sourcePath)) : '';
      const targetRel = normalizeRelativePath(
        path.posix.join(parentRel === '.' ? '' : parentRel, `${newName}${extension}`),
      );
      const { resolved: targetAbsolute } = resolveSafeTarget(targetRel);
      await fs.rename(sourceAbsolute, targetAbsolute);
      return NextResponse.json({ success: true, path: targetRel });
    }

    if (action === 'move') {
      const destinationFolder = normalizeRelativePath(String(body?.destinationFolder || '').trim());
      const filename = path.basename(sourcePath);
      const targetRel = normalizeRelativePath(path.posix.join(destinationFolder, filename));
      const { resolved: targetFolderAbsolute } = resolveSafeTarget(destinationFolder);
      const { resolved: targetAbsolute } = resolveSafeTarget(targetRel);
      await fs.mkdir(targetFolderAbsolute, { recursive: true });
      await fs.rename(sourceAbsolute, targetAbsolute);
      return NextResponse.json({ success: true, path: targetRel });
    }

    return NextResponse.json({ success: false, error: 'Unsupported action' }, { status: 400 });
  } catch (error: any) {
    if (String(error?.code || '') === 'ENOENT') {
      return NextResponse.json({ success: false, error: 'Source not found' }, { status: 404 });
    }
    console.error('drive-files PATCH:', error);
    return NextResponse.json({ success: false, error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetPathParam = String(searchParams.get('path') || '');
    const kind = String(searchParams.get('kind') || 'file');
    if (!targetPathParam) {
      return NextResponse.json({ success: false, error: 'path is required' }, { status: 400 });
    }

    const { resolved: targetPath } = resolveSafeTarget(targetPathParam);
    const stat = await fs.stat(targetPath);

    if (kind === 'folder' || stat.isDirectory()) {
      await fs.rm(targetPath, { recursive: true, force: false });
    } else {
      await fs.unlink(targetPath);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (String(error?.code || '') === 'ENOENT') {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }
    console.error('drive-files DELETE:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete file' }, { status: 500 });
  }
}

