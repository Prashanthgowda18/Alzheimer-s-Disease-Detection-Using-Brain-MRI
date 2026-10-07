import React, { useEffect, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { getDoctorStats } from '../lib/admin.functions';
import { listMyPredictions } from '../lib/predictions.functions';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DoctorDashboard,
});

function DoctorDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const s = await getDoctorStats();
      setStats(s);

      const r = await listMyPredictions({ data: { limit: 5 } });
      setRecentScans(r.data || []);
    } catch (err) {
      console.error('Failed to load dashboard statistics', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getStageColorClass = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'non demented':
        return 'text-emerald-500 font-bold';
      case 'very mild demented':
        return 'text-blue-500 font-bold';
      case 'mild demented':
        return 'text-amber-500 font-bold';
      case 'moderate demented':
        return 'text-red-500 font-bold';
      default:
        return 'text-slate-500 font-bold';
    }
  };

  if (loading) {
    return (
      <main className="demo-page px-4 py-12 text-center text-sm text-slate-400">
        <div className="animate-spin inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mb-3"></div>
        <div>Loading doctor clinical dashboard...</div>
      </main>
    );
  }

  const stageCounts = stats?.stageBreakdown || {};
  const totalCompleted = stats?.completedPredictions || 0;

  return (
    <main className="demo-page px-4 py-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="demo-title text-3xl font-black">Doctor Dashboard</h1>
          <p className="demo-muted text-sm mt-1">Clinical overview of scans, diagnostics and patients</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/patients"
            className="demo-button demo-button-secondary text-xs"
          >
            Add Patient
          </Link>
          <Link
            to="/upload"
            className="demo-button bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2"
          >
            Analyze MRI Scan
          </Link>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <article className="demo-panel rounded-2xl p-5 shadow flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Registered Patients</span>
            <h3 className="text-2xl font-black text-[var(--sea-ink)] mt-1">{stats?.totalPatients || 0}</h3>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
        </article>

        <article className="demo-panel rounded-2xl p-5 shadow flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Scans Submitted</span>
            <h3 className="text-2xl font-black text-[var(--sea-ink)] mt-1">{stats?.totalPredictions || 0}</h3>
          </div>
          <div className="p-3 bg-cyan-500/10 text-cyan-500 rounded-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
        </article>

        <article className="demo-panel rounded-2xl p-5 shadow flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Successful Predictions</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{totalCompleted}</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </article>

        <article className="demo-panel rounded-2xl p-5 shadow flex justify-between items-center">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">Failed Analysis Runs</span>
            <h3 className="text-2xl font-black text-red-600 mt-1">{stats?.failedPredictions || 0}</h3>
          </div>
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </article>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left: Diagnose statistics distribution */}
        <section className="lg:col-span-1 space-y-6">
          <div className="demo-panel rounded-[2rem] p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--sea-ink)] border-b border-[var(--line)] pb-2">
              Diagnosis Breakdown
            </h3>
            
            {totalCompleted === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No classified patient records available.</p>
            ) : (
              <div className="space-y-4">
                {[
                  { label: 'Non-Demented', key: 'Non Demented', color: 'bg-emerald-500' },
                  { label: 'Very Mild Demented', key: 'Very Mild Demented', color: 'bg-blue-500' },
                  { label: 'Mild Demented', key: 'Mild Demented', color: 'bg-amber-500' },
                  { label: 'Moderate Demented', key: 'Moderate Demented', color: 'bg-red-500' }
                ].map((item) => {
                  const count = stageCounts[item.key] || 0;
                  const percent = totalCompleted > 0 ? (count / totalCompleted) * 100 : 0;
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

        {/* Right: Recent Scans list */}
        <section className="lg:col-span-2 space-y-6">
          <div className="demo-panel rounded-[2rem] p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b border-[var(--line)] pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--sea-ink)]">
                Recent Diagnostics
              </h3>
              <Link to="/history" className="text-xs text-blue-500 hover:underline">
                View All Scans
              </Link>
            </div>

            <div className="demo-table-shell">
              {recentScans.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No scans analyzed recently.</p>
              ) : (
                <table className="demo-table text-xs">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Stage Result</th>
                      <th>Confidence</th>
                      <th>Submitted</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentScans.map((scan) => (
                      <tr key={scan.id}>
                        <td className="font-bold text-[var(--sea-ink)]">
                          <Link to={`/patients/${scan.patient_id}`} className="hover:underline text-[var(--sea-ink)]">
                            {scan.patient_name}
                          </Link>
                        </td>
                        <td>
                          {scan.status === 'completed' ? (
                            <span className={getStageColorClass(scan.stage)}>
                              {scan.stage}
                            </span>
                          ) : scan.status === 'processing' ? (
                            <span className="text-cyan-500 animate-pulse font-semibold">Processing...</span>
                          ) : (
                            <span className="text-red-500 font-semibold">Failed</span>
                          )}
                        </td>
                        <td>
                          {scan.status === 'completed' ? `${((scan.confidence ?? 0) * 100).toFixed(1)}%` : 'N/A'}
                        </td>
                        <td>{new Date(scan.created_at).toLocaleDateString()}</td>
                        <td className="text-right">
                          {scan.status === 'completed' && (
                            <Link
                              to={`/result/${scan.id}`}
                              className="demo-button demo-button-secondary text-[10px] px-2 py-1"
                            >
                              Report
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
