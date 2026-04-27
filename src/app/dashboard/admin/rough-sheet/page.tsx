'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type RoughRow = {
  id: string;
  content: string;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export default function RoughSheetPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const allowed = ['admin', 'accountant', 'retail_staff'];

  const [items, setItems] = useState<RoughRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [content, setContent] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!allowed.includes(session.user?.role || '')) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/rough-sheet');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load rough sheet');
      setItems(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load rough sheet');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && allowed.includes(session.user.role || '')) {
      fetchData();
    }
  }, [session]);

  const resetForm = () => {
    setContent('');
    setEditingId(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text) {
      setError('Please enter something.');
      return;
    }
    try {
      setSaving(true);
      setError('');
      setNotice('');
      const url = editingId ? `/api/rough-sheet/${editingId}` : '/api/rough-sheet';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setNotice(editingId ? 'Entry updated' : 'Entry added');
      resetForm();
      fetchData();
    } catch (e: any) {
      setError(e?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (r: RoughRow) => {
    setEditingId(r.id);
    setContent(r.content || '');
    setError('');
    setNotice('');
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this entry?')) return;
    try {
      setError('');
      setNotice('');
      const res = await fetch(`/api/rough-sheet/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to delete');
      if (editingId === id) resetForm();
      setNotice('Entry deleted');
      fetchData();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete');
    }
  };

  const fmtDate = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  };

  const totalEntries = useMemo(() => items.length, [items]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600">Loading...</div>
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
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Rough Sheet</h1>
            <p className="text-gray-600 mt-1">Quick place to write temporary notes, points, or reminders.</p>
          </div>
          <Link href="/dashboard" className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium">
            Dashboard
          </Link>
        </div>

        {error && <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {notice && <div className="mb-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-700 text-sm">{notice}</div>}

        <div className="bg-white shadow rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{editingId ? 'Edit entry' : 'Add entry'}</h2>
          <form onSubmit={submit} className="space-y-3">
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              rows={5}
              placeholder="Write anything..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md text-sm font-medium"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 text-sm text-gray-700">
            Total entries: <span className="font-semibold">{totalEntries}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Content</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Updated</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 text-sm text-gray-800 whitespace-pre-wrap">{r.content}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{fmtDate(r.updatedAt || r.createdAt)}</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
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
            <div className="px-4 py-10 text-center text-sm text-gray-500">No rough entries yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}

