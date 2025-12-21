'use client';

import { useEffect, useState } from 'react';

type QueuedItem = {
  id: string;
  url: string;
  method: string;
  createdAt: number;
};

export default function QueuePage() {
  const [items, setItems] = useState<QueuedItem[]>([]);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    // Read from IndexedDB directly (simple viewer)
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('tom_offline_db', 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction('queued_requests', 'readonly');
    const store = tx.objectStore('queued_requests');
    const all: QueuedItem[] = await new Promise((resolve) => {
      const out: QueuedItem[] = [];
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result as IDBCursorWithValue | null;
        if (cursor) {
          const v: any = cursor.value;
          out.push({ id: v.id, url: v.url, method: v.method, createdAt: v.createdAt });
          cursor.continue();
        } else {
          resolve(out);
        }
      };
      cursorReq.onerror = () => resolve(out);
    });
    setItems(all.sort((a, b) => b.createdAt - a.createdAt));
    db.close();
  };

  return (
    <div className="py-6">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Queued Actions</h1>
        <p className="mt-1 text-gray-600">These requests will be sent when connection is available.</p>

        <div className="mt-6 bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Queued At</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-2 text-sm font-semibold text-gray-800">{item.method}</td>
                  <td className="px-4 py-2 text-sm text-gray-700 break-all">{item.url}</td>
                  <td className="px-4 py-2 text-sm text-gray-500">{new Date(item.createdAt).toLocaleString()}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    <button onClick={async () => { await (await import('@/lib/offlineQueue')).removeFromQueue(item.id); await loadQueue(); }} className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50">Remove</button>
                    <button onClick={async () => { await (await import('@/lib/offlineQueue')).flushQueue(); await loadQueue(); }} className="ml-2 px-3 py-1.5 text-sm rounded-md bg-green-600 text-white hover:bg-green-700">Retry</button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">No queued actions</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={loadQueue} className="px-4 py-2 bg-gray-800 text-white rounded-md">Refresh</button>
          <button onClick={async () => { await (await import('@/lib/offlineQueue')).clearQueue(); await loadQueue(); }} className="px-4 py-2 bg-red-600 text-white rounded-md">Clear All</button>
        </div>
      </div>
    </div>
  );
}


