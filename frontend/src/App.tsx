import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import Login from './pages/Login';
import FrontlineDashboard from './pages/frontline/FrontlineDashboard';
import Patients from './pages/frontline/Patients';
import PatientDetail from './pages/frontline/PatientDetail';
import RegisterPatient from './pages/frontline/RegisterPatient';
import TriageForm from './pages/frontline/TriageForm';
import Followups from './pages/frontline/Followups';
import DoctorDashboard from './pages/doctor/DoctorDashboard';
import Queue from './pages/doctor/Queue';
import ConsultationDetail from './pages/doctor/ConsultationDetail';
import AdminDashboard from './pages/admin/AdminDashboard';
import AttentionItems from './pages/admin/AttentionItems';
import FacilitiesMap from './pages/admin/FacilitiesMap';

// Loading spinner for auth state
import Spinner from './components/ui/Spinner';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, role, isLoading } = useAuth();
  
  if (isLoading) return <Spinner center size="lg" />;
  if (!user || !role) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) {
    // If role not allowed, send to their respective dashboard
    if (role === 'FRONTLINE_WORKER') return <Navigate to="/dashboard/frontline" replace />;
    if (role === 'DOCTOR') return <Navigate to="/dashboard/doctor" replace />;
    if (role === 'ADMIN') return <Navigate to="/dashboard/admin" replace />;
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

// Redirects /dashboard to the correct role-specific dashboard
function DashboardRedirect() {
  const { role, isLoading } = useAuth();
  if (isLoading) return <Spinner center size="lg" />;
  if (role === 'FRONTLINE_WORKER') return <Navigate to="/dashboard/frontline" replace />;
  if (role === 'DOCTOR') return <Navigate to="/dashboard/doctor" replace />;
  if (role === 'ADMIN') return <Navigate to="/dashboard/admin" replace />;
  return <Navigate to="/login" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardRedirect />} />
      
      {/* Frontline Worker Routes */}
      <Route path="/dashboard/frontline" element={<ProtectedRoute allowedRoles={['FRONTLINE_WORKER']}><FrontlineDashboard /></ProtectedRoute>} />
      <Route path="/register" element={<ProtectedRoute allowedRoles={['FRONTLINE_WORKER', 'ADMIN']}><RegisterPatient /></ProtectedRoute>} />
      <Route path="/triage" element={<ProtectedRoute allowedRoles={['FRONTLINE_WORKER', 'ADMIN']}><TriageForm /></ProtectedRoute>} />
      
      {/* Doctor Routes */}
      <Route path="/dashboard/doctor" element={<ProtectedRoute allowedRoles={['DOCTOR']}><DoctorDashboard /></ProtectedRoute>} />
      <Route path="/queue" element={<ProtectedRoute allowedRoles={['DOCTOR']}><Queue /></ProtectedRoute>} />
      <Route path="/consultations/:id" element={<ProtectedRoute allowedRoles={['DOCTOR']}><ConsultationDetail /></ProtectedRoute>} />
      
      {/* Admin Routes */}
      <Route path="/dashboard/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/attention" element={<ProtectedRoute allowedRoles={['ADMIN']}><AttentionItems /></ProtectedRoute>} />
      <Route path="/facilities" element={<ProtectedRoute allowedRoles={['ADMIN']}><FacilitiesMap /></ProtectedRoute>} />
      
      {/* Shared Routes */}
      <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
      <Route path="/patients/:id" element={<ProtectedRoute><PatientDetail /></ProtectedRoute>} />
      <Route path="/followups" element={<ProtectedRoute><Followups /></ProtectedRoute>} />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
