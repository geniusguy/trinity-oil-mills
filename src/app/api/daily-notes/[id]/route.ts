import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { dailyTaskReminders } from '@/db/schema';
import { eq } from 'drizzle-orm';

const ROLES = ['admin', 'accountant', 'retail_staff'];

function canAccess(role: string | undefined) {
  return role && ROLES.includes(role);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    const body = await request.json();
    const {
      title,
      reminderOn,
      remarks,
      status,
    } = body as {
      title?: string;
      reminderOn?: string | null;
      remarks?: string;
      status?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (title !== undefined) {
      const t = String(title).trim();
      if (!t) {
        return NextResponse.json({ success: false, error: 'Title cannot be empty' }, { status: 400 });
      }
      updates.title = t;
    }
    if (remarks !== undefined) updates.remarks = remarks ? String(remarks) : null;
    if (reminderOn !== undefined) updates.reminderOn = reminderOn ? new Date(reminderOn) : null;
    if (status !== undefined) {
      updates.status = status === 'done' ? 'done' : 'pending';
    }

    await db.update(dailyTaskReminders).set(updates as any).where(eq(dailyTaskReminders.id, id));

    return NextResponse.json({ success: true, message: 'Updated' });
  } catch (error) {
    console.error('daily-notes PUT:', error);
    return NextResponse.json({ success: false, error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 });
    }

    await db.delete(dailyTaskReminders).where(eq(dailyTaskReminders.id, id));

    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    console.error('daily-notes DELETE:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete' }, { status: 500 });
  }
}
