import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './hooks/useAuth';

// Layouts
import AuthLayout from './layouts/AuthLayout';
import DashboardLayout from './layouts/DashboardLayout';
import AdminLayout from './layouts/AdminLayout';

// Pages - Auth
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ConfirmEmailPage from './pages/auth/ConfirmEmailPage';

// Pages - Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';
import PlansPage from './pages/plans/PlansPage';
import DependentsPage from './pages/dependents/DependentsPage';
import ReimbursementsPage from './pages/reimbursements/ReimbursementsPage';
import ReimbursementDetailPage from './pages/reimbursements/ReimbursementDetailPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import ReportsPage from './pages/reports/ReportsPage';
import ProfilePage from './pages/profile/ProfilePage';

// Pages - Admin
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminReimbursementsPage from './pages/admin/AdminReimbursementsPage';
import AdminStatsPage from './pages/admin/AdminStatsPage';

// Components
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({ 
  children, 
  adminOnly = false 
}) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="App">
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                {/* Auth Routes */}
                <Route path="/auth" element={<AuthLayout />}>
                  <Route path="login" element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  } />
                  <Route path="register" element={
                    <PublicRoute>
                      <RegisterPage />
                    </PublicRoute>
                  } />
                  <Route path="forgot-password" element={
                    <PublicRoute>
                      <ForgotPasswordPage />
                    </PublicRoute>
                  } />
                  <Route path="reset-password" element={
                    <PublicRoute>
                      <ResetPasswordPage />
                    </PublicRoute>
                  } />
                  <Route path="confirm" element={<ConfirmEmailPage />} />
                </Route>

                {/* Dashboard Routes */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<DashboardPage />} />
                  <Route path="plans" element={<PlansPage />} />
                  <Route path="dependents" element={<DependentsPage />} />
                  <Route path="reimbursements" element={<ReimbursementsPage />} />
                  <Route path="reimbursements/:id" element={<ReimbursementDetailPage />} />
                  <Route path="documents" element={<DocumentsPage />} />
                  <Route path="reports" element={<ReportsPage />} />
                  <Route path="profile" element={<ProfilePage />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={
                  <ProtectedRoute adminOnly>
                    <AdminLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                  <Route path="reimbursements" element={<AdminReimbursementsPage />} />
                  <Route path="stats" element={<AdminStatsPage />} />
                </Route>

                {/* 404 Route */}
                <Route path="*" element={
                  <div className="min-h-screen flex items-center justify-center">
                    <div className="text-center">
                      <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                        404
                      </h1>
                      <p className="text-gray-600 dark:text-gray-400 mb-8">
                        Página não encontrada
                      </p>
                      <button
                        onClick={() => window.history.back()}
                        className="btn-primary"
                      >
                        Voltar
                      </button>
                    </div>
                  </div>
                } />
              </Routes>
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;