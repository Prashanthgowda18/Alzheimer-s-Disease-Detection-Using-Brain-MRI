import { getActiveUser } from './auth';
import { isSupabaseConfigured, supabase, supabaseAdmin } from './supabase';
import { mockDb } from './mockDb';

// 60-second caching layer
let doctorStatsCache: Record<string, { data: any; timestamp: number }> = {};
let adminStatsCache: { data: any; timestamp: number } | null = null;
let mlHealthCache: { data: any; timestamp: number } | null = null;

const CACHE_TTL_MS = 60000; // 60 seconds

export const getDoctorStats = async () => {
  const user = await getActiveUser();
  const cacheKey = user.id;

  // Return cached data if valid
  const cached = doctorStatsCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  let stats;

  if (!isSupabaseConfigured) {
    const pats = mockDb.getPatients().length;
    const preds = mockDb.getPredictions();
    const completed = preds.filter(p => p.status === 'completed');
    const failed = preds.filter(p => p.status === 'failed');
    const pending = preds.filter(p => p.status === 'processing' || p.status === 'queued');

    stats = {
      totalPatients: pats,
      totalPredictions: preds.length,
      completedPredictions: completed.length,
      failedPredictions: failed.length,
      pendingPredictions: pending.length,
      stageBreakdown: completed.reduce((acc: Record<string, number>, curr) => {
        if (curr.stage) acc[curr.stage] = (acc[curr.stage] || 0) + 1;
        return acc;
      }, {}),
    };
  } else {
    // Supabase counts
    const { count: totalPatients } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true })
      .eq('doctor_id', user.id);

    const { data: preds } = await supabase
      .from('predictions')
      .select('status, stage')
      .eq('user_id', user.id);

    const allPreds = preds || [];
    const completed = allPreds.filter(p => p.status === 'completed');
    const stageBreakdown = completed.reduce((acc: Record<string, number>, curr) => {
      if (curr.stage) acc[curr.stage] = (acc[curr.stage] || 0) + 1;
      return acc;
    }, {});

    stats = {
      totalPatients: totalPatients || 0,
      totalPredictions: allPreds.length,
      completedPredictions: completed.length,
      failedPredictions: allPreds.filter(p => p.status === 'failed').length,
      pendingPredictions: allPreds.filter(p => p.status === 'processing' || p.status === 'queued').length,
      stageBreakdown,
    };
  }

  // Cache the result
  doctorStatsCache[cacheKey] = {
    data: stats,
    timestamp: Date.now(),
  };

  return stats;
};

export const getAdminStats = async () => {
  const user = await getActiveUser();
  if (user.role !== 'admin') throw new Error('Forbidden: Admin access required');

  if (adminStatsCache && Date.now() - adminStatsCache.timestamp < CACHE_TTL_MS) {
    return adminStatsCache.data;
  }

  let stats;

  if (!isSupabaseConfigured) {
    const pats = mockDb.getPatients().length;
    const preds = mockDb.getPredictions();
    const usersCount = mockDb.getProfiles().length;
    const completed = preds.filter(p => p.status === 'completed');
    
    const sumLatency = completed.reduce((sum, p) => sum + (p.processing_ms || 0), 0);
    const avgLatency = completed.length ? Math.round(sumLatency / completed.length) : 0;

    stats = {
      totalPatients: pats,
      totalPredictions: preds.length,
      totalUsers: usersCount,
      averageLatencyMs: avgLatency,
      stageBreakdown: completed.reduce((acc: Record<string, number>, curr) => {
        if (curr.stage) acc[curr.stage] = (acc[curr.stage] || 0) + 1;
        return acc;
      }, {}),
    };
  } else {
    const { count: totalPatients } = await supabase
      .from('patients')
      .select('*', { count: 'exact', head: true });

    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    const { data: allPreds } = await supabase
      .from('predictions')
      .select('status, stage, processing_ms');

    const preds = allPreds || [];
    const completed = preds.filter(p => p.status === 'completed');
    const sumLatency = completed.reduce((sum, p) => sum + (p.processing_ms || 0), 0);
    const avgLatency = completed.length ? Math.round(sumLatency / completed.length) : 0;

    stats = {
      totalPatients: totalPatients || 0,
      totalPredictions: preds.length,
      totalUsers: totalUsers || 0,
      averageLatencyMs: avgLatency,
      stageBreakdown: completed.reduce((acc: Record<string, number>, curr) => {
        if (curr.stage) acc[curr.stage] = (acc[curr.stage] || 0) + 1;
        return acc;
      }, {}),
    };
  }

  adminStatsCache = {
    data: stats,
    timestamp: Date.now(),
  };

  return stats;
};

