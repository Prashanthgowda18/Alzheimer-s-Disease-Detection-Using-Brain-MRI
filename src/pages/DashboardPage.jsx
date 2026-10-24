import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDoctorStats } from '../lib/admin.functions';
import { listMyPredictions } from '../lib/predictions.client';

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await getDoctorStats();
        setStats(s);
        const r = await listMyPredictions({ data: { limit: 5 } });
        // Deduplicate by id to avoid duplicates
        const uniq = [];
        const seen = new Set();
        (r.data || []).forEach(item => {
          if (item.id && !seen.has(item.id)) {
            seen.add(item.id);
            uniq.push(item);
          }
        });
        setRecentScans(uniq);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="demo-page px-4 py-12 text-center">Loading dashboard...</div>;
  }

  return (
    <main className="demo-page px-4 py-8">
      <h1 className="demo-title text-3xl font-black mb-4">Dashboard</h1>
      {/* Statistics cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="demo-panel rounded-2xl p-5 shadow">
          <h2 className="text-sm font-medium mb-1">Total Patients</h2>
          <p className="text-2xl font-bold">{stats?.totalPatients ?? 0}</p>
        </div>
        <div className="demo-panel rounded-2xl p-5 shadow">
          <h2 className="text-sm font-medium mb-1">Total Predictions</h2>
          <p className="text-2xl font-bold">{stats?.totalPredictions ?? 0}</p>
        </div>
        <div className="demo-panel rounded-2xl p-5 shadow">
          <h2 className="text-sm font-medium mb-1">Completed Predictions</h2>
          <p className="text-2xl font-bold">{stats?.completedPredictions ?? 0}</p>
        </div>
        <div className="demo-panel rounded-2xl p-5 shadow">
          <h2 className="text-sm font-medium mb-1">Failed Predictions</h2>
          <p className="text-2xl font-bold">{stats?.failedPredictions ?? 0}</p>
        </div>
      </div>

      {/* Recent scans */}
      <h2 className="demo-title text-2xl font-bold mb-2">Recent Scans</h2>
      {recentScans.length === 0 ? (
        <p className="text-slate-400">No recent scans available.</p>
      ) : (
        <ul className="space-y-2">
          {recentScans.map(scan => (
            <li key={scan.id} className="demo-panel rounded p-3 shadow flex justify-between items-center">
              <div>
                <p className="font-medium text-blue-600 hover:underline">
                  <Link to={`/result/${scan.id}`}>{scan.patient_name ?? 'Unknown Patient'}</Link>
                </p>
                <p className="text-sm text-slate-300">Stage: {scan.stage ?? 'Pending'}</p>
                {scan.created_at && (
                  <p className="text-xs text-slate-400">{new Date(scan.created_at).toLocaleDateString()}</p>
                )}
                {typeof scan.confidence === 'number' && (
                  <p className="text-xs text-slate-400">Confidence: {(scan.confidence * 100).toFixed(1)}%</p>
                )}
              </div>
              <Link to={`/result/${scan.id}`} className="demo-button bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded">
                View Result
              </Link>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4">
        <Link to="/inference-history" className="demo-button bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
          View All
        </Link>
      </div>
    </main>
  );
}

export default DashboardPage;
