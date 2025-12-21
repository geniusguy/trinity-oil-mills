'use client';

import { useState } from 'react';

export default function TestDBPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/test-db-connection');
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Database Connection Test</h1>
        
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 mb-6"
        >
          {loading ? 'Testing...' : 'Test Database Connection'}
        </button>

        {result && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            
            <div className="space-y-4">
              <div>
                <span className="font-medium">Status: </span>
                <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                  {result.success ? '✅ Success' : '❌ Failed'}
                </span>
              </div>

              {result.env && (
                <div>
                  <h3 className="font-medium mb-2">Environment:</h3>
                  <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
                    {JSON.stringify(result.env, null, 2)}
                  </pre>
                </div>
              )}

              {result.database && (
                <div>
                  <h3 className="font-medium mb-2">Database Info:</h3>
                  <div className="space-y-2">
                    <div>
                      <span className="font-medium">Users Count: </span>
                      <span>{result.database.usersCount}</span>
                    </div>
                    <div>
                      <span className="font-medium">Admin User Exists: </span>
                      <span>{result.database.adminUserExists ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    {result.database.adminEmail && (
                      <div>
                        <span className="font-medium">Admin Email: </span>
                        <span>{result.database.adminEmail}</span>
                      </div>
                    )}
                    {result.database.passwordTest !== null && (
                      <div>
                        <span className="font-medium">Password Test (admin@123): </span>
                        <span className={result.database.passwordMatches ? 'text-green-600' : 'text-red-600'}>
                          {result.database.passwordMatches ? '✅ Matches' : '❌ Does not match'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {result.error && (
                <div>
                  <h3 className="font-medium text-red-600 mb-2">Error:</h3>
                  <pre className="bg-red-50 p-3 rounded text-sm text-red-800 overflow-auto">
                    {result.error}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

