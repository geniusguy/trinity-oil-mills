'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui';

const DatabaseBackupPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dropExisting, setDropExisting] = useState(true);

  const downloadBackup = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const res = await fetch('/api/admin/database-backup', {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json?.error || 'Failed to generate SQL backup');
      }

      const blob = await res.blob();
      const cd = res.headers.get('content-disposition') || '';
      const nameMatch = cd.match(/filename="([^"]+)"/i);
      const filename = nameMatch?.[1] || `database-backup-${Date.now()}.sql`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setSuccess(`Backup downloaded: ${filename}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Backup failed');
    } finally {
      setLoading(false);
    }
  };

  const restoreFromSql = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setFileError(null);

      if (!file) {
        setFileError('Please select a .sql file to upload');
        return;
      }

      const lower = String(file.name || '').toLowerCase();
      if (!lower.endsWith('.sql')) {
        setFileError('Only .sql files are allowed');
        return;
      }

      // 200MB safety cap (server also enforces this)
      const maxBytes = 200 * 1024 * 1024;
      if (typeof file.size === 'number' && file.size > maxBytes) {
        setFileError('SQL file too large (max 200MB)');
        return;
      }

      if (!dropExisting) {
        // For safety, default is true; user can still toggle it.
        // We keep this as a UI requirement since “remove old data” was asked.
      }

      const fd = new FormData();
      fd.append('file', file);
      fd.append('dropExisting', String(dropExisting));

      const res = await fetch('/api/admin/database-backup', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Restore failed');
      }

      setSuccess(json?.message || 'Database restored successfully');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="text-4xl">💾</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Database Backup</h1>
          <p className="text-gray-600">Download full SQL dump in one click</p>
        </div>
      </div>

      <Card>
        <div className="p-6 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">What this does</h2>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Creates full database `.sql` dump from server</li>
              <li>• Includes schema + data + routines + triggers</li>
              <li>• Downloads the file directly to your browser</li>
            </ul>
          </div>

          <button
            onClick={downloadBackup}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-3 rounded-lg font-medium"
          >
            {loading ? 'Preparing backup...' : 'Download Full DB Backup (.sql)'}
          </button>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              {success}
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-orange-900 mb-2">Restore (UPLOAD .sql)</h2>
            <p className="text-sm text-orange-800">
              This will replace your current database with the uploaded `.sql` file.
            </p>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Select SQL file (.sql)</label>
            <input
              type="file"
              accept=".sql,application/sql,text/plain"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setFileError(null);
              }}
              className="block w-full text-sm text-gray-600"
            />
            {file && (
              <div className="text-xs text-gray-600">
                Selected: <span className="font-medium text-gray-800">{file.name}</span>
              </div>
            )}
            {fileError && (
              <div className="text-xs text-red-700">{fileError}</div>
            )}
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={dropExisting}
              onChange={(e) => setDropExisting(e.target.checked)}
            />
            <span>
              Delete existing tables/data before restoring (recommended).
            </span>
          </label>

          <button
            onClick={restoreFromSql}
            disabled={loading || !file}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-6 py-3 rounded-lg font-medium"
          >
            {loading ? 'Restoring...' : 'Upload & Restore DB'}
          </button>

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              {success}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default DatabaseBackupPage;