export const listUsers = async ({ data }: { data?: { page?: number; limit?: number } } = {}) => {
  const user = await getActiveUser();
  if (user.role !== 'admin') throw new Error('Forbidden: Admin access required');

  const page = data?.page || 1;
  const limit = data?.limit || 10;
  const start = (page - 1) * limit;

  if (!isSupabaseConfigured) {
    const profs = mockDb.getProfiles();
    return {
      data: profs.slice(start, start + limit),
      total: profs.length,
      page,
      limit
    };
  }

  const { data: dbData, count, error } = await supabaseAdmin
    .from('profiles')
    .select('*, user_roles(role)', { count: 'exact' })
    .range(start, start + limit - 1);

  if (error) throw new Error(error.message);

  const formatted = (dbData || []).map(p => ({
    id: p.id,
    full_name: p.full_name,
    hospital_name: p.hospital_name,
    email: p.email,
    is_active: p.is_active,
    role: (p as any).user_roles?.[0]?.role || 'doctor',
    created_at: p.created_at
  }));

  return {
    data: formatted,
    total: count || 0,
    page,
    limit
  };
};

export const setUserActive = async ({ data }: { data: { userId: string; active: boolean } }) => {
  const user = await getActiveUser();
  if (user.role !== 'admin') throw new Error('Forbidden: Admin access required');

  if (!isSupabaseConfigured) {
    mockDb.setProfileActive(data.userId, data.active);
    return { success: true };
  }

  const { error } = await supabaseAdmin
    .from('profiles')
    .update({ is_active: data.active })
    .eq('id', data.userId);

  if (error) throw new Error(error.message);

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: data.active ? 'activate_user' : 'deactivate_user',
    entity: 'profiles',
    entity_id: data.userId
  });

  return { success: true };
};

export const assignRole = async ({ data }: { data: { userId: string; role: 'admin' | 'doctor' } }) => {
  const user = await getActiveUser();
  if (user.role !== 'admin') throw new Error('Forbidden: Admin access required');

  if (!isSupabaseConfigured) {
    mockDb.updateProfileRole(data.userId, data.role);
    return { success: true };
  }

  // Delete existing role
  await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', data.userId);

  // Insert new role
  const { error } = await supabaseAdmin
    .from('user_roles')
    .insert({
      user_id: data.userId,
      role: data.role
    });

  if (error) throw new Error(error.message);

  // Audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'update_role',
    entity: 'profiles',
    entity_id: data.userId,
    metadata: { new_role: data.role }
  });

  return { success: true };
};

