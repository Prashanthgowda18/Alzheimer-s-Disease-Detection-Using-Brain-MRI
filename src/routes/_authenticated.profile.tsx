import React, { useEffect, useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import { getActiveUser } from '../lib/auth';
import type { UserSession } from '../lib/auth';

export const Route = createFileRoute('/_authenticated/profile')({
  component: ProfilePage,
});

function ProfilePage() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await getActiveUser();
        setUser(u);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading) {
    return (
      <main className="demo-page px-4 py-12 text-center text-sm text-slate-400">
        <div>Loading profile details...</div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="demo-page px-4 py-8 max-w-xl">
      <div className="mb-6">
        <h1 className="demo-title text-3xl font-black">User Profile</h1>
        <p className="demo-muted text-sm mt-1">Manage clinical signature and organization preferences</p>
      </div>

      <div className="demo-panel rounded-[2rem] p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-4 border-b border-[var(--line)] pb-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 flex items-center justify-center text-white font-extrabold text-2xl shadow">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-[var(--sea-ink)]">{user.full_name}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{user.role}</p>
          </div>
        </div>

        <div className="space-y-4 text-xs font-semibold text-slate-500">
          <div>
            <span className="block opacity-70 mb-1">Email Address</span>
            <span className="text-sm font-bold text-[var(--sea-ink)]">{user.email}</span>
          </div>

          <div>
            <span className="block opacity-70 mb-1">Hospital / Clinic Affiliation</span>
            <span className="text-sm font-bold text-[var(--sea-ink)]">{user.hospital_name || 'Not Configured'}</span>
          </div>

          <div>
            <span className="block opacity-70 mb-1">Notification Preferences</span>
            <div className="flex gap-4 mt-1.5 text-[var(--sea-ink)]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                In-App Diagnostic Banners
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-300" />
                Email Reports Delivery
              </label>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
