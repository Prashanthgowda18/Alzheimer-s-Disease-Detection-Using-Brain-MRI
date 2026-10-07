export interface MockProfile {
  id: string;
  full_name: string;
  hospital_name: string;
  email: string;
  is_active: boolean;
  role: 'admin' | 'doctor';
  created_at: string;
}

export interface MockPatient {
  id: string;
  doctor_id: string;
  patient_id: string;
  patient_name: string;
  date_of_birth: string;
  gender: 'male' | 'female' | 'other';
  created_at: string;
}

export interface MockPrediction {
  id: string;
  user_id: string;
  patient_id: string;
  patient_name?: string; // UI join helper
  image_path: string;
  stage?: string;
  confidence?: number;
  confidence_level?: string;
  recommendation_api?: string;
  recommendation_display?: string;
  processing_ms?: number;
  model_name?: string;
  model_version?: string;
  probabilities?: Record<string, number>;
  probability_warning?: boolean;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error_message?: string;
  request_id: string;
  heatmap_path?: string;
  created_at: string;
}

export interface MockNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

export interface MockAuditLog {
  id: string;
  user_id: string;
  user_email: string;
  action: string;
  entity: string;
  entity_id: string;
  request_id?: string;
  metadata?: any;
  created_at: string;
}

export interface MockHealthPing {
  id: string;
  checked_at: string;
  ok: boolean;
  response_ms: number;
  model: string;
  version: string;
  error?: string;
}

