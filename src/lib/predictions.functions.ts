import { createServerFn } from '@tanstack/react-start';
import { getActiveUser } from './auth';
import { isSupabaseConfigured, supabase } from './supabase';
import { mockDb } from './mockDb';

const ML_API_URL = process.env.ML_API_URL || '';
const ML_API_KEY = process.env.ML_API_KEY || '';

const ERROR_MAP: Record<number, string> = {
  400: "The uploaded image could not be processed. Please try a different file.",
  401: "AI service authentication failed. Please contact the administrator.",
  404: "AI service endpoint unavailable. Please try again later.",
  408: "Prediction timed out. Please try again.",
  429: "AI service is busy. Please try again in a moment.",
  500: "AI service encountered an internal error. Please try again.",
  503: "AI service is currently unavailable. Please try again later."
};

export const listPatientPredictions = createServerFn({ method: 'GET' })
  .validator((d: { patientId: string; page?: number; limit?: number }) => d)
  .handler(async ({ data }) => {
    const user = await getActiveUser();
    const page = data.page || 1;
    const limit = data.limit || 10;
    const start = (page - 1) * limit;

    if (!isSupabaseConfigured) {
      const preds = mockDb.getPredictions()
        .filter(p => p.patient_id === data.patientId);
      const total = preds.length;
      return {
        data: preds.slice(start, start + limit),
        total,
        page,
        limit
      };
    }

    let query = supabase
      .from('predictions')
      .select('*', { count: 'exact' })
      .eq('patient_id', data.patientId);

    if (user.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }

    const { data: dbData, count, error } = await query
      .order('created_at', { ascending: false })
      .range(start, start + limit - 1);

    if (error) throw new Error(error.message);

    return {
      data: dbData || [],
      total: count || 0,
      page,
      limit
    };
  });

export const listMyPredictions = createServerFn({ method: 'GET' })
  .validator((d: { page?: number; limit?: number; stage?: string } | undefined) => d)
  .handler(async ({ data }) => {
    const user = await getActiveUser();
    const page = data?.page || 1;
    const limit = data?.limit || 10;
    const stage = data?.stage || '';
    const start = (page - 1) * limit;

    if (!isSupabaseConfigured) {
      let preds = mockDb.getPredictions();
      if (stage) {
        preds = preds.filter(p => p.stage === stage);
      }
      const total = preds.length;
      return {
        data: preds.slice(start, start + limit),
        total,
        page,
        limit
      };
    }

    // Join patient details using select
    let query = supabase
      .from('predictions')
      .select('*, patients(patient_name)', { count: 'exact' });

    if (user.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }

    if (stage) {
      query = query.eq('stage', stage);
    }

    const { data: dbData, count, error } = await query
      .order('created_at', { ascending: false })
      .range(start, start + limit - 1);

    if (error) throw new Error(error.message);

    const formattedData = (dbData || []).map(d => ({
      ...d,
      patient_name: (d as any).patients?.patient_name || 'Unknown Patient'
    }));

    return {
      data: formattedData,
      total: count || 0,
      page,
      limit
    };
  });

export const getPrediction = createServerFn({ method: 'GET' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const user = await getActiveUser();

    if (!isSupabaseConfigured) {
      const pred = mockDb.getPrediction(id);
      if (!pred) throw new Error('Prediction not found');
      console.log('Prediction Object:', pred);
      console.log('Image URL:', pred.image_path);
      return pred;
    }

    let query = supabase
      .from('predictions')
      .select('*, patients(patient_name, patient_id, date_of_birth, gender)')
      .eq('id', id);

    if (user.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }

    const { data: pred, error } = await query.maybeSingle();
    if (error || !pred) throw new Error('Prediction not found');

    // Create a temporary signed URL for the scan image to serve privately
    const { data: signedUrlData } = await supabase.storage
      .from('mri-scans')
      .createSignedUrl((pred as any).image_path, 3600);

    const result = {
      ...pred,
      patient_name: (pred as any).patients?.patient_name || 'Unknown Patient',
      patient_mrn: (pred as any).patients?.patient_id || '',
      patient_dob: (pred as any).patients?.date_of_birth || '',
      patient_gender: (pred as any).patients?.gender || 'other',
      signed_image_url: signedUrlData?.signedUrl || null,
    };

    console.log('Prediction Object:', result);
    console.log('Image URL:', result.signed_image_url || result.image_path);

    return result;
  });

