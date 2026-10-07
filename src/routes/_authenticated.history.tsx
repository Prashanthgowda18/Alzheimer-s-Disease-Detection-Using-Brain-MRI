import React, { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { listMyPredictions } from '../lib/predictions.functions';

export const Route = createFileRoute('/_authenticated/history')({
  component: HistoryPage,
});

function HistoryPage() {
  const navigate = useNavigate();
  const searchParams: any = useSearch({ strict: false });

  const [page, setPage] = useState(Number(searchParams.page) || 1);
  const [stage, setStage] = useState(searchParams.stage || '');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const limit = 10;

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await listMyPredictions({ data: { page, limit, stage } });
      setPredictions(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    navigate({
      search: {
        page: page > 1 ? page : undefined,
        stage: stage || undefined
      },
      replace: true
    });
  }, [page, stage]);

  const handleStageFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStage(e.target.value);
    setPage(1); // Reset page on filter
  };

  const getStageColorClass = (itemStage: string) => {
    switch (itemStage?.toLowerCase()) {
      case 'non demented':
        return 'text-emerald-500 font-bold';
      case 'very mild demented':
        return 'text-blue-500 font-bold';
      case 'mild demented':
        return 'text-amber-500 font-bold';
      case 'moderate demented':
        return 'text-red-500 font-bold';
      default:
        return 'text-slate-500';
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="demo-page px-4 py-8">
      {/* Title */}
      <div className="mb-8">
        <h1 className="demo-title text-3xl font-black">Inference History</h1>
        <p className="demo-muted text-sm mt-1">Audit log of all neural network predictions and tomography scan files</p>
      </div>

      {/* Filters and List */}
      <div className="demo-panel rounded-[2rem] p-6 shadow-xl space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="w-full sm:w-64">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Filter by Alzheimer Stage
            </label>
            <select
              className="demo-select text-sm"
              value={stage}
              onChange={handleStageFilterChange}
            >
              <option value="">All Stages</option>
              <option value="Non Demented">Non Demented</option>
              <option value="Very Mild Demented">Very Mild Demented</option>
              <option value="Mild Demented">Mild Demented</option>
              <option value="Moderate Demented">Moderate Demented</option>
            </select>
          </div>
        </div>

        {/* Table list */}
        <div className="demo-table-shell">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
              <div>Loading predictions list...</div>
            </div>
          ) : predictions.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              No historical records match this filter.
            </div>
          ) : (
            <table className="demo-table text-sm">
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Status</th>
                  <th>Diagnosed Stage</th>
                  <th>Confidence</th>
                  <th>Analysis Latency</th>
                  <th>Date Analyzed</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((scan) => (
                  <tr key={scan.id}>
                    <td className="font-bold text-[var(--sea-ink)]">
                      <Link to={`/patients/${scan.patient_id}`} className="hover:underline text-[var(--sea-ink)]">
                        {scan.patient_name}
                      </Link>
                    </td>
                    <td>
                      <span className={`capitalize font-bold ${scan.status === 'completed' ? 'text-emerald-500' : scan.status === 'processing' ? 'text-cyan-500 animate-pulse' : 'text-red-500'}`}>
                        {scan.status}
                      </span>
                    </td>
                    <td>
                      {scan.status === 'completed' ? (
                        <span className={getStageColorClass(scan.stage)}>
                          {scan.stage}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td>
                      {scan.status === 'completed' ? `${((scan.confidence ?? 0) * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td>
                      {scan.status === 'completed' ? `${scan.processing_ms} ms` : '—'}
                    </td>
                    <td>{new Date(scan.created_at).toLocaleString()}</td>
                    <td className="text-right">
                      {scan.status === 'completed' ? (
                        <Link
                          to={`/result/${scan.id}`}
                          className="demo-button demo-button-secondary text-xs px-3 py-1.5"
                        >
                          View Report
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
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
              Showing page {page} of {totalPages} ({total} records)
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
