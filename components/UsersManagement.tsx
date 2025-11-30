import React, { useState, useEffect } from 'react';
import { UserService } from '../services/api';
import { UserPlus, Trash2 } from 'lucide-react';

export const UsersManagement: React.FC = () => {
  const [users, setUsers] = useState<Array<{ username: string; role: string; createdAt: string }>>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await UserService.listUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await UserService.createUser(newUsername, newPassword, newRole);
      setShowCreateForm(false);
      setNewUsername('');
      setNewPassword('');
      setNewRole('viewer');
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Delete user "${username}"?`)) return;

    try {
      await UserService.deleteUser(username);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Create User
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {showCreateForm && (
        <form onSubmit={handleCreateUser} className="bg-gray-800 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Username"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-8">Loading users...</div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="text-left p-4 text-gray-300">Username</th>
                <th className="text-left p-4 text-gray-300">Role</th>
                <th className="text-left p-4 text-gray-300">Created</th>
                <th className="text-right p-4 text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.username} className="border-t border-gray-700">
                  <td className="p-4 text-white">{user.username}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${user.role === 'admin' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-200'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td className="p-4 text-right">
                    {user.username !== 'admin' && (
                      <button
                        onClick={() => handleDeleteUser(user.username)}
                        className="text-red-400 hover:text-red-300"
                        title="Delete user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
