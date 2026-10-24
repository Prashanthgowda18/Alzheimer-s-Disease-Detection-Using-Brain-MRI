import { describe, it, expect, beforeEach } from 'vitest';
import { getActiveUser, signIn, signUp, signOut } from '../lib/auth';
import { mockDb } from '../lib/mockDb';
import { listPatients, getPatient, createPatient } from '../lib/patients.functions';
import { listUsers, getAdminStats, listAuditLogs, getDoctorStats } from '../lib/admin.functions';
import { listMyPredictions, getPrediction } from '../lib/predictions.client';

describe('End-to-End Verification: Auth, RBAC, Data Isolation & Admin', () => {
  beforeEach(() => {
    // Reset to demo doctor user
    mockDb.setCurrentUser('user-doc-123');
  });

  it('1. Verifies default authenticated session is a doctor', async () => {
    const user = await getActiveUser();
    expect(user).toBeDefined();
    expect(user.role).toBe('doctor');
    expect(user.email).toBe('doctor@example.com');
  });

  it('2. Verifies doctor cannot access Admin features (RBAC check)', async () => {
    // A doctor trying to get admin stats must be forbidden
    await expect(getAdminStats()).rejects.toThrow(/Forbidden/);
    await expect(listUsers()).rejects.toThrow(/Forbidden/);
    await expect(listAuditLogs()).rejects.toThrow(/Forbidden/);
  });

  it('3. Verifies doctor can access doctor stats and their patient list', async () => {
    const stats = await getDoctorStats();
    expect(stats).toBeDefined();
    expect(typeof stats.totalPatients).toBe('number');

    const patients = await listPatients();
    expect(patients.data).toBeDefined();
    expect(Array.isArray(patients.data)).toBe(true);
  });

  it('4. Verifies patient data authorization and isolation between doctors', async () => {
    // Doctor creates a patient
    const newPat = await createPatient({
      data: {
        patientId: 'MRN-TEST-ISOLATION',
        patientName: 'Confidential Patient',
        dateOfBirth: '1970-01-01',
        gender: 'female',
      }
    });
    expect(newPat.id).toBeDefined();

    // Doctor can view their own patient
    const fetched = await getPatient({ data: newPat.id });
    expect(fetched.patient_name).toBe('Confidential Patient');

    // Register and switch to another doctor
    const doctor2 = mockDb.registerUser('doctor2@hospital.org', 'Dr. Other', 'Clinic B', 'doctor');
    mockDb.setCurrentUser(doctor2.id);
    // Another doctor must be FORBIDDEN from viewing this patient
    await expect(getPatient({ data: newPat.id })).rejects.toThrow(/Forbidden/);
  });

  it('5. Verifies admin can switch role and access Admin Governance and Audit Logs', async () => {
    // Switch to admin
    mockDb.setCurrentUser('user-admin-456');
    const adminUser = await getActiveUser();
    expect(adminUser.role).toBe('admin');

    // Admin can access admin stats
    const stats = await getAdminStats();
    expect(stats).toBeDefined();
    expect(stats.totalUsers).toBeGreaterThanOrEqual(1);

    // Admin can list users
    const users = await listUsers({ data: { limit: 10 } });
    expect(users.data.length).toBeGreaterThan(0);

    // Admin can list audit logs and response matches expected format
    const logs = await listAuditLogs({ data: { limit: 10 } });
    expect(logs.data.length).toBeGreaterThan(0);
    const sampleLog = logs.data[0];
    expect(sampleLog.created_at).toBeDefined();
    expect(sampleLog.action).toBeDefined();
    expect(sampleLog.user_email).toBeDefined();
  });

  it('6. Verifies prediction fallback and retrieval in mock mode', async () => {
    const list = await listMyPredictions();
    expect(list.data).toBeDefined();
    expect(Array.isArray(list.data)).toBe(true);

    if (list.data.length > 0) {
      const predId = list.data[0].id;
      const pred = await getPrediction({ data: predId });
      expect(pred).toBeDefined();
      expect(pred.stage).toBeDefined();
    }
  });
});
