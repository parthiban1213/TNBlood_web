import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { ProgressProvider } from './context/ProgressContext.jsx';
import AppLoader from './components/AppLoader.jsx';
import AppShell from './components/AppShell.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import DonorsPage from './pages/DonorsPage.jsx';
import RequirementsPage from './pages/RequirementsPage.jsx';
import MyRequestsPage from './pages/MyRequestsPage.jsx';
import RespondPage from './pages/RespondPage.jsx';
import DonationHistoryPage from './pages/DonationHistoryPage.jsx';
import RewardsPage from './pages/RewardsPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import InfoPage from './pages/InfoPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SecurityPage from './pages/SecurityPage.jsx';

function ProtectedRoute({ children, adminOnly = false }) {
  const { isAuthenticated, isAdmin, ready } = useAuth();
  if (!ready) return <AppLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, ready } = useAuth();
  if (!ready) return <AppLoader />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppContent() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"        element={<Dashboard />} />
        <Route path="donors"           element={<DonorsPage />} />
        <Route path="requirements"     element={<ProtectedRoute adminOnly><RequirementsPage /></ProtectedRoute>} />
        <Route path="my-requests"      element={<MyRequestsPage />} />
        <Route path="respond"          element={<RespondPage />} />
        <Route path="donation-history" element={<DonationHistoryPage />} />
        <Route path="rewards"          element={<RewardsPage />} />
        <Route path="users"            element={<ProtectedRoute adminOnly><UsersPage /></ProtectedRoute>} />
        <Route path="info"             element={<InfoPage />} />
        <Route path="profile"          element={<ProfilePage />} />
        <Route path="security"         element={<SecurityPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ProgressProvider>
          <AppContent />
        </ProgressProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
