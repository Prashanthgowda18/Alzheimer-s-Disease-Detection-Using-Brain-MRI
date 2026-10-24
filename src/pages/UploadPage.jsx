import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { listPatients } from '../lib/patients.functions';
import { uploadAndPredict } from '../lib/predictions.client';

function UploadPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialPatientId = searchParams.get('patientId') || '';

  const [patients, setPatients] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(initialPatientId);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  // Pipeline status states
  const [status, setStatus] = useState('idle'); // 'idle' | 'uploading' | 'processing' | 'finalizing' | 'error' | 'success'
  const [errorMessage, setErrorMessage] = useState('');
  const [requestId, setRequestId] = useState('');

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await listPatients({ data: { limit: 100 } });
        setPatients(res.data || []);
        if (!selectedPatientId && res.data && res.data.length > 0) {
          setSelectedPatientId(res.data[0].id);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadPatients();
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setErrorMessage('');
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (selectedFile.size > maxBytes) {
      setErrorMessage('File size exceeds the 10 MB limit.');
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMime.includes(selectedFile.type)) {
      setErrorMessage('Invalid file format. Only JPEG, PNG and WEBP scans are accepted.');
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (status !== 'idle' && status !== 'error') return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedPatientId) {
      setErrorMessage('Please select a patient chart before uploading.');
      return;
    }
    if (!file) {
      setErrorMessage('Please choose or drop a brain scan file.');
      return;
    }
    setStatus('uploading');
    setErrorMessage('');
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('file', file);
      formData.append('patientId', selectedPatientId);
      const selPat = patients.find(p => p.id === selectedPatientId);
      if (selPat) {
        formData.append('patientName', selPat.patient_name);
      }

      // Simulate step delay slightly for better UX feel
      await new Promise(r => setTimeout(r, 600));

      setStatus('processing');
      const response = await uploadAndPredict({ data: formData });

      setStatus('finalizing');
      await new Promise(r => setTimeout(r, 700));

      setStatus('success');
      const targetId = response.id || response.predictionId;
      navigate(`/result/${targetId}`);
    } catch (err) {
      setStatus('error');
      setErrorMessage(err.message || 'An unexpected error occurred during prediction analysis.');
      if (err.request_id) {
        setRequestId(err.request_id);
      }
    }
  };

  const isUploading = status === 'uploading' || status === 'processing' || status === 'finalizing';

  return (
    <main className="demo-page px-4 py-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="demo-title text-3xl font-black">Scan Analysis</h1>
        <p className="demo-muted text-sm mt-1">Upload brain MRI scans and initiate diagnostic classifications</p>
      </div>

      <div className="demo-panel rounded-[2rem] p-6 sm:p-10 shadow-xl space-y-6">
        {/* Form Error */}
        {errorMessage && (
          <div className="demo-alert demo-alert-danger text-sm flex flex-col gap-1.5 shadow">
            <div className="flex items-center gap-2 font-bold text-red-700">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>Prediction Pipeline Failure</span>
            </div>
            <p className="text-slate-500 m-0">{errorMessage}</p>
            {requestId && (
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                Support ID: {requestId}
              </span>
            )}
          </div>
        )}

        {/* 1. Patient Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Target Patient Chart</label>
          {patients.length === 0 ? (
            <div className="text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              No patients registered. Please create a <a href="/patients" className="font-bold underline text-amber-700">patient profile</a> first.
            </div>
          ) : (
            <select
              disabled={isUploading}
              className="demo-select text-sm"
              value={selectedPatientId}
              onChange={(e) => setSelectedPatientId(e.target.value)}
            >
              {patients.map((pat) => (
                <option key={pat.id} value={pat.id}>
                  {pat.patient_name} ({pat.patient_id})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2. Drag & Drop File Zone */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Brain Scan File</label>
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition flex flex-col items-center justify-center min-h-[160px] ${
              file ? 'border-blue-500/40 bg-blue-500/5' : 'border-[var(--line)] bg-slate-500/5 hover:border-slate-500/25'
            } ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            onClick={() => !isUploading && document.getElementById('scan-upload-input')?.click()}
          >
            <input
              id="scan-upload-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />

            {previewUrl ? (
              <div className="relative group">
                <img src={previewUrl} alt="Scan Preview" className="max-h-40 rounded-xl border border-[var(--line)] shadow" />
                {!isUploading && (
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                    <span className="text-white text-xs font-bold">Replace Scan</span>
                  </div>
                )}
              </div>
            ) : (
              <>
                <svg className="w-10 h-10 text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm font-bold text-[var(--sea-ink)]">Drag and drop tomography scan image here</p>
                <p className="text-xs text-slate-400 mt-1">Supports JPEG, PNG, and WEBP formats up to 10 MB</p>
              </>
            )}
          </div>
        </div>

        {/* 3. Pipeline Tracker */}
        {isUploading && (
          <div className="border border-[var(--line)] bg-slate-500/5 rounded-2xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--sea-ink)] flex items-center gap-2">
              <div className="animate-spin inline-block w-3.5 h-3.5 border border-blue-500 border-t-transparent rounded-full" />
              Diagnostic Analysis Pipeline
            </h4>
            <div className="space-y-3 text-xs font-semibold text-slate-500">
              <div className="flex items-center justify-between">
                <span className={status === 'uploading' ? 'text-blue-500 font-bold' : status !== 'idle' && status !== 'error' ? 'text-emerald-500 font-bold' : ''}>1. Uploading scan image to storage bucket</span>
                {status !== 'uploading' && status !== 'idle' && status !== 'error' && (
                  <span className="text-emerald-500">✓</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className={status === 'processing' ? 'text-blue-500 font-bold' : status === 'finalizing' || status === 'success' ? 'text-emerald-500 font-bold' : ''}>2. Running ResNet50 classification inference</span>
                {(status === 'finalizing' || status === 'success') && (
                  <span className="text-emerald-500">✓</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className={status === 'finalizing' ? 'text-blue-500 font-bold' : status === 'success' ? 'text-emerald-500 font-bold' : ''}>3. Creating clinical logs &amp; notification alerts</span>
                {status === 'success' && (
                  <span className="text-emerald-500">✓</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex gap-4 pt-2">
          <button
            onClick={handleAnalyze}
            disabled={isUploading || !file || !selectedPatientId}
            className="demo-button bg-blue-600 hover:bg-blue-700 text-white font-bold flex-1 py-3 shadow-md justify-center"
          >
            {isUploading ? 'Running Analysis Pipeline...' : 'Run Diagnostics'}
          </button>

          <button
            disabled={isUploading}
            onClick={() => navigate('/dashboard')}
            className="demo-button demo-button-secondary px-6"
          >
            Cancel
          </button>
        </div>
      </div>
    </main>
  );
}

export default UploadPage;
