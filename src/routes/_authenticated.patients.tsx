import React, { useEffect, useState } from 'react';
import { createFileRoute, Link, useNavigate, useSearch } from '@tanstack/react-router';
import { listPatients, createPatient } from '../lib/patients.functions';

export const Route = createFileRoute('/_authenticated/patients')({
  component: PatientsPage,
});

function PatientsPage() {
  const navigate = useNavigate();
  const searchParams: any = useSearch({ strict: false });
  
  const [page, setPage] = useState(Number(searchParams.page) || 1);
  const [search, setSearch] = useState(searchParams.search || '');
  const [patients, setPatients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatientId, setNewPatientId] = useState('');
  const [newName, setNewName] = useState('');
  const [newDob, setNewDob] = useState('');
  const [newGender, setNewGender] = useState<'male' | 'female' | 'other'>('male');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const limit = 8;

  const loadPatients = async () => {
    setLoading(true);
    try {
      const res = await listPatients({ data: { page, limit, search } });
      setPatients(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
    // Update search query params in browser URL
    navigate({
      search: {
        page: page > 1 ? page : undefined,
        search: search || undefined
      },
      replace: true
    });
  }, [page, search]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setPage(1); // Reset to first page
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    if (!newPatientId.trim() || !newName.trim() || !newDob) {
      setFormError('All fields are required.');
      setSubmitting(false);
      return;
    }

    try {
      await createPatient({
        data: {
          patientId: newPatientId,
          patientName: newName,
          dateOfBirth: newDob,
          gender: newGender
        }
      });
      
      // Reset form
      setNewPatientId('');
      setNewName('');
      setNewDob('');
      setNewGender('male');
      setShowAddModal(false);
      
      // Reload list
      setPage(1);
      loadPatients();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add patient. Check if MRN already exists.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="demo-page px-4 py-8">
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="demo-title text-3xl font-black">Patient Registry</h1>
          <p className="demo-muted text-sm mt-1">Manage clinical charts and longitudinal scan records</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="demo-button bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 shadow-md flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Add Patient Chart
        </button>
      </div>

      {/* Filter and Table Container */}
      <div className="demo-panel rounded-[2rem] p-6 shadow-xl mb-8">
        {/* Search */}
        <div className="mb-6 relative max-w-md">
          <input
            type="text"
            placeholder="Search by name or clinical MRN..."
            className="demo-input pl-10"
            value={search}
            onChange={handleSearchChange}
          />
          <div className="absolute left-3.5 top-3.5 text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Patients Table */}
        <div className="demo-table-shell">
          {loading ? (
            <div className="p-12 text-center text-sm text-slate-400">
              <div className="animate-spin inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
              <div>Retrieving patient registry...</div>
            </div>
          ) : patients.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              No charts match current filters.
            </div>
          ) : (
            <table className="demo-table text-sm">
              <thead>
                <tr>
                  <th>Clinical MRN</th>
                  <th>Patient Name</th>
                  <th>Date of Birth</th>
                  <th>Gender</th>
                  <th>Date Enrolled</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((pat) => (
                  <tr key={pat.id}>
                    <td className="font-bold text-slate-500">{pat.patient_id}</td>
                    <td className="font-bold text-[var(--sea-ink)]">
                      <Link to={`/patients/${pat.id}`} className="hover:underline text-[var(--sea-ink)]">
                        {pat.patient_name}
                      </Link>
                    </td>
                    <td>{pat.date_of_birth}</td>
                    <td>
                      <span className="capitalize">{pat.gender}</span>
                    </td>
                    <td>{new Date(pat.created_at).toLocaleDateString()}</td>
                    <td className="text-right">
                      <Link
                        to={`/patients/${pat.id}`}
                        className="demo-button demo-button-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
                      >
                        Open Timeline
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
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
              Showing page {page} of {totalPages} ({total} patients)
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

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="demo-panel max-w-md w-full rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <h2 className="text-xl font-extrabold text-[var(--sea-ink)] mb-4">Enroll New Patient Chart</h2>
            
            {formError && (
              <div className="demo-alert demo-alert-danger text-xs mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddPatient} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Clinical MRN (Medical Record Number)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MRN-98402"
                  className="demo-input text-sm"
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Patient Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Margaret Thatcher"
                  className="demo-input text-sm"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    required
                    className="demo-input text-sm"
                    value={newDob}
                    onChange={(e) => setNewDob(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Gender</label>
                  <select
                    className="demo-select text-sm"
                    value={newGender}
                    onChange={(e: any) => setNewGender(e.target.value)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="demo-button flex-1 justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {submitting ? 'Enrolling Chart...' : 'Create Chart'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="demo-button demo-button-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
