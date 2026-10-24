import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listUsers, setUserActive, assignRole } from '../lib/admin.functions';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const limit = 10;

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await listUsers({ data: { page, limit } });
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [page]);

  const handleToggleActive = async (userId, currentActive) => {
    setUpdatingId(userId);
    try {
      await setUserActive({ data: { userId, active: !currentActive } });
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, is_active: !currentActive } : u)));
    } catch (err) {
      alert(err.message || 'Failed to update user status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'doctor' : 'admin';
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) {
      return;
    }
    setUpdatingId(userId);
    try {
      await assignRole({ data: { userId, role: newRole } });
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      alert(err.message || 'Failed to update user role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="demo-page px-4 py-8">
      {/* Back button */}
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Back to Admin Control
      </Link>

      <div className="mb-8">
        <h1 className="demo-title text-3xl font-black">User Governance</h1>
        <p className="demo-muted text-sm mt-1">Manage portal account permissions, assign roles, and activate/deactivate accounts</p>
      </div>

      <div className="demo-panel rounded-[2rem] p-6 shadow-xl space-y-6">
        <div className="demo-table-shell">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2" />
              <div>Retrieving registered accounts...</div>
            </div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">No registered user profiles found.</div>
          ) : (
            <table className="demo-table text-xs">
              <thead>
                <tr>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Hospital/Clinic</th>
                  <th>Portal Role</th>
                  <th>Status</th>
                  <th className="text-right">Governance Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(profile => (
                  <tr key={profile.id}>
                    <td className="font-bold text-[var(--sea-ink)]">{profile.full_name}</td>
                    <td>{profile.email}</td>
                    <td>{profile.hospital_name || 'Not Affiliated'}</td>
                    <td>
                      <span className={`capitalize font-bold ${profile.role === 'admin' ? 'text-cyan-500' : 'text-blue-500'}`}>{profile.role}</span>
                    </td>
                    <td>
                      <span className={`font-bold ${profile.is_active ? 'text-emerald-500' : 'text-red-500'}`}>{profile.is_active ? 'Active' : 'Deactivated'}</span>
                    </td>
                    <td className="text-right space-x-2">
                      <button
                        onClick={() => handleToggleRole(profile.id, profile.role)}
                        disabled={updatingId !== null}
                        className="demo-button demo-button-secondary text-[10px] py-1 px-2.5 font-bold"
                      >
                        Swap Role
                      </button>
                      <button
                        onClick={() => handleToggleActive(profile.id, profile.is_active)}
                        disabled={updatingId !== null}
                        className={`demo-button text-[10px] py-1 px-2.5 font-bold ${profile.is_active ? 'demo-button-danger border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500' : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/20'}`}
                      >
                        {profile.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <span className="text-xs text-slate-400">
              Showing page {page} of {totalPages} ({total} users)
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="demo-button demo-button-secondary text-xs px-3 py-1.5"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="demo-button demo-button-secondary text-xs px-3 py-1.5"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default AdminUsers;
