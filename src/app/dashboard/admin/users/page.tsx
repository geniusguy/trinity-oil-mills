'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('');
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addRole, setAddRole] = useState('retail_staff');
  const [isResetting, setIsResetting] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === 'loading') return;
    
    console.log('🔍 Admin page - Session check:', {
      session: !!session,
      user: session?.user,
      role: session?.user?.role,
      status
    });
    
    if (!session) {
      console.log('❌ No session, redirecting to login');
      router.push('/login');
      return;
    }
    if (session.user?.role !== 'admin') {
      console.log('❌ Not admin role, redirecting to dashboard');
      router.push('/dashboard');
      return;
    }
    
    console.log('✅ Admin access granted');
  }, [session, status, router]);

  // Fetch users
  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) return;
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsResetting(true);
      setError('');
      
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Password reset successfully for ${selectedUser.name}`);
        setShowResetModal(false);
        setSelectedUser(null);
        setNewPassword('');
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;

    try {
      setIsUpdatingRole(true);
      setError('');
      
      const response = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedUser.id,
          newRole: newRole,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Role updated successfully for ${selectedUser.name}`);
        setShowRoleModal(false);
        setSelectedUser(null);
        setNewRole('');
        fetchUsers(); // Refresh the user list
      } else {
        setError(data.error || 'Failed to update role');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const openResetModal = (user: User) => {
    setSelectedUser(user);
    setShowResetModal(true);
    setNewPassword('');
    setError('');
  };

  const openRoleModal = (user: User) => {
    setSelectedUser(user);
    setShowRoleModal(true);
    setNewRole(user.role);
    setError('');
  };

  const closeResetModal = () => {
    setShowResetModal(false);
    setSelectedUser(null);
    setNewPassword('');
    setError('');
  };

  const closeRoleModal = () => {
    setShowRoleModal(false);
    setSelectedUser(null);
    setNewRole('');
    setError('');
  };

  const openAddModal = () => {
    setShowAddModal(true);
    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddRole('retail_staff');
    setError('');
    setSuccess('');
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddName('');
    setAddEmail('');
    setAddPassword('');
    setAddRole('retail_staff');
  };

  const handleCreateUser = async () => {
    if (!addName || !addEmail || !addPassword || !addRole) {
      setError('All fields are required');
      return;
    }
    if (addPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setIsCreating(true);
      setError('');
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: addName, email: addEmail, password: addPassword, role: addRole }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess(`User ${data.user.name} created successfully`);
        closeAddModal();
        fetchUsers();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!session || session.user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Access Denied</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="mt-2 text-gray-600">Manage users and reset passwords</p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <span className="text-sm text-gray-700">
                Welcome, {session.user?.name} (Admin)
              </span>
              <button
                onClick={openAddModal}
                className="w-full sm:w-auto text-center bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Add User
              </button>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto text-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-md">
            {success}
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">All Users</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' 
                          ? 'bg-red-100 text-red-800' 
                          : user.role === 'accountant'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openResetModal(user)}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        Reset Password
                      </button>
                      <button
                        onClick={() => openRoleModal(user)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Change Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Reset Password Modal */}
        {showResetModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Reset Password for {selectedUser.name}
                </h3>
                
                <div className="mb-4">
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter new password"
                  />
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeResetModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    disabled={isResetting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleResetPassword}
                    disabled={isResetting || !newPassword}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResetting ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Change Role Modal */}
        {showRoleModal && selectedUser && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Change Role for {selectedUser.name}
                </h3>
                
                <div className="mb-4">
                  <label htmlFor="newRole" className="block text-sm font-medium text-gray-700 mb-2">
                    Select New Role
                  </label>
                  <select
                    id="newRole"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="accountant">Accountant</option>
                    <option value="retail_staff">Retail Staff</option>
                  </select>
                </div>

                <div className="mb-4 text-sm text-gray-600">
                  <p><strong>Current Role:</strong> {selectedUser.role}</p>
                  <p><strong>New Role:</strong> {newRole}</p>
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeRoleModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    disabled={isUpdatingRole}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateRole}
                    disabled={isUpdatingRole || !newRole || newRole === selectedUser.role}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdatingRole ? 'Updating...' : 'Update Role'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add User Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add New User
                </h3>

                <div className="mb-4">
                  <label htmlFor="addName" className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    id="addName"
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter full name"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="addEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    id="addEmail"
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter email"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="addPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="addPassword"
                    type="password"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter password"
                  />
                </div>

                <div className="mb-6">
                  <label htmlFor="addRole" className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <select
                    id="addRole"
                    value={addRole}
                    onChange={(e) => setAddRole(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="admin">Admin</option>
                    <option value="accountant">Accountant</option>
                    <option value="retail_staff">Retail Staff</option>
                  </select>
                </div>

                {error && (
                  <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-md text-sm">
                    {error}
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeAddModal}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                    disabled={isCreating}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateUser}
                    disabled={isCreating}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreating ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
