'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type TaskRow = {
  id: string;
  title: string;
  reminderOn: string | null;
  remarks: string;
  status: string;
  createdAt: string | null;
};

function todayDateInput() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function DailyNotesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [quickText, setQuickText] = useState('');
  const [quickDate, setQuickDate] = useState(todayDateInput());
  const [quickRemarks, setQuickRemarks] = useState('');
  const [quickSaving, setQuickSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    reminderOn: todayDateInput(),
    remarks: '',
    status: 'pending' as 'pending' | 'done',
  });

  const allowed = ['admin', 'accountant', 'retail_staff'];

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!allowed.includes(session.user?.role || '')) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      setNotice('');
      const qs = filter === 'all' ? '' : `?status=${filter}`;
      const res = await fetch(`/api/daily-notes${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load');
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && allowed.includes(session.user.role || '')) fetchData();
  }, [session, filter]);

  const resetForm = () => {
    setForm({
      title: '',
      reminderOn: todayDateInput(),
      remarks: '',
      status: 'pending',
    });
    setEditing(null);
    setShowForm(false);
  };

  const startAdd = () => {
    setEditing(null);
    setForm({
      title: '',
      reminderOn: todayDateInput(),
      remarks: '',
      status: 'pending',
    });
    setShowForm(true);
  };

  const toDateInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const startEdit = (r: TaskRow) => {
    setEditing(r);
    setForm({
      title: r.title,
      reminderOn: toDateInput(r.reminderOn),
      remarks: r.remarks || '',
      status: r.status === 'done' ? 'done' : 'pending',
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      const payload = {
        title: form.title.trim(),
        remarks: form.remarks.trim(),
        reminderOn: form.reminderOn ? new Date(`${form.reminderOn}T00:00:00`).toISOString() : null,
        status: form.status,
      };
      if (!payload.title) {
        setError('Title is required');
        return;
      }
      const url = editing ? `/api/daily-notes/${editing.id}` : '/api/daily-notes';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      resetForm();
      fetchData();
    } catch (e: any) {
      setError(e?.message || 'Save failed');
    }
  };

  const submitQuick = async () => {
    const lines = quickText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setError('Enter at least one task');
      return;
    }

    setQuickSaving(true);
    setError('');
    setNotice('');
    try {
      for (const title of lines) {
        const res = await fetch('/api/daily-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            reminderOn: quickDate ? new Date(`${quickDate}T00:00:00`).toISOString() : null,
            remarks: quickRemarks.trim(),
            status: 'pending',
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `Failed to add: ${title}`);
      }
      setNotice(`${lines.length} task(s) added`);
      setQuickText('');
      setQuickRemarks('');
      setQuickDate(todayDateInput());
      setShowForm(false);
      setEditing(null);
      await fetchData();
    } catch (e: any) {
      setError(e?.message || 'Failed to add tasks');
    } finally {
      setQuickSaving(false);
    }
  };

  const markDone = async (id: string) => {
    try {
      const res = await fetch(`/api/daily-notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      fetchData();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    }
  };

  const reopen = async (id: string) => {
    try {
      const res = await fetch(`/api/daily-notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      fetchData();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this task / note?')) return;
    try {
      const res = await fetch(`/api/daily-notes/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      fetchData();
    } catch (e: any) {
      setError(e?.message || 'Failed');
    }
  };

  const fmtReminder = (iso: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { dateStyle: 'medium' });
  };

  const isOverdue = (r: TaskRow) => {
    if (r.status !== 'pending' || !r.reminderOn) return false;
    const reminder = new Date(r.reminderOn);
    if (Number.isNaN(reminder.getTime())) return false;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    reminder.setHours(0, 0, 0, 0);
    return reminder.getTime() < todayStart.getTime();
  };

  const pendingCount = useMemo(() => items.filter((i) => i.status === 'pending').length, [items]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading…</div>
      </div>
    );
  }

  if (!session || !allowed.includes(session.user?.role || '')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Access denied</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Notes &amp; Task reminders</h1>
            <p className="mt-2 text-gray-600">
              e.g. <span className="font-medium">Call to Tirupur</span> — set <strong>Reminder on</strong> when to follow up —
              add <strong>remarks</strong>. Mark done, reopen, or delete.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startAdd}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium"
            >
              + Add task
            </button>
            <Link href="/dashboard" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium">
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mb-6 bg-white shadow rounded-lg p-5 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Quick Add Tasks</h2>
          <p className="text-sm text-gray-600 mb-3">
            Add one or multiple tasks at once. Put each task on a new line.
          </p>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tasks (one per line)</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={5}
                placeholder={'Call to Tirupur\nFollow-up payment with Salem canteen\nCheck PET cap stock'}
                value={quickText}
                onChange={(e) => setQuickText(e.target.value)}
              />
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={quickDate}
                  onChange={(e) => setQuickDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Common remarks</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Optional note for all added tasks"
                  value={quickRemarks}
                  onChange={(e) => setQuickRemarks(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submitQuick}
              disabled={quickSaving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
            >
              {quickSaving ? 'Adding...' : 'Add Tasks'}
            </button>
            <button
              type="button"
              onClick={() => {
                setQuickText('');
                setQuickRemarks('');
                setQuickDate(todayDateInput());
              }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-sm font-medium"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={startAdd}
              className="px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 rounded-md text-sm font-medium"
            >
              Advanced single task form
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
            {error.includes('Failed') || error.includes('fetch') ? (
              <span className="block mt-1 text-xs">
                If the table is missing, run <strong>Database Setup</strong> (admin) or apply{' '}
                <code className="bg-red-100 px-1 rounded">scripts/migrate-daily-task-reminders.sql</code>
              </span>
            ) : null}
          </div>
        )}

        {notice && (
          <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm">{notice}</div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {(['all', 'pending', 'done'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize ${
                filter === f ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-500' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {f === 'all' ? `All (${items.length})` : f === 'pending' ? `Pending (${pendingCount})` : 'Done'}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="mb-6 bg-white shadow rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{editing ? 'Edit task' : 'New task'}</h2>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title / task *</label>
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g. Call to Tirupur"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reminder date</label>
                <input
                  type="date"
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
                  value={form.reminderOn}
                  onChange={(e) => setForm((p) => ({ ...p, reminderOn: e.target.value }))}
                />
                <p className="text-xs text-gray-500 mt-1">Optional — choose only date.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Notes, phone numbers, context…"
                  value={form.remarks}
                  onChange={(e) => setForm((p) => ({ ...p, remarks: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md"
                  value={form.status}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'pending' | 'done' }))}
                >
                  <option value="pending">Pending</option>
                  <option value="done">Done</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium">
                  {editing ? 'Save changes' : 'Create'}
                </button>
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reminder date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Remarks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((r) => (
                  <tr key={r.id} className={r.status === 'done' ? 'bg-gray-50/80' : ''}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <div className="flex items-center gap-2 flex-wrap">
                        {r.title}
                        {isOverdue(r) && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Due</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{fmtReminder(r.reminderOn)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title={r.remarks}>
                      {r.remarks || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {r.status === 'done' ? (
                        <span className="text-green-700 font-medium">Done</span>
                      ) : (
                        <span className="text-amber-700 font-medium">Pending</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-right whitespace-nowrap">
                      <div className="flex flex-wrap justify-end gap-1">
                        {r.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => markDone(r.id)}
                            className="px-2 py-1 text-xs font-medium rounded bg-green-100 text-green-800 hover:bg-green-200"
                          >
                            Done
                          </button>
                        )}
                        {r.status === 'done' && (
                          <button
                            type="button"
                            onClick={() => reopen(r.id)}
                            className="px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-800 hover:bg-amber-200"
                          >
                            Reopen
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(r)}
                          className="px-2 py-1 text-xs font-medium rounded bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(r.id)}
                          className="px-2 py-1 text-xs font-medium rounded bg-red-100 text-red-800 hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {items.length === 0 && (
            <div className="px-4 py-12 text-center text-gray-500 text-sm">No tasks yet. Click &quot;Add task&quot;.</div>
          )}
        </div>
      </div>
    </div>
  );
}
