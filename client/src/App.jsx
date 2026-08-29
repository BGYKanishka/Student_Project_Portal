import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
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
  const { syncUser, initialized, setLoading, loading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Provide the token fetcher to api.js
    setTokenProvider(getAccessToken);

    const sync = async () => {
      if (state.isAuthenticated && !initialized) {
        setLoading(true);
        const res = await syncUser();
        if (!res.success && !res.requireProfile) {
          signOut();
        } else if (res.requireProfile) {
          navigate('/complete-profile');
        }
      } else if (!state.isAuthenticated && state.isLoading === false) {
        setLoading(false);
      }
    };
    
    sync();
  }, [state.isAuthenticated, state.isLoading, initialized, getAccessToken, syncUser, setLoading, signOut, navigate]);

  useEffect(() => {
    const handleForbidden = (e) => {
      // Clear the local state so the app knows the user is logged out immediately
      useAuthStore.getState().clearUser();
      // Sign out from Asgardeo
      signOut();
      
      const message = e.detail?.message || 'Your session was terminated or your account is suspended.';
      // We could use toast.error(message) here if toast is imported, but it might disappear during redirect.
    };

    window.addEventListener('auth:forbidden', handleForbidden);
    return () => window.removeEventListener('auth:forbidden', handleForbidden);
  }, [signOut]);

  // Show a global loading screen while auth is initializing or syncing
  if (state.isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium">Authenticating...</p>
        </div>
      </div>
    );
  }

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