export const uploadAndPredict = createServerFn({ method: 'POST' })
  .validator((d: FormData) => d)
  .handler(async ({ data: formData }) => {
    const user = await getActiveUser();
    
    // Extract file details
    const file = formData.get('file') as File;
    const patientId = formData.get('patientId') as string;

    if (!file || !patientId) {
      throw new Error('Image scan file and Patient reference are required');
    }

    // File validation
    const maxBytes = 10 * 1024 * 1024; // 10MB
    if (file.size > maxBytes) {
      throw new Error('File exceeds the 10 MB maximum limit.');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WEBP scans are accepted.');
    }

    const requestId = crypto.randomUUID();

    // Read ML_API_URL dynamically inside the handler to prevent import-time caching
    const mlApiUrl = process.env.ML_API_URL || '';
    const mlApiKey = process.env.ML_API_KEY || '';

    // Log the ML_API_URL value (masking sensitive parts)
    const maskedUrl = mlApiUrl ? mlApiUrl.replace(/^(https?:\/\/)([^@]+@)?([^:/]+)/, '$1***$3') : 'Not Configured';
    console.log(`Resolved ML_API_URL: ${maskedUrl}`);

    const isLocalHost = mlApiUrl.includes('localhost') || mlApiUrl.includes('127.0.0.1');
    const localExplanation = isLocalHost ? ' (Note: A deployed frontend cannot access a local localhost/127.0.0.1 Flask server. Please make sure the service is publicly accessible if deploying to production.)' : '';

    // DEMO / FALLBACK MODE
    if (!isSupabaseConfigured) {
      // Simulate rate limits
      const recentLogs = mockDb.getAuditLogs()
        .filter(l => l.user_id === user.id && l.action === 'upload_scan' && (Date.now() - new Date(l.created_at).getTime() < 60000));
      if (recentLogs.length >= 30) {
        throw new Error('Rate limit exceeded. Max 30 uploads per minute.');
      }

      // If secret is missing, display clear setup message
      if (!mlApiUrl) {
        throw new Error('Missing ML_API_URL: Please set the ML_API_URL environment variable in a .env file and restart the server.');
      }

      // Add prediction placeholder
      const fileExt = file.name.split('.').pop() || 'jpg';
      const tempPath = `/demo-scans/${requestId}.${fileExt}`;
      
      // Save scan file locally to public folder so it can be previewed without broken URLs
      try {
        const fs = await import('fs');
        const path = await import('path');
        const publicDir = path.resolve('public');
        const demoScansDir = path.join(publicDir, 'demo-scans');
        
        if (!fs.existsSync(demoScansDir)) {
          fs.mkdirSync(demoScansDir, { recursive: true });
        }
        
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        fs.writeFileSync(path.join(demoScansDir, `${requestId}.${fileExt}`), fileBuffer);
      } catch (writeErr) {
        console.error('Failed to write local scan preview image:', writeErr);
      }

      const newPred = mockDb.addPrediction(patientId, tempPath, requestId);
      mockDb.updatePredictionStatus(newPred.id, 'processing');

      try {
        const mlFormData = new FormData();
        mlFormData.append('image', file);
        mlFormData.append('patient_id', patientId);

        console.log(`Sending prediction request to Flask API at: ${mlApiUrl}/predict`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

        const mlResponse = await fetch(`${mlApiUrl}/predict`, {
          method: 'POST',
          body: mlFormData,
          headers: mlApiKey ? { 'Authorization': `Bearer ${mlApiKey}`, 'X-Request-ID': requestId } : { 'X-Request-ID': requestId },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!mlResponse.ok) {
          const responseBody = await mlResponse.text().catch(() => '');
          console.error('--- Prediction Pipeline Response Error ---');
          console.error('Request URL:', `${mlApiUrl}/predict`);
          console.error('Response Status:', mlResponse.status);
          console.error('Response Body:', responseBody);
          console.error('-------------------------------------------');

          let errorType = 'Backend unavailable';
          let detail = `AI service returned error status ${mlResponse.status}`;
          
          if (mlResponse.status === 404) {
            errorType = 'HTTP 404';
            detail = `The prediction endpoint was not found at the configured URL.`;
          } else if (mlResponse.status === 500) {
            errorType = 'HTTP 500';
            detail = `The ML service encountered an internal server error.`;
          }

          throw new Error(`${errorType}: ${detail}`);
        }

        let result;
        try {
          result = await mlResponse.json();
        } catch (jsonErr) {
          console.error('Failed to parse ML JSON response:', jsonErr);
          throw new Error('Invalid JSON: The ML service returned a malformed response.');
        }

        console.log('Flask Response:', result);

        // Validate probabilities sum
        let sum = 0;
        const probs = result.probabilities || {};
        Object.keys(probs).forEach(k => sum += probs[k]);
        const probabilityWarning = Math.abs(sum - 1.0) > 0.02;

        const confidence = typeof result.confidence === 'number' ? result.confidence : parseFloat(result.confidence) || 0.0;
        const confidenceLevel = confidence > 0.9 ? 'High' : confidence > 0.75 ? 'Moderate' : 'Low';
        const recDisplay = `Recommendation: ${result.recommendation || 'Evaluate neurology records.'} Diagnostic analysis parsed via ${result.model || 'Model'} v${result.version || '1.0'}.`;

        mockDb.finalizePrediction(newPred.id, {
          stage: result.stage || 'Non Demented',
          confidence: confidence,
          confidence_level: confidenceLevel,
          recommendation_api: result.recommendation || '',
          recommendation_display: recDisplay,
          processing_ms: result.processing_ms || 1000,
          model_name: result.model || 'ResNet50',
          model_version: result.version || '1.0',
          probabilities: probs,
          probability_warning: probabilityWarning,
        });

        console.log('Prediction Object:', mockDb.getPrediction(newPred.id));
        console.log('Image URL:', tempPath);

        return { predictionId: newPred.id, request_id: requestId, demoMode: true };
      } catch (err: any) {
        let errorType = 'Backend unavailable';
        let detail = err.message || 'The ML service could not be reached.';
        
        if (err.name === 'AbortError') {
          errorType = 'Request timeout';
          detail = 'The ML service did not respond within the 12-second limit.';
        } else if (err.cause?.code === 'ECONNREFUSED') {
          errorType = 'Connection refused';
          detail = `The connection to the ML service at ${mlApiUrl} was refused. Please verify the Flask server is running and listening on the configured port.`;
        } else if (err.cause?.code === 'ENOTFOUND') {
          errorType = 'DNS failure';
          detail = `The ML service host at ${mlApiUrl} could not be resolved. Please verify the address.`;
        }
        
        const friendlyMessage = `${errorType}: ${detail}${localExplanation}`;

        console.error('--- Prediction Pipeline Exception ---');
        console.error('Request URL:', `${mlApiUrl}/predict`);
        console.error('Error Type:', errorType);
        console.error('Reason:', detail);
        console.error('Full Exception:', err);
        console.error('--------------------------------------');

        mockDb.updatePredictionStatus(newPred.id, 'failed', friendlyMessage);
        mockDb.addAuditLog(user.id, 'prediction_failed', 'predictions', newPred.id, { error: friendlyMessage }, requestId);
        throw new Error(friendlyMessage);
      }
    }

    // SUPABASE LIVE MODE
    // 1. Check Rate Limit (30 uploads / minute)
    const oneMinAgo = new Date(Date.now() - 60000).toISOString();
    const { count: uploadCount, error: rateError } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action', 'upload_scan')
      .gt('created_at', oneMinAgo);

    if (rateError) throw new Error(rateError.message);
    if (uploadCount && uploadCount >= 30) {
      throw new Error('Rate limit exceeded. You are limited to 30 uploads per minute.');
    }

    // 2. Insert Queued Prediction Row
    const fileExt = file.name.split('.').pop() || 'jpg';
    const storagePath = `${user.id}/${patientId}/${requestId}.${fileExt}`;

    const { data: newRow, error: insertError } = await supabase
      .from('predictions')
      .insert({
        user_id: user.id,
        patient_id: patientId,
        image_path: storagePath,
        status: 'queued',
        request_id: requestId
      })
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    // Audit upload action
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'upload_scan',
      entity: 'predictions',
      entity_id: newRow.id,
      request_id: requestId,
      metadata: { file_name: file.name, file_size: file.size }
    });

    let uploaded = false;

    try {
      // 3. Upload MRI scan to private Storage
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabase.storage
        .from('mri-scans')
        .upload(storagePath, fileBuffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);
      uploaded = true;

      // 4. Mark status as processing
      await supabase
        .from('predictions')
        .update({ status: 'processing' })
        .eq('id', newRow.id);

      // 5. Query Flask ML API
      if (!mlApiUrl) {
        throw new Error('Missing ML_API_URL: Please set the ML_API_URL environment variable in a .env file and restart the server.');
      }

      const mlFormData = new FormData();
      mlFormData.append('image', file);
      mlFormData.append('patient_id', patientId);

      console.log(`Sending prediction request to Flask API at: ${mlApiUrl}/predict`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12s timeout

      const mlResponse = await fetch(`${mlApiUrl}/predict`, {
        method: 'POST',
        body: mlFormData,
        headers: mlApiKey ? { 'Authorization': `Bearer ${mlApiKey}`, 'X-Request-ID': requestId } : { 'X-Request-ID': requestId },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!mlResponse.ok) {
        const responseBody = await mlResponse.text().catch(() => '');
        console.error('--- Prediction Pipeline Response Error ---');
        console.error('Request URL:', `${mlApiUrl}/predict`);
        console.error('Response Status:', mlResponse.status);
        console.error('Response Body:', responseBody);
        console.error('-------------------------------------------');

        let errorType = 'Backend unavailable';
        let detail = `AI service returned error status ${mlResponse.status}`;
        
        if (mlResponse.status === 404) {
          errorType = 'HTTP 404';
          detail = `The prediction endpoint was not found at the configured URL.`;
        } else if (mlResponse.status === 500) {
          errorType = 'HTTP 500';
          detail = `The ML service encountered an internal server error.`;
        }

        throw new Error(`${errorType}: ${detail}`);
      }

      let result;
      try {
        result = await mlResponse.json();
      } catch (jsonErr) {
        console.error('Failed to parse ML JSON response:', jsonErr);
        throw new Error('Invalid JSON: The ML service returned a malformed response.');
      }

      console.log('Flask Response:', result);

      // Validate probabilities sum
      let sum = 0;
      const probs = result.probabilities || {};
      Object.keys(probs).forEach(k => sum += probs[k]);
      const probabilityWarning = Math.abs(sum - 1.0) > 0.02;

      const confidence = typeof result.confidence === 'number' ? result.confidence : parseFloat(result.confidence) || 0.0;
      const confidenceLevel = confidence > 0.9 ? 'High' : confidence > 0.75 ? 'Moderate' : 'Low';
      const recDisplay = `Recommendation: ${result.recommendation || 'Evaluate neurology records.'} Diagnostic analysis parsed via ${result.model || 'Model'} v${result.version || '1.0'}.`;

      // 6. Finalize Prediction via security definer database function RPC
      const { error: rpcError } = await supabase.rpc('finalize_prediction', {
        p_prediction_id: newRow.id,
        p_stage: result.stage || 'Non Demented',
        p_confidence: confidence,
        p_confidence_level: confidenceLevel,
        p_recommendation_api: result.recommendation || '',
        p_recommendation_display: recDisplay,
        p_processing_ms: result.processing_ms || 1000,
        p_model_name: result.model || 'ResNet50',
        p_model_version: result.version || '1.0',
        p_probabilities: probs,
        p_probability_warning: probabilityWarning,
        p_heatmap_path: result.heatmap_path || null
      });

      if (rpcError) throw new Error(rpcError.message);

      // Log prediction and signed URL
      const { data: finalizedRow } = await supabase
        .from('predictions')
        .select('*')
        .eq('id', newRow.id)
        .single();
      console.log('Prediction Object:', finalizedRow);

      const { data: signedUrlData } = await supabase.storage
        .from('mri-scans')
        .createSignedUrl(storagePath, 3600);
      console.log('Image URL:', signedUrlData?.signedUrl || storagePath);

      return { predictionId: newRow.id, request_id: requestId };

    } catch (err: any) {
      // CLEANUP / ROLLBACK BLOCK
      if (uploaded) {
        // delete from storage
        await supabase.storage.from('mri-scans').remove([storagePath]);
      }

      // Mark row failed
      let errorType = 'Backend unavailable';
      let detail = err.message || 'The ML service could not be reached.';
      
      if (err.name === 'AbortError') {
        errorType = 'Request timeout';
        detail = 'The ML service did not respond within the 12-second limit.';
      } else if (err.cause?.code === 'ECONNREFUSED') {
        errorType = 'Connection refused';
        detail = `The connection to the ML service at ${mlApiUrl} was refused. Please verify the Flask server is running and listening on the configured port.`;
      } else if (err.cause?.code === 'ENOTFOUND') {
        errorType = 'DNS failure';
        detail = `The ML service host at ${mlApiUrl} could not be resolved. Please verify the address.`;
      }

      const friendlyMessage = `${errorType}: ${detail}${localExplanation}`;

      console.error('--- Prediction Pipeline Exception ---');
      console.error('Request URL:', `${mlApiUrl}/predict`);
      console.error('Error Type:', errorType);
      console.error('Reason:', detail);
      console.error('Full Exception:', err);
      console.error('--------------------------------------');

      await supabase
        .from('predictions')
        .update({
          status: 'failed',
          error_message: friendlyMessage
        })
        .eq('id', newRow.id);

      // Audit failure
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: 'prediction_failed',
        entity: 'predictions',
        entity_id: newRow.id,
        request_id: requestId,
        metadata: { error: friendlyMessage }
      });

      throw new Error(friendlyMessage);
    }
  });

export const deletePrediction = createServerFn({ method: 'POST' })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const user = await getActiveUser();

    if (!isSupabaseConfigured) {
      mockDb.deletePrediction(id);
      return { success: true };
    }

    // Load prediction to check path
    const { data: pred, error: loadErr } = await supabase
      .from('predictions')
      .select('image_path, user_id')
      .eq('id', id)
      .single();

    if (loadErr || !pred) throw new Error('Prediction scan record not found');
    
    // Ensure permission
    if (user.role !== 'admin' && pred.user_id !== user.id) {
      throw new Error('Permission denied');
    }

    // Delete record (will also cascade delete dependencies)
    const { error: delError } = await supabase
      .from('predictions')
      .delete()
      .eq('id', id);

    if (delError) throw new Error(delError.message);

    // Delete image file from storage
    await supabase.storage.from('mri-scans').remove([pred.image_path]);

    // Create Audit Log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'delete_prediction',
      entity: 'predictions',
      entity_id: id,
      metadata: { image_path: pred.image_path }
    });

    return { success: true };
  });
