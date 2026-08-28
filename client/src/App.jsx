import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthContext } from '@asgardeo/auth-react';
import useAuthStore from './store/authStore';
import { setTokenProvider } from './services/api';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Public pages
import LandingPage from './pages/LandingPage';
import ProjectsPage from './pages/ProjectsPage';
import ProjectDetailPage from './pages/ProjectDetailPage';
import ProfilePage from './pages/ProfilePage';

// Complete profile
import CompleteProfilePage from './pages/CompleteProfilePage';

// Student pages (protected)
import DashboardPage from './pages/DashboardPage';
import ProjectFormPage from './pages/ProjectFormPage';
import NotificationsPage from './pages/NotificationsPage';

// Admin pages (protected)
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminNotifications from './pages/admin/AdminNotifications';

/* ── AuthSync Wrapper ────────────────────────────────────────── */
function AuthSync({ children }) {
  const { state, getAccessToken, signIn, signOut } = useAuthContext();
  const { syncUser, initialized, setLoading } = useAuthStore();

  useEffect(() => {
    // Provide the token fetcher to api.js
    setTokenProvider(getAccessToken);

    const sync = async () => {
      if (state.isAuthenticated && !initialized) {
        setLoading(true);
        const res = await syncUser();
        if (!res.success && !res.requireProfile) {
          signOut();
        }
      } else if (!state.isAuthenticated && state.isLoading === false) {
        setLoading(false);
      }
    };
    
    sync();
  }, [state.isAuthenticated, state.isLoading, initialized, getAccessToken, syncUser, setLoading, signOut]);

  // Optionally we can show a global loading screen if auth is initializing
  if (state.isLoading) return <div className="min-h-screen flex items-center justify-center">Loading Auth...</div>;

  return children;
}

/* ── Shared layout wrapper ───────────────────────────────────── */
function Layout({ children, hideFooter, hideHeader }) {
  return (
    <>
      {!hideHeader && <Navbar />}
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </>
  );
}

/* ── Root component ──────────────────────────────────────────── */
export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { borderRadius: '12px', fontSize: '14px' },
        }}
      />
      <AuthSync>
        <Routes>
          {/* ── Public ─────────────────────────────────────────── */}
          <Route path="/" element={<Layout><LandingPage /></Layout>} />
          <Route path="/projects" element={<Layout><ProjectsPage /></Layout>} />
          <Route path="/projects/:id" element={<Layout><ProjectDetailPage /></Layout>} />

          {/* ── Protected: complete profile (new OAuth students) ── */}
          <Route
            path="/complete-profile"
            element={
              <ProtectedRoute>
                <Layout hideFooter><CompleteProfilePage /></Layout>
              </ProtectedRoute>
            }
          />

          {/* ── Protected: student/recruiter ────────────────────── */}
          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute>
                <Layout><ProfilePage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute roles={['student']}>
                <Layout><DashboardPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/new"
            element={
              <ProtectedRoute roles={['student']}>
                <Layout><ProjectFormPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/projects/:id/edit"
            element={
              <ProtectedRoute roles={['student']}>
                <Layout><ProjectFormPage /></Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Layout><NotificationsPage /></Layout>
              </ProtectedRoute>
            }
          />

          {/* ── Protected: admin ────────────────────────────────── */}
          <Route path="/admin" element={<Outlet />}>
            <Route
              path="dashboard"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Layout><AdminDashboardPage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route path="users" element={<Navigate to="/admin/dashboard?tab=users" replace />} />
            <Route path="projects" element={<Navigate to="/admin/dashboard?tab=projects" replace />} />
            <Route
              path="users/:id"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Layout><AdminUserDetail /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="projects/:id/edit"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Layout><ProjectFormPage /></Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="notifications"
              element={
                <ProtectedRoute roles={['admin']}>
                  <Layout><AdminNotifications /></Layout>
                </ProtectedRoute>
              }
            />
          </Route>

          {/* ── Fallback ─────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes >
      </AuthSync>
    </BrowserRouter >
  );
}