export const listAllPredictions = async ({ data }: { data?: { page?: number; limit?: number } } = {}) => {
  const user = await getActiveUser();
  if (user.role !== 'admin') throw new Error('Forbidden: Admin access required');

  const page = data?.page || 1;
  const limit = data?.limit || 15;
  const start = (page - 1) * limit;

  if (!isSupabaseConfigured) {
    const preds = mockDb.getPredictions();
    return {
      data: preds.slice(start, start + limit),
      total: preds.length,
      page,
      limit
    };
  }

  const { data: dbData, count, error } = await supabase
    .from('predictions')
    .select('*, patients(patient_name), profiles(email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, start + limit - 1);

  if (error) throw new Error(error.message);

  const formatted = (dbData || []).map(p => ({
    ...p,
    patient_name: (p as any).patients?.patient_name || 'Unknown Patient',
    doctor_email: (p as any).profiles?.email || 'Unknown Doctor'
  }));

  return {
    data: formatted,
    total: count || 0,
    page,
    limit
  };
};

export const listAuditLogs = async ({ data }: { data?: { page?: number; limit?: number } } = {}) => {
  const user = await getActiveUser();
  if (user.role !== 'admin') throw new Error('Forbidden: Admin access required');

  const page = data?.page || 1;
  const limit = data?.limit || 20;
  const start = (page - 1) * limit;

  if (!isSupabaseConfigured) {
    const logs = mockDb.getAuditLogs();
    const formatted = logs.map(l => ({
      ...l,
      user_email: l.user_email || 'doctor@example.com',
      details: l.details || (l.entity ? `${l.action} on ${l.entity}${l.entity_id ? ` (${l.entity_id})` : ''}` : '')
    }));
    return {
      data: formatted.slice(start, start + limit),
      total: logs.length,
      page,
      limit
    };
  }

  const { data: dbData, count, error } = await supabase
    .from('audit_logs')
    .select('*, profiles(email)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(start, start + limit - 1);

  if (error) throw new Error(error.message);

  const formatted = (dbData || []).map(l => ({
    ...l,
    user_email: (l as any).profiles?.email || 'system@example.com',
    details: l.details || (l.entity ? `${l.action} on ${l.entity}${l.entity_id ? ` (${l.entity_id})` : ''}` : '')
  }));

  return {
    data: formatted,
    total: count || 0,
    page,
    limit
  };
};

export const exportPredictionsCsv = async () => {
  const user = await getActiveUser();
  if (user.role !== 'admin') throw new Error('Forbidden: Admin access required');

  let allPredictions: any[] = [];

  if (!isSupabaseConfigured) {
    allPredictions = mockDb.getPredictions();
  } else {
    const { data, error } = await supabase
      .from('predictions')
      .select('*, patients(patient_name, patient_id)');
    if (error) throw new Error(error.message);
    
    allPredictions = (data || []).map(p => ({
      ...p,
      patient_name: (p as any).patients?.patient_name,
      patient_mrn: (p as any).patients?.patient_id,
    }));
  }

  // Generate CSV String
  const headers = ['id', 'patient_mrn', 'patient_name', 'status', 'stage', 'confidence', 'processing_ms', 'model', 'model_version', 'created_at'];
  const rows = allPredictions.map(p => [
    p.id,
    p.patient_mrn || p.patient_id,
    p.patient_name || '',
    p.status,
    p.stage || '',
    p.confidence || '',
    p.processing_ms || '',
    p.model_name || '',
    p.model_version || '',
    p.created_at
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
};

export const getCachedMlHealth = async () => {
  if (mlHealthCache && Date.now() - mlHealthCache.timestamp < CACHE_TTL_MS) {
    return mlHealthCache.data;
  }

  let pings: any[] = [];
  if (!isSupabaseConfigured) {
    pings = mockDb.getHealthPings();
  } else {
    const { data, error } = await supabase
      .from('ml_health_pings')
      .select('*')
      .order('checked_at', { ascending: false })
      .limit(10);
    if (error) throw new Error(error.message);
    pings = data || [];
  }

  const currentPing = pings[0] || null;

  const data = {
    isHealthy: currentPing ? currentPing.ok : false,
    lastChecked: currentPing ? currentPing.checked_at : null,
    responseMs: currentPing ? currentPing.response_ms : null,
    model: currentPing ? currentPing.model : 'N/A',
    version: currentPing ? currentPing.version : 'N/A',
    history: pings,
  };

  mlHealthCache = {
    data,
    timestamp: Date.now()
  };

  return data;
};

export const refreshMlHealth = async () => {
  const user = await getActiveUser();
  if (user.role !== 'admin') throw new Error('Forbidden: Admin access required');

  const start = Date.now();
  const ML_URL = (import.meta.env?.VITE_ML_API_URL as string) || '';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const healthUrl = ML_URL ? `${ML_URL}/health` : '/health';
    const res = await fetch(healthUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;

    if (!res.ok) {
      throw new Error(`Health ping check returned status ${res.status}`);
    }

    const body = await res.json();
    
    if (!isSupabaseConfigured) {
      mockDb.addHealthPing(true, elapsed, body.model || 'ResNet50', body.version || '1.0');
    } else {
      await supabase.from('ml_health_pings').insert({
        ok: true,
        response_ms: elapsed,
        model: body.model || 'ResNet50',
        version: body.version || '1.0'
      });
    }

    // Invalidate cache
    mlHealthCache = null;
    return { success: true, latency: elapsed };

  } catch (err: any) {
    const elapsed = Date.now() - start;
    const errorMsg = err.message || 'Connection timeout';

    if (!isSupabaseConfigured) {
      mockDb.addHealthPing(false, elapsed, 'N/A', 'N/A', errorMsg);
    } else {
      await supabase.from('ml_health_pings').insert({
        ok: false,
        response_ms: elapsed,
        model: 'N/A',
        version: 'N/A',
        error: errorMsg
      });
    }

    // Invalidate cache
    mlHealthCache = null;
    return { success: false, error: errorMsg };
  }
};
