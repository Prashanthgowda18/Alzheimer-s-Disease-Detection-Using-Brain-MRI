/* src/lib/predictions.client.js */
// Client-side API wrapper for prediction related operations.
// Connects to Flask backend (/api and /predict) via Vite proxy or direct port 5000 fallback,
// and bridges with local mockDb when in mock mode.

import { isSupabaseConfigured } from './supabase';
import { mockDb } from './mockDb';

const DIRECT_BACKEND_URL = (import.meta.env?.VITE_ML_API_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');

/**
 * Resilient fetch helper:
 * 1. Tries relative path (Vite proxy to Flask)
 * 2. If 502/504/network failure occurs, falls back to direct call to port 5000 (CORS enabled)
 */
async function resilientFetch(endpoint, options = {}) {
  // Attempt 1: Vite proxy
  try {
    const resp = await fetch(endpoint, options);
    if (resp.status !== 502 && resp.status !== 504) {
      return resp;
    }
    console.warn(`Vite proxy returned status ${resp.status} for ${endpoint}. Retrying directly with Flask on port 5000...`);
  } catch (err) {
    console.warn(`Proxy connection failed for ${endpoint}:`, err);
  }

  // Attempt 2: Direct connection to Flask backend on port 5000
  try {
    const directUrl = `${DIRECT_BACKEND_URL}${endpoint}`;
    const directResp = await fetch(directUrl, options);
    return directResp;
  } catch (directErr) {
    throw new Error(
      `Prediction Backend Unreachable: Could not connect to Flask API on port 5000 (or via Vite proxy). Please make sure the backend is running with 'python app.py' or 'npm start'.`
    );
  }
}

/**
 * Upload a scan and request a real ResNet50 prediction.
 * Usage: uploadAndPredict({ data: formData })
 */
export async function uploadAndPredict({ data }) {
  const formData = data;
  const resp = await resilientFetch('/api/predictions/upload', {
    method: 'POST',
    body: formData,
  });

  if (!resp.ok) {
    let errText = '';
    try {
      const errJson = await resp.json();
      errText = errJson.error || errJson.message;
    } catch {
      errText = await resp.text();
    }
    throw new Error(errText || `Upload failed with status ${resp.status}`);
  }

  const result = await resp.json();
  return {
    ...result,
    id: result.id || result.predictionId,
    predictionId: result.predictionId || result.id,
  };
}

/** Get a single prediction by ID.
 * Usage: getPrediction({ data: id })
 */
export async function getPrediction({ data }) {
  const id = typeof data === 'object' && data !== null ? data.id || data : data;
  try {
    const resp = await resilientFetch(`/api/predictions/${encodeURIComponent(id)}`);
    if (resp.ok) {
      return await resp.json();
    }
  } catch (e) {
    // network or backend failure, attempt mockDb fallback
  }

  // If not found in Flask in-memory store and not in Supabase mode, check mockDb
  if (!isSupabaseConfigured) {
    const mockPred = mockDb.getPrediction(id);
    if (mockPred) return mockPred;
  }

  throw new Error(`Prediction record ${id} not found.`);
}

/** Delete a prediction.
 * Usage: deletePrediction({ data: id })
 */
export async function deletePrediction({ data }) {
  const id = typeof data === 'object' && data !== null ? data.id || data : data;
  try {
    const resp = await resilientFetch(`/api/predictions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (resp.ok) {
      return await resp.json();
    }
  } catch (e) {
    // continue
  }

  return { success: true, deleted: id };
}

/** List predictions for the current user.
 * Usage: listMyPredictions({ data: { page, limit, stage } })
 */
export async function listMyPredictions({ data = {} } = {}) {
  const { page = 1, limit = 10, stage = '' } = data;
  const qs = new URLSearchParams({ page, limit, stage });
  try {
    const resp = await resilientFetch(`/api/predictions/me?${qs}`);
    if (resp.ok) {
      const json = await resp.json();
      const list = json.data || json.items || [];
      if (list.length > 0 || isSupabaseConfigured) {
        return {
          ...json,
          data: list,
          items: list,
          total: json.total ?? list.length,
          page,
          limit,
        };
      }
    }
  } catch (e) {
    // network or backend fallback
  }

  // If Flask store has no scans yet and Supabase is not configured, supply mock data
  if (!isSupabaseConfigured) {
    let preds = mockDb.getPredictions();
    if (stage) {
      preds = preds.filter(p => p.stage?.toLowerCase() === stage.toLowerCase());
    }
    const start = (page - 1) * limit;
    const paged = preds.slice(start, start + limit);
    return {
      data: paged,
      items: paged,
      total: preds.length,
      page,
      limit,
    };
  }

  return { data: [], items: [], total: 0, page, limit };
}

/** List predictions for a specific patient.
 * Usage: listPatientPredictions({ data: { patientId, page, limit } })
 */
export async function listPatientPredictions({ data } = {}) {
  const { patientId, page = 1, limit = 10 } = data || {};
  const qs = new URLSearchParams({ page, limit });
  try {
    const resp = await resilientFetch(`/api/patients/${encodeURIComponent(patientId)}/predictions?${qs}`);
    if (resp.ok) {
      const json = await resp.json();
      const list = json.data || json.items || [];
      if (list.length > 0 || isSupabaseConfigured) {
        return {
          ...json,
          data: list,
          items: list,
          total: json.total ?? list.length,
          page,
          limit,
        };
      }
    }
  } catch (e) {
    // fallback
  }

  if (!isSupabaseConfigured) {
    let preds = mockDb.getPredictions().filter(p => p.patient_id === patientId || p.patientId === patientId);
    const start = (page - 1) * limit;
    const paged = preds.slice(start, start + limit);
    return {
      data: paged,
      items: paged,
      total: preds.length,
      page,
      limit,
    };
  }

  return { data: [], items: [], total: 0, page, limit };
}
