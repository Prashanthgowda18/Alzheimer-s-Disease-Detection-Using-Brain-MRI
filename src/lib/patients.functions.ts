import { getActiveUser } from './auth';
import { isSupabaseConfigured, supabase } from './supabase';
import { mockDb } from './mockDb';

export const listPatients = async ({ data }: { data?: { page?: number; limit?: number; search?: string } } = {}) => {
  const user = await getActiveUser();
  const page = data?.page || 1;
  const limit = data?.limit || 10;
  const search = data?.search || '';
  const start = (page - 1) * limit;

  if (!isSupabaseConfigured) {
    let pats = mockDb.getPatients();
    if (search) {
      const lowerSearch = search.toLowerCase();
      pats = pats.filter(p => 
        p.patient_name.toLowerCase().includes(lowerSearch) || 
        p.patient_id.toLowerCase().includes(lowerSearch)
      );
    }
    const total = pats.length;
    const dataSlice = pats.slice(start, start + limit);
    return { data: dataSlice, total, page, limit };
  }

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' });

  if (user.role !== 'admin') {
    query = query.eq('doctor_id', user.id);
  }

  if (search) {
    query = query.or(`patient_name.ilike.%${search}%,patient_id.ilike.%${search}%`);
  }

  const { data: dbData, count, error } = await query
    .order('created_at', { ascending: false })
    .range(start, start + limit - 1);

  if (error) throw new Error(error.message);

  return {
    data: dbData || [],
    total: count || 0,
    page,
    limit,
  };
};

export const getPatient = async ({ data: id }: { data: string }) => {
  const user = await getActiveUser();

  if (!isSupabaseConfigured) {
    const pat = mockDb.getPatient(id);
    if (!pat) throw new Error('Patient not found');
    if (user.role !== 'admin' && pat.doctor_id !== user.id) {
      throw new Error('Forbidden: You do not have permission to access this patient profile');
    }
    return pat;
  }

  let query = supabase
    .from('patients')
    .select('*')
    .eq('id', id);

  if (user.role !== 'admin') {
    query = query.eq('doctor_id', user.id);
  }

  const { data: pat, error } = await query.maybeSingle();
  if (error || !pat) throw new Error('Patient not found');
  return pat;
};

export const createPatient = async ({ data }: { data: { patientId: string; patientName: string; dateOfBirth: string; gender: 'male' | 'female' | 'other' } }) => {
  const user = await getActiveUser();

  if (!isSupabaseConfigured) {
    return mockDb.addPatient(data.patientId, data.patientName, data.dateOfBirth, data.gender);
  }

  const { data: newPat, error } = await supabase
    .from('patients')
    .insert({
      doctor_id: user.id,
      patient_id: data.patientId,
      patient_name: data.patientName,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Create audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'create_patient',
    entity: 'patients',
    entity_id: newPat.id,
    metadata: { patient_id: data.patientId, name: data.patientName }
  });

  return newPat;
};

export const updatePatient = async ({ data }: { data: { id: string; patientName: string; dateOfBirth: string; gender: 'male' | 'female' | 'other' } }) => {
  const user = await getActiveUser();

  if (!isSupabaseConfigured) {
    const pat = mockDb.getPatient(data.id);
    if (!pat) throw new Error('Patient not found');
    if (user.role !== 'admin' && pat.doctor_id !== user.id) {
      throw new Error('Forbidden: You do not have permission to update this patient profile');
    }
    return mockDb.updatePatient(data.id, data.patientName, data.dateOfBirth, data.gender);
  }

  let query = supabase
    .from('patients')
    .update({
      patient_name: data.patientName,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
    })
    .eq('id', data.id);

  if (user.role !== 'admin') {
    query = query.eq('doctor_id', user.id);
  }

  const { data: updatedPat, error } = await query
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Create audit log
  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'update_patient',
    entity: 'patients',
    entity_id: data.id,
    metadata: { name: data.patientName }
  });

  return updatedPat;
};
