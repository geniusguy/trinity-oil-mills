"use client";
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui';

const DatabaseSetupPage: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'needs-setup' | 'ready' | 'error'>('loading');
  const [setupResult, setSetupResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);

  const checkDatabaseStatus = async () => {
    try {
      setStatus('loading');
      const response = await fetch('/api/setup/database');
      const data = await response.json();
      
      if (data.success) {
        setStatus(data.needsSetup ? 'needs-setup' : 'ready');
        setSetupResult(data);
      } else {
        setStatus('error');
        setError(data.error || 'Failed to check database status');
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const setupDatabase = async () => {
    try {
      setIsSetupInProgress(true);
      const response = await fetch('/api/setup/database', { method: 'POST' });
      const data = await response.json();
      
      if (data.success) {
        setStatus('ready');
        setSetupResult(data);
        setError(null);
      } else {
        setError(data.error || 'Database setup failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setIsSetupInProgress(false);
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-4xl">🛠️</span>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Database Setup</h1>
          <p className="text-gray-600">Setup required database tables for financial features</p>
        </div>
      </div>

      {/* Status Display */}
      {status === 'loading' && (
        <Card>
          <div className="p-6 text-center">
            <div className="animate-spin text-4xl mb-4">⚙️</div>
            <p className="text-gray-600">Checking database status...</p>
          </div>
        </Card>
      )}

      {status === 'needs-setup' && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚠️</span>
              <h2 className="text-xl font-semibold text-orange-800">Database Setup Required</h2>
            </div>
            <p className="text-gray-600 mb-6">
              The <code className="bg-gray-100 px-2 py-1 rounded">savings_investments</code> table is missing and needs to be created for the financial features to work properly.
            </p>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">What will be created:</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• <code>savings_investments</code> table with proper structure</li>
                  <li>• Database indexes for optimal performance</li>
                  <li>• Sample investment data for testing</li>
                </ul>
              </div>
              <button 
                onClick={setupDatabase}
                disabled={isSetupInProgress}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
              >
                {isSetupInProgress ? (
                  <>
                    <span className="animate-spin">⚙️</span>
                    Setting up database...
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    Setup Database Tables
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>
      )}

      {status === 'ready' && setupResult && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">✅</span>
              <h2 className="text-xl font-semibold text-green-800">Database Ready</h2>
            </div>
            <p className="text-gray-600 mb-6">
              All required database tables are properly set up and ready to use.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Table Status</h3>
                <div className="text-sm text-green-700 space-y-1">
                  <p>✅ <code>savings_investments</code> table exists</p>
                  <p>📊 Records in table: <strong>{setupResult.recordCount || 0}</strong></p>
                  <p>🏗️ Table structure: <strong>Valid</strong></p>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Next Steps</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Test the Savings & Investments feature</p>
                  <p>• Add your real investment data</p>
                  <p>• Check other financial features</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <a 
                href="/dashboard/admin/savings-investments" 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
              >
                💰 Open Savings & Investments
              </a>
              <button 
                onClick={checkDatabaseStatus}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md font-medium"
              >
                🔄 Refresh Status
              </button>
            </div>
          </div>
        </Card>
      )}

      {status === 'error' && (
        <Card>
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">❌</span>
              <h2 className="text-xl font-semibold text-red-800">Database Error</h2>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-red-700">{error}</p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={checkDatabaseStatus}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md font-medium mr-3"
              >
                🔄 Retry Check
              </button>
              <div className="text-sm text-gray-600">
                <p><strong>Common solutions:</strong></p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Ensure MySQL database is running</li>
                  <li>Check database connection credentials</li>
                  <li>Verify you have database creation permissions</li>
                  <li>Contact your system administrator</li>
                </ul>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Setup Result Details */}
      {setupResult && status === 'ready' && setupResult.tableStructure && (
        <Card>
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">📋 Table Structure Details</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Field</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Type</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Null</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Key</th>
                    <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Default</th>
                  </tr>
                </thead>
                <tbody>
                  {setupResult.tableStructure.map((field: any, index: number) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 text-sm font-mono">{field.Field}</td>
                      <td className="px-4 py-2 text-sm">{field.Type}</td>
                      <td className="px-4 py-2 text-sm">{field.Null}</td>
                      <td className="px-4 py-2 text-sm">{field.Key}</td>
                      <td className="px-4 py-2 text-sm">{field.Default || 'NULL'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DatabaseSetupPage;
