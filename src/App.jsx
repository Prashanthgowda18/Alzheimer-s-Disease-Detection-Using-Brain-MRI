import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header.jsx';
import Footer from './components/Footer.tsx';
import { getActiveUser } from './lib/auth';

// Page components
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import AboutPage from './pages/AboutPage.jsx';
import UploadPage from './pages/UploadPage.jsx';
import ResultPage from './pages/ResultPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import HistoryPage from './pages/HistoryPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import PatientsPage from './pages/PatientsPage.jsx';
import PatientDetailPage from './pages/PatientDetailPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminLogs from './pages/AdminLogs.jsx';
import AdminAnalytics from './pages/AdminAnalytics.jsx';

// Auth guard checking active session
const RequireAuth = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    getActiveUser()
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="demo-page min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  return user ? children : <Navigate to={`/auth?redirect=${encodeURIComponent(location.pathname)}`} replace />;
};

// Admin guard checking active session and admin authorization
const RequireAdmin = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getActiveUser()
      .then(u => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="demo-page min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin inline-block w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (user.role !== 'admin') {
    return (
      <main className="demo-page px-4 py-12 max-w-md mx-auto text-center">
        <div className="demo-alert demo-alert-danger shadow-lg">
          <h2 className="font-extrabold text-red-700 text-lg mb-2">Access Restricted</h2>
          <p className="text-sm mb-4">Administrator privileges are required to view this governance page.</p>
          <Navigate to="/dashboard" replace />
        </div>
      </main>
    );
  }
  return children;
};

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--page-bg,#0a1418)] text-[var(--sea-ink,#f8fafc)]">
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
          <Route path="/result/:id" element={<RequireAuth><ResultPage /></RequireAuth>} />
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/history" element={<RequireAuth><HistoryPage /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/patients" element={<RequireAuth><PatientsPage /></RequireAuth>} />
          <Route path="/patients/:id" element={<RequireAuth><PatientDetailPage /></RequireAuth>} />
          <Route path="/admin" element={<RequireAdmin><AdminDashboard /></RequireAdmin>} />
          <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
          <Route path="/admin/logs" element={<RequireAdmin><AdminLogs /></RequireAdmin>} />
          <Route path="/admin/analytics" element={<RequireAdmin><AdminAnalytics /></RequireAdmin>} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
