'use client';

export default function AdminPerformancePage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Performance</h1>
      <p className="text-sm text-gray-600 mb-4">System performance metrics.</p>
      <div className="rounded-lg border p-4 bg-gray-50">
        <p className="text-xs text-gray-500">
          {'>'} 2 seconds
        </p>
      </div>
    </div>
  );
}
