import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import React, { useEffect, useState, useRef } from 'react';
import ThemeToggle from './ThemeToggle';
import { getActiveUser, signOut } from '../lib/auth';
import { listNotifications, markRead } from '../lib/notifications.functions';
import { mockDb } from '../lib/mockDb';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const notifRef = useRef(null);

  const refreshSession = async () => {
    try {
      const u = await getActiveUser();
      setUser(u);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    refreshSession();
  }, [location.pathname]);

  const fetchNotifs = async () => {
    if (!user) return;
    try {
      const res = await listNotifications();
      setNotifications(res.data || []);
      setUnreadCount((res.data || []).filter((n) => !n.read_at).length);
    } catch (err) {
      console.error('Failed to load notifications', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
      await markRead({ data: id });
    } catch (err) {
      fetchNotifs();
    }
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    navigate('/');
    window.location.reload();
  };

  const handleToggleMockRole = async () => {
    if (isSupabaseConfigured) return;
    if (user?.role === 'admin') {
      mockDb.setCurrentUser('user-doc-123');
    } else {
      mockDb.setCurrentUser('user-admin-456');
    }
    await refreshSession();
    navigate('/dashboard');
    window.location.reload();
  };

  const navLinkClass = ({ isActive }) =>
    `nav-link px-3 py-2 ${isActive ? 'is-active text-blue-500 font-bold' : ''}`;

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center justify-between py-3 sm:py-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 rounded-xl border border-[var(--chip-line)] bg-[var(--chip-bg)] px-3 py-1.5 text-sm text-[var(--sea-ink)] no-underline shadow-sm hover:scale-[1.02]">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white shadow-sm font-bold text-xs">Ψ</div>
            <span className="font-extrabold tracking-tight hidden sm:inline">AlzheimerAI Portal</span>
          </Link>
          {user && (
            <div className="hidden md:flex items-center gap-1.5 text-sm font-semibold">
              <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
              <NavLink to="/patients" className={navLinkClass}>Patients</NavLink>
              <NavLink to="/upload" className={navLinkClass}>Upload Scan</NavLink>
              <NavLink to="/history" className={navLinkClass}>Inference History</NavLink>
              {user.role === 'admin' && (
                <NavLink to="/admin" className={({ isActive }) => `nav-link px-3 py-2 text-cyan-600 dark:text-cyan-400 ${isActive ? 'is-active font-bold' : ''}`}>Admin Control</NavLink>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {!isSupabaseConfigured && (
                <button onClick={handleToggleMockRole} className="hidden lg:inline-flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20" title="Switch between Doctor and Admin session in Mock Mode">⚡ Role: {user.role}</button>
              )}
              <div className="relative" ref={notifRef}>
                <button onClick={() => setShowNotifMenu(!showNotifMenu)} className="relative p-2 rounded-xl text-[var(--sea-ink-soft)] hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)] focus:outline-none transition" aria-label="Notification alerts">
                  <svg className="w-5.5 h-5.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                  {unreadCount > 0 && (<span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] text-white flex items-center justify-center font-bold">{unreadCount}</span>)}
                </button>
                {showNotifMenu && (
                  <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-[var(--line)] bg-[var(--surface-strong)] shadow-2xl backdrop-blur-md overflow-hidden z-[100] animate-rise-in">
                    <div className="p-3.5 border-b border-[var(--line)] bg-slate-500/5 flex justify-between items-center">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--sea-ink)]">Alerts &amp; Status</h4>
                      <span className="text-[10px] text-slate-400 font-semibold">{unreadCount} Unread</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[var(--line)]">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400">No alerts recorded.</div>
                      ) : (
                        notifications.map((notif) => (
                          <div key={notif.id} onClick={() => !notif.read_at && handleMarkRead(notif.id)} className={`p-3 text-left transition text-xs cursor-pointer ${!notif.read_at ? 'bg-blue-500/5 hover:bg-blue-500/10' : 'hover:bg-slate-500/5'}`}>
                            <div className="flex justify-between items-start mb-1">
                              <span className={`font-bold ${!notif.read_at ? 'text-blue-500' : 'text-slate-500'}`}>{notif.title}</span>
                              <span className="text-[9px] text-slate-400">{new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <p className="text-slate-500 leading-relaxed m-0">{notif.body}</p>
                            {!notif.read_at && (<span className="inline-block mt-1 text-[9px] text-blue-500 hover:underline">Mark read</span>)}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 border-l border-[var(--line)] pl-3">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-[var(--sea-ink)] max-w-[120px] truncate">{user.full_name}</div>
                  <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">{user.role}</div>
                </div>
                <button onClick={handleLogout} className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition" title="Sign Out"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg></button>
              </div>
            </>
          ) : (
            <Link to="/auth" className="rounded-full bg-blue-600 text-white border border-blue-500 px-5 py-2 text-xs font-bold shadow hover:bg-blue-700 transition">Sign In</Link>
          )}
          <ThemeToggle />
        </div>
      </nav>
      {user && (
        <div className="md:hidden flex items-center justify-around border-t border-[var(--line)] py-2 text-[11px] font-bold">
          <NavLink to="/dashboard" className={navLinkClass}>Dashboard</NavLink>
          <NavLink to="/patients" className={navLinkClass}>Patients</NavLink>
          <NavLink to="/upload" className={navLinkClass}>Upload</NavLink>
          <NavLink to="/history" className={navLinkClass}>History</NavLink>
          {user.role === 'admin' && (<NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'is-active text-cyan-600' : 'text-cyan-600'}`}>Admin</NavLink>)}
        </div>
      )}
    </header>
  );
}
