import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db/db';
import { dailyTaskReminders } from '@/db/schema';
import { desc, eq, and } from 'drizzle-orm';

const ROLES = ['admin', 'accountant', 'retail_staff'];

function canAccess(role: string | undefined) {
  return role && ROLES.includes(role);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending | done | all

    const conditions = [];
    if (status === 'pending' || status === 'done') {
      conditions.push(eq(dailyTaskReminders.status, status));
    }

    const rows = await db
      .select()
      .from(dailyTaskReminders)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(dailyTaskReminders.createdAt));

    return NextResponse.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        reminderOn: r.reminderOn ? new Date(r.reminderOn).toISOString() : null,
        remarks: r.remarks ?? '',
        status: r.status,
        userId: r.userId,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
        updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
      })),
    });
  } catch (error) {
    console.error('daily-notes GET:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tasks' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id || !canAccess(session.user.role)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      reminderOn,
      remarks,
      status = 'pending',
    } = body as {
      title?: string;
      reminderOn?: string | null;
      remarks?: string;
      status?: string;
    };

    if (!title || !String(title).trim()) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const st = status === 'done' ? 'done' : 'pending';
    const id = `dtr-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    await db.insert(dailyTaskReminders).values({
      id,
      title: String(title).trim(),
      reminderOn: reminderOn ? new Date(reminderOn) : null,
      remarks: remarks ? String(remarks) : null,
      status: st,
      userId: session.user.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: { id, title: String(title).trim(), reminderOn: reminderOn || null, remarks: remarks || '', status: st },
    });
  } catch (error) {
    console.error('daily-notes POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create task' },
      { status: 500 },
    );
  }
}
