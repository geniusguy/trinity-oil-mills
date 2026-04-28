'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

type DriveFile = {
  id: string;
  name: string;
  filename: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
  fileType: 'pdf' | 'image' | 'text';
  uploadedAt: string;
};

type DriveFolder = {
  id: string;
  name: string;
  path: string;
  kind: 'folder';
  updatedAt: string;
};

type SortBy = 'name' | 'date' | 'size' | 'type';
type FolderOption = { name: string; path: string };

const ALLOWED_ROLES = ['admin', 'accountant', 'retail_staff'];

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DrivePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<DriveFile | null>(null);
  const [currentFolder, setCurrentFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [allFolders, setAllFolders] = useState<FolderOption[]>([]);

  const canAccess = Boolean(session?.user?.role && ALLOWED_ROLES.includes(session.user.role));

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (!canAccess) router.push('/dashboard');
  }, [status, session, canAccess, router]);

  const fetchFiles = async (folder?: string) => {
    setLoading(true);
    setError('');
    try {
      const targetFolder = typeof folder === 'string' ? folder : currentFolder;
      const res = await fetch(`/api/drive-files?folder=${encodeURIComponent(targetFolder)}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Failed to load files');
      setCurrentFolder(String(json.currentFolder || ''));
      setFolders(Array.isArray(json.folders) ? json.folders : []);
      setFiles(Array.isArray(json.files) ? json.files : []);
      setAllFolders(Array.isArray(json.allFolders) ? json.allFolders : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canAccess) void fetchFiles();
  }, [canAccess]);

  const breadcrumbs = useMemo(() => {
    const parts = currentFolder ? currentFolder.split('/').filter(Boolean) : [];
    const crumbs: Array<{ label: string; path: string }> = [{ label: 'Drive', path: '' }];
    let acc = '';
    parts.forEach((p) => {
      acc = acc ? `${acc}/${p}` : p;
      crumbs.push({ label: p, path: acc });
    });
    return crumbs;
  }, [currentFolder]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const foldersFiltered = q ? folders.filter((f) => f.name.toLowerCase().includes(q)) : folders;
    const filesFiltered = q
      ? files.filter((f) => f.name.toLowerCase().includes(q) || f.filename.toLowerCase().includes(q))
      : files;

    const dir = sortDir === 'asc' ? 1 : -1;
    const sortedFolders = [...foldersFiltered].sort((a, b) => {
      if (sortBy === 'date') return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
      return a.name.localeCompare(b.name) * dir;
    });
    const sortedFiles = [...filesFiltered].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name) * dir;
      if (sortBy === 'size') return (a.size - b.size) * dir;
      if (sortBy === 'type') return a.fileType.localeCompare(b.fileType) * dir;
      return (new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime()) * dir;
    });

    return { folders: sortedFolders, files: sortedFiles };
  }, [folders, files, query, sortBy, sortDir]);

  const onUpload = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    setNotice('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', currentFolder);
      const res = await fetch('/api/drive-files', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Upload failed');
      setNotice('File uploaded successfully.');
      await fetchFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
      ev.target.value = '';
    }
  };

  const createFolder = async () => {
    const folderName = newFolderName.trim();
    if (!folderName) return;
    setError('');
    setNotice('');
    try {
      const fd = new FormData();
      fd.append('action', 'create_folder');
      fd.append('folder', currentFolder);
      fd.append('folderName', folderName);
      const res = await fetch('/api/drive-files', {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Create folder failed');
      setNewFolderName('');
      setNotice('Folder created.');
      await fetchFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create folder failed');
    }
  };

  const removeFile = async (file: DriveFile) => {
    if (!window.confirm(`Delete "${file.name}"?`)) return;
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/drive-files?kind=file&path=${encodeURIComponent(file.path)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Delete failed');
      if (selected?.id === file.id) setSelected(null);
      setNotice('File deleted.');
      await fetchFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  const renameItem = async (kind: 'file' | 'folder', item: DriveFile | DriveFolder) => {
    const currentName = item.name;
    const nextName = window.prompt(`Rename ${kind}`, currentName)?.trim();
    if (!nextName || nextName === currentName) return;
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/drive-files', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rename',
          kind,
          path: item.path,
          newName: nextName,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Rename failed');
      setNotice(`${kind === 'file' ? 'File' : 'Folder'} renamed.`);
      await fetchFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Rename failed');
    }
  };

  const moveItemToFolder = async (kind: 'file' | 'folder', item: DriveFile | DriveFolder, destination: string) => {
    if (destination === item.path) return;
    setError('');
    setNotice('');
    try {
      const res = await fetch('/api/drive-files', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move',
          kind,
          path: item.path,
          destinationFolder: destination,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Move failed');
      setNotice(`${kind === 'file' ? 'File' : 'Folder'} moved.`);
      await fetchFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Move failed');
    }
  };

  const pickAndMove = async (kind: 'file' | 'folder', item: DriveFile | DriveFolder) => {
    const options = allFolders.map((f) => f.path || '/').join('\n');
    const destination = window.prompt(`Move to folder path (empty for root).\nAvailable:\n${options}`, currentFolder)?.trim() ?? '';
    if (destination === null) return;
    await moveItemToFolder(kind, item, destination);
  };

  const removeFolder = async (folder: DriveFolder) => {
    if (!window.confirm(`Delete folder "${folder.name}" and all contents?`)) return;
    setError('');
    setNotice('');
    try {
      const res = await fetch(`/api/drive-files?kind=folder&path=${encodeURIComponent(folder.path)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok || !json?.success) throw new Error(json?.error || 'Delete folder failed');
      setNotice('Folder deleted.');
      await fetchFiles();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete folder failed');
    }
  };

  if (status === 'loading' || (session && !canAccess)) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Drive</h1>
            <p className="text-slate-600">Upload and manage PDF, image, and text files.</p>
          </div>
          <label className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer">
            {uploading ? 'Uploading...' : 'Upload File'}
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,application/pdf,image/*,text/plain"
              className="hidden"
              onChange={onUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <input
              className="lg:col-span-2 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search files and folders..."
            />
            <div className="flex gap-2">
              <select
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
              >
                <option value="date">Sort: Date</option>
                <option value="name">Sort: Name</option>
                <option value="size">Sort: Size</option>
                <option value="type">Sort: Type</option>
              </select>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="px-3 py-2 rounded-lg border border-slate-300 text-sm text-slate-700 bg-white hover:bg-slate-50"
              >
                {sortDir === 'asc' ? 'Asc' : 'Desc'}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {breadcrumbs.map((crumb, idx) => (
              <button
                key={`${crumb.path || 'root'}-${idx}`}
                type="button"
                onClick={() => fetchFiles(crumb.path)}
                className="text-indigo-700 hover:text-indigo-900"
              >
                {idx === 0 ? crumb.label : `/${crumb.label}`}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="w-full max-w-xs border border-slate-300 rounded-lg px-3 py-2 text-sm"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
            />
            <button
              type="button"
              onClick={createFolder}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
            >
              Create folder
            </button>
          </div>
        </div>

        {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {notice && <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{notice}</div>}

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-600">Loading files...</div>
        ) : filtered.folders.length === 0 && filtered.files.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-500">No files found.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.folders.map((folder) => (
              <div key={folder.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                <button
                  type="button"
                  onClick={() => fetchFiles(folder.path)}
                  className="w-full text-left"
                  title="Open folder"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedPath = e.dataTransfer.getData('text/drive-file-path');
                    if (!draggedPath) return;
                    void moveItemToFolder('file', { path: draggedPath } as DriveFile, folder.path);
                  }}
                >
                  <div className="h-32 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center overflow-hidden">
                    <span className="text-amber-700 text-sm font-semibold">FOLDER</span>
                  </div>
                </button>
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-slate-900 truncate" title={folder.name}>{folder.name}</p>
                  <p className="text-xs text-slate-500">{new Date(folder.updatedAt).toLocaleString('en-IN')}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => fetchFiles(folder.path)}
                    className="flex-1 text-center px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => renameItem('folder', folder)}
                    className="flex-1 text-center px-3 py-1.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-medium hover:bg-indigo-200"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => pickAndMove('folder', folder)}
                    className="flex-1 text-center px-3 py-1.5 rounded-md bg-violet-100 text-violet-700 text-xs font-medium hover:bg-violet-200"
                  >
                    Move
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFolder(folder)}
                    className="flex-1 text-center px-3 py-1.5 rounded-md bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {filtered.files.map((file) => (
              <div
                key={file.id}
                className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/drive-file-path', file.path)}
              >
                <button
                  type="button"
                  onClick={() => setSelected(file)}
                  className="w-full text-left"
                  title="Preview"
                >
                  <div className="h-32 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                    {file.fileType === 'image' ? (
                      <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-slate-500 text-sm font-medium">{file.fileType.toUpperCase()}</span>
                    )}
                  </div>
                </button>
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-slate-900 truncate" title={file.name}>{file.name}</p>
                  <p className="text-xs text-slate-500">{formatSize(file.size)} · {new Date(file.uploadedAt).toLocaleString('en-IN')}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 text-center px-3 py-1.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
                  >
                    Open
                  </a>
                  <a
                    href={file.url}
                    download={file.name}
                    className="flex-1 text-center px-3 py-1.5 rounded-md bg-indigo-100 text-indigo-700 text-xs font-medium hover:bg-indigo-200"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => renameItem('file', file)}
                    className="px-3 py-1.5 rounded-md bg-violet-100 text-violet-700 text-xs font-medium hover:bg-violet-200"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => pickAndMove('file', file)}
                    className="px-3 py-1.5 rounded-md bg-fuchsia-100 text-fuchsia-700 text-xs font-medium hover:bg-fuchsia-200"
                  >
                    Move
                  </button>
                  <button
                    type="button"
                    onClick={() => removeFile(file)}
                    className="px-3 py-1.5 rounded-md bg-red-100 text-red-700 text-xs font-medium hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl w-full max-w-4xl h-[80vh] p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-slate-900 truncate">{selected.name}</h2>
              <button type="button" className="text-slate-500 hover:text-slate-700" onClick={() => setSelected(null)}>Close</button>
            </div>
            <div className="h-[calc(100%-2.5rem)] border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
              {selected.fileType === 'image' && (
                <img src={selected.url} alt={selected.name} className="w-full h-full object-contain" />
              )}
              {selected.fileType === 'pdf' && (
                <iframe src={selected.url} className="w-full h-full" title={selected.name} />
              )}
              {selected.fileType === 'text' && (
                <iframe src={selected.url} className="w-full h-full bg-white" title={selected.name} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

