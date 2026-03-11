import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline, Box, CircularProgress } from '@mui/material';
import type { } from '@mui/x-data-grid/themeAugmentation';
import { AuthProvider } from './context/AuthContext';
import { UserRole } from './types/user.types';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';

// Auth
const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));

// Public
const Landing = lazy(() => import('./pages/public/Landing'));

// Dashboard
const Dashboard = lazy(() => import('./pages/dashboard/Dashboard'));

// Scheduling
const Appointments = lazy(() => import('./pages/scheduling/Appointments'));
const DoctorSchedule = lazy(() => import('./pages/scheduling/DoctorSchedule'));

// Medical
const Consultations = lazy(() => import('./pages/medical/Consultations'));
const ConsultationDetail = lazy(() => import('./pages/medical/ConsultationDetail'));
const Ordonnances = lazy(() => import('./pages/medical/Ordonnances'));
const Analyses = lazy(() => import('./pages/medical/Analyses'));
const DossierMedical = lazy(() => import('./pages/medical/DossierMedical'));
const Documents = lazy(() => import('./pages/medical/Documents'));

// Admin
const Users = lazy(() => import('./pages/admin/Users'));
const Infirmiers = lazy(() => import('./pages/admin/Infirmiers'));
const MesPatients = lazy(() => import('./pages/admin/MesPatients'));

// Pharmacy
const Livraisons = lazy(() => import('./pages/pharmacy/Livraisons'));

// Common
const Profile = lazy(() => import('./pages/profile/Profile'));

const PageLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', bgcolor: '#f4f7f9' }}>
    <CircularProgress size={60} thickness={4} sx={{ color: '#00afcc' }} />
  </Box>
);

const theme = createTheme({
  palette: {
    primary: { main: '#00afcc', dark: '#0082c8', light: '#e0f7fa' },
    secondary: { main: '#4caf50', dark: '#388e3c' },
    error: { main: '#f44336' },
    background: { default: '#f4f7f9', paper: '#ffffff' },
    text: { primary: '#1e384c', secondary: '#5da0af' },
  },
  typography: {
    fontFamily: '"Nunito Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 800, color: '#1e384c' },
    h2: { fontWeight: 800, color: '#1e384c' },
    h3: { fontWeight: 800, color: '#1e384c' },
    h4: { fontWeight: 700, color: '#1e384c' },
    h5: { fontWeight: 700, color: '#1e384c' },
    h6: { fontWeight: 700, color: '#1e384c' },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          boxShadow: 'none',
          textTransform: 'none',
          fontWeight: 700,
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 175, 204, 0.2)',
          },
        },
        contained: {
          '&:hover': {
            transform: 'translateY(-1px)',
            transition: 'all 0.2s ease-in-out',
          }
        }
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
          borderRadius: '20px',
          border: '1px solid #edf2f7',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
        }
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: '12px',
          backgroundColor: '#f8fafc',
          '& fieldset': {
            borderColor: '#e2e8f0',
          },
          '&:hover fieldset': {
            borderColor: '#00afcc',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#00afcc',
            borderWidth: '2px',
          },
        },
      },
    },
    MuiDataGrid: {
      defaultProps: {
        disableColumnResize: true,
      },
      styleOverrides: {
        root: {
          border: 'none',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '16px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.04)',
          '& .MuiDataGrid-virtualScroller': {
            overflowX: 'hidden',
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #f1f5f9',
            color: '#475569',
            fontSize: '0.95rem',
          },
          '& .MuiDataGrid-columnHeaders': {
            borderBottom: '2px solid #e2e8f0',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            color: '#1e293b',
            fontWeight: 800,
            fontSize: '0.95rem',
          },
          '& .MuiDataGrid-row:hover': {
            backgroundColor: '#f0f9ff',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          fontWeight: 700,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        }
      }
    }
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Page vitrine / Landing */}
              <Route path="/" element={<GuestRoute><Landing /></GuestRoute>} />

              {/* Routes publiques (redirige vers /dashboard si déjà connecté) */}
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

              {/* Routes protégées */}
              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/appointments" element={
                  <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.PATIENT, UserRole.INFIRMIER]}>
                    <Appointments />
                  </ProtectedRoute>
                } />
                <Route path="/consultations" element={
                  <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.PATIENT, UserRole.INFIRMIER]}>
                    <Consultations />
                  </ProtectedRoute>
                } />
                <Route path="/consultations/:id" element={
                  <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.INFIRMIER]}>
                    <ConsultationDetail />
                  </ProtectedRoute>
                } />
                <Route path="/ordonnances" element={
                  <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.PATIENT, UserRole.PHARMACIEN, UserRole.INFIRMIER]}>
                    <Ordonnances />
                  </ProtectedRoute>
                } />
                <Route path="/analyses" element={
                  <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.PATIENT, UserRole.LABORATOIRE, UserRole.INFIRMIER]}>
                    <Analyses />
                  </ProtectedRoute>
                } />
                <Route path="/livraisons" element={
                  <ProtectedRoute roles={[UserRole.PATIENT, UserRole.PHARMACIEN]}>
                    <Livraisons />
                  </ProtectedRoute>
                } />
                <Route path="/documents" element={
                  <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.PATIENT, UserRole.INFIRMIER]}>
                    <Documents />
                  </ProtectedRoute>
                } />
                <Route path="/users" element={
                  <ProtectedRoute roles={[UserRole.ADMIN]}>
                    <Users />
                  </ProtectedRoute>
                } />
                <Route path="/infirmiers" element={
                  <ProtectedRoute roles={[UserRole.MEDECIN]}>
                    <Infirmiers />
                  </ProtectedRoute>
                } />
                <Route path="/schedule" element={
                  <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.INFIRMIER]}>
                    <DoctorSchedule />
                  </ProtectedRoute>
                } />
                <Route path="/mes-patients" element={
                  <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.INFIRMIER]}>
                    <MesPatients />
                  </ProtectedRoute>
                } />
                <Route path="/dossier-medical" element={
                  <ProtectedRoute roles={[UserRole.PATIENT]}>
                    <DossierMedical />
                  </ProtectedRoute>
                } />
                <Route path="/dossier-medical/:patientId" element={
                  <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.INFIRMIER]}>
                    <DossierMedical />
                  </ProtectedRoute>
                } />
                <Route path="/profile" element={<Profile />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
