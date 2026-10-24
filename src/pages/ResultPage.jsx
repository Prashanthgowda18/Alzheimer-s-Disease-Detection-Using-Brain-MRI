import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getPrediction, deletePrediction } from '../lib/predictions.client';
import { generateDiagnosticPdf } from '../lib/pdf';
import { getActiveUser } from '../lib/auth';

function ResultPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [prediction, setPrediction] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const u = await getActiveUser();
      setCurrentUser(u);
      const res = await getPrediction({ data: id });
      setPrediction(res);
    } catch (err) {
      setError(err.message || 'Failed to retrieve diagnostic prediction record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleDownloadPdf = async () => {
    if (!prediction || !currentUser) return;
    setPdfGenerating(true);
    try {
      const currentUrl = window.location.origin + `/result/${prediction.id}`;
      await generateDiagnosticPdf({
        patientName: prediction.patient_name,
        patientMrn: prediction.patient_mrn || prediction.patient_id,
        patientDob: prediction.patient_dob || 'N/A',
        patientGender: prediction.patient_gender || 'other',
        doctorName: currentUser.full_name,
        hospitalName: currentUser.hospital_name || 'St. Mary Neurological Clinic',
        scanDate: prediction.created_at,
        stage: prediction.stage || 'N/A',
        confidence: prediction.confidence || 0,
        confidenceLevel: prediction.confidence_level || 'N/A',
        recommendation: prediction.recommendation_display || prediction.recommendation_api || '',
        modelName: prediction.model_name || 'ResNet50',
        modelVersion: prediction.model_version || '1.0',
        resultUrl: currentUrl,
        scanImageUrl: prediction.signed_image_url || prediction.image_path,
      });
    } catch (err) {
      console.error('Failed to generate report PDF', err);
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleDeleteRecord = async () => {
    if (!window.confirm('Are you sure you want to permanently delete this diagnostic prediction record? This cannot be undone.')) {
      return;
    }
    setDeleting(true);
    try {
      await deletePrediction({ data: id });
      navigate(`/patients/${prediction.patient_id}`);
    } catch (err) {
      alert(err.message || 'Failed to delete record.');
    } finally {
      setDeleting(false);
    }
  };

  const getStageColorClass = (stage) => {
    switch (stage?.toLowerCase()) {
      case 'non demented':
        return 'text-emerald-500';
      case 'very mild demented':
        return 'text-blue-500';
      case 'mild demented':
        return 'text-amber-500';
      case 'moderate demented':
        return 'text-red-500';
      default:
        return 'text-slate-500';
    }
  };

  if (loading) {
    return (
      <main className="demo-page px-4 py-12 text-center text-sm text-slate-400">
        <div className="animate-spin inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full mb-3"></div>
        <div>Retrieving diagnostic prediction details...</div>
      </main>
    );
  }

  if (error || !prediction) {
    return (
      <main className="demo-page px-4 py-12 max-w-xl mx-auto">
        <div className="demo-alert demo-alert-danger text-center shadow-md">
          <h3 className="font-extrabold text-red-700 text-lg mb-2">Error Retrieval</h3>
          <p className="text-sm mb-4">{error || 'Diagnostic record could not be loaded.'}</p>
          <Link to="/patients" className="demo-button demo-button-secondary text-xs">Return to Registry</Link>
        </div>
      </main>
    );
  }

  const rawProbs = prediction.probabilities || {};
  const probList = [
    { label: 'Non-Demented', key: 'NonDemented', color: 'bg-emerald-500' },
    { label: 'Very Mild Demented', key: 'VeryMildDemented', color: 'bg-blue-500' },
    { label: 'Mild Demented', key: 'MildDemented', color: 'bg-amber-500' },
    { label: 'Moderate Demented', key: 'ModerateDemented', color: 'bg-red-500' },
  ].map(p => ({ ...p, value: rawProbs[p.key] || 0 })).sort((a, b) => b.value - a.value);

  return (
    <main className="demo-page px-4 py-8 max-w-5xl">
      <Link to={prediction.patient_id ? `/patients/${prediction.patient_id}` : '/patients'} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-500 transition mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Back to Patients
      </Link>

      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="demo-pill border-emerald-500/25 bg-emerald-500/10 text-emerald-600 text-[10px] mb-2">Analysis Complete</span>
          <h1 className="demo-title text-3xl font-black">Diagnostic Results</h1>
          <p className="demo-muted text-sm mt-1">Classification report and neural network confidence metrics</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={handleDownloadPdf} disabled={pdfGenerating} className="demo-button bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 text-xs shadow flex-1 sm:flex-initial justify-center items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            {pdfGenerating ? 'Generating PDF...' : 'Download PDF Report'}
          </button>
          <button onClick={handleDeleteRecord} disabled={deleting} className="demo-button demo-button-danger px-4 py-2 text-xs font-bold flex-1 sm:flex-initial justify-center items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            Delete Record
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Side: Scan & Demographics */}
        <div className="lg:col-span-1 space-y-6">
          {/* Patient Details */}
          <div className="demo-panel rounded-[1.75rem] p-5 shadow-lg space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--sea-ink)] border-b border-[var(--line)] pb-2">Patient Info</h3>
            <div className="space-y-2 text-xs font-semibold text-slate-500">
              <div className="flex justify-between"><span className="opacity-70">Name:</span><span className="text-[var(--sea-ink)] font-bold">{prediction.patient_name}</span></div>
              <div className="flex justify-between"><span className="opacity-70">MRN:</span><span className="text-[var(--sea-ink)] font-bold">{prediction.patient_mrn || prediction.patient_id}</span></div>
              <div className="flex justify-between"><span className="opacity-70">DOB:</span><span className="text-[var(--sea-ink)]">{prediction.patient_dob || 'N/A'}</span></div>
              <div className="flex justify-between"><span className="opacity-70">Gender:</span><span className="text-[var(--sea-ink)] capitalize">{prediction.patient_gender || 'other'}</span></div>
            </div>
          </div>
          {/* CT Scan Preview */}
          <div className="demo-panel rounded-[1.75rem] p-5 shadow-lg">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--sea-ink)] border-b border-[var(--line)] pb-2 mb-4">Diagnostic Tomography</h3>
            <div className="border border-[var(--line)] bg-black rounded-2xl overflow-hidden shadow max-h-72 aspect-square flex items-center justify-center">
              {prediction.signed_image_url || prediction.image_path?.startsWith('/') ? (
                <img src={prediction.signed_image_url || prediction.image_path} alt="Patient Tomography Scan" className="max-h-full object-contain" />
              ) : (
                <div className="text-center p-8 text-xs text-slate-400">
                  <svg className="w-10 h-10 mx-auto mb-2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                  Scan file resides in private secure bucket.
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Right Side: Prediction results */}
        <div className="lg:col-span-2 space-y-6">
          {/* Diagnostic Stage */}
          <div className="demo-panel rounded-[1.75rem] p-6 sm:p-8 shadow-lg">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Neural Net Prediction Output</h3>
            <h2 className={`text-3xl font-black ${getStageColorClass(prediction.stage)} mb-4`}>{prediction.stage}</h2>
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-500 bg-slate-500/5 rounded-2xl p-4 border border-[var(--line)]">
              <div>
                <span className="opacity-70 block mb-0.5">Classification Confidence</span>
                <span className="text-lg font-bold text-[var(--sea-ink)]">{((prediction.confidence ?? 0) * 100).toFixed(1)}%</span>
              </div>
              <div>
                <span className="opacity-70 block mb-0.5">Confidence Tier</span>
                <span className="text-lg font-bold text-[var(--sea-ink)]">{prediction.confidence_level}</span>
              </div>
            </div>
          </div>
          {/* Class Probabilities Bar Chart */}
          <div className="demo-panel rounded-[1.75rem] p-6 sm:p-8 shadow-lg space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--sea-ink)] border-b border-[var(--line)] pb-2 mb-4">Classification Probabilities</h3>
            <div className="space-y-4">
              {probList.map((prob) => (
                <div key={prob.key} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold"><span className="text-[var(--sea-ink)]">{prob.label}</span><span className="text-slate-400">{(prob.value * 100).toFixed(2)}%</span></div>
                  <div className="h-2.5 w-full bg-slate-500/10 rounded-full overflow-hidden border border-[var(--line)]">
                    <div className={`h-full ${prob.color} rounded-full transition-all duration-1000 ease-out shadow-sm`} style={{ width: `${prob.value * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {prediction.probability_warning && (
              <div className="demo-alert text-xs border-amber-500/25 bg-amber-500/5 text-amber-500 mt-4 flex items-center gap-1.5">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
                <span>Probability values sum does not equal 1.0 (drift warning recorded).</span>
              </div>
            )}
          </div>
          {/* Recommendations Box */}
          <div className="demo-panel rounded-[1.75rem] p-6 sm:p-8 shadow-lg space-y-4 bg-gradient-to-br from-blue-500/5 to-transparent">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--sea-ink)] border-b border-[var(--line)] pb-2">Attending Physician & Recommendations</h3>
            <p className="text-sm text-slate-500 leading-relaxed font-semibold">
              {prediction.recommendation_display || prediction.recommendation_api || 'Schedule immediate neurological evaluation for corroborative cognitive tests.'}
            </p>
            <div className="pt-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider flex justify-between border-t border-[var(--line)]">
              <span>Model Classifier: {prediction.model_name || 'ResNet50'}</span>
              <span>Model Version: {prediction.model_version || '1.0'}</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default ResultPage;
