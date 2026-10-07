import React, { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { listAuditLogs } from '../lib/admin.functions';

export const Route = createFileRoute('/_authenticated/admin/logs')({
  component: AdminLogsPanel,
});

function AdminLogsPanel() {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const limit = 15;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await listAuditLogs({ data: { page, limit } });
      setLogs(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="demo-page px-4 py-8">
      {/* Back button */}
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Admin Control
      </Link>

      <div className="mb-8">
        <h1 className="display-title text-3xl font-black text-[var(--sea-ink)]">Clinical Audit Logs</h1>
        <p className="demo-muted text-sm mt-1">Audit log of system activities, diagnostic requests, and data mutations</p>
      </div>

      <div className="demo-panel rounded-[2rem] p-6 shadow-xl space-y-6">
        <div className="demo-table-shell">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
              <div>Retrieving audit trail...</div>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              No audit logs recorded in system.
            </div>
          ) : (
            <table className="demo-table text-[11px]">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Operator</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Target Entity ID</th>
                  <th>Metadata Context</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td className="font-bold text-[var(--sea-ink)]">{log.user_email}</td>
                    <td className="uppercase font-bold tracking-wider text-blue-500">{log.action}</td>
                    <td>{log.entity}</td>
                    <td className="text-slate-400 font-mono">{log.entity_id || '—'}</td>
                    <td className="max-w-xs truncate" title={JSON.stringify(log.metadata)}>
                      {log.metadata ? JSON.stringify(log.metadata) : '—'}
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
              Showing page {page} of {totalPages} ({total} audit logs)
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
