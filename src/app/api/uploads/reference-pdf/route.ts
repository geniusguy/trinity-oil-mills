import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { auth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ALLOWED_SCOPES = ['courier-expenses', 'sales'] as const;
type Scope = (typeof ALLOWED_SCOPES)[number];

function getUploadsRootDir() {
  // Use a stable, explicit storage location in production if provided.
  // Example: UPLOADS_ROOT_DIR=/var/www/trinityoil-api/uploads-storage
  const envDir = String(process.env.UPLOADS_ROOT_DIR || '').trim();
  if (envDir) return envDir;

  // Fallback for local/dev.
  return path.join(process.cwd(), 'storage', 'uploads');
}

function isValidPdf(file: File) {
  const name = file.name?.toLowerCase?.() || '';
  const type = file.type?.toLowerCase?.() || '';
  return type.includes('pdf') || name.endsWith('.pdf');
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');
  const scopeRaw = formData.get('scope');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const scope = String(scopeRaw ?? '') as Scope;
  if (!ALLOWED_SCOPES.includes(scope)) {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  }

  const role = session.user.role || '';
  const allowedRoles =
    scope === 'courier-expenses' ? ['admin', 'accountant'] : ['admin', 'accountant', 'retail_staff'];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isValidPdf(file)) {
    return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
  }

  // Basic size limit: 20MB
  const maxBytes = 20 * 1024 * 1024;
  if (typeof file.size === 'number' && file.size > maxBytes) {
    return NextResponse.json({ error: 'PDF too large (max 20MB)' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(getUploadsRootDir(), scope);
  await fs.mkdir(uploadsDir, { recursive: true });

  const ext = '.pdf';
  const safeOriginalName = String(file.name ?? 'reference').slice(0, 200);
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;

  const fullPath = path.join(uploadsDir, filename);
  await fs.writeFile(fullPath, buffer);

  // Public logical path. Served by /api/uploads/inline route.
  const urlPath = `/uploads/${scope}/${filename}`;
  return NextResponse.json({ path: urlPath, originalName: safeOriginalName });
}