// In-memory tables, seeded with data
let profiles: MockProfile[] = [
  {
    id: 'user-doc-123',
    full_name: 'Dr. Jane Smith',
    hospital_name: 'St. Mary Neurological Clinic',
    email: 'doctor@example.com',
    is_active: true,
    role: 'doctor',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'user-admin-456',
    full_name: 'System Admin',
    hospital_name: 'St. Mary Neurological Clinic',
    email: 'admin@example.com',
    is_active: true,
    role: 'admin',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

let patients: MockPatient[] = [
  {
    id: 'pat-uuid-1',
    doctor_id: 'user-doc-123',
    patient_id: 'MRN-98421',
    patient_name: 'John Doe',
    date_of_birth: '1955-08-14',
    gender: 'male',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'pat-uuid-2',
    doctor_id: 'user-doc-123',
    patient_id: 'MRN-10255',
    patient_name: 'Margaret Thatcher',
    date_of_birth: '1948-12-03',
    gender: 'female',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

let predictions: MockPrediction[] = [
  {
    id: 'pred-uuid-1',
    user_id: 'user-doc-123',
    patient_id: 'pat-uuid-1',
    patient_name: 'John Doe',
    image_path: '/placeholder_scan.jpg',
    stage: 'Non Demented',
    confidence: 0.985,
    confidence_level: 'High',
    recommendation_api: 'Standard preventative wellness plan.',
    recommendation_display: 'Maintain cognitive engagement, regular aerobic exercise, and baseline follow-up in 12 months.',
    processing_ms: 1120,
    model_name: 'ResNet50',
    model_version: '1.0',
    probabilities: { 'NonDemented': 0.985, 'VeryMildDemented': 0.012, 'MildDemented': 0.002, 'ModerateDemented': 0.001 },
    probability_warning: false,
    status: 'completed',
    request_id: 'req-111-222-333',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'pred-uuid-2',
    user_id: 'user-doc-123',
    patient_id: 'pat-uuid-2',
    patient_name: 'Margaret Thatcher',
    image_path: '/placeholder_scan.jpg',
    stage: 'Mild Demented',
    confidence: 0.842,
    confidence_level: 'Moderate',
    recommendation_api: 'Neurological consultation recommended.',
    recommendation_display: 'Schedule a thorough neurological clinical evaluation and consider neurocognitive screening tests.',
    processing_ms: 1350,
    model_name: 'ResNet50',
    model_version: '1.0',
    probabilities: { 'NonDemented': 0.05, 'VeryMildDemented': 0.108, 'MildDemented': 0.842, 'ModerateDemented': 0.0 },
    probability_warning: false,
    status: 'completed',
    request_id: 'req-444-555-666',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

let notifications: MockNotification[] = [
  {
    id: 'notif-uuid-1',
    user_id: 'user-doc-123',
    type: 'prediction_completed',
    title: 'Prediction Completed',
    body: 'Alzheimer diagnostic scan for patient John Doe processed. Result: Non Demented.',
    read_at: null,
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'notif-uuid-2',
    user_id: 'user-doc-123',
    type: 'prediction_completed',
    title: 'Prediction Completed',
    body: 'Alzheimer diagnostic scan for patient Margaret Thatcher processed. Result: Mild Demented.',
    read_at: null,
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

let auditLogs: MockAuditLog[] = [
  {
    id: 'audit-uuid-1',
    user_id: 'user-doc-123',
    user_email: 'doctor@example.com',
    action: 'login',
    entity: 'profiles',
    entity_id: 'user-doc-123',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'audit-uuid-2',
    user_id: 'user-doc-123',
    user_email: 'doctor@example.com',
    action: 'create_patient',
    entity: 'patients',
    entity_id: 'pat-uuid-1',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

let healthPings: MockHealthPing[] = [
  {
    id: 'ping-1',
    checked_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    ok: true,
    response_ms: 120,
    model: 'ResNet50',
    version: '1.0'
  }
];

// Simple in-memory session manager
let currentUserId = 'user-doc-123'; // Default to doctor. Change to 'user-admin-456' for admin panel.

export const mockDb = {
  getCurrentUser: () => {
    return profiles.find(p => p.id === currentUserId) || profiles[0];
  },
  setCurrentUser: (id: string) => {
    currentUserId = id;
    const user = profiles.find(p => p.id === id);
    if (user) {
      mockDb.addAuditLog(id, 'switch_user', 'profiles', id, { email: user.email });
    }
  },
  getProfiles: () => profiles,
  updateProfileRole: (userId: string, role: 'admin' | 'doctor') => {
    const prof = profiles.find(p => p.id === userId);
    if (prof) {
      prof.role = role;
      mockDb.addAuditLog(currentUserId, 'update_role', 'profiles', userId, { new_role: role });
    }
  },
  setProfileActive: (userId: string, is_active: boolean) => {
    const prof = profiles.find(p => p.id === userId);
    if (prof) {
      prof.is_active = is_active;
      mockDb.addAuditLog(currentUserId, is_active ? 'activate_user' : 'deactivate_user', 'profiles', userId);
    }
  },
  registerUser: (email: string, fullName: string, hospitalName: string, role: 'admin' | 'doctor' = 'doctor') => {
    const id = 'user-' + Math.random().toString(36).substr(2, 9);
    const newProf: MockProfile = {
      id,
      full_name: fullName,
      hospital_name: hospitalName,
      email,
      is_active: true,
      role,
      created_at: new Date().toISOString(),
    };
    profiles.push(newProf);
    mockDb.addAuditLog(id, 'signup', 'profiles', id);
    return newProf;
  },

  // Patients
  getPatients: () => patients.filter(p => p.doctor_id === currentUserId || mockDb.getCurrentUser().role === 'admin'),
  getPatient: (id: string) => patients.find(p => p.id === id),
  addPatient: (patientId: string, name: string, dob: string, gender: 'male' | 'female' | 'other') => {
    const id = 'pat-' + Math.random().toString(36).substr(2, 9);
    const newPat: MockPatient = {
      id,
      doctor_id: currentUserId,
      patient_id: patientId,
      patient_name: name,
      date_of_birth: dob,
      gender,
      created_at: new Date().toISOString(),
    };
    patients.push(newPat);
    mockDb.addAuditLog(currentUserId, 'create_patient', 'patients', id, { patient_id: patientId, name });
    return newPat;
  },
  updatePatient: (id: string, name: string, dob: string, gender: 'male' | 'female' | 'other') => {
    const pat = patients.find(p => p.id === id);
    if (pat) {
      pat.patient_name = name;
      pat.date_of_birth = dob;
      pat.gender = gender;
      mockDb.addAuditLog(currentUserId, 'update_patient', 'patients', id, { name });
    }
    return pat;
  },

  // Predictions
  getPredictions: () => {
    const activeUser = mockDb.getCurrentUser();
    return predictions
      .filter(p => p.user_id === currentUserId || activeUser.role === 'admin')
      .map(p => {
        const pat = patients.find(patient => patient.id === p.patient_id);
        return {
          ...p,
          patient_name: pat ? pat.patient_name : 'Unknown Patient',
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  getPrediction: (id: string) => {
    const pred = predictions.find(p => p.id === id);
    if (pred) {
      const pat = patients.find(p => p.id === pred.patient_id);
      return {
        ...pred,
        patient_name: pat ? pat.patient_name : 'Unknown Patient',
      };
    }
    return undefined;
  },
  addPrediction: (patientId: string, imagePath: string, requestId: string) => {
    const id = 'pred-' + Math.random().toString(36).substr(2, 9);
    const newPred: MockPrediction = {
      id,
      user_id: currentUserId,
      patient_id: patientId,
      image_path: imagePath,
      status: 'queued',
      request_id: requestId,
      created_at: new Date().toISOString(),
    };
    predictions.push(newPred);
    mockDb.addAuditLog(currentUserId, 'upload_scan', 'predictions', id, { request_id: requestId });
    return newPred;
  },
  updatePredictionStatus: (id: string, status: MockPrediction['status'], errorMessage?: string) => {
    const pred = predictions.find(p => p.id === id);
    if (pred) {
      pred.status = status;
      if (errorMessage) pred.error_message = errorMessage;
    }
  },
  finalizePrediction: (id: string, update: Partial<MockPrediction>) => {
    const pred = predictions.find(p => p.id === id);
    if (pred) {
      Object.assign(pred, update, { status: 'completed' as const });
      const pat = patients.find(p => p.id === pred.patient_id);
      
      // Trigger notification
      mockDb.addNotification(
        currentUserId,
        'prediction_completed',
        'Prediction Completed',
        `Alzheimer diagnostic scan for patient ${pat ? pat.patient_name : 'Unknown'} processed. Result: ${update.stage}.`
      );

      // Audit Log
      mockDb.addAuditLog(currentUserId, 'finalize_prediction', 'predictions', id, {
        patient_id: pred.patient_id,
        stage: update.stage,
        confidence: update.confidence,
      }, pred.request_id);
    }
  },
  deletePrediction: (id: string) => {
    predictions = predictions.filter(p => p.id !== id);
    mockDb.addAuditLog(currentUserId, 'delete_prediction', 'predictions', id);
  },

  // Notifications
  getNotifications: () => notifications.filter(n => n.user_id === currentUserId),
  addNotification: (userId: string, type: string, title: string, body: string) => {
    const id = 'notif-' + Math.random().toString(36).substr(2, 9);
    notifications.push({
      id,
      user_id: userId,
      type,
      title,
      body,
      read_at: null,
      created_at: new Date().toISOString(),
    });
  },
  markNotificationRead: (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
      notif.read_at = new Date().toISOString();
    }
  },

  // Audit Logs
  getAuditLogs: () => {
    return auditLogs.map(l => {
      const prof = profiles.find(p => p.id === l.user_id);
      return {
        ...l,
        user_email: prof ? prof.email : l.user_email,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },
  addAuditLog: (userId: string, action: string, entity: string, entityId: string, metadata?: any, requestId?: string) => {
    const prof = profiles.find(p => p.id === userId);
    auditLogs.push({
      id: 'audit-' + Math.random().toString(36).substr(2, 9),
      user_id: userId,
      user_email: prof ? prof.email : 'system@example.com',
      action,
      entity,
      entity_id: entityId,
      request_id: requestId,
      metadata,
      created_at: new Date().toISOString(),
    });
  },

  // Health Pings
  getHealthPings: () => healthPings.sort((a, b) => new Date(b.checked_at).getTime() - new Date(a.checked_at).getTime()),
  addHealthPing: (ok: boolean, responseMs: number, model: string, version: string, error?: string) => {
    healthPings.push({
      id: 'ping-' + Math.random().toString(36).substr(2, 9),
      checked_at: new Date().toISOString(),
      ok,
      response_ms: responseMs,
      model,
      version,
      error
    });
  }
};
