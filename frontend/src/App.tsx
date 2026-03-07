import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { AuthProvider } from './context/AuthContext';
import { UserRole } from './types/user.types';
import Layout from './components/layout/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import GuestRoute from './components/auth/GuestRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import Consultations from './pages/Consultations';
import Ordonnances from './pages/Ordonnances';
import Analyses from './pages/Analyses';
import Livraisons from './pages/Livraisons';
import Documents from './pages/Documents';
import Users from './pages/Users';
import Infirmiers from './pages/Infirmiers';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#4caf50' },
    error: { main: '#f44336' },
  },
  typography: {
    fontFamily: 'Roboto, Inter, sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Routes publiques (redirige vers /dashboard si déjà connecté) */}
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />

            {/* Routes protégées */}
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="appointments" element={
                <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.PATIENT]}>
                  <Appointments />
                </ProtectedRoute>
              } />
              <Route path="consultations" element={
                <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.PATIENT, UserRole.INFIRMIER]}>
                  <Consultations />
                </ProtectedRoute>
              } />
              <Route path="ordonnances" element={
                <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.PATIENT, UserRole.PHARMACIEN]}>
                  <Ordonnances />
                </ProtectedRoute>
              } />
              <Route path="analyses" element={
                <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.PATIENT, UserRole.LABORATOIRE]}>
                  <Analyses />
                </ProtectedRoute>
              } />
              <Route path="livraisons" element={
                <ProtectedRoute roles={[UserRole.PATIENT, UserRole.PHARMACIEN]}>
                  <Livraisons />
                </ProtectedRoute>
              } />
              <Route path="documents" element={
                <ProtectedRoute roles={[UserRole.MEDECIN, UserRole.PATIENT]}>
                  <Documents />
                </ProtectedRoute>
              } />
              <Route path="users" element={
                <ProtectedRoute roles={[UserRole.ADMIN]}>
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="infirmiers" element={
                <ProtectedRoute roles={[UserRole.MEDECIN]}>
                  <Infirmiers />
                </ProtectedRoute>
              } />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <ToastContainer position="top-right" autoClose={3000} />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
