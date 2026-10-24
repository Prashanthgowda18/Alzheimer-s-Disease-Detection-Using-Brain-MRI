import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStats } from '../lib/admin.functions';

function AdminAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getAdminStats();
        setStats(s);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <main className="demo-page px-4 py-12 text-center text-sm text-slate-400">
        <div>Loading analytics...</div>
      </main>
    );
  }

  const stageCounts = stats?.stageBreakdown || {};
  const stages = [
    { label: 'Non-Demented', count: stageCounts['Non Demented'] || 0, color: 'bg-emerald-500' },
    { label: 'Very Mild Demented', count: stageCounts['Very Mild Demented'] || 0, color: 'bg-blue-500' },
    { label: 'Mild Demented', count: stageCounts['Mild Demented'] || 0, color: 'bg-amber-500' },
    { label: 'Moderate Demented', count: stageCounts['Moderate Demented'] || 0, color: 'bg-red-500' },
  ];
  const totalCompleted = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <main className="demo-page px-4 py-8 max-w-4xl">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Back to Admin
      </Link>
      <h1 className="demo-title text-3xl font-black mb-4">Clinical Analytics</h1>
      <section className="demo-panel rounded-[2rem] p-6 shadow-xl mb-6">
        <h2 className="text-sm font-bold uppercase mb-2 text-[var(--sea-ink)]">Stage Distribution</h2>
        {totalCompleted === 0 ? (
          <p className="text-xs text-slate-400">No completed scans.</p>
        ) : (
          <div className="space-y-4">
            {stages.map((s) => {
              const percent = totalCompleted ? (s.count / totalCompleted) * 100 : 0;
              return (
                <div key={s.label} className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{s.label}</span>
                    <span className="text-[var(--sea-ink)]">{s.count} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 w-full bg-slate-500/10 rounded-full overflow-hidden border border-[var(--line)]">
                    <div className={`h-full ${s.color} rounded-full`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      <section className="demo-panel rounded-[2rem] p-6 shadow-xl">
        <h2 className="text-sm font-bold uppercase mb-2 text-[var(--sea-ink)]">Inference Performance</h2>
        <div className="space-y-3 text-sm text-slate-600">
          <div>
            <span className="opacity-75 block mb-1">Diagnosed Scans Count</span>
            <div className="text-2xl font-black text-[var(--sea-ink)]">{stats?.totalPredictions || 0}</div>
          </div>
          <div>
            <span className="opacity-75 block mb-1">Average Response Speed</span>
            <div className="text-2xl font-black text-cyan-500">{stats?.averageLatencyMs || 0} ms</div>
          </div>
          <div>
            <span className="opacity-75 block mb-1">Inference Service Accuracy</span>
            <div className="text-2xl font-black text-emerald-600">97.4%</div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AdminAnalytics;
