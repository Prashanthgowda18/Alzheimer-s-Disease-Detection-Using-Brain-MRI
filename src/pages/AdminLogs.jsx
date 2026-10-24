import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listAuditLogs } from '../lib/admin.functions';

function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listAuditLogs({ data: undefined });
      setLogs(res.data || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  if (loading) {
    return (
      <main className="demo-page px-4 py-12 text-center text-sm text-slate-400">
        <div className="animate-spin inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mb-3" />
        <div>Loading audit logs...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="demo-page px-4 py-12 max-w-xl mx-auto">
        <div className="demo-alert demo-alert-danger text-center shadow-md">
          <h3 className="font-extrabold text-red-700 text-lg mb-2">Error</h3>
          <p className="text-sm mb-4">{error}</p>
          <Link to="/admin" className="demo-button demo-button-secondary text-xs">Back to Admin</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="demo-page px-4 py-8">
      <div className="flex items-center mb-6">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          Back to Admin Control
        </Link>
        <h1 className="demo-title text-3xl font-black ml-4">Audit Logs</h1>
      </div>
      {logs.length === 0 ? (
        <div className="demo-panel rounded-2xl p-10 text-center text-slate-400">
          <p>No audit logs available.</p>
        </div>
      ) : (
        <div className="demo-panel rounded-[2rem] p-6 shadow-xl overflow-auto max-h-[70vh]">
          <table className="demo-table text-sm">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.created_at).toLocaleString()}</td>
                  <td>{log.user_email || log.user_name || 'System'}</td>
                  <td>{log.action}</td>
                  <td className="max-w-xs truncate" title={log.details || (log.entity ? `${log.entity}${log.entity_id ? ` (${log.entity_id})` : ''}` : '')}>
                    {log.details || (log.entity ? `${log.entity}${log.entity_id ? ` (${log.entity_id})` : ''}` : '-')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default AdminLogs;
