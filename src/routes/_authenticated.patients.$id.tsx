import React, { useEffect, useState } from 'react';
import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { getPatient } from '../lib/patients.functions';
import { listPatientPredictions } from '../lib/predictions.functions';

export const Route = createFileRoute('/_authenticated/patients/$id')({
  component: PatientDetailsPage,
});

function PatientDetailsPage() {
  const { id } = useParams({ from: '/_authenticated/patients/$id' });

  const [patient, setPatient] = useState<any>(null);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const pat = await getPatient({ data: id });
      setPatient(pat);

      const preds = await listPatientPredictions({ data: { patientId: id } });
      setPredictions(preds.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to retrieve patient chart details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const calculateAge = (dobString: string) => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    const diffMs = Date.now() - dob.getTime();
    const ageDate = new Date(diffMs);
    return Math.abs(ageDate.getUTCFullYear() - 1970);
  };

  const getStageBadgeClass = (stage: string) => {
    switch (stage?.toLowerCase()) {
      case 'non demented':
        return 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600';
      case 'very mild demented':
        return 'border-blue-500/25 bg-blue-500/10 text-blue-600';
      case 'mild demented':
        return 'border-amber-500/25 bg-amber-500/10 text-amber-600';
      case 'moderate demented':
        return 'border-red-500/25 bg-red-500/10 text-red-600';
      default:
        return 'border-slate-500/25 bg-slate-500/10 text-slate-600';
    }
  };

  if (loading) {
    return (
      <main className="demo-page px-4 py-12 text-center text-sm text-slate-400">
        <div className="animate-spin inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mb-3"></div>
        <div>Loading patient details and timelines...</div>
      </main>
    );
  }

  if (error || !patient) {
    return (
      <main className="demo-page px-4 py-12 max-w-xl mx-auto">
        <div className="demo-alert demo-alert-danger text-center shadow-md">
          <h3 className="font-extrabold text-red-700 text-lg mb-2">Error Retrieval</h3>
          <p className="text-sm mb-4">{error || 'Patient chart could not be loaded.'}</p>
          <Link to="/patients" className="demo-button demo-button-secondary text-xs">
            Return to Registry
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="demo-page px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Link
        to="/patients"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition mb-6"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Patient Registry
      </Link>

      {/* Patient Summary Card */}
      <section className="demo-panel rounded-[2rem] p-6 sm:p-8 shadow-xl mb-8 flex flex-col md:flex-row justify-between gap-6">
        <div>
          <span className="demo-pill border-blue-500/35 bg-blue-500/10 text-blue-500 text-[10px] mb-3">
            Active Chart
          </span>
          <h1 className="demo-title text-3xl font-black">{patient.patient_name}</h1>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 text-sm text-slate-500 font-semibold">
            <span className="flex items-center gap-1">
              <strong>MRN:</strong> {patient.patient_id}
            </span>
            <span className="flex items-center gap-1">
              <strong>DOB:</strong> {patient.date_of_birth} ({calculateAge(patient.date_of_birth)} yrs)
            </span>
            <span className="flex items-center gap-1">
              <strong>Gender:</strong> <span className="capitalize">{patient.gender}</span>
            </span>
          </div>
        </div>

        <div className="flex items-end">
          <Link
            to="/upload"
            search={{ patientId: patient.id }}
            className="demo-button bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 shadow-md flex items-center gap-2 w-full md:w-auto justify-center"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload Diagnostic CT
          </Link>
        </div>
      </section>

      {/* Diagnostics Timeline */}
      <section>
        <h2 className="text-xl font-extrabold text-[var(--sea-ink)] mb-6">Longitudinal Diagnostic History</h2>

        {predictions.length === 0 ? (
          <div className="demo-panel rounded-2xl p-10 text-center text-slate-400">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            <p className="text-sm mb-4">No diagnostic scans recorded for this patient.</p>
            <Link
              to="/upload"
              search={{ patientId: patient.id }}
              className="demo-button demo-button-secondary text-xs"
            >
              Analyze First Scan
            </Link>
          </div>
        ) : (
          <div className="relative pl-6 sm:pl-8 border-l border-[var(--line)] space-y-6">
            {predictions.map((pred) => (
              <div key={pred.id} className="relative group">
                {/* Timeline node */}
                <span className="absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border border-[var(--line)] bg-[var(--bg-base)] flex items-center justify-center">
                  <span className={`w-2 h-2 rounded-full ${pred.status === 'completed' ? 'bg-blue-500' : pred.status === 'processing' ? 'bg-cyan-400 animate-pulse' : 'bg-red-500'}`} />
                </span>

                <div className="demo-panel rounded-[1.5rem] p-5 shadow transition group-hover:-translate-x-0.5 group-hover:border-slate-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {pred.status === 'completed' ? (
                          <>
                            <span className={`demo-pill border ${getStageBadgeClass(pred.stage)}`}>
                              {pred.stage}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              Confidence: {((pred.confidence ?? 0) * 100).toFixed(1)}%
                            </span>
                          </>
                        ) : pred.status === 'processing' ? (
                          <span className="demo-pill border border-cyan-500/25 bg-cyan-500/10 text-cyan-600 animate-pulse">
                            Processing Scan...
                          </span>
                        ) : (
                          <span className="demo-pill border border-red-500/25 bg-red-500/10 text-red-600">
                            Prediction Failed
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto sm:ml-0">
                          {new Date(pred.created_at).toLocaleString()}
                        </span>
                      </div>

                      {pred.status === 'completed' && (
                        <p className="text-xs text-slate-500 leading-relaxed max-w-2xl m-0">
                          {pred.recommendation_api || pred.recommendation_display}
                        </p>
                      )}

                      {pred.status === 'failed' && (
                        <p className="text-xs text-red-500 font-semibold m-0 flex items-center gap-1">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                          Reason: {pred.error_message || 'Connection timeout to CNN API.'}
                        </p>
                      )}
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-2">
                      {pred.status === 'completed' && (
                        <Link
                          to={`/result/${pred.id}`}
                          className="demo-button bg-blue-600 hover:bg-blue-700 text-white text-xs px-3.5 py-2 font-bold flex items-center gap-1"
                        >
                          View Diagnostics
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
