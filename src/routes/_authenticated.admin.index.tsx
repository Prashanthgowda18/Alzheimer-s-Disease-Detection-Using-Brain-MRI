import React, { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { getAdminStats, getCachedMlHealth, refreshMlHealth, exportPredictionsCsv } from '../lib/admin.functions';

export const Route = createFileRoute('/_authenticated/admin/')({
  component: AdminControlPanel,
});

function AdminControlPanel() {
  const [stats, setStats] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pinging, setPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const s = await getAdminStats();
      setStats(s);

      const h = await getCachedMlHealth();
      setHealth(h);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefreshHealth = async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const res = await refreshMlHealth();
      if (res.success) {
        setPingResult(`Online: Latency ${res.latency}ms`);
      } else {
        setPingResult(`Failed: ${res.error}`);
      }
      // Reload stats
      const h = await getCachedMlHealth();
      setHealth(h);
    } catch (err: any) {
      setPingResult(`Failed: ${err.message}`);
    } finally {
      setPinging(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvContent = await exportPredictionsCsv();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `Alzheimer_Diagnostics_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      alert('Failed to export CSV: ' + err.message);
    }
  };

  if (loading) {
    return (
      <main className="demo-page px-4 py-12 text-center text-sm text-slate-400">
        <div className="animate-spin inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mb-3"></div>
        <div>Loading administrative statistics...</div>
      </main>
    );
  }

  return (
    <main className="demo-page px-4 py-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="demo-title text-3xl font-black">Administrative Panel</h1>
          <p className="demo-muted text-sm mt-1">System wide diagnostics logs, user governance and ML health pings</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/analytics" className="demo-button demo-button-secondary text-xs">
            Analytics Charts
          </Link>
          <Link to="/admin/users" className="demo-button demo-button-secondary text-xs">
            Manage Users
          </Link>
          <Link to="/admin/logs" className="demo-button demo-button-secondary text-xs">
            Audit Logs
          </Link>
          <button
            onClick={handleExportCsv}
            className="demo-button bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
          >
            Export Predictions CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <article className="demo-panel rounded-2xl p-5 shadow">
          <span className="text-[10px] uppercase font-bold text-slate-400">Global Enrolled Patients</span>
          <h3 className="text-2xl font-black text-[var(--sea-ink)] mt-1">{stats?.totalPatients || 0}</h3>
        </article>
        <article className="demo-panel rounded-2xl p-5 shadow">
          <span className="text-[10px] uppercase font-bold text-slate-400">Global Scans Diagnosed</span>
          <h3 className="text-2xl font-black text-[var(--sea-ink)] mt-1">{stats?.totalPredictions || 0}</h3>
        </article>
        <article className="demo-panel rounded-2xl p-5 shadow">
          <span className="text-[10px] uppercase font-bold text-slate-400">Active Clinical Users</span>
          <h3 className="text-2xl font-black text-[var(--sea-ink)] mt-1">{stats?.totalUsers || 0}</h3>
        </article>
        <article className="demo-panel rounded-2xl p-5 shadow">
          <span className="text-[10px] uppercase font-bold text-slate-400">Average Inference Latency</span>
          <h3 className="text-2xl font-black text-cyan-600 mt-1">{stats?.averageLatencyMs || 0} ms</h3>
        </article>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* ML Health Status Card */}
        <section className="lg:col-span-2">
          <div className="demo-panel rounded-[2rem] p-6 shadow-xl space-y-6">
            <div className="flex justify-between items-center border-b border-[var(--line)] pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--sea-ink)]">
                AI Inference Health Monitor
              </h3>
              <button
                onClick={handleRefreshHealth}
                disabled={pinging}
                className="demo-button text-[10px] uppercase tracking-wider font-bold py-1 px-3"
              >
                {pinging ? 'Pinging Model...' : 'Test Connection'}
              </button>
            </div>

            {pingResult && (
              <div className={`demo-alert text-xs ${pingResult.startsWith('Online') ? 'border-emerald-500/25 bg-emerald-500/5 text-emerald-600' : 'demo-alert-danger'}`}>
                {pingResult}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2 text-xs font-semibold text-slate-500 bg-slate-500/5 rounded-2xl p-4 border border-[var(--line)]">
              <div>
                <span className="opacity-70 block mb-0.5">CNN Service Status</span>
                <span className={`text-sm font-bold ${health?.isHealthy ? 'text-emerald-500' : 'text-red-500'}`}>
                  {health?.isHealthy ? '● Online' : '○ Offline / Unconfigured'}
                </span>
              </div>
              
              <div>
                <span className="opacity-70 block mb-0.5">Last Checked Timestamp</span>
                <span className="text-sm font-bold text-[var(--sea-ink)]">
                  {health?.lastChecked ? new Date(health.lastChecked).toLocaleString() : 'Never'}
                </span>
              </div>

              <div>
                <span className="opacity-70 block mb-0.5">Inference Model Name</span>
                <span className="text-sm font-bold text-[var(--sea-ink)]">
                  {health?.model || 'N/A'}
                </span>
              </div>

              <div>
                <span className="opacity-70 block mb-0.5">Model Version Schema</span>
                <span className="text-sm font-bold text-[var(--sea-ink)]">
                  {health?.version || 'N/A'}
                </span>
              </div>
            </div>

            {/* Health Logs History */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Connection Pings Log</h4>
              <div className="demo-table-shell max-h-40 overflow-y-auto">
                <table className="demo-table text-[10px]">
                  <thead>
                    <tr>
                      <th>Time Checked</th>
                      <th>Status</th>
                      <th>Latency</th>
                      <th>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(health?.history || []).map((ping: any) => (
                      <tr key={ping.id}>
                        <td>{new Date(ping.checked_at || ping.created_at).toLocaleString()}</td>
                        <td className={ping.ok ? 'text-emerald-500 font-bold' : 'text-red-500 font-bold'}>
                          {ping.ok ? 'Success' : 'Failed'}
                        </td>
                        <td>{ping.response_ms ? `${ping.response_ms} ms` : '—'}</td>
                        <td className="max-w-[200px] truncate" title={ping.error}>
                          {ping.error || `Model ${ping.model} v${ping.version}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Global Stage Breakdown */}
        <section className="lg:col-span-1">
          <div className="demo-panel rounded-[2rem] p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--sea-ink)] border-b border-[var(--line)] pb-2">
              System Diagnoses Distributions
            </h3>
            
            {stats?.totalPredictions === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No predictions mapped.</p>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'Non-Demented', key: 'Non Demented', color: 'bg-emerald-500' },
                  { label: 'Very Mild Demented', key: 'Very Mild Demented', color: 'bg-blue-500' },
                  { label: 'Mild Demented', key: 'Mild Demented', color: 'bg-amber-500' },
                  { label: 'Moderate Demented', key: 'Moderate Demented', color: 'bg-red-500' }
                ].map((item) => {
                  const count = stats.stageBreakdown[item.key] || 0;
                  const total = Object.values(stats.stageBreakdown).reduce((a: any, b: any) => a + b, 0) as number;
                  const percent = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={item.key} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-500">
                        <span>{item.label}</span>
                        <span className="text-[var(--sea-ink)]">{count} ({percent.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-500/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
