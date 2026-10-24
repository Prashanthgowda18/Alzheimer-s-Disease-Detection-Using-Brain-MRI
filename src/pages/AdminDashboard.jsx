import React from 'react';
import { Link } from 'react-router-dom';

function AdminDashboard() {
  return (
    <main className="demo-page px-4 py-8">
      <h1 className="demo-title text-3xl font-black mb-6">Admin Control Panel</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/users" className="demo-panel rounded-[2rem] p-6 shadow-xl hover:shadow-2xl transition">
          <h2 className="text-xl font-bold mb-2">User Governance</h2>
          <p className="text-sm text-slate-500">Manage portal accounts, roles, and activation status.</p>
        </Link>
        <Link to="/admin/logs" className="demo-panel rounded-[2rem] p-6 shadow-xl hover:shadow-2xl transition">
          <h2 className="text-xl font-bold mb-2">Audit Logs</h2>
          <p className="text-sm text-slate-500">View system audit trails and activity logs.</p>
        </Link>
        <Link to="/admin/analytics" className="demo-panel rounded-[2rem] p-6 shadow-xl hover:shadow-2xl transition">
          <h2 className="text-xl font-bold mb-2">Clinical Analytics</h2>
          <p className="text-sm text-slate-500">Global statistics, model performance and stage distribution.</p>
        </Link>
      </div>
    </main>
  );
}

export default AdminDashboard;
